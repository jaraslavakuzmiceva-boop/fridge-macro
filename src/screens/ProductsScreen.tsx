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
      <h1 className="mb-4">Product Templates</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="px-input flex-1"
          style={{ width: 'auto' }}
        />
        <button
          onClick={() => { setEditProduct(null); setShowForm(true); }}
          className="px-btn"
          style={{ width: 'auto', padding: '11px 18px' }}
        >
          + New
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(product => (
          <div key={product.id} className="px-card p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="tx-body font-medium">{product.name}</div>
                <div className="px-label mt-0.5">
                  {product.kcalPer100} kcal · P:{product.proteinPer100}g · F:{product.fatPer100}g · C:{product.carbsPer100}g /100{product.defaultUnit === 'ml' ? 'ml' : 'g'}
                </div>
                {product.defaultUnit === 'pieces' && product.pieceWeightG && (
                  <div className="px-label mt-0.5">1 piece = {product.pieceWeightG}g</div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditProduct(product); setShowForm(true); }}
                  className="px-btn-text"
                  aria-label="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(product.id!)}
                  className="px-btn-text danger"
                  aria-label="Delete"
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
        <p className="tx-secondary text-center py-8">
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
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="px-card w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3>{product ? 'Edit Product' : 'New Product'}</h3>
          <button type="button" onClick={onClose} className="px-btn-text text-xl leading-none">&times;</button>
        </div>

        <div className="mb-3">
          <label className="px-label block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="px-input"
          />
        </div>

        <p className="px-label mb-2">Macros per 100g (or 100ml):</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: 'Calories (kcal)', value: kcal, setter: setKcal },
            { label: 'Protein (g)',     value: protein, setter: setProtein },
            { label: 'Fat (g)',         value: fat, setter: setFat },
            { label: 'Carbs (g)',       value: carbs, setter: setCarbs },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="px-label block mb-1">{label}</label>
              <input type="number" value={value} onChange={e => setter(e.target.value)} min="0" step="any" required className="px-input" />
            </div>
          ))}
        </div>

        <div className="mb-3">
          <label className="px-label block mb-1">Simple Carbs (g)</label>
          <input type="number" value={simpleCarbs} onChange={e => setSimpleCarbs(e.target.value)} min="0" step="any" className="px-input" />
        </div>

        <div className="mb-3">
          <label className="px-label block mb-1">Default Unit</label>
          <div className="flex gap-2">
            {(['g', 'ml', 'pieces'] as const).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setDefaultUnit(u)}
                className={`px-tab${defaultUnit === u ? ' active' : ''}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {defaultUnit === 'pieces' && (
          <div className="mb-3">
            <label className="px-label block mb-1">Weight per piece (g)</label>
            <input type="number" value={pieceWeight} onChange={e => setPieceWeight(e.target.value)} min="0" step="any" className="px-input" />
          </div>
        )}

        <button type="submit" className="px-btn mt-2">
          {product ? 'Save Changes' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
