import { useState } from 'react';
import type { MealCandidate, Product, Meal } from '../models/types';
import { TierBadge } from './StatusBadge';

interface Props {
  candidates: MealCandidate[];
  products: Map<number, Product>;
  onAccept: (meal: Omit<Meal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export function MealSuggestionModal({ candidates, products, onAccept, onClose }: Props) {
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
  const today = new Date().toISOString().slice(0, 10);

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
          {candidates.map((_c, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                idx === selected
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Option {idx + 1}
            </button>
          ))}
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

        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">kcal</div>
            <div className="font-semibold text-blue-600">{candidate.totalKcal}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Protein</div>
            <div className="font-semibold text-red-600">{candidate.totalProtein}g</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Fat</div>
            <div className="font-semibold text-yellow-600">{candidate.totalFat}g</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Carbs</div>
            <div className="font-semibold text-green-600">{candidate.totalCarbs}g</div>
          </div>
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
