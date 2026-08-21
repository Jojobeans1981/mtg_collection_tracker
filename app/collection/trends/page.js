'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthProvider';
import Sparkline from '../../../components/Sparkline';

function fmt(n) {
  return n == null ? '—' : `$${Number(n).toFixed(2)}`;
}

export default function TrendsPage() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState([]);
  const [windowDays, setWindowDays] = useState(30);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    setFetching(true);
    fetch('/api/collection/trends')
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setWindowDays(data.windowDays || 30);
      })
      .finally(() => setFetching(false));
  }, [loading, user]);

  if (!loading && !user) {
    return (
      <div className="glass card-shadow mx-auto max-w-sm rounded-2xl p-8 text-center">
        <p className="mb-4 text-ink/70">Log in to see your collection&apos;s price trends.</p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-gradient-to-r from-forest to-cyan px-5 py-2 font-semibold text-parchment shadow-glow transition hover:scale-105"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold">
        <Link href="/collection" className="rounded-full px-4 py-2 text-ink/60 transition hover:text-cyan">
          My Collection
        </Link>
        <span className="rounded-full bg-white/10 px-4 py-2 text-gold">Price Trends</span>
      </div>

      <h1 className="mb-1 font-serif text-3xl font-black">
        <span className="foil-text">Price Trends</span>
      </h1>
      <p className="mb-6 text-sm text-ink/50">
        Every card you own, last {windowDays} days — dealer retail price change since the earliest snapshot on
        record for that card.
      </p>

      {fetching && <p className="text-ink/60">Loading…</p>}
      {!fetching && cards.length === 0 && (
        <p className="text-ink/60">
          Nothing tracked yet.{' '}
          <Link href="/" className="text-gold hover:text-cyan">
            Search for a card
          </Link>{' '}
          and add it to your collection.
        </p>
      )}

      {!fetching && cards.length > 0 && (
        <div className="glass card-shadow overflow-x-auto rounded-xl">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink/40">
                <th className="px-4 py-3">Card</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3 text-right">Then</th>
                <th className="px-4 py-3 text-right">Now</th>
                <th className="px-4 py-3 text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => {
                const up = c.delta >= 0;
                const withRetail = c.points.filter((p) => p.retail != null);
                const first = withRetail[0];
                const last = withRetail[withRetail.length - 1];
                return (
                  <tr key={c.scryfallId} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <Link href={`/cards/${c.scryfallId}`} className="flex items-center gap-2.5 text-parchment hover:text-cyan">
                        {c.image ? (
                          <img src={c.image} alt={c.name} className="h-10 w-7 rounded object-cover ring-1 ring-white/10" />
                        ) : (
                          <div className="h-10 w-7 rounded bg-white/5" />
                        )}
                        <span className="font-medium">{c.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Sparkline points={c.points} color={up ? '#7c5cff' : '#ff3d6e'} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink/60">{c.hasHistory ? fmt(first.retail) : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-parchment">{fmt(last?.retail)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${!c.hasHistory ? 'text-ink/30' : up ? 'text-forest' : 'text-ember'}`}>
                      {c.hasHistory ? (
                        <>
                          {up ? '▲' : '▼'} {fmt(Math.abs(c.delta))}{' '}
                          <span className="text-xs opacity-70">
                            ({up ? '+' : ''}
                            {c.pct.toFixed(0)}%)
                          </span>
                        </>
                      ) : (
                        'No history yet'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
