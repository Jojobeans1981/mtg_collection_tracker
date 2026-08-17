import Link from 'next/link';

export default function CardVersionPicker({ printings, currentId }) {
  if (!printings || printings.length < 2) return null;

  return (
    <div className="glass card-shadow rounded-xl p-4">
      <p className="mb-3 flex items-center gap-2 font-serif font-bold text-gold">
        ✦ Wrong art or set? Change version
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-normal text-ink/60">
          {printings.length} printings
        </span>
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {printings.map((p) => {
          const active = p.id === currentId;
          return (
            <Link
              key={p.id}
              href={`/cards/${p.id}`}
              className={`group relative w-24 shrink-0 rounded-lg p-1 transition ${
                active
                  ? 'foil-shine bg-gradient-to-b from-gold/30 to-transparent ring-2 ring-gold shadow-glow-gold'
                  : 'ring-1 ring-white/10 hover:-translate-y-1 hover:ring-cyan/60 hover:shadow-glow'
              }`}
            >
              {p.image ? (
                <img src={p.image} alt={`${p.setName} printing`} className="aspect-[5/7] w-full rounded object-cover" />
              ) : (
                <div className="aspect-[5/7] w-full rounded bg-white/5" />
              )}
              <p className={`mt-1 truncate text-center text-[10px] font-semibold ${active ? 'text-gold' : 'text-ink/70'}`}>
                {active ? 'Current' : p.setCode?.toUpperCase()}
              </p>
              <p className="truncate text-center text-[10px] text-ink/50" title={p.setName}>
                {p.setName} #{p.collectorNumber}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
