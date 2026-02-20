import type { Product, MealItem, Settings } from '../models/types';

export interface MacroTotals {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  simpleCarbs: number;
}

export function getWeightInGrams(quantity: number, unit: string, product: Product): number {
  if (unit === 'pieces' && product.pieceWeightG) {
    return quantity * product.pieceWeightG;
  }
  return quantity; // g or ml treated as grams for macro calc
}

export function calcItemMacros(item: MealItem, product: Product): MacroTotals {
  const grams = getWeightInGrams(item.quantity, item.unit, product);
  const factor = grams / 100;
  return {
    kcal: Math.round(product.kcalPer100 * factor),
    protein: Math.round(product.proteinPer100 * factor * 10) / 10,
    fat: Math.round(product.fatPer100 * factor * 10) / 10,
    carbs: Math.round(product.carbsPer100 * factor * 10) / 10,
    simpleCarbs: Math.round(product.simpleCarbsPer100 * factor * 10) / 10,
  };
}

export function calcMealMacros(items: MealItem[], products: Map<number, Product>): MacroTotals {
  const totals: MacroTotals = { kcal: 0, protein: 0, fat: 0, carbs: 0, simpleCarbs: 0 };
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) continue;
    const m = calcItemMacros(item, product);
    totals.kcal += m.kcal;
    totals.protein += m.protein;
    totals.fat += m.fat;
    totals.carbs += m.carbs;
    totals.simpleCarbs += m.simpleCarbs;
  }
  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    simpleCarbs: Math.round(totals.simpleCarbs * 10) / 10,
  };
}

export function getRemainingMacros(
  settings: Settings,
  consumed: MacroTotals
): MacroTotals {
  return {
    kcal: Math.max(0, settings.dailyKcal - consumed.kcal),
    protein: Math.max(0, settings.dailyProtein - consumed.protein),
    fat: Math.max(0, settings.dailyFat - consumed.fat),
    carbs: Math.max(0, settings.dailyCarbs - consumed.carbs),
    simpleCarbs: 0,
  };
}

export function getIdealMealMacros(remaining: MacroTotals, mealsLeft: number): MacroTotals {
  if (mealsLeft <= 0) mealsLeft = 1;
  return {
    kcal: Math.round(remaining.kcal / mealsLeft),
    protein: Math.round(remaining.protein / mealsLeft * 10) / 10,
    fat: Math.round(remaining.fat / mealsLeft * 10) / 10,
    carbs: Math.round(remaining.carbs / mealsLeft * 10) / 10,
    simpleCarbs: 0,
  };
}
