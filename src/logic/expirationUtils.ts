import type { ExpirationStatus } from '../models/types';

export function getExpirationStatus(expirationDate: string): ExpirationStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate + 'T00:00:00');

  const diffMs = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays === 0) return 'd0';
  if (diffDays <= 2) return 'expiring-soon';
  return 'ok';
}

export function getExpirationLabel(status: ExpirationStatus): string {
  switch (status) {
    case 'expired': return 'Expired';
    case 'd0': return 'Use today';
    case 'expiring-soon': return 'Expiring soon';
    case 'ok': return 'OK';
  }
}

export function getExpirationColor(status: ExpirationStatus): string {
  switch (status) {
    case 'expired': return 'bg-emerald-900 text-white';
    case 'd0': return 'bg-emerald-700 text-white';
    case 'expiring-soon': return 'bg-emerald-500 text-black';
    case 'ok': return 'bg-emerald-300 text-black';
  }
}

export function isExpired(expirationDate: string): boolean {
  return getExpirationStatus(expirationDate) === 'expired';
}

export function isD0OrExpired(expirationDate: string): boolean {
  const status = getExpirationStatus(expirationDate);
  return status === 'expired' || status === 'd0';
}
