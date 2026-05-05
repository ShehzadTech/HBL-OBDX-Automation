# OBDX 25.1 — Import Letter of Credit Automation
## Playwright TypeScript Framework — ILC-INL (Inland Sight LC)

---

## Project Structure

```
obdx-ilc-playwright/
├── playwright.config.ts          # Playwright configuration
├── package.json                  # Dependencies and npm scripts
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Environment variable template
├── .env                          # Your local env (not committed to git)
│
├── test-data/
│   └── lcTestData.ts             # All test data constants (ILC-INL)
│
├── utils/
│   ├── ojHelper.ts               # Oracle JET component helpers (fill, select, checkbox)
│   └── waitHelper.ts             # Smart wait utilities (no hard waits)
│
├── pages/
│   ├── LoginPage.ts              # Login screen POM
│   ├── DashboardPage.ts          # Dashboard + side-menu navigation POM
│   └── ImportLcFlowPage.ts       # End-to-end Create Import LC flow POM
│                                 # (LC nav/listing → Tabs 1–7 → Review → Confirmation)
│
└── tests/
    └── ilc-create.spec.ts        # E2E test specifications
```

---

## Prerequisites

- **Node.js** v18 or later: https://nodejs.org/
- **VS Code**: https://code.visualstudio.com/
- **Playwright VS Code extension** (optional but recommended): search "Playwright Test for VSCode" in Extensions

---

## Setup Instructions

### 1. Open the project in VS Code

```bash
# Extract the ZIP, then open the folder in VS Code
File → Open Folder → select obdx-ilc-playwright/
```

### 2. Install dependencies

Open the VS Code terminal (`Ctrl+``) and run:

```bash
npm install
```

### 3. Install Playwright browsers

```bash
npx playwright install chromium
```

### 4. Configure environment variables

```bash
# A .env file is included with default values
# Edit .env if your credentials or base URL differ:

OBDX_USER=corpmaker2
OBDX_PASSWORD=Admin@131
BASE_URL=http://172.20.3.113:7777
```

> ⚠️ **Note:** The variable is named `OBDX_USER` (not `USERNAME`).  
> `USERNAME` is a reserved Windows environment variable and will cause conflicts.

---

## Running Tests

### Run all tests (headless)
```bash
npm test
```

### Run tests in headed mode (see the browser)
```bash
npm run test:headed
```

### Run tests in debug mode (step-by-step with Playwright Inspector)
```bash
npm run test:debug
```

### View HTML report after test run
```bash
npm run test:report
```

### Run a specific test file
```bash
npx playwright test tests/ilc-create.spec.ts
```

### Run a specific test by title
```bash
npx playwright test --grep "TC-ILC-001"
```

---

## Test Cases

| TC ID | Title | Type |
|---|---|---|
| TC-ILC-001 | Create Import LC (ILC-INL) end-to-end — happy path | E2E / Positive |
| TC-ILC-002 | Login with invalid credentials | Negative |
| TC-ILC-003 | Navigation to Import LC listing page | Smoke |

---

## Known Behaviours / Important Notes

### 1. Mandatory: Read Standard Instructions Checkbox
On the **Instructions tab**, the "Read Standard Instructions" checkbox **must** be checked.  
If skipped, the Submit button shows:  
> *"Please read and check Standard Instructions to proceed further"*

`ImportLcFlowPage.fillInstructions()` handles this via a JS click on the underlying checkbox input.

### 2. Goods Total Amount Warning
On the **Goods & Shipment tab**, after clicking Next you may see:  
> *"Goods total amount () should be equal to LC amount (50000)"*

Click **OK** — the form still proceeds to the next tab. `ImportLcFlowPage.fillGoodsAndShipment()` dismisses this warning automatically.

### 3. Oracle JET (OJet) Components
OBDX uses Oracle JET custom elements (`oj-input-text`, `oj-select-one`, etc.).  
**Standard Playwright `fill()` does NOT trigger OJet reactive bindings.**  
All input operations use the native `HTMLInputElement.value` setter + dispatched events via `ojHelper.ts`.

### 4. Screen Size Warning on Login
A screen-size warning dialog may appear after login.  
`DashboardPage.dismissScreenSizeWarning()` handles this automatically.

### 5. Toast Notifications
"System cannot process the request" toasts may appear after login.  
`DashboardPage.dismissAllToasts()` dismisses all visible toasts.

### 6. Documents Tab — NO INTERACTION
The Documents tab must be navigated through without any field interactions.  
`ImportLcFlowPage.navigateThroughDocuments()` only clicks the Next button using JS.

---

## Architecture

- **POM (Page Object Model):** Each tab/page has its own class in `pages/`
- **OjHelper:** Oracle JET-aware fill/select/checkbox utilities
- **WaitHelper:** Condition-based waits (no `page.waitForTimeout` except as last resort)
- **Test Data:** Centralised in `test-data/lcTestData.ts`
- **Environment:** `.env` file with `dotenv` — credentials not hardcoded in tests

---

## Functional Test Cases (Full Detail)

### TC-ILC-001: Create Import LC — Happy Path

**Preconditions:**
- OBDX 25.1 is running at the configured BASE_URL
- User `corpmaker2` exists with role that allows Import LC creation
- Beneficiary "Shehzad" exists in the system
- Collateral account AT30008010036 exists for the user
- AIG Insurance policy 123456789 is available

**Test Steps & Expected Results:**

| # | Step | Expected Result |
|---|---|---|
| 1 | Navigate to BASE_URL | Login page loads |
| 2 | Enter username: corpmaker2, password: Admin@131, click Login | Dashboard loads |
| 3 | Dismiss screen-size warning (if shown) | Warning closes |
| 4 | Click hamburger menu → Trade Finance → Letter Of Credit → Import Letter of Credit → Initiate Import LC | LC listing page loads |
| 5 | Click "Create LC" | LC creation form opens, Tab 1 (LC Details) active |
| 6 | Select product: ILC-INL | Product "Import Letter of Credit-INLAND SIGHT LC" selected |
| 7 | Fill Date of Expiry: 12/31/2026 | Date populated |
| 8 | Fill Place of Expiry: LONDON | Field populated |
| 9 | Select Beneficiary: Shehzad | Beneficiary selected |
| 10 | Select Currency: USD | Currency set to USD |
| 11 | Fill LC Amount: 50000 | Amount populated |
| 12 | Fill Customer Reference: CUSTREF2024001 | Reference populated |
| 13 | Fill SWIFT Code: CITIGB2LXXX, click Verify | Bank verified successfully |
| 14 | Click Next | Tab 2 (Goods & Shipment) becomes active |
| 15 | Select Partial Shipment: Allowed | Dropdown set |
| 16 | Select Transshipment: Allowed | Dropdown set |
| 17 | Fill Place of Taking: SHANGHAI PORT | Field populated |
| 18 | Fill Final Destination: PORT OF LONDON | Field populated |
| 19 | Fill Shipment Date: 11/30/2026 | Date populated |
| 20 | Fill Port of Loading: SHANGHAI | Field populated |
| 21 | Fill Port of Discharge: LONDON | Field populated |
| 22 | Fill Goods Description: CILLAFABRIC | Field populated |
| 23 | Click Next | Goods warning may appear (click OK) → Tab 3 (Documents) active |
| 24 | On Documents tab: DO NOT interact with any field | Tab 3 visible, no changes made |
| 25 | Click Next on Documents tab | Tab 4 (Linkages) active |
| 26 | Click "Click here to add Collateral Linkage" | Collateral row form opens |
| 27 | Fill Account: AT30008010036, Amount: 1000 | Collateral row populated |
| 28 | Click Next | Tab 5 (Instructions) active |
| 29 | Verify Advising Bank SWIFT: CITIGB2LXXX | SWIFT pre-filled from LC Details |
| 30 | Check "Read Standard Instructions" checkbox | Checkbox checked (mandatory) |
| 31 | Click Next | Tab 6 (Insurance) active |
| 32 | Select AIG Insurance row (policy 123456789) | Row selected |
| 33 | Click Next | Tab 7 (Attachments) active |
| 34 | Click Submit | Review page loads (URL contains review-letter-of-credit) |
| 35 | Review all entered data on review page | All data matches input |
| 36 | Click Submit on review page | Confirmation page loads |
| 37 | Assert message: "Transaction submitted for approval." | ✅ Message visible |
| 38 | Assert status: "Pending for Approval" | ✅ Status visible |
| 39 | Note reference number | Reference number displayed (e.g., 280448514BFD) |

**Expected Final Status:** Pending for Approval  
**Expected Message:** Transaction submitted for approval.

---

### TC-ILC-002: Invalid Login

| # | Step | Expected Result |
|---|---|---|
| 1 | Navigate to BASE_URL | Login page loads |
| 2 | Enter username: invaliduser, password: WrongPass@999 | — |
| 3 | Click Login | Error message visible: "Invalid Username and/or Password" |

---

### TC-ILC-003: Navigation Smoke Test

| # | Step | Expected Result |
|---|---|---|
| 1 | Login with valid credentials | Dashboard loads |
| 2 | Navigate via menu to Initiate Import LC | LC listing page loads |
| 3 | Assert "Create LC" button is visible | Button visible and clickable |
| 4 | Assert URL contains "lc-nav-bar" | URL matches pattern |

---
*Generated by Playwright automation framework for OBDX 25.1 — ILC-INL*
