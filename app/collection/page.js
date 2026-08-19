'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import ValueHistoryChart from '../../components/ValueHistoryChart';
import BiggestMovers from '../../components/BiggestMovers';
import ScanImportModal from '../../components/ScanImportModal';

// Photo-scan bulk add is built and working, but paused until the Anthropic
// account backing it has a real credit balance — flip this back to true
// once billing is set up in console.anthropic.com.
const SCAN_FEATURE_ENABLED = false;

function fmt(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [history, setHistory] = useState([]);
  const [movers, setMovers] = useState([]);
  const [scanOpen, setScanOpen] = useState(false);

  async function load() {
    setFetching(true);
    const res = await fetch('/api/collection');
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
      setTotals(data.totals || null);
    }
    setFetching(false);

    // Fetch after the collection load above, since that call is what writes
    // today's snapshot rows in the first place.
    try {
      const histRes = await fetch('/api/collection/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.history || []);
        setMovers(histData.movers || []);
      }
    } catch {
      // history/movers are a bonus widget — a failure here shouldn't block the page
    }
  }

  useEffect(() => {
    if (!loading && user) load();
  }, [loading, user]);

  async function remove(id) {
    await fetch(`/api/collection/${id}`, { method: 'DELETE' });
    load();
  }

  async function updateQty(id, quantity) {
    await fetch(`/api/collection/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity })
    });
    load();
  }

  if (!loading && !user) {
    return (
      <div className="glass card-shadow mx-auto max-w-sm rounded-2xl p-8 text-center">
        <p className="mb-4 text-ink/70">Log in to see your collection.</p>
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-black">
          <span className="foil-text">My Collection</span>
        </h1>
        {/* Photo-scan bulk add is paused — the Anthropic account behind it has
            no credit balance yet, so it can't actually work right now. Left
            visible-but-disabled instead of hidden so it's clear this is
            coming soon, not missing. Flip SCAN_FEATURE_ENABLED back on once
            billing is set up. */}
        <button
          disabled={!SCAN_FEATURE_ENABLED}
          onClick={() => SCAN_FEATURE_ENABLED && setScanOpen(true)}
          title={SCAN_FEATURE_ENABLED ? undefined : 'Coming back soon — billing setup in progress.'}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            SCAN_FEATURE_ENABLED
              ? 'border-white/15 text-ink/80 hover:border-gold/60 hover:text-gold'
              : 'cursor-not-allowed border-white/10 text-ink/30'
          }`}
        >
          🚧 📷 Scan a photo to bulk add — under renovation
        </button>
      </div>

      {scanOpen && SCAN_FEATURE_ENABLED && (
        <ScanImportModal
          onClose={() => setScanOpen(false)}
          onDone={() => {
            load();
          }}
        />
      )}

      {totals && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Cards tracked" value={totals.cardCount} tone="plain" />
          <Stat label="If you sold to a dealer" value={fmt(totals.collectorSellTotal)} tone="collector" />
          <Stat label="Dealer retail value" value={fmt(totals.dealerSellTotal)} tone="dealer" />
        </div>
      )}

      {!fetching && totals && totals.cardCount > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
          <ValueHistoryChart history={history} />
          <BiggestMovers movers={movers} />
        </div>
      )}

      {fetching && <p className="text-ink/60">Loading your collection…</p>}
      {!fetching && items.length === 0 && (
        <p className="text-ink/60">
          Nothing here yet.{' '}
          <Link href="/" className="text-gold hover:text-cyan">
            Search for a card
          </Link>{' '}
          and add it.
        </p>
      )}

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="glass card-shadow flex items-center gap-3 rounded-xl p-3 transition hover:ring-1 hover:ring-cyan/40">
            {item.image ? (
              <img src={item.image} alt={item.name} className="h-16 w-12 rounded object-cover ring-1 ring-white/10" />
            ) : (
              <div className="h-16 w-12 rounded bg-white/5" />
            )}
            <div className="flex-1">
              <Link href={`/cards/${item.scryfallId}`} className="font-semibold text-parchment hover:text-cyan">
                {item.name}
              </Link>
              <p className="text-xs text-ink/50">
                {item.setCode?.toUpperCase()} · {item.condition} {item.foil ? '· ✦ Foil' : ''}
              </p>
              <div className="mt-1 flex gap-3 text-xs">
                <span className="text-forest">You sell: {fmt(item.prices.collectorSell)}</span>
                <span className="text-ember">Dealer sells: {fmt(item.prices.dealerSell)}</span>
              </div>
            </div>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQty(item.id, Number(e.target.value))}
              className="w-14 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center text-sm text-parchment focus:outline-none focus:ring-2 focus:ring-cyan"
            />
            <button onClick={() => remove(item.id)} className="text-sm text-ember/70 hover:text-ember">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const cls = tone === 'collector' ? 'badge-collector' : tone === 'dealer' ? 'badge-dealer' : 'glass';
  return (
    <div className={`rounded-xl p-4 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 font-serif text-3xl font-black">{value}</p>
    </div>
  );
}
