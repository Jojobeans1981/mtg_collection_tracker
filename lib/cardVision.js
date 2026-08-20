// Bulk photo import: send a photo of a binder page / stack of cards to
// Gemini's vision to read off card names, then resolve each name against
// Scryfall (same trusted card database the rest of the app uses — vision
// only ever proposes a name, it never becomes the source of truth for a
// card's identity or price).
//
// Uses Google's Gemini API (gemini-2.5-flash) specifically because its free
// tier has no cost at all for a hobby app's volume — unlike everything else
// swapped in here, this keeps the "free forever" promise intact. Get a key
// at aistudio.google.com/apikey (no credit card required for the free tier).
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROMPT = `You are looking at a photo of one or more Magic: The Gathering cards (a binder page, a stack, a playmat, or a single card).

List every distinct card you can identify. For each, give your best guess at:
- name: the exact card name as printed on the card
- setHint: any visible set symbol description, set name, or collector number text near the bottom of the card, if legible (else null)
- foil: true if it visibly has a foil/shiny treatment, else false
- quantity: how many copies of this exact card (same name AND same art/printing) appear in the photo

Respond with ONLY a JSON array, no prose. Example:
[{"name":"Lightning Bolt","setHint":"looks like a modern border, maybe M25","foil":false,"quantity":2}]

If you can't confidently identify any Magic cards in the photo, respond with [].`;

export function visionConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function parseCardList(text) {
  const stripped = text.replace(/^```(json)?\s*|```\s*$/g, '').trim();
  let cards;
  try {
    cards = JSON.parse(stripped);
  } catch {
    return [];
  }
  if (!Array.isArray(cards)) return [];
  return cards
    .filter((c) => c && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      setHint: typeof c.setHint === 'string' && c.setHint.trim() ? c.setHint.trim() : null,
      foil: Boolean(c.foil),
      quantity: Math.max(1, Math.min(99, Number(c.quantity) || 1))
    }));
}

export async function identifyCardsFromImage(base64Image, mediaType) {
  if (!visionConfigured()) {
    const err = new Error('VISION_NOT_CONFIGURED');
    err.code = 'VISION_NOT_CONFIGURED';
    throw err;
  }

  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ inline_data: { mime_type: mediaType, data: base64Image } }, { text: PROMPT }]
        }
      ],
      generationConfig: { responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Vision request failed: ${res.status} ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const textBlock = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '[]';
  return parseCardList(textBlock);
}
