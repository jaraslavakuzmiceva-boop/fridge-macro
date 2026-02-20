import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { useInventory } from '../hooks/useInventory';
import { InventoryItemRow } from '../components/InventoryItem';
import type { Product, InventoryItem, StorageLocation } from '../models/types';

export function InventoryScreen() {
  const { items, addItem, updateItem, removeItem } = useInventory();
  const allProducts = useLiveQuery(() => db.products.toArray()) ?? [];
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of allProducts) map.set(p.id!, p);
    return map;
  }, [allProducts]);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  // Group by storage location
  const grouped = useMemo(() => {
    const groups: Record<StorageLocation, InventoryItem[]> = { fridge: [], freezer: [], pantry: [] };
    for (const item of items) {
      groups[item.storageLocation].push(item);
    }
    return groups;
  }, [items]);

  const locationLabels: Record<StorageLocation, string> = {
    fridge: 'Fridge',
    freezer: 'Freezer',
    pantry: 'Pantry',
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Inventory</h1>
        <Link to="/products" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
          Manage Products
        </Link>
      </div>

      <button
        onClick={() => { setShowAdd(true); setEditItem(null); }}
        className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-medium mb-4 hover:bg-emerald-600 transition-colors"
      >
        + Add Item
      </button>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Your fridge is empty. Add some items!
        </p>
      )}

      {(['fridge', 'freezer', 'pantry'] as StorageLocation[]).map(loc => {
        const group = grouped[loc];
        if (group.length === 0) return null;
        return (
          <div key={loc} className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {locationLabels[loc]} ({group.length})
            </h2>
            <div className="space-y-2">
              {group.map(item => (
                <InventoryItemRow
                  key={item.id}
                  item={item}
                  product={productMap.get(item.productId)}
                  onEdit={(it) => { setEditItem(it); setShowAdd(true); }}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </div>
        );
      })}

      {showAdd && (
        <AddEditModal
          products={allProducts}
          editItem={editItem}
          onSave={async (data) => {
            if (editItem?.id) {
              await updateItem(editItem.id, data);
            } else {
              await addItem(data as Omit<InventoryItem, 'id' | 'addedAt'>);
            }
            setShowAdd(false);
            setEditItem(null);
          }}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function AddEditModal({
  products,
  editItem,
  onSave,
  onClose,
}: {
  products: Product[];
  editItem: InventoryItem | null;
  onSave: (data: Partial<InventoryItem>) => Promise<void>;
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(editItem?.productId ?? (products[0]?.id ?? 0));
  const [quantity, setQuantity] = useState(editItem?.quantity?.toString() ?? '100');
  const [unit, setUnit] = useState<'g' | 'ml' | 'pieces'>(editItem?.unit ?? 'g');
  const [location, setLocation] = useState<StorageLocation>(editItem?.storageLocation ?? 'fridge');
  const [expDate, setExpDate] = useState(editItem?.expirationDate ?? getDefaultExpDate());

  // Update unit when product changes
  const selectedProduct = products.find(p => p.id === productId);

  function getDefaultExpDate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  function handleProductChange(id: number) {
    setProductId(id);
    const p = products.find(pr => pr.id === id);
    if (p) setUnit(p.defaultUnit);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      productId,
      quantity: parseFloat(quantity) || 0,
      unit,
      storageLocation: location,
      expirationDate: expDate,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {editItem ? 'Edit Item' : 'Add Item'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {!editItem && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={productId}
              onChange={e => handleProductChange(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="0"
              step="any"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as 'g' | 'ml' | 'pieces')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="g">grams</option>
              <option value="ml">ml</option>
              <option value="pieces">pieces</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Storage</label>
          <div className="flex gap-2">
            {(['fridge', 'freezer', 'pantry'] as StorageLocation[]).map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location === loc ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {loc.charAt(0).toUpperCase() + loc.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
          <input
            type="date"
            value={expDate}
            onChange={e => setExpDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {selectedProduct && (
          <div className="mb-4 text-xs text-gray-400">
            Per 100g: {selectedProduct.kcalPer100} kcal, P:{selectedProduct.proteinPer100}g, F:{selectedProduct.fatPer100}g, C:{selectedProduct.carbsPer100}g
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          {editItem ? 'Save Changes' : 'Add to Inventory'}
        </button>
      </form>
    </div>
  );
}
