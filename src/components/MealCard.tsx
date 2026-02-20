import type { Meal, Product } from '../models/types';

interface Props {
  meal: Meal;
  products: Map<number, Product>;
  onDelete?: (meal: Meal) => void;
}

export function MealCard({ meal, products, onDelete }: Props) {
  return (
    <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div className="text-sm text-gray-500">
          {new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        {onDelete && meal.id && (
          <button
            onClick={() => onDelete(meal)}
            className="text-gray-400 hover:text-red-500 text-xs"
          >
            Remove
          </button>
        )}
      </div>
      <div className="mt-1 space-y-0.5">
        {meal.items.map((item, idx) => {
          const product = products.get(item.productId);
          return (
            <div key={idx} className="text-sm text-gray-700">
              {product?.name ?? 'Unknown'} — {item.quantity} {item.unit}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 text-xs text-gray-500">
        <span>{meal.totalKcal} kcal</span>
        <span>P: {meal.totalProtein}g</span>
        <span>F: {meal.totalFat}g</span>
        <span>C: {meal.totalCarbs}g</span>
      </div>
    </div>
  );
}
