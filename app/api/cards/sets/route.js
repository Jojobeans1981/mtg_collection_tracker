import { NextResponse } from 'next/server';
import { getSets } from '../../../../lib/scryfall';

export async function GET() {
  try {
    const sets = await getSets();
    return NextResponse.json({ sets });
  } catch (err) {
    return NextResponse.json({ sets: [], error: String(err.message || err) });
  }
}
