export interface Product {
  id?: number;
  name: string;
  kcalPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  simpleCarbsPer100: number;
  defaultUnit: 'g' | 'ml' | 'pieces';
  pieceWeightG?: number;
}

export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export interface InventoryItem {
  id?: number;
  productId: number;
  quantity: number;
  unit: 'g' | 'ml' | 'pieces';
  storageLocation: StorageLocation;
  expirationDate: string; // ISO date string YYYY-MM-DD
  addedAt: string;
}

export interface MealItem {
  productId: number;
  quantity: number;
  unit: 'g' | 'ml' | 'pieces';
}

export interface Meal {
  id?: number;
  date: string; // ISO date string YYYY-MM-DD
  items: MealItem[];
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalSimpleCarbs: number;
  createdAt: string;
}

export interface Settings {
  id?: number;
  dailyKcal: number;
  dailyProtein: number;
  dailyFat: number;
  dailyCarbs: number;
  simpleCarbLimitPercent: number;
  mealsPerDay: number;
}

export type ExpirationStatus = 'ok' | 'expiring-soon' | 'd0' | 'expired';

export type MealTier = 'green' | 'yellow' | 'red';

export interface MealCandidate {
  items: MealItem[];
  totalKcal: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalSimpleCarbs: number;
  tier: MealTier;
  score: number;
}

export interface ForecastStatus {
  tier: MealTier;
  meals: MealCandidate[];
  shoppingNeeded: ShoppingSuggestion[];
}

export interface ShoppingSuggestion {
  reason: 'low-protein' | 'low-carbs' | 'low-fat' | 'low-kcal' | 'no-items' | 'expiring';
  message: string;
}
