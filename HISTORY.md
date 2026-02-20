# FridgeMacro — Build History

## What is FridgeMacro?

A mobile-first PWA that manages nutrition through fridge inventory control rather than calorie tracking. Users track macros (kcal/protein/fat/carbs), and the app generates meal suggestions from what's available in the fridge, aligned with daily macro targets. All data is local (IndexedDB), all logic is deterministic.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite
- **Local DB**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS v4
- **PWA**: vite-plugin-pwa
- **Routing**: React Router v6
- **State**: Custom hooks with Dexie live queries (no Redux)

## What Was Done (Step by Step)

### Phase 1: Project Scaffolding
1. Created Vite + React + TypeScript project with `npm create vite@latest fridge-macro -- --template react-ts`
2. Installed dependencies:
   - `dexie` + `dexie-react-hooks` — local IndexedDB database
   - `react-router-dom` — client-side routing
   - `tailwindcss` + `@tailwindcss/vite` — Tailwind CSS v4
   - `vite-plugin-pwa` — PWA service worker & manifest
3. Configured `vite.config.ts` with React, Tailwind, and PWA plugins
4. Configured PWA manifest (name: FridgeMacro, theme: emerald green)
5. Updated `index.html` with mobile viewport meta, theme-color, apple-mobile-web-app-capable
6. Replaced default CSS with Tailwind v4 import in `src/index.css`
7. Created directory structure: `src/{db,models,context,hooks,logic,components,screens}`, `public/icons`

### Phase 2: Data Layer
8. Defined TypeScript interfaces in `src/models/types.ts`:
   - `Product` — product templates with macros per 100g
   - `InventoryItem` — fridge items with quantity, location, expiration
   - `Meal` / `MealItem` — logged meals with macro totals
   - `Settings` — daily macro targets & preferences
   - `MealCandidate`, `ForecastStatus`, `ShoppingSuggestion` — algorithm types
9. Set up Dexie database in `src/db/index.ts`:
   - 4 tables: products, inventory, meals, settings
   - `ensureDefaultSettings()` — creates default macro targets (2000 kcal, 150g P, 70g F, 200g C)
   - `seedProducts()` — seeds 20 common products (chicken, rice, eggs, broccoli, salmon, etc.)
10. Built custom hooks:
    - `useSettings.ts` — read/update settings with live query
    - `useInventory.ts` — CRUD for inventory items + deduction logic (FIFO by expiration)
    - `useMeals.ts` — log/delete meals for today with live query

### Phase 3: Logic Utilities
11. Built `src/logic/expirationUtils.ts`:
    - `getExpirationStatus()` — returns ok / expiring-soon / d0 / expired
    - Helper functions for labels, colors, and status checks
12. Built `src/logic/macroCalculator.ts`:
    - `getWeightInGrams()` — handles g/ml/pieces unit conversion
    - `calcItemMacros()` / `calcMealMacros()` — macro math
    - `getRemainingMacros()` / `getIdealMealMacros()` — target calculations
13. Built `src/logic/mealGenerator.ts`:
    - Deterministic combinatorial meal generation algorithm
    - Generates 2-item and 3-item combos from available inventory
    - Scores by deviation from ideal macros (green ≤10%, yellow ≤20%, red >20%)
    - Penalizes simple carbs
    - `generateForecast()` — simulates tomorrow (excludes D0/expired), generates 3 meals, produces shopping suggestions

### Phase 4: UI Components
14. Built reusable components:
    - `MacroBar.tsx` — progress bar showing current/target with color coding
    - `StatusBadge.tsx` — expiration badges (color-coded) and meal tier badges
    - `InventoryItem.tsx` — inventory row with edit/remove buttons
    - `MealCard.tsx` — displays logged meal with items and macro summary
    - `MealSuggestionModal.tsx` — modal showing 3 meal options with accept/cancel

### Phase 5: Screens
15. Built 5 screens:
    - **TodayScreen** (`/`) — daily macro bars, "Generate Next Meal" button, today's meal list, simple carb indicator
    - **InventoryScreen** (`/inventory`) — grouped by storage location (fridge/freezer/pantry), add/edit/remove items, expiration badges
    - **ProductsScreen** (`/products`) — CRUD for product templates, search filter
    - **ForecastScreen** (`/forecast`) — tomorrow simulation, 3-meal preview, shopping suggestions with reason codes
    - **SettingsScreen** (`/settings`) — edit daily macro goals (kcal, protein, fat, carbs), simple carb limit, meals per day

### Phase 6: App Shell & Navigation
16. Built `App.tsx` with:
    - React Router routes for all 5 screens
    - Fixed bottom tab navigation (Today, Fridge, Forecast, Profile)
    - Products screen accessible via "Manage Products" link from Inventory
17. Updated `main.tsx`:
    - Wraps app in BrowserRouter
    - Calls `seedProducts()` and `ensureDefaultSettings()` on startup

### Not Yet Completed
- PWA placeholder icons in `public/icons/` (icon-192.png, icon-512.png)
- Build verification (`npm run build`)
- Removal of unused files (`src/assets/react.svg`)

## Data Model

### products
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| name | string | Product name |
| kcalPer100 | number | Calories per 100g |
| proteinPer100 | number | Protein per 100g |
| fatPer100 | number | Fat per 100g |
| carbsPer100 | number | Carbs per 100g |
| simpleCarbsPer100 | number | Simple carbs per 100g |
| defaultUnit | g/ml/pieces | Default measurement unit |
| pieceWeightG | number? | Weight of one piece in grams |

### inventory
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| productId | number | FK to products |
| quantity | number | Amount in given unit |
| unit | g/ml/pieces | Measurement unit |
| storageLocation | fridge/freezer/pantry | Where it's stored |
| expirationDate | string (YYYY-MM-DD) | Expiration date |
| addedAt | string (ISO) | When added |

### meals
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| date | string (YYYY-MM-DD) | Meal date |
| items | MealItem[] | Array of product+quantity |
| totalKcal/Protein/Fat/Carbs/SimpleCarbs | number | Computed totals |
| createdAt | string (ISO) | When logged |

### settings
| Field | Type | Default |
|-------|------|---------|
| dailyKcal | number | 2000 |
| dailyProtein | number | 150 |
| dailyFat | number | 70 |
| dailyCarbs | number | 200 |
| simpleCarbLimitPercent | number | 5 |
| mealsPerDay | number | 4 |

## Seeded Products (20)
Chicken Breast, Rice (white), Eggs, Broccoli, Salmon, Greek Yogurt, Oats, Banana, Olive Oil, Sweet Potato, Cottage Cheese, Almonds, Ground Beef (lean), Pasta, Tomatoes, Avocado, Milk (2%), Bread (whole wheat), Turkey Breast, Spinach

## How to Run
```bash
cd fridge-macro
npm install
npm run dev
```
Then open http://localhost:5173 in your browser.
