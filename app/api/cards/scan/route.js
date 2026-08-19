import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { identifyCardsFromImage, visionConfigured } from '../../../../lib/cardVision';
import { searchCards, summarizeCard } from '../../../../lib/scryfall';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  if (!visionConfigured()) {
    return NextResponse.json(
      { error: "Photo scanning isn't set up yet — the site owner needs to add an ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('image');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is too large — try a smaller photo.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mediaType = typeof file.type === 'string' && file.type.startsWith('image/') ? file.type : 'image/jpeg';

  let detected;
  try {
    detected = await identifyCardsFromImage(base64, mediaType);
  } catch (err) {
    return NextResponse.json({ error: 'Scan failed — try a clearer, well-lit photo.' }, { status: 502 });
  }

  if (detected.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Resolve each detected name against Scryfall — vision only ever
  // proposes a name; Scryfall's search is still the source of truth for
  // whether the card exists and which printings it comes in.
  const results = await Promise.all(
    detected.map(async (d) => {
      let candidates = [];
      try {
        const { cards } = await searchCards(d.name);
        candidates = cards.slice(0, 5).map(summarizeCard);
      } catch {
        candidates = [];
      }
      return {
        detectedName: d.name,
        setHint: d.setHint,
        foil: d.foil,
        quantity: d.quantity,
        candidates
      };
    })
  );

  return NextResponse.json({ results });
}
