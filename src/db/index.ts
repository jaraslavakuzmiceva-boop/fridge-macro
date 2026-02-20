import Dexie, { type Table } from 'dexie';
import type { Product, InventoryItem, Meal, Settings } from '../models/types';

class FridgeMacroDB extends Dexie {
  products!: Table<Product, number>;
  inventory!: Table<InventoryItem, number>;
  meals!: Table<Meal, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('FridgeMacroDB');
    this.version(1).stores({
      products: '++id, name',
      inventory: '++id, productId, storageLocation, expirationDate',
      meals: '++id, date',
      settings: '++id',
    });
  }
}

export const db = new FridgeMacroDB();

export async function purgeMealsNotOnDate(date: string): Promise<void> {
  await db.meals.where('date').notEqual(date).delete();
}

export async function ensureDefaultSettings(): Promise<Settings> {
  const count = await db.settings.count();
  if (count === 0) {
    const defaults: Settings = {
      dailyKcal: 2000,
      dailyProtein: 150,
      dailyFat: 70,
      dailyCarbs: 200,
      simpleCarbLimitPercent: 5,
      mealsPerDay: 4,
    };
    const id = await db.settings.add(defaults);
    return { ...defaults, id };
  }
  return (await db.settings.toCollection().first())!;
}

export async function seedProducts(): Promise<void> {
  const count = await db.products.count();
  if (count > 0) return;

  const seeds: Omit<Product, 'id'>[] = [
    { name: 'Chicken Breast', kcalPer100: 165, proteinPer100: 31, fatPer100: 3.6, carbsPer100: 0, simpleCarbsPer100: 0, defaultUnit: 'g' },
    { name: 'Rice (white)', kcalPer100: 130, proteinPer100: 2.7, fatPer100: 0.3, carbsPer100: 28, simpleCarbsPer100: 0.1, defaultUnit: 'g' },
    { name: 'Eggs', kcalPer100: 155, proteinPer100: 13, fatPer100: 11, carbsPer100: 1.1, simpleCarbsPer100: 1.1, defaultUnit: 'pieces', pieceWeightG: 60 },
    { name: 'Broccoli', kcalPer100: 34, proteinPer100: 2.8, fatPer100: 0.4, carbsPer100: 7, simpleCarbsPer100: 1.7, defaultUnit: 'g' },
    { name: 'Salmon', kcalPer100: 208, proteinPer100: 20, fatPer100: 13, carbsPer100: 0, simpleCarbsPer100: 0, defaultUnit: 'g' },
    { name: 'Greek Yogurt', kcalPer100: 59, proteinPer100: 10, fatPer100: 0.7, carbsPer100: 3.6, simpleCarbsPer100: 3.6, defaultUnit: 'g' },
    { name: 'Oats', kcalPer100: 389, proteinPer100: 16.9, fatPer100: 6.9, carbsPer100: 66, simpleCarbsPer100: 1, defaultUnit: 'g' },
    { name: 'Banana', kcalPer100: 89, proteinPer100: 1.1, fatPer100: 0.3, carbsPer100: 23, simpleCarbsPer100: 12, defaultUnit: 'pieces', pieceWeightG: 120 },
    { name: 'Olive Oil', kcalPer100: 884, proteinPer100: 0, fatPer100: 100, carbsPer100: 0, simpleCarbsPer100: 0, defaultUnit: 'ml' },
    { name: 'Sweet Potato', kcalPer100: 86, proteinPer100: 1.6, fatPer100: 0.1, carbsPer100: 20, simpleCarbsPer100: 4.2, defaultUnit: 'g' },
    { name: 'Cottage Cheese', kcalPer100: 98, proteinPer100: 11, fatPer100: 4.3, carbsPer100: 3.4, simpleCarbsPer100: 2.7, defaultUnit: 'g' },
    { name: 'Almonds', kcalPer100: 579, proteinPer100: 21, fatPer100: 50, carbsPer100: 22, simpleCarbsPer100: 4, defaultUnit: 'g' },
    { name: 'Ground Beef (lean)', kcalPer100: 250, proteinPer100: 26, fatPer100: 15, carbsPer100: 0, simpleCarbsPer100: 0, defaultUnit: 'g' },
    { name: 'Pasta', kcalPer100: 131, proteinPer100: 5, fatPer100: 1.1, carbsPer100: 25, simpleCarbsPer100: 0.6, defaultUnit: 'g' },
    { name: 'Tomatoes', kcalPer100: 18, proteinPer100: 0.9, fatPer100: 0.2, carbsPer100: 3.9, simpleCarbsPer100: 2.6, defaultUnit: 'g' },
    { name: 'Avocado', kcalPer100: 160, proteinPer100: 2, fatPer100: 15, carbsPer100: 9, simpleCarbsPer100: 0.7, defaultUnit: 'pieces', pieceWeightG: 200 },
    { name: 'Milk (2%)', kcalPer100: 50, proteinPer100: 3.4, fatPer100: 2, carbsPer100: 5, simpleCarbsPer100: 5, defaultUnit: 'ml' },
    { name: 'Bread (whole wheat)', kcalPer100: 247, proteinPer100: 13, fatPer100: 3.4, carbsPer100: 41, simpleCarbsPer100: 6, defaultUnit: 'g' },
    { name: 'Turkey Breast', kcalPer100: 135, proteinPer100: 30, fatPer100: 1, carbsPer100: 0, simpleCarbsPer100: 0, defaultUnit: 'g' },
    { name: 'Spinach', kcalPer100: 23, proteinPer100: 2.9, fatPer100: 0.4, carbsPer100: 3.6, simpleCarbsPer100: 0.4, defaultUnit: 'g' },
  ];

  await db.products.bulkAdd(seeds as Product[]);
}
