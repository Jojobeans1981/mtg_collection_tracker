// Bulk photo import: send a photo of a binder page / stack of cards to
// Claude's vision to read off card names, then resolve each name against
// Scryfall (same trusted card database the rest of the app uses — vision
// only ever proposes a name, it never becomes the source of truth for a
// card's identity or price).
//
// Requires ANTHROPIC_API_KEY — unlike every other data source in this app
// (Scryfall, Card Kingdom), this one is a paid API call per scan. Nothing
// else in MTG Vault costs money to run; this feature does.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const PROMPT = `You are looking at a photo of one or more Magic: The Gathering cards (a binder page, a stack, a playmat, or a single card).

List every distinct card you can identify. For each, give your best guess at:
- name: the exact card name as printed on the card
- setHint: any visible set symbol description, set name, or collector number text near the bottom of the card, if legible (else null)
- foil: true if it visibly has a foil/shiny treatment, else false
- quantity: how many copies of this exact card (same name AND same art/printing) appear in the photo

Respond with ONLY a JSON array, no prose, no markdown code fences. Example:
[{"name":"Lightning Bolt","setHint":"looks like a modern border, maybe M25","foil":false,"quantity":2}]

If you can't confidently identify any Magic cards in the photo, respond with [].`;

export function visionConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
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

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1536,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: PROMPT }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Vision request failed: ${res.status} ${detail.slice(0, 300)}`);
  }

  const json = await res.json();
  const textBlock = json?.content?.find((c) => c.type === 'text')?.text || '[]';
  return parseCardList(textBlock);
}
