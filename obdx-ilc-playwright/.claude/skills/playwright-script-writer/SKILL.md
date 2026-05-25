---
name: playwright-script-writer
description: "Generates production-grade Playwright + TypeScript automation scripts that conform to the Techlogix QA framework conventions (Page Object Model, fixtures, path aliases, TC-ID naming). Use whenever a QA engineer asks to write, generate, scaffold, or automate a test case into Playwright code, convert test cases to .spec.ts files, create or extend page objects, add new specs to an existing framework, or turn a user story / UST into runnable tests. Triggers on any mention of 'write a Playwright test', 'automate this test case', 'create a spec file', 'add a page object', 'convert UST to tests', '.spec.ts', 'POM class', 'Playwright script', or similar. Auto-triggers even when the user just pastes test cases or a UST and asks for automation, without naming Playwright explicitly."
---

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
