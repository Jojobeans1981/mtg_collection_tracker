import { NextResponse } from 'next/server';
import { searchCards, summarizeCard } from '../../../../lib/scryfall';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const page = Number(searchParams.get('page') || '1');

  if (!q) return NextResponse.json({ cards: [], hasMore: false, total: 0 });

  try {
    const { cards, hasMore, total } = await searchCards(q, page);
    return NextResponse.json({ cards: cards.map(summarizeCard), hasMore, total });
  } catch (err) {
    return NextResponse.json({ cards: [], hasMore: false, total: 0, error: String(err.message || err) });
  }
}
