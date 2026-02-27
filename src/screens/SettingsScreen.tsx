import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return <div className="p-4 tx-secondary">Loading...</div>;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <h1 className="mb-4">Settings</h1>
      <SettingsForm key={settings.id ?? 'settings'} settings={settings} onSave={updateSettings} />
    </div>
  );
}

function SettingsForm({
  settings,
  onSave,
}: {
  settings: {
    dailyKcal: number;
    dailyProtein: number;
    dailyFat: number;
    dailyCarbs: number;
    simpleCarbLimitPercent: number;
    mealsPerDay: number;
  };
  onSave: (updates: Partial<typeof settings>) => Promise<void>;
}) {
  const [kcal, setKcal] = useState(settings.dailyKcal.toString());
  const [protein, setProtein] = useState(settings.dailyProtein.toString());
  const [fat, setFat] = useState(settings.dailyFat.toString());
  const [carbs, setCarbs] = useState(settings.dailyCarbs.toString());
  const [simpleCarbLimit, setSimpleCarbLimit] = useState(settings.simpleCarbLimitPercent.toString());
  const [mealsPerDay, setMealsPerDay] = useState(settings.mealsPerDay.toString());
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await onSave({
      dailyKcal: parseFloat(kcal) || 0,
      dailyProtein: parseFloat(protein) || 0,
      dailyFat: parseFloat(fat) || 0,
      dailyCarbs: parseFloat(carbs) || 0,
      simpleCarbLimitPercent: parseFloat(simpleCarbLimit) || 5,
      mealsPerDay: parseInt(mealsPerDay) || 4,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave}>
      <div className="px-card p-4 mb-4">
        <h2 className="px-label mb-3">Daily Macro Goals</h2>

        <div className="space-y-3">
          {[
            { label: 'Calories (kcal)', value: kcal, setter: setKcal },
            { label: 'Protein (g)',     value: protein, setter: setProtein },
            { label: 'Fat (g)',         value: fat, setter: setFat },
            { label: 'Carbs (g)',       value: carbs, setter: setCarbs },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="px-label block mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={e => setter(e.target.value)}
                min="0"
                step="any"
                className="px-input"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-card p-4 mb-4">
        <h2 className="px-label mb-3">Preferences</h2>

        <div className="space-y-3">
          <div>
            <label className="px-label block mb-1">Simple Carb Limit (% of daily kcal)</label>
            <input
              type="number"
              value={simpleCarbLimit}
              onChange={e => setSimpleCarbLimit(e.target.value)}
              min="0"
              max="100"
              step="1"
              className="px-input"
            />
          </div>

          <div>
            <label className="px-label block mb-1">Meals per Day</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMealsPerDay(n.toString())}
                  className={`px-tab${parseInt(mealsPerDay) === n ? ' active' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="px-btn">
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </form>
  );
}
