import { useState, useMemo } from 'react';
import { calcItemMacros } from '../logic/macroCalculator';
import type { Product, MealItem } from '../models/types';

interface ManualEntry {
  productId: number;
  quantity: string; // string for controlled input
  unit: 'g' | 'ml' | 'pieces';
}

interface Props {
  products: Map<number, Product>;
  onLog: (items: MealItem[], totals: { kcal: number; protein: number; fat: number; carbs: number; simpleCarbs: number }) => void;
  onClose: () => void;
}

export function AddManualMealModal({ products, onLog, onClose }: Props) {
  const productList = useMemo(
    () => Array.from(products.values()).sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const [entries, setEntries] = useState<ManualEntry[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<'g' | 'ml' | 'pieces'>('g');
  const [search, setSearch] = useState('');

  function levenshtein(a: string, b: string): number {
    const alen = a.length;
    const blen = b.length;
    if (alen === 0) return blen;
    if (blen === 0) return alen;
    const dp = new Array(blen + 1);
    for (let j = 0; j <= blen; j++) dp[j] = j;
    for (let i = 1; i <= alen; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= blen; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + cost
        );
        prev = temp;
      }
    }
    return dp[blen];
  }

  function fuzzyScore(name: string, query: string): number {
    const n = name.toLowerCase();
    const q = query.toLowerCase().trim();
    if (!q) return 1;

    const tokens = q.split(/\s+/).filter(Boolean);
    const nameTokens = n.split(/[^a-z0-9]+/).filter(Boolean);
    let total = 0;

    for (const token of tokens) {
      if (!token) continue;

      if (n.includes(token)) {
        const idx = n.indexOf(token);
        total += 100 - idx + Math.min(20, Math.round((token.length / n.length) * 20));
        continue;
      }

      // subsequence match
      let ni = 0;
      let ti = 0;
      let gaps = 0;
      while (ni < n.length && ti < token.length) {
        if (n[ni] === token[ti]) {
          ti++;
        } else {
          gaps++;
        }
        ni++;
      }
      if (ti !== token.length) return 0;
      const density = token.length / (token.length + gaps);
      total += 50 + Math.round(density * 20);
    }

    // typo tolerance per token
    for (const token of tokens) {
      if (!token) continue;
      const maxDist = Math.min(2, Math.max(1, Math.floor(token.length / 4)));
      let best = Infinity;
      for (const nt of nameTokens) {
        const d = levenshtein(token, nt);
        if (d < best) best = d;
        if (best === 0) break;
      }
      if (best <= maxDist) {
        total += 30 + (maxDist - best) * 5;
      }
    }

    return total;
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim();
    if (!q) return productList;
    const scored = productList
      .map(p => ({ p, score: fuzzyScore(p.name, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
    return scored.map(x => x.p);
  }, [productList, search]);

  function handleProductSelect(id: number) {
    setSelectedProductId(id);
    const p = products.get(id);
    if (p) setUnit(p.defaultUnit);
    setSearch(products.get(id)?.name ?? '');
  }

  function handleAddEntry() {
    if (selectedProductId === '') return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    setEntries(prev => [
      ...prev,
      { productId: selectedProductId as number, quantity, unit },
    ]);
    // reset row
    setSelectedProductId('');
    setQuantity('100');
    setUnit('g');
    setSearch('');
  }

  function handleRemoveEntry(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  }

  const totals = useMemo(() => {
    let kcal = 0, protein = 0, fat = 0, carbs = 0, simpleCarbs = 0;
    for (const e of entries) {
      const p = products.get(e.productId);
      if (!p) continue;
      const qty = parseFloat(e.quantity);
      if (isNaN(qty)) continue;
      const m = calcItemMacros({ productId: e.productId, quantity: qty, unit: e.unit }, p);
      kcal += m.kcal;
      protein += m.protein;
      fat += m.fat;
      carbs += m.carbs;
      simpleCarbs += m.simpleCarbs;
    }
    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      simpleCarbs: Math.round(simpleCarbs * 10) / 10,
    };
  }, [entries, products]);

  function handleLog() {
    if (entries.length === 0) return;
    const items: MealItem[] = entries.map(e => ({
      productId: e.productId,
      quantity: parseFloat(e.quantity),
      unit: e.unit,
    }));
    onLog(items, totals);
  }

  const selectedProduct = selectedProductId !== '' ? products.get(selectedProductId as number) : undefined;

  // preview macros for the current row being built
  const rowPreview = useMemo(() => {
    if (!selectedProduct) return null;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return null;
    return calcItemMacros({ productId: selectedProduct.id!, quantity: qty, unit }, selectedProduct);
  }, [selectedProduct, quantity, unit]);

  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Add Meal Manually</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Added items */}
          {entries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</p>
              {entries.map((e, idx) => {
                const p = products.get(e.productId);
                const qty = parseFloat(e.quantity);
                const m = p && !isNaN(qty) ? calcItemMacros({ productId: e.productId, quantity: qty, unit: e.unit }, p) : null;
                return (
                  <div key={idx} className="flex items-start justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{e.quantity} {e.unit}</p>
                      {m && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.kcal} kcal · P {m.protein}g · F {m.fat}g · C {m.carbs}g
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveEntry(idx)}
                      className="ml-2 text-gray-300 hover:text-red-500 text-xs shrink-0 pt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add product row */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Product</p>

            {/* Product search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search product…"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setSelectedProductId('');
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={() => {
                        handleProductSelect(p.id!);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 text-gray-700"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-1 text-gray-400 text-xs">({p.kcalPer100} kcal/100{p.defaultUnit === 'pieces' ? 'pc' : p.defaultUnit})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity + unit */}
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Amount"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as 'g' | 'ml' | 'pieces')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="pieces">pcs</option>
              </select>
            </div>

            {/* Row macro preview */}
            {rowPreview && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                {rowPreview.kcal} kcal · Protein {rowPreview.protein}g · Fat {rowPreview.fat}g · Carbs {rowPreview.carbs}g
              </p>
            )}

            <button
              onClick={handleAddEntry}
              disabled={selectedProductId === '' || !quantity || parseFloat(quantity) <= 0}
              className="w-full py-2 bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              + Add to Meal
            </button>
          </div>

          {/* Totals */}
          {entries.length > 0 && (
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Meal Total</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Calories', value: `${totals.kcal}`, unit: 'kcal' },
                  { label: 'Protein', value: `${totals.protein}`, unit: 'g' },
                  { label: 'Fat', value: `${totals.fat}`, unit: 'g' },
                  { label: 'Carbs', value: `${totals.carbs}`, unit: 'g' },
                ].map(({ label, value, unit: u }) => (
                  <div key={label} className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-bold text-gray-800">{value}</p>
                    <p className="text-xs text-gray-400">{u}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLog}
            disabled={entries.length === 0}
            className="flex-1 py-3 rounded-xl bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Log Meal
          </button>
        </div>
      </div>
    </div>
  );
}
