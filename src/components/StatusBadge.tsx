import type { ExpirationStatus, MealTier } from '../models/types';
import { getExpirationLabel } from '../logic/expirationUtils';

function expirationStyle(status: ExpirationStatus): string {
  switch (status) {
    case 'expired':       return 'neon-red';
    case 'd0':            return 'neon-yellow';
    case 'expiring-soon': return 'neon-yellow';
    case 'ok':            return 'text-gray-600';
  }
}

export function ExpirationBadge({ status }: { status: ExpirationStatus }) {
  return (
    <span className={`px-label ${expirationStyle(status)}`}>
      [{getExpirationLabel(status)}]
    </span>
  );
}

export function TierBadge({ tier }: { tier: MealTier }) {
  const style = {
    green:  'neon-green',
    yellow: 'neon-yellow',
    red:    'neon-red',
  }[tier];
  const labels = {
    green: 'GREAT',
    yellow: 'OK',
    red:   'POOR',
  };
  return (
    <span className={`px-label ${style}`}>
      [{labels[tier]}]
    </span>
  );
}
