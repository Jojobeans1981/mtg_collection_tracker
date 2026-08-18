'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PrintingPickerModal from './PrintingPickerModal';

function fmt(n) {
  return n == null ? '—' : `$${Number(n).toFixed(2)}`;
}

export default function CardTile({ card }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [printings, setPrintings] = useState(null);

  // Scryfall's search collapses every printing of a card into one result, so
  // before navigating we check whether this name has other editions — if so,
  // ask which one is meant instead of silently dropping the user on whatever
  // printing Scryfall happened to pick.
  async function handleClick(e) {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/cards/printings?id=${card.id}`);
      const data = await res.json();
      if (data.printings?.length > 1) {
        setPrintings(data.printings);
      } else {
        router.push(`/cards/${card.id}`);
      }
    } catch {
      router.push(`/cards/${card.id}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <a
        href={`/cards/${card.id}`}
        onClick={handleClick}
        aria-busy={checking}
        className={`card-shadow group relative flex flex-col overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition duration-300 hover:-translate-y-2 hover:ring-cyan/60 hover:shadow-glow ${
          checking ? 'cursor-wait opacity-70' : ''
        }`}
      >
        {card.image ? (
          <img src={card.image} alt={card.name} className="aspect-[5/7] w-full object-cover transition duration-300 group-hover:brightness-110" />
        ) : (
          <div className="aspect-[5/7] w-full bg-white/5" />
        )}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="p-2.5">
          <p className="truncate text-sm font-semibold text-parchment">{card.name}</p>
          <p className="truncate text-xs text-ink/50">{card.setName}</p>
          <p className="mt-1 text-xs font-semibold text-gold">Market: {fmt(card.usd)}</p>
        </div>
      </a>
      {printings && (
        <PrintingPickerModal
          cardName={card.name}
          printings={printings}
          onClose={() => setPrintings(null)}
          onPick={(id) => {
            setPrintings(null);
            router.push(`/cards/${id}`);
          }}
        />
      )}
    </>
  );
}
