const BASE = 'https://api.scryfall.com';
const HEADERS = { accept: 'application/json', 'user-agent': 'MTGVault/1.0' };

export async function searchCards(q, page = 1) {
  // Scryfall hides a handful of retired cards (e.g. "Crusade") from default
  // search results because Wizards flagged them content-warning — they're
  // still real, legal-to-own cards, just opted out of by default. Add
  // include:extras so a user searching for the exact name can still find them.
  const query = `${q} include:extras`;
  const url = `${BASE}/cards/search?q=${encodeURIComponent(query)}&page=${page}&order=name`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) return { cards: [], hasMore: false, total: 0 };
    throw new Error(`Scryfall search failed: ${res.status}`);
  }
  const json = await res.json();
  let cards = json.data || [];

  // Scryfall's search matches card text/partials, not just names, and sorts
  // whatever it finds alphabetically — so typing an exact card name (the
  // common case) can bury the actual card behind unrelated ones that just
  // happen to alphabetize earlier (e.g. "lightning bolt" surfaces
  // "Emeritus of Conflict // Lightning Bolt" ahead of plain "Lightning
  // Bolt"). Promote exact (case-insensitive) name matches to the top.
  const needle = q.trim().toLowerCase();
  cards = [...cards].sort((a, b) => {
    const aExact = a.name.toLowerCase() === needle ? 0 : 1;
    const bExact = b.name.toLowerCase() === needle ? 0 : 1;
    return aExact - bExact;
  });

  return { cards, hasMore: Boolean(json.has_more), total: json.total_cards || 0 };
}

// Scryfall's full set list barely changes intraday, so cache it in-memory
// per serverless instance instead of re-fetching on every keystroke of the
// edition picker (same pattern as lib/prices.js's Card Kingdom cache).
const SETS_TTL_MS = 1000 * 60 * 60 * 6;
let setsCache = null;
let setsCacheAt = 0;

export async function getSets() {
  const now = Date.now();
  if (setsCache && now - setsCacheAt < SETS_TTL_MS) return setsCache;

  const res = await fetch(`${BASE}/sets`, { headers: HEADERS });
  if (!res.ok) return setsCache || [];
  const json = await res.json();
  const sets = (json.data || [])
    // Skip token/art-series/memorabilia "sets" — not real editions a card
    // was printed in, they just add noise to the picker.
    .filter((s) => !['token', 'memorabilia', 'art_series'].includes(s.set_type))
    .map((s) => ({ code: s.code, name: s.name, releasedAt: s.released_at || '' }))
    .sort((a, b) => (b.releasedAt || '').localeCompare(a.releasedAt || ''));

  setsCache = sets;
  setsCacheAt = now;
  return sets;
}

export async function getCardById(id) {
  const res = await fetch(`${BASE}/cards/${id}`, { headers: HEADERS });
  if (!res.ok) return null;
  return res.json();
}

const COLLECTION_BATCH_SIZE = 75; // Scryfall's max identifiers per /cards/collection call

// Look up many cards by id in as few requests as possible via Scryfall's
// bulk collection endpoint, instead of one request per card — a page like
// /collection can hold hundreds of distinct printings, and firing that many
// parallel single-card requests risks Scryfall's rate limit and the
// serverless function's own timeout (this was the direct cause of a real
// "everything shows $0" bug: enough parallel lookups failed at once that
// every price fell back to null). Returns a Map<id, card>; ids Scryfall
// doesn't recognize are simply absent from the map rather than erroring.
export async function getCardsByIds(ids) {
  const unique = [...new Set(ids)];
  const found = new Map();

  for (let i = 0; i < unique.length; i += COLLECTION_BATCH_SIZE) {
    const batch = unique.slice(i, i + COLLECTION_BATCH_SIZE);
    try {
      const res = await fetch(`${BASE}/cards/collection`, {
        method: 'POST',
        headers: { ...HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify({ identifiers: batch.map((id) => ({ id })) }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) continue;
      const json = await res.json();
      for (const card of json.data || []) found.set(card.id, card);
    } catch {
      // this batch failed — leave its ids absent from the map, caller
      // treats a missing card the same as a not-found single lookup
    }
  }

  return found;
}

// Scryfall's default search collapses all printings of a card into one result
// (unique=cards), so search can surface a different set/art than the one the
// user meant. Every card object includes prints_search_uri, which lists every
// known printing (unique=prints) — use it to let the user switch versions.
export async function getCardPrintings(card) {
  if (!card?.prints_search_uri) return [];
  const res = await fetch(card.prints_search_uri, { headers: HEADERS });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || [])
    // Foreign-language printings are the same card/art in a different
    // language and just clutter the picker for a USD/English-market app —
    // keep English only. (If a card was never printed in English, e.g. some
    // supplemental-product exclusives, fall back to showing what exists.)
    .filter((c, _i, all) => c.lang === 'en' || !all.some((x) => x.lang === 'en'))
    .map((c) => ({
      id: c.id,
      setName: c.set_name,
      setCode: c.set,
      collectorNumber: c.collector_number,
      releasedAt: c.released_at,
      image: cardImage(c),
      lang: c.lang
    }));
}

export function cardImage(card) {
  return (
    card?.image_uris?.normal ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    null
  );
}

export function summarizeCard(card) {
  return {
    id: card.id,
    name: card.name,
    setName: card.set_name,
    setCode: card.set,
    collectorNumber: card.collector_number,
    typeLine: card.type_line,
    rarity: card.rarity,
    image: cardImage(card),
    usd: card.prices?.usd || null,
    usdFoil: card.prices?.usd_foil || null
  };
}
