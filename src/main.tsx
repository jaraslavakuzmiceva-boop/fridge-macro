import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { ensureDefaultSettings, purgeMealsNotOnDate, seedProducts } from './db'
import { getLocalISODate, msUntilNextLocalMidnight } from './logic/dateUtils'

ensureDefaultSettings();
seedProducts();

async function runDailyCleanup() {
  try {
    await purgeMealsNotOnDate(getLocalISODate());
  } catch {
    // Avoid blocking app start if cleanup fails.
  }
}

function scheduleDailyCleanup() {
  const schedule = async () => {
    await runDailyCleanup();
    window.setTimeout(schedule, msUntilNextLocalMidnight());
  };
  window.setTimeout(schedule, msUntilNextLocalMidnight());
  runDailyCleanup();
}

scheduleDailyCleanup();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
