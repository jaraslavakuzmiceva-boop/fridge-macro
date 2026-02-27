import { useState } from 'react';
import type { InventoryItem as InvItem, Product } from '../models/types';
import { ExpirationBadge } from './StatusBadge';
import { getExpirationStatus } from '../logic/expirationUtils';

interface Props {
  item: InvItem;
  product: Product | undefined;
  onEdit: (item: InvItem) => void;
  onRemove: (id: number) => void;
}

export function InventoryItemRow({ item, product, onEdit, onRemove }: Props) {
  const status = getExpirationStatus(item.expirationDate);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 bg-black rounded-lg border border-emerald-900/40 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {product?.name ?? 'Unknown'}
          </span>
          <ExpirationBadge status={status} />
        </div>
        <div className="text-sm text-emerald-400 mt-0.5">
          {item.quantity} {item.unit} &middot; {item.storageLocation}
        </div>
      </div>
      <div className="flex gap-1 ml-2 items-center">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400">Remove?</span>
            <button
              onClick={() => onRemove(item.id!)}
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-emerald-400 hover:text-emerald-200"
            >
              No
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Remove"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
