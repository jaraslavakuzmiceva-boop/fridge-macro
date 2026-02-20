import type { MealItem, Product } from '../models/types';

export const EGG_MAX_PER_DAY = 3;

function isEggName(name: string): boolean {
  const norm = name.trim().toLowerCase();
  return norm === 'egg' || norm === 'eggs';
}

export function getEggProductId(products: Map<number, Product>): number | null {
  for (const [id, product] of products) {
    if (isEggName(product.name)) return id;
  }
  return null;
}

export function countEggsInItems(
  items: MealItem[],
  products: Map<number, Product>,
  eggProductId: number | null
): number {
  if (!eggProductId) return 0;
  let total = 0;
  for (const item of items) {
    if (item.productId !== eggProductId) continue;
    if (item.unit === 'pieces') {
      total += item.quantity;
      continue;
    }
    const product = products.get(item.productId);
    if (product?.pieceWeightG && item.unit === 'g') {
      total += item.quantity / product.pieceWeightG;
    }
  }
  return total;
}
