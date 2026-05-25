/**
 * merge-rescrape-into-curated.js
 * ─────────────────────────────────────────────────────────────────────────
 * One-shot merge: append the test.skip-blocker locators captured by
 * scripts/scrape-initiate-import-lc.js into the curated
 * data/scraped/initiate-import-lc-locators.json so the POM has a single
 * source-of-truth.
 *
 * Each appended field is marked with:
 *   source:   "rescrape-2026-05-21"
 *   unblocks: ["TC-IMPLC-…", …]   ← which test.skip cases this locator enables
 *
 * Run:    node scripts/merge-rescrape-into-curated.js
 * Backup: a copy is written to data/scraped/initiate-import-lc-locators.pre-merge.json
 *
 * The rescrape source file is left untouched.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '..', 'data', 'scraped', 'initiate-import-lc-locators.json');
const BACKUP = path.resolve(__dirname, '..', 'data', 'scraped', 'initiate-import-lc-locators.pre-merge.json');

const RESCRAPE_TAG = 'rescrape-2026-05-21';

// Build each new field with the rescrape provenance tag.
function f(obj, unblocks) {
  return Object.assign({ source: RESCRAPE_TAG, unblocks }, obj);
}

// ─── Per-tab additions ──────────────────────────────────────────────────────

const TAB1_ADDS = [
  f({
    field: 'Lookup SWIFT Code (Tab 1 keyword search dialog)',
    type: 'link',
    primaryId: 'LookupSWIFTCode7829249',
    selector: 'a#LookupSWIFTCode7829249',
    fallback: 'a[id^="LookupSWIFTCode"]',
    role: { type: 'link', name: 'Lookup SWIFT Code' },
    notes: 'Opens a SWIFT keyword search dialog. Two instances exist on Tab 1 (LookupSWIFTCode7829249 + LookupSWIFTCode1184155) — the first is the Credit-Available-With SWIFT lookup, the second is the 42A Drawee Bank lookup (visible only when LC Type = Usance).',
  }, ['TC-BS-013']),
  f({
    field: 'Credit Available With (radio — SWIFT Code / Bank Address)',
    type: 'radioset',
    primaryId: 'CreditAvailableWith4862688',
    selector: 'oj-radioset#CreditAvailableWith4862688',
    fallback: 'oj-radioset[id^="CreditAvailableWith"]',
    options: ['SWIFT Code', 'Bank Address'],
    notes: 'Toggles between SWIFT-code lookup and a free-text Bank Address path. Bank Address path mainly tested in SG-entity TCs.',
  }, []),
  f({
    field: 'Credit Available By (Field 41A LOV)',
    type: 'oj-select-one',
    primaryId: 'CreditAvailableBy4735824',
    selector: 'oj-select-one#CreditAvailableBy4735824',
    fallback: 'oj-select-one[id^="CreditAvailableBy"]',
    notes: 'F41A LOV. In the AE/corpmaker2 build, this dropdown carries the default OBDX value set. SG-entity build adds a "Payment" option (per FSD C-9.6) — that variant is not visible in the AE build.',
  }, ['TC-IMPLC-013']),
];

// Tab 1 field[8] discrepancy note: the curated file calls Transferable1086972
// the "40A Type of Documentary Credit (radio)" but the live AE build shows it
// with options Transferable / Non Transferable, not the 4-value IRREVOCABLE
// set. Patch the field with a clarifying discrepancy note.
const TAB1_FIELD_8_PATCH = {
  discrepancyNote: 'Rescrape 2026-05-21 against AE/corpmaker2 confirms this radio is rendered with options ["Transferable","Non Transferable"], NOT the SG 4-value LOV ["IRREVOCABLE","IRREVOCABLE TRANSFERABLE","IRREVOCABLE STANDBY","IRREVOC TRANS STANDBY"]. The 4-value 40A LOV is SG-entity-only — tests TC-BS-021/022 cannot be unblocked on the AE build.',
};

const TAB2_ADDS = [
  f({
    field: 'Add Goods row (link — multi-row scenarios)',
    type: 'link',
    primaryId: 'AddGoods7337627',
    selector: 'a#AddGoods7337627',
    fallback: 'a[id^="AddGoods"]',
    role: { type: 'link', name: 'Add Goods' },
    notes: 'Adds a second/third row in the Goods & Services table. Each row\'s Qty × Cost contributes to a goods total which must equal LC Amount.',
  }, ['TC-IMPLC-021', 'TC-BS-041']),
  f({
    field: 'View / Edit (goods row edit link)',
    type: 'link',
    primaryId: 'ViewEdit8189372',
    selector: 'a#ViewEdit8189372',
    fallback: 'a[id^="ViewEdit"]',
    role: { type: 'link', name: 'View / Edit' },
    notes: 'Opens the per-row edit panel for an existing goods row.',
  }, []),
];

const TAB3_ADDS = [
  f({
    field: 'Documents Presentation Days (Field 48 — InputDays)',
    type: 'oj-input-number',
    primaryId: 'InputDays9476795',
    selector: 'oj-input-number#InputDays9476795',
    fallback: 'oj-input-number[id^="InputDays"]',
    innerInputSelector: '#InputDays9476795 input',
    mandatory: false,
    notes: 'Number-of-days input on Tab 3. Default 0. Negative values + non-numeric ("abc") trigger a validation error.',
  }, ['TC-IMPLC-028', 'TC-IMPLC-030']),
  f({
    field: 'Clause Maintenance (opens Clauses sub-panel)',
    type: 'link',
    primaryId: 'ClauseMaintenance676292',
    selector: 'a#ClauseMaintenance676292',
    fallback: 'a[id^="ClauseMaintenance"]',
    role: { type: 'link', name: 'Clause Maintenance.' },
    notes: 'Opens the Clauses sub-panel. Sub-panel contents (Clause LOV / Identifiers multi-select / Description / Submit / View-Edit / Delete) are NOT pre-rendered — drive a 2nd scrape pass after clicking this link to capture them.',
  }, ['TC-IMPLC-025', 'TC-IMPLC-026']),
  f({
    field: 'Add Condition (opens Additional Conditions + Refer Codes overlay)',
    type: 'link',
    primaryId: 'AddCondition3088651',
    selector: 'a#AddCondition3088651',
    fallback: 'a[id^="AddCondition"]',
    role: { type: 'link', name: 'Add Condition' },
    notes: 'Opens the Additional Conditions panel. Refer Codes & Description overlay opens from inside this panel. Sub-panel contents are NOT pre-rendered.',
  }, ['TC-IMPLC-027']),
];

const TAB4_ADDS = [
  f({
    field: 'Cash Collateral Percent input',
    type: 'oj-input-text',
    primaryId: 'Percent2774746',
    selector: 'oj-input-text#Percent2774746',
    fallback: 'oj-input-text[id^="Percent"]',
    innerInputSelector: '#Percent2774746 input',
    notes: 'Cash Collateral % field on Tab 4. Setting to 0 + then adding a Collateral Linkage drives TC-BS-010. Setting to 2 + linking a USD account drives TC-BS-011.',
  }, ['TC-BS-010', 'TC-BS-011']),
  f({
    field: 'Add Account (opens collateral account picker)',
    type: 'link',
    primaryId: 'AddAccount2665268',
    selector: 'a#AddAccount2665268',
    fallback: 'a[id^="AddAccount"]',
    role: { type: 'link', name: 'Add Account' },
    notes: 'Two "Add Account" links exist (id=AddAccount2665268 + id=AddAccount7209291) — one for the Collateral Linkages section, one for Deposit Linkage. Confirm which row each opens before wiring. Deposit Linkage sub-panel (Tab 4 second section) only renders after the second Add Account click — needs a 2nd scrape pass.',
  }, ['TC-IMPLC-031', 'TC-IMPLC-032', 'TC-IMPLC-033', 'TC-IMPLC-034']),
];

const TAB5_ADDS = [
  f({
    field: 'Advising Bank (radio — SWIFT Code / Name and Address)',
    type: 'radioset',
    primaryId: 'AdvisingBank3000831',
    selector: 'oj-radioset#AdvisingBank3000831',
    fallback: 'oj-radioset[id^="AdvisingBank"]',
    options: ['SWIFT Code', 'Name and Address'],
    notes: 'Toggles the advising-bank entry mode. SWIFT-Code path uses advBankSwiftCode + Verify. Name-and-Address path reveals 4 additional inputs (Name + Address + AddressLine 2 + AddressLine 3) — see Advising Bank Name fields below.',
  }, ['TC-IMPLC-036', 'TC-IMPLC-037', 'TC-BS-014']),
  f({
    field: 'Advising Bank Name (visible when Advising Bank = Name and Address)',
    type: 'oj-input-text',
    primaryId: 'Name6443099',
    selector: 'oj-input-text#Name6443099',
    fallback: 'oj-input-text[id^="Name"]',
    innerInputSelector: '#Name6443099 input',
    notes: 'Renders only after toggling Advising Bank to Name and Address. Free-text bank name (max length per SWIFT MT700 35-char rule on SG entity).',
  }, ['TC-IMPLC-037', 'TC-IMPLC-015']),
  f({
    field: 'Advising Bank Address line 1',
    type: 'oj-input-text',
    primaryId: 'Address3276872',
    selector: 'oj-input-text#Address3276872',
    fallback: 'oj-input-text[id^="Address"]',
    innerInputSelector: '#Address3276872 input',
    notes: 'First address line of Name-and-Address Advising Bank.',
  }, ['TC-IMPLC-037']),
  f({
    field: 'Advising Bank Address line 2',
    type: 'oj-input-text',
    primaryId: 'AddressLine5785752',
    selector: 'oj-input-text#AddressLine5785752',
    fallback: 'oj-input-text[id^="AddressLine"]',
    innerInputSelector: '#AddressLine5785752 input',
  }, ['TC-IMPLC-037']),
  f({
    field: 'Advising Bank Address line 3',
    type: 'oj-input-text',
    primaryId: 'AddressLine8553367',
    selector: 'oj-input-text#AddressLine8553367',
    fallback: 'oj-input-text[id^="AddressLine"]',
    innerInputSelector: '#AddressLine8553367 input',
  }, ['TC-IMPLC-037']),
  f({
    field: 'Advise Through Bank (radio — SWIFT Code / Name and Address)',
    type: 'radioset',
    primaryId: 'AdviseThroughBank6595065',
    selector: 'oj-radioset#AdviseThroughBank6595065',
    fallback: 'oj-radioset[id^="AdviseThroughBank"]',
    options: ['SWIFT Code', 'Name and Address'],
    notes: 'Separate Advise Through Bank radio — independent of Advising Bank radio.',
  }, []),
  f({
    field: 'Advise Through Bank SWIFT Code',
    type: 'oj-input-text',
    primaryId: 'advThroughBankSwiftCode',
    selector: '#advThroughBankSwiftCode input',
    fallback: 'oj-input-text[id^="advThroughBank"]',
  }, []),
  f({
    field: 'Special Payment Conditions for Beneficiary',
    type: 'oj-text-area',
    primaryId: 'SpecialPaymentConditionsforBeneficiary3001606',
    selector: 'oj-text-area#SpecialPaymentConditionsforBeneficiary3001606',
    fallback: 'oj-text-area[id^="SpecialPaymentConditionsforBeneficiary"]',
    innerInputSelector: '#SpecialPaymentConditionsforBeneficiary3001606 textarea',
  }, ['TC-IMPLC-038']),
  f({
    field: 'Special Payment Conditions for Bank Only',
    type: 'oj-text-area',
    primaryId: 'SpecialPaymentConditionsforBankOnly9311284',
    selector: 'oj-text-area#SpecialPaymentConditionsforBankOnly9311284',
    fallback: 'oj-text-area[id^="SpecialPaymentConditionsforBankOnly"]',
    innerInputSelector: '#SpecialPaymentConditionsforBankOnly9311284 textarea',
  }, ['TC-IMPLC-038']),
  f({
    field: 'Confirmation Instructions (radio — Confirm / May Add / Without)',
    type: 'radioset',
    primaryId: 'ConfirmationInstructions2562782',
    selector: 'oj-radioset#ConfirmationInstructions2562782',
    fallback: 'oj-radioset[id^="ConfirmationInstructions"]',
    options: ['Confirm', 'May Add', 'Without'],
    notes: 'Drives the SWIFT field 49 value. Confirm + May Add reveal a dependent Confirming Bank section (radio + SWIFT or Name+Address). Without keeps the LC unconfirmed. Live OBDX uses radio buttons here, not the LOV dropdown described in earlier specs — the curated file initially assumed a dropdown; rescrape confirms it is a radioset.',
  }, ['TC-IMPLC-039', 'TC-IMPLC-040', 'TC-BS-005', 'TC-BS-006', 'TC-BS-007']),
  f({
    field: 'Charges (Tab 5 textarea)',
    type: 'oj-text-area',
    primaryId: 'Charges9637008',
    selector: 'oj-text-area#Charges9637008',
    fallback: 'oj-text-area[id^="Charges"]',
    innerInputSelector: '#Charges9637008 textarea',
  }, []),
  f({
    field: 'Special Instructions (Tab 5 — distinct from Sender-to-Receiver)',
    type: 'oj-text-area',
    primaryId: 'SpecialInstructions2287485',
    selector: 'oj-text-area#SpecialInstructions2287485',
    fallback: 'oj-text-area[id^="SpecialInstructions"]',
    innerInputSelector: '#SpecialInstructions2287485 textarea',
    notes: 'Distinct from Sender-to-Receiver Information (F72). Special Instructions is an internal-only note that does not appear in the SWIFT message.',
  }, []),
  f({
    field: 'Sender to Receiver Information (F72) — primaryId now known',
    type: 'oj-text-area',
    primaryId: 'SendertoReceiverInformation6300598',
    selector: 'oj-text-area#SendertoReceiverInformation6300598',
    fallback: 'oj-text-area[id^="SendertoReceiverInformation"]',
    innerInputSelector: '#SendertoReceiverInformation6300598 textarea',
    notes: 'Curated field already covered this by label; rescrape pins the live primary ID.',
  }, ['TC-BS-043', 'TC-BS-033']),
  f({
    field: 'Standard Instructions overlay link',
    type: 'link',
    primaryId: 'KindlygothroughalltheStandardInstructions3154142',
    selector: 'a#KindlygothroughalltheStandardInstructions3154142',
    fallback: 'a[id^="Kindlygothrough"]',
    role: { type: 'link', name: 'Kindly go through all the Standard Instructions' },
    notes: 'Click to open the Standard Instructions modal overlay (a separate flow from ticking the mandatory checkbox). Test TC-IMPLC-042 verifies the overlay opens, renders the text, and the close affordance returns to Tab 5.',
  }, ['TC-IMPLC-042']),
];

const TAB7_ADDS = [
  f({
    field: 'Save As Template (radio — Yes / No)',
    type: 'radioset',
    primaryId: 'SaveAsTemplate1696954',
    selector: 'oj-radioset#SaveAsTemplate1696954',
    fallback: 'oj-radioset[id^="SaveAsTemplate"]',
    options: ['Yes', 'No'],
    notes: 'Renders on Tab 7 (Attachments). Selecting Yes reveals dependent Template-Name + Access-Type fields (rescrape did NOT click into the Yes path — Save-as-Template Yes-state sub-fields need a 2nd scrape pass).',
  }, ['TC-IMPLC-045', 'TC-BS-003']),
  f({
    field: 'File-picker (drag-and-drop attachments zone)',
    type: 'oj-file-picker',
    selector: 'oj-file-picker.oj-filepicker',
    fallback: 'oj-file-picker, [class*="oj-filepicker"]',
    dropZoneSelector: '.oj-filepicker-dropzone',
    notes: 'Live drop zone is an oj-file-picker with class "oj-filepicker oj-filepicker-no-trigger oj-complete". The hidden native <input type="file"> was NOT exposed in the rescrape capture (`fileInputs: []`) — for Playwright setInputFiles, query for it after the user clicks/focuses the picker, or use locator(\'input[type="file"]\').setInputFiles(...) with `{ force: true }`.',
  }, ['TC-IMPLC-043', 'TC-IMPLC-044', 'TC-BS-035']),
  f({
    field: 'Accept Terms and Conditions (checkbox — primaryId now known)',
    type: 'checkboxset',
    primaryId: 'AcceptTermsandConditions9226903',
    selector: 'oj-checkboxset#AcceptTermsandConditions9226903',
    fallback: 'oj-checkboxset[id^="AcceptTermsandConditions"]',
    innerInputSelector: 'oj-checkboxset#AcceptTermsandConditions9226903 input[type="checkbox"]',
    notes: 'Rescrape pins the live ID. Curated entry already had this field tracked by label.',
  }, []),
  f({
    field: 'I accept the Terms & Conditions (link to T&C content)',
    type: 'link',
    primaryId: 'IaccepttheTermsConditions5920332',
    selector: 'a#IaccepttheTermsConditions5920332',
    fallback: 'a[id^="IaccepttheTermsConditions"]',
    role: { type: 'link', name: 'I accept the Terms & Conditions' },
    notes: 'Clicking the link opens the T&C text (separate affordance from the checkbox).',
  }, []),
];

// ─── Apply ─────────────────────────────────────────────────────────────────

function tabIndexByName(json, tabName) {
  return json.tabs.findIndex(t => t.tab === tabName);
}

function appendToTab(json, tabName, additions) {
  const idx = tabIndexByName(json, tabName);
  if (idx === -1) throw new Error(`Tab not found in curated JSON: ${tabName}`);
  // De-dupe by primaryId — if a primaryId is already present, skip with a warning.
  const existingIds = new Set((json.tabs[idx].fields || []).map(f => f.primaryId).filter(Boolean));
  let added = 0;
  for (const add of additions) {
    if (add.primaryId && existingIds.has(add.primaryId)) {
      console.warn(`  [skip-dup] ${tabName}: primaryId=${add.primaryId} already present`);
      continue;
    }
    json.tabs[idx].fields.push(add);
    added++;
  }
  return added;
}

function run() {
  if (!fs.existsSync(SRC)) throw new Error(`Curated JSON not found: ${SRC}`);

  // Backup
  fs.copyFileSync(SRC, BACKUP);
  console.log(`[merge] Backup written: ${path.basename(BACKUP)}`);

  const json = JSON.parse(fs.readFileSync(SRC, 'utf8'));

  // Patch Tab 1 field[8] with the discrepancyNote (40A radio actually carries Transferable/Non Transferable in AE build)
  const t1Idx = tabIndexByName(json, 'Tab 1 — LC Details');
  if (t1Idx !== -1 && json.tabs[t1Idx].fields[8]) {
    Object.assign(json.tabs[t1Idx].fields[8], TAB1_FIELD_8_PATCH);
    console.log('[merge] Patched Tab 1 field[8] with 40A discrepancyNote');
  }

  // Per-tab appends
  let total = 0;
  total += appendToTab(json, 'Tab 1 — LC Details',                  TAB1_ADDS);
  total += appendToTab(json, 'Tab 2 — Goods & Shipment',            TAB2_ADDS);
  total += appendToTab(json, 'Tab 3 — Documents',                   TAB3_ADDS);
  total += appendToTab(json, 'Tab 4 — Linkages / Collateral',       TAB4_ADDS);
  total += appendToTab(json, 'Tab 5 — Instructions',                TAB5_ADDS);
  total += appendToTab(json, 'Tab 7 — Attachments → Review → Confirmation', TAB7_ADDS);

  // Update top-level provenance fields.
  const existingSource = json.source;
  json.source = `${existingSource}; merged with rescrape captures from data/scraped/initiate-import-lc-locators-rescrape.json (${RESCRAPE_TAG})`;
  json.notes = (json.notes || []).concat([
    `Rescrape merge (${RESCRAPE_TAG}): ${total} test.skip-blocker locators appended across Tabs 1-7. Each merged field carries source="${RESCRAPE_TAG}" + unblocks=["TC-..."] so future readers can trace them. The rescrape source file is in data/scraped/initiate-import-lc-locators-rescrape.json.`,
    `OBDX renders the 7 Initiate-LC tabs as <a href="#"> anchor links (NOT role=tab elements). Click them directly by accessible text to bypass Next-button validation. See scripts/scrape-initiate-import-lc.js for the multi-strategy entry pattern that survives draft-state pollution.`,
    `Confirmed absent in the AE/corpmaker2 + ILC-INL Sight build: Limits LOV + View Limit Details + Reset (TC-IMPLC-006); Preview Draft Copy button (TC-IMPLC-047); 4-value 40A LOV ("IRREVOCABLE","IRREVOCABLE TRANSFERABLE","IRREVOCABLE STANDBY","IRREVOC TRANS STANDBY") — those test.skip cases need entity/entitlement changes, not better selectors.`,
    `Sub-panels that exist but only render after explicit "Add" clicks (not captured in initial rescrape, need a 2nd scrape pass to capture): Documents checklist (TC-IMPLC-024), Deposit Linkage on Tab 4 (TC-IMPLC-033/034), Refer Codes overlay on Tab 3 (TC-IMPLC-027), Save-as-Template Yes-state sub-fields on Tab 7 (TC-IMPLC-045).`,
  ]);

  fs.writeFileSync(SRC, JSON.stringify(json, null, 2), 'utf8');
  console.log(`[merge] Appended ${total} field(s) total across the affected tabs.`);
  console.log(`[merge] Wrote ${path.relative(path.resolve(__dirname, '..'), SRC)}`);
}

run();
