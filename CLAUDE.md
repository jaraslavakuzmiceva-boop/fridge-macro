# FridgeMacro — Claude Code Instructions

## Project Overview
Mobile-first PWA for nutrition management through fridge inventory control. Users track macros (kcal/protein/fat/carbs) and the app generates meal suggestions from available inventory. All data is local (IndexedDB via Dexie.js), no backend.

## Tech Stack
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS v4 (imported via `@import "tailwindcss"` in index.css, configured via `@tailwindcss/vite` plugin)
- Dexie.js + dexie-react-hooks (IndexedDB)
- React Router v6
- vite-plugin-pwa

## Commands
- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Architecture

### Directory Layout
```
src/
  db/index.ts          — Dexie database schema, seed data, default settings
  models/types.ts      — All TypeScript interfaces (Product, InventoryItem, Meal, Settings, etc.)
  hooks/               — Custom React hooks wrapping Dexie live queries
  logic/               — Pure functions: macro math, expiration logic, meal generation algorithm
  components/          — Reusable UI components (MacroBar, StatusBadge, MealCard, etc.)
  screens/             — Page-level components (TodayScreen, InventoryScreen, etc.)
  App.tsx              — Router + bottom tab navigation
  main.tsx             — Entry point, seeds DB on startup
```

### Key Patterns
- **No global state management** — each screen uses hooks (`useSettings`, `useInventory`, `useMeals`) that return live-updating data from Dexie
- **Live queries** — `useLiveQuery` from dexie-react-hooks auto-rerenders when IndexedDB changes
- **Logic is pure** — `src/logic/` files are pure functions with no side effects, easy to test
- **Units** — products can be measured in g, ml, or pieces. `pieceWeightG` converts pieces to grams for macro calculation

### Screens (5 total)
| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | TodayScreen | Daily macro progress, meal generation, logged meals |
| `/inventory` | InventoryScreen | Manage fridge items grouped by location |
| `/products` | ProductsScreen | CRUD for product templates (accessible from Inventory) |
| `/forecast` | ForecastScreen | Tomorrow's meal simulation + shopping suggestions |
| `/settings` | SettingsScreen | Edit daily macro goals and preferences |

### Meal Generation Algorithm
Located in `src/logic/mealGenerator.ts`. Deterministic combinatorial approach:
1. Get available inventory (exclude expired)
2. Generate 2-item and 3-item combinations with various portion sizes
3. Score each by deviation from ideal macros (remaining / meals left)
4. Tier: green (≤10% deviation), yellow (≤20%), red (>20%)
5. Penalize simple carbs
6. Return top 3 candidates sorted by score

### Database (Dexie/IndexedDB)
4 tables: `products`, `inventory`, `meals`, `settings`. Schema defined in `src/db/index.ts`. On first load, seeds 20 common products and default settings.

## Coding Conventions
- Named exports (not default exports)
- Tailwind utility classes for all styling, no CSS modules
- Emerald green (`emerald-500`, `emerald-600`) as primary brand color
- Mobile-first design — `max-w-lg mx-auto` container, bottom nav with `pb-24` content padding
- Modals use fixed overlay with `items-end sm:items-center` for mobile bottom-sheet feel
- Forms use controlled components with `useState`

## Known Incomplete Items
- PWA icons (`public/icons/icon-192.png`, `icon-512.png`) not yet created
- Build has not been verified yet
- `src/context/` directory exists but is empty (hooks used directly instead)
- `src/assets/react.svg` is leftover from Vite scaffold, unused
