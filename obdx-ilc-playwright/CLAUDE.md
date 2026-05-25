# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Playwright + TypeScript automation for **OBDX 25.1 (HBL)** — Trade Finance module. The AUT is an Oracle JET single-page app, which drives most of the framework's design decisions.

Flows currently automated (Maker side, one spec + one POM + one test-data file each):

| Flow | Spec | POM | Test data |
|---|---|---|---|
| Create Import LC (ILC-INL) | `ilc-create.spec.ts` | `ImportLcFlowPage` | `lcTestData.ts` |
| Amend Import LC | `amend-import-lc.spec.ts` | `AmendImportLcFlowPage` | `amendLcTestData.ts` |
| Cancel Import LC | `cancel-import-lc.spec.ts` | `CancelImportLcFlowPage` | `cancelLcTestData.ts` |
| View Import LC | `view-import-lc.spec.ts` | `ViewImportLcFlowPage` | `viewLcTestData.ts` |
| Initiate Transfer LC | `initiate-transfer-lc.spec.ts` | `InitiateTransferLcFlowPage` | `initiateTransferLcTestData.ts` |
| Initiate Outward BG | `initiate-outward-bg.spec.ts` | `InitiateOutwardBgFlowPage` | `initiateOutwardBgTestData.ts` |
| Settlement of Import Bill | `settlement-import-bill.spec.ts` | `SettlementImportBillFlowPage` | `settleImportBillTestData.ts` |

When making OBDX-specific decisions (locators, sync, maker/checker flows), follow the `obdx-25.1-framework` skill — it is authoritative over generic Playwright guidance.

## Automation workflow — scrape-first (mandatory for NEW flows)

When automating a flow that is *not* already in the table above, **scrape real DOM locators from a live happy-path run BEFORE writing any POM or spec code**. The FSD/RSD/RTM describes requirements, not the rendered DOM — only the live AUT is the source-of-truth for locators and LOV values. Guessing locators from the FSD has produced repeated runtime failures (TC-IOBG-005 strict-mode, TC-IOBG-009 product-code mismatch, TC-IOBG-010 "Type of Guarantee" vs live "Purpose of Message", etc.).

Two entry paths feed the same scrape step:

**Path A — new requirements document (FSD / RSD / RTM):**
1. Write the manual test cases (11-column schema, new sheet in `data/manual-test-cases.xlsx`).
2. Scrape: drive the live AUT through the happy path autonomously, emit `data/scraped/<flow>-scraped.json`.
3. Write the POM + spec + `data/<flow>TestData.ts` referencing only the scraped locators.

**Path B — manual TCs already exist:**
1. Read the existing TC sheet.
2. Scrape (same as Path A step 2).
3. Write the POM + spec + test data referencing only the scraped locators, mapping the captured fields onto the TC steps.

**Scrape capture format** (per interacted field):
- literal `id` (e.g. `Currency2681350`)
- stable fallback: `[id^="Currency"]`, role + accessible-name, placeholder
- the actual value entered / selected (raw text for inputs, visible option label for dropdowns)
- tab / SWIFT-section context
- whether the field appeared mandatory (validation error if left blank)

**Rules:**
- Open every dropdown during the scrape — capture actual visible option labels. Never assume FSD-described values exist verbatim.
- For SWIFT / customer / account LOVs, pick whatever the live dropdown shows. Don't hard-code from the requirements doc.
- If the live AUT is unreachable, stop and flag it — do not silently fall back to FSD-guessing.
- The seven flows in the table above are *not* rescraped — this rule applies to new flow automation only.

## Commands

```bash
npm test                                           # all tests, headless
npm run test:headed                                # watch the browser
npm run test:debug                                 # Playwright Inspector
npm run test:report                                # open last HTML report
npm run report:custom                              # custom dashboard HTML (generate-custom-report.js)

npx playwright test tests/trade-finance/<file>     # single spec
npx playwright test --grep "TC-AMLC-007"           # single TC by ID
npx playwright test --grep "@smoke"                # tag-filtered run
TEST_ENV=uat npm test                              # switch env (dev|sit|uat)
DEBUG=1 npm test                                   # enable log.debug() output
```

There is no lint or typecheck script. Use `npx tsc --noEmit` for a type check before non-trivial refactors.

## Architecture

### Fixtures-first wiring (`fixtures/auth.fixture.ts`)
Specs import `test` and `expect` from `@fixtures/auth.fixture`, **not** from `@playwright/test`. The fixture file exposes `loginPage`, `dashboardPage`, `importLcFlowPage`, `amendImportLcFlowPage`, and a `loggedInDashboard` fixture that runs login on each test. No `storageState` caching yet — every test currently re-logs in.

Newer flow specs (Cancel / View / Transfer / Outward BG / Settlement) currently instantiate their POMs directly inside the test body rather than via fixtures. When adding more tests against those POMs, prefer extending `auth.fixture.ts` with the missing fixture rather than copy-pasting `new XxxFlowPage(page)` everywhere.

### Path aliases (set in `tsconfig.json`)
`@pages/*`, `@utils/*`, `@fixtures/*`, `@config/*`, `@data/*`. Always use these in imports — never relative paths across these dirs.

### Page Object layout
- `pages/common/` — `LoginPage`, `DashboardPage`. Cross-module concerns: hamburger nav (Trade Finance → Letter Of Credit / Bank Guarantee / Bills → submenu), screen-size dialog, toast dismissal. `DashboardPage` is the only place new submenu walks should be added — keep flow POMs free of menu navigation.
- `pages/trade-finance/` — one POM per end-to-end flow (Import / Amend / Cancel / View / Transfer / Outward BG / Settlement). Each tab of the multi-tab form is a method on the flow POM, not a separate class.

### Environment config (`config/environments.ts`)
Loaded via `dotenv` from `.env` at repo root. `ENV.user/password/baseUrl/*Timeout` are the single source of truth — never read `process.env.*` directly in tests or POMs. Note: env var is `OBDX_USER` (not `USERNAME` — that one is a reserved Windows env var and silently breaks things).

### Test data
- `data/<flow>TestData.ts` — typed constants, one file per flow (see flow table above). All exports are `as const` and ship a matching `<Flow>TestData` type alias. New flows should follow the same shape (per-tab section headers, negative-test data grouped at the bottom).
- `data/manual-test-cases.xlsx` — source-of-truth manual cases, read via `utils/excelReader.ts`. The reader handles a SheetJS quirk where styled merged-cell headers come back as `__EMPTY*` keys with real headers in row 0 — don't "fix" that by stripping the branch.
- `data/manual-test-cases.backup*.xlsx` — historical snapshots of the workbook, kept intentionally for diff review when the cases sheet is regenerated. `~$manual-test-cases.xlsx` is Excel's open-file lock; never commit it.
- LC reference numbers used by negative tests (`partiallyDrawnLcRef`, `expiredLcRef`, `pendingAmendmentLcRef`, etc.) are environment-specific. When the test env is reseeded, those refs need updating in the corresponding `*TestData.ts`.

### Playwright config (`playwright.config.ts`)
`workers: 1`, `fullyParallel: false`, `retries: 0` locally / `1` on CI. Chromium only. Headless is **off** by default (`headless: false`) — this matches how this team runs the suite. Reporters: list + html + json + a custom dashboard reporter.

## OBDX / Oracle JET specifics — non-obvious rules

Most flake in this codebase comes from violating these. Read before touching POMs.

### 1. `page.fill()` does not commit values into JET components
Use `OjHelper.ojFill(selector, value)` for `oj-input-text`. It does focus → native `HTMLInputElement.value` setter → `input` / `change` / `keyup` events → blur. Without that cycle JET's bound model stays empty even though the DOM shows text, and validation fails with "Enter a value". Same applies to `ojFillDate` for date fields.

Dropdowns: use `OjHelper.ojSelectByText` (simple) or `ojSelectWithSearch` (those with a floating search overlay). Checkboxes: `ojCheckCheckbox` toggles via `.click()` on the underlying input (the `oj-checkboxset` wrapper does not respond to standard checks).

### 2. JS-click escape hatches exist — use them sparingly
`OjHelper.jsClickButton(text)` bypasses CSS `pointer-events`; some greyed-out-looking buttons are actually clickable and the AUT relies on a JS click. The "Read Standard Instructions" checkbox and the Documents-tab Next button are documented users of this escape hatch. Do not introduce new JS-click calls without confirming the standard click truly fails.

### 3. Synchronization is condition-based, not time-based
`utils/waitHelper.ts` exposes `waitForSpinner`, `waitForUrlFragment`, `waitForTabActive`, `waitForText`, `waitForNetworkIdle`. `shortPause(ms)` exists for animations that have no observable end state — treat each call as a debt and prefer a condition where possible.

### 4. Mandatory dismissals after login
`DashboardPage.waitForDashboard()` runs `dismissScreenSizeWarning` + `dismissAllToasts`. Login-followed-by-action tests must call it; skipping it lets a toast cover the hamburger menu and the next click misses.

### 5. Hamburger-menu navigation is sequential, not parallel
`navigateToInitiateImportLC` / `navigateToAmendImportLC` / `navigateToViewImportLC` each open the side menu and walk the submenu top-down with short pauses. Menu labels vary across HBL builds — `amendImportLC` matches `/amend/i`, `viewImportLC` matches `/\bview\s+(import|letter)/i` (a bare `/view/i` greedily matches the hidden "Overview" entry). Preserve those regex anchors if you touch them.

### 6. ILC-INL flow gotchas (encoded as POM behavior — preserve)
- **Instructions tab:** "Read Standard Instructions" checkbox is mandatory; without it Submit shows "Please read and check Standard Instructions to proceed further".
- **Goods & Shipment tab:** A "Goods total amount should equal LC amount" warning may appear after Next — the POM dismisses it automatically and proceeds.
- **Documents tab:** Do not interact with any field. `navigateThroughDocuments()` only clicks Next via JS.
- **Goods row math:** `quantity × costPerUnit` must equal `lcAmount` to avoid the total-mismatch warning. The defaults in `LC_TEST_DATA` already satisfy this (1 × 50000 = 50000).

## Spec conventions

### TC-ID naming and tags
- `TC-ILC-NNN` (Create Import LC), `TC-AMLC-NNN` (Amend), `TC-AMBS-NNN` (Amend business scenarios), `TC-…-NNN` negative cases.
- Tag tests with `@smoke` or `@regression` so `--grep "@smoke"` works. Example: `'TC-AMLC-007 @smoke  Amend Type 40A …'`.

### `test.fixme` for environment-dependent tests
State-dependent or fixture-dependent cases (expired LC, partially-drawn LC, oversize file fixture, etc.) are marked `test.fixme()` with an inline `// TODO:` explaining what's missing. **Keep this pattern** — do not silently skip with `test.skip()` and do not delete the test scaffolding. The TODO comment is the contract for unblocking.

### Serial mode for stateful flows
Maker/checker and tab-progression flows live inside `test.describe.configure({ mode: 'serial' })` because they share AUT state (a pending amendment removes the LC from the amendable list). If you parallelize anything, only parallelize across files, never within a tab-progression describe block.

### Shared helpers inside specs
`loginAndOpenListing(page)` and `loginAndOpenLcForAmendment(page, lcRef?)` are defined at the top of `amend-import-lc.spec.ts`. Reuse them — do not inline the login/navigate dance in new tests.

## Auxiliary subsystems

### `n8n/` — TSD-to-spec generation pipeline
Self-hosted n8n workflow that takes a TSD/UST, calls Claude twice (Stage 1 produces an 11-column manual-test-case JSON; Stage 2 transpiles it to a `.spec.ts` conforming to this framework), runs `npx tsc --noEmit` as a gate, and optionally executes the suite.

Key files: `n8n/workflow.json` (importable), `n8n/prompts/01-test-cases.md` and `n8n/prompts/02-playwright.md` (canonical prompt source — kept in sync with the prompts embedded in the workflow's Code nodes; **if you change one, change the other**), `n8n/examples/sample-tsd.md`.

Gotchas if you touch this:
- The workflow's `Set Config` node hard-codes `projectPath = E:/QA Artifacts/...`. Adjust to local repo path before running.
- Stage 2's "use only these existing methods" allow-list is a hand-maintained snapshot of `ImportLcFlowPage`. Adding methods there without updating the prompt produces `// FIXME:` markers in generated specs.
- Generated specs land in `tests/trade-finance/<slug>.spec.ts` — review `// FIXME:` comments before running.

### `scripts/` — manual-test-cases.xlsx maintenance
- `append-trade-finance-tcs.js`, `append-amend-import-lc-tcs.js` — append rows to `data/manual-test-cases.xlsx` for a given flow. Run with `node scripts/<file>.js`. Always close the workbook in Excel first (the `~$manual-test-cases.xlsx` lockfile blocks writes).

### `fixtures/attachments/`
PDF fixtures used by file-upload tests (amend supporting docs, beneficiary consent, board resolution, proforma invoice, revised PO, trade licence). The Amend spec resolves them via `path.resolve(__dirname, '..', '..', 'fixtures', 'attachments')`. Some `test.fixme`s in `amend-import-lc.spec.ts` are gated on additional fixtures that do not yet exist (`amendment_5mb.pdf`, `amendment_oversize.pdf`, `amendment_unsupported.exe`, `.jpeg`, `.doc`, `.png` variants) — adding those files unblocks the corresponding cases.

## Reports & artifacts

- `playwright-report/` — standard HTML + `results.json`
- `reports/custom-report.html` + `reports/history.json` — custom dashboard reporter output
- `test-results/` — per-test screenshots, video (`retain-on-failure`), trace (`on-first-retry`)
- `test-run.log` — captured stdout from last run; useful for grepping `log.debug` output when `DEBUG=1`

## Things known to be brittle (do not "fix" casually)

- Excel reader's `__EMPTY` branch (see "Test data" above) — load-bearing.
- `LoginPage.login` resolves on URL change *or* visible error — the error branch exists so invalid-credential tests don't hang for 30s. Don't simplify to URL-only.
- Dashboard menu label regexes (see Section 5 above) — there are HBL builds where naive `/view/i` matches the wrong item.
- The Instructions-tab JS click — needed because the checkbox input is hidden behind a JET wrapper.
- LC reference numbers in `*TestData.ts` are tied to the test environment's seeded data. When `032ELAN230891001` / `PK2ILUN221108046` / etc. disappear from the Active list, tests will fail at `searchLcByNumber` — that's an env reseed, not a code bug. Update the refs in test data, do not weaken the search.
- The n8n workflow embeds prompts inside Code nodes *and* keeps them in `n8n/prompts/*.md` for editability. Drift between the two is silent — only changing one is a real bug.
