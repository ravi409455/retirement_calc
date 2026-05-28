import { initCosmos } from './cosmos.js?v=3.2';
import { loadFundData, FUNDS, TAX_RULES, DATA_META } from './data.js?v=3.2';
import { runProjection, runSWPComparison, calcBlendedReturn, calcEquityDebtSplit, formatINR } from './calculator.js?v=3.2';
import { initPortfolio, getAllocations, getTotalWeight } from './portfolio.js?v=3.2';
import { renderProjectionChart, renderComparisonChart } from './charts.js?v=3.2';

initCosmos('cosmos-bg');

let currentTaxMode = 'simple';
let debounceTimer = null;

/* ── Bootstrap: load data then init ────────────────────── */

async function bootstrap() {
    try {
        await loadFundData();
    } catch (err) {
        console.error('[main] Failed to load fund data:', err);
        return;
    }

    // Show data provenance badge
    const metaBadge = document.getElementById('data-provenance');
    if (metaBadge && DATA_META.lastUpdated) {
        metaBadge.textContent = `Data as of ${DATA_META.lastUpdated} · Source: ${DATA_META.dataSource || 'AMFI'}`;
    }

    initPortfolio('portfolio-container', onPortfolioChange);
    setupTaxToggle();
    setupLiveCalculation();
    setupTabs();
    calculate();
}

document.addEventListener('DOMContentLoaded', bootstrap);

function onPortfolioChange() {
    scheduleCalculation();
}

/* ── Slider Synchronization & Badge Helpers ───────────────── */

let previousMetrics = {
    corpusNeeded: 0,
    monthlyAtRetirement: 0,
    totalWithdrawn: 0,
    finalCorpus: 0
};

function syncInputs(id, formatFn) {
    const numInput = document.getElementById(id);
    const rangeInput = document.getElementById(id + '-range');
    const badge = document.getElementById('badge-' + id);

    if (!numInput) return;

    const updateBadge = (val) => {
        if (badge) {
            badge.textContent = formatFn ? formatFn(val) : val;
        }
    };

    // Set initial badge text
    updateBadge(parseFloat(numInput.value));

    // If no range input exists (e.g. tax field), just sync badge on number input
    if (!rangeInput) {
        numInput.addEventListener('input', () => {
            const val = parseFloat(numInput.value);
            updateBadge(isNaN(val) ? 0 : val);
        });
        return;
    }

    // Handle number input changes
    numInput.addEventListener('input', () => {
        let val = parseFloat(numInput.value);
        if (isNaN(val)) val = parseFloat(numInput.min) || 0;

        const min = parseFloat(numInput.min);
        const max = parseFloat(numInput.max);
        if (!isNaN(min) && val < min) val = min;
        if (!isNaN(max) && val > max) val = max;

        rangeInput.value = val;
        updateBadge(val);
    });

    // Handle range input changes
    rangeInput.addEventListener('input', () => {
        const val = parseFloat(rangeInput.value);
        numInput.value = val;
        updateBadge(val);
        scheduleCalculation();
    });
}

function animateValue(element, start, end, duration, isRupee = true, formatFn = formatINR) {
    if (isNaN(start) || start === null) start = 0;
    if (isNaN(end) || end === null) end = 0;

    if (start === end) {
        element.textContent = isRupee ? `₹${formatFn(end)}` : formatFn(end);
        return;
    }

    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing: easeOutQuad
        const ease = progress * (2 - progress);
        const currentVal = start + (end - start) * ease;

        element.textContent = isRupee ? `₹${formatFn(currentVal)}` : formatFn(currentVal);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = isRupee ? `₹${formatFn(end)}` : formatFn(end);
        }
    }

    requestAnimationFrame(update);
}

/* ── Debounced Live Calculation ─────────────────────────── */

function scheduleCalculation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 250);
}

function setupLiveCalculation() {
    // Sync each slider with number inputs and format badges
    syncInputs('current-age', val => `${val} Yrs`);
    syncInputs('retirement-age', val => `${val} Yrs`);
    syncInputs('plan-until-age', val => `${val} Yrs`);
    syncInputs('monthly-expense', val => `₹${new Intl.NumberFormat('en-IN').format(val)}`);
    syncInputs('inflation-rate', val => `${val}%`);
    syncInputs('withdrawal-rate', val => `${val}%`);
    // Post-tax-return has no slider, just badge sync
    syncInputs('post-tax-return', val => `${val}%`);

    // Attach standard recalculation input listeners
    const inputIds = [
        'current-age', 'retirement-age', 'plan-until-age',
        'monthly-expense', 'inflation-rate', 'withdrawal-rate',
        'post-tax-return'
    ];

    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', scheduleCalculation);
        }
    });
}

/* ── Tax Mode Toggle ────────────────────────────────────── */

function setupTaxToggle() {
    document.querySelectorAll('[data-tax-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTaxMode = btn.dataset.taxMode;
            document.querySelectorAll('[data-tax-mode]').forEach(b => b.classList.remove('toggle-group__btn--active'));
            btn.classList.add('toggle-group__btn--active');
            document.getElementById('simple-tax-input').style.display = currentTaxMode === 'simple' ? '' : 'none';
            document.getElementById('advanced-tax-input').style.display = currentTaxMode === 'advanced' ? '' : 'none';
            scheduleCalculation();
        });
    });
}

/* ── Tabs ───────────────────────────────────────────────── */

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Toggle active button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
            btn.classList.add('tab-btn--active');

            // Toggle active panel
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-panel--active'));
            const panel = document.getElementById('tab-' + tabId);
            if (panel) panel.classList.add('tab-panel--active');
        });
    });
}

/* ── Inputs & Validation ────────────────────────────────── */

function getInputs() {
    return {
        currentAge: parseInt(document.getElementById('current-age').value),
        retirementAge: parseInt(document.getElementById('retirement-age').value),
        planUntilAge: parseInt(document.getElementById('plan-until-age').value),
        monthlyExpense: parseFloat(document.getElementById('monthly-expense').value),
        inflationRate: parseFloat(document.getElementById('inflation-rate').value) / 100,
        withdrawalRate: parseFloat(document.getElementById('withdrawal-rate').value) / 100,
        postTaxReturn: parseFloat(document.getElementById('post-tax-return').value) / 100,
    };
}

function validate(inputs) {
    const errors = [];
    if (inputs.retirementAge <= inputs.currentAge) errors.push('retirement-age');
    if (inputs.planUntilAge <= inputs.retirementAge) errors.push('plan-until-age');
    if (inputs.monthlyExpense <= 0) errors.push('monthly-expense');
    if (isNaN(inputs.inflationRate) || isNaN(inputs.withdrawalRate)) errors.push('inflation-rate');
    if (getTotalWeight() !== 100) errors.push('portfolio');
    return errors;
}

function setFieldError(inputId, hasError) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (hasError) {
        input.style.borderColor = 'var(--accent-red)';
        input.style.boxShadow = '0 0 0 3px rgba(248, 113, 113, 0.15)';
    } else {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }
}

/* ── Calculate ──────────────────────────────────────────── */

function calculate() {
    const inputs = getInputs();
    const errorFields = validate(inputs);

    // Clear previous errors
    ['current-age', 'retirement-age', 'plan-until-age', 'monthly-expense', 'inflation-rate', 'withdrawal-rate'].forEach(id => {
        setFieldError(id, false);
    });

    if (errorFields.length > 0) {
        errorFields.forEach(id => setFieldError(id, true));
        // Show placeholder dashes when invalid
        document.getElementById('metric-corpus').textContent = '--';
        document.getElementById('metric-monthly').textContent = '--';
        document.getElementById('metric-withdrawn').textContent = '--';
        document.getElementById('metric-final').textContent = '--';
        return;
    }

    const allocations = getAllocations();
    const split = calcEquityDebtSplit(allocations, FUNDS);
    const yearsInRetirement = inputs.planUntilAge - inputs.retirementAge;

    let expectedReturn;
    if (currentTaxMode === 'simple') {
        expectedReturn = inputs.postTaxReturn;
    } else {
        const grossReturn = calcBlendedReturn(allocations, FUNDS, yearsInRetirement);
        expectedReturn = grossReturn;
    }

    const result = runProjection({
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        planUntilAge: inputs.planUntilAge,
        monthlyExpense: inputs.monthlyExpense,
        inflationRate: inputs.inflationRate,
        withdrawalRate: inputs.withdrawalRate,
        expectedReturn,
        taxMode: currentTaxMode,
        taxRules: TAX_RULES,
        equityPct: split.equity,
    });

    displayResults(result, inputs, split, expectedReturn);

    const comparisonRates = [0.03, 0.04, 0.06, 0.08];
    const comparisonDatasets = comparisonRates.map(rate => ({
        label: `${(rate * 100).toFixed(0)}% Withdrawal`,
        data: runSWPComparison({
            corpus: result.summary.corpusNeeded,
            withdrawalRate: rate,
            inflationRate: inputs.inflationRate,
            expectedReturn,
            years: yearsInRetirement,
        }),
    }));

    renderProjectionChart('projection-chart', result.projections);
    renderComparisonChart('comparison-chart', comparisonDatasets);
}

/* ── Display Results ────────────────────────────────────── */

function displayResults(result, inputs, split, expectedReturn) {
    const s = result.summary;
    const prev = previousMetrics;

    // Animate numerical dashboard values
    animateValue(document.getElementById('metric-corpus'), prev.corpusNeeded, s.corpusNeeded, 500, true, formatINR);
    document.getElementById('metric-corpus-sub').textContent = `${s.yearsToRetirement} years to build`;

    animateValue(document.getElementById('metric-monthly'), prev.monthlyAtRetirement, s.monthlyAtRetirement, 500, true, formatINR);
    document.getElementById('metric-monthly-sub').textContent = `₹${formatINR(inputs.monthlyExpense)} today → inflation adjusted`;

    animateValue(document.getElementById('metric-withdrawn'), prev.totalWithdrawn, s.totalWithdrawn, 500, true, formatINR);
    document.getElementById('metric-withdrawn-sub').textContent = `Over ${s.survivalYears} years`;

    animateValue(document.getElementById('metric-final'), prev.finalCorpus, s.finalCorpus, 500, true, formatINR);

    // Update metric cache for next dynamic step
    previousMetrics = {
        corpusNeeded: s.corpusNeeded,
        monthlyAtRetirement: s.monthlyAtRetirement,
        totalWithdrawn: s.totalWithdrawn,
        finalCorpus: s.finalCorpus
    };

    const statusEl = document.getElementById('metric-status');
    if (s.survived) {
        statusEl.innerHTML = '<span class="status-badge status-badge--survived">✓ Survives</span>';
    } else {
        statusEl.innerHTML = '<span class="status-badge status-badge--depleted">✗ Depleted in year ' + s.survivalYears + '</span>';
    }

    // Risk meter
    const riskFill = document.getElementById('risk-fill');
    const riskLabel = document.getElementById('risk-label');
    let riskPct, riskText, riskColor;
    if (split.equity <= 30) { riskPct = 25; riskText = 'Conservative'; riskColor = 'var(--accent-green)'; }
    else if (split.equity <= 50) { riskPct = 45; riskText = 'Moderate'; riskColor = 'var(--accent-cyan)'; }
    else if (split.equity <= 70) { riskPct = 65; riskText = 'Growth'; riskColor = 'var(--accent-orange)'; }
    else { riskPct = 85; riskText = 'Aggressive'; riskColor = 'var(--accent-red)'; }
    riskFill.style.width = riskPct + '%';
    riskFill.style.background = riskColor;
    riskLabel.textContent = riskText;
    riskLabel.style.color = riskColor;

    // Equity/Debt split bar
    document.getElementById('split-equity').style.width = split.equity + '%';
    document.getElementById('split-label').textContent = split.equity + ':' + split.debt;

    // Real return
    const realReturn = expectedReturn - inputs.inflationRate;
    const rrDisplay = document.getElementById('real-return-display');
    rrDisplay.textContent = (realReturn * 100).toFixed(1) + '%';
    rrDisplay.style.color = realReturn > 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    // Year-by-year table
    const tbody = document.querySelector('#projection-table tbody');
    tbody.innerHTML = result.projections.map(p =>
        '<tr>' +
        '<td style="text-align:left">' + p.year + '</td>' +
        '<td style="text-align:left">' + p.age + '</td>' +
        '<td>₹' + formatINR(p.annualExpense) + '</td>' +
        '<td>₹' + formatINR(p.monthlyExpense) + '</td>' +
        '<td>₹' + formatINR(p.corpusStart) + '</td>' +
        '<td>₹' + formatINR(p.returns) + '</td>' +
        '<td style="color:' + (p.corpusEnd > 0 ? 'var(--accent-green)' : 'var(--accent-red)') + '">₹' + formatINR(p.corpusEnd) + '</td>' +
        '</tr>'
    ).join('');
}
