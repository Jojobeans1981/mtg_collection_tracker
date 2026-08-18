import { NextResponse } from 'next/server';
import { getCardById, getCardPrintings } from '../../../../lib/scryfall';

// Lets the search grid check "does this card have other printings?" before
// navigating anywhere, so we can prompt for the right edition up front
// instead of dropping the user on whichever one Scryfall's unique=cards
// search happened to pick.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ printings: [] });

  const card = await getCardById(id);
  if (!card) return NextResponse.json({ printings: [] });

  const printings = await getCardPrintings(card);
  return NextResponse.json({ printings });
}
