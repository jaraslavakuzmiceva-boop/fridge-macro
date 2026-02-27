import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Product } from '../models/types';

export function ProductsScreen() {
  const products = useLiveQuery(() => db.products.orderBy('name').toArray()) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  async function handleDelete(id: number) {
    if (confirm('Delete this product template?')) {
      await db.products.delete(id);
    }
  }

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Product Templates</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="flex-1 border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => { setEditProduct(null); setShowForm(true); }}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          + New
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(product => (
          <div key={product.id} className="p-3 bg-black rounded-lg shadow-sm border border-emerald-900/40">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-white">{product.name}</div>
                <div className="text-xs text-emerald-300 mt-0.5">
                  {product.kcalPer100} kcal &middot; P:{product.proteinPer100}g &middot; F:{product.fatPer100}g &middot; C:{product.carbsPer100}g per 100{product.defaultUnit === 'ml' ? 'ml' : 'g'}
                </div>
                {product.defaultUnit === 'pieces' && product.pieceWeightG && (
                  <div className="text-xs text-emerald-400">1 piece = {product.pieceWeightG}g</div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditProduct(product); setShowForm(true); }}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(product.id!)}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-emerald-400 text-center py-8">
          {search ? 'No products match your search.' : 'No product templates yet.'}
        </p>
      )}

      {showForm && (
        <ProductForm
          product={editProduct}
          onSave={async (data) => {
            if (editProduct?.id) {
              await db.products.update(editProduct.id, data);
            } else {
              await db.products.add(data as Product);
            }
            setShowForm(false);
            setEditProduct(null);
          }}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  onSave,
  onClose,
}: {
  product: Product | null;
  onSave: (data: Partial<Product>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [kcal, setKcal] = useState(product?.kcalPer100?.toString() ?? '');
  const [protein, setProtein] = useState(product?.proteinPer100?.toString() ?? '');
  const [fat, setFat] = useState(product?.fatPer100?.toString() ?? '');
  const [carbs, setCarbs] = useState(product?.carbsPer100?.toString() ?? '');
  const [simpleCarbs, setSimpleCarbs] = useState(product?.simpleCarbsPer100?.toString() ?? '0');
  const [defaultUnit, setDefaultUnit] = useState<'g' | 'ml' | 'pieces'>(product?.defaultUnit ?? 'g');
  const [pieceWeight, setPieceWeight] = useState(product?.pieceWeightG?.toString() ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      name,
      kcalPer100: parseFloat(kcal) || 0,
      proteinPer100: parseFloat(protein) || 0,
      fatPer100: parseFloat(fat) || 0,
      carbsPer100: parseFloat(carbs) || 0,
      simpleCarbsPer100: parseFloat(simpleCarbs) || 0,
      defaultUnit,
      pieceWeightG: defaultUnit === 'pieces' ? (parseFloat(pieceWeight) || undefined) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-black rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            {product ? 'Edit Product' : 'New Product'}
          </h3>
          <button type="button" onClick={onClose} className="text-emerald-400 hover:text-emerald-300 text-xl">&times;</button>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-emerald-200 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <p className="text-xs text-emerald-300 mb-2">Macros per 100g (or 100ml):</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">Calories (kcal)</label>
            <input type="number" value={kcal} onChange={e => setKcal(e.target.value)} min="0" step="any" required
              className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">Protein (g)</label>
            <input type="number" value={protein} onChange={e => setProtein(e.target.value)} min="0" step="any" required
              className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">Fat (g)</label>
            <input type="number" value={fat} onChange={e => setFat(e.target.value)} min="0" step="any" required
              className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">Carbs (g)</label>
            <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} min="0" step="any" required
              className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-emerald-300 mb-1">Simple Carbs (g)</label>
          <input type="number" value={simpleCarbs} onChange={e => setSimpleCarbs(e.target.value)} min="0" step="any"
            className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-emerald-200 mb-1">Default Unit</label>
          <div className="flex gap-2">
            {(['g', 'ml', 'pieces'] as const).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setDefaultUnit(u)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  defaultUnit === u ? 'bg-emerald-500 text-white' : 'bg-black text-emerald-300'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {defaultUnit === 'pieces' && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-emerald-300 mb-1">Weight per piece (g)</label>
            <input type="number" value={pieceWeight} onChange={e => setPieceWeight(e.target.value)} min="0" step="any"
              className="w-full border border-emerald-900/40 bg-black text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors mt-2"
        >
          {product ? 'Save Changes' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
