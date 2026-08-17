import Link from 'next/link';

function fmt(n) {
  return n == null ? '—' : `$${Number(n).toFixed(2)}`;
}

export default function CardTile({ card }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="card-shadow group relative flex flex-col overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition duration-300 hover:-translate-y-2 hover:ring-cyan/60 hover:shadow-glow"
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
    </Link>
  );
}
