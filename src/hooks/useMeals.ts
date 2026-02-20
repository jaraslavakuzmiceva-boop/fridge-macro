import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getLocalISODate } from '../logic/dateUtils';
import type { InventoryItem, Meal } from '../models/types';

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

  async function deleteMeal(meal: Meal) {
    if (meal.sources && meal.sources.length > 0) {
      await db.transaction('rw', db.meals, db.inventory, async () => {
        for (const src of meal.sources!) {
          if (src.inventoryId) {
            const existing = await db.inventory.get(src.inventoryId);
            if (existing) {
              await db.inventory.update(src.inventoryId, {
                quantity: existing.quantity + src.quantity,
              });
              continue;
            }
          }

          const restored: InventoryItem = {
            productId: src.productId,
            quantity: src.quantity,
            unit: src.unit,
            storageLocation: src.storageLocation,
            expirationDate: src.expirationDate,
            addedAt: new Date().toISOString(),
          };
          await db.inventory.add(restored);
        }

        if (meal.id) {
          await db.meals.delete(meal.id);
        }
      });
      return;
    }

    if (meal.id) {
      await db.meals.delete(meal.id);
    }
  }

  return { todayMeals, logMeal, deleteMeal };
}
