#!/usr/bin/env node
/**
 * scripts/build-project-context.js
 *
 * Concatenate every authoritative skill file under .claude/skills/ into
 * a single consolidated reference: n8n/project-context.md.
 *
 * This file is what the n8n Full QA Pipeline can ingest as one blob
 * (instead of reading nine files in the Load Project Context node) and
 * what human reviewers read to understand exactly what the LLM sees.
 *
 * Run from the project root:
 *   node scripts/build-project-context.js
 *
 * The script is idempotent — it overwrites n8n/project-context.md every
 * run. The system-of-record is .claude/skills/; this file is a derived
 * view, so do not hand-edit it.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'n8n', 'project-context.md');

// Order matters: authority highest → lowest.
const SECTIONS = [
  { h2: 'Pipeline orchestration (authoritative — read this first)',
    file: '.claude/skills/pipeline.md' },
  { h2: 'OBDX 25.1 framework skill (authoritative for every OBDX/OJet decision)',
    file: '.claude/skills/obdx-25.1-framework/SKILL.md' },
  { h2: 'QA test case writer skill — SKILL.md',
    file: '.claude/skills/qa-test-case-writer/SKILL.md' },
  { h2: 'QA test case writer skill — coverage-patterns.md',
    file: '.claude/skills/qa-test-case-writer/coverage-patterns.md' },
  { h2: 'QA test case writer skill — techlogix-standards.md',
    file: '.claude/skills/qa-test-case-writer/techlogix-standards.md' },
  { h2: 'QA test case writer skill — references/obdx-format.md',
    file: '.claude/skills/qa-test-case-writer/references/obdx-format.md' },
  { h2: 'Playwright script writer skill — SKILL.md',
    file: '.claude/skills/playwright-script-writer/SKILL.md' },
  { h2: 'Playwright script writer skill — framework-conventions.md',
    file: '.claude/skills/playwright-script-writer/framework-conventions.md' },
  { h2: 'Playwright script writer skill — selector-strategy.md',
    file: '.claude/skills/playwright-script-writer/selector-strategy.md' },
  { h2: 'Playwright script writer skill — code-patterns.md',
    file: '.claude/skills/playwright-script-writer/code-patterns.md' },
];

function stripFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n+/);
  if (!m) return { frontmatter: null, body: text };
  const frontmatter = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) frontmatter[mm[1]] = mm[2].trim();
  }
  return { frontmatter, body: text.slice(m[0].length) };
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildIntro() {
  const toc = SECTIONS
    .map((s, i) => `- [${i + 1}. ${s.h2}](#${i + 1}-${slug(s.h2)})`)
    .join('\n');

  return [
    '# OBDX 25.1 — Project Context (Consolidated Skills)',
    '',
    '> **Generated from `.claude/skills/` — do not hand-edit.** Re-run `node scripts/build-project-context.js` whenever a skill file changes.',
    '',
    'This file is the consolidated knowledge base that the n8n Full QA Pipeline injects into every Claude CLI call. It bundles the four skills (`pipeline`, `obdx-25.1-framework`, `qa-test-case-writer`, `playwright-script-writer`) into a single readable document so:',
    '',
    '- Reviewers can read the full LLM context in one place.',
    '- The workflow can ingest a single file instead of nine.',
    '- Skill content stays the system-of-record in `.claude/skills/`; this file is a derived view.',
    '',
    '## Authority order',
    '',
    '1. **`obdx-25.1-framework`** — wins on every OBDX-specific decision (folder layout, locators, OJet rules, fixtures, waits).',
    '2. **`pipeline.md`** — defines the handoff between the test-case-writer and script-writer skills.',
    '3. **`qa-test-case-writer`** + **`playwright-script-writer`** — generic Techlogix conventions; deferred where they conflict with `obdx-25.1-framework`.',
    '',
    '## Table of contents',
    '',
    toc,
    '',
  ].join('\n');
}

function buildBody() {
  let body = '';
  let totalContentBytes = 0;
  for (let i = 0; i < SECTIONS.length; i++) {
    const s   = SECTIONS[i];
    const abs = path.join(ROOT, s.file);
    if (!fs.existsSync(abs)) {
      console.error(`MISS: ${s.file} — section ${i + 1} skipped`);
      continue;
    }
    const raw = fs.readFileSync(abs, 'utf8');
    const { frontmatter, body: content } = stripFrontmatter(raw);
    const fmLine = frontmatter && frontmatter.description
      ? `> ${frontmatter.description}\n\n`
      : '';
    body += [
      '',
      '',
      '---',
      '',
      `## ${i + 1}. ${s.h2}`,
      '',
      `_Source: \`${s.file}\`_`,
      '',
      fmLine + content.trimEnd(),
      '',
    ].join('\n');
    totalContentBytes += content.length;
  }
  return { body, totalContentBytes };
}

function main() {
  const intro = buildIntro();
  const { body, totalContentBytes } = buildBody();
  const final = intro + body;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, final, 'utf8');

  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log(`  Sections:        ${SECTIONS.length}`);
  console.log(`  Body bytes:      ${totalContentBytes}`);
  console.log(`  ≈ Tokens:        ${Math.round(totalContentBytes / 4)}`);
  console.log(`  Total file size: ${final.length} B (${(final.length / 1024).toFixed(1)} KB)`);
}

main();
