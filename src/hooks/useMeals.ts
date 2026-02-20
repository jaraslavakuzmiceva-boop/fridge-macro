import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getLocalISODate } from '../logic/dateUtils';
import type { Meal } from '../models/types';

export function useMeals() {
  const today = getLocalISODate();

  const todayMeals = useLiveQuery(
    () => db.meals.where('date').equals(today).toArray(),
    [today]
  ) ?? [];

  async function logMeal(meal: Omit<Meal, 'id' | 'createdAt'>) {
    await db.meals.add({
      ...meal,
      createdAt: new Date().toISOString(),
    } as Meal);
  }

  async function deleteMeal(id: number) {
    await db.meals.delete(id);
  }

  return { todayMeals, logMeal, deleteMeal };
}
