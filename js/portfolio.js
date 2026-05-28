/**
 * Portfolio Builder UI Module
 * Manages fund selection, weight inputs, preset loading, and weight validation.
 * Fund picker is collapsed by default — only preset pills + weight bar visible.
 */

import { FUNDS, FUND_CATEGORIES, PRESET_PORTFOLIOS, getFundById } from './data.js?v=3.5';
import { calcEquityDebtSplit } from './calculator.js?v=3.5';

// ─── Module State ─────────────────────────────────────────────────────────────

/** @type {Object.<string, number>} Maps fundId → weight percentage */
let selectedFunds = {};

/** @type {Function|null} Callback invoked whenever allocations change */
let onChangeCallback = null;

/** @type {HTMLElement|null} The portfolio container element */
let portfolioContainer = null;

/** @type {boolean} Whether the advanced fund picker is expanded */
let isExpanded = false;

// ─── Category display order (computed lazily after data loads) ────────────────

function getCategoryOrder() {
  return [
    FUND_CATEGORIES.EQUITY_INDEX,
    FUND_CATEGORIES.EQUITY_ACTIVE,
    FUND_CATEGORIES.HYBRID,
    FUND_CATEGORIES.DEBT,
  ].filter(Boolean);
}

// ─── 1. Init ──────────────────────────────────────────────────────────────────

/**
 * Initialise the portfolio builder inside a given container element.
 *
 * @param {string}   containerId  ID of the DOM element to render into
 * @param {Function} onChange     Called with current allocations whenever they change
 */
export function initPortfolio(containerId, onChange) {
  onChangeCallback = onChange;
  portfolioContainer = document.getElementById(containerId);

  if (!portfolioContainer) {
    console.error(`[portfolio] Container #${containerId} not found.`);
    return;
  }

  portfolioContainer.innerHTML = buildPortfolioHTML();
  attachPortfolioEvents(portfolioContainer);

  // Apply the balanced preset by default
  applyPreset('balanced');
}

// ─── 2. Build HTML ────────────────────────────────────────────────────────────

/**
 * Returns the full portfolio builder HTML string.
 * @returns {string}
 */
function buildPortfolioHTML() {
  // ── Preset buttons ──
  const presetButtonsHTML = PRESET_PORTFOLIOS.map(
    (preset) => `
    <button
      class="btn btn--outline btn--sm preset-btn"
      data-preset-id="${preset.id}"
      title="${preset.description}"
    >${preset.name}</button>`
  ).join('');

  // ── Fund list grouped by category ──
  const categoryOrder = getCategoryOrder();
  const fundListHTML = categoryOrder.map((category) => {
    const fundsInCategory = FUNDS.filter((f) => f.category === category);
    if (fundsInCategory.length === 0) return '';

    const categoryLabel = `
    <div class="fund-picker__category-label">
      ${category}
    </div>`;

    const fundItemsHTML = fundsInCategory.map(
      (fund) => {
        const dataYears = fund.dataYears || '—';
        const inception = fund.inceptionYear || '—';
        return `
    <div class="fund-item" data-fund-id="${fund.id}">
      <input
        class="fund-item__checkbox"
        type="checkbox"
        id="fund-chk-${fund.id}"
        data-fund-id="${fund.id}"
        aria-label="Select ${fund.name}"
      />
      <div class="fund-item__info">
        <div class="fund-item__name" title="${fund.description}">${fund.name}</div>
        <div class="fund-item__meta">
          <span class="fund-item__category">${fund.category}</span>
          <span class="fund-item__data-years" title="Based on ${dataYears} years of historical data since ${inception}">📊 ${dataYears}Y data</span>
        </div>
      </div>
      <input
        class="fund-item__weight"
        type="number"
        id="fund-weight-${fund.id}"
        data-fund-id="${fund.id}"
        min="0"
        max="100"
        value="0"
        disabled
        aria-label="${fund.name} weight percentage"
        placeholder="0"
      />
    </div>`;
      }
    ).join('');

    return categoryLabel + fundItemsHTML;
  }).join('');

  // ── Weight bar ──
  const weightBarHTML = `
    <div class="weight-bar">
      <div class="weight-bar__track">
        <div class="weight-bar__fill weight-bar__fill--equity" id="equity-fill" style="width: 0%"></div>
        <div class="weight-bar__fill weight-bar__fill--debt" id="debt-fill" style="width: 0%"></div>
      </div>
      <div class="weight-bar__labels">
        <span class="weight-bar__label weight-bar__label--equity" id="equity-label">Equity: 0%</span>
        <span class="weight-bar__label weight-bar__label--debt" id="debt-label">Debt: 0%</span>
      </div>
      <div class="weight-bar__total">
        Total: <span id="weight-total" class="weight-total">0%</span>
      </div>
    </div>`;

  return `
    <div class="preset-bar">
      ${presetButtonsHTML}
    </div>
    ${weightBarHTML}
    <button class="expand-toggle" id="expand-toggle">
      <span class="expand-toggle__icon">▶</span> Advanced Fund Selection
    </button>
    <div class="fund-picker-wrapper fund-picker-wrapper--collapsed" id="fund-picker-wrapper">
      <div class="fund-picker">
        ${fundListHTML}
      </div>
    </div>
  `;
}

// ─── 3. Attach Events ─────────────────────────────────────────────────────────

/**
 * Wires up all interactive events inside the portfolio container.
 * @param {HTMLElement} container
 */
function attachPortfolioEvents(container) {
  // ── Expand/Collapse toggle ──
  // Always starts collapsed (isExpanded = false)
  const expandBtn = container.querySelector('#expand-toggle');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      const wrapper = container.querySelector('#fund-picker-wrapper');
      const icon = expandBtn.querySelector('.expand-toggle__icon');
      if (wrapper) {
        wrapper.classList.toggle('fund-picker-wrapper--collapsed', !isExpanded);
        wrapper.classList.toggle('fund-picker-wrapper--expanded', isExpanded);
      }
      if (icon) icon.textContent = isExpanded ? '▼' : '▶';
    });
  }

  // ── Preset buttons ──
  container.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetId = btn.dataset.presetId;
      applyPreset(presetId);
      // Toggle active class
      container.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Checkboxes: add/remove from selectedFunds ──
  container.querySelectorAll('.fund-item__checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const fundId = checkbox.dataset.fundId;
      const weightInput = container.querySelector(`#fund-weight-${fundId}`);

      if (checkbox.checked) {
        selectedFunds[fundId] = 10;
        weightInput.disabled = false;
        weightInput.value = 10;
      } else {
        delete selectedFunds[fundId];
        weightInput.disabled = true;
        weightInput.value = 0;
      }

      updateWeightDisplay();
      notifyChange();
    });
  });

  // ── Fund item click: toggle checkbox (unless clicked on input or checkbox itself) ──
  container.querySelectorAll('.fund-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const fundId = item.dataset.fundId;
      const checkbox = container.querySelector(`#fund-chk-${fundId}`);
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });
  });

  // ── Weight inputs: update selectedFunds, clamp 0-100 ──
  container.querySelectorAll('.fund-item__weight').forEach((input) => {
    input.addEventListener('input', () => {
      const fundId = input.dataset.fundId;
      let val = parseFloat(input.value);

      // Clamp to 0-100
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > 100) val = 100;

      input.value = val;

      if (selectedFunds.hasOwnProperty(fundId)) {
        selectedFunds[fundId] = val;
      }

      updateWeightDisplay();
      notifyChange();
    });
  });
}

// ─── 4. Apply Preset ──────────────────────────────────────────────────────────

/**
 * Applies a preset portfolio by ID, updating all UI state and selections.
 * @param {string} presetId
 */
export function applyPreset(presetId) {
  const preset = PRESET_PORTFOLIOS.find((p) => p.id === presetId);
  if (!preset) {
    console.warn(`[portfolio] Preset "${presetId}" not found.`);
    return;
  }

  // Copy allocations to module state (shallow copy)
  selectedFunds = { ...preset.allocations };

  // Update DOM if container is available
  if (portfolioContainer) {
    // Uncheck all checkboxes and disable/reset all weight inputs first
    portfolioContainer.querySelectorAll('.fund-item__checkbox').forEach((checkbox) => {
      const fundId = checkbox.dataset.fundId;
      const weightInput = portfolioContainer.querySelector(`#fund-weight-${fundId}`);

      if (selectedFunds.hasOwnProperty(fundId)) {
        checkbox.checked = true;
        if (weightInput) {
          weightInput.disabled = false;
          weightInput.value = selectedFunds[fundId];
        }
      } else {
        checkbox.checked = false;
        if (weightInput) {
          weightInput.disabled = true;
          weightInput.value = 0;
        }
      }
    });

    // Highlight the active preset button
    portfolioContainer.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.presetId === presetId);
    });

    updateWeightDisplay();
    notifyChange();
  }
}

// ─── 5. Update Weight Display ─────────────────────────────────────────────────

/**
 * Recalculates and renders the equity/debt weight bar and total.
 */
function updateWeightDisplay() {
  if (!portfolioContainer) return;

  const total = getTotalWeight();

  // Calculate equity/debt split directly using assetType
  let equityWeight = 0;
  let totalAllocated = 0;

  for (const [fundId, weightPct] of Object.entries(selectedFunds)) {
    const fund = getFundById(fundId);
    if (!fund) continue;
    totalAllocated += weightPct;
    if (fund.assetType === 'equity') equityWeight += weightPct;
  }

  // Also invoke calcEquityDebtSplit as required by the spec (uses FUNDS array)
  const split = calcEquityDebtSplit(selectedFunds, FUNDS);

  // Derive display percentages from our direct calculation (more accurate)
  let equityDisplayPct = 0;
  let debtDisplayPct = 0;

  if (totalAllocated > 0) {
    equityDisplayPct = Math.round((equityWeight / totalAllocated) * 100);
    debtDisplayPct = 100 - equityDisplayPct;
  }

  const equityFill = portfolioContainer.querySelector('#equity-fill');
  const debtFill = portfolioContainer.querySelector('#debt-fill');
  const equityLabel = portfolioContainer.querySelector('#equity-label');
  const debtLabel = portfolioContainer.querySelector('#debt-label');
  const weightTotal = portfolioContainer.querySelector('#weight-total');

  if (equityFill) equityFill.style.width = `${equityDisplayPct}%`;
  if (debtFill) debtFill.style.width = `${debtDisplayPct}%`;
  if (equityLabel) equityLabel.textContent = `Equity: ${equityDisplayPct}%`;
  if (debtLabel) debtLabel.textContent = `Debt: ${debtDisplayPct}%`;

  if (weightTotal) {
    weightTotal.textContent = `${total}%`;
    weightTotal.classList.toggle('weight-total--valid', total === 100);
    weightTotal.classList.toggle('weight-total--invalid', total !== 100);
  }
}

// ─── 6. Notify Change ────────────────────────────────────────────────────────

/**
 * Calls the registered onChange callback with the current allocations.
 */
function notifyChange() {
  if (typeof onChangeCallback === 'function') {
    onChangeCallback(getAllocations());
  }
}

// ─── 7. Get Allocations ───────────────────────────────────────────────────────

/**
 * Returns a shallow copy of the current fund allocations.
 * @returns {Object.<string, number>}
 */
export function getAllocations() {
  return { ...selectedFunds };
}

// ─── 8. Get Total Weight ─────────────────────────────────────────────────────

/**
 * Returns the sum of all current fund weight percentages.
 * @returns {number}
 */
export function getTotalWeight() {
  return Object.values(selectedFunds).reduce((sum, w) => sum + w, 0);
}
