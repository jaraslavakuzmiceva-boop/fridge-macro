import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useSettings } from '../hooks/useSettings';
import { useMeals } from '../hooks/useMeals';
import { useInventory } from '../hooks/useInventory';
import { MacroBar } from '../components/MacroBar';
import { MealCard } from '../components/MealCard';
import { MealSuggestionModal } from '../components/MealSuggestionModal';
import { AddManualMealModal } from '../components/AddManualMealModal';
import { getRemainingMacros, getIdealMealMacros, type MacroTotals } from '../logic/macroCalculator';
import { generateMealCandidates } from '../logic/mealGenerator';
import { countEggsInItems, EGG_MAX_PER_DAY, getEggProductId } from '../logic/eggRules';
import { getLocalISODate } from '../logic/dateUtils';
import type { Product, Meal, MealItem } from '../models/types';

export function TodayScreen() {
  const { settings } = useSettings();
  const { todayMeals, logMeal, deleteMeal } = useMeals();
  const { items: inventory, deductItems } = useInventory();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const allProducts = useLiveQuery(() => db.products.toArray()) ?? [];
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of allProducts) map.set(p.id!, p);
    return map;
  }, [allProducts]);

  const eggProductId = useMemo(() => getEggProductId(productMap), [productMap]);
  const eggsConsumedToday = useMemo(() => {
    if (!eggProductId) return 0;
    let total = 0;
    for (const meal of todayMeals) {
      total += countEggsInItems(meal.items, productMap, eggProductId);
    }
    return total;
  }, [todayMeals, productMap, eggProductId]);
  const eggsRemaining = eggProductId ? Math.max(0, EGG_MAX_PER_DAY - eggsConsumedToday) : undefined;

  const consumed = useMemo<MacroTotals>(() => {
    const totals: MacroTotals = { kcal: 0, protein: 0, fat: 0, carbs: 0, simpleCarbs: 0 };
    for (const meal of todayMeals) {
      totals.kcal += meal.totalKcal;
      totals.protein += meal.totalProtein;
      totals.fat += meal.totalFat;
      totals.carbs += meal.totalCarbs;
      totals.simpleCarbs += meal.totalSimpleCarbs;
    }
    return totals;
  }, [todayMeals]);

  const remaining = settings ? getRemainingMacros(settings, consumed) : null;
  const mealsLeft = settings ? Math.max(1, settings.mealsPerDay - todayMeals.length) : 1;

  const candidates = useMemo(() => {
    if (!remaining || !settings) return [];
    return generateMealCandidates(
      inventory,
      productMap,
      remaining,
      mealsLeft,
      3,
      { eggProductId, eggsRemaining }
    );
  }, [inventory, productMap, remaining, mealsLeft, settings, eggProductId, eggsRemaining]);

  async function handleAcceptMeal(meal: Omit<Meal, 'id' | 'createdAt'>) {
    const sources = await deductItems(meal.items.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit })));
    await logMeal({ ...meal, sources });
    setShowSuggestions(false);
    showToast('Meal logged! 🎉');
  }

  async function handleLogManualMeal(
    items: MealItem[],
    totals: { kcal: number; protein: number; fat: number; carbs: number; simpleCarbs: number }
  ) {
    await logMeal({
      date: getLocalISODate(),
      items,
      totalKcal: totals.kcal,
      totalProtein: totals.protein,
      totalFat: totals.fat,
      totalCarbs: totals.carbs,
      totalSimpleCarbs: totals.simpleCarbs,
    });
    setShowManualEntry(false);
    showToast('Meal logged! 🎉');
  }

  function handleGenerateMeal() {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSuggestions(true);
    }, 400);
  }

  if (!settings) return <div className="p-4 text-gray-500">Loading...</div>;

  const simpleCarbPct = consumed.kcal > 0
    ? ((consumed.simpleCarbs * 4) / consumed.kcal * 100)
    : 0;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
      <h1 className="text-xl font-bold text-gray-800 mb-4">Today</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <MacroBar label="Calories" current={consumed.kcal} target={settings.dailyKcal} unit="kcal" />
        <MacroBar label="Protein" current={consumed.protein} target={settings.dailyProtein} unit="g" />
        <MacroBar label="Fat" current={consumed.fat} target={settings.dailyFat} unit="g" />
        <MacroBar label="Carbs" current={consumed.carbs} target={settings.dailyCarbs} unit="g" />

        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Simple carbs:</span>
          <span className={`text-xs font-medium ${simpleCarbPct > settings.simpleCarbLimitPercent ? 'text-red-600' : 'text-gray-600'}`}>
            {simpleCarbPct.toFixed(1)}% of kcal
            {simpleCarbPct > settings.simpleCarbLimitPercent && ' (over limit!)'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGenerateMeal}
          disabled={isGenerating}
          className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-base hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
              Generating…
            </>
          ) : 'Generate Next Meal'}
        </button>
        <button
          onClick={() => setShowManualEntry(true)}
          className="flex-1 py-3 bg-white text-emerald-600 border border-emerald-400 rounded-xl font-semibold text-base hover:bg-emerald-50 transition-colors shadow-sm"
        >
          Add Meal Manually
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Today's Meals ({todayMeals.length})
        </h2>
        {todayMeals.length === 0 && (
          <p className="text-sm text-gray-400">No meals logged yet. Generate your first meal!</p>
        )}
        {todayMeals.map(meal => (
          <MealCard key={meal.id} meal={meal} products={productMap} onDelete={deleteMeal} />
        ))}
      </div>

      {showSuggestions && (
        <MealSuggestionModal
          candidates={candidates}
          products={productMap}
          idealMacros={remaining ? getIdealMealMacros(remaining, mealsLeft) : null}
          onAccept={handleAcceptMeal}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      {showManualEntry && (
        <AddManualMealModal
          products={productMap}
          onLog={handleLogManualMeal}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
}
