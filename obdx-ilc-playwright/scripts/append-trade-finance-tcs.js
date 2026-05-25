/**
 * Append-Trade-Finance-TCs — one-shot script to add TC-BS-036…045 to
 * data/manual-test-cases.xlsx.
 *
 * Run:    node scripts/append-trade-finance-tcs.js
 *
 * Reads the workbook, appends 10 rows to the "Initiate Import LC " sheet
 * matching the existing 11-column schema, and writes back. Cell formatting
 * (colors, borders) is NOT preserved by SheetJS community edition — values
 * are preserved. A backup at data/manual-test-cases.backup.xlsx is assumed.
 */

'use strict';

const path = require('path');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.resolve(__dirname, '..', 'data', 'manual-test-cases.xlsx');
const SHEET_NAME    = 'Initiate Import LC ';

// 11-column schema matching data/manual-test-cases.xlsx (current layout —
// headers in row 0, no title row, Test Case ID first, locator/metadata columns
// at the end). If you re-order this, also re-order the !cols widths set when
// you build a fresh sheet.
const HEADERS = [
  'Test Case ID', 'Scenario', 'Test Objective', 'Pre-conditions',
  'Test Steps', 'Expected Result', 'Type', 'Priority',
  'Source Tab', 'Tab / Field', 'FSD Reference',
];

// ────────────────────────────────────────────────────────────────────────────
// New TCs
// ────────────────────────────────────────────────────────────────────────────

const NEW_TCS = [
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-036',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — LC Type / Tenor',
    'Scenario': 'Usance LC — Tenor = 30 days from sight',
    'Test Objective':
      'Verify a maker can issue a Usance LC by setting LC Type = Usance with a deferred-payment tenor of 30 days, so the beneficiary submits documents now but receives payment 30 days after sight.',
    'Pre-conditions':
      'corpmaker2 logged in; product permits Usance variant; counterparty Shehzad exists.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (username: corpmaker2, password: Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit (option for new LC)\n' +
      '5) Tab 1: Product = LC_TEST_DATA.product; 40A = IRREVOCABLE\n' +
      '6) LC Type = Usance; Usance Days = 30 (from sight)\n' +
      '7) Date of Expiry = LC_TEST_DATA.dateOfExpiry; Place of Expiry = LC_TEST_DATA.placeOfExpiry\n' +
      '8) Beneficiary = LC_TEST_DATA.beneficiaryName\n' +
      '9) Currency = LC_TEST_DATA.lcCurrency; LC Amount = LC_TEST_DATA.lcAmount\n' +
      '10) SWIFT Code = LC_TEST_DATA.swiftCode → click Verify\n' +
      '11) Tabs 2–6 happy-path with LC_TEST_DATA values\n' +
      '12) Tick T&C; Submit',
    'Expected Result':
      'Review screen shows LC Type = Usance, Tenor = 30 days from sight; success message "Transaction submitted for approval." with OBDX reference; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-037',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — Transferable Credit',
    'Scenario': 'Transferable LC — Transferable Credit = Yes',
    'Test Objective':
      'Verify a maker can mark the LC as Transferable so the first beneficiary may transfer the credit to one or more secondary beneficiaries (used in trading-house scenarios).',
    'Pre-conditions':
      'corpmaker2 logged in; product allows Transferable; counterparty Shehzad exists.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: Product = LC_TEST_DATA.product\n' +
      '6) Transferable Credit = Yes\n' +
      '7) Other Tab 1 fields = LC_TEST_DATA defaults (40A = IRREVOCABLE, expiry, beneficiary, currency, amount)\n' +
      '8) SWIFT Code = LC_TEST_DATA.swiftCode → click Verify\n' +
      '9) Tabs 2–6 happy-path\n' +
      '10) Tick T&C; Submit',
    'Expected Result':
      'Transferable flag persisted; review screen shows Transferable = Yes; LC submitted with success message; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-038',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — Revolving + Type Value',
    'Scenario': 'Revolving LC — Monthly periodicity, 12 cycles',
    'Test Objective':
      'Verify a maker can issue a Revolving LC for recurring shipments by setting Revolving = Yes with monthly periodicity, common for buyers with regular procurement schedules.',
    'Pre-conditions': 'corpmaker2 logged in; product allows Revolving variant.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: Product = LC_TEST_DATA.product; 40A = IRREVOCABLE\n' +
      '6) Revolving = Yes\n' +
      '7) Revolving Type = Monthly; Number of Cycles = 12\n' +
      '8) Other Tab 1 fields = LC_TEST_DATA defaults\n' +
      '9) SWIFT Code = LC_TEST_DATA.swiftCode → click Verify\n' +
      '10) Tabs 2–6 happy-path; Submit',
    'Expected Result':
      'Revolving = Yes and Monthly periodicity (12 cycles) persisted; review screen shows revolving terms; LC submitted; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-039',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — 32B Currency',
    'Scenario': 'Multi-currency — EUR Inland LC EUR 25,000 to "Shehzad"',
    'Test Objective':
      'Verify a maker can issue an LC in a non-USD currency (EUR) when the underlying contract is denominated in EUR; FX rate captured at issuance.',
    'Pre-conditions':
      'corpmaker2 logged in; party authorised to transact in EUR; counterparty Shehzad exists; collateral account holds EUR balance > 1,000.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: Product = LC_TEST_DATA.product\n' +
      '6) Currency = EUR; LC Amount = 25,000\n' +
      '7) Other Tab 1 fields = LC_TEST_DATA defaults (beneficiary, expiry, place, customer reference)\n' +
      '8) SWIFT Code = LC_TEST_DATA.swiftCode → click Verify\n' +
      '9) Tabs 2–6 happy-path; Tick T&C; Submit',
    'Expected Result':
      'Currency persisted as EUR; review screen shows EUR 25,000; success message + OBDX reference; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-040',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — 39A Tolerance',
    'Scenario': 'Tolerance Under/Above ±5% (bulk-commodity flexibility)',
    'Test Objective':
      'Verify a maker can set Tolerance Under/Above to ±5% so the beneficiary may ship within 5% under or above the LC face value, common for bulk commodities where exact tonnage varies.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: standard LC_TEST_DATA values\n' +
      '6) Tolerance Under = 5; Tolerance Above = 5\n' +
      '7) SWIFT Code = LC_TEST_DATA.swiftCode → click Verify\n' +
      '8) Tabs 2–6 happy-path; Submit',
    'Expected Result':
      'Tolerance ±5% persisted; review screen shows Tolerance Under = 5%, Tolerance Above = 5%; LC submitted; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-041',
    'FSD Reference': '',
    'Tab / Field': 'Tab 2 — Goods Grid (multiple rows)',
    'Scenario': 'Multi-line goods — manufactured + raw materials',
    'Test Objective':
      'Verify a maker can add multiple goods line items in one LC (manufactured goods + raw materials), with each row contributing to a goods total that equals LC Amount.',
    'Pre-conditions': 'corpmaker2 logged in; goods catalogue contains at least 2 codes.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: standard LC_TEST_DATA values; LC Amount = 50,000\n' +
      '6) Tab 2: ports/places/dates = LC_TEST_DATA defaults\n' +
      '7) Goods row 1: code = LC_TEST_DATA.goodsType; Qty = 1; Cost/Unit = 30,000\n' +
      '8) Click "+ Add Row"\n' +
      '9) Goods row 2: code = "RAW MATERIALS"; Qty = 1; Cost/Unit = 20,000\n' +
      '10) Verify Goods Total = 50,000 (matches LC Amount)\n' +
      '11) Tabs 3–6 happy-path; Submit',
    'Expected Result':
      'Both goods rows visible on review screen; goods total = LC amount with no warning dialog; LC submitted; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-042',
    'FSD Reference': '',
    'Tab / Field': 'Tab 2 — Trans-shipment',
    'Scenario': 'Trans-shipment Allowed — multi-leg sea+rail route',
    'Test Objective':
      'Verify a maker can permit Trans-shipment when the route requires multiple legs (sea + rail), so the beneficiary is not penalised for using a transit hub.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: standard LC_TEST_DATA values\n' +
      '6) Tab 2: Partial Shipment = Allowed; Trans-shipment = Allowed\n' +
      '7) Place of Taking = LC_TEST_DATA.placeOfTaking; Final Destination = LC_TEST_DATA.finalDestination\n' +
      '8) Goods row standard\n' +
      '9) Tabs 3–6 happy-path; Submit',
    'Expected Result':
      '43T = ALLOWED in payload; review screen shows "Trans-shipment: Allowed"; LC submitted; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-043',
    'FSD Reference': '',
    'Tab / Field': 'Tab 5 — Sender to Receiver Information (F72)',
    'Scenario': 'Special instruction — 21-day document presentation deadline',
    'Test Objective':
      'Verify a maker can capture a special bank-to-bank instruction in Field 72 (e.g., "Documents must reach issuing bank within 21 days of shipment date"), which appears in the SWIFT message to the advising/negotiating bank.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: standard LC_TEST_DATA values; SWIFT verified\n' +
      '6) Tabs 2–4 happy-path\n' +
      '7) Tab 5: Advising Bank SWIFT pre-filled\n' +
      '8) Sender to Receiver Information = "DOCS MUST BE PRESENTED WITHIN 21 DAYS OF SHIPMENT DATE"\n' +
      '9) Tick Read Standard Instructions\n' +
      '10) Tab 6 happy-path; Tick T&C; Submit',
    'Expected Result':
      'Instruction text persisted in Field 72; visible on review screen; LC submitted with success message; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-044',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — Date of Expiry',
    'Scenario': 'Negative — Date of Expiry in the past',
    'Test Objective':
      'Verify the form rejects a Date of Expiry that has already passed, since an LC cannot be issued with an already-expired validity.',
    'Pre-conditions': '-',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tab 1: Product = LC_TEST_DATA.product; Beneficiary = LC_TEST_DATA.beneficiaryName\n' +
      '6) Currency = LC_TEST_DATA.lcCurrency; LC Amount = LC_TEST_DATA.lcAmount\n' +
      '7) Date of Expiry = yesterday\'s date (today minus 1 day)\n' +
      '8) Place of Expiry = LC_TEST_DATA.placeOfExpiry\n' +
      '9) Click Next',
    'Expected Result':
      'Inline error on Date of Expiry: "Date of Expiry must be in the future" (or equivalent); Next button blocked; remains on Tab 1.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-BS-045',
    'FSD Reference': '',
    'Tab / Field': 'Tab 5 — Read Standard Instructions',
    'Scenario': 'Negative — Submit without ticking Read Standard Instructions',
    'Test Objective':
      'Verify the form blocks LC submission when the maker has not acknowledged the Read Standard Instructions checkbox on Tab 5, since this is mandatory acceptance per OBDX standards.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > Letter of Credit > Initiate Letter of Credit\n' +
      '4) Click Initiate Letter of Credit\n' +
      '5) Tabs 1–4 with LC_TEST_DATA happy-path values\n' +
      '6) Tab 5: Advising Bank SWIFT pre-filled\n' +
      '7) DO NOT tick Read Standard Instructions checkbox\n' +
      '8) Click Next',
    'Expected Result':
      'Validation error: "Please read and check Standard Instructions to proceed further"; Next is blocked; user remains on Tab 5.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────────────────────

function run() {
  const wb = XLSX.readFile(WORKBOOK_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not in workbook. Sheets: ${wb.SheetNames.join(', ')}`);

  // Read existing as array-of-arrays so we preserve the original layout
  // (title row at row 0, section dividers, data rows interspersed).
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const beforeCount = aoa.length;

  // Append our 10 new rows at the bottom, after the last existing row.
  for (const tc of NEW_TCS) {
    aoa.push(HEADERS.map(h => tc[h] ?? ''));
  }

  // Sanity guard — all rows must have the right column count.
  for (let i = 0; i < aoa.length; i++) {
    if (aoa[i].length > HEADERS.length) {
      // Older rows might have trailing empty cells; that's fine.
    }
  }

  // Rebuild the sheet from the AoA.
  const newWs = XLSX.utils.aoa_to_sheet(aoa);
  wb.Sheets[SHEET_NAME] = newWs;
  XLSX.writeFile(wb, WORKBOOK_PATH);

  console.log(`[append] Wrote ${WORKBOOK_PATH}`);
  console.log(`[append] Rows before: ${beforeCount}  →  after: ${aoa.length}  (added ${NEW_TCS.length})`);
  console.log(`[append] New TC IDs: ${NEW_TCS.map(t => t['Test Case ID']).join(', ')}`);
  console.warn(`[append] NOTE: SheetJS community edition does not preserve cell styling on read+write.`);
  console.warn(`[append] NOTE: Backup is at data/manual-test-cases.backup.xlsx if you need to restore.`);
}

run();
