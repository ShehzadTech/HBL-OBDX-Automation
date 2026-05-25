# OBDX 25.1 — Project Context (Consolidated Skills)

> **Generated from `.claude/skills/` — do not hand-edit.** Re-run `node scripts/build-project-context.js` whenever a skill file changes.

This file is the consolidated knowledge base that the n8n Full QA Pipeline injects into every Claude CLI call. It bundles the four skills (`pipeline`, `obdx-25.1-framework`, `qa-test-case-writer`, `playwright-script-writer`) into a single readable document so:

- Reviewers can read the full LLM context in one place.
- The workflow can ingest a single file instead of nine.
- Skill content stays the system-of-record in `.claude/skills/`; this file is a derived view.

## Authority order

1. **`obdx-25.1-framework`** — wins on every OBDX-specific decision (folder layout, locators, OJet rules, fixtures, waits).
2. **`pipeline.md`** — defines the handoff between the test-case-writer and script-writer skills.
3. **`qa-test-case-writer`** + **`playwright-script-writer`** — generic Techlogix conventions; deferred where they conflict with `obdx-25.1-framework`.

## Table of contents

- [1. Pipeline orchestration (authoritative — read this first)](#1-pipeline-orchestration-authoritative-read-this-first)
- [2. OBDX 25.1 framework skill (authoritative for every OBDX/OJet decision)](#2-obdx-25-1-framework-skill-authoritative-for-every-obdx-ojet-decision)
- [3. QA test case writer skill — SKILL.md](#3-qa-test-case-writer-skill-skill-md)
- [4. QA test case writer skill — coverage-patterns.md](#4-qa-test-case-writer-skill-coverage-patterns-md)
- [5. QA test case writer skill — techlogix-standards.md](#5-qa-test-case-writer-skill-techlogix-standards-md)
- [6. QA test case writer skill — references/obdx-format.md](#6-qa-test-case-writer-skill-references-obdx-format-md)
- [7. Playwright script writer skill — SKILL.md](#7-playwright-script-writer-skill-skill-md)
- [8. Playwright script writer skill — framework-conventions.md](#8-playwright-script-writer-skill-framework-conventions-md)
- [9. Playwright script writer skill — selector-strategy.md](#9-playwright-script-writer-skill-selector-strategy-md)
- [10. Playwright script writer skill — code-patterns.md](#10-playwright-script-writer-skill-code-patterns-md)


---

## 1. Pipeline orchestration (authoritative — read this first)

_Source: `.claude/skills/pipeline.md`_

> End-to-end pipeline definition connecting qa-test-case-writer, playwright-script-writer, and the OBDX-25.1-framework reference. Defines the flow, handoff contract, and shared conventions between the skills.

# QA Automation Pipeline

## Project authority — read first

**For this project (OBDX-ILC-Playwright), the `obdx-25.1-framework` skill is the authoritative reference.** It defines the project's actual folder structure, locator strategy for Oracle JET (`oj-*`) elements, OBDX-specific synchronization, and the conventions every page object and spec must follow.

The two pipeline-stage skills (`qa-test-case-writer`, `playwright-script-writer`) describe a generic Techlogix-style framework. **Where they conflict with `obdx-25.1-framework`, the OBDX skill wins** — apply OBDX conventions for file layout (top-level `pages/common/`, `pages/<module>/`, no `src/` wrapper, `PascalCase` filenames), locator patterns (Role / Label / data-testid / `oj-*` CSS, never XPath as first choice), and OBDX-specific waits (`oj-busy-context`, widget initialisation).

Use the two pipeline skills for their workflow shapes (UST → test cases → spec files; planning vs full pipeline; quality gates; selector strategy) but slot the output into the OBDX project layout, not the Techlogix `src/` layout.

## Overview

```
UST / Jira ticket / FSD / RSD / RTM
      │
      ▼
┌─────────────────────┐
│  qa-test-case-writer │  → Techlogix test case table (.md / .xlsx)
└─────────────────────┘
      │
      │  handoff (test case table)
      ▼
┌──────────────────────────────┐
│  locator-scraper (MANDATORY) │  → data/scraped/<flow>-scraped.json
│  drives live AUT happy path  │     (real DOM locators + values)
└──────────────────────────────┘
      │
      │  handoff (test case table + scraped JSON)
      ▼
┌──────────────────────────┐
│  playwright-script-writer │  → .spec.ts files + page objects
└──────────────────────────┘    (referencing ONLY scraped locators)
      │                      ↑
      │                      │  follows OBDX conventions
      │                      │  (folder layout, locators, waits)
      │                      │
      │              ┌─────────────────────┐
      │              │ obdx-25.1-framework │
      │              └─────────────────────┘
      ▼
  npm test  (Playwright runs against the app)
```

**Why the locator-scraper stage is mandatory:** FSD/RSD/RTM describes
requirements, not the rendered DOM. Skipping the scrape and inferring
locators from the requirements doc produces runtime failures — verified
on the Initiate Outward BG run (30% pass rate when locators were inferred
from FSD) vs the View Outward BG run (87% pass rate using scraped
locators).

---

## Stage 1 — qa-test-case-writer

**Input:** UST, Jira ticket ID, FSD, RSD, RTM, or feature description  
**Output:** Techlogix-standard test case table (inline Markdown + optional .xlsx)

Invoke this skill first. Do not attempt to write Playwright code directly from a requirements doc — the test case table is the required intermediate artifact.

There are two entry paths into the pipeline that both converge here:

- **Path A — new requirements (FSD / RSD / RTM):** Stage 1 produces the test case table from the requirements doc, then Stage 2 scrapes locators, then Stage 3 writes the code.
- **Path B — manual TCs already exist:** Skip Stage 1; jump straight to Stage 2 to scrape locators, then Stage 3 writes the code.

---

## Stage 2 — locator-scraper (MANDATORY)

**Input:** Test case table from Stage 1 (or existing manual TC sheet for Path B), plus live AUT credentials (`.env`).  
**Output:** `data/scraped/<flow>-scraped.json` — real DOM locators + values captured from a one-pass happy-path run.

Before any POM or spec is written, drive the live AUT through one end-to-end happy path autonomously and capture, per interacted field:

- Literal `id` (e.g. `Currency2681350`)
- Stable fallback: `[id^="Currency"]`, role + accessible-name, placeholder
- Actual value entered / selected (raw text for inputs, visible option label for dropdowns)
- Tab / SWIFT-section context
- Whether the field appeared mandatory (validation error if left blank)

**Rules:**
- Open every dropdown during the scrape — capture actual visible option labels. Never assume FSD-described values exist verbatim.
- For SWIFT / customer / account LOVs, pick whatever the live dropdown shows. Don't hard-code from the requirements doc.
- For navigation menus, capture the exact label rendered by the build (e.g. live label is `"View Outward Guarantee/Stand By LC"`, not "View Outward BG").
- If the live AUT is unreachable, stop and flag it — do not silently fall back to FSD-guessing.

Reference scraper: `scripts/scrape-<flow>.js` (see `scripts/scrape-view-outward-bg.js` for the canonical pattern).

---

## Stage 3 — Handoff contract

The test case table from Stage 1 **and** the scraped JSON from Stage 2 are the two inputs into playwright-script-writer. The script writer reads both directly — no reformatting needed.

### Required columns (all must be present and non-empty)

| Column | Used by playwright-script-writer for |
|--------|--------------------------------------|
| **Test Case ID** | `test('TC-XXX-NNN @tag  title', ...)` — the TC-ID becomes the test name prefix |
| **Test Title** | The human-readable label in the test name |
| **Preconditions** | Determines which fixture to use (`loggedInInventoryPage` vs bare `loginPage`) |
| **Test Steps** | Maps to page object method calls inside the test body |
| **Expected Result** | Maps to `expect(...)` assertions |
| **Status** | Informational only — not used in generated code |

### TC-ID format

```
TC-[FEATURE]-[NNN]
```

- `FEATURE` is a short uppercase identifier derived from the UST (e.g. `LOGIN`, `CHECKOUT`, `INV`)
- `NNN` is a zero-padded three-digit sequence (001, 002, …)
- The same ID used in the test case table must appear verbatim in the generated spec file test name

### Category → tag mapping

The category assigned internally by qa-test-case-writer maps to the `@tag` in the spec file:

| Category | Tag |
|----------|-----|
| Happy Path | `@smoke` (if primary flow) or `@regression` |
| Negative | `@regression` |
| Boundary | `@regression` |
| Edge | `@regression` |

Primary happy-path tests (typically the first one or two TC-IDs per feature) get `@smoke`. All others get `@regression`.

---

## Stage 4 — playwright-script-writer

**Input:** Test case table from Stage 1 + scraped JSON from Stage 2.  
**Output:** `.spec.ts` files and any new/extended page objects.

The skill reads both inputs, maps each TC row to a test, and generates conformant Playwright code following the Techlogix framework conventions. **Every locator in the generated POM must be backed by an entry in the scraped JSON** — if a TC references a field that wasn't captured during the scrape, mark that test `test.fixme` with a `// TODO: re-scrape …` comment instead of inventing a locator.

---

## Invoking the pipeline

### Typical session

1. Paste the UST / FSD / RSD / RTM → `qa-test-case-writer` runs automatically (Path A). For Path B, skip to step 3.
2. Review and approve test cases (answer any clarifying questions)
3. **Run the locator-scraper** against the live AUT happy path → produces `data/scraped/<flow>-scraped.json`. Verify the JSON contains real locators for every interactive field referenced by the TCs.
4. Say **"automate these"** or **"write the Playwright scripts"** → `playwright-script-writer` runs using the test cases + the scraped JSON. Generated POM/spec reference only scraped locators.
5. Review the plan the script writer produces, then approve to get the code
6. Run `npm test` to verify

### Shortcuts

| You say | What happens |
|---------|--------------|
| `"full pipeline"` | qa-test-case-writer skips its pause block and runs straight through to test cases, then you invoke the script writer |
| `"skip questions"` | Same as above |
| `"automate directly"` | playwright-script-writer skips asking you to run qa-test-case-writer first (use only when you already have test cases) |
| `"just the code"` | playwright-script-writer skips the plan confirmation step and outputs code immediately |

---

## Shared conventions

Both skills must agree on these — changing one requires updating the other.

| Convention | Value |
|------------|-------|
| TC-ID format | `TC-[FEATURE]-[NNN]` |
| Smoke tag | `@smoke` |
| Regression tag | `@regression` |
| Spec file location | `tests/specs/<feature>/<feature>.spec.ts` |
| Page object location | `src/pages/<name>.page.ts` |
| Fixture import | `@fixtures/pages.fixture` |
| Test data import | `@config/test-data` |
| Scraped locator JSON | `data/scraped/<flow>-scraped.json` (Stage 2 output, Stage 4 input) |
| Scraper script | `scripts/scrape-<flow>.js` (one per flow; pattern: `scripts/scrape-view-outward-bg.js`) |
| Test data policy | Synthetic only — no real PII, credentials, or patient data |


---

## 2. OBDX 25.1 framework skill (authoritative for every OBDX/OJet decision)

_Source: `.claude/skills/obdx-25.1-framework/SKILL.md`_

> Authoritative reference for the OBDX 25.1 Playwright + TypeScript automation project. Defines the project's folder structure, locator strategy for Oracle JET (oj-* custom Web Components), stable-selector patterns against dynamic IDs, navigation patterns (hamburger menu, maker-checker, multi-entity), data-driven testing with Excel/JSON, OBDX-specific synchronization (`oj-busy-context`, widget initialization), parallel-execution conventions, debugging flaky OBDX tests, and AI-assisted automation guardrails. Use this skill when working on the OBDX-ILC-Playwright project, generating page objects for any OBDX module (Retail / Corporate / Trade Finance / Approvals), writing or refactoring `.spec.ts` files for OBDX flows, picking selectors against `oj-*` elements, handling Maker/Checker / OTP / dual-factor flows, parsing test data from the project Excel sheets, or making structural changes to the project. This skill takes precedence over generic Playwright guides for any OBDX-specific decision.

# 🧠 Skills & Workflow Guide — OBDX 25.1 Playwright Automation Framework

> A comprehensive reference for building, scaling, and maintaining the Playwright-based test automation framework for **Oracle Banking Digital Experience (OBDX) 25.1**.
>
> **Audience:** QA Automation Engineers, Onboarding Team Members, Reviewers
> **Stack:** Playwright • TypeScript • VS Code • Excel-driven Test Data • POM Architecture

---

## 📑 Table of Contents

1. [Overview](#1-overview)
2. [Testcase Engineering Skills](#2-testcase-engineering-skills)
3. [Automation Framework Skills](#3-automation-framework-skills)
4. [Locator Strategy Expertise](#4-locator-strategy-expertise)
5. [Playwright Advanced Skills](#5-playwright-advanced-skills)
6. [Data-Driven Testing](#6-data-driven-testing)
7. [Error Handling & Debugging](#7-error-handling--debugging)
8. [AI-Assisted Automation](#8-ai-assisted-automation)
9. [Code Quality & Best Practices](#9-code-quality--best-practices)
10. [CI/CD & Execution](#10-cicd--execution)
11. [Common Challenges in OBDX Automation](#11-common-challenges-in-obdx-automation)
12. [Recommended Folder Structure](#12-recommended-folder-structure)
13. [Conclusion](#13-conclusion)

---

## 1. Overview

### Why OBDX Automation Is Challenging

Oracle Banking Digital Experience (OBDX) 25.1 is an **enterprise-grade, modular banking platform** built on Oracle JET (JavaScript Extension Toolkit). Automating it differs significantly from automating standard web applications because:

- **Heavy use of custom Web Components** (`oj-*` tags) which behave differently from native HTML.
- **Dynamic DOM rendering** — elements are mounted/unmounted based on user role, entitlements, and module state.
- **Complex navigation** through the **Hamburger menu**, dashboards, and dashboard tiles, with deeply nested flows.
- **Authentication flows** including OTP, soft tokens, dual-factor approvals, and maker-checker workflows.
- **Multi-entity / multi-currency** transactions that require precise data setup.
- **Slow asynchronous loading** of widgets, accounts, and transaction grids.

### Why a Structured Approach Matters

Ad-hoc automation in OBDX collapses quickly. A structured framework provides:

- ✅ **Stability** against frequent UI/DOM changes between OBDX patches.
- ✅ **Reusability** across modules (Retail, Corporate, Admin).
- ✅ **Maintainability** — locator changes in one file, not 200.
- ✅ **Scalability** to handle hundreds of business scenarios across user types.
- ✅ **Faster onboarding** for new QA engineers joining mid-project.

---

## 2. Testcase Engineering Skills

### 2.1 Converting Business Scenarios into Testcases

Business scenarios in the input Excel sheet are typically high-level (e.g., *"Customer should be able to transfer funds to a registered payee"*). The QA engineer must decompose these into:

- **Preconditions** (logged-in user, payee registered, account funded)
- **Test Steps** (atomic, sequential)
- **Expected Result** (UI confirmation, balance update, transaction reference)
- **Postconditions** (cleanup, logout)

### 2.2 Writing Clear, Modular Testcases

A good testcase is:

- **Atomic** — tests one behavior, not five.
- **Independent** — does not rely on the order of execution.
- **Readable** — a non-developer should understand intent.
- **Traceable** — linked back to the Excel test ID and business requirement.

### 2.3 Positive, Negative & Edge Cases

For each business scenario, the engineer should design:

| Type | Example (Funds Transfer) |
|------|---------------------------|
| **Positive** | Transfer ₹1,000 to a registered payee — success |
| **Negative** | Transfer with insufficient balance — error message |
| **Edge** | Transfer of `0.01`, transfer above per-day limit, special chars in remarks |
| **Boundary** | Exactly at daily limit, exactly at minimum allowed amount |
| **Security** | SQL injection / XSS attempts in input fields |

### 2.4 Test Data Management Strategies

- **External data files** (Excel/JSON) — never hardcoded in test logic.
- **Environment-specific data** — separate fixtures for `DEV`, `SIT`, `UAT`.
- **Stateful vs. stateless data** — generate dynamic data (e.g., timestamps, UUIDs) for fields that must be unique.
- **Sensitive data** — store credentials in `.env` files, never commit them.

---

## 3. Automation Framework Skills

### 3.1 Designing a Scalable Playwright Framework

The framework must support:


- Multiple **modules** (Accounts, Payments, Loans, Trade Finance, Approvals).
- **Parallel execution** across browsers and workers.
- **Reusable login**, navigation, and approval flows.

### 3.2 Page Object Model (POM)

Every OBDX page/screen gets its own class encapsulating:

- **Locators** as private readonly properties.
- **Actions** as public async methods.
- **Assertions** kept in test files (not in pages) to preserve separation.

```typescript
// pages/payments/FundTransferPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class FundTransferPage {
  private readonly payeeDropdown: Locator;
  private readonly amountInput: Locator;
  private readonly submitBtn: Locator;
  private readonly successBanner: Locator;

  constructor(private readonly page: Page) {
    this.payeeDropdown   = page.getByRole('combobox', { name: 'Payee' });
    this.amountInput     = page.getByLabel('Amount');
    this.submitBtn       = page.getByRole('button', { name: 'Submit' });
    this.successBanner   = page.locator('[data-testid="txn-success"]');
  }

  async transferFunds(payee: string, amount: string): Promise<void> {
    await this.payeeDropdown.click();
    await this.page.getByRole('option', { name: payee }).click();
    await this.amountInput.fill(amount);
    await this.submitBtn.click();
  }

  async getReferenceNumber(): Promise<string> {
    await expect(this.successBanner).toBeVisible();
    return (await this.successBanner.textContent()) ?? '';
  }
}
```

### 3.3 Separation of Concerns

| Layer | Responsibility |
|-------|----------------|
| **`/tests`** | Test specs — business intent, assertions only |
| **`/pages`** | UI interaction logic — locators + actions |
| **`/utils`** | Generic helpers — Excel reader, date utils, logger |
| **`/fixtures`** | Custom Playwright fixtures (logged-in contexts, API setup) |
| **`/data`** | Test data files (JSON / Excel) |
| **`/config`** | Environment URLs, timeouts, user roles |

### 3.4 Reusable Components

Common OBDX flows that should be helpers, not repeated:

- `loginAs(role)` — handles login, OTP, security questions.
- `openHamburgerMenu(menuPath)` — navigates nested menu items.
- `approveTransaction(refNo)` — checker login + approval flow.
- `waitForOJComponent(locator)` — waits for Oracle JET widget readiness.

---

## 4. Locator Strategy Expertise

### 4.1 Writing Stable Selectors — Priority Order

1. **Role-based** — `getByRole('button', { name: 'Submit' })`
2. **Label/Text-based** — `getByLabel('Account Number')`
3. **Test IDs** — `[data-testid="..."]` (request these from dev team where missing)
4. **CSS attribute selectors** — `oj-input-text[name="amount"]`
5. **XPath** — only as a last resort

### 4.2 Handling Dynamic DOM in OBDX

OBDX commonly generates IDs like `oj-input-text-12345` where the suffix changes on every render. Engineers must:

- **Anchor on stable attributes** — `name`, `aria-label`, parent containers.
- **Avoid index-based selectors** — `.nth(2)` is fragile when widgets re-order.
- **Scope locators** — chain from a stable parent: `section.locator('oj-input-text[name="amount"]')`.

### 4.3 Shadow DOM

Some Oracle JET components encapsulate inputs inside Shadow DOM. Playwright pierces it automatically with most selectors, but:

- Use `getByRole` / `getByLabel` which traverse shadow boundaries.
- For deep cases, use `>>>` (deep combinator) or `locator('css=...')` thoughtfully.

### 4.4 Avoiding Brittle XPath

❌ `//div[3]/table/tbody/tr[2]/td[5]/span`
✅ `getByRole('row', { name: 'Savings Account' }).getByRole('cell', { name: 'Balance' })`

XPath should never describe **structure**; it should describe **meaning**.

---

## 5. Playwright Advanced Skills

### 5.1 Auto-Waiting & Synchronization

Playwright auto-waits for actionability, but OBDX widgets sometimes render visually before being interactive. Patterns:

```typescript
// Wait for the OJ widget to finish initialization
await expect(this.amountInput).toBeEnabled();
await expect(this.page.locator('.oj-busy-context')).toHaveCount(0);
```

Avoid `page.waitForTimeout(3000)` — it hides real timing bugs.

### 5.2 Iframes, Popups & Multi-Tabs

- **OTP popups** → `page.frameLocator('iframe[name="otp-frame"]').getByLabel('OTP')`
- **Approval window popup** → `const [popup] = await Promise.all([page.waitForEvent('popup'), triggerBtn.click()]);`
- **Statement download tab** → handle via `context.on('page', ...)`.

### 5.3 Network Interception

Useful for:

- **Mocking slow APIs** during UI-only tests.
- **Asserting backend calls** (e.g., correct payload sent on transfer).
- **Capturing transaction reference numbers** from API response when UI is delayed.

```typescript
const txnResp = page.waitForResponse(r => r.url().includes('/payments/transfer') && r.status() === 200);
await fundTransferPage.submit();
const json = await (await txnResp).json();
expect(json.referenceNumber).toBeTruthy();
```

### 5.4 Screenshots & Video Recording

Configured globally in `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure',
}
```

### 5.5 Parallel Execution

- Each test must be **isolated** (no shared state).
- Use **storage state** (`storageState.json`) for pre-authenticated sessions to avoid logging in repeatedly.
- Split heavy modules across **projects** in config (Retail, Corporate) for parallel sharding in CI.

---

## 6. Data-Driven Testing

### 6.1 Reading Excel / JSON Test Data

Use libraries like `exceljs` to convert Excel sheets to JSON at runtime or pre-test:

```typescript
// utils/excelReader.ts
import ExcelJS from 'exceljs';

export async function readSheet(file: string, sheetName: string): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.getWorksheet(sheetName);
  const rows: Record<string, string>[] = [];
  const headers: string[] = [];
  sheet?.eachRow((row, idx) => {
    if (idx === 1) {
      row.eachCell((cell, c) => (headers[c - 1] = String(cell.value)));
    } else {
      const obj: Record<string, string> = {};
      row.eachCell((cell, c) => (obj[headers[c - 1]] = String(cell.value ?? '')));
      rows.push(obj);
    }
  });
  return rows;
}
```

### 6.2 Parameterization

```typescript
const dataset = await readSheet('data/funds-transfer.xlsx', 'Positive');

for (const row of dataset) {
  test(`FT_${row.TC_ID} — ${row.Description}`, async ({ page }) => {
    // ... use row.Payee, row.Amount, row.ExpectedStatus
  });
}
```

### 6.3 Environment-Based Configs

```
config/
 ├── env.dev.json
 ├── env.sit.json
 └── env.uat.json
```

Selected via `process.env.TEST_ENV` so the same test suite runs across environments without code changes.

---

## 7. Error Handling & Debugging

### 7.1 Logging Strategy

- Use a structured logger (`winston` or a custom one) instead of `console.log`.
- Tag logs with **test ID + step** so failures are traceable.
- Log at **INFO** for steps, **ERROR** for failures, **DEBUG** for locator resolution.

### 7.2 Screenshot & Trace on Failure

Already covered in Playwright config — but engineers should also:

- Attach screenshots into HTML reports using `testInfo.attach()`.
- Capture **full-page** screenshots, not just viewport.
- Save **DOM snapshots** for hard-to-reproduce dynamic failures.

### 7.3 Debugging Flaky Tests

Common OBDX flake sources & fixes:

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Element not found intermittently | OJ widget not initialized | Wait for `oj-busy-context` to clear |
| Click doesn't register | Animation in progress | `await locator.waitFor({ state: 'visible' })` + `toBeEnabled()` |
| Stale element on retry | DOM re-rendered | Re-fetch locator inside retry block |
| OTP timeout | Test data session expired | Use fresh OTP from test stub each run |

Use `npx playwright test --debug` and the **Trace Viewer** (`npx playwright show-trace`) for forensic analysis.

---

## 8. AI-Assisted Automation

### 8.1 Where AI Adds Value

| Task | AI Role | Human Role |
|------|---------|------------|
| Testcase generation from Excel | Drafts steps, edge cases | Validates business logic |
| Locator suggestion from DOM snippet | Proposes selectors | Verifies stability across renders |
| Boilerplate code generation (POM classes) | Generates skeleton | Refactors, names, integrates |
| Test data variation | Generates boundary/edge values | Confirms relevance to business rules |

### 8.2 Risks of AI-Generated Code

- ❌ **Hallucinated APIs** — AI may invent Playwright methods that don't exist.
- ❌ **Brittle locators** — AI tends to favor XPath when CSS/role-based is better.
- ❌ **Missing waits** — generated code often skips synchronization, causing flakes.
- ❌ **Generic test data** — may not respect OBDX validation rules (IFSC format, account length).
- ❌ **Security leakage** — never paste real credentials, customer data, or production URLs into AI tools.

### 8.3 Best Practices for Refining AI Output

1. **Always run** AI-generated code locally before committing.
2. **Replace fragile selectors** with role/label-based ones.
3. **Add explicit assertions** — AI often over-trusts implicit waits.
4. **Refactor into POM** — AI typically generates flat scripts; restructure them.
5. **Review for hardcoding** — extract any literal data into the data layer.
6. **Treat AI as a junior pair-programmer**, not as the source of truth.

---

## 9. Code Quality & Best Practices

### 9.1 Clean Code Principles

- **DRY** (Don't Repeat Yourself) — extract repeated locators/flows.
- **SRP** (Single Responsibility) — each method does one thing.
- **KISS** — short, readable functions over clever one-liners.
- **YAGNI** — don't build abstractions until they're needed twice.

### 9.2 Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | `PascalCase` for classes, `kebab-case` for tests | `LoginPage.ts`, `funds-transfer.spec.ts` |
| Classes | `PascalCase` ending in `Page` / `Component` | `DashboardPage` |
| Methods | `camelCase`, verb-first | `enterAmount()`, `verifyBalance()` |
| Constants | `UPPER_SNAKE_CASE` | `DEFAULT_TIMEOUT` |
| Test IDs | `MODULE_TC_NNN` | `FT_TC_001` |

### 9.3 Maintainability & Scalability

- Use **TypeScript strict mode** to catch errors early.
- Enforce **ESLint + Prettier** with pre-commit hooks (Husky + lint-staged).
- Keep PRs small and reviewed.
- Document non-obvious workarounds with `// NOTE:` comments referencing the OBDX bug/version.

---

## 10. CI/CD & Execution

### 10.1 CLI Execution

```bash
# Run all tests
npx playwright test

# Run a single module
npx playwright test tests/payments/

# Run with a specific environment
TEST_ENV=sit npx playwright test

# Headed mode for debugging
npx playwright test --headed --workers=1

# Generate and open the HTML report
npx playwright show-report
```

### 10.2 Pipeline Integration (Overview)

A typical pipeline (Jenkins / GitHub Actions / GitLab CI) would:

1. **Checkout** the repo.
2. **Install** Node + dependencies (`npm ci`).
3. **Install browsers** (`npx playwright install --with-deps`).
4. **Run** tests (`npx playwright test --reporter=html,junit`).
5. **Publish** HTML report + JUnit XML as artifacts.
6. **Notify** team on Slack/Teams with pass/fail summary.

Tests should run on every PR (smoke subset) and nightly (full regression).

---

## 11. Common Challenges in OBDX Automation

| Challenge | Mitigation |
|-----------|------------|
| **Hamburger menu navigation** — multi-level, slide-in animation | Build a `navigateTo(menuPath: string[])` helper that handles each level with proper waits |
| **Dynamic forms** — fields appear based on prior selections | Always re-locate after each conditional change; never cache locators across re-renders |
| **Slow widget loading** (account grids, transaction history) | Wait on the data spinner / `oj-busy-context` rather than fixed sleeps |
| **Maker-Checker flows** | Model as a two-context test: maker submits, checker (separate `BrowserContext`) approves |
| **Session timeouts during long suites** | Refresh session via `storageState` per test or re-login fixture |
| **Multi-currency / multi-entity selection** | Centralize entity-switch logic in a utility; never inline in tests |
| **OTP and 2FA** | Use test environment OTP stub or backdoor API to fetch the OTP rather than reading SMS |
| **Iframe-based dialogs** (some legacy modules) | Use `frameLocator` consistently, wrapped in a helper |

---

## 12. Recommended Folder Structure

```
obdx-automation/
├── .github/
│   └── workflows/
│       └── playwright.yml
├── config/
│   ├── env.dev.json
│   ├── env.sit.json
│   └── env.uat.json
├── data/
│   ├── retail/
│   │   ├── funds-transfer.xlsx
│   │   └── bill-payment.xlsx
│   └── corporate/
│       └── bulk-upload.xlsx
├── fixtures/
│   ├── auth.fixture.ts          # Pre-authenticated contexts
│   └── api.fixture.ts           # Backend setup helpers
├── pages/
│   ├── common/
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   └── HamburgerMenu.ts
│   ├── retail/
│   │   ├── FundTransferPage.ts
│   │   └── PayeeManagementPage.ts
│   └── corporate/
│       ├── BulkPaymentPage.ts
│       └── ApprovalQueuePage.ts
├── tests/
│   ├── retail/
│   │   ├── funds-transfer.spec.ts
│   │   └── payee-management.spec.ts
│   ├── corporate/
│   │   └── bulk-payment.spec.ts
│   └── smoke/
│       └── login-smoke.spec.ts
├── utils/
│   ├── excelReader.ts
│   ├── logger.ts
│   ├── dateUtils.ts
│   ├── apiHelper.ts
│   └── waitHelpers.ts
├── reports/                     # Generated HTML / JUnit reports
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 13. Conclusion

### Summary of Required Skillset

A QA Automation Engineer working on OBDX 25.1 with Playwright must combine:

- 🧩 **Analytical thinking** — to convert business scenarios into precise, testable cases.
- 🏗️ **Architectural discipline** — to build a layered, scalable framework (POM + utilities + fixtures).
- 🎯 **Locator craftsmanship** — to handle Oracle JET's dynamic DOM without brittle selectors.
- ⚙️ **Playwright depth** — auto-waits, network interception, parallelization, traces.
- 📊 **Data engineering** — Excel/JSON-driven, environment-aware, secure.
- 🤖 **AI literacy** — using Claude and similar tools as accelerators, with critical refinement.
- 🛠️ **Engineering hygiene** — clean code, naming, linting, version control, CI/CD.

### Why Structure Beats Speed

Ad-hoc automation feels fast initially but collapses under the weight of OBDX's complexity. A **structured, layered framework** — even one that takes longer to build at first — pays back by:

- Reducing maintenance time by **5-10x** over a release cycle.
- Allowing **non-experts** to add new tests safely.
- Surviving **OBDX patches and upgrades** with localized fixes.
- Producing **trustworthy results** that the business can act on.

> **The goal isn't just to automate tests — it's to build a test platform that scales with the bank.**

---

*Document maintained as part of the OBDX 25.1 Automation Framework. Update on every major framework version or OBDX upgrade.*


---

## 3. QA test case writer skill — SKILL.md

_Source: `.claude/skills/qa-test-case-writer/SKILL.md`_

> Use this skill whenever the user is working on QA for a healthcare or enterprise feature and provides (or fetches via MCP) a User Story Task (UST), Jira ticket, feature description, acceptance criteria, or equivalent requirements document and wants test planning, test cases, or related QA artefacts. Trigger on any UST-shaped input even if the user doesn't explicitly ask for test cases — confirm the user's intent briefly, then produce the appropriate QA output. Covers the full workflow from fresh UST through refinement and enrichment. Use this skill in preference to generic responses whenever QA work on a real feature specification is happening.

# QA Test Case Writer

This skill produces Techlogix-standard test cases from User Story Tasks (USTs) and handles the full QA authoring workflow — test planning, test case generation, refinement, and enrichment. Built for QA engineers working on the instED programme and similar enterprise features.

## When this skill activates

Activate when the user's message contains (or references) any of:

- A User Story Task, Jira ticket, or Confluence page with a feature description
- Acceptance criteria (numbered list of requirements)
- A request for test cases, test plan, edge cases, test scenarios, or test data
- An existing test case table the user wants to review, enrich, or extend
- A Jira ticket ID that can be fetched via Atlassian MCP (e.g. `INST-1234`, `PROJ-456`)

If a UST is present but the user's intent is ambiguous, briefly confirm before producing output — for example: *"You've pasted a UST. Would you like the full pipeline (plan + questions + test cases), just test cases, or something else?"*

If only a ticket ID is mentioned and Atlassian MCP is available, fetch the ticket first, then proceed.

## The Techlogix test case standard

All test case output from this skill must conform to this format. This is non-negotiable.

**Table columns (exactly these, in this order):**

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |

**Standards:**

- **Test Case ID** format: `TC-[FEATURE]-[NNN]` where FEATURE is a short uppercase identifier derived from the UST (e.g. `TC-LOGIN-001`, `TC-PROFILE-014`)
- **Test Title** is short and describes *what* is being tested, not the expected outcome
- **Preconditions** must be on every test case — what state must exist before the test runs. Never "none" or blank. Include user role, data state, environment flags, and any external system dependencies.
- **Test Steps** must be numbered and specific. "Click the Log In button in the top-right corner of the landing page" is good. "Click login" is not.
- **Expected Result** must be observable and testable. "User lands on /dashboard and header displays logged-in user's name" is good. "Login works correctly" is not.
- **Category** is assigned to every test case internally but is **not** a visible column in the output table. Instead, it drives grouping: test cases are sorted and presented in four labelled groups — Happy Path first, then Negative, then Boundary, then Edge. Use these definitions when categorising:
  - **Happy Path** — valid inputs, correct preconditions, expected successful outcome
  - **Negative** — invalid inputs, missing mandatory fields, unauthorised access, blocked actions
  - **Boundary** — at, just below, or just above a defined limit (numeric thresholds, time windows, character lengths, similarity percentages)
  - **Edge** — unusual but valid conditions: state changes mid-flow, concurrent actors, integration failures, data-wipe triggers
- **Status** defaults to "Not Executed"
- **Test data** is synthetic only — never real patient data, real credentials, or real PII

**Explicit rule: NEVER use Given/When/Then syntax.** That's Cucumber `.feature` file syntax, which is a separate output format. Test cases use the table above.

## Choosing the right workflow

This skill adapts its output to what the user is asking for. Identify the user's intent, then apply the matching workflow:

| User asks for… | Use workflow | Produces .xlsx? |
|----------------|--------------|-----------------|
| Fresh UST, broad ask ("work through this", "generate test cases", "I need test cases for this UST") | **Full pipeline** | Yes |
| Test planning only, no test cases yet | **Planning only** | No |
| Review/enrich existing test cases | **Enricher** | Yes |
| Specific subset (edge cases only, negative scenarios only, clarifying questions only) | **Targeted** | Only if ≥3 test cases |
| Follow-up in existing conversation (continuing a prior output) | **Follow-up** (do not repeat sections already produced) | No |

When in doubt, lean toward the full pipeline — it's the default for a fresh UST.

## Output mode: inline + downloadable xlsx

For every workflow that produces a .xlsx (see table above), **by default produce BOTH**:

1. The inline Markdown output in the chat (so the user can read/skim immediately)
2. A downloadable .xlsx file generated via the script in `references/generate_xlsx.md`

**Override:** If the user says "just give me the file", "file only", "skip the preview", or similar, produce only the .xlsx and a one-line confirmation (e.g. "Generated. Download below."). Do not inline the table.

**See `references/generate_xlsx.md` for the exact xlsx format specification and the Python script to run.** Always read that file before generating the first xlsx in a conversation — the format rules matter for clean Jira import.

---

## Workflow: Full pipeline (fresh UST → test cases)

Use when the user pastes a fresh UST and wants the whole thing worked through.

Internally, run: Initial Analysis → Edge Case Hunter on the 3 highest-risk scenarios → identify preconditions and test data → **pattern detection against `references/coverage-patterns.md`** → cross-reference against Technical Notes. Then decide on output mode:

### Step 1: Decide response shape BEFORE writing

Make this decision before you type anything. It determines whether your response has 3 sections or 5.

**PAUSED shape (3 sections + pause block, STOP after section 3) when:**
- You identified at least one genuine clarifying question AND
- The user's message does NOT contain an override phrase

**FULL PASS shape (all 5 sections, with gap verification loop before rendering) when either:**
- Zero genuine clarifying questions, OR
- Override phrase present: *"skip questions"*, *"no pause"*, *"full pipeline"*, *"just generate"*, *"xlsx only"*, *"file only"*, *"proceed anyway"*

If you are in the PAUSED shape, your response ENDS at the pause block at the end of section 3. Writing sections 4 and 5 in a paused response is a bug. Default assumption: a well-written UST produces the FULL PASS shape. Don't invent questions to force a pause.

### Output order

All sections use these exact headers:

```
=== 1. TEST PLAN SUMMARY ===
- Functional scope (2-3 sentences)
- Acceptance criteria breakdown (numbered list, matching the UST)
- Test scenarios grouped by category: Positive / Negative / Boundary / Edge
- Test data requirements
- Integration or dependency notes
- Privacy / data-handling considerations (if confidential domain)
- Detected pattern (e.g. "REST API Endpoint") — or "General" if no pattern matched

=== 2. CLARIFYING QUESTIONS ===

Default: ZERO. Every question you add must pass this admissibility test:

    "If I don't know the answer to this, would my test cases be
     MEANINGFULLY DIFFERENT depending on which answer is true?"

If "no, I can assume something reasonable" → it goes in Assumptions, NOT here.
If "yes, it splits into different test cases" → genuine clarifying question.

There is no target count. A clear UST gets zero. An ambiguous one gets exactly
as many as pass the test — never padded to hit a number, never capped if more
genuinely qualify.

If ZERO qualify: write exactly "No clarifying questions — the UST is sufficient.
Proceeding with the assumptions below." Then continue to section 3.

If one or more qualify: number them 1, 2, 3... Add one sentence each explaining
why the answer changes the test cases.

Examples that COUNT:
- UST says "within 30 days" without calendar/business-day clarification → boundary tests differ
- UST mentions roles but doesn't define permissions per role → role-based tests differ
- UST specifies a cut-off without stating the reference timezone → boundary tests differ

Examples that DO NOT count (go in Assumptions instead):
- "What exact error message?" (quote UST if given, else assume reasonable wording)
- "What email should notifications go to?" (synthetic, flag as assumption)
- "Does the system support MFA?" (not in UST = out of scope, not a CQ)

=== 3. ASSUMPTIONS MADE ===
Anything assumed to fill a gap in the UST. One line per assumption.

TERMINATION CHECK (perform before writing anything else below this section):

- Did you list one or more clarifying questions in section 2?
- Was the user's message free of override phrases?

If BOTH are yes, this response ENDS HERE. Write the pause block below as the
final text and STOP. Do NOT write sections 4 or 5.

    ---
    ⏸ Pausing here. Review the clarifying questions and assumptions above.
    Reply with answers, corrections, or "proceed" to continue generating test cases.

If EITHER is no, skip the pause block and continue directly to section 4.

=== 4. TEST CASES ===
Full test case table in the Techlogix standard format (see above).

Include pattern-specific coverage as per `references/coverage-patterns.md`.

=== 5. COVERAGE NOTES ===
- Brief mapping: which test case IDs cover which acceptance criterion
- Any scenarios identified but not turned into test cases (and why)
- If a pattern was applied: the Pattern Checklist Status sub-section
  (see coverage-patterns.md for format)
```

### Step 2: Gap verification loop (before rendering xlsx)

After drafting sections 4 and 5 internally, verify coverage against the Pattern Checklist(s) BEFORE calling the xlsx generation script. This applies to both the full-pass run and the continuation after a pause.

**A. Classify every ❌ in the Pattern Checklist Status** as one of:

- **ADDRESSABLE** — UST has cues for this item, it's in scope, a test case can reasonably be written. Example: *"Month-length variations ❌"* when the UST has a monthly cut-off rule but tests cover only one creation month.
- **OUT_OF_SCOPE** — UST is silent on this dimension, or the item doesn't apply to this UST's architecture. Example: *"Cross-browser matrix ❌"* when UST makes no browser claims; *"Rate limiting ❌"* when no API rate limits are documented.

Convert OUT_OF_SCOPE items from ❌ to **N/A** with a one-line reason inline. This prevents honest-but-misleading ❌ reporting for items that aren't real gaps.

**B. Gate check — surface if > 5 ADDRESSABLE gaps.** If the ADDRESSABLE list has more than 5 items, pause and show the user this block:

    === GAP ANALYSIS ===

    I found N addressable coverage gaps before rendering the xlsx:

    1. [Checklist item] — [one-line reason it applies here]
    2. ...

    I'll generate test cases for all of these unless you say otherwise
    (e.g. "skip 2 and 5", "only 1 and 3", "proceed with all").

Then STOP and wait for user input. When the user replies, filter the list per their instruction and proceed to C. If there are 5 or fewer ADDRESSABLE gaps, proceed silently to C without surfacing.

**C. Fill gaps.** For each ADDRESSABLE gap, generate the test case(s) — one if narrow, multiple if broad (e.g. month-length = up to 4 test cases for 28/29/30/31-day creation months). Append to the test case set with fresh IDs in the correct Category. Update Pattern Checklist Status: ❌ → ✅ with new TC IDs listed.

**D. Second classification pass.** Re-run step A against the updated test case set. If new ADDRESSABLE gaps appear (rare but possible — filling one gap can reveal downstream coverage needs), fill them once more via step C. **Hard cap: 2 fill rounds total.** Remaining gaps after round 2 stay as ❌, get logged in "Scenarios identified but NOT turned into test cases" in Coverage Notes, and the loop ends.

Only after the loop completes, call the xlsx generation script. The xlsx reflects the post-loop test case set, including any cases added in the fill rounds.

### Handling user responses after a pause

When the user responds to a paused output, continue from section 4 without re-producing sections 1–3.

- **If user answers questions** → update Assumptions with their answers (noted inline — e.g. "Per user: UCID is alphanumeric, 10–20 chars"), then generate sections 4 and 5
- **If user says "proceed", "use those assumptions", "go ahead", "looks good"** → generate sections 4 and 5 using the assumptions as-is
- **If user corrects assumptions inline** (e.g. edits a list, says "change #3 to X") → apply the corrections, then generate sections 4 and 5
- **If user asks for clarification on a question** → answer conversationally, do not yet generate test cases

In all continuation cases, start the response with a brief one-line confirmation of what you're doing ("Proceeding with your confirmation…" / "Updated assumptions per your answers, generating test cases now…"). After drafting sections 4 and 5, run the **Step 2 gap verification loop** (above) before rendering the xlsx — the loop applies to continuations exactly as it does to full-pass runs.

**Category-scope overrides.** If the user's message contains instructions like "no negatives", "skip negative scenarios", "happy path only", "skip boundary", "don't create edge cases", or similar category-scoping phrases, omit the specified category from all output. Note the omission at the top of Coverage Notes (e.g. "Negative scenarios omitted per user instruction"). Apply the same rule to Enricher and Targeted workflows. Do not ask for confirmation — treat the instruction as definitive. If the UST itself triggers pattern-specific coverage in the omitted category, skip that too and note it in the relevant Pattern Checklist Status as "Omitted per user instruction" rather than "Not covered".

**Pattern detection is a required step.** Read `references/coverage-patterns.md` and identify which pattern or patterns the UST matches — REST API Endpoint, UI Feature, State-change Workflow, or Integration. Apply the relevant checklist(s). Multi-pattern USTs (e.g. a UI that calls an API) require multiple checklists applied in parallel. This is what stops the skill from shipping half-cooked output that silently misses standard coverage for the UST type. **Also run date-sensitive detection independently** — check whether the UST contains cut-off / deadline / expiry / "by the Xth" / calendar-based cues per the Date-sensitive Behaviour micro-pattern in `references/coverage-patterns.md`. If it does, apply that checklist IN ADDITION to the main pattern's checklist and include its Pattern Checklist Status in Coverage Notes alongside the main pattern's.

## Workflow: Planning only

Use when the user wants the plan but not yet the test cases.

Output sections 1, 2, and 3 only (Test Plan Summary, Clarifying Questions, Assumptions). Omit the test case table and coverage notes. Offer at the end: *"When you're ready, ask me to generate test cases from this plan."*

## Workflow: Enricher

Use when the user provides existing test cases and asks for review, enrichment, or gap-filling.

Look for and fix:

1. **Missing preconditions** — any test case with blank or "none" preconditions
2. **Vague steps** — generic verbs like "click login" or "enter details" that lack specificity
3. **Vague expected results** — outcomes like "works correctly" or "succeeds" instead of observable criteria
4. **Missing coverage** — scenarios that should exist but don't: negative variants of positive tests, boundary values on numeric fields, role/permission variants, session/state-dependent variants
5. **Pattern-specific coverage gaps** — if the test cases are for an API, UI, workflow, or integration, apply the appropriate checklist from `references/coverage-patterns.md` and fill gaps

For pattern detection: infer the pattern from the test cases themselves and any UST context provided in the conversation. If the test case IDs, titles, and content clearly indicate an API (HTTP methods, status codes, endpoint paths), apply the REST API checklist.

Output structure:

```
=== WHAT WAS MISSING OR VAGUE ===
- For each test case changed, one line: which test case, what was wrong, what you did

=== REVISED TEST CASES ===
Full table with edits applied, preserving original test case IDs where possible

=== NEW TEST CASES ADDED ===
Any new test cases created to fill coverage gaps, with brief rationale. 
If pattern-specific coverage was added, group by checklist category 
(e.g. "Added HTTP method validation: TC-XXX-016 to TC-XXX-019").

=== PATTERN CHECKLIST STATUS ===
(Only if a pattern was applied)
List each checklist category with ✅ / ⚠️ / ❌ / N/A as per 
coverage-patterns.md format. This closes the loop on the enrichment.
```

Preserve the original test case IDs and only assign new IDs to genuinely new test cases.

## Workflow: Targeted

Use when the user asks for a specific subset.

Produce only what was asked for. Match the section format from the full pipeline but drop everything else. Examples:

- *"Give me 5 more edge cases for TC-LOGIN-007"* → just the edge case scenarios and their test cases, no plan
- *"What should I ask the PO?"* → just the Clarifying Questions section
- *"What negative tests am I missing?"* → just the negative scenarios

Keep responses tight. Don't pad with plan sections the user didn't request.

## Workflow: Follow-up

Use when the user is continuing from a prior output in the same conversation.

Do not repeat sections that have already been produced in the chat. Instead:

- Reference prior test case IDs ("Updating TC-LOGIN-005 as you asked")
- Show only the delta (new or changed test cases, new scenarios, answers to new questions)
- Preserve the Techlogix format for any new test cases

## Quality checks (always run these before producing final output)

Before showing test cases to the user, internally verify:

- [ ] Every test case has a non-blank, specific Preconditions value
- [ ] Every Expected Result is observable (would pass a "can a tester verify this with their own eyes" check)
- [ ] Test case IDs follow the `TC-[FEATURE]-[NNN]` convention and are unique
- [ ] No Given/When/Then syntax anywhere in test case content
- [ ] Test data is synthetic (no realistic-looking real names, real emails, real identifiers)
- [ ] Cross-reference against the UST's Technical Notes — no test cases reference features, endpoints, or buttons the Technical Notes don't mention
- [ ] **Every test case has an assigned Category** (Happy Path / Negative / Boundary / Edge) used for grouping — even though Category is not a visible column
- [ ] **xlsx Sheet 1 is grouped by Category** — rows sorted Happy Path → Negative → Boundary → Edge, with a coloured group-header row before each section showing the category name and case count. No Category column in the data rows.
- [ ] **Pattern detection applied** — if the UST matches a pattern in `references/coverage-patterns.md`, the corresponding checklist has been applied and the Pattern Checklist Status is in Coverage Notes
- [ ] **No either-or expected results** — if a test case says "returns 400 or 404," split it into two test cases or clarify the expected behaviour upfront (belongs in Clarifying Questions instead)

If any check fails, fix internally before outputting.

## Working with Atlassian MCP

If the user mentions a ticket ID and Atlassian MCP is available:

1. Fetch the ticket via MCP first
2. If the ticket references linked Confluence pages, read those too
3. Confirm briefly: *"Fetched INST-1234 from Jira and read the linked Confluence page. Running the full pipeline now…"*
4. Proceed with the appropriate workflow

If MCP isn't available or fails, fall back gracefully: *"I couldn't fetch the ticket via MCP. Paste the UST directly and I'll work through it."*

## Pitfalls to avoid

**Don't produce generic test cases.** Every test case should reference specific details from the UST — actual button names, actual URL paths, actual field names. Generic test cases ("Verify user can log in") are a failure mode; specific test cases ("Verify user is redirected to /portal/dashboard after submitting valid credentials on /portal/login") are the goal.

**Don't paraphrase the UST.** When the UST specifies an outcome using particular phrasing — phrases in quotes, explicit "System Response" or "Displays…" text, specific validation messages, button or field labels — use that wording verbatim in the test case. Observable detail is added *alongside* UST phrasing, not as a replacement. Example: if the UST says *"Displays interface to propose names"*, the Expected Result says *"System displays the interface to propose names. Form fields for 1st/2nd/3rd Proposed Name and Meaning/significance are visible. URL is /name-proposal."* — NOT a rewritten version that loses the UST phrase. This matters especially for regulated-domain clients who review test cases against UST text for traceability.

**Don't invent features.** If the UST doesn't mention a feature, don't test for it. If you notice a likely-missing feature (e.g. UST says "login" but doesn't mention "remember me"), raise it as a Clarifying Question — don't generate test cases for it.

**Don't skip preconditions.** This is the #1 gap in AI-generated test cases. Every test case needs explicit Preconditions. If a test case has no meaningful preconditions, ask yourself whether it really stands alone or depends on something.

**Don't over-pad the output.** If the user asked for "just edge cases," don't give them a full plan. Respect the scope of the ask.

**Don't hallucinate test case IDs in follow-ups.** When referencing prior test cases, only use IDs that actually appeared earlier in the conversation.

## For more detail

See `references/techlogix-standards.md` for the full QA standards reference (format rules, naming conventions, data handling rules).
See `references/examples.md` for worked examples of each workflow.
See `references/coverage-patterns.md` for pattern detection and per-pattern coverage checklists. **Read this before producing output on any UST where pattern detection is ambiguous.**
See `references/generate_xlsx.md` for the xlsx export specification and the Python script to generate files.
See `references/obdx-format.md` for the **OBDX Trade Finance extended 11-column format** used in `data/manual-test-cases.xlsx`. **Use this format (not the 6-column Techlogix default) when the user asks to write test cases for any HBL OBDX module — Initiate/Amend/Transfer LC, Bank Guarantees, Collections, etc. — or to append to the OBDX manual-test-cases workbook.**

---

## Handoff to automation

After producing the final test case table, always append this prompt at the end of your response:

> **Ready to automate?** Say "automate these" or "write the Playwright scripts" and the playwright-script-writer skill will convert the test cases above into runnable `.spec.ts` files.

Do not begin writing Playwright code yourself — that is the playwright-script-writer skill's responsibility. Your output (the test case table) is the input contract for that skill. See `skills/pipeline.md` for the full pipeline definition and the handoff contract between the two skills.


---

## 4. QA test case writer skill — coverage-patterns.md

_Source: `.claude/skills/qa-test-case-writer/coverage-patterns.md`_

# Coverage Patterns — Reference

Pattern detection and per-pattern coverage checklists. Use this file to ensure test case coverage matches the kind of UST being tested, so that API USTs don't miss HTTP-contract tests, UI USTs don't miss accessibility tests, workflow USTs don't miss invalid state transitions, and integration USTs don't miss failure modes.

## How to use this file

Before finalising test cases in the Full Pipeline, Enricher, or Targeted workflows, run pattern detection on the UST:

1. Read the pattern detection cues below
2. Identify which pattern (or patterns — a UST can match more than one) applies to the current UST
3. For each matched pattern, apply the **Standard Coverage Checklist** for that pattern
4. If a checklist item is already covered by test cases you generated, skip it
5. If a checklist item is not covered AND is applicable given the UST details, generate test cases for it
6. If a checklist item is not applicable to this specific UST, note it in Coverage Notes as "Not applicable: [reason]"

If the UST doesn't clearly match any pattern, fall back to general coverage (positive, negative, boundary, edge) without pattern-specific additions — but note this in Coverage Notes so the user knows to review extra carefully.

**Do not force a pattern if the UST doesn't match.** It's better to produce a leaner output with general coverage than to pad with irrelevant pattern-specific test cases.

**Multi-pattern USTs are common.** A "patient books appointment via web form that calls the booking API" UST is both UI and API. Apply both checklists; explicitly scope which test cases address which layer.

---

## Pattern 1: REST API Endpoint

### Detection cues

A UST matches this pattern if it contains any of:

- HTTP method + path (e.g. `GET /identity/{ucid}`, `POST /appointments`, `PUT /users/{id}`)
- Mention of RAML, OpenAPI, Swagger, or API specification files
- Mention of endpoint, route, path parameter, query parameter, request body, response body
- Mention of HTTP status codes (200, 201, 400, 401, 404, 500, etc.)
- Mention of stored procedures called from API layer, database access via API
- Mention of bearer tokens, API keys, OAuth scopes, mTLS at the API layer
- System/service names ending in `-api`, `-service`, or similar (e.g. `sys-api-identity`)
- Headers, content types, response formats (JSON, XML, protobuf)

If two or more cues are present, the UST is a REST API endpoint.

### Standard Coverage Checklist

**A. Happy path — per resource type**
- Valid request returns expected status (usually 200, 201 for POST, 204 for DELETE) with expected body
- If the endpoint returns different response shapes based on resource type, one test case per type

**B. HTTP method validation**
- Unsupported methods on the same path return **405 Method Not Allowed**
- Example: for GET /identity/{ucid}, test POST/PUT/DELETE/PATCH on same path — all should return 405

**C. Path parameter validation**
- Non-existent resource → 404
- Malformed parameter → 400 (specific assertion, not "400 or 404")
- Empty/missing path segment → 404 route not matched
- Case sensitivity (same identifier in different cases: same result or different?)
- URL encoding edge cases (`%20`, `+`, `/`, `#`, trailing slashes)
- Very long parameter values — at least one test probing for 414 URI Too Long

**D. Query parameter validation (if applicable)**
- Required query params missing → 400
- Unexpected/unknown query params → 400 or ignored (test actual behaviour)
- Query param with invalid type → 400

**E. Request body validation (for POST/PUT/PATCH)**
- Missing required fields → 400 with specific error
- Extra/unknown fields → 400 or ignored (test actual behaviour)
- Invalid field types → 400
- Empty request body → 400
- Malformed JSON/XML → 400

**F. Header handling**
- Valid Accept header returns matching Content-Type
- Unsupported Accept header → 406 Not Acceptable
- Missing Content-Type on POST/PUT/PATCH → 415 or 400
- Case-insensitive header name matching

**G. Authentication & authorisation**
- Missing auth header → 401
- Invalid/malformed auth token → 401
- Expired token → 401
- Valid token for different user/tenant accessing another user's resource → 403
- Role-based access differences (if roles are defined)

**H. Response contract validation**
- Response body validates against the published schema (RAML/OpenAPI/Swagger)
- Required fields present on 2xx responses
- Error body structure consistent on 4xx/5xx responses
- If spec includes examples, examples pass schema validation

**I. Downstream dependency failure**
- Backing database unreachable → 500 with safe error message (no DB internals leaked)
- Backing service timeout → 504 or 500
- Stored procedure error → 500
- Explicit assertion: no sensitive error details leaked

**J. Performance / SLA**
- At least one response-time assertion. If the UST doesn't specify an SLA, raise as a Clarifying Question AND still include a baseline with a reasonable default (e.g., 1s for simple lookups, 3s for complex aggregations).

**K. Idempotency & consistency**
- GET: repeated calls return identical results
- PUT: repeated identical calls have identical effect
- DELETE: repeated calls after first success return 404 or 204 consistently
- Concurrent requests for same resource: consistent responses

**L. Audit / observability**
- Successful access generates audit log with caller identity, resource accessed, timestamp
- Failed access attempts are logged
- For confidential domains (healthcare, finance, identity) — mandatory; if not in UST, raise as CQ

**M. Injection & security hardening**
- Parameters with SQL-like characters (`'`, `;`, `--`, `/*`) safely handled
- Path traversal attempts (`../`) rejected
- XSS payloads in string fields escaped on response (if rendered anywhere)

**N. Caching behaviour (if applicable)**
- Caching headers (Cache-Control, ETag, Last-Modified) honoured if set
- After data change, cache serves fresh data (or correctly serves stale per design)

### Coverage expectations

Typical: 20–35 test cases. Below 15 likely means gaps. Above 40 likely means consolidating opportunities.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"REST API Pattern Checklist Status"** listing each category A–N with:
- ✅ Covered by TC-XXX-NNN (list IDs)
- ⚠️ Partially covered — [what's missing]
- ❌ Not covered — [reason]
- N/A — [reason]

---

## Pattern 2: UI Feature

### Detection cues

A UST matches this pattern if it contains any of:

- User-facing language ("as a user", "patient sees", "dispatcher clicks", "displays")
- Screen, page, form, button, modal, dialog, dropdown, tooltip, menu
- URL paths that serve HTML views (not API routes) — e.g. `/portal/dashboard`, `/login`
- Field validation language (required, min length, max length, format)
- Visual outcomes — redirect, display, show, hide, enable, disable, highlight
- Browser behaviour — back button, refresh, session, cookie, tab
- Responsive, mobile, tablet, desktop
- Keyboard, screen reader, accessibility, ARIA, WCAG

If two or more cues are present, the UST is a UI feature.

### Standard Coverage Checklist

**A. Happy path**
- Primary user flow completes successfully
- Observable outcome: URL change, visible UI state, data persistence confirmed on reload
- All success-state UI elements render (confirmations, indicators, data displays)

**B. Form field validation (if forms are present)**
- Required fields: blank submission → blocked with specific error near field
- Min/max length: at, below, and above the limits
- Format validation: invalid inputs for typed fields (email without @, phone with letters, etc.)
- Character encoding edge cases (emoji, RTL scripts, very long strings)
- Paste behaviour (especially for password fields with show/hide toggles)
- Whitespace handling (leading/trailing trim behaviour)

**C. Authorisation & visibility**
- Page accessible to authorised user role → renders correctly
- Page accessed by unauthorised role → redirect or 403 page
- Page accessed when logged out → redirect to login
- Conditional UI elements (admin-only buttons, etc.) visible only to appropriate roles

**D. State & session**
- Session expiry during page interaction → redirect or warning modal
- Browser back button after action → expected state (not resubmission or stale data)
- Browser refresh preserves expected state (form values / scroll position / selected tab per design)
- Multiple tabs: action in one tab reflects in others (or doesn't, per design)

**E. Loading, error, and empty states**
- Loading indicator while async operations run
- Network error during async operation → user-visible error, retry option if applicable
- Empty-data state (no results, no appointments, no records) → designed empty message, not broken UI
- Partial data / slow API → graceful degradation, not blank page

**F. Responsive / multi-device**
- Mobile viewport (≤ 480px): layout reflows, no horizontal scroll, touch targets ≥ 44px
- Tablet viewport (768–1024px): layout intermediate
- Desktop (≥ 1280px): layout as designed
- Portrait/landscape orientation on mobile

**G. Cross-browser**
- Chrome (primary)
- Firefox
- Safari (if macOS/iOS users in scope)
- Edge
- Note: document the browser matrix agreed with the team; if not defined, raise as CQ

**H. Accessibility (WCAG 2.1 AA minimum)**
- Keyboard-only navigation: all interactive elements reachable via Tab
- Focus indicators visible on all interactive elements
- Screen reader: labels announced correctly, form fields have accessible names, error messages announced
- Colour contrast: text meets 4.5:1 ratio (3:1 for large text)
- No information conveyed by colour alone
- ARIA attributes used correctly where applicable
- Heading hierarchy (h1 → h2 → h3) is logical

**I. Visual regression**
- Component renders consistently with design spec (usually a visual QA step, not a functional test — but flag in Coverage Notes)
- Fonts, spacing, colours match design system

**J. Error recovery**
- Validation errors clear on correction (don't persist after the user fixes the issue)
- Form data preserved if submission fails (user doesn't lose their work)
- Destructive actions have confirmation (delete, cancel, logout)

**K. Performance**
- Initial page load time under threshold (e.g. LCP < 2.5s for good UX)
- Interaction responsiveness (INP < 200ms)
- If the UST doesn't specify, include a baseline and raise as CQ

**L. Content & localisation**
- All user-facing strings externalised (not hardcoded) if product supports multiple languages
- Long translated strings don't break layout
- Date/time/number formats respect locale

**M. Privacy & confidential data**
- Password fields masked by default, show-password toggle works
- Sensitive data (SSN, MRN, card numbers) masked in displays where appropriate
- Data doesn't appear in browser history / URL params when sensitive
- No PII logged to browser console

### Coverage expectations

Typical: 20–35 test cases. Accessibility coverage alone often adds 5+ dedicated test cases.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"UI Feature Pattern Checklist Status"** listing A–M.

---

## Pattern 3: State-change Workflow

### Detection cues

A UST matches this pattern if it contains any of:

- State names or statuses (Draft, In Progress, Completed, Cancelled, Approved, Rejected, Active, Inactive)
- Language about status transitions ("moves from X to Y", "can only be edited while…", "cannot be changed once…")
- Role-specific permissions ("paramedic can edit", "dispatcher can view", "supervisor can override")
- Audit trail / audit log / history / change log
- Real-time sync, propagation, notification on change
- Concurrent actor scenarios (multiple users on same resource)
- Time-based automatic transitions (auto-cancel after 24h, auto-archive after 30d)
- Approval workflows, review workflows, escalation

If two or more cues are present, the UST is a state-change workflow.

### Standard Coverage Checklist

**A. Happy path — per valid transition**
- Each allowed transition triggered by correct role → succeeds and state updates
- Post-transition observable state (UI shows new status, DB row updated, events fired)

**B. Invalid transitions**
- Every disallowed transition attempted → rejected with specific error
- E.g. if valid is `In Progress → Completed`, test `Completed → In Progress` (reverse not allowed)
- Test that bypass attempts via direct API calls are also rejected (not just UI-blocked)

**C. Role-based access**
- Each role that SHOULD be able to perform an action → succeeds
- Each role that should NOT → rejected with 403 / unauthorised error
- Privilege escalation attempts (lower-priv user crafting request as higher-priv) → rejected
- For each transition, test at least one authorised and one unauthorised role

**D. Assignment / ownership**
- Only the assigned actor can perform the restricted action (e.g. only the paramedic assigned to an incident can edit it)
- Un-assigned user attempting same action → rejected
- Re-assignment mid-workflow: old assignee loses access, new assignee gains it

**E. Audit history**
- Every state change generates an audit log entry with: actor, timestamp, previous value, new value, reason (if applicable)
- Audit entries immutable (cannot be edited or deleted by normal users)
- Audit entries visible to appropriate roles (usually includes supervisors)

**F. Real-time sync / propagation**
- Change by one actor visible to other actors within the specified SLA (e.g. 5 seconds)
- WebSocket/polling mechanism tested for correctness
- Network interruption during sync → recovery on reconnect, no lost updates

**G. Concurrent actors**
- Two users editing same resource simultaneously → last-write-wins or optimistic locking behaviour per design
- Conflict detection (if optimistic locking): second user sees conflict error, not silent overwrite
- Reading while another user edits: reader sees consistent state (pre-edit or post-edit, not partial)

**H. Time-based transitions (if applicable)**
- Automatic transitions fire at correct time
- Manual intervention before auto-transition preserves manual action
- Clock skew / timezone handling: transitions based on server time, not client time

**I. Approval / review flows (if applicable)**
- Submission → pending approval state
- Approval by authorised role → moves to next state
- Rejection by authorised role → moves to rejected state with reason required
- Re-submission after rejection → returns to pending
- Approver cannot approve own submission (separation of duties)

**J. Data integrity across transitions**
- Required fields per state: transition blocked if required fields for target state are missing
- Immutable fields after transition: fields locked after state X cannot be edited
- Dependent records: cascade updates / deletes work correctly per design

**K. Notifications**
- State change triggers expected notification (email, push, in-app)
- Notification sent to correct parties (assigned, watchers, supervisors)
- Notification content includes correct state and context
- Notification deduplication if rapid transitions occur

**L. Override & exception paths**
- Supervisor override of normal rules (e.g. edit after Completed) → allowed with extra authentication / reason capture
- Override generates distinct audit entry flagged as an override
- Override cannot bypass legally-required holds (if applicable)

**M. Observable outcomes per state**
- For every state, a test confirming the observable indicators: UI badge, DB row value, API response field, downstream event

### Coverage expectations

Typical: 25–40 test cases. State-change workflows have more combinatorial coverage than simple features.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"State-change Workflow Pattern Checklist Status"** listing A–M.

---

## Pattern 4: Integration

### Detection cues

A UST matches this pattern if it contains any of:

- Third-party service names (Salesforce, Stripe, Twilio, SendGrid, etc.)
- Integration, webhook, callback, event, message queue
- MCP (Model Context Protocol) tool calls, connector
- Sync, replication, data feed, nightly job, batch
- File transfer (SFTP, S3, FTP)
- Enterprise service bus, middleware, Mulesoft, ESB
- Retry, circuit breaker, dead letter queue, timeout, backoff
- Transformation, mapping, ETL

If two or more cues are present, the UST is an integration.

### Standard Coverage Checklist

**A. Happy path — full round trip**
- Message/call from source arrives at destination intact
- Data transformed correctly at each hop (schema mappings, unit conversions, timezone)
- Acknowledgements / confirmations returned to source where expected

**B. Source → destination schema mapping**
- All required fields mapped correctly
- Optional fields handle both present and absent cases
- Default values applied correctly when source doesn't provide
- Unknown source fields handled per design (ignored, logged, or rejected)

**C. Data type & format handling**
- Dates/times across timezones (source in UTC, destination in local, or vice versa)
- Numeric precision (source float → destination decimal with correct rounding)
- String encoding (UTF-8, special characters, emoji)
- Null vs empty string vs missing — each handled distinctly

**D. Authentication & credentials**
- Valid credentials → successful connection
- Expired credentials → graceful failure with clear error, retry after refresh
- Revoked credentials → immediate failure, no silent retries
- Credential rotation (old and new valid during grace period)

**E. Network & transport failures**
- Destination unreachable → retry per policy, escalation on repeated failure
- Timeout during call → retry with backoff, idempotency respected
- Partial delivery / connection drop mid-payload → recovery or clean failure
- DNS failure, TLS handshake failure, certificate expiry

**F. Rate limiting & throttling**
- Within rate limit → normal behaviour
- At rate limit → throttle respected, requests queued or delayed
- Exceeds rate limit → 429 response handled, backoff applied
- Burst handling if applicable

**G. Retry logic**
- Retryable errors (5xx, timeouts) trigger retry per config
- Non-retryable errors (4xx) do NOT retry — fail fast
- Max retry count respected, no infinite loops
- Exponential backoff timing correct

**H. Idempotency**
- Duplicate message delivery → destination processes once (if idempotent)
- Idempotency key mechanism works if implemented
- If not idempotent, duplicate detection alert/log generated

**I. Dead letter / error queue**
- Messages that fail all retries land in DLQ with full context (payload, error, attempts)
- DLQ alerts trigger per config
- DLQ reprocessing after fix works correctly

**J. Circuit breaker (if applicable)**
- Open circuit → fast-fail with specific error, no overload on failing downstream
- Half-open state → probe requests, close on success, re-open on continued failure
- Metrics emitted for circuit state changes

**K. Ordering & consistency**
- Messages delivered in correct order where required (or documented as not required)
- Out-of-order delivery handled if it can occur
- Eventual consistency windows respected (don't assert immediately after async writes)

**L. Batch / bulk operations (if applicable)**
- Large batches: all records processed
- Batch failures: partial success semantics (per design — all-or-nothing vs best-effort)
- Batch size limits: at, below, and above the limit

**M. Monitoring & observability**
- Success/failure metrics emitted to monitoring system
- Correlation IDs propagate end-to-end for traceability
- Log entries contain enough context to debug (request ID, timestamps, source/dest)
- Alerts fire on elevated failure rates

**N. Data privacy across boundary**
- Only necessary fields cross the integration boundary (no over-sharing)
- PII / confidential fields encrypted in transit (TLS) and at rest (if persisted)
- Logs don't contain sensitive payload content
- Data retention at destination respects source policies

**O. Replay & reconciliation**
- Historical replay for recovery works (e.g. after destination outage)
- Reconciliation check detects discrepancies between source and destination
- Manual repair tools work (if applicable)

### Coverage expectations

Typical: 25–40 test cases. Integrations require extensive failure-mode coverage — easily under-tested.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"Integration Pattern Checklist Status"** listing A–O.

---

## Cross-cutting micro-pattern: Date-sensitive behaviour

Some USTs contain cut-off, deadline, expiry, or calendar-based logic that needs explicit boundary coverage **regardless of which main pattern(s) apply**. Apply this micro-pattern IN ADDITION to the main pattern checklist(s) — not instead of.

### Detection cues

A UST needs this micro-pattern if it contains any of:

- "by the Xth of [the month / the following month]"
- "within N days", "after N days"
- "cut-off", "deadline", "expires after", "auto-cancelled after", "auto-released after"
- Specific calendar references (15th, end of month, end of quarter, fiscal year end)
- SLA windows defined in calendar days or business days
- Any rule whose correctness depends on clock or calendar state (monthly cycles, billing periods, reporting windows, reservation windows)

If any cue is present, apply the checklist below. If the UST's date logic is only incidental (e.g. a timestamp is stored but no behaviour depends on it), skip this micro-pattern.

### Classify the cut-off type first

Before applying the checklist, determine which kind of cut-off this UST uses:

- **Calendar-anchored cut-off** — absolute date reference: *"by the 15th of the following month"*, *"end of quarter"*, *"before 31 March"*, *"fiscal year end"*. Month length matters because different creation months produce different cut-off dates.
- **Rolling-window cut-off** — elapsed time from an event: *"within 7 days of submission"*, *"24 hours after approval"*, *"30 days from last access"*. Month length mostly doesn't matter because the math is timestamp + N.

Some USTs mix both (e.g. *"within 30 days, but not later than 31 December"*). Apply both lenses in that case.

State the cut-off type at the top of the Date-sensitive Behaviour Checklist Status (e.g. *"Cut-off type: rolling-window (7-day payment window)"*).

**Applicability in the checklist below:**
- Items A, B, E, F, G, H apply to **both cut-off types**.
- Items C and D apply **primarily to calendar-anchored cut-offs**. For rolling windows most C/D sub-items are N/A, EXCEPT that at least one rolling-window test should cross a month boundary and one should cross the leap-year boundary — the date-arithmetic library handling these transitions is a classic bug site, so even rolling windows need 1–2 tests in this area.
- Item I applies only when the UST specifies business days.

When an item is N/A due to cut-off type, mark it **N/A** with the reason (*"N/A — rolling-window cut-off, no creation-month dependency"*). Do not mark it ❌ — this is not a gap, it's out of scope for the cut-off type in use.

### Standard Coverage Checklist

**A. Immediately before the boundary**
- Action one day before cut-off → succeeds
- Action at start / middle / end of the cut-off day itself → succeeds on all three

**B. Immediately after the boundary**
- Action at 00:00:00 on the day after cut-off → blocked with the UST-specified error message (use UST wording verbatim)
- Action mid-day on the day after cut-off → blocked
- Action at 23:59 on the day after cut-off → blocked

**C. Creation date vs action date edge cases**
- Item created on the 1st of a month and one created on the last day of the same month → same cut-off
- Item created at 23:59 on the last day of the month → cut-off falls in the following month (not two months away)

**D. Month length variations** *(each tested as the creation month)*
- 28-day month (February non-leap)
- 29-day month (February leap year)
- 30-day month (April, June, September, November)
- 31-day month
- Each should produce the correct following-month cut-off

**E. Year rollover**
- Item created in December, cut-off falls in January of the following year
- Verify date logic handles the year change correctly — this is a common bug site

**F. Stale beyond one cycle**
- Item from 2+ months before current date — blocked, or purged per policy
- Item from 6+ months ago (long-stale) — handled per policy, no crashes or stack traces

**G. Timezone**
- Which clock defines the boundary — server, user, specific region (e.g. PKT for Techlogix clients)
- Cross-timezone test: user in TZ A, server in TZ B, action at exactly the boundary second
- If the UST doesn't specify, raise as a Clarifying Question AND pick one (usually server time) for the baseline tests

**H. Client-vs-server clock skew**
- Action submitted from client before cut-off, arrives at server after → honoured or blocked per design (server clock usually wins)
- Action submitted from client after cut-off but server clock lags → blocked per server clock

**I. Business day vs calendar day distinction** *(only if UST specifies business days)*
- Weekend handling: Saturday cut-off — rolls to Monday, or holds?
- Public holiday handling

### Coverage expectations

Typical: 8–15 additional test cases on top of the main pattern's checklist. These spread across Boundary (most) and Negative (the "blocked after cut-off" cases) categories.

### Mandatory Pattern Checklist Status

When this micro-pattern is applied, Coverage Notes must include a **"Date-sensitive Behaviour Checklist Status"** sub-section listing A–I with ✅ / ⚠️ / ❌ / N/A, alongside the main pattern's checklist status.

---

## Multi-pattern USTs

Many real USTs match more than one pattern. Handle these by:

1. **Apply every matching pattern's checklist.** Don't pick one and skip others.
2. **Scope test cases by layer.** A single UST like "patient books appointment via web form that POSTs to the booking-api" should produce test cases explicitly scoped to the UI layer (e.g. TC-BOOK-UI-001) and the API layer (e.g. TC-BOOK-API-001). Use the layer suffix in the ID to keep them visually distinct.
3. **Consolidate when honest.** If a test case is genuinely testing end-to-end (UI submission all the way to API response), it can cover one item from each pattern's checklist. But only if it genuinely validates both layers observably.
4. **Report both checklists in Coverage Notes.** Include Pattern Checklist Status for every pattern applied.

### Example

UST: *"Add an Appointment Booking form on /portal/book. Submit calls POST /appointments. On 200, show confirmation and redirect to /portal/appointments. On error, show error inline."*

Matches: UI Feature (form, URL paths, submit, redirect, inline error) AND REST API Endpoint (POST /appointments, 200, error). Apply both.

Scope:
- TC-BOOK-UI-001 through TC-BOOK-UI-015 — form, validation, redirect, error states, accessibility
- TC-BOOK-API-001 through TC-BOOK-API-020 — POST contract, 400/401/409 cases, idempotency, SLA
- 3–5 end-to-end test cases spanning both layers (submitting the form and verifying the API was called correctly)

Coverage Notes ends with *both* "UI Feature Pattern Checklist Status" AND "REST API Pattern Checklist Status".

---

## Pattern matching examples

**Example 1 — REST API only:**

UST: *"We're adding a new GET endpoint `/identity/{ucid}` on sys-api-identity..."*

Apply REST API checklist only.

**Example 2 — UI Feature only:**

UST: *"As a returning patient, I want to log in to the patient portal using my email and password..."*

Apply UI Feature checklist only.

**Example 3 — State-change Workflow only:**

UST: *"A paramedic updates an incident report mid-flow. Status transitions: In Progress → Completed. Dispatcher view syncs in real time..."*

Apply Workflow checklist only.

**Example 4 — Integration only:**

UST: *"Nightly sync from Billing system to Salesforce. Failed records go to DLQ..."*

Apply Integration checklist only.

**Example 5 — Multi-pattern (UI + API):**

UST: *"Add an Appointment Booking form that calls POST /appointments..."*

Apply both. Scope test case IDs by layer (TC-BOOK-UI-001 vs TC-BOOK-API-001).

**Example 6 — Multi-pattern (API + Workflow):**

UST: *"Expose PUT /incidents/{id}/status to change incident status. Paramedic can only transition In Progress → Completed..."*

Apply both REST API and State-change Workflow checklists.

**Example 7 — Multi-pattern (UI + Workflow):**

UST: *"Dispatcher can assign an incident to a paramedic from the dispatch board. Assigned paramedic sees new incident on their screen within 5 seconds..."*

Apply both UI Feature (board UI, viewport behaviour) and Workflow (assignment, real-time sync, roles).

---

## When to ask before applying

If a UST contains cues for a pattern but is sparse on details (like the sys-api-identity UST where the attachment was missing), **apply the checklist but be honest about what you can and can't assert.** Don't invent schema details or UI specs. Flag gaps as Clarifying Questions or in Coverage Notes.

If pattern detection is genuinely ambiguous (a UST could be read as API or Integration, or as UI or Workflow), briefly ask the user which scope they want before proceeding. Better a 10-second clarification than a 30-test-case output in the wrong direction.


---

## 5. QA test case writer skill — techlogix-standards.md

_Source: `.claude/skills/qa-test-case-writer/techlogix-standards.md`_

# Techlogix QA Standards — Reference

Full reference for test case format, naming conventions, and data handling rules used by the Techlogix QA team working on the instED programme.

## Test case table format

Every test case produced must use exactly this column structure:

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |

### Column rules

**Test Case ID**

- Format: `TC-[FEATURE]-[NNN]`
- `TC-` is a literal prefix (always uppercase)
- `FEATURE` is a short uppercase identifier derived from the feature being tested. Common examples:
  - `TC-LOGIN-001` — login-related test cases
  - `TC-PROFILE-001` — user profile test cases
  - `TC-APPT-001` — appointment booking
  - `TC-INCIDENT-001` — incident report
  - `TC-DISPATCH-001` — dispatcher workflows
- `NNN` is a zero-padded 3-digit sequence number starting at 001
- IDs must be unique within a test case set
- When enriching existing test cases, preserve original IDs. Only assign new IDs to net-new test cases.

**Test Title**

- Short description of *what* is being tested (the action or scenario)
- NOT the expected outcome
- Good: "Valid credentials login"
- Good: "Login with email containing special characters"
- Bad: "User successfully logs in" (that's the outcome, not the test)
- Bad: "Login test" (too generic)

**Preconditions**

- Required on every test case. Never blank, never "none".
- Must specify what state the system must be in before the test can run
- Include:
  - User role / permissions if relevant
  - Data that must exist in the database
  - Environment flags or feature toggles
  - External system state (integrations up, mocks in place, etc.)
  - Browser, device, or network conditions if they affect the test
- Good: "Registered patient account exists with email `test.patient@example.com`. Account is in Active status. Patient portal is accessible."
- Bad: "User exists"

**Test Steps**

- Numbered list (1, 2, 3…)
- Each step must be specific and actionable
- Include *what* to click, *where* it is, and *what* data to enter
- Good:
  1. Navigate to `/portal/login`
  2. Enter `test.patient@example.com` in the Email field
  3. Enter `TestPass!2024` in the Password field
  4. Click the "Log In" button in the top-right of the form
- Bad:
  1. Go to login page
  2. Enter credentials
  3. Click login

**Expected Result**

- Must be observable — a tester must be able to verify it with their own eyes, or with a deterministic check
- Include concrete UI indicators, URL paths, data changes, or API responses
- Good: "User is redirected to `/portal/dashboard`. The header displays the logged-in user's first name. The 'Last login' timestamp in the profile dropdown updates to the current time."
- Bad: "Login works"
- Bad: "User can access dashboard" (what does "can access" mean observably?)

**UST wording preservation (applies to Expected Result, and also to Preconditions and Test Steps where relevant)**

Where the UST provides specific language for what happens — phrases in quotes, text labelled "System Response" or "Displays…", validation message text, button or field labels — that language must appear in the test case verbatim. Augment with observable detail (URL, visible UI state, data changes) but do not replace the UST phrase with rephrased prose.

- Good:
  - *UST: "Displays the Company Type page"*
  - *Expected Result: "System displays the Company Type page. URL navigates to /company-type. Definition, overview, basic requirements, fee structure, and documentary requirements sections are visible."*
- Bad:
  - *Expected Result: "The Company Type guidance page for Section 42 is shown, including all required informational sections for the user."*
  - *(Loses the UST phrase "Displays the Company Type page" — traceability back to the UST is broken.)*

The same rule applies to Preconditions and Test Steps where the UST supplies specific phrasing for user actions (e.g. UST says "Applicant clicks 'Proceed'" → the Test Step uses "Click 'Proceed'", not "Advance to next section"). This matters for every project but especially for regulated-domain clients, who review test cases against UST text for traceability and compliance evidence.

**Category**

- Assigned to every test case internally but is **not** a visible column in the output. Category drives the grouping structure in the xlsx and Markdown output.
- Must be one of four values:
  - **Happy Path** — valid inputs, correct preconditions, expected successful outcome
  - **Negative** — invalid inputs, missing mandatory fields, unauthorised access, blocked actions
  - **Boundary** — at, just below, or just above a defined numeric or time limit (character counts, thresholds, SLA windows, similarity percentages)
  - **Edge** — unusual but reachable conditions: mid-flow state changes, concurrent actors, integration failures, data-wipe triggers, PIN invalidation after edits
- When in doubt between Negative and Edge: if a tester could trigger it with a simple invalid input, it's Negative. If it requires a specific sequence of valid actions or an environmental condition, it's Edge.

**Status**

- Defaults to "Not Executed" on all newly generated test cases
- Values: "Not Executed", "Passed", "Failed", "Blocked", "Skipped"
- For AI-generated output, always use "Not Executed"

## Syntax and format rules

**Never use Given/When/Then.** That's Cucumber `.feature` file syntax, which is a separate artefact used in Week 4 onward for automation. Test cases use the table format exclusively.

**Tables in Markdown.** When output renders as Markdown, use pipe-separated tables with the original 6 columns. Group test cases under bold category headings (e.g. `**Happy Path**`) rather than adding a column.

**Test cases in xlsx are grouped by Category — no Category column.** Within Sheet 1, rows are sorted Happy Path → Negative → Boundary → Edge. A coloured group-header row precedes each section showing the category name in ALL CAPS and the case count (e.g. `HAPPY PATH  (28 test cases)`). The group header provides all the visual categorisation — there is no separate Category column in the data rows. Colour coding for group-header rows: Happy Path = `#B8D9AF`, Negative = `#F0AAAA`, Boundary = `#FFE380`, Edge = `#A8C8F0`.

**One test case per row.** Do not combine multiple scenarios into one test case. If a test has conditional branches ("if A happens, verify X; if B happens, verify Y"), split it into separate test cases.

## Data handling rules

**Synthetic data only.** Never paste real patient data, real credentials, real identifiers, real medical record numbers, or real names of people or organisations into prompts or test cases.

**Synthetic data patterns:**

- Names: use clearly fake but realistic-feeling names (`Test Patient`, `Sample User`, `Demo Paramedic`)
- Emails: use `@example.com` domain (`test.patient@example.com`, `demo.admin@example.com`)
- Phone numbers: use `555` prefix
- Medical Record Numbers: use a fake prefix like `TEST-MRN-` or `DEMO-`
- Dates of birth: use obviously synthetic dates (`1990-01-01`)

**Domain flexibility.** The synthetic-data rule applies to any confidential domain — healthcare, finance, PII-containing systems. It's not HIPAA-specific; treat it as a general practice.

## Coverage expectations

A good test case set for a typical UST includes, at minimum:

- **Positive scenarios** — the happy path for each acceptance criterion
- **Negative scenarios** — what happens when inputs are invalid, missing, or malformed
- **Boundary scenarios** — exactly at the limits (minimum/maximum values, edge of allowed ranges)
- **Edge scenarios** — unusual but possible conditions (concurrent sessions, network interruption, permission changes mid-flow)

For features with state transitions, roles, or permissions, additional coverage categories apply:

- **Role-based variants** — same action attempted by different user roles
- **Invalid state transitions** — attempting actions when the system is in a state that should prevent them
- **Concurrent actor scenarios** — multiple users acting on the same resource

## Acceptance criteria mapping

Every acceptance criterion in the UST should be covered by at least one test case. When producing Coverage Notes, include a brief mapping:

```
AC #1 covered by: TC-LOGIN-001, TC-LOGIN-002, TC-LOGIN-005
AC #2 covered by: TC-LOGIN-003, TC-LOGIN-004
AC #3 covered by: TC-LOGIN-008, TC-LOGIN-009
AC #4 covered by: TC-LOGIN-010
AC #5 covered by: TC-LOGIN-011, TC-LOGIN-012
```

If an AC has no test cases mapped to it, that's a coverage gap and should be flagged prominently.

## Output length expectations

For typical USTs with 4–6 acceptance criteria, expect 15–30 test cases in the final output. Going significantly below 15 usually means missed coverage. Going much above 30 usually means the UST is large enough to warrant splitting, or test cases are being duplicated at different levels of specificity.

## When standards conflict with user instruction

If the user explicitly asks for something that conflicts with these standards (e.g. "give me test cases in Given/When/Then format"), explain briefly why the standard differs ("Test cases use the 5-column table format at Techlogix; Given/When/Then is reserved for Cucumber `.feature` files in Week 4's automation track") and offer the compliant format. Don't refuse — offer the right thing plus a short explanation.


---

## 6. QA test case writer skill — references/obdx-format.md

_Source: `.claude/skills/qa-test-case-writer/references/obdx-format.md`_

# OBDX Extended Test-Case Format (HBL Trade Finance)

This format is used for the HBL OBDX Trade Finance project (`data/manual-test-cases.xlsx`).
It **extends** the 6-column Techlogix standard with 5 additional columns to match the
Initiate Import LC sheet schema. Use this format when writing test cases that will be
appended to `data/manual-test-cases.xlsx` for any OBDX module (Import LC, Export LC,
Amend, Transfer, Bank Guarantees, Collections, etc.).

## When to use this format

- Project root contains `obdx-ilc-playwright/` or `data/manual-test-cases.xlsx`.
- The user references the existing Initiate Import LC test cases as a format template.
- The user asks to append to the OBDX manual-test-cases workbook.

If both apply, use this 11-column schema **instead of** the Techlogix 6-column table.

## Column schema (exactly these, in this order)

The workbook places identity, content, and metadata columns in three groups: TC identity + content first, classification next, locator/source columns at the end. Each sheet places headers in **row 0** directly (no merged title row).

| # | Column | Description |
|---|--------|-------------|
| 1 | **Test Case ID** | `TC-<MODULE>-<NNN>` for tab cases; `TC-<MODULE>BS-<NNN>` or `TC-BS-<NNN>` for business scenarios. Module codes seen: `IMPLC` (Initiate Import LC), `AMLC`/`AMIMP` (Amend Import LC), `EXPLC` (Export LC). Pick a non-colliding prefix when adding a new module. |
| 2 | **Scenario** | One-line scenario summary. May start with `Negative —` / `Boundary —` / `Edge —` to flag non-positive cases. |
| 3 | **Test Objective** | "Verify a maker can …" / "Verify the form rejects …" — one sentence stating intent + business reason. |
| 4 | **Pre-conditions** | Login, entitlements, existing data. Use `corpmaker2 logged in.` for the standard Maker. Dash `-` if genuinely none (only for trivial cases). |
| 5 | **Test Steps** | Numbered with `1) 2) 3) …` and `\n` between steps. Always include login + navigation. Reference data via `LC_TEST_DATA.*` rather than hard-coding. |
| 6 | **Expected Result** | Observable outcome with the OBDX system message verbatim where possible (e.g. "success message 'Transaction submitted for approval.' with OBDX reference; status = Pending for Approval."). |
| 7 | **Type** | `Positive` / `Negative`. (Boundary and Edge are still tagged via the Scenario prefix; Type stays binary to match existing sheet.) |
| 8 | **Priority** | `P1` / `P2` / `P3`. P1 = critical (login, mandatory fields, submit), P2 = important variations, P3 = nice-to-have. |
| 9 | **Source Tab** | UI tab the test belongs to (e.g. `Tab 1 — LC Details`, `Tab 2 — Goods & Shipment`) OR `Business Scenarios` for cross-tab real-world flows. |
| 10 | **Tab / Field** | Specific field or sub-section under the tab, e.g. `LC Details > Applicant`, `Tab 1 — Date of Expiry`. |
| 11 | **FSD Reference** | Page + step from the FSD document, e.g. `FSD pp.128–129 step 1–4`. Blank for business scenarios where FSD doesn't directly apply. |

## Section dividers in the xlsx

The sheet uses divider rows whose first cell starts with `■  ` (filled square + 2 spaces),
e.g. `■  Tab 1 — LC Details`, `■  Business Scenarios — Initiate Import LC`. Keep this
convention when generating new sheets — it's how readers locate sections quickly.

Standard section order for any LC-flow sheet:

1. `■  Tab 1 — LC Details`
2. `■  Tab 2 — Goods & Shipment`
3. `■  Tab 3 — Documents & Conditions`
4. `■  Tab 4 — Linkages` *(only when the flow has linkages — e.g. Initiate; skip for Amend)*
5. `■  Tab 5 — Instructions`
6. `■  Tab 6 — Attachments / Submit`
7. `■  Business Scenarios — <Flow Name>`

Adapt tab numbers if the underlying flow has fewer/more tabs.

## Test data conventions

- **Login:** `corpmaker2 / Admin@131` for Maker; `corpchecker2` for Checker (when in scope).
- **Test data references:** `LC_TEST_DATA.product`, `.beneficiaryName`, `.lcCurrency`,
  `.lcAmount`, `.swiftCode`, `.dateOfExpiry`, `.placeOfExpiry`, `.placeOfTaking`,
  `.finalDestination`, `.goodsType` — these point at `data/lcTestData.ts`.
- **Concrete values** are used only when the scenario hinges on the value itself
  (e.g. `Currency = EUR; LC Amount = 25,000` for a multi-currency test, `Tolerance = 5`
  for a tolerance scenario). Default everything else to `LC_TEST_DATA.*`.
- **Counterparty:** existing test counterparty `Shehzad` is referenced when needed.
- **40A:** default `IRREVOCABLE` unless the test is specifically about Type variation.

## Maker-only vs full-flow scope

When the user asks for **Maker-only** test cases, scope ends at the success-message
screen ("Transaction submitted for approval." + reference number + status =
`Pending for Approval`). Skip:

- Back-office approval steps (1-to-5 approver chain)
- Revert-to-Maker / approver-rejection paths
- TI-system handoff
- Checker approval (in OBDX-corporate dual-control)

These belong to a separate sheet/section (e.g. `Approval Flows`) and should be authored
under their own scope.

## Appending to the workbook

Use a Node script modelled on `scripts/append-trade-finance-tcs.js`:

- Read the workbook with `xlsx` (SheetJS community).
- Build a new sheet (or append to an existing one) using `XLSX.utils.aoa_to_sheet`.
- Preserve the 11-column header row.
- Insert section dividers as single-cell rows whose first cell starts with `■  `.
- **Heads-up:** SheetJS community edition does NOT preserve cell styling
  (colors, borders, merged cells) on read+write. Values are preserved, formatting is not.
  Always create a backup (`data/manual-test-cases.backup.xlsx`) before overwriting.

## Inline-preview format (for user review before xlsx generation)

When showing test cases inline for review, use Markdown tables grouped under section
divider headings (e.g. `### ■ Tab 1 — LC Details`). Keep all 11 columns visible. After
the user approves, run the append/write script — never write to xlsx without explicit
approval when the user has asked to review first.


---

## 7. Playwright script writer skill — SKILL.md

_Source: `.claude/skills/playwright-script-writer/SKILL.md`_

> "Generates production-grade Playwright + TypeScript automation scripts that conform to the Techlogix QA framework conventions (Page Object Model, fixtures, path aliases, TC-ID naming). Use whenever a QA engineer asks to write, generate, scaffold, or automate a test case into Playwright code, convert test cases to .spec.ts files, create or extend page objects, add new specs to an existing framework, or turn a user story / UST into runnable tests. Triggers on any mention of 'write a Playwright test', 'automate this test case', 'create a spec file', 'add a page object', 'convert UST to tests', '.spec.ts', 'POM class', 'Playwright script', or similar. Auto-triggers even when the user just pastes test cases or a UST and asks for automation, without naming Playwright explicitly."

# Playwright Script Writer

You write Playwright + TypeScript automation scripts that fit into the Techlogix QA Automation Framework. Every output you produce should look like it was written by a senior engineer on the team — same file layout, same imports, same conventions, same style.

---

## Core workflow (follow in order)

### 1. Detect the input type

Before writing any code, identify what you've been given:

| Input shape | What to do |
|------|------|
| **Test cases in a table** (TC-ID, Title, Preconditions, Steps, Expected) | Go to §3. This is the common case. If the table came from qa-test-case-writer in this session, the TC-IDs and tag mapping are already correct — use them verbatim. |
| **A User Story Task (UST)** | Do not automate directly. Tell the user: *"Run the qa-test-case-writer skill first — paste the UST there to get the test case table, then bring it here to automate."* Only skip this if they explicitly say "automate directly" or "skip that". |
| **A request to extend an existing page** ("add a method to LoginPage to...") | Read the target page object first. Then follow §4. |
| **A request to create a new page object** | Go to §5. |
| **Anything ambiguous** | Ask one clarifying question, then proceed. Do not write 200 lines of code on a guess. |

> **Pipeline context:** This skill is Stage 2 of the Techlogix QA pipeline. See `skills/pipeline.md` for the full flow, the handoff contract (required columns, TC-ID format, category → tag mapping), and shared conventions. Read it if you are unsure whether the input table is in the correct format.

### 2. Plan before you write (MANDATORY — do not skip)

Before producing any `.spec.ts` code, output a brief plan:

```
PLAN
────
Framework: Techlogix QA Framework (Playwright + TS, POM)
Input: <N test cases for [feature]>

New files:
  - tests/specs/<feature>/<name>.spec.ts  (N tests)

Page objects touched:
  - LoginPage: using loginAs() — no changes needed
  - NewPage: needs creation → 3 locators, 2 actions (see below)

Test data:
  - Uses existing TestData.tmxUsers.valid / TestData.instedUsers.notblocked
  - New fixture needed? No / Yes (describe)

Risks / questions:
  - <TC-005> references "password reset link" but no such page object exists.
    Will stub with a placeholder and flag for review.
```

Wait for acknowledgement on the plan before generating code — unless the user has already told you to just produce code. The plan is cheap to review, the code is not.

#### Pre-flight for external / unfamiliar apps (MANDATORY when creating a new page object)

When writing a page object for an app you have not already seen DOM evidence for in this session, you **must** include a `Live-app unknowns` section in the plan and either resolve each item from context already in the conversation, or pause and ask before generating code. Do not assume.

Required facts to confirm before writing:

| Fact | Why it matters |
|------|---------------|
| **Success redirect URL** (e.g. post-login) | `waitForURL()` and `expectOnDashboard()` depend on it. A wrong URL causes 15 s timeouts on every test that logs in. |
| **Form submit button behaviour** | Angular Material and similar frameworks disable the submit button when the form is invalid. `button.click()` will hang indefinitely on a disabled button. Confirm: is the button disabled until the form is valid? |
| **Navigation-style elements rendered as `<button>`** | Angular Material renders "Forgot your password?"-style links as `<button mat-button>`, not `<a>`. `getByRole('link')` will fail. Confirm element type before using it. |
| **Heading semantics** | Page section titles may be styled `<span>` or `<b>`, not `<h1>`–`<h6>`. `getByRole('heading')` will fail. Check from a screenshot or DOM snippet before using it. |
| **SPA background polling** | Angular, React, and Vue apps often keep long-lived background connections. `waitForLoadState('networkidle')` will never resolve. Confirm app type before using it. |
| **`autofocus` on first field** | If the first input has `autofocus`, pressing Tab on page load moves focus *away* from it, not to it. Keyboard-navigation tests must assert the field is already focused, then Tab forward. |

If the user has already provided screenshots, URLs, or DOM snippets — extract the answers from those rather than asking. Only ask what genuinely cannot be inferred.

### 3. Generate spec files from test cases

Read **framework-conventions.md** for the full rules. The short version:

1. File location: `tests/specs/<feature>/<feature>.spec.ts`
2. Import from `@fixtures/pages.fixture` (never from `@playwright/test` directly)
3. Wrap tests in a `test.describe('Feature — short description', () => { ... })`
4. Each test follows the template:
   ```ts
   test('TC-<FEATURE>-<NNN> @<tag>  <short description>', async ({ <fixtures> }) => {
     // Arrange
     // Act
     // Assert
   });
   ```
5. Use high-level page object methods only — never raw `page.locator(...)` in a spec
6. Use `TestData.<category>.<key>` for data, never inline magic strings
7. For boundary/security tests, use `DataHelper.maliciousString()`, `DataHelper.stringOfLength(n)`, etc.

### 4. Extending an existing page object

1. Read the current page object file first (`view` it)
2. Add locators as `private readonly` class fields, initialised in the constructor
3. Add methods as public async, named after user intent
4. Do NOT break existing method signatures — append, don't modify
5. If a method exists that almost does what you want but with a slight variation, extract a helper rather than duplicating

### 5. Creating a new page object

Read **code-patterns.md** for the full template. Required structure:

```ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class <Name>Page extends BasePage {
  readonly url = '/<path>';
  readonly pageIdentifier: Locator;

  private readonly <locator>: Locator;
  // ... more locators

  constructor(page: Page) {
    super(page);
    this.<locator> = page.locator('<selector>');
    // ...
    this.pageIdentifier = this.<most-stable-locator>;
  }

  // ─── Actions ───
  async <actionName>(<params>): Promise<void> { ... }

  // ─── Assertions / Queries ───
  async expect<Something>(expected: ...): Promise<void> { ... }
  async get<Something>(): Promise<...> { ... }
}
```

Then register it in `src/fixtures/pages.fixture.ts` as a fixture. Don't forget this step — tests can't use page objects that aren't wired into the fixture.

### 6. Run and verify (MANDATORY — do not skip)

After generating and writing all files, run the TypeScript compiler first, then the tests. Do not hand the code back to the user without a passing run.

**Step 1 — TypeScript compile check (cheap, catches errors before Playwright spins up):**

```bash
npx tsc --noEmit
```

If TypeScript errors appear, fix them before proceeding to the test run. Common causes: missing imports, wrong property names on page objects, type mismatches in `loginAs()` calls. Do not run Playwright until `tsc --noEmit` is clean.

**Step 2 — Run the tests:**

```bash
npx playwright test tests/specs/<feature>/<feature>.spec.ts --project=chromium
```

> Do NOT add `--reporter=list` — it replaces all reporters from the config and suppresses the HTML report. The config already includes `list` as one of its reporters.

**Pass:** Report the passing count and total time. Done.

**Fail:** Fix the failures before responding. Do not describe the failures and leave them for the user — resolve them:

1. Read the full error message. Identify the root cause from this priority list:
   - **`net::ERR_NAME_NOT_RESOLVED` / `ERR_CONNECTION_REFUSED` / `net::ERR_FAILED`** → the app URL is a placeholder or the environment is down. **This is NOT a code problem.** Stop immediately. Report which URL failed to resolve and ask the user to provide the correct URL. Do not attempt to fix the code.
   - **`locator.click: element is not enabled`** → submit button is disabled (Angular Material pattern). Switch to `blur`-based validation. See Pattern 9 in `code-patterns.md`.
   - **`waitForLoadState('networkidle')` timeout** → SPA with background polling. Replace with `waitForURL()` or element-based wait. See Rule 7 in `framework-conventions.md`.
   - **`getByRole('heading')` / `getByRole('link')` not found** → element is non-semantic. Switch to `getByText()`. See Angular Material gotchas in `selector-strategy.md`.
   - **`waitForURL` timeout / wrong URL** → success redirect URL was wrong. Read the actual URL from the failure screenshot or error, update `expectOnDashboard()`.
   - **`aria-invalid` assertion timeout** → attribute not set by this app's form implementation. Use `expectSubmitButtonDisabled()` instead.
   - **`toBeFocused` fails on first Tab** → field has `autofocus`. Use `element.focus()` to establish starting point. See Pattern 11 in `code-patterns.md`.
   - **Performance assertion fails by small margin** → SLA too tight for external service. Increase threshold. See Pattern 10 in `code-patterns.md`.

2. **If the root cause is not immediately clear from the error message**, run the failing test in isolation and inspect the live DOM before attempting a fix:

   ```bash
   # Run just the failing test — full error output, no noise from other tests
   npx playwright test tests/specs/<feature>/<feature>.spec.ts --project=chromium --grep "TC-FEATURE-NNN"
   ```

   Playwright's error output includes the resolved element's full HTML — read it carefully. Common signals:
   - `disabled="true"` on the button → Angular Material disabled-button pattern (Pattern 9)
   - `<span>` or `<b>` instead of `<h*>` → non-semantic heading, use `getByText()`
   - `type="button"` with no `href` → Angular Material `<button>` masquerading as a link

   If the HTML in the error isn't enough, add a one-off diagnostic to the page object to dump the actual attribute value at runtime:

   ```ts
   // Temporary diagnostic — remove after confirming the attribute name
   const actual = await this.emailInput.getAttribute('aria-invalid');
   console.log('aria-invalid value:', actual);   // null means it's not set at all
   ```

   Run the test, read the console output, then remove the diagnostic and write the correct assertion based on what the live DOM actually exposes.

3. Apply the fix, re-run the specific failing test(s):
   ```bash
   npx playwright test tests/specs/<feature>/<feature>.spec.ts --project=chromium --grep "TC-ID"
   ```

4. Once all tests pass, run the full suite one final time to confirm no cross-test regressions.

5. If a failure genuinely cannot be resolved without information only the user can provide (e.g. the actual post-login URL, live DOM structure that isn't in any error output), stop, describe the specific unknown, and ask a single targeted question. Do not guess and ship broken code.

**What counts as done:** All generated tests pass on the first full run after fixes. Report the final `N passed` line to the user.

---

## Quality gates (check before returning code)

Run through this checklist mentally before producing output. If any gate fails, fix it before responding.

1. **No raw selectors in spec files** — if you see `page.locator(...)` in a `.spec.ts`, it belongs in a page object
2. **Every test has a TC-ID** — format `TC-<FEATURE>-<NNN>`, consistent with existing tests
3. **Every test has at least one tag** — `@smoke` or `@regression` (optionally more)
4. **Arrange / Act / Assert structure** — three clear sections, with comments if non-obvious
5. **Imports use path aliases** — `@pages/*`, `@fixtures/*`, `@config/*`, never `../../src/...`
6. **No hard-coded credentials / data** — always from `TestData` or `DataHelper`
7. **No hard sleeps** — `WaitHelper.pause()` only as a last resort, and comment why
8. **Preconditions are met via fixtures** — if every test in a file needs to be logged in, use a pre-authenticated state fixture (e.g. `instedLoggedInPage`, `tmxLoggedInPage`), not copy-paste login in each test
9. **Synthetic data only** — never real patient/user/production data, not even in comments

---

## Selector strategy (critical)

Read **selector-strategy.md** for the full rules. Priority order:

1. `data-test` / `data-testid` attribute — always preferred
2. `getByRole()` — semantic, accessible
3. `getByText()` / `getByLabel()` — for unique text
4. CSS selectors — only when none of the above are available
5. XPath — avoid unless absolutely required

If the DOM you're given doesn't have test IDs, flag it in the plan and recommend adding them, but proceed with the best available alternative.

---

## Output format

When producing code, use this structure:

1. **Brief summary** (2-3 sentences) — what you built, what files changed
2. **File-by-file code blocks** — each with its full path as a header
3. **How to run it** — exact command (`npm run test:auth`, etc.)
4. **Flags** — anything the user should know: assumptions you made, tests that might be flaky, stubbed page objects, missing test data

Do NOT explain what every line does — assume the reader knows TypeScript and Playwright. Comment in the code itself where non-obvious, not in prose after.

---

## What to avoid

- Writing tests against a page object that doesn't exist yet (create it first)
- Copying selectors from a test case's "Test Steps" verbatim — translate them into page object method calls
- Inventing API endpoints, button text, or field names you don't have evidence for — if you're not sure, flag it
- Using `test.skip()` or `test.only()` in delivered code — they leak into CI
- Writing tests that depend on execution order — each test must be independent
- `waitForTimeout(ms)` — almost always a bug. Use `expect(locator).toBeVisible()` or `waitForURL()` instead.

---

## Reference files

Read these as needed:

- **framework-conventions.md** — full POM rules, file layout, import patterns, fixture registration
- **code-patterns.md** — templates for common tasks (new spec, new page object, data-driven tests, API teardown)
- **selector-strategy.md** — how to pick locators, priority order, worked examples
- **examples.md** — real test cases transformed into real spec files, end-to-end

Always read **framework-conventions.md** first on your very first invocation in a session — the rules there are not negotiable.


---

## 8. Playwright script writer skill — framework-conventions.md

_Source: `.claude/skills/playwright-script-writer/framework-conventions.md`_

# Framework Conventions

The rules of the Techlogix QA Automation Framework. Every generated script must conform.

---

## File layout

```
tests/specs/<feature>/<feature>.spec.ts       ← test files
src/pages/<name>.page.ts                      ← page objects
src/components/<name>.component.ts            ← reusable UI fragments
src/helpers/<purpose>.helper.ts               ← cross-cutting utilities
src/fixtures/pages.fixture.ts                 ← test() fixtures (single file)
src/config/{environments,test-data}.ts        ← config
test-data/<name>.json                         ← typed fixtures
```

**Where does a new file go?**
- A test for a feature → `tests/specs/<feature>/`
- A new page object → `src/pages/<name>.page.ts` (lowercase, dot-separated)
- A shared component that appears on 2+ pages → `src/components/`
- A utility used by 3+ tests → `src/helpers/`

---

## Imports — always use path aliases

Configured in `tsconfig.json`:

| Alias | Resolves to |
|-------|-------------|
| `@pages/*` | `src/pages/*` |
| `@components/*` | `src/components/*` |
| `@helpers/*` | `src/helpers/*` |
| `@fixtures/*` | `src/fixtures/*` |
| `@config/*` | `src/config/*` |
| `@types/*` | `src/types/*` |
| `@data/*` | `test-data/*` |

**Correct:**
```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';
import { DataHelper } from '@helpers/data.helper';
```

**Wrong — never use relative paths across directories:**
```ts
import { test, expect } from '../../../src/fixtures/pages.fixture';  // ❌
import { LoginPage } from '../../src/pages/login.page';               // ❌
```

Relative imports are OK *within* a directory (e.g. `import { BasePage } from './base.page'` inside `src/pages/`).

---

## Spec file anatomy

Every spec file follows this template:

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';
// Additional imports: DataHelper, AssertionHelper, etc.

/**
 * <Feature name> — <short description>
 *
 * <2-3 sentences describing coverage.>
 */

test.describe('<Feature> — <short description>', () => {
  test('TC-<FEATURE>-001 @smoke  <short title>', async ({ <fixtures> }) => {
    // Arrange
    // ...

    // Act
    // ...

    // Assert
    // ...
  });

  // More tests...
});
```

**Rules:**
- One top-level `test.describe` per file — don't nest multiple describes at the top
- File name matches feature: `tests/specs/login/login.spec.ts` → `describe('Login — ...')`
- JSDoc at top explains coverage, not every test
- Arrange / Act / Assert comments are optional but recommended for non-trivial tests

---

## Test naming

Format: `TC-<FEATURE>-<NNN> @<tag>  <description>`

- `TC-` — literal prefix
- `<FEATURE>` — uppercase feature tag: LOGIN, INV, CART, E2E, API
- `<NNN>` — 3-digit counter within the feature, zero-padded
- `@<tag>` — at least one: `@smoke` or `@regression`. Both is fine.
- Two spaces after the tag, then a **short, declarative** description (not the full acceptance criterion)

**Good:**
```
TC-LOGIN-001 @smoke  Valid user logs in and lands on inventory
TC-CART-014 @regression  Remove last item empties cart
```

**Bad:**
```
TC-1  Test login                                  ← no feature, no tag, vague
test login works @smoke                           ← missing TC ID
TC-LOGIN-001 @smoke @regression @happy-path @ui   ← tag soup
```

---

## Fixtures — when to use each

Provided by `@fixtures/pages.fixture`:

| Fixture | Use when... |
|---------|-------------|
| `loginPage` | Login itself is under test (already navigated) |
| `inventoryPage` | Inventory is under test but login is prerequisite — you'll handle login manually |
| `cartPage`, `checkoutPage` | Similar — page object available, state not pre-set |
| `loggedInInventoryPage` | Login is NOT under test — you want to start on inventory as the standard user |
| `header` | Header component (burger menu, cart icon) — composes into any authenticated page |

**Pick the right fixture.** If your test starts with `loginPage.loginAs(TestData.users.standard)` just to get to the real action, use `loggedInInventoryPage` instead.

---

## Adding a new fixture

When you create a new page object, register it in `src/fixtures/pages.fixture.ts`:

```ts
type PageFixtures = {
  loginPage: LoginPage;
  // ... existing
  productDetailsPage: ProductDetailsPage;  // ← add here
};

export const test = base.extend<PageFixtures & StateFixtures>({
  // ... existing

  productDetailsPage: async ({ page }, use) => {
    await use(new ProductDetailsPage(page));
  },
});
```

For fixtures that require setup (e.g. already-authenticated state), follow the `loggedInInventoryPage` pattern — do the setup before `use()`.

---

## Page object method naming

| Method type | Prefix | Example |
|------|------|------|
| User-intent action | verb | `login()`, `addProductToCart()`, `submitCheckoutInfo()` |
| Query / getter | `get` | `getCartItemCount()`, `getProductNames()` |
| Boolean check | `is` | `isErrorVisible()`, `isDisplayed()` |
| Assertion | `expect` | `expectCartBadgeCount()`, `expectOrderComplete()` |
| Navigation helper | verb | `openCart()`, `openProductDetails()` |

**Naming checklist:**
- Reads like a sentence? `cart.expectItemCount(3)` → "cart, expect item count 3" ✓
- Describes intent, not mechanism? `login(user, pass)` not `fillFormAndClickButton()` ✓
- Consistent with existing methods? Don't add `assertCartCount()` when the pattern is `expectCartCount()` ✓

---

## Assertions — prefer web-first

Playwright's `expect(locator)` auto-waits and auto-retries. Use it:

```ts
// ✅ Auto-waits up to 10s for the element
await expect(cartBadge).toHaveText('3');

// ❌ Race condition — element might not be there yet
expect(await cartBadge.textContent()).toBe('3');
```

When writing custom assertions on page objects, wrap web-first assertions:

```ts
async expectCartBadgeCount(expected: number): Promise<void> {
  if (expected === 0) {
    await expect(this.cartBadge).not.toBeVisible();
  } else {
    await expect(this.cartBadge).toHaveText(String(expected));
  }
}
```

---

## Test data — always go through TestData

All fixed data comes from `TestData` (backed by JSON files in `/test-data/`).

```ts
// ✅ Typed, traceable, editable in one place
await loginPage.loginAs(TestData.users.standard);

// ❌ Magic strings — who is this user? What if the password changes?
await loginPage.login('standard_user', 'secret_sauce');
```

**Adding new test data:**
1. Edit the appropriate JSON in `/test-data/`
2. Add the type to `src/config/test-data.ts` if it's a new category
3. Commit with the test that uses it

**Synthesised data** (random, per-test) comes from `DataHelper`:

```ts
import { DataHelper } from '@helpers/data.helper';

const info = DataHelper.fakeCheckoutInfo();    // fresh every run
const id = DataHelper.uniqueId('TC');          // collision-free for parallel runs
const attack = DataHelper.maliciousString();   // negative-test string
```

**Never put real patient data, real PII, or production credentials in the repo.** Not even in comments.

---

## Tags

| Tag | Meaning |
|------|------|
| `@smoke` | Must pass for any deploy. ~10-20 tests, run on every PR. |
| `@regression` | Full coverage. Run nightly and before release. |
| `@api` | API-only (no browser). Runs fast. |
| `@visual` | Visual regression. Runs in its own job. |
| `@flaky` | Known flaky — under investigation. Still runs, but tracked. |

A test can have multiple tags. `@smoke` tests are a subset of `@regression` — don't worry about duplicating.

---

## What NOT to do

These are the most common mistakes. Check against them before delivering code:

1. **No `test.skip()` / `test.only()`** in delivered code. `only` is forbidden by `forbidOnly: true` in CI config, but catch it before it lands.
2. **No `console.log()`** in specs. If you need to trace, use `test.info().annotations`.
3. **No test dependencies.** Each test sets up its own state, asserts, and cleans up (if needed). If test B assumes test A ran first, that's a bug.
4. **No external network calls** without a comment explaining why and a timeout. Tests should not depend on external services unless that's explicitly what they're testing.
5. **No `page.waitForTimeout(ms)`** unless you're commenting exactly what you're waiting for and why no selector-based wait works.
6. **No partial implementations.** If a test case references functionality not yet available (e.g. a page object that doesn't exist), either create the page object or stub the test with `test.fixme()` and a clear TODO — don't commit a broken test.

7. **No `waitForLoadState('networkidle')` in SPA tests.** Angular, React, and Vue applications maintain persistent background connections (polling, WebSockets, prefetch). `networkidle` requires zero network activity for 500 ms — in an SPA this condition is almost never met, so the call will always hit its timeout. Use targeted waits instead:

   ```ts
   // ❌ Will time out on Angular / React / Vue SPAs
   await page.waitForLoadState('networkidle');

   // ✅ Wait for the specific thing you actually care about
   await page.waitForURL(/\/dashboard/);              // URL change after navigation
   await expect(successBanner).toBeVisible();         // element that proves the action completed
   await page.waitForLoadState('domcontentloaded');   // DOM parsed — safe fallback, always fires
   ```

   If you absolutely need a short network settle (e.g. a test inspects response data after a form submit), cap the timeout and catch the error:

   ```ts
   try {
     await page.waitForLoadState('networkidle', { timeout: 5_000 });
   } catch {
     await page.waitForLoadState('domcontentloaded');
   }
   ```

   This ensures the test continues rather than hanging for 30 s.


---

## 9. Playwright script writer skill — selector-strategy.md

_Source: `.claude/skills/playwright-script-writer/selector-strategy.md`_

# Selector Strategy

The single biggest cause of flaky Playwright tests is bad selectors. This document is the priority order, with the reasoning behind it.

---

## Priority order

Always pick the highest-priority option that works. Drop down the list only when the one above is unavailable.

### 1. `data-test` / `data-testid` attributes — **preferred**

```ts
page.locator('[data-test="login-button"]')
page.locator('[data-testid="cart-badge"]')
```

**Why first:**
- Stable — dev changes to styling, copy, or structure don't break them
- Explicit — they exist specifically for testing, so developers know not to remove them
- Framework-agnostic — works with React, Vue, Angular, vanilla

**When to use:** Any time the element has one. If the app under test doesn't have them, flag it and recommend adding them. Meanwhile, fall through to the next option.

### 2. `getByRole()` — semantic, accessible

```ts
page.getByRole('button', { name: 'Login' })
page.getByRole('textbox', { name: 'Username' })
page.getByRole('heading', { level: 1 })
```

**Why second:**
- Rewards accessible markup (buttons should be `<button>`, not `<div onclick>`)
- Stable across visual redesigns — the role of a button is a button
- Readable — tests double as accessibility smoke checks

**When to use:** Interactive elements (buttons, links, form controls, headings, dialogs).

**Available roles:** `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `option`, `heading`, `list`, `listitem`, `dialog`, `alert`, `tab`, `tabpanel`, `menu`, `menuitem`, and many more.

### 3. `getByLabel()` — form fields

```ts
page.getByLabel('Email address')
page.getByLabel(/password/i)
```

**Why third:**
- Matches how screen readers find fields — if accessibility is broken, this breaks too, which is a useful signal
- Survives DOM restructuring as long as the `<label for="...">` relationship is preserved

**When to use:** Form inputs where a visible label is associated with the field.

### 4. `getByText()` / `getByPlaceholder()` — text-based

```ts
page.getByText('Welcome back')
page.getByText(/^Your cart is empty$/)       // exact match via regex
page.getByPlaceholder('Search products')
```

**Why fourth:**
- Copy changes more often than IDs or roles
- Internationalisation breaks these
- Regex lets you handle minor variations

**When to use:** When there's no test ID, the element isn't interactive (so no role), and it has stable, distinctive text.

### 5. CSS selectors — last resort structural

```ts
page.locator('.inventory_item:nth-child(3)')
page.locator('table.results tbody tr')
```

**Why fifth:**
- Break whenever the DOM structure, class names, or Tailwind utilities change
- Tie tests to implementation details, not user behaviour

**When to use:** Lists of similar items with no individual test IDs, table rows, complex structural queries. Prefer `.filter()` chains over long descendant selectors.

### 6. XPath — avoid

```ts
page.locator('xpath=//div[@class="card"][3]/button')   // ❌
```

**Why last:**
- Hardest to read
- Most sensitive to DOM changes
- No advantage over CSS for 99% of cases

**When to use:** Only when you need something CSS genuinely can't express (following-sibling axis, text-with-context-parent). In 6 years you might need it twice.

---

## Composing selectors — `.filter()`

When a base selector matches multiple elements, narrow with `.filter()` rather than writing a more complex single selector:

```ts
// ✅ Readable, composable
const cartItems = page.locator('.cart_item');
const backpackItem = cartItems.filter({ hasText: 'Sauce Labs Backpack' });
await backpackItem.getByRole('button', { name: 'Remove' }).click();

// ❌ Hard to read, hard to debug
await page.locator('.cart_item:has-text("Sauce Labs Backpack") button:has-text("Remove")').click();
```

---

## Dynamic / generated selectors

**Good pattern** — parametrised method on the page object:

```ts
class CartPage extends BasePage {
  async removeItem(productId: string): Promise<void> {
    await this.page.locator(`[data-test="remove-${productId}"]`).click();
  }
}

// Usage in test:
await cartPage.removeItem('sauce-labs-backpack');
```

The selector is dynamic, but the *method* is stable. Tests never see the template string.

---

## Worked examples

### Example 1 — Login button

HTML:
```html
<input id="login-button" type="submit" value="Login" class="btn btn_action">
```

- ✓ `page.locator('[data-test="login-button"]')` — if a `data-test` were present
- ✓ `page.getByRole('button', { name: 'Login' })` — works (input[type=submit] has button role)
- ~ `page.locator('#login-button')` — works but ties to implementation
- ✗ `page.locator('.btn.btn_action')` — fragile, matches all action buttons

**Pick:** The `getByRole` version.

### Example 2 — Error message in a banner

HTML:
```html
<h3 data-test="error">Epic sadface: Username and password do not match any user in this service</h3>
```

- ✓ `page.locator('[data-test="error"]')` — stable, explicit
- ~ `page.getByText(/Epic sadface/)` — works but couples to copy
- ✗ `page.locator('h3.error')` — brittle

**Pick:** The `data-test` selector.

### Example 3 — Nth product card

HTML:
```html
<div class="inventory_item">...</div>
<div class="inventory_item">...</div>
<div class="inventory_item">...</div>
```

- ✓ `page.locator('.inventory_item').nth(2)` — structural, but OK for a list
- ✓ `page.locator('.inventory_item').filter({ hasText: 'Backpack' })` — better, content-based
- ✗ `page.locator('.inventory_item:nth-child(3)')` — tied to CSS position

**Pick:** The `.filter()` version — survives re-ordering.

---

## Angular Material / SPA gotchas

Angular Material and similar component libraries frequently break the assumed role-to-HTML mapping. Know these before writing selectors.

### Navigation items rendered as `<button>`, not `<a>`

Angular Material's `<button mat-button>` is used for both actions and navigation-style links. A "Forgot your password?" element that looks like a link in the UI is almost certainly `<button>` in the DOM.

```ts
// ❌ Will fail — Angular Material renders this as <button>, not <a>
page.getByRole('link', { name: 'Forgot your password?' })

// ✅ Role-agnostic — works regardless of element type
page.getByText('Forgot your password?')
```

Rule: any clickable element that looks like a styled text link in an Angular Material app — use `getByText()` unless you have confirmed it is a genuine `<a>` element.

### Visual headings may not be semantic headings

Page section titles styled to look like `<h2>` are often `<span class="heading">` or `<b>` in SPAs. `getByRole('heading')` will return nothing.

```ts
// ❌ Will fail — "Account Locked" is a styled <b>, not an <h*> element
page.getByRole('heading', { name: 'Account Locked' })

// ✅ Text-based — works regardless of element type
page.getByText('Account Locked').first()
```

Rule: if you cannot confirm the semantic element from a DOM snippet or screenshot, prefer `getByText()` over `getByRole('heading')` for SPA content.

### `aria-invalid` may not be set by non-standard Angular forms

Standard Angular Material reactive forms do set `aria-invalid="true"` on touched invalid inputs. However, embedded third-party Angular forms (external IdP login pages, white-labelled portals, custom form libraries) often do not — even when the field is visibly invalid. Never rely on `aria-invalid` without confirming it from the live DOM.

Instead, use the disabled state of the submit button as the primary assertion signal when the form is in an invalid state (see **Pattern 9** in `code-patterns.md`).

---

## Quick checklist before shipping a selector

1. Does it use a `data-test` / `data-testid`? ✓ ship it
2. If not: Is it role-based (`getByRole`)? ✓ ship it
3. If not: Is the text content stable and unique? ✓ OK, ship it with a regex
4. If not: Are you selecting by class or structure? Flag it — this test will break sooner than it should
5. XPath? Stop. Almost certainly there's a better way.


---

## 10. Playwright script writer skill — code-patterns.md

_Source: `.claude/skills/playwright-script-writer/code-patterns.md`_

# Code Patterns

Concrete templates for common tasks. Copy these structures; don't improvise.

---

## Pattern 1 — New spec file from test cases

**Input:** A table of test cases with TC-ID, Title, Preconditions, Steps, Expected Result.

**Output:** One `.spec.ts` file, one test per row, using existing fixtures.

**Template:**

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';

/**
 * <Feature> — <short description>
 *
 * Covers: <list the TC-IDs this file includes>
 */

test.describe('<Feature> — <short description>', () => {
  test('TC-<FEATURE>-001 @smoke  <title>', async ({ <fixtures> }) => {
    // Arrange: <reference preconditions from the TC>

    // Act: <reference steps from the TC — but translate into POM method calls>

    // Assert: <reference expected result from the TC>
  });

  // Continue for each test case...
});
```

**Translating TC Steps → POM calls:**

| TC Step says... | Spec code should be... |
|------|------|
| "Navigate to login page" | handled by `loginPage` fixture |
| "Enter 'standard_user' in username field" | `await loginPage.login(user.username, user.password)` — don't fill the field directly |
| "Click the Login button" | (same line as above — `login()` includes the click) |
| "Verify user is on the inventory page" | `await inventoryPage.waitForLoad()` + assertion on page content |

If a TC step can't be mapped to an existing page object method, **add the method first**, don't inline the raw selector in the spec.

---

## Pattern 2 — New page object

**When:** A test case references a page or component that doesn't have a page object yet.

**Template:**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * <PageName>
 * ──────────
 * <One-line description of what this page is.>
 *
 * <Additional notes — navigation context, state dependencies, etc.>
 */
export class <PageName>Page extends BasePage {
  readonly url = '/<relative-path>';
  readonly pageIdentifier: Locator;

  // ─── Locators ─────────────────────────────────────────────
  private readonly <locator1>: Locator;
  private readonly <locator2>: Locator;
  // ...

  constructor(page: Page) {
    super(page);
    this.<locator1> = page.locator('<selector>');
    this.<locator2> = page.getByRole('<role>', { name: '<n>' });
    // ...
    this.pageIdentifier = this.<most-stable-locator>;
  }

  // ─── Actions ──────────────────────────────────────────────

  async <actionName>(<params>): Promise<void> {
    // ...
  }

  // ─── Queries ──────────────────────────────────────────────

  async get<Something>(): Promise<<type>> {
    // ...
  }

  // ─── Assertions ───────────────────────────────────────────

  async expect<Condition>(expected: <type>): Promise<void> {
    await expect(this.<locator>).<assertion>(expected);
  }
}
```

**Then register the fixture** in `src/fixtures/pages.fixture.ts`:

```ts
type PageFixtures = {
  // ... existing
  <pageName>Page: <PageName>Page;
};

export const test = base.extend<PageFixtures & StateFixtures>({
  // ... existing
  <pageName>Page: async ({ page }, use) => {
    await use(new <PageName>Page(page));
  },
});
```

---

## Pattern 3 — Data-driven tests

**When:** The same test shape runs against multiple inputs — e.g. "invalid emails all produce an error."

**Template:**

```ts
const invalidEmails = [
  { input: 'plain-text',          reason: 'no @ sign' },
  { input: '@nodomain.com',       reason: 'no local part' },
  { input: 'user@',               reason: 'no domain' },
  { input: 'user @example.com',   reason: 'contains space' },
] as const;

for (const { input, reason } of invalidEmails) {
  test(`TC-REG-DD-${reason.replace(/\s+/g, '-')}  Email rejected: ${reason}`, async ({
    registrationPage,
  }) => {
    await registrationPage.enterEmail(input);
    await registrationPage.submit();
    await registrationPage.expectEmailError(/invalid/i);
  });
}
```

**Rules:**
- Use `as const` on the data array — gives you autocomplete and type safety
- TC-IDs get a `-DD-<variant>` suffix so they're traceable
- Keep the test body identical across iterations — if it diverges, split into separate tests

---

## Pattern 4 — Test requiring backend setup

**When:** A test needs a seeded user, a pre-populated cart, a scheduled appointment, etc.

**Template (using ApiHelper):**

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { ApiHelper } from '@helpers/api.helper';

test.describe('Appointments — cancel flow', () => {
  let api: ApiHelper;
  let appointmentId: string;

  test.beforeEach(async () => {
    api = new ApiHelper();
    await api.init();
    const appointment = await api.post('/appointments', {
      patientId: 'synthetic-patient-001',
      date: '2026-05-01T10:00:00Z',
    });
    appointmentId = (appointment as { id: string }).id;
  });

  test.afterEach(async () => {
    await api.delete(`/appointments/${appointmentId}`);
    await api.dispose();
  });

  test('TC-APPT-001 @smoke  Patient cancels upcoming appointment', async ({
    loggedInInventoryPage,
    // ... whatever page objects you need
  }) => {
    // Test body uses the seeded appointmentId
  });
});
```

**Notes:**
- `beforeEach` / `afterEach` keep each test independent — no shared state between tests
- Use `test.beforeAll` only for truly expensive setup that can't vary per test (rare)
- Always clean up what you create — leaking test data pollutes the environment

---

## Pattern 5 — Visual / screenshot test

**When:** The test case says "verify the UI matches the approved design" or mentions visual regression.

**Template:**

```ts
test('TC-VIS-001 @visual  Login page matches baseline', async ({ loginPage }) => {
  await expect(loginPage.page).toHaveScreenshot('login-page.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});
```

**Notes:**
- First run creates the baseline; subsequent runs compare
- `maxDiffPixelRatio` tolerates minor antialiasing differences (0.01 = 1%)
- Store baselines in `tests/__screenshots__/` — they're committed to Git
- Visual tests are platform-sensitive — run them in CI only, not locally

---

## Pattern 6 — Test that handles async UI state

**When:** A test case says "wait for the loading spinner to disappear" or "verify the results appear."

**Don't use:**
```ts
await page.waitForTimeout(3000);  // ❌ flaky, ignores reality
```

**Do use:**
```ts
// Option A — wait for a specific element (preferred)
await expect(resultsTable).toBeVisible();

// Option B — wait for URL change
await page.waitForURL(/\/results/);

// Option C — custom condition (when no selector works)
await WaitHelper.forCondition(
  async () => (await api.get('/job/status')).status === 'complete',
  { timeout: 30_000, message: 'Job did not complete' },
);
```

---

## Pattern 7 — Parametrised page object constructor

**When:** A page object varies by environment or role (e.g. admin dashboard vs user dashboard).

**Template:**

```ts
export class DashboardPage extends BasePage {
  readonly url: string;
  readonly pageIdentifier: Locator;

  constructor(page: Page, role: 'admin' | 'user' = 'user') {
    super(page);
    this.url = role === 'admin' ? '/admin/dashboard' : '/dashboard';
    // ... locators may differ too
  }
}
```

Then the fixture supplies the default, and tests that need the variant construct directly:

```ts
test('admin sees extra menu', async ({ page }) => {
  const dashboard = new DashboardPage(page, 'admin');
  await dashboard.navigate();
  // ...
});
```

---

## Pattern 8 — Tagging tests with metadata

When you need to attach info to a test (ticket ID, author, environment restriction):

```ts
test('TC-LOGIN-001 @smoke  Valid user logs in', async ({ loginPage }, testInfo) => {
  testInfo.annotations.push(
    { type: 'jira', description: 'INST-1234' },
    { type: 'author', description: 'QA-Auto' },
  );
  // test body
});
```

These annotations appear in the HTML report and can be used by custom reporters.

---

## Pattern 9 — Angular Material form validation (disabled submit button)

**When:** The app uses Angular Material (or any SPA framework) where the submit button is **disabled** when the form is invalid. This is the default Angular Material reactive-form pattern.

**The problem:** `submitForm()` / `button.click()` will wait indefinitely for the button to become enabled and then time out. You cannot submit a form to trigger validation — you must trigger validation via `blur` events instead.

**Detecting this pattern:** Look for `disabled="true"` or `mat-button-disabled` on the submit button in the error log, or `<button type="submit" [disabled]="form.invalid">` in the source. If the button is disabled when the form is empty, this pattern applies.

**How to test empty-field validation:**

```ts
// ─── Page object ─────────────────────────────────────────────────────────────

// Blur actions — trigger Angular's blur-event validation without submitting
async blurEmailField(): Promise<void> {
  await this.emailInput.focus();
  await this.page.keyboard.press('Tab');
}

async blurPasswordField(): Promise<void> {
  await this.passwordInput.focus();
  await this.page.keyboard.press('Tab');
}

// Primary assertion for "field is invalid" — button state is the reliable signal.
// Do NOT use aria-invalid as the primary signal: embedded third-party Angular forms
// (external IdP pages, white-labelled portals) often do not set it even when invalid.
async expectSubmitButtonDisabled(): Promise<void> {
  await expect(this.submitButton).toBeDisabled();
}

// Text-based assertion for malformed-input errors (e.g. "Please enter a valid email address.")
// These only appear for malformed input (e.g. "abc"), NOT for empty fields.
async expectEmailFormatError(): Promise<void> {
  await expect(this.emailError).toBeVisible();
}
```

```ts
// ─── Spec ────────────────────────────────────────────────────────────────────

test('TC-LOGIN-010  Empty email shows validation error', async ({ loginPage }) => {
  // Cannot submit — button is disabled. Blur the field to trigger validation.
  await loginPage.blurEmailField();
  await loginPage.expectSubmitButtonDisabled();   // ← reliable: button state
});

test('TC-LOGIN-013  Malformed email shows format error', async ({ loginPage }) => {
  await loginPage.enterEmail('notanemail');
  await loginPage.blurEmailField();
  await loginPage.expectEmailFormatError();        // ← reliable: text appears for malformed, not empty
});

test('TC-LOGIN-027  Validation error clears after correction', async ({ loginPage }) => {
  // Use malformed email (not empty) to trigger the visible text error first
  await loginPage.enterEmail('notanemail');
  await loginPage.blurEmailField();
  await loginPage.expectEmailFormatError();

  // Correct it — error clears reactively
  await loginPage.enterEmail(TestData.users.valid!.email);
  await loginPage.expectEmailFormatErrorGone();
});
```

**Decision tree for form-validation tests:**

```
Does the test need to see a validation error?
  └─ Is it testing an EMPTY required field?
       └─ YES → blur the field → assert submitButton.toBeDisabled()
       └─ NO (malformed input, e.g. bad email format)?
            → enter bad value → blur → assert error text is visible
Does the test need to SUBMIT the form to reach the server?
  └─ Ensure ALL required fields are filled before calling submitForm()
```

---

## Pattern 10 — Performance thresholds for external services

**When:** A test case measures response time for a feature that calls an external service (IdP, payment gateway, third-party API).

**The problem:** A fixed threshold (e.g. 5 000 ms) that is reasonable for an internal API is almost always too tight for an external OAuth/IdP provider (Azure B2C, Auth0, Keycloak, Okta) in a test environment, especially when tests run in parallel with 4+ workers. The login round-trip alone can take 3–6 s with normal network variance.

**Pattern:**

```ts
test('TC-LOGIN-004  Login completes within acceptable time', async ({ loginPage }) => {
  const start = Date.now();

  await loginPage.loginAs(TestData.users.valid!);
  await loginPage.expectOnDashboard();

  const elapsed = Date.now() - start;

  // Threshold is intentionally generous for an external IdP in the test environment.
  // External IdP round-trips vary 2–6 s; 8 s gives headroom without masking regressions.
  // Tighten if SLA is tested against a staging environment with a fixed budget.
  expect(elapsed, `Login took ${elapsed} ms — exceeds SLA`).toBeLessThanOrEqual(8_000);
});
```

**Rules:**
- Never hard-code 5 000 ms for a test that hits an external IdP. Use 8 000 ms minimum.
- Add a comment explaining the chosen threshold and when to revise it.
- If the test is measuring internal API performance (same data centre), 3 000–5 000 ms is appropriate.
- Mark genuinely flaky perf tests with `@flaky` so CI tracks them without blocking deploy.

---

## Pattern 11 — Keyboard navigation with `autofocus`

**When:** A page has `autofocus` on the first field (common on login pages). The standard "press Tab to reach the first field" approach will fail because Tab moves focus *away* from the already-focused field.

**The problem:**

```ts
// ❌ Broken when emailInput has autofocus:
// Page loads → email is already focused.
// Tab → focus moves to password, not to email.
// toBeFocused() on email immediately fails.
async verifyKeyboardNavigation(): Promise<void> {
  await this.page.keyboard.press('Tab');
  await expect(this.emailInput).toBeFocused();   // ← fails: Tab moved away
}
```

**Correct pattern:**

```ts
// ✅ Explicitly assert autofocus on page load, then Tab forward.
async verifyKeyboardNavigation(): Promise<void> {
  // Email has autofocus — assert it's focused before pressing any key
  await this.emailInput.focus();     // idempotent if already focused
  await expect(this.emailInput).toBeFocused();

  await this.page.keyboard.press('Tab');
  await expect(this.passwordInput).toBeFocused();

  await this.page.keyboard.press('Tab');
  // Note: skip disabled buttons — browsers exclude them from Tab order.
  // The next focusable element after password is the CANCEL button, not SIGN IN.
  await expect(this.cancelButton).toBeFocused();
}
```

**Rules:**
- Always use `element.focus()` to establish a known starting point before Tab navigation tests.
- Disabled buttons are excluded from the browser's Tab order — account for this when asserting Tab sequence.
- Do NOT rely on page-load autofocus behaviour as the starting condition; use explicit `.focus()` for determinism.
