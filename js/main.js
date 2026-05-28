import { initCosmos } from './cosmos.js';
import { FUNDS, TAX_RULES } from './data.js';
import { runProjection, runSWPComparison, calcBlendedReturn, calcEquityDebtSplit, formatINR } from './calculator.js';
import { initPortfolio, getAllocations, getTotalWeight } from './portfolio.js';
import { renderProjectionChart, renderComparisonChart } from './charts.js';

initCosmos('cosmos-bg');

let currentTaxMode = 'simple';
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initPortfolio('portfolio-container', onPortfolioChange);
    setupTaxToggle();
    setupLiveCalculation();
    setupTabs();
    // Run initial calculation
    calculate();
});

function onPortfolioChange() {
    scheduleCalculation();
}

/* ── Debounced Live Calculation ─────────────────────────── */

function scheduleCalculation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 250);
}

function setupLiveCalculation() {
    // Attach input listeners to all form fields
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

    document.getElementById('metric-corpus').textContent = `₹${formatINR(s.corpusNeeded)}`;
    document.getElementById('metric-corpus-sub').textContent = `${s.yearsToRetirement} years to build`;

    document.getElementById('metric-monthly').textContent = `₹${formatINR(s.monthlyAtRetirement)}`;
    document.getElementById('metric-monthly-sub').textContent = `₹${formatINR(inputs.monthlyExpense)} today → inflation adjusted`;

    document.getElementById('metric-withdrawn').textContent = `₹${formatINR(s.totalWithdrawn)}`;
    document.getElementById('metric-withdrawn-sub').textContent = `Over ${s.survivalYears} years`;

    document.getElementById('metric-final').textContent = `₹${formatINR(s.finalCorpus)}`;
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
