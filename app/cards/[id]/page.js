import { getCardById, cardImage, getCardPrintings } from '../../../lib/scryfall';
import { getCardPrices } from '../../../lib/prices';
import { getSession } from '../../../lib/auth';
import { query, dbConfigured } from '../../../lib/db';
import PriceBadge from '../../../components/PriceBadge';
import AddToCollectionForm from '../../../components/AddToCollectionForm';
import CardVersionPicker from '../../../components/CardVersionPicker';

export const dynamic = 'force-dynamic';

// How many of this exact printing, and how many total across every edition
// of the card by name, the signed-in user already has tracked - so "add to
// collection" isn't a guess at whether you already own this one.
async function getOwnedCounts(userId, scryfallId, name) {
  if (!userId || !dbConfigured()) return { exact: 0, total: 0 };
  try {
    const result = await query(
      `SELECT
         COALESCE(SUM(quantity) FILTER (WHERE scryfall_id = $2), 0) AS exact_qty,
         COALESCE(SUM(quantity), 0) AS total_qty
       FROM collection_items
       WHERE user_id = $1 AND LOWER(card_name) = LOWER($3)`,
      [userId, scryfallId, name]
    );
    return { exact: Number(result.rows[0].exact_qty), total: Number(result.rows[0].total_qty) };
  } catch {
    return { exact: 0, total: 0 };
  }
}

export default async function CardDetailPage({ params }) {
  const card = await getCardById(params.id);
  if (!card) {
    return <p>Card not found.</p>;
  }

  const session = await getSession();

  const [prices, printings, owned] = await Promise.all([
    getCardPrices({
      scryfallId: card.id,
      name: card.name,
      setName: card.set_name,
      usd: card.prices?.usd,
      usdFoil: card.prices?.usd_foil,
      foil: false
    }),
    getCardPrintings(card),
    getOwnedCounts(session?.userId, card.id, card.name)
  ]);

  const summary = {
    id: card.id,
    name: card.name,
    setCode: card.set,
    collectorNumber: card.collector_number,
    image: cardImage(card),
    hasFoil: Boolean(card.foil),
    hasNonfoil: Boolean(card.nonfoil)
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[300px_1fr]">
        <div>
          {summary.image ? (
            <img
              src={summary.image}
              alt={card.name}
              className="card-shadow w-full rounded-xl ring-1 ring-white/10 transition hover:shadow-glow-gold"
            />
          ) : (
            <div className="card-shadow aspect-[5/7] w-full rounded-xl bg-white/5" />
          )}
        </div>
        <div className="space-y-4">
          <div>
            <h1 className="font-serif text-4xl font-black tracking-wide">
              <span className="foil-text">{card.name}</span>
            </h1>
            <p className="mt-1 text-ink/60">
              {card.type_line} · {card.set_name} ({card.set?.toUpperCase()}) #{card.collector_number} ·{' '}
              <span className="capitalize text-gold">{card.rarity}</span>
            </p>
          </div>

          <PriceBadge prices={prices} />
          <p className="text-xs text-ink/40">
            * Estimated buylist value — Card Kingdom pricing for this exact printing wasn&apos;t available, so
            this is ~65% of current market price, the typical range dealers pay.
          </p>

          {card.mana_cost && <p className="text-sm text-ink/80">Mana cost: {card.mana_cost}</p>}
          {card.oracle_text && (
            <p className="glass whitespace-pre-line rounded-lg p-3 text-sm leading-relaxed text-ink/90">
              {card.oracle_text}
            </p>
          )}
          {card.flavor_text && <p className="text-sm italic text-ink/50">{card.flavor_text}</p>}
          {card.artist && <p className="text-xs text-ink/40">Illustrated by {card.artist}</p>}

          {session && owned.total > 0 && (
            <p className="text-sm text-gold">
              ✦ You already have {owned.exact} of this exact printing
              {owned.total > owned.exact && ` (${owned.total} total across all editions)`}.
            </p>
          )}

          <AddToCollectionForm card={summary} />
        </div>
      </div>

      <CardVersionPicker printings={printings} currentId={card.id} />
    </div>
  );
}
