# OBDX 25.1 — Trade Finance Automation

Playwright + TypeScript automation for the **OBDX 25.1 (HBL)** Trade Finance module. The AUT is an Oracle JET single-page app; the framework's design decisions (custom OJet helpers, condition-based waits, scrape-first authoring) flow from that.

> For architectural depth, OJet specifics, brittleness notes, and the scrape-first workflow, see [`CLAUDE.md`](./CLAUDE.md). This README is the quick-start.

---

## Automated Flows

| Flow | Spec | POM | Test data |
|---|---|---|---|
| Create Import LC (ILC-INL) | `ilc-create.spec.ts` | `ImportLcFlowPage` | `lcTestData.ts` |
| Amend Import LC | `amend-import-lc.spec.ts` | `AmendImportLcFlowPage` | `amendLcTestData.ts` |
| Cancel Import LC | `cancel-import-lc.spec.ts` | `CancelImportLcFlowPage` | `cancelLcTestData.ts` |
| View Import LC | `view-import-lc.spec.ts` | `ViewImportLcFlowPage` | `viewLcTestData.ts` |
| Initiate Transfer LC | `initiate-transfer-lc.spec.ts` | `InitiateTransferLcFlowPage` | `initiateTransferLcTestData.ts` |
| Initiate Outward BG | `initiate-outward-bg.spec.ts` | `InitiateOutwardBgFlowPage` | `initiateOutwardBgTestData.ts` |
| View Outward BG | `view-outward-bg.spec.ts` | `ViewOutwardBgFlowPage` | `viewOutwardBgTestData.ts` |
| Settlement of Import Bill | `settlement-import-bill.spec.ts` | `SettlementImportBillFlowPage` | `settleImportBillTestData.ts` |

---

## Project Structure

```
obdx-ilc-playwright/
├── playwright.config.ts          # Chromium, custom dashboard reporter
├── package.json
├── tsconfig.json                 # Path aliases: @pages, @utils, @fixtures, @config, @data
│
├── config/
│   └── environments.ts           # ENV.user/password/baseUrl/*Timeout (loaded via dotenv)
│
├── data/
│   ├── <flow>TestData.ts         # Typed `as const` test data, one file per flow
│   ├── manual-test-cases.xlsx    # Source-of-truth manual TCs (11-column schema)
│   └── scraped/                  # Live-DOM scrape JSON for new flows (scrape-first rule)
│
├── fixtures/
│   ├── auth.fixture.ts           # `test`/`expect` exporter + loggedInDashboard fixture
│   
│
├── pages/
│   ├── common/                   # LoginPage, DashboardPage (hamburger nav lives here)
│   └── trade-finance/            # One POM per end-to-end flow (see table above)
│
├── tests/
│   └── trade-finance/            # One spec per flow
│
├── utils/
│   ├── ojHelper.ts               # OJet-aware fill / select / checkbox / date
│   ├── waitHelper.ts             # Condition-based waits (no hard sleeps)
│   ├── excelReader.ts            # Reads manual-test-cases.xlsx
│   └── logger.ts                 # DEBUG=1 toggles log.debug()
│
├── scripts/                      # Maintenance scripts for manual-test-cases.xlsx
├── playwright-report/            # Standard HTML report + results.json (regenerated)
├── reports/                      # Custom dashboard HTML (regenerated)
└── test-results/                 # Screenshots / video / traces (regenerated)
```

---

## Prerequisites

- **Node.js** v18 or later — https://nodejs.org/
- **VS Code** + the *Playwright Test for VSCode* extension (recommended)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browser (Chromium only)
npx playwright install chromium

# 3. Configure environment
#    Create .env in the project root:
OBDX_USER=corpmaker2
OBDX_PASSWORD=Admin@131
BASE_URL=http://172.20.3.113:7777
```

> The username variable is `OBDX_USER`, not `USERNAME` — `USERNAME` is a reserved Windows env var and silently breaks things.

---

## Running Tests

```bash
npm test                                           # all tests (headless off by default)
npm run test:headed                                # watch the browser
npm run test:debug                                 # Playwright Inspector
npm run test:report                                # open the last HTML report
npm run report:custom                              # build the custom dashboard

npx playwright test tests/trade-finance/<file>     # single spec
npx playwright test --grep "TC-AMLC-007"           # single TC by ID
npx playwright test --grep "@smoke"                # tag-filtered run

TEST_ENV=uat npm test                              # switch env (dev | sit | uat)
DEBUG=1 npm test                                   # enable log.debug() output
```

There is no lint or typecheck npm script. Run `npx tsc --noEmit` before non-trivial refactors.

---

## TC-ID Naming & Tags

- `TC-ILC-NNN` (Create Import LC), `TC-AMLC-NNN` (Amend), `TC-AMBS-NNN` (Amend business scenarios), `TC-CLC-NNN` (Cancel), `TC-VLC-NNN` (View), `TC-ITLC-NNN` (Transfer), `TC-IOBG-NNN` (Outward BG), `TC-VOBG-NNN` (View Outward BG), `TC-SIB-NNN` (Settlement).
- Tag with `@smoke` or `@regression` so `--grep "@smoke"` works.

---

## Reports & Artifacts

- `playwright-report/` — standard HTML report + `results.json`
- `reports/custom-report.html` + `reports/history.json` — custom dashboard
- `test-results/` — screenshots, video (`retain-on-failure`), trace (`on-first-retry`)
- `test-run*.log` — captured stdout from recent runs (useful with `DEBUG=1`)

---

## Important Notes

1. **OJet (Oracle JET) components** — standard `page.fill()` does **not** commit values into JET-bound models. Always use `OjHelper.ojFill` / `ojSelectByText` / `ojCheckCheckbox` / `ojFillDate`.
2. **Read Standard Instructions checkbox** (Instructions tab) is mandatory — `ImportLcFlowPage.fillInstructions()` JS-clicks it.
3. **Documents tab** — do NOT interact with any field. `navigateThroughDocuments()` only clicks Next via JS.
4. **Screen-size warning + toasts** after login are dismissed automatically by `DashboardPage.waitForDashboard()` — always call it after login.
5. **Scrape-first rule for NEW flows** — drive a live happy-path scrape and emit `data/scraped/<flow>-scraped.json` BEFORE writing POM/spec code. The FSD describes requirements; only the live AUT is the source-of-truth for locators and LOV values. See `CLAUDE.md` § *Automation workflow*.

---

*Framework for OBDX 25.1 — HBL Trade Finance module*
