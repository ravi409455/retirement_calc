# Indian Retirement & SWP Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login, single-page retirement calculator web app that helps Indian users calculate their retirement corpus, simulate SWP withdrawals across custom fund portfolios, and visualize year-by-year projections — all with a space/cosmos themed UI.

**Architecture:** Static single-page app with no build step. All calculation logic runs client-side in vanilla JS. Fund/index historical return data is embedded in a JS data file. UI uses Chart.js for animated charts and a custom canvas-based particle system for the cosmos background. Docker serves via nginx.

**Tech Stack:** HTML5, CSS3 (custom properties, grid, glassmorphism), vanilla JavaScript (ES modules), Chart.js 4.x (CDN), Docker + nginx:alpine

---

## File Structure

```
retirement_calc/
├── index.html              # Single entry point, all HTML structure
├── css/
│   └── style.css           # All styles: cosmos theme, glassmorphism, responsive
├── js/
│   ├── main.js             # App initialization, tab/section orchestration
│   ├── data.js             # Fund/index return data, fund metadata
│   ├── calculator.js       # Core math: corpus calc, SWP sim, tax logic
│   ├── portfolio.js        # Portfolio builder: fund selection, weight management
│   ├── charts.js           # Chart.js setup, rendering, animations
│   └── cosmos.js           # Canvas particle system for space background
├── Dockerfile              # nginx:alpine serving static files
├── docker-compose.yml      # Single-service compose
├── nginx.conf              # Minimal nginx config with caching headers
└── docs/
    └── superpowers/plans/  # This plan
```

**Why this decomposition:**
- `data.js` is pure data — changes when funds are added/updated, nothing else touches it
- `calculator.js` is pure functions — testable without any DOM, no side effects
- `portfolio.js` manages the fund picker UI state and weight normalization
- `charts.js` wraps Chart.js — isolates the charting library from business logic
- `cosmos.js` is the decorative background — can be disabled for performance without affecting anything
- `main.js` wires everything together, handles form submission, orchestrates updates

---

## Task 1: Project Scaffold & Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Create: `index.html` (minimal shell)

- [ ] **Step 1: Create nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js|png|jpg|ico|svg|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 256;
}
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
EXPOSE 80
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  retirement-calc:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

- [ ] **Step 4: Create minimal index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retirement Calculator - How Much Do You Need?</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <canvas id="cosmos-bg"></canvas>
    <div id="app">
        <header class="header">
            <h1 class="header__title">Retirement Calculator</h1>
            <p class="header__subtitle">Calculate your freedom number</p>
        </header>
        <main id="main-content">
            <p>Loading...</p>
        </main>
        <footer class="footer">
            <p class="disclaimer">For educational purposes only. Not financial advice.</p>
        </footer>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create placeholder CSS and JS files**

Create `css/style.css`:
```css
/* Styles loaded */
body { margin: 0; background: #0a0a1a; color: #e0e0ff; font-family: system-ui, sans-serif; }
#cosmos-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
#app { position: relative; z-index: 1; }
```

Create `js/main.js`:
```javascript
console.log('Retirement Calculator loaded');
```

- [ ] **Step 6: Build and test Docker**

Run:
```bash
docker compose up --build -d
```

Open `http://localhost:8080` — should see the title text on a dark background.

Run:
```bash
docker compose down
```

- [ ] **Step 7: Commit**

```bash
git init
echo "node_modules/" > .gitignore
git add Dockerfile docker-compose.yml nginx.conf index.html css/style.css js/main.js .gitignore
git commit -m "chore: scaffold project with Docker, nginx, and minimal HTML shell"
```

---

## Task 2: Fund & Index Data Module

**Files:**
- Create: `js/data.js`

This file contains all historical return data. Returns are approximate annualized CAGR figures sourced from publicly available fund factsheets and index data (as of 2026). The app uses these to blend portfolio returns.

- [ ] **Step 1: Create js/data.js with fund metadata and returns**

```javascript
export const FUND_CATEGORIES = {
    EQUITY_INDEX: 'Equity - Index',
    EQUITY_ACTIVE: 'Equity - Active Fund',
    HYBRID: 'Hybrid',
    DEBT: 'Debt',
};

export const FUNDS = [
    {
        id: 'nifty50',
        name: 'Nifty 50 TRI',
        category: FUND_CATEGORIES.EQUITY_INDEX,
        assetType: 'equity',
        description: 'Top 50 large-cap Indian companies',
        cagr5: 0.155,
        cagr10: 0.128,
        cagr15: 0.134,
        cagr20: 0.142,
        expenseRatio: 0.005,
    },
    {
        id: 'niftynext50',
        name: 'Nifty Next 50 TRI',
        category: FUND_CATEGORIES.EQUITY_INDEX,
        assetType: 'equity',
        description: 'Companies ranked 51-100 by market cap',
        cagr5: 0.175,
        cagr10: 0.142,
        cagr15: 0.148,
        cagr20: 0.151,
        expenseRatio: 0.005,
    },
    {
        id: 'sensex',
        name: 'S&P BSE Sensex TRI',
        category: FUND_CATEGORIES.EQUITY_INDEX,
        assetType: 'equity',
        description: 'Top 30 blue-chip companies on BSE',
        cagr5: 0.152,
        cagr10: 0.125,
        cagr15: 0.131,
        cagr20: 0.139,
        expenseRatio: 0.005,
    },
    {
        id: 'niftymidcap150',
        name: 'Nifty Midcap 150 TRI',
        category: FUND_CATEGORIES.EQUITY_INDEX,
        assetType: 'equity',
        description: 'Mid-cap companies index',
        cagr5: 0.215,
        cagr10: 0.175,
        cagr15: 0.168,
        cagr20: 0.162,
        expenseRatio: 0.005,
    },
    {
        id: 'hdfc_flexicap',
        name: 'HDFC Flexi Cap Fund',
        category: FUND_CATEGORIES.EQUITY_ACTIVE,
        assetType: 'equity',
        description: 'Large & mid cap active fund',
        cagr5: 0.185,
        cagr10: 0.155,
        cagr15: 0.148,
        cagr20: 0.158,
        expenseRatio: 0.0153,
    },
    {
        id: 'sbi_bluechip',
        name: 'SBI Blue Chip Fund',
        category: FUND_CATEGORIES.EQUITY_ACTIVE,
        assetType: 'equity',
        description: 'Large cap focused fund',
        cagr5: 0.160,
        cagr10: 0.138,
        cagr15: 0.135,
        cagr20: 0.143,
        expenseRatio: 0.0163,
    },
    {
        id: 'ppfas_flexicap',
        name: 'Parag Parikh Flexi Cap Fund',
        category: FUND_CATEGORIES.EQUITY_ACTIVE,
        assetType: 'equity',
        description: 'Flexi cap with international exposure',
        cagr5: 0.195,
        cagr10: 0.178,
        cagr15: 0.165,
        cagr20: 0.160,
        expenseRatio: 0.0063,
    },
    {
        id: 'axis_smallcap',
        name: 'Axis Small Cap Fund',
        category: FUND_CATEGORIES.EQUITY_ACTIVE,
        assetType: 'equity',
        description: 'Small cap growth fund',
        cagr5: 0.225,
        cagr10: 0.195,
        cagr15: 0.180,
        cagr20: 0.170,
        expenseRatio: 0.0175,
    },
    {
        id: 'icici_bal_adv',
        name: 'ICICI Pru Balanced Advantage',
        category: FUND_CATEGORIES.HYBRID,
        assetType: 'equity',
        description: 'Dynamic asset allocation (equity-oriented)',
        cagr5: 0.135,
        cagr10: 0.120,
        cagr15: 0.125,
        cagr20: 0.130,
        expenseRatio: 0.0118,
    },
    {
        id: 'hdfc_bal_adv',
        name: 'HDFC Balanced Advantage Fund',
        category: FUND_CATEGORIES.HYBRID,
        assetType: 'equity',
        description: 'The fund from the Excel sheet (equity-oriented BAF)',
        cagr5: 0.145,
        cagr10: 0.130,
        cagr15: 0.135,
        cagr20: 0.140,
        expenseRatio: 0.0075,
    },
    {
        id: 'sbi_magnum_gilt',
        name: 'SBI Magnum Gilt Fund',
        category: FUND_CATEGORIES.DEBT,
        assetType: 'debt',
        description: 'Government securities fund',
        cagr5: 0.068,
        cagr10: 0.072,
        cagr15: 0.075,
        cagr20: 0.078,
        expenseRatio: 0.0046,
    },
    {
        id: 'hdfc_corp_bond',
        name: 'HDFC Corporate Bond Fund',
        category: FUND_CATEGORIES.DEBT,
        assetType: 'debt',
        description: 'High quality corporate bonds',
        cagr5: 0.072,
        cagr10: 0.076,
        cagr15: 0.079,
        cagr20: 0.081,
        expenseRatio: 0.0036,
    },
    {
        id: 'icici_short_term',
        name: 'ICICI Pru Short Term Fund',
        category: FUND_CATEGORIES.DEBT,
        assetType: 'debt',
        description: 'Short duration debt fund',
        cagr5: 0.069,
        cagr10: 0.074,
        cagr15: 0.077,
        cagr20: 0.079,
        expenseRatio: 0.0039,
    },
    {
        id: 'ppf',
        name: 'PPF / Fixed Return (7.1%)',
        category: FUND_CATEGORIES.DEBT,
        assetType: 'debt',
        description: 'Public Provident Fund equivalent fixed return',
        cagr5: 0.071,
        cagr10: 0.071,
        cagr15: 0.071,
        cagr20: 0.071,
        expenseRatio: 0,
    },
];

export const PRESET_PORTFOLIOS = [
    {
        id: 'conservative',
        name: 'Conservative (30:70)',
        description: '30% equity, 70% debt — lower risk, stable income',
        allocations: { nifty50: 15, sbi_bluechip: 15, hdfc_corp_bond: 40, sbi_magnum_gilt: 30 },
    },
    {
        id: 'balanced',
        name: 'Balanced (50:50)',
        description: '50% equity, 50% debt — moderate risk',
        allocations: { nifty50: 20, hdfc_flexicap: 15, ppfas_flexicap: 15, hdfc_corp_bond: 30, sbi_magnum_gilt: 20 },
    },
    {
        id: 'growth',
        name: 'Growth (70:30)',
        description: '70% equity, 30% debt — higher risk, higher growth',
        allocations: { nifty50: 25, niftynext50: 10, hdfc_flexicap: 15, ppfas_flexicap: 20, hdfc_corp_bond: 20, sbi_magnum_gilt: 10 },
    },
    {
        id: 'aggressive',
        name: 'Aggressive (90:10)',
        description: '90% equity, 10% debt — maximum growth potential',
        allocations: { nifty50: 25, niftymidcap150: 20, ppfas_flexicap: 20, axis_smallcap: 15, hdfc_flexicap: 10, hdfc_corp_bond: 10 },
    },
];

export const CRASH_EVENTS = [
    { year: 2001, label: 'Dot-com Bust', impact: -20 },
    { year: 2008, label: 'Global Financial Crisis', impact: -52 },
    { year: 2016, label: 'Demonetization', impact: -8 },
    { year: 2020, label: 'COVID-19 Crash', impact: -38 },
    { year: 2025, label: 'Tariff Uncertainty', impact: -5 },
];

export const TAX_RULES = {
    equity: {
        ltcgRate: 0.125,
        stcgRate: 0.20,
        ltcgExemption: 125000,
        holdingPeriodMonths: 12,
    },
    debt: {
        slabRate: 0.30,
        holdingPeriodMonths: 36,
    },
};

export function getFundById(id) {
    return FUNDS.find(f => f.id === id);
}

export function getFundsByCategory(category) {
    return FUNDS.filter(f => f.category === category);
}
```

- [ ] **Step 2: Verify module loads**

Add a temporary import to `js/main.js`:
```javascript
import { FUNDS, PRESET_PORTFOLIOS } from './data.js';
console.log(`Loaded ${FUNDS.length} funds, ${PRESET_PORTFOLIOS.length} presets`);
```

Open `index.html` directly in browser (or via Docker) and check console shows: `Loaded 14 funds, 4 presets`.

- [ ] **Step 3: Commit**

```bash
git add js/data.js js/main.js
git commit -m "feat: add fund/index data module with 14 funds, presets, and tax rules"
```

---

## Task 3: Core Calculator Engine

**Files:**
- Create: `js/calculator.js`

Pure functions — no DOM access. All the math from the Excel sheets lives here.

- [ ] **Step 1: Create js/calculator.js with corpus calculation**

```javascript
export function calcInflationAdjusted(amount, inflationRate, years) {
    return amount * Math.pow(1 + inflationRate, years);
}

export function calcCorpusNeeded(annualExpenseAtRetirement, withdrawalRate) {
    return annualExpenseAtRetirement / withdrawalRate;
}

export function calcBlendedReturn(allocations, funds, horizon) {
    let blendedReturn = 0;
    let totalWeight = 0;

    for (const [fundId, weight] of Object.entries(allocations)) {
        const fund = funds.find(f => f.id === fundId);
        if (!fund || weight <= 0) continue;

        const w = weight / 100;
        totalWeight += w;

        let cagr;
        if (horizon <= 5) cagr = fund.cagr5;
        else if (horizon <= 10) cagr = fund.cagr10;
        else if (horizon <= 15) cagr = fund.cagr15;
        else cagr = fund.cagr20;

        const netReturn = cagr - fund.expenseRatio;
        blendedReturn += netReturn * w;
    }

    if (totalWeight === 0) return 0;
    return blendedReturn / totalWeight;
}

export function calcEquityDebtSplit(allocations, funds) {
    let equityWeight = 0;
    let debtWeight = 0;

    for (const [fundId, weight] of Object.entries(allocations)) {
        const fund = funds.find(f => f.id === fundId);
        if (!fund || weight <= 0) continue;
        if (fund.assetType === 'equity') equityWeight += weight;
        else debtWeight += weight;
    }

    const total = equityWeight + debtWeight;
    if (total === 0) return { equity: 0, debt: 0 };
    return {
        equity: Math.round((equityWeight / total) * 100),
        debt: Math.round((debtWeight / total) * 100),
    };
}

export function calcTaxSimple(grossReturn, taxRate) {
    return grossReturn * (1 - taxRate);
}

export function calcTaxAdvanced(annualGain, equityPct, taxRules) {
    const equityGain = annualGain * (equityPct / 100);
    const debtGain = annualGain * ((100 - equityPct) / 100);

    let equityTax = 0;
    if (equityGain > taxRules.equity.ltcgExemption) {
        equityTax = (equityGain - taxRules.equity.ltcgExemption) * taxRules.equity.ltcgRate;
    }

    const debtTax = debtGain * taxRules.debt.slabRate;

    return { equityTax, debtTax, totalTax: equityTax + debtTax };
}

export function runProjection(params) {
    const {
        currentAge,
        retirementAge,
        planUntilAge,
        monthlyExpense,
        inflationRate,
        withdrawalRate,
        expectedReturn,
        taxMode,
        taxRules,
        equityPct,
    } = params;

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = planUntilAge - retirementAge;
    const monthlyAtRetirement = calcInflationAdjusted(monthlyExpense, inflationRate, yearsToRetirement);
    const annualAtRetirement = monthlyAtRetirement * 12;
    const corpusNeeded = calcCorpusNeeded(annualAtRetirement, withdrawalRate);
    const realReturn = expectedReturn - inflationRate;

    const projections = [];
    let corpus = corpusNeeded;
    let totalWithdrawn = 0;
    let totalTaxPaid = 0;
    let survived = true;

    for (let yr = 1; yr <= yearsInRetirement; yr++) {
        const age = retirementAge + yr - 1;
        const annualExpense = calcInflationAdjusted(annualAtRetirement, inflationRate, yr - 1);
        const monthlyExpenseThisYear = annualExpense / 12;

        const corpusStart = corpus;
        const returns = corpus * expectedReturn;

        let taxAmount = 0;
        if (taxMode === 'advanced') {
            const taxResult = calcTaxAdvanced(returns, equityPct, taxRules);
            taxAmount = taxResult.totalTax;
        }

        corpus = corpusStart + returns - taxAmount - annualExpense;
        totalWithdrawn += annualExpense;
        totalTaxPaid += taxAmount;

        if (corpus <= 0) {
            corpus = 0;
            survived = false;
        }

        projections.push({
            year: yr,
            age,
            annualExpense,
            monthlyExpense: monthlyExpenseThisYear,
            corpusStart,
            returns,
            taxPaid: taxAmount,
            corpusEnd: corpus,
        });

        if (!survived) break;
    }

    return {
        summary: {
            yearsToRetirement,
            yearsInRetirement,
            monthlyAtRetirement,
            annualAtRetirement,
            corpusNeeded,
            realReturn,
            finalCorpus: corpus,
            totalWithdrawn,
            totalTaxPaid,
            survived,
            survivalYears: projections.length,
            monthlyInFinalYear: projections.length > 0
                ? projections[projections.length - 1].monthlyExpense
                : 0,
        },
        projections,
    };
}

export function runSWPComparison(params) {
    const { corpus, withdrawalRate, inflationRate, expectedReturn, years } = params;

    const fixedAnnualWD = corpus * withdrawalRate;
    const results = [];
    let runningCorpus = corpus;
    let totalWD = 0;

    for (let yr = 1; yr <= years; yr++) {
        const escalatedWD = calcInflationAdjusted(fixedAnnualWD, inflationRate, yr - 1);
        const returns = runningCorpus * expectedReturn;
        runningCorpus = runningCorpus + returns - escalatedWD;
        totalWD += escalatedWD;

        if (runningCorpus <= 0) {
            runningCorpus = 0;
            results.push({ year: yr, corpus: 0, withdrawal: escalatedWD, totalWithdrawn: totalWD, depleted: true });
            break;
        }

        results.push({ year: yr, corpus: runningCorpus, withdrawal: escalatedWD, totalWithdrawn: totalWD, depleted: false });
    }

    return results;
}

export function formatINR(amount) {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    return new Intl.NumberFormat('en-IN').format(Math.round(amount));
}

export function formatINRFull(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
```

- [ ] **Step 2: Verify calculator works in console**

Add to `js/main.js` temporarily:
```javascript
import { FUNDS, PRESET_PORTFOLIOS, TAX_RULES } from './data.js';
import { runProjection, calcBlendedReturn, formatINR } from './calculator.js';

const testResult = runProjection({
    currentAge: 30,
    retirementAge: 35,
    planUntilAge: 70,
    monthlyExpense: 50000,
    inflationRate: 0.06,
    withdrawalRate: 0.04,
    expectedReturn: 0.08,
    taxMode: 'simple',
    taxRules: TAX_RULES,
    equityPct: 40,
});

console.log('Corpus needed:', formatINR(testResult.summary.corpusNeeded));
console.log('Monthly at retirement:', formatINR(testResult.summary.monthlyAtRetirement));
console.log('Survived:', testResult.summary.survived);
console.log('Final corpus:', formatINR(testResult.summary.finalCorpus));
```

Open in browser, console should show values matching the Excel: Corpus ~2 Cr, Monthly at retirement ~66,911.

- [ ] **Step 3: Commit**

```bash
git add js/calculator.js js/main.js
git commit -m "feat: add core calculator engine with projection, SWP, tax, and formatting"
```

---

## Task 4: Cosmos Background Animation

**Files:**
- Create: `js/cosmos.js`

Canvas-based particle system for the space background effect.

- [ ] **Step 1: Create js/cosmos.js**

```javascript
export function initCosmos(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let animationId;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function createParticles() {
        particles = [];
        const count = Math.floor((width * height) / 8000);
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.8 + 0.2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.005,
                color: Math.random() > 0.7
                    ? `rgba(120, 160, 255, `
                    : Math.random() > 0.5
                        ? `rgba(180, 140, 255, `
                        : `rgba(200, 200, 255, `,
            });
        }
    }

    function drawConnections() {
        const maxDist = 120;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.15;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(100, 140, 255, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
        gradient.addColorStop(0, '#0d0d2b');
        gradient.addColorStop(0.5, '#0a0a1f');
        gradient.addColorStop(1, '#050510');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        drawConnections();

        for (const p of particles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.pulse += p.pulseSpeed;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            const pulsedOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color + pulsedOpacity + ')';
            ctx.fill();

            if (p.size > 1.5) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = p.color + (pulsedOpacity * 0.1) + ')';
                ctx.fill();
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });

    return {
        destroy() {
            cancelAnimationFrame(animationId);
        },
    };
}
```

- [ ] **Step 2: Wire cosmos into main.js**

Update `js/main.js`:
```javascript
import { initCosmos } from './cosmos.js';

initCosmos('cosmos-bg');
```

- [ ] **Step 3: Verify particle animation**

Open in browser — should see floating, pulsing stars with faint constellation lines on a deep blue/purple gradient background.

- [ ] **Step 4: Commit**

```bash
git add js/cosmos.js js/main.js
git commit -m "feat: add cosmos particle background animation"
```

---

## Task 5: CSS Theme & Layout

**Files:**
- Modify: `css/style.css` (replace contents)

- [ ] **Step 1: Write the complete space-themed CSS**

Replace `css/style.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@400;500;700&display=swap');

:root {
    --bg-deep: #050510;
    --bg-card: rgba(15, 15, 40, 0.7);
    --bg-card-hover: rgba(20, 20, 55, 0.8);
    --bg-input: rgba(10, 10, 30, 0.8);
    --border-glow: rgba(80, 120, 255, 0.3);
    --border-subtle: rgba(60, 80, 140, 0.2);
    --accent-blue: #4a7cff;
    --accent-purple: #8b5cf6;
    --accent-cyan: #22d3ee;
    --accent-green: #34d399;
    --accent-orange: #fb923c;
    --accent-red: #f87171;
    --text-primary: #e0e4ff;
    --text-secondary: rgba(180, 190, 230, 0.7);
    --text-muted: rgba(140, 150, 200, 0.5);
    --glow-blue: 0 0 20px rgba(74, 124, 255, 0.3);
    --glow-purple: 0 0 20px rgba(139, 92, 246, 0.3);
    --font-display: 'Orbitron', monospace;
    --font-body: 'Inter', system-ui, sans-serif;
    --radius: 16px;
    --radius-sm: 8px;
}

*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    font-size: 16px;
    scroll-behavior: smooth;
}

body {
    font-family: var(--font-body);
    color: var(--text-primary);
    background: var(--bg-deep);
    min-height: 100vh;
    overflow-x: hidden;
    line-height: 1.6;
}

#cosmos-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
}

#app {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
}

/* Header */
.header {
    text-align: center;
    padding: 3rem 0 2rem;
}

.header__title {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple), var(--accent-cyan));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
    letter-spacing: 2px;
}

.header__subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    font-weight: 300;
}

/* Glass Cards */
.card {
    background: var(--bg-card);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glow);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
    border-color: rgba(80, 120, 255, 0.5);
    box-shadow: var(--glow-blue);
}

.card__title {
    font-family: var(--font-display);
    font-size: 0.85rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent-cyan);
    margin-bottom: 1.2rem;
}

/* Form Elements */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.2rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.form-group label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    letter-spacing: 0.5px;
}

.form-group input,
.form-group select {
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 1rem;
    padding: 0.65rem 0.85rem;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    outline: none;
    width: 100%;
}

.form-group input:focus,
.form-group select:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(74, 124, 255, 0.15);
}

.form-group input::placeholder {
    color: var(--text-muted);
}

.input-hint {
    font-size: 0.7rem;
    color: var(--text-muted);
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn--primary {
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    color: white;
    box-shadow: var(--glow-blue);
}

.btn--primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(74, 124, 255, 0.5);
}

.btn--primary:active {
    transform: translateY(0);
}

.btn--outline {
    background: transparent;
    color: var(--accent-blue);
    border: 1px solid var(--border-glow);
}

.btn--outline:hover {
    background: rgba(74, 124, 255, 0.1);
}

.btn--sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.65rem;
}

/* Dashboard Grid */
.dashboard {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.metric-card {
    background: var(--bg-card);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 1.2rem;
    text-align: center;
    transition: all 0.3s ease;
}

.metric-card:hover {
    border-color: var(--border-glow);
    transform: translateY(-3px);
    box-shadow: var(--glow-blue);
}

.metric-card__label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
}

.metric-card__value {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.metric-card__sub {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.3rem;
}

.metric-card--green .metric-card__value {
    background: linear-gradient(135deg, var(--accent-green), var(--accent-cyan));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.metric-card--orange .metric-card__value {
    background: linear-gradient(135deg, var(--accent-orange), var(--accent-red));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.metric-card--purple .metric-card__value {
    background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* Status badge */
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.8rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.status-badge--survived {
    background: rgba(52, 211, 153, 0.15);
    color: var(--accent-green);
    border: 1px solid rgba(52, 211, 153, 0.3);
}

.status-badge--depleted {
    background: rgba(248, 113, 113, 0.15);
    color: var(--accent-red);
    border: 1px solid rgba(248, 113, 113, 0.3);
}

/* Chart containers */
.chart-container {
    position: relative;
    width: 100%;
    height: 350px;
}

/* Fund Picker */
.fund-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.8rem;
}

.fund-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-input);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
    cursor: pointer;
}

.fund-item:hover {
    border-color: var(--border-glow);
    background: var(--bg-card-hover);
}

.fund-item--selected {
    border-color: var(--accent-blue);
    background: rgba(74, 124, 255, 0.08);
}

.fund-item__checkbox {
    width: 18px;
    height: 18px;
    accent-color: var(--accent-blue);
    cursor: pointer;
    flex-shrink: 0;
}

.fund-item__info {
    flex: 1;
    min-width: 0;
}

.fund-item__name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.fund-item__category {
    font-size: 0.7rem;
    color: var(--text-muted);
}

.fund-item__weight {
    width: 65px;
    text-align: center;
    flex-shrink: 0;
}

.fund-item__weight input {
    width: 55px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    color: var(--accent-cyan);
    font-family: var(--font-display);
    font-size: 0.85rem;
    text-align: center;
    padding: 0.3rem;
    outline: none;
}

.fund-item__weight input:focus {
    border-color: var(--accent-blue);
}

/* Weight Bar */
.weight-bar {
    margin-top: 1rem;
    padding: 0.8rem;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
}

.weight-bar__track {
    height: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    margin-bottom: 0.5rem;
}

.weight-bar__fill--equity {
    background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
    transition: width 0.5s ease;
    height: 100%;
}

.weight-bar__fill--debt {
    background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green));
    transition: width 0.5s ease;
    height: 100%;
}

.weight-bar__labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
}

.weight-bar__label--equity { color: var(--accent-purple); }
.weight-bar__label--debt { color: var(--accent-green); }

.weight-total {
    text-align: right;
    font-size: 0.8rem;
    margin-top: 0.3rem;
}

.weight-total--valid { color: var(--accent-green); }
.weight-total--invalid { color: var(--accent-red); }

/* Preset buttons */
.preset-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

/* Toggle switch */
.toggle-group {
    display: flex;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
    width: fit-content;
}

.toggle-group__btn {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-family: var(--font-body);
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.toggle-group__btn--active {
    background: rgba(74, 124, 255, 0.2);
    color: var(--accent-blue);
}

/* Data table */
.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
}

.data-table th {
    font-family: var(--font-display);
    font-size: 0.65rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 0.75rem 0.5rem;
    text-align: right;
    border-bottom: 1px solid var(--border-subtle);
}

.data-table th:first-child,
.data-table td:first-child {
    text-align: left;
}

.data-table td {
    padding: 0.6rem 0.5rem;
    text-align: right;
    color: var(--text-secondary);
    border-bottom: 1px solid rgba(60, 80, 140, 0.1);
}

.data-table tr:hover td {
    background: rgba(74, 124, 255, 0.05);
    color: var(--text-primary);
}

/* Projection period selector */
.period-selector {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.period-btn {
    padding: 0.4rem 0.9rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    background: transparent;
    color: var(--text-secondary);
    transition: all 0.2s ease;
}

.period-btn:hover {
    border-color: var(--border-glow);
    color: var(--text-primary);
}

.period-btn--active {
    background: rgba(74, 124, 255, 0.2);
    border-color: var(--accent-blue);
    color: var(--accent-blue);
}

/* Section spacing */
.section {
    margin-bottom: 2rem;
}

.section__title {
    font-family: var(--font-display);
    font-size: 1rem;
    letter-spacing: 2px;
    margin-bottom: 1rem;
    color: var(--text-primary);
}

/* Animations */
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(74, 124, 255, 0.2); }
    50% { box-shadow: 0 0 20px rgba(74, 124, 255, 0.4); }
}

.animate-in {
    animation: fadeInUp 0.5s ease-out forwards;
    opacity: 0;
}

.animate-in:nth-child(1) { animation-delay: 0.05s; }
.animate-in:nth-child(2) { animation-delay: 0.1s; }
.animate-in:nth-child(3) { animation-delay: 0.15s; }
.animate-in:nth-child(4) { animation-delay: 0.2s; }

/* Two-column layout for chart + table */
.results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

/* Footer */
.footer {
    text-align: center;
    padding: 2rem 0;
    margin-top: 2rem;
}

.disclaimer {
    font-size: 0.75rem;
    color: var(--text-muted);
    max-width: 500px;
    margin: 0 auto;
}

/* Risk meter */
.risk-meter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.risk-meter__bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    overflow: hidden;
}

.risk-meter__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease, background 0.5s ease;
}

.risk-meter__label {
    font-size: 0.7rem;
    font-weight: 600;
    min-width: 60px;
    text-align: right;
}

/* Responsive */
@media (max-width: 900px) {
    .dashboard {
        grid-template-columns: repeat(2, 1fr);
    }
    .results-grid {
        grid-template-columns: 1fr;
    }
    .header__title {
        font-size: 1.8rem;
    }
}

@media (max-width: 600px) {
    #app {
        padding: 1rem 0.75rem 3rem;
    }
    .dashboard {
        grid-template-columns: 1fr 1fr;
    }
    .form-grid {
        grid-template-columns: 1fr;
    }
    .fund-picker {
        grid-template-columns: 1fr;
    }
    .header__title {
        font-size: 1.4rem;
    }
    .metric-card__value {
        font-size: 1.1rem;
    }
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: var(--bg-deep);
}

::-webkit-scrollbar-thumb {
    background: rgba(80, 120, 255, 0.3);
    border-radius: 3px;
}
```

- [ ] **Step 2: Verify styles load**

Open in browser — header should show gradient Orbitron text, background should be dark with the canvas animation.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add space/cosmos themed CSS with glassmorphism, responsive layout"
```

---

## Task 6: Portfolio Builder UI

**Files:**
- Create: `js/portfolio.js`

Manages fund selection, weight inputs, preset loading, and weight validation.

- [ ] **Step 1: Create js/portfolio.js**

```javascript
import { FUNDS, FUND_CATEGORIES, PRESET_PORTFOLIOS, getFundById } from './data.js';
import { calcEquityDebtSplit } from './calculator.js';

let selectedFunds = {};
let onChangeCallback = null;

export function initPortfolio(containerId, onChange) {
    onChangeCallback = onChange;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = buildPortfolioHTML();
    attachPortfolioEvents(container);
    applyPreset('balanced');
}

function buildPortfolioHTML() {
    const presetButtons = PRESET_PORTFOLIOS.map(p =>
        `<button class="btn btn--outline btn--sm preset-btn" data-preset="${p.id}" title="${p.description}">${p.name}</button>`
    ).join('');

    const grouped = {};
    for (const cat of Object.values(FUND_CATEGORIES)) {
        grouped[cat] = FUNDS.filter(f => f.category === cat);
    }

    let fundHTML = '';
    for (const [category, funds] of Object.entries(grouped)) {
        fundHTML += `<div class="fund-category-label" style="grid-column: 1 / -1; font-size: 0.7rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 1px; margin-top: 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--border-subtle);">${category}</div>`;
        for (const fund of funds) {
            fundHTML += `
                <div class="fund-item" data-fund-id="${fund.id}">
                    <input type="checkbox" class="fund-item__checkbox" data-fund-id="${fund.id}">
                    <div class="fund-item__info">
                        <div class="fund-item__name">${fund.name}</div>
                        <div class="fund-item__category">${fund.description}</div>
                    </div>
                    <div class="fund-item__weight">
                        <input type="number" min="0" max="100" value="0" data-fund-id="${fund.id}"
                               class="weight-input" disabled placeholder="%">
                    </div>
                </div>`;
        }
    }

    return `
        <div class="preset-bar">${presetButtons}</div>
        <div class="fund-picker">${fundHTML}</div>
        <div class="weight-bar">
            <div class="weight-bar__track">
                <div class="weight-bar__fill--equity" id="equity-fill" style="width: 0%"></div>
                <div class="weight-bar__fill--debt" id="debt-fill" style="width: 0%"></div>
            </div>
            <div class="weight-bar__labels">
                <span class="weight-bar__label--equity" id="equity-label">Equity: 0%</span>
                <span class="weight-bar__label--debt" id="debt-label">Debt: 0%</span>
            </div>
            <div class="weight-total" id="weight-total">Total: 0%</div>
        </div>`;
}

function attachPortfolioEvents(container) {
    container.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
            container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('btn--primary'));
            btn.classList.add('btn--primary');
            btn.classList.remove('btn--outline');
        });
    });

    container.querySelectorAll('.fund-item__checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const fundId = cb.dataset.fundId;
            const item = cb.closest('.fund-item');
            const weightInput = item.querySelector('.weight-input');

            if (cb.checked) {
                item.classList.add('fund-item--selected');
                weightInput.disabled = false;
                weightInput.value = 10;
                selectedFunds[fundId] = 10;
            } else {
                item.classList.remove('fund-item--selected');
                weightInput.disabled = true;
                weightInput.value = 0;
                delete selectedFunds[fundId];
            }
            updateWeightDisplay();
            notifyChange();
        });
    });

    container.querySelectorAll('.fund-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('weight-input') || e.target.classList.contains('fund-item__checkbox')) return;
            const cb = item.querySelector('.fund-item__checkbox');
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
        });
    });

    container.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('input', () => {
            const fundId = input.dataset.fundId;
            const val = Math.max(0, Math.min(100, parseInt(input.value) || 0));
            selectedFunds[fundId] = val;
            updateWeightDisplay();
            notifyChange();
        });
    });
}

export function applyPreset(presetId) {
    const preset = PRESET_PORTFOLIOS.find(p => p.id === presetId);
    if (!preset) return;

    selectedFunds = { ...preset.allocations };

    document.querySelectorAll('.fund-item__checkbox').forEach(cb => {
        const fundId = cb.dataset.fundId;
        const item = cb.closest('.fund-item');
        const weightInput = item.querySelector('.weight-input');

        if (selectedFunds[fundId]) {
            cb.checked = true;
            item.classList.add('fund-item--selected');
            weightInput.disabled = false;
            weightInput.value = selectedFunds[fundId];
        } else {
            cb.checked = false;
            item.classList.remove('fund-item--selected');
            weightInput.disabled = true;
            weightInput.value = 0;
        }
    });

    updateWeightDisplay();
    notifyChange();
}

function updateWeightDisplay() {
    const split = calcEquityDebtSplit(selectedFunds, FUNDS);
    const total = Object.values(selectedFunds).reduce((a, b) => a + b, 0);

    const equityFill = document.getElementById('equity-fill');
    const debtFill = document.getElementById('debt-fill');
    const equityLabel = document.getElementById('equity-label');
    const debtLabel = document.getElementById('debt-label');
    const totalEl = document.getElementById('weight-total');

    if (equityFill) equityFill.style.width = `${split.equity}%`;
    if (debtFill) debtFill.style.width = `${split.debt}%`;
    if (equityLabel) equityLabel.textContent = `Equity: ${split.equity}%`;
    if (debtLabel) debtLabel.textContent = `Debt: ${split.debt}%`;

    if (totalEl) {
        totalEl.textContent = `Total: ${total}%`;
        totalEl.className = 'weight-total ' + (total === 100 ? 'weight-total--valid' : 'weight-total--invalid');
    }
}

function notifyChange() {
    if (onChangeCallback) {
        onChangeCallback(getAllocations());
    }
}

export function getAllocations() {
    return { ...selectedFunds };
}

export function getTotalWeight() {
    return Object.values(selectedFunds).reduce((a, b) => a + b, 0);
}
```

- [ ] **Step 2: Commit**

```bash
git add js/portfolio.js
git commit -m "feat: add portfolio builder with fund picker, presets, weight management"
```

---

## Task 7: Chart Rendering Module

**Files:**
- Create: `js/charts.js`

Wraps Chart.js for the projection chart and SWP comparison chart.

- [ ] **Step 1: Create js/charts.js**

```javascript
let projectionChart = null;
let comparisonChart = null;

const CHART_COLORS = {
    corpus: { line: 'rgba(74, 124, 255, 1)', fill: 'rgba(74, 124, 255, 0.15)' },
    withdrawal: { line: 'rgba(251, 146, 60, 1)', fill: 'rgba(251, 146, 60, 0.1)' },
    returns: { line: 'rgba(52, 211, 153, 1)', fill: 'rgba(52, 211, 153, 0.1)' },
    tax: { line: 'rgba(248, 113, 113, 0.7)', fill: 'rgba(248, 113, 113, 0.05)' },
};

const COMMON_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: {
            labels: {
                color: 'rgba(180, 190, 230, 0.7)',
                font: { family: "'Inter', sans-serif", size: 11 },
                usePointStyle: true,
                pointStyle: 'circle',
            },
        },
        tooltip: {
            backgroundColor: 'rgba(10, 10, 30, 0.95)',
            borderColor: 'rgba(80, 120, 255, 0.3)',
            borderWidth: 1,
            titleColor: '#e0e4ff',
            bodyColor: 'rgba(180, 190, 230, 0.9)',
            titleFont: { family: "'Orbitron', monospace", size: 11 },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
                label: function (ctx) {
                    const val = ctx.parsed.y;
                    let formatted;
                    if (val >= 10000000) formatted = (val / 10000000).toFixed(2) + ' Cr';
                    else if (val >= 100000) formatted = (val / 100000).toFixed(2) + ' L';
                    else formatted = new Intl.NumberFormat('en-IN').format(Math.round(val));
                    return `${ctx.dataset.label}: ₹${formatted}`;
                },
            },
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(60, 80, 140, 0.1)' },
            ticks: { color: 'rgba(140, 150, 200, 0.5)', font: { size: 11 } },
        },
        y: {
            grid: { color: 'rgba(60, 80, 140, 0.1)' },
            ticks: {
                color: 'rgba(140, 150, 200, 0.5)',
                font: { size: 11 },
                callback: function (val) {
                    if (val >= 10000000) return (val / 10000000).toFixed(1) + ' Cr';
                    if (val >= 100000) return (val / 100000).toFixed(0) + ' L';
                    return val;
                },
            },
        },
    },
    animation: {
        duration: 1200,
        easing: 'easeInOutQuart',
    },
};

export function renderProjectionChart(canvasId, projections) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (projectionChart) projectionChart.destroy();

    const labels = projections.map(p => `Yr ${p.year} (Age ${p.age})`);

    projectionChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Corpus',
                    data: projections.map(p => p.corpusEnd),
                    borderColor: CHART_COLORS.corpus.line,
                    backgroundColor: CHART_COLORS.corpus.fill,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                },
                {
                    label: 'Annual Withdrawal',
                    data: projections.map(p => p.annualExpense),
                    borderColor: CHART_COLORS.withdrawal.line,
                    backgroundColor: CHART_COLORS.withdrawal.fill,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            ...COMMON_OPTIONS,
            scales: {
                ...COMMON_OPTIONS.scales,
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        color: 'rgba(251, 146, 60, 0.5)',
                        font: { size: 11 },
                        callback: function (val) {
                            if (val >= 100000) return (val / 100000).toFixed(0) + ' L';
                            return val;
                        },
                    },
                },
            },
        },
    });
}

export function renderComparisonChart(canvasId, datasets) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (comparisonChart) comparisonChart.destroy();

    const colors = [
        { line: '#4a7cff', fill: 'rgba(74, 124, 255, 0.1)' },
        { line: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.1)' },
        { line: '#22d3ee', fill: 'rgba(34, 211, 238, 0.1)' },
        { line: '#34d399', fill: 'rgba(52, 211, 153, 0.1)' },
        { line: '#fb923c', fill: 'rgba(251, 146, 60, 0.1)' },
    ];

    const maxYears = Math.max(...datasets.map(d => d.data.length));
    const labels = Array.from({ length: maxYears }, (_, i) => `Year ${i + 1}`);

    const chartDatasets = datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data.map(d => d.corpus),
        borderColor: colors[i % colors.length].line,
        backgroundColor: colors[i % colors.length].fill,
        fill: false,
        tension: 0.3,
        pointRadius: 1,
        pointHoverRadius: 5,
        borderWidth: 2,
    }));

    comparisonChart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: chartDatasets },
        options: COMMON_OPTIONS,
    });
}

export function destroyCharts() {
    if (projectionChart) { projectionChart.destroy(); projectionChart = null; }
    if (comparisonChart) { comparisonChart.destroy(); comparisonChart = null; }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/charts.js
git commit -m "feat: add Chart.js wrapper for projection and comparison charts"
```

---

## Task 8: Full HTML Structure & Main App Wiring

**Files:**
- Modify: `index.html` (replace with full structure)
- Modify: `js/main.js` (replace with full app orchestration)

This is the integration task — wires everything together.

- [ ] **Step 1: Replace index.html with full structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retirement Calculator - Escape the Rat Race</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>">
</head>
<body>
    <canvas id="cosmos-bg"></canvas>

    <div id="app">
        <header class="header">
            <h1 class="header__title">Retirement Calculator</h1>
            <p class="header__subtitle">How much do you need to escape the rat race?</p>
        </header>

        <main>
            <!-- Section 1: Personal Inputs -->
            <section class="section animate-in">
                <div class="card">
                    <h2 class="card__title">Your Details</h2>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="current-age">Current Age</label>
                            <input type="number" id="current-age" value="30" min="18" max="80">
                        </div>
                        <div class="form-group">
                            <label for="retirement-age">Retirement Age</label>
                            <input type="number" id="retirement-age" value="45" min="25" max="80">
                        </div>
                        <div class="form-group">
                            <label for="plan-until-age">Plan Until Age</label>
                            <input type="number" id="plan-until-age" value="75" min="50" max="100">
                        </div>
                        <div class="form-group">
                            <label for="monthly-expense">Monthly Expense Today (₹)</label>
                            <input type="number" id="monthly-expense" value="50000" min="5000" step="1000">
                        </div>
                        <div class="form-group">
                            <label for="inflation-rate">Inflation Rate (%)</label>
                            <input type="number" id="inflation-rate" value="6" min="1" max="15" step="0.5">
                            <span class="input-hint">India avg: 5-7%</span>
                        </div>
                        <div class="form-group">
                            <label for="withdrawal-rate">SWP Withdrawal Rate (%)</label>
                            <input type="number" id="withdrawal-rate" value="4" min="1" max="12" step="0.5">
                            <span class="input-hint">Safe: 3-4%</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Section 2: Tax Mode Toggle -->
            <section class="section animate-in">
                <div class="card">
                    <h2 class="card__title">Tax Mode</h2>
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <div class="toggle-group">
                            <button class="toggle-group__btn toggle-group__btn--active" data-tax-mode="simple">Simple</button>
                            <button class="toggle-group__btn" data-tax-mode="advanced">Advanced</button>
                        </div>
                        <div id="simple-tax-input" class="form-group" style="max-width: 250px;">
                            <label for="post-tax-return">Expected Post-Tax Return (%)</label>
                            <input type="number" id="post-tax-return" value="8" min="1" max="20" step="0.5">
                            <span class="input-hint">Conservative: 8%, Moderate: 10%</span>
                        </div>
                        <div id="advanced-tax-input" style="display: none;">
                            <span class="input-hint">
                                Equity LTCG: 12.5% (above ₹1.25L exempt) &bull;
                                Debt: 30% slab rate &bull;
                                Return calculated from portfolio
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Section 3: Portfolio Builder -->
            <section class="section animate-in">
                <div class="card">
                    <h2 class="card__title">Build Your Portfolio</h2>
                    <div id="portfolio-container"></div>
                </div>
            </section>

            <!-- Section 4: Calculate Button -->
            <section class="section" style="text-align: center;">
                <button class="btn btn--primary" id="calculate-btn">
                    Calculate My Number
                </button>
            </section>

            <!-- Section 5: Results Dashboard (hidden initially) -->
            <div id="results-section" style="display: none;">

                <!-- Metric Cards -->
                <section class="section animate-in">
                    <div class="dashboard">
                        <div class="metric-card">
                            <div class="metric-card__label">Corpus Needed</div>
                            <div class="metric-card__value" id="metric-corpus">--</div>
                            <div class="metric-card__sub" id="metric-corpus-sub"></div>
                        </div>
                        <div class="metric-card metric-card--green">
                            <div class="metric-card__label">Monthly at Retirement</div>
                            <div class="metric-card__value" id="metric-monthly">--</div>
                            <div class="metric-card__sub" id="metric-monthly-sub"></div>
                        </div>
                        <div class="metric-card metric-card--purple">
                            <div class="metric-card__label">Total Withdrawn</div>
                            <div class="metric-card__value" id="metric-withdrawn">--</div>
                            <div class="metric-card__sub" id="metric-withdrawn-sub"></div>
                        </div>
                        <div class="metric-card metric-card--orange">
                            <div class="metric-card__label">Final Corpus</div>
                            <div class="metric-card__value" id="metric-final">--</div>
                            <div class="metric-card__sub" id="metric-status"></div>
                        </div>
                    </div>
                </section>

                <!-- Risk Assessment -->
                <section class="section animate-in">
                    <div class="card">
                        <h2 class="card__title">Risk Assessment</h2>
                        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Portfolio Risk Level</div>
                                <div class="risk-meter">
                                    <div class="risk-meter__bar">
                                        <div class="risk-meter__fill" id="risk-fill" style="width: 50%; background: var(--accent-orange);"></div>
                                    </div>
                                    <div class="risk-meter__label" id="risk-label">Moderate</div>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Equity / Debt Split</div>
                                <div class="risk-meter">
                                    <div class="risk-meter__bar">
                                        <div id="split-equity" style="height: 100%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple)); border-radius: 3px; transition: width 0.5s ease;"></div>
                                    </div>
                                    <div class="risk-meter__label" id="split-label">50:50</div>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.3rem;">Real Return (Post Inflation)</div>
                                <div class="metric-card__value" id="real-return-display" style="font-size: 1.1rem;">--</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Projection Chart -->
                <section class="section animate-in">
                    <div class="card">
                        <h2 class="card__title">Corpus Projection</h2>
                        <div class="chart-container">
                            <canvas id="projection-chart"></canvas>
                        </div>
                    </div>
                </section>

                <!-- SWP Rate Comparison -->
                <section class="section animate-in">
                    <div class="card">
                        <h2 class="card__title">Withdrawal Rate Comparison</h2>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
                            What happens if you withdraw at different rates? Same corpus, different outcomes.
                        </p>
                        <div class="chart-container">
                            <canvas id="comparison-chart"></canvas>
                        </div>
                    </div>
                </section>

                <!-- Year-by-Year Table -->
                <section class="section animate-in">
                    <div class="card">
                        <h2 class="card__title">Year-by-Year Breakdown</h2>
                        <div style="overflow-x: auto;">
                            <table class="data-table" id="projection-table">
                                <thead>
                                    <tr>
                                        <th>Year</th>
                                        <th>Age</th>
                                        <th>Annual Expense</th>
                                        <th>Monthly</th>
                                        <th>Corpus Start</th>
                                        <th>Returns</th>
                                        <th>Corpus End</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </main>

        <footer class="footer">
            <p class="disclaimer">
                For educational purposes only. This is not financial advice.
                Past returns do not guarantee future performance.
                Consult a SEBI-registered financial advisor before making investment decisions.
            </p>
        </footer>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace js/main.js with full orchestration**

```javascript
import { initCosmos } from './cosmos.js';
import { FUNDS, TAX_RULES } from './data.js';
import { runProjection, runSWPComparison, calcBlendedReturn, calcEquityDebtSplit, formatINR } from './calculator.js';
import { initPortfolio, getAllocations, getTotalWeight } from './portfolio.js';
import { renderProjectionChart, renderComparisonChart } from './charts.js';

initCosmos('cosmos-bg');

let currentTaxMode = 'simple';

document.addEventListener('DOMContentLoaded', () => {
    initPortfolio('portfolio-container', onPortfolioChange);
    setupTaxToggle();
    setupCalculateButton();
});

function onPortfolioChange(allocations) {
    // Portfolio changed — results will update on next calculate click
}

function setupTaxToggle() {
    document.querySelectorAll('[data-tax-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTaxMode = btn.dataset.taxMode;
            document.querySelectorAll('[data-tax-mode]').forEach(b => b.classList.remove('toggle-group__btn--active'));
            btn.classList.add('toggle-group__btn--active');

            document.getElementById('simple-tax-input').style.display = currentTaxMode === 'simple' ? '' : 'none';
            document.getElementById('advanced-tax-input').style.display = currentTaxMode === 'advanced' ? '' : 'none';
        });
    });
}

function setupCalculateButton() {
    document.getElementById('calculate-btn').addEventListener('click', calculate);
}

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
    if (inputs.retirementAge <= inputs.currentAge) errors.push('Retirement age must be greater than current age.');
    if (inputs.planUntilAge <= inputs.retirementAge) errors.push('Plan-until age must be greater than retirement age.');
    if (inputs.monthlyExpense <= 0) errors.push('Monthly expense must be positive.');
    if (getTotalWeight() !== 100) errors.push('Portfolio weights must add up to 100%.');
    return errors;
}

function calculate() {
    const inputs = getInputs();
    const errors = validate(inputs);

    if (errors.length > 0) {
        alert(errors.join('\n'));
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

    document.getElementById('results-section').style.display = '';
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
        statusEl.innerHTML = `<span class="status-badge status-badge--survived">✓ Survives</span>`;
    } else {
        statusEl.innerHTML = `<span class="status-badge status-badge--depleted">✗ Depleted in year ${s.survivalYears}</span>`;
    }

    const riskFill = document.getElementById('risk-fill');
    const riskLabel = document.getElementById('risk-label');
    let riskPct, riskText, riskColor;
    if (split.equity <= 30) { riskPct = 25; riskText = 'Conservative'; riskColor = 'var(--accent-green)'; }
    else if (split.equity <= 50) { riskPct = 45; riskText = 'Moderate'; riskColor = 'var(--accent-cyan)'; }
    else if (split.equity <= 70) { riskPct = 65; riskText = 'Growth'; riskColor = 'var(--accent-orange)'; }
    else { riskPct = 85; riskText = 'Aggressive'; riskColor = 'var(--accent-red)'; }
    riskFill.style.width = `${riskPct}%`;
    riskFill.style.background = riskColor;
    riskLabel.textContent = riskText;
    riskLabel.style.color = riskColor;

    document.getElementById('split-equity').style.width = `${split.equity}%`;
    document.getElementById('split-label').textContent = `${split.equity}:${split.debt}`;

    const realReturn = expectedReturn - inputs.inflationRate;
    const rrDisplay = document.getElementById('real-return-display');
    rrDisplay.textContent = `${(realReturn * 100).toFixed(1)}%`;
    rrDisplay.style.color = realReturn > 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    const tbody = document.querySelector('#projection-table tbody');
    tbody.innerHTML = result.projections.map(p => `
        <tr>
            <td style="text-align: left">${p.year}</td>
            <td style="text-align: left">${p.age}</td>
            <td>₹${formatINR(p.annualExpense)}</td>
            <td>₹${formatINR(p.monthlyExpense)}</td>
            <td>₹${formatINR(p.corpusStart)}</td>
            <td>₹${formatINR(p.returns)}</td>
            <td style="color: ${p.corpusEnd > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">₹${formatINR(p.corpusEnd)}</td>
        </tr>
    `).join('');
}
```

- [ ] **Step 3: Test in browser**

Open via Docker or direct file serving. Fill in the form:
- Current Age: 30, Retirement Age: 35, Plan Until: 70
- Monthly Expense: 50,000, Inflation: 6%, Withdrawal: 4%
- Post-Tax Return: 8% (simple mode)
- Select "Balanced" preset portfolio

Click "Calculate My Number". Verify:
- Corpus needed shows ~₹2.01 Cr (matching Excel's ~₹2 Cr)
- Monthly at retirement shows ~₹66,911
- Charts render with smooth animations
- Table shows year-by-year data
- Comparison chart shows 3%, 4%, 6%, 8% withdrawal lines
- Status badge shows "Survives" or "Depleted" appropriately

- [ ] **Step 4: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: integrate all modules — full calculator with dashboard, charts, and table"
```

---

## Task 9: Polish, Edge Cases & Docker Final Build

**Files:**
- Modify: `Dockerfile`
- Modify: `js/main.js` (add input validation UX)
- Modify: `css/style.css` (add number animation keyframes)

- [ ] **Step 1: Add input validation visual feedback to main.js**

Add this function to `js/main.js` before the `calculate` function:

```javascript
function showValidationError(inputId, message) {
    const input = document.getElementById(inputId);
    input.style.borderColor = 'var(--accent-red)';
    input.style.boxShadow = '0 0 0 3px rgba(248, 113, 113, 0.15)';
    setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }, 3000);
}
```

Update the `validate` function to highlight inputs:

Replace the `calculate` function's error handling block (`if (errors.length > 0)`) with:
```javascript
    if (errors.length > 0) {
        if (inputs.retirementAge <= inputs.currentAge) showValidationError('retirement-age');
        if (inputs.planUntilAge <= inputs.retirementAge) showValidationError('plan-until-age');
        if (inputs.monthlyExpense <= 0) showValidationError('monthly-expense');
        alert(errors.join('\n'));
        return;
    }
```

- [ ] **Step 2: Add number counting animation CSS**

Append to `css/style.css`:
```css
@keyframes countUp {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
}

.metric-card__value {
    animation: countUp 0.6s ease-out;
}

.results-visible .animate-in {
    animation: fadeInUp 0.6s ease-out forwards;
}
```

- [ ] **Step 3: Update Dockerfile for final build**

Replace `Dockerfile` contents:

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Full Docker test**

```bash
docker compose up --build -d
```

Open http://localhost:8080 and test:
1. Default values → Calculate → verify all dashboard panels render
2. Change withdrawal to 8% → Calculate → verify "Depleted" status
3. Select "Aggressive" preset → verify weights update and total stays 100%
4. Switch to Advanced tax mode → verify tax inputs change
5. Try invalid inputs (retirement age < current age) → verify error highlighting
6. Check mobile responsiveness (resize browser to ~400px width)

```bash
docker compose down
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile css/style.css js/main.js
git commit -m "feat: add validation UX, counting animation, Docker healthcheck, final polish"
```

---

## Task 10: README and Final Verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# Retirement Calculator

Calculate your retirement corpus and SWP (Systematic Withdrawal Plan) for Indian markets.

## Quick Start

```bash
docker compose up --build -d
```

Open http://localhost:8080

## Features

- Calculate retirement corpus based on age, expenses, inflation, and withdrawal rate
- Build custom portfolios from 14 Indian funds and indexes
- Compare different withdrawal rates (3%, 4%, 6%, 8%)
- Year-by-year projection table
- Simple and advanced tax calculation modes
- Space-themed animated dashboard

## Tech Stack

- HTML, CSS, vanilla JavaScript
- Chart.js for visualizations
- Docker + nginx for deployment

## Disclaimer

For educational purposes only. Not financial advice. Consult a SEBI-registered advisor.
```

- [ ] **Step 2: Final Docker build and smoke test**

```bash
docker compose up --build -d
```

Walk through the full user flow one more time. Verify no console errors.

```bash
docker compose down
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```
