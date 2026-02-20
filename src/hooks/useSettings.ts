import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDefaultSettings } from '../db';
import type { Settings } from '../models/types';
import { useEffect } from 'react';

export function useSettings() {
  useEffect(() => {
    ensureDefaultSettings();
  }, []);

  const settings = useLiveQuery(() =>
    db.settings.toCollection().first()
  );

  async function updateSettings(updates: Partial<Settings>) {
    if (!settings?.id) return;
    await db.settings.update(settings.id, updates);
  }

  return { settings: settings ?? null, updateSettings };
}
