'use client';

export default function PrintingPickerModal({ cardName, printings, onClose, onPick }) {
  const sorted = [...printings].sort((a, b) => (b.releasedAt || '').localeCompare(a.releasedAt || ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="glass card-shadow max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-gold">
            Choose a printing of <span className="foil-text">{cardName}</span>
          </h3>
          <button onClick={onClose} className="shrink-0 text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/50">{sorted.length} printings found — pick the one you mean.</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {sorted.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="group flex flex-col rounded-lg p-1 text-left ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-cyan/60 hover:shadow-glow"
            >
              {p.image ? (
                <img src={p.image} alt={`${p.setName} printing`} className="aspect-[5/7] w-full rounded object-cover" />
              ) : (
                <div className="aspect-[5/7] w-full rounded bg-white/5" />
              )}
              <p className="mt-1 truncate text-center text-[10px] font-semibold text-parchment">
                {p.setCode?.toUpperCase()} · {p.releasedAt?.slice(0, 4) || '—'}
              </p>
              <p className="truncate text-center text-[10px] text-ink/50" title={p.setName}>
                {p.setName} #{p.collectorNumber}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
