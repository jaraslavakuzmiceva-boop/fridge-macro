import { useState } from 'react';
import type { Meal, Product } from '../models/types';

interface Props {
  meal: Meal;
  products: Map<number, Product>;
  onDelete?: (meal: Meal) => void;
}

export function MealCard({ meal, products, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="p-3 bg-black rounded-lg border border-emerald-900/40 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
      <div className="flex justify-between items-start">
        <div className="text-sm text-emerald-400">
          {new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        {onDelete && meal.id && (
          confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400">Remove?</span>
              <button
                onClick={() => onDelete(meal)}
                className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-emerald-400 hover:text-emerald-200"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Remove meal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )
        )}
      </div>
      <div className="mt-1 space-y-0.5">
        {meal.items.map((item, idx) => {
          const product = products.get(item.productId);
          return (
            <div key={idx} className="text-sm text-white">
              {product?.name ?? 'Unknown'} — {item.quantity} {item.unit}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 text-xs text-emerald-400">
        <span>{meal.totalKcal} kcal</span>
        <span>P: {meal.totalProtein}g</span>
        <span>F: {meal.totalFat}g</span>
        <span>C: {meal.totalCarbs}g</span>
      </div>
    </div>
  );
}
