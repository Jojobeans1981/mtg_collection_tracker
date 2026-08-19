'use client';

import { useRef, useState } from 'react';

const MAX_DIMENSION = 1600;

function fmt(n) {
  return n == null ? '—' : `$${Number(n).toFixed(2)}`;
}

// Downscale/recompress client-side before upload — phone camera photos are
// routinely 5-15MB, well past what a serverless function body can take and
// far more detail than card-name recognition needs.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('compress failed'))), 'image/jpeg', 0.82);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ScanImportModal({ onClose, onDone }) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState(null); // resolved detections, editable
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setRows(null);
    setPreviewUrl(URL.createObjectURL(file));
    setScanning(true);
    try {
      const blob = await compressImage(file);
      const body = new FormData();
      body.append('image', blob, 'scan.jpg');
      const res = await fetch('/api/cards/scan', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scan failed.');
      } else if (!data.results || data.results.length === 0) {
        setError("Couldn't confidently identify any cards in that photo — try better lighting or a closer shot.");
      } else {
        setRows(
          data.results.map((r) => ({
            detectedName: r.detectedName,
            setHint: r.setHint,
            foil: r.foil,
            quantity: r.quantity,
            candidateIndex: r.candidates.length ? 0 : null,
            candidates: r.candidates,
            include: r.candidates.length > 0
          }))
        );
      }
    } catch {
      setError('Scan failed — check your connection and try again.');
    } finally {
      setScanning(false);
    }
  }

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function addAll() {
    setAdding(true);
    let count = 0;
    for (const row of rows) {
      if (!row.include || row.candidateIndex == null) continue;
      const card = row.candidates[row.candidateIndex];
      try {
        const res = await fetch('/api/collection', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            scryfallId: card.id,
            name: card.name,
            setCode: card.setCode,
            collectorNumber: card.collectorNumber,
            foil: row.foil,
            condition: 'Near Mint',
            quantity: row.quantity,
            image: card.image
          })
        });
        if (res.ok) count += 1;
      } catch {
        // keep going — report the count that succeeded
      }
    }
    setAdding(false);
    setAddedCount(count);
    onDone?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="glass card-shadow max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-bold text-gold">📷 Scan a photo to bulk add</h3>
          <button onClick={onClose} className="shrink-0 text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/50">
          A binder page, a stack of cards, or a single card — good lighting and names facing the camera work best.
        </p>

        {!rows && (
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="w-full rounded-xl border-2 border-dashed border-white/20 p-8 text-center text-sm text-ink/60 transition hover:border-cyan/50 hover:text-cyan disabled:opacity-60"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="mx-auto max-h-40 rounded-lg object-contain" />
              ) : (
                'Tap to take or choose a photo'
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
            {scanning && <p className="text-center text-sm text-cyan">Reading cards from your photo…</p>}
            {error && <p className="text-center text-sm text-ember">{error}</p>}
          </div>
        )}

        {rows && addedCount === null && (
          <div className="space-y-3">
            <p className="text-xs text-ink/50">
              Found {rows.length} card{rows.length === 1 ? '' : 's'} — check the match and quantity before adding.
            </p>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="glass flex items-center gap-3 rounded-lg p-2.5">
                  {row.candidateIndex != null && row.candidates[row.candidateIndex]?.image ? (
                    <img
                      src={row.candidates[row.candidateIndex].image}
                      alt=""
                      className="h-14 w-10 rounded object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="h-14 w-10 rounded bg-white/5" />
                  )}
                  <div className="flex-1 space-y-1">
                    {row.candidates.length === 0 ? (
                      <p className="text-sm text-ink/50">
                        Detected "{row.detectedName}" — no Scryfall match found, skipping.
                      </p>
                    ) : (
                      <select
                        value={row.candidateIndex ?? ''}
                        onChange={(e) => updateRow(i, { candidateIndex: Number(e.target.value) })}
                        className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-sm text-parchment focus:outline-none focus:ring-2 focus:ring-cyan"
                      >
                        {row.candidates.map((c, ci) => (
                          <option key={c.id} value={ci} className="bg-void2 text-parchment">
                            {c.name} — {c.setName} ({fmt(c.usd)})
                          </option>
                        ))}
                      </select>
                    )}
                    {row.setHint && <p className="truncate text-[11px] text-ink/40">Saw: {row.setHint}</p>}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    disabled={!row.candidates.length}
                    className="w-14 shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-center text-sm text-parchment focus:outline-none focus:ring-2 focus:ring-cyan disabled:opacity-40"
                  />
                  <label className="flex shrink-0 items-center gap-1 text-xs text-ink/60">
                    <input
                      type="checkbox"
                      checked={row.include}
                      disabled={!row.candidates.length}
                      onChange={(e) => updateRow(i, { include: e.target.checked })}
                      className="accent-gold"
                    />
                    Add
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRows(null);
                  setPreviewUrl(null);
                  setError(null);
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-ink/70 transition hover:border-cyan/50 hover:text-cyan"
              >
                Scan another
              </button>
              <button
                onClick={addAll}
                disabled={adding || !rows.some((r) => r.include)}
                className="flex-1 rounded-full bg-gradient-to-r from-forest to-cyan px-4 py-2 text-sm font-bold text-parchment transition hover:scale-105 hover:shadow-glow disabled:opacity-60"
              >
                {adding ? 'Adding…' : `Add ${rows.filter((r) => r.include).length} card(s) to my collection`}
              </button>
            </div>
          </div>
        )}

        {addedCount !== null && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-parchment">
              Added {addedCount} card{addedCount === 1 ? '' : 's'} to your collection.
            </p>
            <button
              onClick={onClose}
              className="rounded-full bg-gradient-to-r from-forest to-cyan px-5 py-2 text-sm font-bold text-parchment transition hover:scale-105 hover:shadow-glow"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
