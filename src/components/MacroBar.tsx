interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
}

export function MacroBar({ label, current, target, unit }: MacroBarProps) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(0, target - current);
  const isOver = current > target;

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="px-label">{label}</span>
        <span className={`text-xs ${isOver ? 'neon-red' : 'text-gray-600'}`}>
          {isOver && '[!!] '}
          {Math.round(current)}/{target}{unit}
          {!isOver && ` (${Math.round(remaining)} left)`}
          {isOver && ' OVER'}
        </span>
      </div>
      <div className="px-bar-track">
        <div
          className={`px-bar-fill${isOver ? ' danger' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
