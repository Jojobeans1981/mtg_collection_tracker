import { NextResponse } from 'next/server';
import { getCardById, cardImage } from '../../../../lib/scryfall';
import { getCardPrices } from '../../../../lib/prices';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const foilParam = searchParams.get('foil') === 'true';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const card = await getCardById(id);
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const prices = await getCardPrices({
    scryfallId: card.id,
    name: card.name,
    setName: card.set_name,
    usd: card.prices?.usd,
    usdFoil: card.prices?.usd_foil,
    foil: foilParam
  });

  return NextResponse.json({
    card: {
      id: card.id,
      name: card.name,
      setName: card.set_name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      typeLine: card.type_line,
      oracleText: card.oracle_text || card.card_faces?.map((f) => f.oracle_text).join('\n---\n') || '',
      manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
      rarity: card.rarity,
      artist: card.artist,
      flavorText: card.flavor_text || '',
      image: cardImage(card),
      hasFoil: Boolean(card.foil),
      hasNonfoil: Boolean(card.nonfoil),
      scryfallUri: card.scryfall_uri,
      rulingsUri: card.rulings_uri
    },
    prices
  });
}
