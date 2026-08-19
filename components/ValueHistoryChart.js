'use client';

// Plain inline SVG line chart — no charting library needed for two lines
// over a handful of points. Colors match the app's existing collector
// (violet/forest) vs. dealer (ember) convention used everywhere else.
const COLLECTOR_COLOR = '#7c5cff';
const DEALER_COLOR = '#ff3d6e';
const W = 600;
const H = 160;
const PAD = 24;

function buildPath(points, maxVal) {
  if (points.length === 0) return '';
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  return points
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = maxVal > 0 ? H - PAD - (v / maxVal) * (H - PAD * 2) : H - PAD;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function ValueHistoryChart({ history }) {
  if (!history || history.length < 2) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-ink/50">
        Value history builds up as you visit your collection over time — check back after a couple of
        days to see a trend line.
      </div>
    );
  }

  const sellPoints = history.map((h) => h.sellTotal);
  const retailPoints = history.map((h) => h.retailTotal);
  const maxVal = Math.max(...sellPoints, ...retailPoints, 1);

  const first = history[0];
  const last = history[history.length - 1];
  const retailDelta = last.retailTotal - first.retailTotal;

  return (
    <div className="glass card-shadow rounded-xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-serif font-bold text-gold">✦ Value over time</p>
        <p className={`text-xs font-semibold ${retailDelta >= 0 ? 'text-forest' : 'text-ember'}`}>
          {retailDelta >= 0 ? '▲' : '▼'} ${Math.abs(retailDelta).toFixed(2)} since{' '}
          {new Date(first.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <path d={buildPath(retailPoints, maxVal)} fill="none" stroke={DEALER_COLOR} strokeWidth="2" />
        <path d={buildPath(sellPoints, maxVal)} fill="none" stroke={COLLECTOR_COLOR} strokeWidth="2" />
      </svg>
      <div className="mt-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLLECTOR_COLOR }} />
          If you sold to a dealer
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: DEALER_COLOR }} />
          Dealer retail value
        </span>
      </div>
    </div>
  );
}
