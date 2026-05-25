#!/usr/bin/env node
/**
 * scripts/build-jira-bugs.js
 *
 * Reads playwright-report/results.json (or a path supplied as argv[2]) and
 * emits a JSON array of Jira-Cloud-ready bug payloads on stdout.
 *
 * Used by the n8n "Full QA" workflow: one item per failed test, each ready
 * to be POSTed to /rest/api/3/issue and then enriched with attachments
 * (screenshot / trace / video) by a follow-up node.
 *
 * Output shape (one element per failed test):
 *
 * {
 *   "fields": {
 *     "project":   { "key": "<PROJECT_KEY>" },
 *     "issuetype": { "name": "Bug" },
 *     "summary":   "[OBDX] <test_id>: <test_title>",
 *     "description": { ...ADF document... },
 *     "labels":    ["obdx", "playwright", "automated", "<area>"],
 *     "priority":  { "name": "High" }
 *   },
 *   "attachments": [
 *     "/abs/path/to/screenshot.png",
 *     "/abs/path/to/trace.zip",
 *     "/abs/path/to/video.webm"
 *   ],
 *   "_meta": {
 *     "test_id":   "TC-AMLC-007",
 *     "test_file": "tests/trade-finance/amend-import-lc.spec.ts",
 *     "tags":      ["@negative", "@P1", "@regression"]
 *   }
 * }
 *
 * Env:
 *   JIRA_PROJECT_KEY   — required, e.g. "OBDX"
 *   JIRA_LABELS        — comma-separated extra labels (optional)
 *   REPORT_BASE_URL    — optional, prefix for the HTML report link in the description
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const REPORT_JSON = process.argv[2] || 'playwright-report/results.json';
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'OBDX';
const EXTRA_LABELS = (process.env.JIRA_LABELS || '').split(',').map(s => s.trim()).filter(Boolean);
const REPORT_BASE = process.env.REPORT_BASE_URL || '';

function readReport(p) {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) {
    console.error(JSON.stringify({ error: 'results.json not found', path: abs }));
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function collectFailures(report) {
  const failures = [];
  const walk = (suite, suitePath) => {
    const here = [...suitePath, suite.title].filter(Boolean);
    (suite.specs || []).forEach(spec => {
      (spec.tests || []).forEach(t => {
        (t.results || []).forEach(r => {
          if (r.status === 'failed' || r.status === 'timedOut') {
            failures.push({
              suite_path: here,
              spec_title: spec.title,
              spec_file:  spec.file,
              tags:       t.tags || [],
              error:      r.error || {},
              attachments: r.attachments || [],
              duration_ms: r.duration,
              retry:      r.retry,
            });
          }
        });
      });
    });
    (suite.suites || []).forEach(s => walk(s, here));
  };
  (report.suites || []).forEach(s => walk(s, []));
  return failures;
}

function parseTcId(title) {
  const m = (title || '').match(/^(TC-[A-Z0-9]+-\d+)/);
  return m ? m[1] : null;
}

// Module tags drive Jira labels. Section tags (tab1..) only apply to Trade Finance.
const MODULE_TAGS = [
  'trade-finance', 'funds-transfer', 'bill-payment',
  'reports', 'bulk-file-upload', 'approvals',
  'user-management', 'retail-payments', 'e2e',
];
const SECTION_TAGS = ['tab1', 'tab2', 'tab3', 'tab4', 'tab5', 'tab6'];

function moduleTagFromTags(tags) {
  for (const t of tags) {
    const bare = t.replace(/^@/, '');
    if (MODULE_TAGS.includes(bare)) return bare;
  }
  return 'unknown';
}

function sectionTagFromTags(tags) {
  for (const t of tags) {
    const bare = t.replace(/^@/, '');
    if (SECTION_TAGS.includes(bare)) return bare;
  }
  return null;
}

function moduleFromSpecFile(specFile) {
  // tests/<module>/<slug>.spec.ts → <module>
  const m = (specFile || '').match(/tests[\\/]([^\\/]+)[\\/]/);
  return m ? m[1] : null;
}

function adfDoc(content) {
  return { version: 1, type: 'doc', content };
}

function adfParagraph(text) {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function adfCodeBlock(text, language) {
  return {
    type: 'codeBlock',
    attrs: language ? { language } : {},
    content: [{ type: 'text', text }],
  };
}

function adfHeading(level, text) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

function adfBullets(items) {
  return {
    type: 'bulletList',
    content: items.map(t => ({
      type: 'listItem',
      content: [adfParagraph(t)],
    })),
  };
}

function buildDescription(f) {
  const errMsg   = (f.error.message || '').toString();
  const stackTop = (f.error.stack || '').split('\n').slice(0, 6).join('\n');

  const content = [
    adfHeading(3, 'Automated test failure (OBDX Playwright)'),
    adfParagraph(`Spec file: ${f.spec_file}`),
    adfParagraph(`Suite: ${f.suite_path.join(' › ')}`),
    adfParagraph(`Duration: ${f.duration_ms} ms (retry: ${f.retry})`),
    adfHeading(4, 'Error'),
    adfCodeBlock(errMsg.slice(0, 4000) || '(no message)', null),
  ];

  if (stackTop) {
    content.push(adfHeading(4, 'Stack (first 6 lines)'));
    content.push(adfCodeBlock(stackTop, null));
  }

  const screenshots = f.attachments.filter(a => a.name === 'screenshot' || /\.png$/i.test(a.path || ''));
  const videos      = f.attachments.filter(a => a.name === 'video'      || /\.webm$/i.test(a.path || ''));
  const traces      = f.attachments.filter(a => a.name === 'trace'      || /\.zip$/i.test(a.path || ''));

  if (screenshots.length || videos.length || traces.length) {
    content.push(adfHeading(4, 'Attached artefacts'));
    const lines = [];
    if (screenshots.length) lines.push(`${screenshots.length} screenshot(s)`);
    if (videos.length)      lines.push(`${videos.length} video(s)`);
    if (traces.length)      lines.push(`${traces.length} trace file(s)`);
    content.push(adfBullets(lines));
  }

  if (REPORT_BASE) {
    content.push(adfHeading(4, 'Full report'));
    content.push(adfParagraph(`${REPORT_BASE.replace(/\/$/, '')}/index.html`));
  }

  content.push(adfHeading(4, 'Tags'));
  content.push(adfParagraph((f.tags || []).join(' ') || '(none)'));

  return adfDoc(content);
}

function buildIssue(f) {
  const tcId       = parseTcId(f.spec_title);
  const moduleTag  = moduleTagFromTags(f.tags) !== 'unknown'
    ? moduleTagFromTags(f.tags)
    : (moduleFromSpecFile(f.spec_file) || 'unknown');
  const sectionTag = sectionTagFromTags(f.tags);
  const summary    = tcId
    ? `[OBDX][${moduleTag}] ${tcId}: ${f.spec_title.replace(/^TC-[A-Z0-9]+-\d+:\s*/, '')}`
    : `[OBDX][${moduleTag}] ${f.spec_title}`;
  const labels     = Array.from(new Set([
    'obdx', 'playwright', 'automated',
    moduleTag,
    sectionTag,
    ...EXTRA_LABELS,
  ])).filter(Boolean);

  return {
    fields: {
      project:   { key: PROJECT_KEY },
      issuetype: { name: 'Bug' },
      summary:   summary.slice(0, 250),
      description: buildDescription(f),
      labels,
      priority:  { name: 'High' },
    },
    attachments: f.attachments
      .map(a => a.path)
      .filter(Boolean)
      .filter(p => fs.existsSync(p)),
    _meta: {
      test_id:   tcId,
      test_file: f.spec_file,
      tags:      f.tags,
    },
  };
}

function main() {
  const report   = readReport(REPORT_JSON);
  const failures = collectFailures(report);
  const issues   = failures.map(buildIssue);
  process.stdout.write(JSON.stringify(issues, null, 2));
}

main();
