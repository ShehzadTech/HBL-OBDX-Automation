/**
 * Append-Amend-Import-LC-TCs — adds a new sheet "Amend Import LC" to
 * data/manual-test-cases.xlsx with the full set of Maker-only Amend Import LC
 * test cases (TC-AMLC-* and TC-AMBS-*).
 *
 * Run:    node scripts/append-amend-import-lc-tcs.js
 *
 * Backup: data/manual-test-cases.backup-<timestamp>.xlsx is created automatically
 *         before any write.
 *
 * Heads-up: SheetJS community edition does NOT preserve cell styling on
 * read+write — values are preserved, formatting (colours, borders, merges)
 * is not. Apply formatting manually after import if required.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const XLSX = require('xlsx');

const WORKBOOK_PATH = path.resolve(__dirname, '..', 'data', 'manual-test-cases.xlsx');
const BACKUP_PATH   = path.resolve(__dirname, '..', 'data', `manual-test-cases.backup-${Date.now()}.xlsx`);
const SHEET_NAME    = 'Amend Import LC';

// 11-column schema matching data/manual-test-cases.xlsx (current layout —
// headers in row 0, no title row, Test Case ID first, locator/metadata columns
// at the end). If you re-order this, also re-order the !cols widths set when
// you build a fresh sheet.
const HEADERS = [
  'Test Case ID', 'Scenario', 'Test Objective', 'Pre-conditions',
  'Test Steps', 'Expected Result', 'Type', 'Priority',
  'Source Tab', 'Tab / Field', 'FSD Reference',
];

// ─────────────────────────────────────────────────────────────────────────────
// Test cases
// ─────────────────────────────────────────────────────────────────────────────

const TAB1 = [
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-001',
    'FSD Reference': 'FSD pp.146–147 step 1',
    'Tab / Field': 'LC Listing > Search & Open',
    'Scenario': 'Open Amend Import LC via Toggle Menu',
    'Test Objective': 'Verify a maker can navigate to Amend Letter of Credit, search for an existing Active Import LC, and open it for amendment with all original values pre-populated.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891001 exists under party ID with Active status.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Toggle Menu > Trade Finance > Letter of Credit > Import Letter of Credit > Amend Import LC\n' +
      '4) On listing, search LC Number = 032ELAN230891001\n' +
      '5) Click Apply\n' +
      '6) Click LC Number link in result row',
    'Expected Result': 'Initiate Import LC Amendment screen opens (URL contains ojr=amend-lc;module=letter-of-credit); Tab 1 active; all editable fields (40A, 31D, 32B, 39C, 41A, 42C, 21A, 59) populated with original LC values.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-002',
    'FSD Reference': 'FSD p.147 step 1 (alt nav)',
    'Tab / Field': 'View LC > Amendments > Initiate Amendment',
    'Scenario': 'Navigate via View LC → Amendments → Initiate Amendment',
    'Test Objective': 'Verify the alternate navigation from View Letter of Credit > Amendments tab opens the Amend screen for the same LC.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891001 exists.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Toggle Menu > Trade Finance > Letter of Credit > Import LC > View Letter of Credit\n' +
      '3) Search and open LC 032ELAN230891001\n' +
      '4) Click Amendments tab\n' +
      '5) Click Initiate Amendment link',
    'Expected Result': 'Amend Import LC screen opens directly for the selected LC; Tab 1 active; same screen as TC-AMLC-001.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-003',
    'FSD Reference': 'FSD p.147 step 1 (alt nav)',
    'Tab / Field': 'Dashboard > Quick Links',
    'Scenario': 'Navigate via Dashboard Quick Links',
    'Test Objective': 'Verify the Initiate LC Amendment quick link on Trade Finance overview opens the Amend screen.',
    'Pre-conditions': 'corpmaker2 logged in; Trade Finance Overview widget visible on Dashboard.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) On Dashboard, locate Trade Finance Overview card\n' +
      '3) Under Quick Links, click Initiate LC Amendment',
    'Expected Result': 'Amend Import LC listing screen loads.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-004',
    'FSD Reference': 'FSD p.147 step 1',
    'Tab / Field': 'LC Listing > Manage Column',
    'Scenario': 'Manage Column — reorder & hide',
    'Test Objective': 'Verify a maker can rearrange and hide columns on the listing and the preference persists.',
    'Pre-conditions': 'corpmaker2 logged in; on Amend Import LC listing.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Navigate to Amend Import LC listing\n' +
      '3) Click Manage Column\n' +
      '4) Untick Issue Date\n' +
      '5) Drag LC Amount above Beneficiary\n' +
      '6) Click Save\n' +
      '7) Refresh page',
    'Expected Result': 'Issue Date hidden; LC Amount appears immediately to the left of Beneficiary; preference persists after refresh.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-005',
    'FSD Reference': 'FSD p.147 step 1',
    'Tab / Field': 'LC Listing > Download',
    'Scenario': 'Download list as PDF',
    'Test Objective': 'Verify a maker can download the filtered LC list as PDF.',
    'Pre-conditions': 'corpmaker2 logged in; ≥1 LC visible.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) On Amend Import LC listing, click Download\n' +
      '3) Select PDF',
    'Expected Result': 'PDF downloads; opens with same rows/columns as on-screen listing.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-006',
    'FSD Reference': 'FSD p.147 step 1',
    'Tab / Field': 'LC Listing > Download',
    'Scenario': 'Download list as CSV',
    'Test Objective': 'Verify a maker can download the filtered LC list as CSV.',
    'Pre-conditions': 'corpmaker2 logged in; ≥1 LC visible.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) On listing, click Download\n' +
      '3) Select CSV',
    'Expected Result': 'CSV downloads; UTF-8; columns match on-screen view.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-007',
    'FSD Reference': 'FSD p.148 field 9 (40A)',
    'Tab / Field': 'Tab 1 — Type of Documentary Credit',
    'Scenario': 'Amend Type 40A — Non Transferable → Transferable',
    'Test Objective': 'Verify a maker can change Type of Documentary Credit to Transferable so the first beneficiary may transfer the credit downstream.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891001 currently Non Transferable.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1 (ref_22): Type of Documentary Credit radio → select Transferable\n' +
      '4) Click Next',
    'Expected Result': 'Type updated to Transferable; review later shows old vs new tag; tab navigation succeeds.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-008',
    'FSD Reference': 'FSD p.148 field 10 (31D)',
    'Tab / Field': 'Tab 1 — Date of Expiry',
    'Scenario': 'Amend Date of Expiry to 12/31/2027',
    'Test Objective': 'Verify a maker can extend the LC Date of Expiry.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Date of Expiry (ref_36) → 12/31/2027\n' +
      '4) Click Next',
    'Expected Result': 'New expiry accepted; field shows old vs new value; validation passes.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-009',
    'FSD Reference': 'FSD p.148 field 11 (31D)',
    'Tab / Field': 'Tab 1 — Place of Expiry',
    'Scenario': 'Amend Place of Expiry to LONDON',
    'Test Objective': 'Verify a maker can change the place of LC expiry.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Place of Expiry (ref_37) = LONDON\n' +
      '4) Click Next',
    'Expected Result': 'Value saved.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-010',
    'FSD Reference': 'FSD p.148 field 12 (59)',
    'Tab / Field': 'Tab 1 — Beneficiary Block (59)',
    'Scenario': 'Amend Beneficiary Name, Address, Country',
    'Test Objective': 'Verify a maker can update the full beneficiary block (Name, Bank Address Line 1, Address Line 2, Country) when beneficiary details change.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Beneficiary Name (ref_38) = MARKS AND SPENCER PLC\n' +
      '4) Beneficiary Bank Address Line 1 (ref_39) = MARGUS2SXXX\n' +
      '5) Address Line 2 (ref_40) = 100 Baker Street\n' +
      '6) Country (ref_41) = GB\n' +
      '7) Click Next',
    'Expected Result': 'All four beneficiary fields persisted; review screen shows updated block.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-011',
    'FSD Reference': 'FSD p.148 field 13 (32B)',
    'Tab / Field': 'Tab 1 — LC Amount',
    'Scenario': 'Amend LC Amount to GBP 7500.00',
    'Test Objective': 'Verify a maker can amend LC Amount; goods total must subsequently match.',
    'Pre-conditions': 'corpmaker2 logged in; original LC Amount differs from 7500.00.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: LC Amount (ref_42) = 7500.00\n' +
      '4) Click Next',
    'Expected Result': 'Amount saved as 7500.00; charges recalculated on summary; downstream Tab 2 goods total must equal 7500.00 (Rule 1).',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-012',
    'FSD Reference': 'FSD p.148 field 14 (32B)',
    'Tab / Field': 'Tab 1 — Tolerance',
    'Scenario': 'Amend Tolerance Under/Above to ±5%',
    'Test Objective': 'Verify a maker can set ±5% tolerance for shipment-quantity flexibility.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Tolerance Under (ref_43) = 5; Tolerance Above (ref_44) = 5\n' +
      '4) Click Next',
    'Expected Result': 'Tolerance saved as ±5%.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-013',
    'FSD Reference': 'FSD p.148 field 15 (39C)',
    'Tab / Field': 'Tab 1 — Additional Amount Covered',
    'Scenario': 'Amend Additional Amount Covered text',
    'Test Objective': 'Verify a maker can record additional amount covered (insurance, freight) in 39C textarea.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Additional Amount Covered (ref_46) = "Insurance charges included"\n' +
      '4) Click Next',
    'Expected Result': 'Value saved; appears on review.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-014',
    'FSD Reference': 'FSD p.148 (21A)',
    'Tab / Field': 'Tab 1 — Customer Reference Number',
    'Scenario': 'Amend Customer Reference Number',
    'Test Objective': 'Verify a maker can update the customer reference linking the LC to the underlying PO.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Customer Reference Number (ref_47) = PO-2026-INT-00789\n' +
      '4) Click Next',
    'Expected Result': 'Value saved; visible on review.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-015',
    'FSD Reference': 'FSD p.148 fields 19–21 (41A, 42C)',
    'Tab / Field': 'Tab 1 — Bank & Tenor',
    'Scenario': 'Amend Credit Available With (41A), Tenor and Credit Days From (42C)',
    'Test Objective': 'Verify a maker can amend Credit Available With bank, draft Tenor and Credit Days From.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Bank Details / Credit Available With (ref_48) = CITIGB2LXXX\n' +
      '4) Tenor (ref_49) = 90\n' +
      '5) Credit Days From (ref_50) = BILL OF LADING DATE\n' +
      '6) Click Next',
    'Expected Result': 'All three fields saved.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-016',
    'FSD Reference': 'FSD p.148 field 19 (41A)',
    'Tab / Field': 'Tab 1 — Credit Available With (radio)',
    'Scenario': 'Switch Credit Available With radio: SWIFT Code vs Bank Address',
    'Test Objective': 'Verify the radio toggle shows the correct sub-fields for SWIFT Code vs Bank Address modes.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Credit Available With radio → SWIFT Code\n' +
      '4) Verify Drawee SWIFT input visible\n' +
      '5) Toggle radio → Bank Address\n' +
      '6) Verify Bank Name + Address inputs visible (Drawee SWIFT hidden)\n' +
      '7) Toggle back to SWIFT Code',
    'Expected Result': 'Sub-fields swap correctly per radio selection; previously entered values for the active mode persist.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-017',
    'FSD Reference': 'FSD p.148 (Drawee SWIFT Verify)',
    'Tab / Field': 'Tab 1 — Drawee SWIFT',
    'Scenario': 'Verify Drawee SWIFT Code (CITIGB2LXXX)',
    'Test Objective': 'Verify the Verify button (ref_53) fetches Drawee bank details from SWIFT directory.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Drawee SWIFT (ref_51) = CITIGB2LXXX\n' +
      '4) Click Verify (ref_53)',
    'Expected Result': 'Drawee bank Name and Address auto-populate from SWIFT directory; field locks.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-N01',
    'FSD Reference': 'FSD p.148 field 10',
    'Tab / Field': 'Tab 1 — Date of Expiry',
    'Scenario': 'Negative — Past Date of Expiry',
    'Test Objective': 'Verify the form rejects a Date of Expiry that has already passed.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Date of Expiry (ref_36) = 01/15/2024\n' +
      '4) Tab out of field',
    'Expected Result': 'Inline error on Date of Expiry: "Date of Expiry must be in the future" (or equivalent); Next blocked; remains on Tab 1.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-N02',
    'FSD Reference': 'FSD p.148 field 13 (32B)',
    'Tab / Field': 'Tab 1 — LC Amount',
    'Scenario': 'Negative — LC Amount = 0.00',
    'Test Objective': 'Verify the form rejects an LC Amount of zero.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: LC Amount (ref_42) = 0.00\n' +
      '4) Tab out',
    'Expected Result': 'Inline error: "Amount must be greater than zero." Next blocked.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-N03',
    'FSD Reference': 'FSD p.148 field 13 (32B)',
    'Tab / Field': 'Tab 1 — LC Amount',
    'Scenario': 'Negative — Reduce amount below already-drawn balance',
    'Test Objective': 'Verify the form rejects an LC Amount reduction below the amount already drawn under the LC.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891005 has GBP 5,000 drawn out of GBP 7,500 face value.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891005 (partially drawn LC)\n' +
      '3) Tab 1: LC Amount (ref_42) = 4500.00\n' +
      '4) Click Next',
    'Expected Result': 'Validation error: "Reduced amount cannot be less than amount already drawn (GBP 5,000.00)."',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-N04',
    'FSD Reference': 'FSD p.148 field 14 (32B)',
    'Tab / Field': 'Tab 1 — Tolerance',
    'Scenario': 'Negative — Tolerance > 100% rejected',
    'Test Objective': 'Verify Tolerance accepts only 0–100.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Tolerance Under (ref_43) = 150\n' +
      '4) Tab out',
    'Expected Result': 'Inline error: "Tolerance must be between 0 and 100." Next blocked.',
    'Type': 'Negative',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 1 — LC Details',
    'Test Case ID': 'TC-AMLC-N05',
    'FSD Reference': 'Validation Rule 2',
    'Tab / Field': 'Tab 1 — Drawee SWIFT',
    'Scenario': 'Negative — Next clicked without Drawee SWIFT verification',
    'Test Objective': 'Verify the form blocks Next when Drawee SWIFT was entered but Verify button was not clicked.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Drawee SWIFT (ref_51) = CITIGB2LXXX (do NOT click Verify)\n' +
      '4) Click Next',
    'Expected Result': 'Validation: "Please verify the Drawee SWIFT Code before proceeding." Next blocked.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

const TAB2 = [
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-018',
    'FSD Reference': 'FSD p.148 field 22 (43P)',
    'Tab / Field': 'Tab 2 — Partial Shipment',
    'Scenario': 'Amend Partial Shipment to Allowed',
    'Test Objective': 'Verify a maker can change Partial Shipment dropdown to Allowed.',
    'Pre-conditions': 'corpmaker2 logged in; on Tab 2.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click Tab 2 (ref_23)\n' +
      '4) Partial Shipment (ref_59) → Allowed\n' +
      '5) Click Next',
    'Expected Result': 'Saved.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-019',
    'FSD Reference': 'FSD p.148 field 23 (43T)',
    'Tab / Field': 'Tab 2 — Transshipment',
    'Scenario': 'Amend Transshipment to Allowed',
    'Test Objective': 'Verify a maker can permit Transshipment.',
    'Pre-conditions': 'corpmaker2 logged in; on Tab 2.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Transshipment (ref_61) → Allowed\n' +
      '4) Click Next',
    'Expected Result': 'Saved; review screen shows Transshipment = Allowed.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-020',
    'FSD Reference': 'FSD p.148–149 fields 24–26 (44A/E/F/B)',
    'Tab / Field': 'Tab 2 — Ports & Places',
    'Scenario': 'Amend ports and places end-to-end (KARACHI → LONDON route)',
    'Test Objective': 'Verify all four place fields can be amended for a Pakistan-to-UK shipment.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Place of Taking in Charge (ref_63) = KARACHI PORT\n' +
      '4) Port of Loading (ref_64) = KPKHI – Karachi Port\n' +
      '5) Port of Discharge (ref_65) = GBLON – Port of London\n' +
      '6) Place of Final Destination (ref_66) = LONDON WAREHOUSE\n' +
      '7) Click Next',
    'Expected Result': 'All four fields saved; appear on review.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-021',
    'FSD Reference': 'FSD p.149 fields 27–28 (44C/44D)',
    'Tab / Field': 'Tab 2 — Shipment Date/Period toggle',
    'Scenario': 'Switch Shipment toggle Date → Period; enter Shipment Period text',
    'Test Objective': 'Verify the radio toggle switches between Shipment Date and Shipment Period inputs and saves the chosen mode value.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Shipment radio → Period\n' +
      '4) Shipment Period (ref_67) = SHIPMENT WITHIN 60 DAYS FROM LC DATE\n' +
      '5) Click Next',
    'Expected Result': 'Shipment Period text saved; only Period field is sent (Shipment Date hidden).',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-022',
    'FSD Reference': 'FSD p.149 fields 29–33 (45A)',
    'Tab / Field': 'Tab 2 — Goods Grid',
    'Scenario': 'Amend Goods row — HS Code, Quantity, Cost/Unit, auto-Gross',
    'Test Objective': 'Verify the goods row updates and Gross Amount auto-calculates from Qty × Cost; goods total = LC Amount.',
    'Pre-conditions': 'corpmaker2 logged in; LC Amount = GBP 7500.00 (per TC-AMLC-011).',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Goods row 1 — HS Code (ref_70) = 1059200\n' +
      '4) Quantity (ref_73) = 500\n' +
      '5) Cost/Unit (ref_74) = 15.00\n' +
      '6) Verify Gross Amount (ref_75) auto-calc = 7500.00\n' +
      '7) Click Next',
    'Expected Result': 'Description, Qty, Cost saved; Gross Amount = 7500.00 (Qty × Cost); equals LC Amount → no warning; tab navigation succeeds.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-023',
    'FSD Reference': 'FSD p.149 (Add/Delete Goods row)',
    'Tab / Field': 'Tab 2 — Goods Grid Actions',
    'Scenario': 'Add and delete a goods row',
    'Test Objective': 'Verify a maker can add a second goods row and delete it.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Click Add Goods row (ref_77)\n' +
      '4) New row appears\n' +
      '5) Click Delete (ref_76) on the new row\n' +
      '6) Confirm deletion',
    'Expected Result': 'New row added then removed; original row 1 unaffected.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-N06',
    'FSD Reference': 'Validation Rule 1',
    'Tab / Field': 'Tab 2 — Goods Grid (Total)',
    'Scenario': 'Negative — Goods Total ≠ LC Amount',
    'Test Objective': 'Verify the form blocks Next when Goods Total does not equal LC Amount (Rule 1).',
    'Pre-conditions': 'corpmaker2 logged in; LC Amount = GBP 7500.00.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: LC Amount = 7500.00; Next\n' +
      '4) Tab 2: Goods row — HS Code = 1059200, Quantity = 500, Cost/Unit = 20.00\n' +
      '5) Verify Gross Amount = 10000.00\n' +
      '6) Click Next',
    'Expected Result': 'Warning dialog: "Goods total amount must equal LC Amount (GBP 7,500.00). Current total: GBP 10,000.00." Next blocked until reconciled.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 2 — Goods & Shipment',
    'Test Case ID': 'TC-AMLC-N07',
    'FSD Reference': 'FSD p.149 field 31 (46A)',
    'Tab / Field': 'Tab 2 — Goods Grid',
    'Scenario': 'Negative — Quantity = 0',
    'Test Objective': 'Verify Quantity must be greater than zero.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Goods row — Quantity (ref_73) = 0\n' +
      '4) Tab out',
    'Expected Result': 'Inline error: "Quantity must be greater than zero."',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

const TAB3 = [
  {
    'Source Tab': 'Tab 3 — Documents & Conditions',
    'Test Case ID': 'TC-AMLC-024',
    'FSD Reference': 'FSD p.149 fields 34–36 (47A)',
    'Tab / Field': 'Tab 3 — Air Way Documents',
    'Scenario': 'Amend Air Way Documents row — Original 3, Copies 2',
    'Test Objective': 'Verify a maker can update the Air Way Documents row counts.',
    'Pre-conditions': 'corpmaker2 logged in; on Tab 3.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click Tab 3 (ref_24)\n' +
      '4) Air Way Documents row — Original (ref_85) = 3, Originals Required (ref_86) = 3, Number of Copies (ref_87) = 2\n' +
      '5) Click Next',
    'Expected Result': 'Values saved.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 3 — Documents & Conditions',
    'Test Case ID': 'TC-AMLC-025',
    'FSD Reference': 'FSD p.149 (View Clause)',
    'Tab / Field': 'Tab 3 — Insurance Documents > View Clause',
    'Scenario': 'View Clause for Insurance Documents',
    'Test Objective': "Verify the View Clause link opens the clause overlay populated with the document's clause text.",
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: Insurance Documents — Original (ref_89) = 2, Copies (ref_91) = 1\n' +
      '4) Click View Clause (ref_92)\n' +
      '5) On overlay, edit description; click Submit',
    'Expected Result': 'Overlay opens with current clause; edit saved; document row marked as having clause.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 3 — Documents & Conditions',
    'Test Case ID': 'TC-AMLC-026',
    'FSD Reference': 'FSD p.149 field 37 (47A)',
    'Tab / Field': 'Tab 3 — Additional Conditions',
    'Scenario': 'Add Additional Condition row — ADDCONDISS / ORIGINAL',
    'Test Objective': 'Verify a maker can add an Additional Conditions row with Code and Identifier.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: Click Add Condition (ref_127)\n' +
      '4) New row appears — Condition Code (ref_109) = ADDCONDISS\n' +
      '5) Identifier (ref_111) = ORIGINAL\n' +
      '6) Click View/Edit (ref_113); confirm description; Submit',
    'Expected Result': 'Row added; Code and Identifier saved; description visible on review.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 3 — Documents & Conditions',
    'Test Case ID': 'TC-AMLC-027',
    'FSD Reference': 'FSD p.149 field 37 (47A)',
    'Tab / Field': 'Tab 3 — Additional Conditions',
    'Scenario': 'Delete Additional Condition row',
    'Test Objective': 'Verify a maker can delete an Additional Conditions row.',
    'Pre-conditions': 'corpmaker2 logged in; ≥1 condition row exists.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: On Additional Conditions row, click Delete (ref_120)\n' +
      '4) Confirm prompt',
    'Expected Result': 'Row removed; remaining rows reorder.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 3 — Documents & Conditions',
    'Test Case ID': 'TC-AMLC-028',
    'FSD Reference': 'FSD p.149 field 38 (Field 48)',
    'Tab / Field': 'Tab 3 — Number of Days',
    'Scenario': 'Amend Field 48 — Number of Days = 21',
    'Test Objective': 'Verify a maker can set the days within which documents must be presented.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: Number of Days (ref_128) = 21\n' +
      '4) Click Next',
    'Expected Result': 'Saved; validated against Date of Expiry.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 3 — Documents & Conditions',
    'Test Case ID': 'TC-AMLC-029',
    'FSD Reference': 'FSD p.149 field 39, 47',
    'Tab / Field': 'Tab 3 — Incoterms',
    'Scenario': 'Amend Incoterms = CIF-Cost Insurance Freight',
    'Test Objective': 'Verify a maker can change the incoterm.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: Incoterms (ref_130) → CIF-Cost Insurance Freight\n' +
      '4) Click Next',
    'Expected Result': 'Incoterm saved.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
];

const TAB4 = [
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-030',
    'FSD Reference': 'Validation Rule 2',
    'Tab / Field': 'Tab 4 — Advising Bank SWIFT',
    'Scenario': 'Verify Advising Bank SWIFT (CITIGB2LXXX)',
    'Test Objective': 'Verify the Verify button (ref_137) fetches Advising bank details.',
    'Pre-conditions': 'corpmaker2 logged in; on Tab 4.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click Tab 4 (ref_25)\n' +
      '4) Advising Bank SWIFT (ref_135) = CITIGB2LXXX\n' +
      '5) Click Verify (ref_137)',
    'Expected Result': 'Advising bank Name and Address auto-populate from SWIFT directory.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-031',
    'FSD Reference': 'FSD p.149 field 40 (49G)',
    'Tab / Field': 'Tab 4 — Special Payment Conditions for Beneficiary',
    'Scenario': 'Amend Special Payment Conditions — Beneficiary',
    'Test Objective': 'Verify a maker can record beneficiary-specific payment conditions.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Special Payment Conditions for Beneficiary (ref_139) = "Payment to be made within 5 working days of document presentation"\n' +
      '4) Click Next',
    'Expected Result': 'Text saved; visible on review.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-032',
    'FSD Reference': 'FSD p.149 field 41 (49H)',
    'Tab / Field': 'Tab 4 — Special Payment Conditions for Bank Only',
    'Scenario': 'Amend Special Payment Conditions — Bank Only',
    'Test Objective': 'Verify a maker can record bank-only payment conditions.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Special Payment Conditions for Bank Only (ref_140) = "Documents must be presented at issuing bank counter"\n' +
      '4) Click Next',
    'Expected Result': 'Text saved (internal review only; not on outbound SWIFT).',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-033',
    'FSD Reference': 'FSD p.149 fields 42–43 (49 + 58A)',
    'Tab / Field': 'Tab 4 — Confirmation',
    'Scenario': 'Amend Confirmation Instruction = Confirm + Confirming Bank (HSBC BANK PLC)',
    'Test Objective': 'Verify a maker can request LC confirmation by selecting Confirm and entering confirming-bank details (different from Advising Bank).',
    'Pre-conditions': 'corpmaker2 logged in; Advising Bank SWIFT = CITIGB2LXXX (verified).',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Confirmation Instructions radio → Confirm\n' +
      '4) Requested Confirmation Party (ref_141) → Confirming Bank\n' +
      '5) Confirming Bank — radio: Bank Address mode\n' +
      '6) Bank Name (ref_159) = HSBC BANK PLC\n' +
      '7) Address Line 1 (ref_160) = 8 Canada Square, Canary Wharf\n' +
      '8) Address Line 2 (ref_161) = London\n' +
      '9) Address Line 3 (ref_162) = E14 5HQ, United Kingdom\n' +
      '10) Click Next',
    'Expected Result': 'All fields persist; Confirming Bank ≠ Advising Bank validated; tab navigation succeeds.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-034',
    'FSD Reference': 'FSD p.149 fields 44–46 (72Z, 71D, 71N)',
    'Tab / Field': 'Tab 4 — Charges & 72Z',
    'Scenario': 'Amend Sender to Receiver Info, Charges, Amendment Charge Payable By',
    'Test Objective': 'Verify a maker can amend Field 72Z, 71D charge text, and Amendment Charge Payable By (71N).',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Sender to Receiver Information (ref_147) = "All charges outside Pakistan are for beneficiary account"\n' +
      '4) Charges (ref_148) = "ALL CHARGES OUTSIDE PAKISTAN ARE FOR BENEFICIARY ACCOUNT"\n' +
      '5) Amendment Charge Payable By (ref_149) → Applicant\n' +
      '6) Click Next',
    'Expected Result': 'All three fields saved.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-035',
    'FSD Reference': 'FSD p.149 (Special Instructions)',
    'Tab / Field': 'Tab 4 — Special Instructions',
    'Scenario': 'Amend Special Instructions textarea',
    'Test Objective': 'Verify a maker can capture free-form special instructions.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Special Instructions (ref_151) = "Please advise beneficiary immediately upon receipt"\n' +
      '4) Click Next',
    'Expected Result': 'Text saved; visible on review.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-036',
    'FSD Reference': 'Validation Rule 5',
    'Tab / Field': 'Tab 4 — Standard Instructions',
    'Scenario': 'Tick Standard Instructions checkbox to enable Next',
    'Test Objective': 'Verify the Standard Instructions checkbox (ref_152) is mandatory and enables Next.',
    'Pre-conditions': 'corpmaker2 logged in; all Tab 4 fields completed; Advising Bank SWIFT verified.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Complete Tab 4 fields per TC-AMLC-030 to TC-AMLC-035\n' +
      '4) Tick Standard Instructions checkbox (ref_152)\n' +
      '5) Click Next',
    'Expected Result': 'Next becomes enabled when ticked; tab navigation succeeds to Tab 5.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-N08',
    'FSD Reference': 'Validation Rule 5',
    'Tab / Field': 'Tab 4 — Standard Instructions',
    'Scenario': 'Negative — Submit without ticking Standard Instructions',
    'Test Objective': 'Verify the form blocks Next on Tab 4 when Standard Instructions is not ticked.',
    'Pre-conditions': 'corpmaker2 logged in; all Tab 4 fields completed; Advising Bank SWIFT verified.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Complete Tab 4 fields\n' +
      '4) Do NOT tick Standard Instructions checkbox\n' +
      '5) Click Next',
    'Expected Result': 'Validation: "Please read and check Standard Instructions to proceed further." Next blocked.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-N09',
    'FSD Reference': 'Validation Rule 3',
    'Tab / Field': 'Tab 4 — Confirming Bank SWIFT',
    'Scenario': 'Negative — Confirming Bank SWIFT same as Advising Bank',
    'Test Objective': 'Verify the form rejects a Confirming Bank SWIFT identical to the Advising Bank SWIFT (Rule 3).',
    'Pre-conditions': 'corpmaker2 logged in; Advising Bank SWIFT = CITIGB2LXXX (verified).',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Advising Bank SWIFT (ref_135) = CITIGB2LXXX → Verify\n' +
      '4) Confirmation radio → Confirm\n' +
      '5) Confirming Bank — SWIFT mode; Confirming Bank SWIFT (ref_153) = CITIGB2LXXX\n' +
      '6) Click Verify (ref_155)',
    'Expected Result': 'Validation error: "Confirming Bank SWIFT cannot be same as Advising Bank / Advise Through Bank." Confirming Bank does not auto-populate.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 4 — Instructions',
    'Test Case ID': 'TC-AMLC-N10',
    'FSD Reference': 'Validation Rule 2',
    'Tab / Field': 'Tab 4 — Advising Bank SWIFT',
    'Scenario': 'Negative — Next clicked without Advising Bank SWIFT verification',
    'Test Objective': 'Verify the form blocks Next when Advising Bank SWIFT was entered but Verify was not clicked.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Advising Bank SWIFT (ref_135) = CITIGB2LXXX (do NOT click Verify)\n' +
      '4) Tick Standard Instructions\n' +
      '5) Click Next',
    'Expected Result': 'Validation: "Please verify Advising Bank SWIFT before proceeding." Next blocked.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

const TAB5 = [
  {
    'Source Tab': 'Tab 5 — Linkages',
    'Test Case ID': 'TC-AMLC-037',
    'FSD Reference': 'FSD (Cash Collateral linkage)',
    'Tab / Field': 'Tab 5 — Cash Collateral',
    'Scenario': 'Add Cash Collateral linkage — GBP 5,000 / 100% / AT30008010014',
    'Test Objective': 'Verify a maker can link a cash-collateral account at 100% contribution.',
    'Pre-conditions': 'corpmaker2 logged in; account AT30008010014 (MyAccount, GBP, ACTIVE) is mapped to party.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click Tab 5 (ref_26)\n' +
      '4) Click Add Account (ref_929)\n' +
      '5) Contribution Amount (ref_922) = 5000\n' +
      '6) Contribution Percentage (ref_923) = 100\n' +
      '7) Select Account (ref_926) = AT30008010014 (MyAccount | GBP | AT3 | ACTIVE)\n' +
      '8) Currency (ref_927) auto-populates = GBP\n' +
      '9) Click Next',
    'Expected Result': 'Cash collateral row saved with all four values; Currency reflects account currency.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 5 — Linkages',
    'Test Case ID': 'TC-AMLC-038',
    'FSD Reference': 'FSD (Linkages actions)',
    'Tab / Field': 'Tab 5 — Cash Collateral Actions',
    'Scenario': 'Delete Cash Collateral row',
    'Test Objective': 'Verify a maker can remove a previously added collateral row.',
    'Pre-conditions': 'corpmaker2 logged in; ≥1 collateral row exists.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 5: Click Delete on collateral row (ref_928)\n' +
      '4) Confirm prompt',
    'Expected Result': 'Row removed.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 5 — Linkages',
    'Test Case ID': 'TC-AMLC-039',
    'FSD Reference': 'Validation Rule 4',
    'Tab / Field': 'Tab 5 — Deposit Linkage',
    'Scenario': 'Add Deposit linkage — Maturity > LC Expiry',
    'Test Objective': 'Verify a maker can link a deposit whose Maturity Date is greater than LC Expiry (Rule 4).',
    'Pre-conditions': 'corpmaker2 logged in; eligible deposit exists with Maturity Date > 12/31/2027 (e.g. 06/30/2028).',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001 (LC Expiry = 12/31/2027)\n' +
      '3) Tab 5: Deposit Linkage — Select Deposit (ref_924 > ref_925) → pick deposit with Maturity 06/30/2028\n' +
      '4) Click Next',
    'Expected Result': 'Deposit row saved; validation passes (Maturity > LC Expiry).',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 5 — Linkages',
    'Test Case ID': 'TC-AMLC-N11',
    'FSD Reference': 'Validation Rule 4',
    'Tab / Field': 'Tab 5 — Deposit Linkage',
    'Scenario': 'Negative — Deposit Maturity ≤ LC Expiry',
    'Test Objective': 'Verify the form rejects a deposit whose Maturity Date is on or before the LC Expiry Date (Rule 4).',
    'Pre-conditions': 'corpmaker2 logged in; LC Expiry = 12/31/2027; eligible test deposit with Maturity 11/30/2027.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 5: Deposit Linkage — Select Deposit → pick deposit with Maturity 11/30/2027\n' +
      '4) Click Next',
    'Expected Result': 'Validation error: "Deposit Maturity Date must be greater than LC Expiry Date." Deposit not added; Next blocked.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

const TAB6 = [
  {
    'Source Tab': 'Tab 6 — Insurance',
    'Test Case ID': 'TC-AMLC-040',
    'FSD Reference': 'FSD (Insurance tab)',
    'Tab / Field': 'Tab 6 — Insurance Policy',
    'Scenario': 'Select existing insurance policy — AIG INSURANCE 123456789',
    'Test Objective': 'Verify a maker can select an existing insurance policy from the radio list.',
    'Pre-conditions': 'corpmaker2 logged in; insurance policy 123456789 (AIG INSURANCE) mapped to party.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click Tab 6 (ref_27)\n' +
      '4) Insurance Policy radio list (ref_933 > ref_934) → select 123456789 (AIG INSURANCE | INDIA | 1/1/2021 | 1/1/2025)\n' +
      '5) Click Next',
    'Expected Result': 'Selected policy persists; review screen shows policy number 123456789.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 6 — Insurance',
    'Test Case ID': 'TC-AMLC-041',
    'FSD Reference': 'FSD (Insurance tab)',
    'Tab / Field': 'Tab 6 — Insurance Policy',
    'Scenario': 'Clear policy selection',
    'Test Objective': 'Verify the Clear Selection action de-selects the chosen policy.',
    'Pre-conditions': 'corpmaker2 logged in; ≥1 policy currently selected.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 6: Click Clear Selection (ref_935)',
    'Expected Result': 'Radio button de-selected; no policy linked.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
];

const TAB7 = [
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-042',
    'FSD Reference': 'FSD p.146 (5 MB / multi-file)',
    'Tab / Field': 'Tab 7 — File Upload',
    'Scenario': 'Attach single PDF (amendment_supporting_doc.pdf, 4 MB)',
    'Test Objective': 'Verify a maker can attach a single PDF supporting document.',
    'Pre-conditions': 'corpmaker2 logged in; file amendment_supporting_doc.pdf (4 MB).',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click Tab 7 (ref_28)\n' +
      '4) File Upload area (ref_939) → click and select amendment_supporting_doc.pdf (4 MB)\n' +
      '5) Upload',
    'Expected Result': 'File uploaded; row shows file name, size, remove icon.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-043',
    'FSD Reference': 'FSD p.146 (multi-file)',
    'Tab / Field': 'Tab 7 — File Upload',
    'Scenario': 'Attach multiple files in one action',
    'Test Objective': 'Verify the maker can multi-select different file types in one Attach action.',
    'Pre-conditions': 'corpmaker2 logged in; files amendment_supporting_doc.pdf, amendment_consent.jpeg, amendment_po.doc, amendment_regulator.png (each ≤5 MB).',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 7: Click File Upload\n' +
      '4) Multi-select 4 files: amendment_supporting_doc.pdf, amendment_consent.jpeg, amendment_po.doc, amendment_regulator.png\n' +
      '5) Upload',
    'Expected Result': 'All four files uploaded; each listed with name and size.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-044',
    'FSD Reference': 'FSD p.146',
    'Tab / Field': 'Tab 7 — File Upload',
    'Scenario': 'Remove an attached file before Submit',
    'Test Objective': 'Verify a maker can remove an uploaded file.',
    'Pre-conditions': 'corpmaker2 logged in; ≥1 file already attached.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 7: Click trash/remove icon next to attached file\n' +
      '4) Confirm prompt',
    'Expected Result': 'File removed from attachment list.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-045',
    'FSD Reference': 'Validation Rule 6',
    'Tab / Field': 'Tab 7 — Terms & Conditions',
    'Scenario': 'Tick T&C → Submit enabled',
    'Test Objective': 'Verify the maker must tick T&C before Submit becomes enabled.',
    'Pre-conditions': 'corpmaker2 logged in; all required edits made on Tabs 1–6.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Make valid edits across Tabs 1–6\n' +
      '4) Tab 7: Tick "I accept the Terms & Conditions" (ref_940)\n' +
      '5) Click Submit (ref_941)',
    'Expected Result': 'Submit becomes enabled when ticked; click navigates to review screen (URL: review-amend-letter-of-credit).',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-046',
    'FSD Reference': 'FSD p.147 step 6',
    'Tab / Field': 'Review Screen — Sections',
    'Scenario': 'Review screen — verify all sections shown with Edit / Compare links',
    'Test Objective': 'Verify the review screen displays LC Details, Goods & Shipment, Documents, Instructions, Linkages, Insurance, Attachments — each with Edit (and Compare With Previous Values where applicable).',
    'Pre-conditions': 'corpmaker2 logged in; on review screen post-Submit.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Complete TC-AMLC-045 to reach Review screen\n' +
      '3) Verify page heading "Initiate Import LC Amendment" and banner "Review — You initiated a request to amend the Letter of Credit."\n' +
      '4) Verify all 7 section cards visible with Edit links\n' +
      '5) Verify LC Details, Goods, Documents, Instructions sections also show "Compare With Previous Values" link',
    'Expected Result': 'All sections visible in read-only summary; Edit and Compare links functional.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-047',
    'FSD Reference': 'FSD p.147 step 6',
    'Tab / Field': 'Review Screen — Section Edit',
    'Scenario': 'Edit a section from review and resubmit',
    'Test Objective': 'Verify a maker can edit a section directly from the review screen.',
    'Pre-conditions': 'corpmaker2 logged in; on review screen.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001; reach review screen\n' +
      '3) Click Edit on Goods & Shipment section\n' +
      '4) Quantity = 600; Cost/Unit = 12.50; Verify Gross = 7500.00\n' +
      '5) Click Continue back to review',
    'Expected Result': 'Returns to Tab 2 pre-populated; new values persist; on Continue, review reflects updated values; other sections unchanged.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-048',
    'FSD Reference': 'FSD p.147 step 7',
    'Tab / Field': 'Review Screen — Confirm',
    'Scenario': 'Confirm — success',
    'Test Objective': 'Verify Confirm submits the amendment and produces a success message.',
    'Pre-conditions': 'corpmaker2 logged in; on review screen.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Reach review screen\n' +
      '3) Click Confirm',
    'Expected Result': 'Success message: "Transaction submitted for approval." with OBDX reference number; status = Pending for Approval.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-049',
    'FSD Reference': 'FSD p.147 step 5',
    'Tab / Field': 'Review Screen — Back / Cancel',
    'Scenario': 'Back returns to amendment screen; Cancel returns to Dashboard',
    'Test Objective': 'Verify Back and Cancel behave per FSD.',
    'Pre-conditions': 'corpmaker2 logged in; on review screen.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Reach review screen\n' +
      '3) Click Back\n' +
      '4) Verify returned to Tab 7 (Attachments) with data intact\n' +
      '5) Click Cancel; confirm prompt',
    'Expected Result': 'Back returns to Tab 7 with all entered data preserved; Cancel discards entry and returns to Dashboard.',
    'Type': 'Positive',
    'Priority': 'P3',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-050',
    'FSD Reference': 'FSD p.146 (5 MB cap)',
    'Tab / Field': 'Tab 7 — File Upload',
    'Scenario': 'Boundary — File = exactly 5 MB',
    'Test Objective': 'Verify a 5 MB file uploads successfully (boundary).',
    'Pre-conditions': 'corpmaker2 logged in; file amendment_5mb.pdf exactly 5 MB.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 7: File Upload → select amendment_5mb.pdf\n' +
      '4) Upload',
    'Expected Result': 'Upload succeeds; file listed with size 5.00 MB.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-N12',
    'FSD Reference': 'FSD p.146 (5 MB cap)',
    'Tab / Field': 'Tab 7 — File Upload',
    'Scenario': 'Negative — File over 5 MB rejected',
    'Test Objective': 'Verify a 5 MB + 1 byte file is rejected.',
    'Pre-conditions': 'corpmaker2 logged in; file amendment_oversize.pdf (5.5 MB).',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 7: File Upload → select amendment_oversize.pdf (5.5 MB)\n' +
      '4) Upload',
    'Expected Result': 'Upload blocked: "File size cannot exceed 5 MB." File not added to list.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-N13',
    'FSD Reference': 'FSD p.146 (allowed types)',
    'Tab / Field': 'Tab 7 — File Upload',
    'Scenario': 'Negative — Disallowed file type rejected',
    'Test Objective': 'Verify .exe is blocked (allowed types: .JPEG, .PNG, .DOC, .PDF, .TXT).',
    'Pre-conditions': 'corpmaker2 logged in; file amendment_unsupported.exe.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 7: File Upload → select amendment_unsupported.exe\n' +
      '4) Upload',
    'Expected Result': 'Upload blocked: "Unsupported file type. Allowed: .JPEG, .PNG, .DOC, .PDF, .TXT."',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-N14',
    'FSD Reference': 'Validation Rule 6',
    'Tab / Field': 'Tab 7 — Terms & Conditions',
    'Scenario': 'Negative — Submit without ticking T&C',
    'Test Objective': 'Verify Submit is blocked unless T&C is ticked (Rule 6).',
    'Pre-conditions': 'corpmaker2 logged in; valid edits made; on Tab 7 with T&C unticked.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Make valid edits across Tabs 1–6\n' +
      '4) Tab 7: do NOT tick "I accept the Terms & Conditions" (ref_940)\n' +
      '5) Click Submit (ref_941)',
    'Expected Result': 'Submit button disabled OR clicking shows: "Please accept Terms & Conditions to proceed." Remains on Tab 7.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Tab 7 — Attachments / Submit',
    'Test Case ID': 'TC-AMLC-N15',
    'FSD Reference': 'FSD p.147 step 5',
    'Tab / Field': 'Submit Validation',
    'Scenario': 'Negative — Submit without changing any field',
    'Test Objective': 'Verify the form rejects a submission with no field changes.',
    'Pre-conditions': 'corpmaker2 logged in; LC opened with no edits made.',
    'Test Steps':
      '1) Login as Maker\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Click through Tabs 1–6 without editing any field\n' +
      '4) Tab 7: Tick T&C; Click Submit',
    'Expected Result': 'Inline error: "No amendment captured. Modify at least one field before submitting." Submit blocked.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

const BUSINESS_SCENARIOS = [
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-001',
    'FSD Reference': '',
    'Tab / Field': 'Cross-tab — 31D + 44C/D',
    'Scenario': 'Vessel-delay extension — push expiry and shipment period together',
    'Test Objective': 'Verify a maker can amend Date of Expiry and Shipment Period in one amendment when the carrier reschedules the vessel.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891001 active; original expiry 06/30/2027.',
    'Test Steps':
      '1) Open OBDX corporate URL\n' +
      '2) Login as Maker (corpmaker2 / Admin@131)\n' +
      '3) Trade Finance > LC > Import LC > Amend Import LC\n' +
      '4) Open LC 032ELAN230891001\n' +
      '5) Tab 1: Date of Expiry (ref_36) = 12/31/2027\n' +
      '6) Tab 2: Shipment radio → Period; Shipment Period (ref_67) = SHIPMENT WITHIN 60 DAYS FROM LC DATE\n' +
      '7) Tab 4: Sender to Receiver Information (ref_147) = "SHIPMENT DELAY DUE TO VESSEL RESCHEDULE — REVISED ETA OCT-2027"; tick Standard Instructions\n' +
      '8) Tabs 5–6 as default\n' +
      '9) Tab 7: Tick T&C; Submit; on Review click Confirm',
    'Expected Result': 'Both date amendments captured in one transaction; success message "Transaction submitted for approval." with OBDX reference; status = Pending for Approval; only one amendment fee charged.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-002',
    'FSD Reference': '',
    'Tab / Field': 'Cross-tab — Amount + Tolerance',
    'Scenario': 'Vendor price increase — raise LC Amount, widen tolerance, attach revised PO',
    'Test Objective': 'Verify a maker can increase LC Amount, widen tolerance and record commercial reason for vendor price escalation.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891001 with original LC Amount = GBP 7500.00, tolerance ±5%.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: LC Amount (ref_42) = 9000.00\n' +
      '4) Tolerance Under (ref_43) = 10; Tolerance Above (ref_44) = 10\n' +
      '5) Tab 2: Goods row Quantity (ref_73) = 600; Cost/Unit (ref_74) = 15.00; Gross = 9000.00\n' +
      '6) Tab 4: Sender to Receiver Information (ref_147) = "VENDOR PO REVISION DATED 03-MAY-2026 REF PO-2026-INT-00789 — PRICE ESCALATION 20%"; tick Standard Instructions\n' +
      '7) Tab 7: Attach amendment_revised_po.pdf (≤5 MB); Tick T&C; Submit; Confirm',
    'Expected Result': 'New amount, tolerance and goods total persist; goods total = LC Amount; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-003',
    'FSD Reference': '',
    'Tab / Field': 'Cross-tab — Cancel via amendment',
    'Scenario': 'Cancel-via-amendment — unused LC',
    'Test Objective': 'Verify a maker can effectively cancel an unused LC by amending Date of Expiry to a near-term date with consent attached.',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891008 active with no drawings.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891008\n' +
      '3) Tab 1: Date of Expiry = today + 1\n' +
      '4) Tab 4: Sender to Receiver Information (ref_147) = "CANCELLATION REQUESTED BY APPLICANT — BENEFICIARY CONSENT ATTACHED REF CC-2046"; tick Standard Instructions\n' +
      '5) Tab 7: Attach amendment_beneficiary_consent.pdf; Tick T&C; Submit; Confirm',
    'Expected Result': 'Near-term expiry + consent recorded; success message + OBDX reference; LC will lapse on next-day expiry.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-004',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — Type 40A',
    'Scenario': 'Switch Non Transferable → Transferable for reseller flow',
    'Test Objective': 'Verify a maker can change Type of Documentary Credit so a trading-house beneficiary may transfer credit to a downstream supplier.',
    'Pre-conditions': 'corpmaker2 logged in; LC currently Non Transferable.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Type of Documentary Credit radio → Transferable\n' +
      '4) Tab 4: Sender to Receiver Information (ref_147) = "TYPE CHANGED TO TRANSFERABLE — TRADING HOUSE TO TRANSFER TO SECONDARY SUPPLIER"; tick Standard Instructions\n' +
      '5) Tab 7: Attach amendment_board_resolution.pdf; Tick T&C; Submit; Confirm',
    'Expected Result': 'Type change captured; review shows "Transferable" with old/new tag; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-005',
    'FSD Reference': '',
    'Tab / Field': 'Tab 3 — Documents',
    'Scenario': 'Add Certificate of Origin and Inspection Certificate',
    'Test Objective': 'Verify a maker can add additional required documents to comply with destination-country import regulations.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: Click Add Document (ref_105)\n' +
      '4) Add Certificate of Origin row — Original = 1, Copies = 2\n' +
      '5) Add Inspection Certificate row — Original = 1, Copies = 1\n' +
      '6) View Clause for Inspection Certificate → pick "Issued by SGS or equivalent"; Submit overlay\n' +
      '7) Tab 4: Sender to Receiver Information (ref_147) = "CoO AND INSPECTION CERT ADDED PER UK CUSTOMS REGULATION"; tick Standard Instructions\n' +
      '8) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': 'Both new documents added with correct counts and clauses; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-006',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — Tolerance',
    'Scenario': 'Bulk-commodity tolerance widening (±5% → ±10%)',
    'Test Objective': 'Verify a maker can widen tolerance for bulk commodities.',
    'Pre-conditions': 'corpmaker2 logged in; LC for bulk commodity; original tolerance ±5%.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Tolerance Under (ref_43) = 10; Tolerance Above (ref_44) = 10\n' +
      '4) Tab 4: Sender to Receiver Information (ref_147) = "TOLERANCE WIDENED TO ±10% TO COVER VESSEL DRAFT VARIANCE"; tick Standard Instructions\n' +
      '5) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': 'Tolerance saved as ±10%; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-007',
    'FSD Reference': '',
    'Tab / Field': 'Tab 3 — View Clause',
    'Scenario': 'Add inspection clause via View Clause overlay',
    'Test Objective': 'Verify a maker can attach a specific clause to a required document via the View Clause overlay.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 3: Sea Way Documents row — Original (ref_97) = 1; Click View Clause (ref_100)\n' +
      '4) Pick clause "Showing gross/net weight per package"; Identifier = ORIGINAL\n' +
      '5) Edit description: append "Including HS code per line item"\n' +
      '6) Click Submit on overlay\n' +
      '7) Tab 4: tick Standard Instructions\n' +
      '8) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': 'Clause linked to Sea Way Documents with customised description; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-008',
    'FSD Reference': '',
    'Tab / Field': 'Tab 2 — 43T + 44F',
    'Scenario': 'Trans-shipment now allowed (vessel reroute)',
    'Test Objective': 'Verify a maker can switch Transshipment to Allowed and update Port of Discharge for vessel reroute via transit hub.',
    'Pre-conditions': 'corpmaker2 logged in; LC has Transshipment = Not Allowed.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 2: Transshipment (ref_61) → Allowed\n' +
      '4) Port of Discharge (ref_65) = SLOMC – Salalah Hub\n' +
      '5) Place of Final Destination (ref_66) = LONDON WAREHOUSE\n' +
      '6) Tab 4: Sender to Receiver Information (ref_147) = "VESSEL REROUTE VIA SALALAH HUB — TRANS-SHIPMENT NOW PERMITTED"; tick Standard Instructions\n' +
      '7) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': 'Transshipment Allowed and new Port of Discharge persisted; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-009',
    'FSD Reference': '',
    'Tab / Field': 'Tab 1 — Field 59',
    'Scenario': 'Beneficiary address update — corporate move',
    'Test Objective': 'Verify a maker can update the beneficiary address (Field 59) when MARKS AND SPENCER PLC has changed registered office.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: Beneficiary Address Line 2 (ref_40) = WATERSIDE HOUSE, 35 NORTH WHARF ROAD\n' +
      '4) Country (ref_41) = GB\n' +
      '5) Tab 4: Sender to Receiver Information (ref_147) = "BENEFICIARY ADDRESS UPDATED — SUPPORTING TRADE LICENCE ATTACHED"; tick Standard Instructions\n' +
      '6) Tab 7: Attach amendment_beneficiary_trade_licence.pdf; Tick T&C; Submit; Confirm',
    'Expected Result': 'New beneficiary address persisted; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-010',
    'FSD Reference': '',
    'Tab / Field': 'Tab 4 — 49 + 58A',
    'Scenario': 'Confirm an unconfirmed LC',
    'Test Objective': 'Verify a maker can request LC confirmation by selecting Confirm and naming the confirming party (HSBC BANK PLC).',
    'Pre-conditions': 'corpmaker2 logged in; LC currently 49 = Without (unconfirmed); Advising Bank SWIFT = CITIGB2LXXX.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Advising Bank SWIFT (ref_135) = CITIGB2LXXX → Verify\n' +
      '4) Confirmation radio → Confirm\n' +
      '5) Confirming Bank Name (ref_159) = HSBC BANK PLC\n' +
      '6) Address (ref_160) = 8 Canada Square, Canary Wharf\n' +
      '7) Address 2 (ref_161) = London\n' +
      '8) Address 3 (ref_162) = E14 5HQ, United Kingdom\n' +
      "9) Sender to Receiver Information (ref_147) = \"CONFIRMATION REQUESTED AT BENEFICIARY'S DEMAND\"\n" +
      '10) tick Standard Instructions\n' +
      '11) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': 'Confirmation Instructions = Confirm; confirming-bank block persisted; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-011',
    'FSD Reference': '',
    'Tab / Field': 'Tab 4 — 71D + 71N',
    'Scenario': 'Charges shift Applicant → Beneficiary',
    'Test Objective': 'Verify a maker can change Amendment Charge Payable By and update charge text per commercial renegotiation.',
    'Pre-conditions': 'corpmaker2 logged in; original 71N = Applicant.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Charges (ref_148) = "ALL AMENDMENT AND CONFIRMATION CHARGES FOR BENEFICIARY ACCOUNT"\n' +
      '4) Amendment Charge Payable By (ref_149) → Beneficiary\n' +
      '5) Sender to Receiver Information (ref_147) = "CHARGES BORNE BY UPDATED PER COMMERCIAL RENEGOTIATION"\n' +
      '6) tick Standard Instructions\n' +
      '7) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': '71D and 71N updated; review reflects new charge bearer; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-012',
    'FSD Reference': '',
    'Tab / Field': 'Tab 4 — 49G',
    'Scenario': 'Add red-clause advance to beneficiary (20% of LC value)',
    'Test Objective': 'Verify a maker can add a red-clause advance permitting the beneficiary to draw 20% before shipment.',
    'Pre-conditions': 'corpmaker2 logged in.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 4: Special Payment Conditions for Beneficiary (ref_139) = "RED CLAUSE: BENEFICIARY MAY DRAW UP TO 20% OF LC VALUE AGAINST SIGNED PRO-FORMA INVOICE PRIOR TO SHIPMENT"\n' +
      '4) Sender to Receiver Information (ref_147) = "RED CLAUSE ADVANCE 20% PERMITTED PER PO-2026-INT-00789"\n' +
      '5) tick Standard Instructions\n' +
      '6) Tab 7: Attach amendment_proforma_invoice.pdf; Tick T&C; Submit; Confirm',
    'Expected Result': 'Red-clause text persisted in 49G; review shows the special condition; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P1',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-013',
    'FSD Reference': '',
    'Tab / Field': 'Cross-tab — Cash Collateral',
    'Scenario': 'Add 100% cash-collateral against amendment-driven exposure increase',
    'Test Objective': "Verify a maker can link an additional cash-collateral account when LC Amount is increased so the bank's exposure is fully covered.",
    'Pre-conditions': 'corpmaker2 logged in; account AT30008010014 (MyAccount, GBP, ACTIVE) has balance ≥ 5000.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Tab 1: LC Amount (ref_42) = 12500.00 (was 7500.00 → +5000)\n' +
      '4) Tab 2: Goods Quantity (ref_73) = 833; Cost/Unit (ref_74) = 15.00; Gross = 12495.00 — adjust to match LC\n' +
      '5) Tab 4: tick Standard Instructions\n' +
      '6) Tab 5: Click Add Account (ref_929); Contribution Amount (ref_922) = 5000; Percentage (ref_923) = 100; Account (ref_926) = AT30008010014; Currency = GBP\n' +
      '7) Tab 7: Tick T&C; Submit; Confirm',
    'Expected Result': 'New collateral row added against the increase; success message + OBDX reference.',
    'Type': 'Positive',
    'Priority': 'P2',
  },
  {
    'Source Tab': 'Business Scenarios',
    'Test Case ID': 'TC-AMBS-014',
    'FSD Reference': 'Validation Rule 7',
    'Tab / Field': 'Cross-tab — Duplicate amendment',
    'Scenario': 'Edge — Duplicate amendment blocked',
    'Test Objective': 'Verify a maker cannot submit a second amendment when an identical amendment is already pending in the approval workflow (Rule 7).',
    'Pre-conditions': 'corpmaker2 logged in; LC 032ELAN230891001 has an amendment already in "Pending for Approval" status.',
    'Test Steps':
      '1) Login as Maker (corpmaker2 / Admin@131)\n' +
      '2) Open Amend Import LC for 032ELAN230891001\n' +
      '3) Make exactly the same edit as the pending amendment (same fields, same values)\n' +
      '4) Tabs 2–6 default\n' +
      '5) Tab 7: Tick T&C; Submit\n' +
      '6) On Review click Confirm',
    'Expected Result': 'Error message on Confirm: "Duplicate transaction not permitted. Similar transaction is already pending in approval workflow." Amendment not posted.',
    'Type': 'Negative',
    'Priority': 'P1',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sheet build
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { divider: '■  Tab 1 — LC Details',                tcs: TAB1 },
  { divider: '■  Tab 2 — Goods & Shipment',          tcs: TAB2 },
  { divider: '■  Tab 3 — Documents & Conditions',    tcs: TAB3 },
  { divider: '■  Tab 4 — Instructions',              tcs: TAB4 },
  { divider: '■  Tab 5 — Linkages',                  tcs: TAB5 },
  { divider: '■  Tab 6 — Insurance',                 tcs: TAB6 },
  { divider: '■  Tab 7 — Attachments / Submit',      tcs: TAB7 },
  { divider: '■  Business Scenarios — Amend Import LC', tcs: BUSINESS_SCENARIOS },
];

function buildAoa() {
  const aoa = [];
  // Header row at row 0 (current workbook layout has no title row).
  aoa.push(HEADERS);
  // Sections — each starts with an in-band divider row.
  for (const section of SECTIONS) {
    aoa.push([section.divider, '', '', '', '', '', '', '', '', '', '']);
    for (const tc of section.tcs) {
      aoa.push(HEADERS.map(h => tc[h] ?? ''));
    }
  }
  return aoa;
}

function run() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Workbook not found: ${WORKBOOK_PATH}`);
  }

  // Backup before modifying
  fs.copyFileSync(WORKBOOK_PATH, BACKUP_PATH);
  console.log(`[append] Backup created: ${BACKUP_PATH}`);

  const wb = XLSX.readFile(WORKBOOK_PATH);
  if (wb.SheetNames.includes(SHEET_NAME)) {
    throw new Error(`Sheet "${SHEET_NAME}" already exists. Delete it first or rename the new sheet.`);
  }

  const aoa = buildAoa();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths so the export is readable when opened in Excel.
  // Order must match HEADERS above.
  ws['!cols'] = [
    { wch: 16 },  // Test Case ID
    { wch: 38 },  // Scenario
    { wch: 50 },  // Test Objective
    { wch: 38 },  // Pre-conditions
    { wch: 70 },  // Test Steps
    { wch: 50 },  // Expected Result
    { wch: 10 },  // Type
    { wch: 8  },  // Priority
    { wch: 22 },  // Source Tab
    { wch: 30 },  // Tab / Field
    { wch: 24 },  // FSD Reference
  ];

  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, WORKBOOK_PATH);

  // Count TC rows
  const tcCount = SECTIONS.reduce((n, s) => n + s.tcs.length, 0);
  const positives = SECTIONS.flatMap(s => s.tcs).filter(t => t.Type === 'Positive').length;
  const negatives = SECTIONS.flatMap(s => s.tcs).filter(t => t.Type === 'Negative').length;

  console.log(`[append] Wrote new sheet "${SHEET_NAME}" to ${WORKBOOK_PATH}`);
  console.log(`[append] Total test cases: ${tcCount}  (Positive: ${positives}, Negative: ${negatives})`);
  console.log(`[append] Sections: ${SECTIONS.map(s => `${s.divider.replace(/^■\s+/, '')} (${s.tcs.length})`).join(' | ')}`);
  console.warn(`[append] NOTE: SheetJS community edition does not preserve cell styling on read+write.`);
  console.warn(`[append] NOTE: Existing sheets in the workbook may have lost their styling. Restore from backup if needed.`);
}

run();
