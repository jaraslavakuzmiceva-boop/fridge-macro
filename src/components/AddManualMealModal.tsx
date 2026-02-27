import { useState, useMemo, useRef } from 'react';
import { calcItemMacros } from '../logic/macroCalculator';
import type { Product, MealItem } from '../models/types';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
  length: number;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

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
  const [speechLang, setSpeechLang] = useState<'en-US' | 'ru-RU'>('ru-RU');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const gotResultRef = useRef(false);

  const filteredProducts = useMemo(() => {
    const q = search.trim();
    if (!q) return productList;
    const scored = productList
      .map(p => ({ p, score: fuzzyScore(p.name, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
    return scored.map(x => x.p);
  }, [productList, search]);

  function getBestProductMatch(query: string): Product | null {
    const q = query.trim();
    if (!q) return null;
    let best: { p: Product; score: number } | null = null;
    for (const p of productList) {
      const score = fuzzyScore(p.name, q);
      if (score <= 0) continue;
      if (!best || score > best.score) best = { p, score };
    }
    return best?.p ?? null;
  }

  function applyRussianAliases(input: string): string {
    const aliases: Array<[RegExp, string]> = [
      [/\bкурин(ая|ые)?\s+грудк(а|и)?\b/g, 'chicken breast'],
      [/\bрис\b|\bрис\s*бел(ый|ого|ый)\b/g, 'rice (white)'],
      [/\bяйц(о|а|ы)?\b/g, 'eggs'],
      [/\bброкколи\b/g, 'broccoli'],
      [/\bлосос(ь|я)\b|\bсемг(а|и)?\b/g, 'salmon'],
      [/\bгреческ(ий|ого|ая)?\s+йогурт\b|\bйогурт\s+греческ(ий|ого|ая)?\b/g, 'greek yogurt'],
      [/\bовсян(ка|ые хлопья)?\b/g, 'oats'],
      [/\bбанан(ы|а)?\b/g, 'banana'],
      [/\bоливков(ое|ого)?\s+масл(о|а)?\b|\bмасл(о|а)?\s+оливков(ое|ого)?\b/g, 'olive oil'],
      [/\bбатат\b|\bсладк(ий|ого)?\s+картофел(ь|я)\b/g, 'sweet potato'],
      [/\bтворог\b|\bтворожн(ый|ого)?\s+сыр\b/g, 'cottage cheese'],
      [/\bминдал(ь|я)?\b/g, 'almonds'],
      [/\bговяж(ий|его)?\s+фарш\b|\bфарш\s+говяж(ий|его)?\b/g, 'ground beef (lean)'],
      [/\bмакарон(ы|ов|а)?\b|\bпаста\b/g, 'pasta'],
      [/\bпомидор(ы|а)?\b|\bтомат(ы|а)?\b/g, 'tomatoes'],
      [/\bавокадо\b/g, 'avocado'],
      [/\bмолок(о|а)\b/g, 'milk (2%)'],
      [/\bхлеб\b|\bцельнозернов(ой|ого)?\s+хлеб\b/g, 'bread (whole wheat)'],
      [/\bиндейк(а|и)?\b|\bгрудк(а|и)?\s+индейк(и|а)?\b/g, 'turkey breast'],
      [/\bшпинат\b/g, 'spinach'],
      [/\bкуриц(а|ы)?\b|\bкурин(ая|ые)?\b/g, 'chicken breast'],
    ];
    let out = input;
    for (const [re, rep] of aliases) out = out.replace(re, rep);
    return out;
  }

  function parseSpeechToEntries(text: string, lang: 'en-US' | 'ru-RU'): ManualEntry[] {
    let normalized = text
      .toLowerCase()
      .replace(/([,;])/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return [];

    if (lang === 'ru-RU') {
      normalized = normalized.replace(/\b(я|съел(а)?|поел(а)?|ел(а)?|ем|кушал(а)?|сегодня|вчера|на|завтрак|обед|ужин)\b/g, '').trim();
    } else {
      normalized = normalized.replace(/\b(i|ate|had|for|breakfast|lunch|dinner|today|yesterday)\b/g, '').trim();
    }

    const numberWords: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      half: 0.5,
      один: 1, одна: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5,
      шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
      пол: 0.5,
    };

    let segments = normalized
      .split(/\s+(and|,|и|then|plus)\s+/)
      .filter(s => !['and', ',', 'и', 'then', 'plus'].includes(s));

    if (segments.length <= 1) {
      const unitPattern = '(?:kg|kilogram(?:s)?|кг|килограмм(?:а|ов)?|l|liter(?:s)?|л|литр(?:а|ов)?|g|gram(?:s)?|г|гр|грамм(?:а|ов)?|ml|milliliter(?:s)?|мл|миллилитр(?:а|ов)?|pcs?|pieces?|шт|штук(?:а|и)?|штуки|egg(?:s)?|яйц(?:о|а|ы)?)';
      const re = new RegExp(`(\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|half|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|пол)\\s*${unitPattern}\\s+([^\\d]+?)(?=(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|half|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|пол)\\s*${unitPattern}|$)`, 'g');
      const extracted: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = re.exec(normalized)) !== null) {
        extracted.push(`${match[1]} ${match[2]}`.trim());
      }
      if (extracted.length > 0) segments = extracted;
    }
    const results: ManualEntry[] = [];

    for (const seg of segments) {
      let s = seg.trim();
      if (!s) continue;

      let qty: number | null = null;
      let unit: 'g' | 'ml' | 'pieces' | null = null;

      const wordMatch = s.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|half|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|пол)\b/);
      if (wordMatch) {
        qty = numberWords[wordMatch[1]];
        s = s.slice(wordMatch[0].length).trim();
      }

      const numMatch = s.match(/(\d+(?:\.\d+)?)/);
      if (numMatch) {
        qty = parseFloat(numMatch[1]);
        s = s.replace(numMatch[0], '').trim();
      }

      if (s.match(/\bkg\b|\bkilogram(s)?\b|\bкг\b|\bкилограмм(а|ов)?\b/)) {
        unit = 'g';
        if (qty !== null) qty = qty * 1000;
        s = s.replace(/\bkg\b|\bkilogram(s)?\b|\bкг\b|\bкилограмм(а|ов)?\b/g, '').trim();
      } else if (s.match(/\bl\b|\bliter(s)?\b|\bл\b|\bлитр(а|ов)?\b/)) {
        unit = 'ml';
        if (qty !== null) qty = qty * 1000;
        s = s.replace(/\bl\b|\bliter(s)?\b|\bл\b|\bлитр(а|ов)?\b/g, '').trim();
      } else if (s.match(/\bg\b|\bgram(s)?\b|\bг\b|\bгр\b|\bграмм(а|ов)?\b/)) {
        unit = 'g';
        s = s.replace(/\bg\b|\bgram(s)?\b|\bг\b|\bгр\b|\bграмм(а|ов)?\b/g, '').trim();
      } else if (s.match(/\bml\b|\bmilliliter(s)?\b|\bмл\b|\bмиллилитр(а|ов)?\b/)) {
        unit = 'ml';
        s = s.replace(/\bml\b|\bmilliliter(s)?\b|\bмл\b|\bмиллилитр(а|ов)?\b/g, '').trim();
      } else if (s.match(/\bpcs?\b|\bpieces?\b|\bшт\b|\bштук(а|и)?\b|\bштуки\b/)) {
        unit = 'pieces';
        s = s.replace(/\bpcs?\b|\bpieces?\b|\bшт\b|\bштук(а|и)?\b|\bштуки\b/g, '').trim();
      } else if (s.match(/\begg(s)?\b|\bяйц(о|а|ы)?\b/)) {
        unit = 'pieces';
      }

      const productQuery = lang === 'ru-RU' ? applyRussianAliases(s) : s;
      const product = getBestProductMatch(productQuery);
      if (!product) continue;

      if (unit === null) unit = product.defaultUnit;
      if (qty === null || isNaN(qty) || qty <= 0) continue;

      results.push({
        productId: product.id!,
        quantity: String(qty),
        unit,
      });
    }

    return results;
  }

  function startSpeech() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechError('Speech recognition not supported in this browser.');
      return;
    }
    setSpeechError(null);
    gotResultRef.current = false;
    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.lang = speechLang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = event => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + ' ';
        else interimText += result[0].transcript + ' ';
      }
      if ((finalText + interimText).trim()) gotResultRef.current = true;
      setTranscript((finalText + interimText).trim());
    };
    recognition.onerror = () => {
      setSpeechError('Could not capture speech. Please try again.');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (!gotResultRef.current && !transcript.trim()) {
        setSpeechError('No speech detected. Try again or check mic access.');
      }
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  function stopSpeech() {
    recognitionRef.current?.stop();
  }

  function handleSpeechAdd() {
    const parsed = parseSpeechToEntries(transcript, speechLang);
    if (parsed.length === 0) return;
    setEntries(prev => [...prev, ...parsed]);
    setTranscript('');
  }

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

            {/* Speech to text */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSpeechLang('ru-RU')}
                    className={`px-2 py-2 text-xs font-semibold ${
                      speechLang === 'ru-RU' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'
                    }`}
                  >
                    RU
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeechLang('en-US')}
                    className={`px-2 py-2 text-xs font-semibold ${
                      speechLang === 'en-US' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500'
                    }`}
                  >
                    EN
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startSpeech}
                    disabled={isListening}
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeech}
                    disabled={!isListening}
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    Stop
                  </button>
                </div>
                <span className="text-xs text-gray-400">Choose language</span>
              </div>
              {speechError && (
                <p className="text-xs text-red-500">{speechError}</p>
              )}
              <textarea
                placeholder="Speech transcript will appear here. You can edit before adding."
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                rows={2}
              />
              <button
                type="button"
                onClick={handleSpeechAdd}
                disabled={!transcript.trim()}
                className="w-full py-2 bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                Add Items From Speech
              </button>
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
