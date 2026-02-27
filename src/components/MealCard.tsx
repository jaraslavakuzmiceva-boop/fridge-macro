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
    <div className="px-card p-3">
      <div className="flex justify-between items-start">
        <div className="tx-secondary">
          {new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        {onDelete && meal.id && (
          confirming ? (
            <div className="flex items-center gap-2">
              <span className="px-label">Remove?</span>
              <button onClick={() => onDelete(meal)} className="px-btn-text danger">Yes</button>
              <button onClick={() => setConfirming(false)} className="px-btn-text">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="px-btn-text">
              Remove
            </button>
          )
        )}
      </div>
      <div className="mt-1 space-y-0.5">
        {meal.items.map((item, idx) => {
          const product = products.get(item.productId);
          return (
            <div key={idx} className="tx-body">
              {product?.name ?? 'Unknown'} — {item.quantity} {item.unit}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 tx-meta">
        <span>{meal.totalKcal} kcal</span>
        <span>P: {meal.totalProtein}g</span>
        <span>F: {meal.totalFat}g</span>
        <span>C: {meal.totalCarbs}g</span>
      </div>
    </div>
  );
}
