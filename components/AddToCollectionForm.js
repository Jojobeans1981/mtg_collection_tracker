'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const CONDITIONS = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];

export default function AddToCollectionForm({ card }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [foil, setFoil] = useState(false);
  const [condition, setCondition] = useState('Near Mint');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <p className="text-sm text-ink/60">
        <button onClick={() => router.push('/register')} className="font-semibold text-gold underline decoration-dotted underline-offset-4 hover:text-cyan">
          Sign up free
        </button>{' '}
        to add this card to your tracked collection.
      </p>
    );
  }

  async function submit() {
    setBusy(true);
    setStatus(null);
    const res = await fetch('/api/collection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scryfallId: card.id,
        name: card.name,
        setCode: card.setCode,
        collectorNumber: card.collectorNumber,
        foil,
        condition,
        quantity,
        image: card.image
      })
    });
    setBusy(false);
    if (!res.ok) {
      setStatus('Could not add card.');
      return;
    }
    const data = await res.json().catch(() => null);
    setStatus(
      data?.merged
        ? `Already had this one (same edition/foil/condition) — now at ${data.quantity}.`
        : 'Added to your collection.'
    );
  }

  return (
    <div className="glass card-shadow space-y-3 rounded-xl p-4">
      <p className="font-serif font-bold text-gold">✦ Add to my collection</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {card.hasFoil && card.hasNonfoil && (
          <label
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
              foil ? 'foil-shine border-gold/70 bg-gold/10 text-gold shadow-glow-gold' : 'border-white/15 text-ink/70'
            }`}
          >
            <input type="checkbox" checked={foil} onChange={(e) => setFoil(e.target.checked)} className="accent-gold" />
            Foil
          </label>
        )}
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-cyan"
        >
          {CONDITIONS.map((c) => (
            <option key={c} className="bg-void2 text-parchment">
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-16 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-cyan"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-full bg-gradient-to-r from-forest to-cyan px-4 py-1.5 font-semibold text-parchment transition hover:scale-105 hover:shadow-glow disabled:opacity-60"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {status && <p className="text-sm text-ink/70">{status}</p>}
    </div>
  );
}
