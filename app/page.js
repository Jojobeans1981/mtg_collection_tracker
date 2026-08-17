import SearchBox from '../components/SearchBox';
import CardTile from '../components/CardTile';
import { searchCards, summarizeCard } from '../lib/scryfall';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }) {
  const q = searchParams?.q?.trim();

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 h-px w-24 animate-pulseGlow bg-gradient-to-r from-transparent via-gold to-transparent" />
        <h1 className="animate-float font-serif text-5xl font-black tracking-wide sm:text-6xl">
          <span className="foil-text">MTG Vault</span>
        </h1>
        <p className="mt-4 text-lg text-ink/70">
          Look up any Magic: The Gathering card, learn its secrets, and see two honest numbers: what you
          could sell it for to a dealer, and what a dealer sells it for. Track your own collection and
          watch its value glow in real time.
        </p>
        <div className="mt-8">
          <SearchBox />
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <Feature title="Two real prices" body="Collector buylist value vs. dealer retail value, sourced live, side by side." glow="hover:shadow-glow" />
          <Feature title="Learn each card" body="Full rules text, set info, and rulings pulled straight from Scryfall's card database." glow="hover:shadow-glow-ember" />
          <Feature title="Free forever" body="No account needed to browse and price-check. Sign up free to track your own collection." glow="hover:shadow-glow-gold" />
        </div>
      </div>
    );
  }

  let cards = [];
  let error = null;
  try {
    const result = await searchCards(q);
    cards = result.cards.map(summarizeCard);
  } catch (err) {
    error = 'Search failed — try a simpler card name.';
  }

  return (
    <div>
      <div className="mb-8">
        <SearchBox />
      </div>
      <h2 className="mb-5 font-serif text-xl font-bold text-ink/90">
        {cards.length ? (
          <>
            <span className="foil-text">{cards.length}</span> result{cards.length === 1 ? '' : 's'} for "{q}"
          </>
        ) : (
          `No results for "${q}"`
        )}
      </h2>
      {error && <p className="text-ember">{error}</p>}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
        {cards.map((c) => (
          <CardTile key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}

function Feature({ title, body, glow }) {
  return (
    <div className={`glass group rounded-xl p-4 transition hover:-translate-y-1 ${glow}`}>
      <p className="font-serif font-bold text-gold">{title}</p>
      <p className="mt-1 text-sm text-ink/70">{body}</p>
    </div>
  );
}
