import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { InventoryItem } from '../models/types';

export function useInventory() {
  const items = useLiveQuery(() => db.inventory.toArray()) ?? [];

  async function addItem(item: Omit<InventoryItem, 'id' | 'addedAt'>) {
    await db.inventory.add({
      ...item,
      addedAt: new Date().toISOString(),
    } as InventoryItem);
  }

  async function updateItem(id: number, updates: Partial<InventoryItem>) {
    await db.inventory.update(id, updates);
  }

  async function removeItem(id: number) {
    await db.inventory.delete(id);
  }

  async function deductItems(deductions: { productId: number; quantity: number; unit: string }[]) {
    await db.transaction('rw', db.inventory, async () => {
      for (const d of deductions) {
        const invItems = await db.inventory
          .where('productId')
          .equals(d.productId)
          .sortBy('expirationDate');

        let remaining = d.quantity;
        for (const inv of invItems) {
          if (remaining <= 0) break;
          if (inv.quantity <= remaining) {
            remaining -= inv.quantity;
            await db.inventory.delete(inv.id!);
          } else {
            await db.inventory.update(inv.id!, { quantity: inv.quantity - remaining });
            remaining = 0;
          }
        }
      }
    });
  }

  return { items, addItem, updateItem, removeItem, deductItems };
}
