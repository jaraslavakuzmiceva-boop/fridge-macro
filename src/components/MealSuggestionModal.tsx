import { useState } from 'react';
import type { MealCandidate, Product, Meal } from '../models/types';
import type { MacroTotals } from '../logic/macroCalculator';
import { TierBadge } from './StatusBadge';
import { getLocalISODate } from '../logic/dateUtils';

interface Props {
  candidates: MealCandidate[];
  products: Map<number, Product>;
  idealMacros: MacroTotals | null;
  onAccept: (meal: Omit<Meal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

function MacroCell({ label, actual, ideal }: { label: string; actual: number; ideal: number | null }) {
  const dev = ideal && ideal > 0 ? (actual - ideal) / ideal : null;
  const devPct = dev !== null ? Math.round(Math.abs(dev) * 100) : null;
  const color =
    dev === null ? 'text-gray-600 bg-gray-50'
    : Math.abs(dev) <= 0.10 ? 'text-emerald-600 bg-emerald-50'
    : Math.abs(dev) <= 0.20 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50';
  const arrow = dev === null ? '' : dev > 0.05 ? ' ↑' : dev < -0.05 ? ' ↓' : '';

  return (
    <div className={`rounded-lg p-2 text-center ${color}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-sm">{actual}</div>
      {ideal !== null && (
        <div className="text-xs opacity-70">
          / {ideal}{devPct !== null && devPct > 5 ? `${arrow} ${devPct}%` : ''}
        </div>
      )}
    </div>
  );
}

export function MealSuggestionModal({ candidates, products, idealMacros, onAccept, onClose }: Props) {
  const [selected, setSelected] = useState(0);

  if (candidates.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Meal Suggestions</h3>
          <p className="text-gray-500 text-sm mb-4">
            Not enough inventory to generate meal suggestions. Add more items to your fridge!
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const candidate = candidates[selected];
  const today = getLocalISODate();

  function handleAccept() {
    onAccept({
      date: today,
      items: candidate.items,
      totalKcal: candidate.totalKcal,
      totalProtein: candidate.totalProtein,
      totalFat: candidate.totalFat,
      totalCarbs: candidate.totalCarbs,
      totalSimpleCarbs: candidate.totalSimpleCarbs,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Meal Suggestions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex gap-2 mb-4">
          {candidates.map((c, idx) => {
            const dot = c.tier === 'green' ? '🟢' : c.tier === 'yellow' ? '🟡' : '🔴';
            return (
              <button
                key={idx}
                onClick={() => setSelected(idx)}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors leading-tight ${
                  idx === selected
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {dot} {c.totalKcal} kcal
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <TierBadge tier={candidate.tier} />
          <span className="text-sm text-gray-500">Score: {candidate.score.toFixed(1)}</span>
        </div>

        <div className="space-y-2 mb-4">
          {candidate.items.map((item, idx) => {
            const product = products.get(item.productId);
            return (
              <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{product?.name ?? 'Unknown'}</span>
                <span className="text-sm text-gray-500">{item.quantity} {item.unit}</span>
              </div>
            );
          })}
        </div>

        {idealMacros && (
          <p className="text-xs text-gray-400 mb-1">vs ideal for this meal</p>
        )}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MacroCell label="kcal" actual={candidate.totalKcal} ideal={idealMacros?.kcal ?? null} />
          <MacroCell label="Protein" actual={candidate.totalProtein} ideal={idealMacros?.protein ?? null} />
          <MacroCell label="Fat" actual={candidate.totalFat} ideal={idealMacros?.fat ?? null} />
          <MacroCell label="Carbs" actual={candidate.totalCarbs} ideal={idealMacros?.carbs ?? null} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Log Meal
          </button>
        </div>
      </div>
    </div>
  );
}
