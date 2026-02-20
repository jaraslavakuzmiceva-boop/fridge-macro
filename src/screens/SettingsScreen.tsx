import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();

  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [simpleCarbLimit, setSimpleCarbLimit] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setKcal(settings.dailyKcal.toString());
      setProtein(settings.dailyProtein.toString());
      setFat(settings.dailyFat.toString());
      setCarbs(settings.dailyCarbs.toString());
      setSimpleCarbLimit(settings.simpleCarbLimitPercent.toString());
      setMealsPerDay(settings.mealsPerDay.toString());
    }
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings({
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

  if (!settings) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Settings</h1>

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Daily Macro Goals</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calories (kcal)</label>
              <input
                type="number"
                value={kcal}
                onChange={e => setKcal(e.target.value)}
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={e => setFat(e.target.value)}
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={e => setCarbs(e.target.value)}
                min="0"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preferences</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Simple Carb Limit (% of daily kcal)
              </label>
              <input
                type="number"
                value={simpleCarbLimit}
                onChange={e => setSimpleCarbLimit(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meals per Day</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMealsPerDay(n.toString())}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      parseInt(mealsPerDay) === n
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-base hover:bg-emerald-600 transition-colors shadow-sm"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
