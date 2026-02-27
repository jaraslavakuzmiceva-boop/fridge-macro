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
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`text-xs flex items-center gap-1 ${isOver ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
          {isOver && <span>⚠️</span>}
          {Math.round(current)} / {target} {unit}
          {!isOver && ` (${Math.round(remaining)} left)`}
          {isOver && ' over!'}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
