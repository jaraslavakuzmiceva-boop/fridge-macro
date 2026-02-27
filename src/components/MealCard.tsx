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
              className="text-emerald-400 hover:text-emerald-300 text-xs transition-colors"
            >
              Remove
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
