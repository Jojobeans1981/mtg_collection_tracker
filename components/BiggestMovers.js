'use client';

import Link from 'next/link';

function fmt(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function BiggestMovers({ movers }) {
  if (!movers || movers.length === 0) {
    return null;
  }

  return (
    <div className="glass card-shadow rounded-xl p-4">
      <p className="mb-3 font-serif font-bold text-gold">✦ Biggest movers in your collection</p>
      <div className="space-y-2">
        {movers.map((m) => {
          const up = m.delta >= 0;
          return (
            <Link
              key={m.scryfallId}
              href={`/cards/${m.scryfallId}`}
              className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-white/5"
            >
              {m.image ? (
                <img src={m.image} alt={m.name} className="h-12 w-9 rounded object-cover ring-1 ring-white/10" />
              ) : (
                <div className="h-12 w-9 rounded bg-white/5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-parchment">{m.name}</p>
                <p className="text-xs text-ink/50">
                  {fmt(m.firstRetail)} → {fmt(m.lastRetail)} (dealer retail)
                </p>
              </div>
              <p className={`text-sm font-bold ${up ? 'text-forest' : 'text-ember'}`}>
                {up ? '▲' : '▼'} {fmt(Math.abs(m.delta))}
                <span className="ml-1 text-xs opacity-70">
                  ({up ? '+' : ''}
                  {m.pct.toFixed(0)}%)
                </span>
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
