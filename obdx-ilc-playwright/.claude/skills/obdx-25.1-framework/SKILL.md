---
name: obdx-25.1-framework
description: Authoritative reference for the OBDX 25.1 Playwright + TypeScript automation project. Defines the project's folder structure, locator strategy for Oracle JET (oj-* custom Web Components), stable-selector patterns against dynamic IDs, navigation patterns (hamburger menu, maker-checker, multi-entity), data-driven testing with Excel/JSON, OBDX-specific synchronization (`oj-busy-context`, widget initialization), parallel-execution conventions, debugging flaky OBDX tests, and AI-assisted automation guardrails. Use this skill when working on the OBDX-ILC-Playwright project, generating page objects for any OBDX module (Retail / Corporate / Trade Finance / Approvals), writing or refactoring `.spec.ts` files for OBDX flows, picking selectors against `oj-*` elements, handling Maker/Checker / OTP / dual-factor flows, parsing test data from the project Excel sheets, or making structural changes to the project. This skill takes precedence over generic Playwright guides for any OBDX-specific decision.
---

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
