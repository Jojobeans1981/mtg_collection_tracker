import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { query, dbConfigured } from '../../../../lib/db';

const WINDOW_DAYS = 30;

// Full per-card price trend table — every owned card, not just the top
// movers (that's the smaller widget on /collection). Powers /collection/trends.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ cards: [] });

  const result = await query(
    `SELECT o.scryfall_id, o.card_name, o.image_url,
            ps.captured_at, ps.retail_price, ps.buy_price
     FROM (SELECT DISTINCT scryfall_id, card_name, image_url FROM collection_items WHERE user_id = $1) o
     LEFT JOIN price_snapshots ps
       ON ps.scryfall_id = o.scryfall_id AND ps.captured_at >= CURRENT_DATE - INTERVAL '${WINDOW_DAYS} days'
     ORDER BY o.card_name ASC, ps.captured_at ASC`,
    [session.userId]
  );

  const byCard = new Map();
  for (const row of result.rows) {
    if (!byCard.has(row.scryfall_id)) {
      byCard.set(row.scryfall_id, {
        scryfallId: row.scryfall_id,
        name: row.card_name,
        image: row.image_url,
        points: []
      });
    }
    if (row.captured_at) {
      byCard.get(row.scryfall_id).points.push({
        date: row.captured_at,
        retail: row.retail_price == null ? null : Number(row.retail_price),
        buy: row.buy_price == null ? null : Number(row.buy_price)
      });
    }
  }

  const cards = [...byCard.values()].map((c) => {
    const withRetail = c.points.filter((p) => p.retail != null);
    const first = withRetail[0] || null;
    const last = withRetail[withRetail.length - 1] || null;
    const delta = first && last ? last.retail - first.retail : 0;
    const pct = first && first.retail > 0 ? (delta / first.retail) * 100 : 0;
    return { ...c, delta, pct, hasHistory: withRetail.length >= 2 };
  });

  // Biggest movers (by $ change) first, flat/no-history cards last, alphabetical within each.
  cards.sort((a, b) => {
    if (a.hasHistory !== b.hasHistory) return a.hasHistory ? -1 : 1;
    if (a.hasHistory) return Math.abs(b.delta) - Math.abs(a.delta);
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ cards, windowDays: WINDOW_DAYS });
}
