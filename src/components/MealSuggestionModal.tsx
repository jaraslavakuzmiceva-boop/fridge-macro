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
  const colorClass =
    dev === null        ? ''
    : Math.abs(dev) <= 0.10 ? 'neon-green'
    : Math.abs(dev) <= 0.20 ? 'neon-yellow'
    : 'neon-red';
  const arrow = dev === null ? '' : dev > 0.05 ? ' ↑' : dev < -0.05 ? ' ↓' : '';

  return (
    <div className="px-card p-2 text-center">
      <div className="px-label">{label}</div>
      <div className={`tx-value mt-1 ${colorClass}`}>{actual}</div>
      {ideal !== null && (
        <div className="tx-meta mt-0.5">
          /{ideal}{devPct !== null && devPct > 5 ? `${arrow}${devPct}%` : ''}
        </div>
      )}
    </div>
  );
}

export function MealSuggestionModal({ candidates, products, idealMacros, onAccept, onClose }: Props) {
  const [selected, setSelected] = useState(0);

  if (candidates.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="px-card w-full max-w-md p-6">
          <h3 className="mb-2">No Meal Suggestions</h3>
          <p className="tx-secondary mb-4">
            Not enough inventory to generate meal suggestions. Add more items to your fridge!
          </p>
          <button onClick={onClose} className="px-btn-outline">Close</button>
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
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="px-card w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3>Meal Suggestions</h3>
          <button onClick={onClose} className="px-btn-text text-xl leading-none">&times;</button>
        </div>

        {/* Option tabs */}
        <div className="flex gap-2 mb-4">
          {candidates.map((c, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`px-tab${idx === selected ? ' active' : ''}`}
            >
              {c.tier === 'green' ? '▲' : c.tier === 'yellow' ? '■' : '▼'} {c.totalKcal}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <TierBadge tier={candidate.tier} />
          <span className="px-label">Score: {candidate.score.toFixed(1)}</span>
        </div>

        <div className="space-y-2 mb-4">
          {candidate.items.map((item, idx) => {
            const product = products.get(item.productId);
            return (
              <div key={idx} className="flex justify-between p-2" style={{ borderBottom: '1px solid #1a3a1a' }}>
                <span className="tx-body">{product?.name ?? 'Unknown'}</span>
                <span className="tx-secondary">{item.quantity} {item.unit}</span>
              </div>
            );
          })}
        </div>

        {idealMacros && (
          <p className="px-label mb-2">vs ideal for this meal</p>
        )}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MacroCell label="kcal"    actual={candidate.totalKcal}     ideal={idealMacros?.kcal ?? null} />
          <MacroCell label="Protein" actual={candidate.totalProtein}   ideal={idealMacros?.protein ?? null} />
          <MacroCell label="Fat"     actual={candidate.totalFat}       ideal={idealMacros?.fat ?? null} />
          <MacroCell label="Carbs"   actual={candidate.totalCarbs}     ideal={idealMacros?.carbs ?? null} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}      className="px-btn-outline flex-1">Cancel</button>
          <button onClick={handleAccept} className="px-btn flex-1">Log Meal</button>
        </div>
      </div>
    </div>
  );
}
