import type { ExpirationStatus, MealTier } from '../models/types';
import { getExpirationLabel, getExpirationColor } from '../logic/expirationUtils';

export function ExpirationBadge({ status }: { status: ExpirationStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getExpirationColor(status)}`}>
      {getExpirationLabel(status)}
    </span>
  );
}

export function TierBadge({ tier }: { tier: MealTier }) {
  const colors = {
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-400 text-gray-900',
    red: 'bg-red-500 text-white',
  };
  const labels = {
    green: 'Great fit',
    yellow: 'Okay fit',
    red: 'Poor fit',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[tier]}`}>
      {labels[tier]}
    </span>
  );
}
