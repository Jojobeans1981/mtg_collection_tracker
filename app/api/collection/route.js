import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { query, dbConfigured } from '../../../lib/db';
import { getCardById } from '../../../lib/scryfall';
import { getCardPrices } from '../../../lib/prices';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ items: [], totals: null });

  const result = await query(
    `SELECT id, scryfall_id, card_name, set_code, collector_number, foil, condition, quantity, image_url
     FROM collection_items WHERE user_id = $1 ORDER BY created_at DESC`,
    [session.userId]
  );

  const items = await Promise.all(
    result.rows.map(async (row) => {
      let prices = { collectorSell: null, dealerSell: null, collectorSellEstimated: true };
      try {
        const card = await getCardById(row.scryfall_id);
        if (card) {
          prices = await getCardPrices({
            scryfallId: card.id,
            name: card.name,
            setName: card.set_name,
            usd: card.prices?.usd,
            usdFoil: card.prices?.usd_foil,
            foil: row.foil
          });
        }
      } catch {
        // leave prices as null-ish defaults; item still shows in collection
      }
      return {
        id: row.id,
        scryfallId: row.scryfall_id,
        name: row.card_name,
        setCode: row.set_code,
        collectorNumber: row.collector_number,
        foil: row.foil,
        condition: row.condition,
        quantity: row.quantity,
        image: row.image_url,
        prices
      };
    })
  );

  const totals = items.reduce(
    (acc, item) => {
      const qty = item.quantity;
      acc.collectorSellTotal += (item.prices.collectorSell || 0) * qty;
      acc.dealerSellTotal += (item.prices.dealerSell || 0) * qty;
      acc.cardCount += qty;
      return acc;
    },
    { collectorSellTotal: 0, dealerSellTotal: 0, cardCount: 0 }
  );

  // Best-effort snapshot for the value-history chart and biggest-movers
  // widget — never let a snapshot failure break the collection view itself.
  try {
    await recordSnapshots(session.userId, items, totals);
  } catch {
    // ignore — snapshots are a nice-to-have, not core functionality
  }

  return NextResponse.json({ items, totals });
}

async function recordSnapshots(userId, items, totals) {
  await query(
    `INSERT INTO collection_value_snapshots (user_id, captured_at, sell_total, retail_total)
     VALUES ($1, CURRENT_DATE, $2, $3)
     ON CONFLICT (user_id, captured_at) DO UPDATE SET sell_total = $2, retail_total = $3`,
    [userId, totals.collectorSellTotal, totals.dealerSellTotal]
  );

  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.scryfallId)) continue;
    seen.add(item.scryfallId);
    await query(
      `INSERT INTO price_snapshots (scryfall_id, captured_at, card_name, buy_price, retail_price)
       VALUES ($1, CURRENT_DATE, $2, $3, $4)
       ON CONFLICT (scryfall_id, captured_at) DO NOTHING`,
      [item.scryfallId, item.name, item.prices.collectorSell, item.prices.dealerSell]
    );
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!dbConfigured()) {
    return NextResponse.json({ error: 'The site owner needs to connect a database first.' }, { status: 503 });
  }

  const body = await req.json();
  const { scryfallId, name, setCode, collectorNumber, foil, condition, quantity, image } = body;
  if (!scryfallId || !name) {
    return NextResponse.json({ error: 'Missing card details.' }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO collection_items
      (user_id, scryfall_id, card_name, set_code, collector_number, foil, condition, quantity, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      session.userId,
      scryfallId,
      name,
      setCode || null,
      collectorNumber || null,
      Boolean(foil),
      condition || 'Near Mint',
      Math.max(1, Number(quantity) || 1),
      image || null
    ]
  );

  return NextResponse.json({ id: result.rows[0].id });
}
