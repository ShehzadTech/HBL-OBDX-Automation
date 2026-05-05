/**
 * generate-custom-report.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds a rich dashboard-style HTML report with Title 'Playwright Test Stats'.
 *
 *   1. Reads the Playwright JSON reporter output (playwright-report/results.json)
 *      to extract pass/fail/skip counts, durations, and failure details.
 *   2. Appends the run summary to reports/history.json (rolling window: last
 *      MAX_HISTORY runs).
 *   3. Emits reports/custom-report.html — a self-contained dashboard with:
 *        • Summary cards (total / passed / failed / skipped / duration / pass-rate)
 *        • Δ-vs-previous-run cards
 *        • Pie chart   — current run pass/fail/skip distribution
 *        • Bar chart   — current vs previous run
 *        • Line chart  — trend across the last MAX_HISTORY runs
 *        • Historical runs table
 *        • Failure table with error excerpts + links to screenshots/traces
 *
 * The HTML loads Chart.js from a CDN so the file stays lightweight (no
 * bundling, no node_modules dependency at view-time).
 *
 * Usage:
 *   1. Run the suite to produce JSON output (the project's playwright.config.ts
 *      already adds the JSON reporter):
 *        npm test
 *   2. Generate the dashboard:
 *        npm run report:custom
 *   3. Open reports/custom-report.html in any browser.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT          = __dirname;
const RESULTS_JSON  = path.join(ROOT, 'playwright-report', 'results.json');
const REPORTS_DIR   = path.join(ROOT, 'reports');
const HISTORY_FILE  = path.join(REPORTS_DIR, 'history.json');
const OUTPUT_HTML   = path.join(REPORTS_DIR, 'custom-report.html');
const MAX_HISTORY   = 20;

function run() {
// ────────────────────────────────────────────────────────────────────────────
// 1. Load & parse Playwright JSON results
// ────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(RESULTS_JSON)) {
  console.error(`[report] results.json not found at ${RESULTS_JSON}`);
  console.error('[report] Run "npm test" first to produce JSON reporter output.');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf8'));

/** Walk the nested suite tree and collect every spec's final test result. */
function collectSpecs(suites, outSpecs, ancestry) {
  for (const suite of suites || []) {
    const newAncestry = ancestry ? `${ancestry} › ${suite.title}` : suite.title;
    for (const spec of suite.specs || []) {
      // A spec usually has one "test" entry per project; take the last result
      // of each (Playwright pushes a result per attempt — final attempt wins).
      const test = (spec.tests && spec.tests[0]) || null;
      const lastResult = test && test.results && test.results.length
        ? test.results[test.results.length - 1]
        : null;

      outSpecs.push({
        title:     spec.title,
        fullTitle: `${newAncestry} › ${spec.title}`,
        file:      spec.file || (suite.file || ''),
        line:      spec.line || 0,
        status:    lastResult ? lastResult.status : 'unknown',
        duration:  lastResult ? (lastResult.duration || 0) : 0,
        error:     lastResult && lastResult.error ? lastResult.error : null,
        attachments: lastResult && lastResult.attachments ? lastResult.attachments : [],
      });
    }
    if (suite.suites && suite.suites.length) {
      collectSpecs(suite.suites, outSpecs, newAncestry);
    }
  }
}

const specs = [];
collectSpecs(raw.suites || [], specs, '');

// Normalize status — Playwright uses passed | failed | timedOut | skipped | interrupted
function bucket(status) {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed'; // failed, timedOut, interrupted, unknown
}

let passed = 0, failed = 0, skipped = 0, totalDuration = 0;
for (const s of specs) {
  const b = bucket(s.status);
  if (b === 'passed') passed++;
  else if (b === 'skipped') skipped++;
  else failed++;
  totalDuration += s.duration || 0;
}

const total    = specs.length;
const passRate = total > 0 ? (passed / total) * 100 : 0;
const startTime = (raw.stats && raw.stats.startTime) || new Date().toISOString();

const summary = {
  timestamp: startTime,
  total,
  passed,
  failed,
  skipped,
  duration: totalDuration,
  passRate: Number(passRate.toFixed(2)),
};

// ────────────────────────────────────────────────────────────────────────────
// 2. Append to rolling history
// ────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

let history = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }
}

const previous = history.length ? history[history.length - 1] : null;

history.push(summary);
if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// 3. Build deltas & failure list
// ────────────────────────────────────────────────────────────────────────────

function delta(curr, prev) {
  if (prev === null || prev === undefined) return null;
  return Number((curr - prev).toFixed(2));
}

const deltas = previous ? {
  total:    delta(summary.total,    previous.total),
  passed:   delta(summary.passed,   previous.passed),
  failed:   delta(summary.failed,   previous.failed),
  skipped:  delta(summary.skipped,  previous.skipped),
  duration: delta(summary.duration, previous.duration),
  passRate: delta(summary.passRate, previous.passRate),
} : null;

const failures = specs
  .filter(s => bucket(s.status) === 'failed')
  .map(s => {
    const errMsg = s.error
      ? (s.error.message || s.error.value || JSON.stringify(s.error))
      : '';
    // Resolve attachment paths relative to reports/custom-report.html
    const links = (s.attachments || [])
      .filter(a => a.path)
      .map(a => ({
        name: a.name || path.basename(a.path),
        contentType: a.contentType || '',
        href: path.relative(REPORTS_DIR, a.path).replace(/\\/g, '/'),
      }));
    return {
      title:    s.fullTitle,
      file:     s.file,
      line:     s.line,
      status:   s.status,
      duration: s.duration,
      error:    excerpt(stripAnsi(errMsg), 600),
      links,
    };
  });

function stripAnsi(s) {
  return String(s || '').replace(/\[[0-9;]*m/g, '');
}
function excerpt(s, n) {
  s = String(s || '').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}
function fmtDuration(ms) {
  if (!ms || ms < 1000) return `${ms || 0} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m ${r}s`;
}
function fmtTimestamp(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

// ────────────────────────────────────────────────────────────────────────────
// 4. Render HTML
// ────────────────────────────────────────────────────────────────────────────

const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function deltaCell(value, opts = {}) {
  if (value === null || value === undefined) {
    return `<span class="delta delta-zero">—</span>`;
  }
  const goodIsLower = !!opts.goodIsLower;
  const sign = value > 0 ? '+' : '';
  let cls = 'delta-zero';
  if (value > 0) cls = goodIsLower ? 'delta-bad'  : 'delta-good';
  if (value < 0) cls = goodIsLower ? 'delta-good' : 'delta-bad';
  if (value === 0) cls = 'delta-zero';
  const display = opts.format ? opts.format(value) : `${sign}${value}`;
  return `<span class="delta ${cls}">${display}</span>`;
}

const summaryCards = `
  <div class="card"><div class="card-label">Total</div><div class="card-value">${summary.total}</div></div>
  <div class="card pass"><div class="card-label">Passed</div><div class="card-value">${summary.passed}</div></div>
  <div class="card fail"><div class="card-label">Failed</div><div class="card-value">${summary.failed}</div></div>
  <div class="card skip"><div class="card-label">Skipped</div><div class="card-value">${summary.skipped}</div></div>
  <div class="card"><div class="card-label">Duration</div><div class="card-value">${fmtDuration(summary.duration)}</div></div>
  <div class="card"><div class="card-label">Pass Rate</div><div class="card-value">${summary.passRate.toFixed(2)}%</div></div>
`;

const deltaCards = deltas ? `
  <div class="card delta-card"><div class="card-label">Δ Total</div><div class="card-value">${deltaCell(deltas.total)}</div></div>
  <div class="card delta-card"><div class="card-label">Δ Passed</div><div class="card-value">${deltaCell(deltas.passed)}</div></div>
  <div class="card delta-card"><div class="card-label">Δ Failed</div><div class="card-value">${deltaCell(deltas.failed, { goodIsLower: true })}</div></div>
  <div class="card delta-card"><div class="card-label">Δ Skipped</div><div class="card-value">${deltaCell(deltas.skipped, { goodIsLower: true })}</div></div>
  <div class="card delta-card"><div class="card-label">Δ Duration</div><div class="card-value">${deltaCell(deltas.duration, { goodIsLower: true, format: v => `${v > 0 ? '+' : ''}${fmtDuration(Math.abs(v))}${v < 0 ? ' faster' : v > 0 ? ' slower' : ''}` })}</div></div>
  <div class="card delta-card"><div class="card-label">Δ Pass Rate</div><div class="card-value">${deltaCell(deltas.passRate, { format: v => `${v > 0 ? '+' : ''}${v.toFixed(2)} pp` })}</div></div>
` : `<div class="card delta-card placeholder">No previous run yet — deltas will appear next time.</div>`;

const historyRows = history.slice().reverse().map((h, idx) => `
  <tr${idx === 0 ? ' class="current"' : ''}>
    <td>${escapeHtml(fmtTimestamp(h.timestamp))}</td>
    <td>${h.total}</td>
    <td class="pass-cell">${h.passed}</td>
    <td class="fail-cell">${h.failed}</td>
    <td class="skip-cell">${h.skipped}</td>
    <td>${fmtDuration(h.duration)}</td>
    <td>${h.passRate.toFixed(2)}%</td>
  </tr>
`).join('');

const failureRows = failures.length ? failures.map(f => `
  <tr>
    <td class="title-cell">
      <div class="title">${escapeHtml(f.title)}</div>
      <div class="meta">${escapeHtml(f.file)}${f.line ? `:${f.line}` : ''} · ${escapeHtml(f.status)} · ${fmtDuration(f.duration)}</div>
    </td>
    <td><pre class="err">${escapeHtml(f.error || '(no error message)')}</pre></td>
    <td>
      ${f.links.length
        ? f.links.map(l => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.name)}</a>`).join('<br>')
        : '<span class="muted">—</span>'}
    </td>
  </tr>
`).join('') : `<tr><td colspan="3" class="muted center">No failures in this run 🎉</td></tr>`;

const chartData = {
  pie: {
    labels: ['Passed', 'Failed', 'Skipped'],
    values: [summary.passed, summary.failed, summary.skipped],
  },
  bar: {
    labels: ['Passed', 'Failed', 'Skipped'],
    current:  [summary.passed, summary.failed, summary.skipped],
    previous: previous ? [previous.passed, previous.failed, previous.skipped] : [0, 0, 0],
  },
  trend: {
    labels:   history.map(h => fmtTimestamp(h.timestamp)),
    passed:   history.map(h => h.passed),
    failed:   history.map(h => h.failed),
    skipped:  history.map(h => h.skipped),
    passRate: history.map(h => h.passRate),
  },
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Playwright Test Stats</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root {
    --bg: #0f172a;
    --panel: #1e293b;
    --panel-2: #273449;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --border: #334155;
    --pass: #22c55e;
    --fail: #ef4444;
    --skip: #f59e0b;
    --accent: #38bdf8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }
  header {
    padding: 24px 32px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 12px;
  }
  header h1 { margin: 0; font-size: 22px; letter-spacing: 0.3px; }
  header .meta { color: var(--muted); font-size: 13px; }
  main { padding: 24px 32px 64px; max-width: 1400px; margin: 0 auto; }
  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--muted);
    margin: 32px 0 12px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 18px;
  }
  .card-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; }
  .card-value { margin-top: 6px; font-size: 26px; font-weight: 600; }
  .card.pass { border-left: 4px solid var(--pass); }
  .card.fail { border-left: 4px solid var(--fail); }
  .card.skip { border-left: 4px solid var(--skip); }
  .card.delta-card .card-value { font-size: 18px; }
  .card.placeholder {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--muted);
    font-style: italic;
  }
  .delta { font-weight: 600; }
  .delta-good  { color: var(--pass); }
  .delta-bad   { color: var(--fail); }
  .delta-zero  { color: var(--muted); }

  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }
  .chart-panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }
  .chart-panel h3 {
    margin: 0 0 8px; font-size: 13px; color: var(--muted);
    text-transform: uppercase; letter-spacing: 1px;
  }
  .chart-panel canvas { width: 100% !important; height: 280px !important; }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  th, td {
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    vertical-align: top;
  }
  th { background: var(--panel-2); color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; font-size: 11px; }
  tr.current td { background: rgba(56, 189, 248, 0.08); }
  td.pass-cell { color: var(--pass); }
  td.fail-cell { color: var(--fail); }
  td.skip-cell { color: var(--skip); }
  .title-cell .title { font-weight: 600; }
  .title-cell .meta  { color: var(--muted); font-size: 11px; margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre.err {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    color: #fda4af;
    background: rgba(239, 68, 68, 0.08);
    padding: 8px 10px;
    border-radius: 6px;
    max-height: 260px;
    overflow: auto;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .muted { color: var(--muted); }
  .center { text-align: center; }
</style>
</head>
<body>
<header>
  <h1>Playwright Test Stats</h1>
  <div class="meta">Run started: ${escapeHtml(fmtTimestamp(summary.timestamp))} · ${summary.total} tests · ${fmtDuration(summary.duration)}</div>
</header>

<main>
  <h2>Summary</h2>
  <div class="grid">${summaryCards}</div>

  <h2>Δ vs Previous Run</h2>
  <div class="grid">${deltaCards}</div>

  <h2>Charts</h2>
  <div class="charts">
    <div class="chart-panel"><h3>Current Run Distribution</h3><canvas id="pie"></canvas></div>
    <div class="chart-panel"><h3>Current vs Previous Run</h3><canvas id="bar"></canvas></div>
    <div class="chart-panel" style="grid-column: 1 / -1;"><h3>Trend (last ${MAX_HISTORY} runs)</h3><canvas id="line"></canvas></div>
  </div>

  <h2>Historical Runs</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Duration</th><th>Pass Rate</th></tr></thead>
    <tbody>${historyRows}</tbody>
  </table>

  <h2>Failures</h2>
  <table>
    <thead><tr><th style="width: 28%;">Test</th><th>Error</th><th style="width: 18%;">Artifacts</th></tr></thead>
    <tbody>${failureRows}</tbody>
  </table>
</main>

<script>
  const DATA = ${JSON.stringify(chartData)};
  const COLORS = { pass: '#22c55e', fail: '#ef4444', skip: '#f59e0b', accent: '#38bdf8', muted: '#64748b' };
  Chart.defaults.color = '#cbd5e1';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.15)';

  // Pie / doughnut — current run distribution
  new Chart(document.getElementById('pie'), {
    type: 'doughnut',
    data: {
      labels: DATA.pie.labels,
      datasets: [{
        data: DATA.pie.values,
        backgroundColor: [COLORS.pass, COLORS.fail, COLORS.skip],
        borderColor: '#0f172a',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      cutout: '60%',
    },
  });

  // Bar — current vs previous run
  new Chart(document.getElementById('bar'), {
    type: 'bar',
    data: {
      labels: DATA.bar.labels,
      datasets: [
        { label: 'Previous', data: DATA.bar.previous, backgroundColor: 'rgba(148, 163, 184, 0.5)' },
        { label: 'Current',  data: DATA.bar.current,  backgroundColor: [COLORS.pass, COLORS.fail, COLORS.skip] },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });

  // Line — trend
  new Chart(document.getElementById('line'), {
    type: 'line',
    data: {
      labels: DATA.trend.labels,
      datasets: [
        { label: 'Passed',  data: DATA.trend.passed,  borderColor: COLORS.pass, backgroundColor: 'rgba(34, 197, 94, 0.15)',  tension: 0.3, fill: false },
        { label: 'Failed',  data: DATA.trend.failed,  borderColor: COLORS.fail, backgroundColor: 'rgba(239, 68, 68, 0.15)',  tension: 0.3, fill: false },
        { label: 'Skipped', data: DATA.trend.skipped, borderColor: COLORS.skip, backgroundColor: 'rgba(245, 158, 11, 0.15)', tension: 0.3, fill: false },
        { label: 'Pass Rate %', data: DATA.trend.passRate, borderColor: COLORS.accent, backgroundColor: 'rgba(56, 189, 248, 0.15)', tension: 0.3, yAxisID: 'y1', fill: false },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        y:  { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Tests' } },
        y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Pass Rate %' } },
      },
    },
  });
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// 5. Console summary
// ────────────────────────────────────────────────────────────────────────────

console.log('[report] Playwright Test Stats');
console.log(`[report]   total:    ${summary.total}`);
console.log(`[report]   passed:   ${summary.passed}`);
console.log(`[report]   failed:   ${summary.failed}`);
console.log(`[report]   skipped:  ${summary.skipped}`);
console.log(`[report]   duration: ${fmtDuration(summary.duration)}`);
console.log(`[report]   passRate: ${summary.passRate.toFixed(2)}%`);
console.log(`[report] history:    ${HISTORY_FILE} (${history.length}/${MAX_HISTORY} runs)`);
console.log(`[report] dashboard:  ${OUTPUT_HTML}`);
}

module.exports = { run };

if (require.main === module) {
  run();
}
