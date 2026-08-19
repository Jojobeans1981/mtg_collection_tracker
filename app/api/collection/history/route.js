import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { query, dbConfigured } from '../../../../lib/db';

const WINDOW_DAYS = 30;
const MOVERS_LIMIT = 5;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ history: [], movers: [] });

  const historyResult = await query(
    `SELECT captured_at, sell_total, retail_total
     FROM collection_value_snapshots
     WHERE user_id = $1 AND captured_at >= CURRENT_DATE - INTERVAL '${WINDOW_DAYS} days'
     ORDER BY captured_at ASC`,
    [session.userId]
  );
  const history = historyResult.rows.map((r) => ({
    date: r.captured_at,
    sellTotal: Number(r.sell_total),
    retailTotal: Number(r.retail_total)
  }));

  // Biggest movers: for each card currently owned, compare its oldest vs.
  // most recent price snapshot within the window. Needs at least two
  // distinct days of data for a given card to say anything meaningful.
  const moversResult = await query(
    `WITH owned AS (
       SELECT DISTINCT scryfall_id, card_name, image_url
       FROM collection_items WHERE user_id = $1
     ),
     ranked AS (
       SELECT ps.scryfall_id, ps.captured_at, ps.buy_price, ps.retail_price,
              ROW_NUMBER() OVER (PARTITION BY ps.scryfall_id ORDER BY ps.captured_at ASC) AS rn_first,
              ROW_NUMBER() OVER (PARTITION BY ps.scryfall_id ORDER BY ps.captured_at DESC) AS rn_last
       FROM price_snapshots ps
       JOIN owned o ON o.scryfall_id = ps.scryfall_id
       WHERE ps.captured_at >= CURRENT_DATE - INTERVAL '${WINDOW_DAYS} days'
     )
     SELECT
       o.scryfall_id, o.card_name, o.image_url,
       f.retail_price AS first_retail, l.retail_price AS last_retail,
       f.buy_price AS first_buy, l.buy_price AS last_buy,
       f.captured_at AS first_date, l.captured_at AS last_date
     FROM owned o
     JOIN ranked f ON f.scryfall_id = o.scryfall_id AND f.rn_first = 1
     JOIN ranked l ON l.scryfall_id = o.scryfall_id AND l.rn_last = 1
     WHERE f.captured_at <> l.captured_at`,
    [session.userId]
  );

  const movers = moversResult.rows
    .map((r) => {
      const first = Number(r.first_retail);
      const last = Number(r.last_retail);
      const delta = last - first;
      const pct = first > 0 ? (delta / first) * 100 : 0;
      return {
        scryfallId: r.scryfall_id,
        name: r.card_name,
        image: r.image_url,
        firstRetail: first,
        lastRetail: last,
        delta,
        pct,
        sinceDate: r.first_date
      };
    })
    .filter((m) => Number.isFinite(m.delta) && m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, MOVERS_LIMIT);

  return NextResponse.json({ history, movers });
}
