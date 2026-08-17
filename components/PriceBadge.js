function fmt(n) {
  return n == null ? '—' : `$${Number(n).toFixed(2)}`;
}

function timeAgo(ts) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'moments ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
}

export default function PriceBadge({ prices }) {
  if (!prices) return null;
  const approximate = prices.printingMatch === 'approximate';
  const ckAge = timeAgo(prices.ckAsOf);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="badge-collector rounded-lg px-3 py-2 font-semibold" title={prices.collectorSellSource}>
          <span className="block text-[10px] font-medium uppercase tracking-wider opacity-80">You sell it</span>
          {fmt(prices.collectorSell)}
          {prices.collectorSellEstimated ? '*' : ''}
        </span>
        <span className="badge-dealer rounded-lg px-3 py-2 font-semibold" title={prices.dealerSellSource}>
          <span className="block text-[10px] font-medium uppercase tracking-wider opacity-80">Dealer sells it</span>
          {fmt(prices.dealerSell)}
        </span>
      </div>

      {/* Sourcing is shown up-front, not buried in a hover tooltip — trust
          requires the reader to see where a number came from without
          having to hunt for it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/50">
        <span>
          Sources: {prices.collectorSellSource} · {prices.dealerSellSource}
        </span>
        {approximate && (
          <span className="text-gold" title="Card Kingdom doesn't stock this exact printing, so this price is matched by card name and set — it may reflect a different printing's price.">
            ~ closest-printing match, not this exact card
          </span>
        )}
        {ckAge && <span>· Card Kingdom data {ckAge}</span>}
      </div>

      {prices.sourcesDisagree && (
        <p className="glass rounded-lg border border-gold/40 px-3 py-2 text-xs text-gold">
          ⚠ Scryfall/TCGplayer market price ({fmt(prices.marketPrice)}) and Card Kingdom retail (
          {fmt(prices.dealerSell)}) disagree by more than 30% — double-check before relying on either number.
        </p>
      )}
    </div>
  );
}
