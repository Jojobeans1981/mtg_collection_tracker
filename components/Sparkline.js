'use client';

const W = 120;
const H = 32;
const PAD = 3;

export default function Sparkline({ points, color = '#ff3d6e' }) {
  const values = points.map((p) => p.retail).filter((v) => v != null);
  if (values.length < 2) {
    return <span className="text-xs text-ink/30">Not enough data yet</span>;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.75" />
    </svg>
  );
}
