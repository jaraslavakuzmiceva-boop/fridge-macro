import type { Product, InventoryItem, MealItem, MealCandidate, MealTier, Settings, ForecastStatus, ShoppingSuggestion } from '../models/types';
import { calcMealMacros, getIdealMealMacros, getWeightInGrams, type MacroTotals } from './macroCalculator';
import { isExpired, isD0OrExpired } from './expirationUtils';

function scoreMeal(meal: MacroTotals, ideal: MacroTotals): { score: number; tier: MealTier } {
  if (ideal.kcal === 0) return { score: 1000, tier: 'red' };

  const kcalDev = Math.abs(meal.kcal - ideal.kcal) / Math.max(ideal.kcal, 1);
  const proteinDev = Math.abs(meal.protein - ideal.protein) / Math.max(ideal.protein, 1);
  const fatDev = Math.abs(meal.fat - ideal.fat) / Math.max(ideal.fat, 1);
  const carbsDev = Math.abs(meal.carbs - ideal.carbs) / Math.max(ideal.carbs, 1);

  const avgDev = (kcalDev + proteinDev + fatDev + carbsDev) / 4;

  let tier: MealTier;
  if (avgDev <= 0.10) tier = 'green';
  else if (avgDev <= 0.20) tier = 'yellow';
  else tier = 'red';

  // Lower score = better. Penalize simple carbs slightly.
  const simpleCarbPenalty = meal.simpleCarbs * 0.5;
  const score = avgDev * 100 + simpleCarbPenalty;

  return { score, tier };
}

interface AvailableProduct {
  product: Product;
  maxGrams: number;
  inventoryItem: InventoryItem;
}

function getAvailableProducts(
  inventory: InventoryItem[],
  products: Map<number, Product>,
  excludeExpired: boolean,
  excludeD0: boolean
): AvailableProduct[] {
  const available: AvailableProduct[] = [];
  for (const inv of inventory) {
    if (excludeExpired && isExpired(inv.expirationDate)) continue;
    if (excludeD0 && isD0OrExpired(inv.expirationDate)) continue;
    const product = products.get(inv.productId);
    if (!product) continue;
    const maxGrams = getWeightInGrams(inv.quantity, inv.unit, product);
    if (maxGrams <= 0) continue;
    available.push({ product, maxGrams, inventoryItem: inv });
  }
  return available;
}

function generatePortionSizes(maxGrams: number, product: Product): number[] {
  // Generate reasonable portion sizes in grams
  const portions: number[] = [];
  if (product.defaultUnit === 'pieces' && product.pieceWeightG) {
    // 1, 2, 3 pieces
    for (let p = 1; p <= 3; p++) {
      const g = p * product.pieceWeightG;
      if (g <= maxGrams) portions.push(g);
    }
  } else {
    // 50g, 100g, 150g, 200g, 300g increments
    for (const size of [50, 100, 150, 200, 300]) {
      if (size <= maxGrams) portions.push(size);
    }
  }
  if (portions.length === 0 && maxGrams > 0) {
    portions.push(Math.min(maxGrams, 100));
  }
  return portions;
}

export function generateMealCandidates(
  inventory: InventoryItem[],
  products: Map<number, Product>,
  remaining: MacroTotals,
  mealsLeft: number,
  maxCandidates: number = 3
): MealCandidate[] {
  const ideal = getIdealMealMacros(remaining, mealsLeft);
  const available = getAvailableProducts(inventory, products, true, false);

  if (available.length === 0) return [];

  const candidates: MealCandidate[] = [];

  // Generate 2-item combos
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const items = [available[i], available[j]];
      generateFromItems(items, ideal, products, candidates);
    }
  }

  // Generate 3-item combos (limit to first 10 products to avoid explosion)
  const limited = available.slice(0, 10);
  for (let i = 0; i < limited.length; i++) {
    for (let j = i + 1; j < limited.length; j++) {
      for (let k = j + 1; k < limited.length; k++) {
        const items = [limited[i], limited[j], limited[k]];
        generateFromItems(items, ideal, products, candidates);
      }
    }
  }

  // Sort by score ascending (lower is better)
  candidates.sort((a, b) => a.score - b.score);

  return candidates.slice(0, maxCandidates);
}

function generateFromItems(
  items: AvailableProduct[],
  ideal: MacroTotals,
  products: Map<number, Product>,
  candidates: MealCandidate[]
) {
  // Get all portion size combos
  const portionOptions = items.map(a => generatePortionSizes(a.maxGrams, a.product));

  // Try combinations of portions (limit iterations)
  const indices = portionOptions.map(() => 0);
  let iterations = 0;
  const maxIterations = 200;

  while (iterations < maxIterations) {
    const mealItems: MealItem[] = items.map((a, idx) => ({
      productId: a.product.id!,
      quantity: a.product.defaultUnit === 'pieces' && a.product.pieceWeightG
        ? portionOptions[idx][indices[idx]] / a.product.pieceWeightG
        : portionOptions[idx][indices[idx]],
      unit: a.product.defaultUnit,
    }));

    const macros = calcMealMacros(mealItems, products);
    const { score, tier } = scoreMeal(macros, ideal);

    candidates.push({
      items: mealItems,
      totalKcal: macros.kcal,
      totalProtein: macros.protein,
      totalFat: macros.fat,
      totalCarbs: macros.carbs,
      totalSimpleCarbs: macros.simpleCarbs,
      tier,
      score,
    });

    // Advance indices
    let carry = true;
    for (let p = indices.length - 1; p >= 0 && carry; p--) {
      indices[p]++;
      if (indices[p] < portionOptions[p].length) {
        carry = false;
      } else {
        indices[p] = 0;
      }
    }
    if (carry) break;
    iterations++;
  }
}

export function generateForecast(
  inventory: InventoryItem[],
  products: Map<number, Product>,
  settings: Settings
): ForecastStatus {
  // Tomorrow's inventory: exclude D0 and expired
  const tomorrowInventory = inventory.filter(inv => !isD0OrExpired(inv.expirationDate));

  const fullDayMacros: MacroTotals = {
    kcal: settings.dailyKcal,
    protein: settings.dailyProtein,
    fat: settings.dailyFat,
    carbs: settings.dailyCarbs,
    simpleCarbs: 0,
  };

  // Try to generate 3 meals for the full day
  const meals: MealCandidate[] = [];
  let remaining = { ...fullDayMacros };
  let mealsLeft = settings.mealsPerDay;

  for (let i = 0; i < 3; i++) {
    const candidates = generateMealCandidates(
      tomorrowInventory,
      products,
      remaining,
      mealsLeft
    );

    if (candidates.length === 0) break;

    const best = candidates[0];
    meals.push(best);

    remaining = {
      kcal: Math.max(0, remaining.kcal - best.totalKcal),
      protein: Math.max(0, remaining.protein - best.totalProtein),
      fat: Math.max(0, remaining.fat - best.totalFat),
      carbs: Math.max(0, remaining.carbs - best.totalCarbs),
      simpleCarbs: 0,
    };
    mealsLeft--;
  }

  // Determine overall tier
  let overallTier: MealTier = 'green';
  if (meals.length < 3) {
    overallTier = 'red';
  } else if (meals.some(m => m.tier === 'red')) {
    overallTier = 'red';
  } else if (meals.some(m => m.tier === 'yellow')) {
    overallTier = 'yellow';
  }

  // Shopping suggestions
  const shoppingNeeded: ShoppingSuggestion[] = [];

  if (meals.length < 3) {
    shoppingNeeded.push({
      reason: 'no-items',
      message: 'Not enough inventory items to compose 3 meals. Stock up on variety.',
    });
  }

  if (remaining.protein > settings.dailyProtein * 0.3) {
    shoppingNeeded.push({
      reason: 'low-protein',
      message: `Need ~${Math.round(remaining.protein)}g more protein. Consider chicken, fish, or eggs.`,
    });
  }
  if (remaining.carbs > settings.dailyCarbs * 0.3) {
    shoppingNeeded.push({
      reason: 'low-carbs',
      message: `Need ~${Math.round(remaining.carbs)}g more carbs. Consider rice, oats, or sweet potato.`,
    });
  }
  if (remaining.fat > settings.dailyFat * 0.3) {
    shoppingNeeded.push({
      reason: 'low-fat',
      message: `Need ~${Math.round(remaining.fat)}g more fat. Consider avocado, nuts, or olive oil.`,
    });
  }

  const expiringCount = inventory.filter(inv => {
    const status = getExpirationStatusForTomorrow(inv.expirationDate);
    return status === 'expiring';
  }).length;
  if (expiringCount > 0) {
    shoppingNeeded.push({
      reason: 'expiring',
      message: `${expiringCount} item(s) expiring soon. Plan to use them or replace.`,
    });
  }

  return { tier: overallTier, meals, shoppingNeeded };
}

function getExpirationStatusForTomorrow(expirationDate: string): 'ok' | 'expiring' {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate + 'T00:00:00');
  const diffDays = Math.ceil((exp.getTime() - tomorrow.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 2 ? 'expiring' : 'ok';
}
