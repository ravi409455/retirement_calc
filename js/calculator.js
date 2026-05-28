/**
 * Core Calculator Engine — Retirement Calculator
 * Pure math module: no DOM, no external imports.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const INR_CR = 1_00_00_000;   // 1 Crore
const INR_L  = 1_00_000;      // 1 Lakh
const LTCG_EXEMPTION = 1_25_000; // ₹1.25 L equity LTCG exemption

// ─── 1. Inflation-adjusted amount ────────────────────────────────────────────

/**
 * Future value of `amount` after `years` at `inflationRate` (decimal).
 */
export function calcInflationAdjusted(amount, inflationRate, years) {
  return amount * Math.pow(1 + inflationRate, years);
}

// ─── 2. Corpus needed ────────────────────────────────────────────────────────

/**
 * Lump-sum corpus required given annual expense and withdrawal rate (decimal).
 */
export function calcCorpusNeeded(annualExpenseAtRetirement, withdrawalRate) {
  return annualExpenseAtRetirement / withdrawalRate;
}

// ─── 3. Blended return ───────────────────────────────────────────────────────

/**
 * Weighted-average post-expense CAGR across an allocation map.
 *
 * @param {Object}  allocations  { fundId: weightPercent, … }
 * @param {Array}   funds        FUNDS array (each fund has id, cagr5/10/15/20, expenseRatio)
 * @param {number}  horizon      Investment horizon in years
 * @returns {number} Blended net return as a decimal
 */
export function calcBlendedReturn(allocations, funds, horizon) {
  const fundMap = Object.fromEntries(funds.map(f => [f.id, f]));

  let weightedReturn = 0;
  let totalWeight = 0;

  for (const [fundId, weightPct] of Object.entries(allocations)) {
    const fund = fundMap[fundId];
    if (!fund) continue;

    const weight = weightPct / 100;
    let cagr;
    if (horizon <= 5)       cagr = fund.cagr5;
    else if (horizon <= 10) cagr = fund.cagr10;
    else if (horizon <= 15) cagr = fund.cagr15;
    else                    cagr = fund.cagr20;

    const netReturn = cagr - fund.expenseRatio;
    weightedReturn += weight * netReturn;
    totalWeight    += weight;
  }

  if (totalWeight === 0) return 0;
  return weightedReturn / totalWeight; // normalise for partial weights
}

// ─── 4. Equity / Debt split ──────────────────────────────────────────────────

/**
 * Returns rounded integer percentages {equity, debt} summing to 100.
 *
 * @param {Object} allocations { fundId: weightPercent, … }
 * @param {Array}  funds       FUNDS array (each fund has id, type: 'equity'|'debt'|…)
 */
export function calcEquityDebtSplit(allocations, funds) {
  const fundMap = Object.fromEntries(funds.map(f => [f.id, f]));

  let equityWeight = 0;
  let totalWeight  = 0;

  for (const [fundId, weightPct] of Object.entries(allocations)) {
    const fund = fundMap[fundId];
    if (!fund) continue;
    totalWeight += weightPct;
    if (fund.type === 'equity') equityWeight += weightPct;
  }

  if (totalWeight === 0) return { equity: 0, debt: 100 };

  const equityPct = Math.round((equityWeight / totalWeight) * 100);
  return { equity: equityPct, debt: 100 - equityPct };
}

// ─── 5. Simple tax ───────────────────────────────────────────────────────────

/**
 * Apply a flat tax rate to gross return.
 * @returns {number} Net return after tax
 */
export function calcTaxSimple(grossReturn, taxRate) {
  return grossReturn * (1 - taxRate);
}

// ─── 6. Advanced tax ─────────────────────────────────────────────────────────

/**
 * Split annual gain into equity / debt portions and apply Indian tax rules.
 *
 * Equity LTCG: 12.5% on gains above ₹1.25 L exemption.
 * Debt:        Slab rate (30% assumed for highest bracket).
 *
 * @param {number} annualGain  Total gain for the year
 * @param {number} equityPct   Equity allocation percentage (0-100)
 * @param {Object} taxRules    { ltcgRate: 0.125, debtSlabRate: 0.30, exemption: 125000 }
 * @returns {{ equityTax: number, debtTax: number, totalTax: number }}
 */
export function calcTaxAdvanced(annualGain, equityPct, taxRules = {}) {
  const ltcgRate    = taxRules.ltcgRate    ?? 0.125;
  const debtSlabRate = taxRules.debtSlabRate ?? 0.30;
  const exemption   = taxRules.exemption   ?? LTCG_EXEMPTION;

  const equityGain = annualGain * (equityPct / 100);
  const debtGain   = annualGain * (1 - equityPct / 100);

  const taxableEquity = Math.max(0, equityGain - exemption);
  const equityTax     = taxableEquity * ltcgRate;
  const debtTax       = Math.max(0, debtGain) * debtSlabRate;

  return {
    equityTax,
    debtTax,
    totalTax: equityTax + debtTax,
  };
}

// ─── 7. Run Projection ───────────────────────────────────────────────────────

/**
 * Full retirement corpus projection.
 *
 * @param {Object} params
 * @param {number} params.currentAge
 * @param {number} params.retirementAge
 * @param {number} params.planUntilAge
 * @param {number} params.monthlyExpense        Current monthly expense (today's money)
 * @param {number} params.inflationRate          Decimal (e.g. 0.06)
 * @param {number} params.withdrawalRate         Decimal (e.g. 0.04)
 * @param {number} params.expectedReturn         Decimal (e.g. 0.10)
 * @param {string} params.taxMode                'simple' | 'advanced'
 * @param {Object} [params.taxRules]             For advanced mode
 * @param {number} [params.equityPct]            0-100, for advanced mode
 * @param {number} [params.simpleTaxRate]        Decimal, for simple mode (default 0)
 *
 * @returns {{ summary: Object, projections: Array }}
 */
export function runProjection(params) {
  const {
    currentAge,
    retirementAge,
    planUntilAge,
    monthlyExpense,
    inflationRate,
    withdrawalRate,
    expectedReturn,
    taxMode = 'simple',
    taxRules = {},
    equityPct = 60,
    simpleTaxRate = 0,
  } = params;

  const yearsToRetirement  = retirementAge - currentAge;
  const yearsInRetirement  = planUntilAge  - retirementAge;

  // Expense at retirement (inflation-adjusted)
  const monthlyAtRetirement = calcInflationAdjusted(monthlyExpense, inflationRate, yearsToRetirement);
  const annualAtRetirement  = monthlyAtRetirement * 12;

  // Corpus required at retirement
  const corpusNeeded = calcCorpusNeeded(annualAtRetirement, withdrawalRate);

  // ── Decumulation phase: simulate year-by-year ──
  const projections = [];
  let corpus = corpusNeeded;
  let totalWithdrawn = 0;
  let totalTaxPaid   = 0;
  let survived       = true;
  let survivalYears  = 0;
  let annualExpense  = annualAtRetirement;

  for (let i = 0; i < yearsInRetirement; i++) {
    const year          = i + 1;
    const age           = retirementAge + i;
    const corpusStart   = corpus;
    const returns       = corpusStart * expectedReturn;

    // Tax on returns
    let taxPaid = 0;
    if (taxMode === 'advanced') {
      const { totalTax } = calcTaxAdvanced(returns, equityPct, taxRules);
      taxPaid = totalTax;
    } else {
      // simple: tax is already baked into net return via simpleTaxRate
      taxPaid = returns * simpleTaxRate;
    }

    const netReturns = returns - taxPaid;
    const corpusEnd  = corpusStart + netReturns - annualExpense;

    projections.push({
      year,
      age,
      annualExpense: Math.round(annualExpense),
      monthlyExpense: Math.round(annualExpense / 12),
      corpusStart:  Math.round(corpusStart),
      returns:      Math.round(returns),
      taxPaid:      Math.round(taxPaid),
      corpusEnd:    Math.round(corpusEnd),
    });

    totalWithdrawn += annualExpense;
    totalTaxPaid   += taxPaid;

    if (corpusEnd <= 0) {
      corpus   = 0;
      survived = false;
      survivalYears = year;
      // Fill remaining years as depleted
      for (let j = i + 1; j < yearsInRetirement; j++) {
        const futureExpense = calcInflationAdjusted(annualAtRetirement, inflationRate, j);
        projections.push({
          year: j + 1,
          age: retirementAge + j,
          annualExpense: Math.round(futureExpense),
          monthlyExpense: Math.round(futureExpense / 12),
          corpusStart: 0,
          returns: 0,
          taxPaid: 0,
          corpusEnd: 0,
        });
      }
      break;
    }

    corpus = corpusEnd;
    // Escalate expense with inflation for next year
    annualExpense = calcInflationAdjusted(annualAtRetirement, inflationRate, i + 1);
  }

  if (survived) survivalYears = yearsInRetirement;

  const finalProjection = projections[projections.length - 1];
  const finalCorpus     = finalProjection ? finalProjection.corpusEnd : 0;
  const monthlyInFinalYear = finalProjection ? finalProjection.monthlyExpense : 0;

  // Real (inflation-adjusted) return
  const realReturn = (1 + expectedReturn) / (1 + inflationRate) - 1;

  return {
    summary: {
      yearsToRetirement,
      yearsInRetirement,
      monthlyAtRetirement: Math.round(monthlyAtRetirement),
      annualAtRetirement:  Math.round(annualAtRetirement),
      corpusNeeded:        Math.round(corpusNeeded),
      realReturn,
      finalCorpus:         Math.round(finalCorpus),
      totalWithdrawn:      Math.round(totalWithdrawn),
      totalTaxPaid:        Math.round(totalTaxPaid),
      survived,
      survivalYears,
      monthlyInFinalYear,
    },
    projections,
  };
}

// ─── 8. SWP Comparison ───────────────────────────────────────────────────────

/**
 * Simulate a Systematic Withdrawal Plan with inflation-escalated withdrawals.
 *
 * @param {Object} params
 * @param {number} params.corpus
 * @param {number} params.withdrawalRate   Decimal
 * @param {number} params.inflationRate    Decimal
 * @param {number} params.expectedReturn   Decimal
 * @param {number} params.years
 *
 * @returns {Array<{ year, corpus, withdrawal, totalWithdrawn, depleted }>}
 */
export function runSWPComparison(params) {
  const {
    corpus: initialCorpus,
    withdrawalRate,
    inflationRate,
    expectedReturn,
    years,
  } = params;

  const baseWithdrawal = initialCorpus * withdrawalRate;
  const results = [];

  let corpus         = initialCorpus;
  let totalWithdrawn = 0;

  for (let year = 1; year <= years; year++) {
    // Inflation-escalated withdrawal
    const withdrawal = calcInflationAdjusted(baseWithdrawal, inflationRate, year - 1);

    const returns   = corpus * expectedReturn;
    const corpusEnd = corpus + returns - withdrawal;

    totalWithdrawn += withdrawal;

    const depleted = corpusEnd <= 0;

    results.push({
      year,
      corpus:        Math.round(Math.max(0, corpusEnd)),
      withdrawal:    Math.round(withdrawal),
      totalWithdrawn: Math.round(totalWithdrawn),
      depleted,
    });

    if (depleted) {
      // Fill remaining years as depleted
      for (let y = year + 1; y <= years; y++) {
        const futureWithdrawal = calcInflationAdjusted(baseWithdrawal, inflationRate, y - 1);
        totalWithdrawn += futureWithdrawal;
        results.push({
          year: y,
          corpus: 0,
          withdrawal: Math.round(futureWithdrawal),
          totalWithdrawn: Math.round(totalWithdrawn),
          depleted: true,
        });
      }
      break;
    }

    corpus = corpusEnd;
  }

  return results;
}

// ─── 9. formatINR (compact) ──────────────────────────────────────────────────

/**
 * Format a number in Indian notation: ≥1Cr → "X.XX Cr", ≥1L → "X.XX L", else en-IN.
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= INR_CR) {
    return `${sign}${(abs / INR_CR).toFixed(2)} Cr`;
  }
  if (abs >= INR_L) {
    return `${sign}${(abs / INR_L).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN').format(Math.round(amount));
}

// ─── 10. formatINRFull ───────────────────────────────────────────────────────

/**
 * Full Indian currency format: ₹X,XX,XXX (no decimals).
 */
export function formatINRFull(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}
