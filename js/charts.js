// charts.js — Chart.js wrapper for projection and comparison charts
// Chart.js 4.4.7 is loaded via CDN; `Chart` is available as a global.

let projectionChart = null;
let comparisonChart = null;

const CHART_COLORS = {
    corpus:     { line: 'rgba(74, 124, 255, 1)',    fill: 'rgba(74, 124, 255, 0.15)' },
    withdrawal: { line: 'rgba(251, 146, 60, 1)',     fill: 'rgba(251, 146, 60, 0.1)'  },
    returns:    { line: 'rgba(52, 211, 153, 1)',     fill: 'rgba(52, 211, 153, 0.1)'  },
    tax:        { line: 'rgba(248, 113, 113, 0.7)',  fill: 'rgba(248, 113, 113, 0.05)'},
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a rupee value for tooltips: Cr / L / raw.
 */
function formatINR(value) {
    if (value === null || value === undefined || isNaN(value)) return '₹0';
    const abs = Math.abs(value);
    if (abs >= 1e7) {
        return `₹${(value / 1e7).toFixed(2)} Cr`;
    }
    if (abs >= 1e5) {
        return `₹${(value / 1e5).toFixed(2)} L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Format Y-axis tick values as Cr / L shorthand.
 */
function formatAxisTick(value) {
    const abs = Math.abs(value);
    if (abs >= 1e7) return `${(value / 1e7).toFixed(1)} Cr`;
    if (abs >= 1e5) return `${(value / 1e5).toFixed(1)} L`;
    return value.toLocaleString('en-IN');
}

// ---------------------------------------------------------------------------
// Helper: Resolve CSS variable color for canvas text
// ---------------------------------------------------------------------------

function getCSSVar(varName, fallback) {
    if (typeof window === 'undefined') return fallback;
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
}

// ---------------------------------------------------------------------------
// Helper: Draw vertical dotted line and text for milestones
// ---------------------------------------------------------------------------

const milestonesPlugin = {
    id: 'milestonesPlugin',
    afterDatasetsDraw(chart, args, options) {
        const { ctx, chartArea: { top, bottom } } = chart;
        const currentMilestones = options.milestones || [];
        const retirementAge = options.retirementAge || 45;

        currentMilestones.forEach(m => {
            const yearStr1 = `Yr ${m.age - retirementAge + 1} (Age ${m.age})`;
            const yearStr2 = `Year ${m.age - retirementAge + 1}`;
            
            let index = chart.data.labels.indexOf(yearStr1);
            if (index === -1) {
                index = chart.data.labels.indexOf(yearStr2);
            }
            if (index === -1) return;

            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data[index]) return;
            const xPos = meta.data[index].x;

            ctx.save();
            // Draw dotted line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.stroke();

            // Draw small glowing indicator circle
            ctx.beginPath();
            ctx.arc(xPos, top + 15, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(34, 211, 238, 1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(10, 10, 30, 0.95)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Draw text tag near indicator
            ctx.fillStyle = '#22d3ee';
            ctx.font = '500 8px Orbitron, monospace';
            ctx.fillText(m.name.toUpperCase(), xPos + 10, top + 18);

            ctx.restore();
        });
    }
};

// ---------------------------------------------------------------------------
// Shared Chart.js base options
// ---------------------------------------------------------------------------

function buildBaseOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                labels: {
                    color: getCSSVar('--text-secondary', 'rgba(195, 210, 255, 0.85)'),
                    font: {
                        family: 'Inter, sans-serif',
                        size: 11,
                    },
                    pointStyle: 'circle',
                    usePointStyle: true,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(10, 10, 30, 0.95)',
                borderColor: 'rgba(74, 124, 255, 0.6)',
                borderWidth: 1,
                titleFont: {
                    family: 'Orbitron, monospace',
                    size: 12,
                },
                bodyFont: {
                    family: 'Inter, sans-serif',
                    size: 12,
                },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label(context) {
                        const label = context.dataset.label ?? '';
                        const value = context.parsed.y;
                        if ((label.includes('Withdrawal') || label.includes('SWP')) && !label.includes('Annual')) {
                            return `${label} (Corpus Left): ${formatINR(value)}`;
                        }
                        return `${label}: ${formatINR(value)}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(60, 80, 140, 0.1)',
                },
                ticks: {
                    color: 'rgba(150, 165, 210, 0.7)',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 11,
                    },
                    maxTicksLimit: window.innerWidth < 600 ? 6 : 15,
                },
            },
            y: {
                grid: {
                    color: 'rgba(60, 80, 140, 0.1)',
                },
                ticks: {
                    color: 'rgba(150, 165, 210, 0.7)',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 11,
                    },
                    callback(value) {
                        return formatAxisTick(value);
                    },
                },
            },
        },
        animation: {
            duration: 1200,
            easing: 'easeInOutQuart',
        },
    };
}

// ---------------------------------------------------------------------------
// Export: renderProjectionChart
// ---------------------------------------------------------------------------

/**
 * Render the main retirement projection chart.
 *
 * @param {string} canvasId  - ID of the <canvas> element
 * @param {Array}  projections - Array of yearly projection rows:
 *   { year, age, annualExpense, monthlyExpense, corpusStart, returns, taxPaid, corpusEnd }
 */
export function renderProjectionChart(canvasId, projections, milestones = [], currentAge = 30, retirementAge = 45) {
    if (projectionChart) {
        projectionChart.destroy();
        projectionChart = null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = projections.map(p => `Yr ${p.year} (Age ${p.age})`);
    const corpusData = projections.map(p => p.corpusEnd);
    const withdrawalData = projections.map(p => p.annualExpense);

    const options = buildBaseOptions();

    // Configure milestones plugin options
    options.plugins.milestonesPlugin = {
        milestones,
        retirementAge,
    };

    // Add the secondary (right) y-axis for withdrawals
    options.scales.y1 = {
        position: 'right',
        grid: {
            drawOnChartArea: false,
        },
        ticks: {
            color: 'rgba(251, 146, 60, 0.8)',
            font: {
                family: 'Inter, sans-serif',
                size: 11,
            },
            callback(value) {
                const abs = Math.abs(value);
                if (abs >= 1e5) return `${(value / 1e5).toFixed(1)} L`;
                return value.toLocaleString('en-IN');
            },
        },
    };

    projectionChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Corpus',
                    data: corpusData,
                    borderColor: CHART_COLORS.corpus.line,
                    backgroundColor: CHART_COLORS.corpus.fill,
                    tension: 0.3,
                    pointRadius: 2,
                    hoverRadius: 6,
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y',
                },
                {
                    label: 'Annual Withdrawal',
                    data: withdrawalData,
                    borderColor: CHART_COLORS.withdrawal.line,
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 2,
                    hoverRadius: 6,
                    borderWidth: 2,
                    fill: false,
                    yAxisID: 'y1',
                },
            ],
        },
        options,
        plugins: [milestonesPlugin],
    });
}

// ---------------------------------------------------------------------------
// Export: renderComparisonChart
// ---------------------------------------------------------------------------

const COMPARISON_COLORS = [
    { line: 'rgba(74, 124, 255, 1)',   fill: 'rgba(74, 124, 255, 0.1)'  }, // blue
    { line: 'rgba(167, 139, 250, 1)',  fill: 'rgba(167, 139, 250, 0.1)' }, // purple
    { line: 'rgba(34, 211, 238, 1)',   fill: 'rgba(34, 211, 238, 0.1)'  }, // cyan
    { line: 'rgba(52, 211, 153, 1)',   fill: 'rgba(52, 211, 153, 0.1)'  }, // green
    { line: 'rgba(251, 146, 60, 1)',   fill: 'rgba(251, 146, 60, 0.1)'  }, // orange
];

/**
 * Render the scenario comparison chart.
 *
 * @param {string} canvasId  - ID of the <canvas> element
 * @param {Array}  datasets  - Array of scenario objects:
 *   { label: string, data: [{ corpus, withdrawal, totalWithdrawn, depleted }, ...] }
 */
export function renderComparisonChart(canvasId, datasets, milestones = [], currentAge = 30, retirementAge = 45) {
    if (comparisonChart) {
        comparisonChart.destroy();
        comparisonChart = null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Determine the maximum number of years across all datasets
    const maxYears = datasets.reduce((max, ds) => Math.max(max, ds.data.length), 0);
    const labels = Array.from({ length: maxYears }, (_, i) => `Year ${i + 1}`);

    const chartDatasets = datasets.map((ds, idx) => {
        const color = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
        return {
            label: ds.label,
            data: ds.data.map(row => row.corpus),
            borderColor: color.line,
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 1,
            hoverRadius: 5,
            borderWidth: 2,
            fill: false,
        };
    });

    const options = buildBaseOptions();

    // Configure milestones plugin options
    options.plugins.milestonesPlugin = {
        milestones,
        retirementAge,
    };

    comparisonChart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: chartDatasets },
        options,
        plugins: [milestonesPlugin],
    });
}

// ---------------------------------------------------------------------------
// Export: destroyCharts
// ---------------------------------------------------------------------------

/**
 * Destroy both chart instances and reset to null.
 */
export function destroyCharts() {
    if (projectionChart) {
        projectionChart.destroy();
        projectionChart = null;
    }
    if (comparisonChart) {
        comparisonChart.destroy();
        comparisonChart = null;
    }
}
