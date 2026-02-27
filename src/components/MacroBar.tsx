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
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-white">{label}</span>
        <span className={`text-xs flex items-center gap-1 ${isOver ? 'text-emerald-300 font-semibold' : 'text-emerald-400'}`}>
          {isOver && <span>⚠️</span>}
          {Math.round(current)} / {target} {unit}
          {!isOver && ` (${Math.round(remaining)} left)`}
          {isOver && ' over!'}
        </span>
      </div>
      <div className="w-full bg-emerald-900/60 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${isOver ? 'bg-emerald-700' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
