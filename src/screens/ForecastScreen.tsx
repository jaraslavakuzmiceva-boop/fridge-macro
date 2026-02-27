import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useSettings } from '../hooks/useSettings';
import { useInventory } from '../hooks/useInventory';
import { generateForecast } from '../logic/mealGenerator';
import { TierBadge } from '../components/StatusBadge';
import type { Product } from '../models/types';

export function ForecastScreen() {
  const { settings } = useSettings();
  const { items: inventory } = useInventory();
  const allProducts = useLiveQuery(() => db.products.toArray());

  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of allProducts ?? []) map.set(p.id!, p);
    return map;
  }, [allProducts]);

  const forecast = useMemo(() => {
    if (!settings) return null;
    return generateForecast(inventory, productMap, settings);
  }, [inventory, productMap, settings]);

  if (!settings || !forecast) return <div className="p-4 text-emerald-300">Loading...</div>;

  const tierColors = {
    green: 'border-emerald-500 bg-black',
    yellow: 'border-emerald-600 bg-black',
    red: 'border-emerald-800 bg-black',
  };

  const tierMessages = {
    green: "You're set for tomorrow! All meals can be composed from current inventory.",
    yellow: 'Tomorrow is possible but some meals are not ideal macro-wise.',
    red: 'Tomorrow looks challenging. Consider shopping for more items.',
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Tomorrow Forecast</h1>

      <div className={`p-4 rounded-xl border-2 mb-4 ${tierColors[forecast.tier]}`}>
        <div className="flex items-center gap-2 mb-2">
          <TierBadge tier={forecast.tier} />
          <span className="text-sm font-medium text-emerald-300">Overall Status</span>
        </div>
        <p className="text-sm text-emerald-300">{tierMessages[forecast.tier]}</p>
      </div>

      <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide mb-3">
        Simulated Meals ({forecast.meals.length}/3)
      </h2>

      {forecast.meals.length === 0 && (
        <p className="text-sm text-emerald-300 mb-4">No meals could be generated from tomorrow's inventory.</p>
      )}

      <div className="space-y-3 mb-6">
        {forecast.meals.map((meal, idx) => (
          <div key={idx} className="p-3 bg-black rounded-lg border border-emerald-900/40 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-emerald-300">Meal {idx + 1}</span>
              <TierBadge tier={meal.tier} />
            </div>
            <div className="space-y-1 mb-2">
              {meal.items.map((item, i) => {
                const product = productMap.get(item.productId);
                return (
                  <div key={i} className="text-sm text-emerald-300">
                    {product?.name ?? 'Unknown'} — {item.quantity} {item.unit}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-xs text-emerald-300">
              <span>{meal.totalKcal} kcal</span>
              <span>P: {meal.totalProtein}g</span>
              <span>F: {meal.totalFat}g</span>
              <span>C: {meal.totalCarbs}g</span>
            </div>
          </div>
        ))}
      </div>

      {forecast.shoppingNeeded.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide mb-3">
            Shopping Suggestions
          </h2>
          <div className="space-y-2">
            {forecast.shoppingNeeded.map((suggestion, idx) => (
              <div key={idx} className="p-3 bg-black border border-emerald-900/40 rounded-lg shadow-[0_0_0_1px_rgba(16,185,129,0.12)]">
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </span>
                  <div>
                    <span className="text-xs text-rose-300 font-medium uppercase">{suggestion.reason}</span>
                    <p className="text-sm text-emerald-300">{suggestion.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
