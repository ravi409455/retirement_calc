/**
 * Fund & Index Data Module
 * 
 * All fund data is loaded from /data/funds.json at startup.
 * To update funds, categories, presets, or tax rules:
 *   1. Edit data/funds.json
 *   2. Redeploy the app (docker-compose up --build -d)
 * 
 * The JSON file is the single source of truth for all financial data.
 */

let _data = null;

// ─── Exported data (populated after init) ─────────────────────────────────────

export let FUND_CATEGORIES = {};
export let FUNDS = [];
export let PRESET_PORTFOLIOS = [];
export let CRASH_EVENTS = [];
export let TAX_RULES = {};
export let DATA_META = {};

// ─── Init: fetch and parse the JSON ───────────────────────────────────────────

/**
 * Load fund data from /data/funds.json.
 * Must be called (and awaited) before any other module accesses FUNDS etc.
 */
export async function loadFundData() {
  if (_data) return _data;

  const resp = await fetch('data/funds.json');
  if (!resp.ok) throw new Error(`Failed to load fund data: ${resp.status}`);
  _data = await resp.json();

  // Map category keys to display labels
  FUND_CATEGORIES = {};
  for (const [key, label] of Object.entries(_data.categories)) {
    FUND_CATEGORIES[key] = label;
  }

  // Map funds, resolving category key → label
  FUNDS = _data.funds.map(f => ({
    ...f,
    category: _data.categories[f.category] || f.category,
  }));

  PRESET_PORTFOLIOS = _data.presetPortfolios || [];
  CRASH_EVENTS = _data.crashEvents || [];
  TAX_RULES = _data.taxRules || {};
  DATA_META = _data.meta || {};

  return _data;
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getFundById(id) {
  return FUNDS.find((fund) => fund.id === id) || null;
}

export function getFundsByCategory(category) {
  return FUNDS.filter((fund) => fund.category === category);
}
