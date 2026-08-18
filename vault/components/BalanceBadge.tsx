export default function BalanceBadge({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-2">
      <span className="text-lg leading-none">💠</span>
      <span className="font-mono text-sm text-muted">баланс</span>
      <span className="font-mono text-base font-medium text-gold tabular-nums">
        {balance.toLocaleString("ru-RU")}
      </span>
    </div>
  );
}
