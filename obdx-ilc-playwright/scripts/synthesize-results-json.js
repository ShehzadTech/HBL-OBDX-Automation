/**
 * synthesize-results-json.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses a Playwright `list` reporter log (`test-run-*.log`) and writes a
 * `playwright-report/results.json` shaped like the JSON reporter's output, so
 * that `generate-custom-report.js` can run against it.
 *
 * Why: when the suite is invoked with `--reporter=list`, the CLI override
 * REPLACES (not extends) the multi-reporter config in playwright.config.ts.
 * That leaves `playwright-report/results.json` stale — the dashboard then
 * shows old or empty stats. This script rebuilds the minimal JSON from the
 * captured log so we don't need to re-run the suite to regenerate the report.
 *
 * Usage:
 *   node scripts/synthesize-results-json.js test-run-outward-bg.log
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const logPath = process.argv[2];
if (!logPath) {
  console.error('Usage: node scripts/synthesize-results-json.js <path-to-test-run.log>');
  process.exit(1);
}

const ROOT      = path.resolve(__dirname, '..');
const RESULTS   = path.join(ROOT, 'playwright-report', 'results.json');
const logFull   = path.isAbsolute(logPath) ? logPath : path.join(ROOT, logPath);

if (!fs.existsSync(logFull)) {
  console.error(`Log not found: ${logFull}`);
  process.exit(1);
}

const raw = fs.readFileSync(logFull, 'utf8');
const lines = raw.split(/\r?\n/);

// Each spec line follows the Playwright list reporter format:
//   "  ok  N [chromium] › path › Suite › Spec (12.3s)"
//   "  x   N [chromium] › path › Suite › Spec (12.3s)"        (failed)
//   "  x   N [chromium] › path › Suite › Spec (retry #1) (12.3s)"
//   "  -   N [chromium] › path › Suite › Spec"                (skipped/did-not-run)
//
// We keep the LAST entry per spec identity so retries collapse to the final attempt.
const SPEC_RE = /^\s+(ok|x|-)\s+\d+\s+\[(?<project>[^\]]+)\]\s+›\s+(?<rest>.*?)(?:\s+\((?<dur>\d+(?:\.\d+)?)(?<unit>ms|s|m)\))?\s*$/;

const byKey = new Map();

for (const line of lines) {
  const m = line.match(SPEC_RE);
  if (!m) continue;

  const sigil = m[1];           // ok | x | -
  const rest  = m.groups.rest;  // path › suite chain › spec title  (possibly with " (retry #N)")
  const durRaw = m.groups.dur ? parseFloat(m.groups.dur) : 0;
  const durMs  = m.groups.unit === 'm'  ? durRaw * 60_000
              : m.groups.unit === 's'  ? durRaw * 1_000
              : durRaw;

  // Strip trailing " (retry #N)" so retries collapse to the same spec key
  const restClean = rest.replace(/\s+\(retry #\d+\)\s*$/, '');

  // First " › " splits "tests\trade-finance\foo.spec.ts:NN:M" from the rest
  const firstArrow = restClean.indexOf(' › ');
  if (firstArrow < 0) continue;
  const fileWithLoc = restClean.slice(0, firstArrow);
  const titleChain  = restClean.slice(firstArrow + 3);

  // file may look like "tests\foo.spec.ts:57:9"
  const fileLoc = fileWithLoc.match(/^(.+?):(\d+):(\d+)$/);
  const file    = fileLoc ? fileLoc[1] : fileWithLoc;
  const lineNo  = fileLoc ? parseInt(fileLoc[2], 10) : 0;

  // titleChain is "TopSuite › InnerSuite › SpecTitle". Split off the last segment.
  const lastArrow = titleChain.lastIndexOf(' › ');
  const ancestry  = lastArrow >= 0 ? titleChain.slice(0, lastArrow) : '';
  const specTitle = lastArrow >= 0 ? titleChain.slice(lastArrow + 3) : titleChain;

  const status = sigil === 'ok' ? 'passed' : sigil === '-' ? 'skipped' : 'failed';

  const key = `${file}::${lineNo}::${specTitle}`;
  byKey.set(key, {
    file:     file.replace(/\\/g, '/'),
    line:     lineNo,
    title:    specTitle,
    ancestry, // suite chain only
    status,
    duration: durMs,
  });
}

// Build suite tree compatible with what generate-custom-report.js expects
// (collectSpecs walks `raw.suites[].specs[].tests[0].results[last]`).
const root = { title: 'root', suites: [], specs: [] };

function insertSpec(item) {
  // Top-level file suite — use file path as title
  let fileSuite = root.suites.find(s => s.title === item.file);
  if (!fileSuite) {
    fileSuite = { title: item.file, file: item.file, suites: [], specs: [] };
    root.suites.push(fileSuite);
  }

  // Walk ancestry suites within the file
  const chain = item.ancestry ? item.ancestry.split(' › ') : [];
  let parent = fileSuite;
  for (const title of chain) {
    let next = (parent.suites || []).find(s => s.title === title);
    if (!next) {
      next = { title, suites: [], specs: [] };
      parent.suites = parent.suites || [];
      parent.suites.push(next);
    }
    parent = next;
  }

  parent.specs = parent.specs || [];
  parent.specs.push({
    title: item.title,
    file:  item.file,
    line:  item.line,
    tests: [{
      results: [{
        status:   item.status,
        duration: item.duration,
        error:    item.status === 'failed' ? { message: 'See test-run log for details' } : null,
        attachments: [],
      }],
    }],
  });
}

const items = [...byKey.values()];
for (const it of items) insertSpec(it);

const passed  = items.filter(i => i.status === 'passed').length;
const failed  = items.filter(i => i.status === 'failed').length;
const skipped = items.filter(i => i.status === 'skipped').length;
const total   = items.length;
const totalMs = items.reduce((acc, i) => acc + (i.duration || 0), 0);

const startTime = new Date().toISOString();

const out = {
  config: { rootDir: ROOT.replace(/\\/g, '/') },
  suites: root.suites,
  errors: [],
  stats: {
    startTime,
    duration: totalMs,
    expected: passed,
    skipped,
    unexpected: failed,
    flaky: 0,
  },
};

if (!fs.existsSync(path.dirname(RESULTS))) {
  fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
}
fs.writeFileSync(RESULTS, JSON.stringify(out, null, 2), 'utf8');

console.log(`[synth] Source log:   ${path.relative(ROOT, logFull)}`);
console.log(`[synth] Wrote:        ${path.relative(ROOT, RESULTS)}`);
console.log(`[synth] Specs:        total=${total}  passed=${passed}  failed=${failed}  skipped=${skipped}`);
console.log(`[synth] Duration:     ${(totalMs / 1000 / 60).toFixed(1)} min`);
