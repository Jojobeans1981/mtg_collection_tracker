'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

// Merges a `set:<code>` token into a query string, replacing any existing
// set: token rather than stacking duplicates.
function withSetToken(q, code) {
  const stripped = q.replace(/\bset:\S+/gi, '').trim();
  return code ? `${stripped} set:${code}`.trim() : stripped;
}

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [sets, setSets] = useState([]);
  const [editionQuery, setEditionQuery] = useState('');
  const [editionOpen, setEditionOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    fetch('/api/cards/sets')
      .then((r) => r.json())
      .then((d) => setSets(d.sets || []))
      .catch(() => setSets([]));
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setEditionOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const matches = useMemo(() => {
    const needle = editionQuery.trim().toLowerCase();
    if (!needle) return sets.slice(0, 8);
    return sets.filter((s) => s.name.toLowerCase().includes(needle) || s.code.toLowerCase() === needle).slice(0, 8);
  }, [sets, editionQuery]);

  const activeSetMatch = q.match(/\bset:(\S+)/i);
  const activeSetCode = activeSetMatch?.[1]?.toLowerCase();
  const activeSet = activeSetCode ? sets.find((s) => s.code === activeSetCode) : null;

  function pickEdition(code) {
    setQ((prev) => withSetToken(prev, code));
    setEditionQuery('');
    setEditionOpen(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div ref={boxRef} className="relative">
      <form onSubmit={submit} className="glass flex flex-wrap items-center gap-1.5 rounded-full p-1.5 shadow-glow sm:flex-nowrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any Magic card, e.g. Lightning Bolt"
          className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2 text-sm text-parchment placeholder:text-ink/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setEditionOpen((v) => !v)}
          className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
            activeSet
              ? 'border-gold/60 bg-gold/10 text-gold shadow-glow-gold'
              : 'border-white/15 text-ink/60 hover:border-cyan/50 hover:text-cyan'
          }`}
          title="Narrow your search to a specific edition/set"
        >
          ✦ {activeSet ? activeSet.name : 'Edition'}
        </button>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-gradient-to-r from-forest to-cyan px-5 py-2 text-sm font-bold text-parchment transition hover:scale-105 hover:shadow-glow"
        >
          Search
        </button>
      </form>

      {editionOpen && (
        <div className="glass-strong card-shadow absolute right-0 z-30 mt-2 w-72 rounded-xl p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
            Know the edition? Narrow it down
          </p>
          <input
            autoFocus
            value={editionQuery}
            onChange={(e) => setEditionQuery(e.target.value)}
            placeholder="Type a set name, e.g. Alpha, Strixhaven…"
            className="mb-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-parchment placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-cyan"
          />
          <div className="max-h-56 overflow-y-auto">
            {activeSet && (
              <button
                type="button"
                onClick={() => pickEdition(null)}
                className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-ember/80 hover:bg-white/5"
              >
                ✕ Clear edition filter
              </button>
            )}
            {matches.length === 0 && <p className="px-2 py-2 text-xs text-ink/40">No matching editions.</p>}
            {matches.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => pickEdition(s.code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/10 ${
                  s.code === activeSetCode ? 'text-gold' : 'text-ink/80'
                }`}
              >
                <span className="truncate">{s.name}</span>
                <span className="shrink-0 text-[10px] uppercase text-ink/40">{s.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
