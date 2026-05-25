/**
 * convert-test-skip-to-fixme.js
 * ─────────────────────────────────────────────────────────────────────────
 * One-shot conversion: replace every top-level `test.skip(...)` declaration
 * in tests/trade-finance/ilc-create.spec.ts with a `test.fixme(...)` carrying
 * a structured PENDING/Unblock comment block tailored to the TC.
 *
 * Runtime form `test.skip(boolean, message)` (used at line ~660 for the SG
 * Non-Customer-radio gate) is left untouched.
 *
 * The reason + unblock comment for each TC is derived from the
 * 2026-05-21 rescrape findings (data/scraped/initiate-import-lc-locators.json)
 * and the framework conventions in CLAUDE.md.
 *
 * Run: node scripts/convert-test-skip-to-fixme.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const SPEC = path.resolve(__dirname, '..', 'tests', 'trade-finance', 'ilc-create.spec.ts');

// Each entry: { pending, unblock }. Both rendered as JSDoc-style comments
// inside the test body so they survive editor / lint passes.
const FIXES = {
  // ── Category A: confirmed absent in AE/corpmaker2 + ILC-INL Sight build ─
  'TC-IMPLC-006': {
    pending: 'Limits LOV + View Limit Details overlay + Reset are confirmed absent in the AE/corpmaker2 build per 2026-05-21 rescrape (no widget present).',
    unblock: 'Run the test on an entity/user that has Limits-management entitlement (likely a different corporate party). Re-scrape Tab 1 in that session to capture the LOV + overlay + Reset locators.',
  },
  'TC-IMPLC-047': {
    pending: 'Preview Draft Copy button is confirmed absent in this build (rescrape 2026-05-21 set previewDraftCopyPresent=false).',
    unblock: 'Confirm with bank whether Preview Draft Copy is a future-build feature or a hidden entitlement. If entitlement, re-run rescrape on the entitled user.',
  },
  'TC-BS-021': {
    pending: '40A "IRREVOCABLE STANDBY" value is not in the AE build — the visible 40A radio carries only [Transferable, Non Transferable] (see Tab 1 field[8] discrepancyNote in the scraped JSON). The 4-value 40A LOV is SG-entity-only per FSD.',
    unblock: 'Build the SG-entity fixture (see TC-IMPLC-002) AND verify the LOV options on SG, then re-author this test to use the SG fixture.',
  },
  'TC-BS-022': {
    pending: '40A "IRREVOCABLE TRANSFERABLE" value is not in the AE build (same reason as TC-BS-021).',
    unblock: 'Same as TC-BS-021 — needs SG-entity fixture + SG-side LOV verification.',
  },

  // ── Category B: product entitlement (corpmaker2 not entitled) ───────────
  'TC-BS-036': {
    pending: 'Product ILC-INU (Usance) is not visible in the product LOV for corpmaker2 — product entitlement missing.',
    unblock: 'Coordinate with bank: confirm Usance product code is "ILC-INU" (or update LC_TEST_DATA.usanceProduct) AND grant corpmaker2 the Usance entitlement, OR provide a different user that has it. POM helpers setUsanceDays/setCreditDaysFrom/setDraweeBankSwift are already wired.',
  },
  'TC-BS-038': {
    pending: 'Revolving sub-fields (Revolving Type, Cumulative, Repeat Frequency) do not render for the ILC-INL Sight product — root cause as TC-BS-036.',
    unblock: 'Need a Revolving-capable product code in LC_TEST_DATA (e.g. ILC-REV-*) accessible to the test user. Then this test can drive setRevolving({type:"Monthly", cycles:12}).',
  },
  'TC-IMPLC-007': {
    pending: 'Revolving sub-fields not rendered on Sight product (ILC-INL) — same blocker as TC-BS-038.',
    unblock: 'Provide a Revolving-capable product entitlement, then exercise setRevolving + verify Auto Reinstatement + Cumulative + Repeat Frequency dependents.',
  },
  'TC-IMPLC-008': {
    pending: 'Revolving by Value path requires both a Revolving-capable product AND POM extension (current setRevolving only handles the by-Time path).',
    unblock: 'After product entitlement is sorted (TC-IMPLC-007), extend setRevolving to handle the Value sub-path and re-author this test.',
  },

  // ── Category C: SG-entity fixture missing ───────────────────────────────
  'TC-IMPLC-002': {
    pending: 'SG-entity fixture not yet built. Currently the test fixture set only logs into the AE/corpmaker2 instance.',
    unblock: 'Add `loggedInDashboardSg` fixture in fixtures/auth.fixture.ts that switches to the SG OBDX entity (URL or entity-switch dropdown — confirm with bank). Change this test\'s parameter to `{ loggedInDashboardSg }` and assert that the Applicant Details radio shows only "Existing Customer", "Non-Customer" absent.',
  },
  'TC-IMPLC-004': {
    pending: 'SG-entity fixture missing (same blocker as TC-IMPLC-002).',
    unblock: 'Once SG fixture exists, assert 40A LOV contains exactly [IRREVOCABLE, IRREVOCABLE TRANSFERABLE, IRREVOCABLE STANDBY, IRREVOC TRANS STANDBY] AND clearing 40A + clicking Next surfaces "Type of Documentary Credit is required".',
  },
  'TC-IMPLC-013': {
    pending: 'SG-entity fixture missing. Locator for Field 41A LOV (CreditAvailableBy4735824) is captured by 2026-05-21 rescrape, but the "Payment" option only renders on SG entity.',
    unblock: 'Once SG fixture exists, open the 41A LOV via #CreditAvailableBy4735824 and assert the option list contains "Payment" (per SG customisation C-9.6).',
  },
  'TC-IMPLC-015': {
    pending: 'SG-entity fixture missing. 42A address fields enforce a SWIFT MT700 35-char limit only on SG entity.',
    unblock: 'Once SG fixture exists, type a >35-char string into each of the Advising-Bank-by-Name-and-Address fields (#Name6443099, #Address3276872, #AddressLine5785752, #AddressLine8553367) and assert truncation/validation at 35 chars.',
  },
  'TC-IMPLC-018': {
    pending: 'SG-entity fixture missing. SG enforces 65-char limit on 44A (Place of Taking) + 44B (Final Destination).',
    unblock: 'Once SG fixture exists, type 70-char strings into #PlaceofTaking770471 + #PlaceofFinalDestination7797471 and assert truncation/validation at 65 chars.',
  },

  // ── Category D: sub-panel rescrape needed (entry-link locator known) ────
  'TC-IMPLC-024': {
    pending: 'Documents checklist (Commercial Invoice / Bill of Lading / Packing List + Originals/Copies counts) sub-panel is not pre-rendered. Initial rescrape 2026-05-21 captured only the Tab 3 entry — the row checkboxes + count inputs need a 2nd-pass scrape after entering the panel.',
    unblock: 'Drive a 2nd-pass scrape: after reaching Tab 3, identify the Document-add affordance (likely a per-row "Add" icon in a documents grid), click it, then capture the row checkbox + Originals input + Copies input locators. Add selectDocumentWithCounts(name, originals, copies) POM method.',
  },
  'TC-IMPLC-025': {
    pending: 'Clauses sub-panel (LOV + Identifiers multi-select + Description textarea + Submit) renders only after clicking #ClauseMaintenance676292. Sub-panel locators not yet captured.',
    unblock: 'Drive a 2nd-pass scrape: click #ClauseMaintenance676292 then capture the panel\'s LOV/multi-select/textarea/Submit locators. Add addClause(name, identifiers[], description) POM method.',
  },
  'TC-IMPLC-026': {
    pending: 'Depends on TC-IMPLC-025 helpers (Clauses panel). Also needs View/Edit + Reset + Delete row affordances which are not captured.',
    unblock: 'After TC-IMPLC-025 is unblocked, drive a 3rd-pass scrape to add a clause then capture the row-level View/Edit + Reset confirmation + Delete locators.',
  },
  'TC-IMPLC-027': {
    pending: 'Additional Conditions panel + "Refer Codes and Description" overlay render only after clicking #AddCondition3088651. Sub-panel locators not yet captured.',
    unblock: 'Drive a 2nd-pass scrape: click #AddCondition3088651, then click the Refer-Codes affordance, capture all visible widgets including the overlay close button. Add addAdditionalCondition(code, identifier, description) POM method.',
  },
  'TC-IMPLC-031': {
    pending: 'Currency-filter behavior on the Account LOV is observable only after opening the LOV dropdown. The LOV opens via #AddAccount2665268; its dropdown contents are not in the captured JSON.',
    unblock: 'Drive a 2nd-pass scrape: set Linkages currency = USD via existing flow, click #AddAccount2665268, capture all visible LOV options (their currencies), then assert only USD accounts appear. Add setLinkageCurrency + assertAccountLovCurrency POM helpers.',
  },
  'TC-IMPLC-032': {
    pending: 'Multi-account collateral (add 2, running total, delete one) needs the LOV-pick + per-row Delete + running-total cell locators — not in the 1st-pass scrape.',
    unblock: 'Drive a 2nd-pass scrape: click #AddAccount2665268 twice to add two rows, capture row IDs + Delete affordance + running-total readout. Add addCollateralAccount(account, amount) + deleteCollateralRow(idx) + getRunningCollateralTotal POM methods.',
  },
  'TC-IMPLC-033': {
    pending: 'Deposit Linkage section is a separate row on Tab 4 (likely opened via the second #AddAccount link, id=AddAccount7209291). Section contents not yet captured.',
    unblock: 'Drive a 2nd-pass scrape: click #AddAccount7209291, capture deposit-account picker + linked-amount field + deposit-balance display. Add linkDepositAccount(account, amount) POM method.',
  },
  'TC-IMPLC-034': {
    pending: 'Negative version of TC-IMPLC-033 — same locators needed.',
    unblock: 'After TC-IMPLC-033 is unblocked, set linkedAmount > deposit balance and assert the validation error.',
  },
  'TC-IMPLC-043': {
    pending: 'File upload drag-and-drop drop zone (oj-file-picker.oj-filepicker-dropzone) is captured but the hidden <input type="file"> inside it was not exposed by Playwright evaluate (fileInputs:[] in rescrape). Per-row Delete + Delete All buttons render only after at least one file is uploaded — not captured.',
    unblock: 'Drive a 2nd-pass scrape: programmatically attach a fixture file via page.locator(\'input[type="file"]\').setInputFiles(...) under the drop zone, then capture the resulting row + per-row Delete + "Delete All" affordances. Add uploadFiles(paths[]) + deleteAttachment(idx) + deleteAllAttachments POM methods.',
  },
  'TC-IMPLC-044': {
    pending: 'Negative version of TC-IMPLC-043 — additionally needs the error-banner locator for type/size rejections.',
    unblock: 'After TC-IMPLC-043 is unblocked, attempt to upload a fixture .exe + a 25MB file, capture the resulting error banner DOM. Assert via the existing assertNextBlockedWithError helper or a new bannerError locator.',
  },
  'TC-IMPLC-045': {
    pending: 'Save as Template "Yes" sub-state (Template Name input + Public Access radio) renders only after toggling #SaveAsTemplate1696954 to Yes. Sub-fields not yet captured.',
    unblock: 'Drive a 2nd-pass scrape: click the Yes radio under #SaveAsTemplate1696954, capture Template Name input + Access Type radio. Add setSaveAsTemplate({name, accessType:"Public"|"Private"}) POM method. Then add a Templates-listing page object to verify the saved template appears.',
  },
  'TC-BS-003': {
    pending: 'Same blocker as TC-IMPLC-045 plus the Templates-listing page assertion.',
    unblock: 'After TC-IMPLC-045 is unblocked, add navigation to the Templates listing page + a findTemplateByName helper.',
  },
  'TC-BS-007': {
    pending: 'Confirmation = "Confirm" reveals a dependent Confirming Bank section (SWIFT vs Name+Address radio + dependent inputs). The 2026-05-21 rescrape captured the Confirmation Instructions radio (id=ConfirmationInstructions2562782) but did NOT toggle to "Confirm" so the dependent section\'s locators are unknown.',
    unblock: 'Drive a 2nd-pass scrape: call setConfirmationInstructions("Confirm"), capture the revealed Confirming-Bank radioset + SWIFT input + Name/Address inputs. Then this test can leave Confirming Bank empty and call clickNext + assertNextBlockedWithError(/confirming bank.*required/i).',
  },
  'TC-BS-013': {
    pending: 'SWIFT keyword search dialog opens via #LookupSWIFTCode7829249 (Tab 1) or #LookupSWIFTCode1184155 (Tab 5). The dialog\'s search input + result table + Select button are not yet captured.',
    unblock: 'Drive a 2nd-pass scrape: click the Lookup SWIFT Code link, type "BANK" into the search field, capture the dialog\'s search input + result rows + Select button. Add lookupSwiftByKeyword(keyword) POM method.',
  },
  'TC-BS-035': {
    pending: 'Depends on TC-IMPLC-043 (file upload POM helpers) plus fixture files for proforma-invoice.pdf + insurance-cover-note.pdf.',
    unblock: 'After TC-IMPLC-043 is unblocked, add the two fixture PDFs under fixtures/attachments/, then this test can call uploadFiles([...]) with both paths.',
  },

  // ── Category E: separate flows / pages ──────────────────────────────────
  'TC-IMPLC-023': {
    pending: 'Save as Draft on Tab 2 + resume across sessions needs (a) a clickSaveAsDraft(name) POM helper and (b) a SavedDraftsPage object that can find + reopen the draft from the listing.',
    unblock: 'Drive a 2nd-pass scrape: click the captured Save As Draft button, capture the resulting "Name your draft" dialog. Build SavedDraftsPage with searchByName + openDraft methods. Then this test can SaveDraft → logout → login → openDraft → assert Tab 1 + Tab 2 data preserved.',
  },
  'TC-IMPLC-035': {
    pending: 'Same Save Draft helper as TC-IMPLC-023 PLUS a Cancel-confirmation popup + dashboard-URL assertion.',
    unblock: 'After TC-IMPLC-023 is unblocked, add clickCancel + assertOnTradeFinanceDashboard POM helpers.',
  },
  'TC-BS-002': {
    pending: 'Same blocker as TC-IMPLC-023 — needs Save Draft POM helper + SavedDraftsPage.',
    unblock: 'Unblocked by completing TC-IMPLC-023\'s POM work.',
  },
  'TC-BS-030': {
    pending: 'Verifying a submitted LC appears on the View Import LC screen needs a search-by-customer-reference helper on the existing ViewImportLcFlowPage.',
    unblock: 'Extend ViewImportLcFlowPage with searchByCustomerReference(ref) + assertLcRowVisible helpers. This test then submits an LC, captures the OBDX reference, navigates to View Import LC, and asserts the row is found.',
  },
  'TC-BS-031': {
    pending: 'Maker → Checker approval cycle requires (a) a Checker login fixture for corpchecker2 and (b) an ApprovalQueuePage object.',
    unblock: 'Add `loggedInCheckerDashboard` fixture in fixtures/auth.fixture.ts using corpchecker2 credentials (need env var or .env entry). Build ApprovalQueuePage with searchByReference + clickApprove. Then this test: Maker submits → switch to Checker session → approve → re-switch to Maker → assert status changed.',
  },
  'TC-BS-032': {
    pending: 'Same blocker as TC-BS-031 + rejection-with-reason path.',
    unblock: 'After TC-BS-031 is unblocked, add clickRejectWithReason(text) on ApprovalQueuePage. Assert the LC returns to Maker\'s My Transactions list with a status indicating "Rejected — needs correction".',
  },

  // ── Category F: seeded data / environment ───────────────────────────────
  'TC-BS-014': {
    pending: 'Negative test requires a specific SWIFT BIC that is NOT in the RMA list for the test environment. We don\'t have a known non-RMA SWIFT for this env.',
    unblock: 'Ask bank to confirm a SWIFT code that is verified-but-not-in-RMA in the test env (or how to construct one). Add the value to LC_TEST_DATA, then this test fills it, clicks Verify, and asserts the RMA rejection error.',
  },
  'TC-BS-028': {
    pending: 'Cross-currency collateral negative requires a collateral account whose currency differs from LC currency (e.g. EUR account + USD LC). We don\'t have a verified EUR-denominated collateral account in this env.',
    unblock: 'Ask bank for a seeded EUR (or non-USD) collateral account for corpmaker2. Add the account number to LC_TEST_DATA, then this test sets Currency=USD, attempts to add the EUR account as collateral, asserts the currency-mismatch error.',
  },
  'TC-BS-029': {
    pending: 'Invalid SWIFT BIC negative — needs a synthetic invalid value AND the rejection error wording to assert.',
    unblock: 'Decide on a synthetic invalid BIC (e.g. "XXXXXX99XXX") and add it to LC_TEST_DATA. This test fills it via fillSwiftAndVerify, asserts assertNextBlockedWithError(/invalid|not found|verify/i).',
  },
};

function run() {
  const src = fs.readFileSync(SPEC, 'utf8');
  const lines = src.split('\n');

  // For each TC-ID, find the test.skip( line that immediately precedes the
  // line carrying `'<TC-ID>:`, locate the matching closing `);`, and rewrite
  // both the kind (skip → fixme) and the body comment.

  let convertedCount = 0;
  const idsHit = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*test\.skip\(\s*$/.test(lines[i])) continue;

    // Next non-empty line should be the test-name string literal.
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j >= lines.length) continue;

    const nameLine = lines[j];
    // Skip the conditional runtime form (boolean first arg, not a string literal).
    if (!/^\s*['"`]/.test(nameLine)) continue;

    // Extract TC-ID from the name (e.g. "TC-IMPLC-002: …" or "TC-BS-036: …")
    const idMatch = nameLine.match(/['"`](TC-[A-Z]+-N?\d+)\s*:/);
    if (!idMatch) continue;
    const tcId = idMatch[1];

    const fix = FIXES[tcId];
    if (!fix) {
      console.warn(`  [no-fix-defined] ${tcId} — skipping (will remain as test.skip)`);
      continue;
    }

    // Find the closing `);` of this declaration — walk forward counting
    // parentheses, but easier: walk forward to the next line that is `  );`
    // (correct since each test.* declaration in this file ends that way).
    let closeIdx = -1;
    for (let k = j + 1; k < lines.length; k++) {
      if (/^\s*\);\s*$/.test(lines[k])) { closeIdx = k; break; }
    }
    if (closeIdx === -1) {
      console.warn(`  [no-close] ${tcId} — closing paren not found`);
      continue;
    }

    // Find the body block — `async (...) => {` opener inside [j+1 .. closeIdx]
    let bodyOpenIdx = -1;
    let bodyCloseIdx = -1;
    for (let k = j + 1; k < closeIdx; k++) {
      if (/async\s*\([^)]*\)\s*=>\s*\{\s*$/.test(lines[k]) ||
          /async\s*\([^)]*\)\s*=>\s*\{[^}]*$/.test(lines[k])) {
        bodyOpenIdx = k;
        break;
      }
    }
    if (bodyOpenIdx === -1) {
      // Some tests use `async () => { /* body */ }` on a single line.
      for (let k = j + 1; k < closeIdx; k++) {
        if (/async\s*\(\s*\)\s*=>\s*\{.*\}\s*$/.test(lines[k])) {
          bodyOpenIdx = k; bodyCloseIdx = k; break;
        }
      }
    } else {
      // Find matching `}` walking forward from bodyOpenIdx
      for (let k = bodyOpenIdx + 1; k < closeIdx; k++) {
        if (/^\s*\}\s*$/.test(lines[k])) { bodyCloseIdx = k; break; }
      }
    }
    if (bodyOpenIdx === -1 || bodyCloseIdx === -1) {
      console.warn(`  [no-body] ${tcId} — body braces not found`);
      continue;
    }

    // Detect leading indent
    const indent = (lines[bodyOpenIdx].match(/^(\s*)/) || ['', ''])[1];
    const inner  = indent + '  ';

    // Construct the new body content.
    const newBody = [
      `${inner}// PENDING: ${fix.pending}`,
      `${inner}// Unblock: ${fix.unblock}`,
    ];

    // Wrap pending/unblock text at ~95 cols so each line is comment-only.
    function wrap(prefix, text) {
      const max = 95;
      const out = [];
      const words = text.split(/\s+/);
      let cur = prefix;
      for (const w of words) {
        if ((cur + ' ' + w).length > max && cur.length > prefix.length) {
          out.push(cur);
          cur = `${inner}//          ${w}`;
        } else {
          cur = cur.length === prefix.length ? cur + w : cur + ' ' + w;
        }
      }
      if (cur.trim()) out.push(cur);
      return out;
    }
    const bodyLines = [
      ...wrap(`${inner}// PENDING: `, fix.pending),
      ...wrap(`${inner}// Unblock: `, fix.unblock),
    ];

    // If the test body has a destructured fixture parameter we keep it. But
    // most of these tests use `async ()` with no args. Either way we can
    // safely replace the body — we're just inserting comments.
    let replacement;
    if (bodyOpenIdx === bodyCloseIdx) {
      // Single-line body — split it.
      const head = lines[bodyOpenIdx].replace(/\{[^}]*\}\s*$/, '{');
      replacement = [head, ...bodyLines, `${indent}}`];
    } else {
      // Multi-line body — replace just the inner content between open/close braces.
      replacement = [lines[bodyOpenIdx], ...bodyLines, lines[bodyCloseIdx]];
    }

    // Apply the test.skip → test.fixme swap on line i.
    lines[i] = lines[i].replace(/test\.skip\(/, 'test.fixme(');

    // Splice replacement into lines[bodyOpenIdx .. bodyCloseIdx]
    lines.splice(bodyOpenIdx, bodyCloseIdx - bodyOpenIdx + 1, ...replacement);

    convertedCount++;
    idsHit.add(tcId);

    // Adjust loop pointer: replacement may have changed line count.
    i = closeIdx;
  }

  fs.writeFileSync(SPEC, lines.join('\n'), 'utf8');

  console.log(`[convert] converted ${convertedCount} test.skip → test.fixme`);
  console.log(`[convert] TC IDs touched: ${[...idsHit].sort().join(', ')}`);
  const missing = Object.keys(FIXES).filter(id => !idsHit.has(id));
  if (missing.length) {
    console.warn(`[convert] FIXES defined but not matched in file: ${missing.join(', ')}`);
  }
}

run();
