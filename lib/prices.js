// Price engine: merges Scryfall (card data + market/dealer price, itself
// sourced from TCGplayer) with Card Kingdom's public pricelist (buylist =
// what a collector can sell a card FOR to a dealer, retail = what a dealer
// sells the card AT).
//
// Trust matters here — people use these numbers to decide what their
// collection is worth — so this file is deliberately conservative about
// what it claims:
//   1. Match the EXACT printing whenever possible (Card Kingdom's feed
//      includes each row's own Scryfall UUID — use it instead of guessing
//      from name + set text).
//   2. Say plainly when a match is approximate instead of exact.
//   3. Flag it when two independent sources meaningfully disagree, rather
//      than silently picking one and presenting it as settled.
//   4. Expose *when* the data was last fetched, so staleness is visible.
//
// Card Kingdom's feed is large (~80k rows) so it's cached in-memory per
// serverless instance and reused for 6 hours instead of re-fetched on
// every request — keeps the app fast and keeps outbound bandwidth low.

const CK_URL = 'https://api.cardkingdom.com/api/pricelist';
const CK_TTL_MS = 1000 * 60 * 60 * 6;
const DISAGREEMENT_THRESHOLD = 0.3; // sources differing by >30% get flagged

let ckCacheAt = 0;
let byScryfallId = null; // Map<scryfall_id, entries[]> — exact printing match
let byName = null; // Map<lowercase name, entries[]> — approximate fallback
let loadPromise = null;

async function loadCardKingdom() {
  const now = Date.now();
  if (byScryfallId && now - ckCacheAt < CK_TTL_MS) return { byScryfallId, byName };
  if (loadPromise) return loadPromise; // de-dupe concurrent cold-start fetches

  loadPromise = (async () => {
    try {
      const res = await fetch(CK_URL, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`CK status ${res.status}`);
      const json = await res.json();
      const rows = json?.data || json?.pricelist || (Array.isArray(json) ? json : []);

      const idIndex = new Map();
      const nameIndex = new Map();
      for (const row of rows) {
        if (row.scryfall_id) {
          if (!idIndex.has(row.scryfall_id)) idIndex.set(row.scryfall_id, []);
          idIndex.get(row.scryfall_id).push(row);
        }
        const name = (row.name || '').toLowerCase().trim();
        if (name) {
          if (!nameIndex.has(name)) nameIndex.set(name, []);
          nameIndex.get(name).push(row);
        }
      }
      byScryfallId = idIndex;
      byName = nameIndex;
      ckCacheAt = now;
      return { byScryfallId, byName };
    } catch (err) {
      // Card Kingdom feed unreachable — caller falls back to an estimate.
      // Return whatever's cached (possibly null/stale-but-usable).
      return { byScryfallId, byName };
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

function pickField(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      const n = Number(row[key]);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function isFoilRow(row) {
  const v = row.is_foil ?? row.foil ?? row.isFoil;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}

function rowToPrices(row) {
  return {
    buy: pickField(row, ['price_buy', 'buy_price', 'buylist_price', 'buy']),
    retail: pickField(row, ['price_retail', 'price', 'retail_price', 'sell_price']),
    edition: row.edition || null
  };
}

async function matchCardKingdom(scryfallId, name, setName, foil) {
  const { byScryfallId, byName: nameIdx } = await loadCardKingdom();

  // 1. Exact printing match via Scryfall UUID — this is the only case we
  // treat as fully authoritative for this specific card.
  if (byScryfallId && scryfallId) {
    const rows = byScryfallId.get(scryfallId) || [];
    const exact = rows.find((r) => isFoilRow(r) === Boolean(foil)) || rows[0];
    if (exact) return { ...rowToPrices(exact), matchType: 'exact' };
  }

  // 2. Fallback: same card name, best-guess printing by matching set text.
  // Card Kingdom may simply not carry this exact printing (it's a smaller
  // catalog than Scryfall's full print history) — this gets you a same-card
  // price, just not guaranteed the same edition, so it's flagged as such.
  if (nameIdx) {
    const rows = nameIdx.get((name || '').toLowerCase().trim());
    if (rows && rows.length) {
      const foilRows = rows.filter((r) => isFoilRow(r) === Boolean(foil));
      const pool = foilRows.length ? foilRows : rows;
      const best =
        pool.find((r) => (r.edition || '').toLowerCase().includes((setName || '').toLowerCase())) || pool[0];
      if (best) return { ...rowToPrices(best), matchType: 'approximate' };
    }
  }

  return null;
}

/**
 * Build the two headline numbers for a card:
 *  - collectorSell: what a collector could realistically get selling INTO
 *    a dealer's buylist (Card Kingdom buy price when available, else an
 *    estimate of ~65% of market price — clearly flagged as an estimate).
 *  - dealerSell: what a dealer/marketplace sells the card AT (Card Kingdom
 *    retail when available, else Scryfall's market price from TCGplayer).
 */
export async function getCardPrices({ scryfallId, name, setName, usd, usdFoil, foil }) {
  const market = foil ? usdFoil : usd;
  const marketNum = market ? Number(market) : null;

  let ck = null;
  try {
    ck = await matchCardKingdom(scryfallId, name, setName, foil);
  } catch {
    ck = null;
  }

  const dealerSell = ck?.retail ?? marketNum ?? null;
  let collectorSell = ck?.buy ?? null;
  let collectorSellEstimated = false;

  if (collectorSell === null && marketNum !== null) {
    collectorSell = Math.round(marketNum * 0.65 * 100) / 100;
    collectorSellEstimated = true;
  }

  // Two independent sources for the same number (Scryfall/TCGplayer market
  // vs. Card Kingdom retail) — if they meaningfully disagree, say so
  // instead of quietly presenting whichever one won the priority order.
  let sourcesDisagree = false;
  if (ck?.retail != null && marketNum != null && marketNum > 0) {
    const delta = Math.abs(ck.retail - marketNum) / marketNum;
    sourcesDisagree = delta > DISAGREEMENT_THRESHOLD;
  }

  return {
    dealerSell,
    dealerSellSource: ck?.retail != null ? 'Card Kingdom retail' : 'Scryfall market (TCGplayer)',
    collectorSell,
    collectorSellEstimated,
    collectorSellSource: ck?.buy != null ? 'Card Kingdom buylist' : 'estimated (~65% of market)',
    marketPrice: marketNum,
    printingMatch: ck?.matchType || null, // 'exact' | 'approximate' | null (no CK data at all)
    sourcesDisagree,
    ckAsOf: ckCacheAt || null
  };
}
