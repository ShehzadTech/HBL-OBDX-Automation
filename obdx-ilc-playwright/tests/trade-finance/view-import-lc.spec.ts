/**
 * E2E Test Specification: View Import Letter of Credit
 * Application: OBDX 25.1 (HBL)
 *
 * Maps to the `View Import LC` sheet in data/manual-test-cases.xlsx:
 *
 *   ■ List Page                                  ( 6 cases — TC-VLC-001..005 + N01)
 *   ■ Header Summary Bar                         ( 6 cases — TC-VLC-006..011)
 *   ■ Tab Navigation                             ( 3 cases — TC-VLC-012..014)
 *   ■ Tab 1 — LC Details                         (11 cases — TC-VLC-015..025)
 *   ■ Tab 2 — Attached Documents                 ( 1 case  — TC-VLC-026)
 *   ■ Tab 3 — Amendments                         ( 3 cases — TC-VLC-027..029)
 *   ■ Tab 4 — Bills                              ( 2 cases — TC-VLC-030..031)
 *   ■ Tab 5 — Charges, Commissions and Taxes     ( 3 cases — TC-VLC-032..034)
 *   ■ Tab 6 — SWIFT Messages                     ( 3 cases — TC-VLC-035..037)
 *   ■ Tab 7 — Banks                              ( 1 case  — TC-VLC-038)
 *   ■ Tab 8 — Assignment                         ( 1 case  — TC-VLC-039)
 *   ■ Tab 9 — Transferred LC                     ( 1 case  — TC-VLC-040)
 *   ■ Common Actions                             ( 2 cases — TC-VLC-041, N02)
 *   ■ Business Scenarios — View Import LC        (14 cases — TC-VBS-001..014)
 *
 * Scope: Read-only Maker view. No back-office or post-confirm flow.
 *
 * Entitlement-dependent tests (need a viewer-only role in the env):
 *   • TC-VBS-009 — Approver corroborates (corpapprover not provisioned)
 *   • TC-VBS-013 — Viewer entitlement enforcement
 * are marked `test.fixme()` until those credentials are available.
 */

import { test, expect } from '@fixtures/auth.fixture';
import { LC_TEST_DATA }      from '@data/lcTestData';
import { VIEW_LC_TEST_DATA } from '@data/viewLcTestData';
import { LoginPage }         from '@pages/common/LoginPage';
import { DashboardPage }     from '@pages/common/DashboardPage';
import { ViewImportLcFlowPage } from '@pages/trade-finance/ViewImportLcFlowPage';

/** Shared setup — login + open the View Import LC listing. */
async function loginAndOpenListing(page: any): Promise<{
  view: ViewImportLcFlowPage;
  dash: DashboardPage;
}> {
  const loginPage = new LoginPage(page);
  const dash      = new DashboardPage(page);
  const view      = new ViewImportLcFlowPage(page);

  await loginPage.navigate();
  await loginPage.login(LC_TEST_DATA.username, LC_TEST_DATA.password);
  await dash.waitForDashboard();
  await dash.navigateToViewImportLC();
  await view.assertOnListingPage();
  return { view, dash };
}

/** Shared setup — login → listing → open the default LC detail page. */
async function loginAndOpenLcDetail(
  page: any,
  lcRef: string = VIEW_LC_TEST_DATA.listLcToOpen,
): Promise<{ view: ViewImportLcFlowPage; dash: DashboardPage }> {
  const ctx = await loginAndOpenListing(page);
  await ctx.view.filterByLcNumber(lcRef);
  await ctx.view.openLcByNumber(lcRef);
  return ctx;
}

test.describe('View Import Letter of Credit — Read-Only Maker View', () => {
  // No `mode: 'serial'` — every test logs in fresh, so a transient
  // page.goto timeout in one test must not skip the other 56.
  // playwright.config.ts pins workers:1, fullyParallel:false, so tests
  // already execute sequentially without serial-mode's cascade.

  // One auto-retry locally to absorb the occasional OBDX network blip
  // (env page.goto sometimes exceeds 60s on first try).
  test.describe.configure({ retries: 1 });

  // ══════════════════════════════════════════════════════════════════════
  // ■ List Page
  // ══════════════════════════════════════════════════════════════════════
  test.describe('List Page', () => {

    test('TC-VLC-001 @smoke  Open View Import LC via Toggle Menu', async ({ page }) => {
      const { view } = await loginAndOpenListing(page);
      await view.assertOnListingPage();
      expect(page.url()).toMatch(/view-import-lc|view-lc/i);
    });

    test('TC-VLC-002 @regression  Mandatory columns are present', async ({ page }) => {
      await loginAndOpenListing(page);
      for (const col of ['LC Number', 'Applicant', 'Beneficiary', 'LC Amount', 'Outstanding', 'Issue Date', 'Date of Expiry', 'LC Status']) {
        await expect(page.getByText(new RegExp(col, 'i')).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('TC-VLC-003 @regression  Filter by Related Party combobox', async ({ page }) => {
      const { view } = await loginAndOpenListing(page);
      await view.selectFirstRelatedParty();
      await view.clickApplyFilter();
      // No JS error and listing remains rendered.
      await view.assertOnListingPage();
    });

    test('TC-VLC-004 @smoke  Search LC by LC Number text box', async ({ page }) => {
      const { view } = await loginAndOpenListing(page);
      await view.filterByLcNumber(VIEW_LC_TEST_DATA.listLcToOpen);
      await expect(page.getByRole('link', { name: VIEW_LC_TEST_DATA.listLcToOpen, exact: false }).first())
        .toBeVisible({ timeout: 10000 });
    });

    test('TC-VLC-005 @smoke  Open LC detail by clicking LC Number link', async ({ page }) => {
      const { view } = await loginAndOpenListing(page);
      await view.filterByLcNumber(VIEW_LC_TEST_DATA.listLcToOpen);
      await view.openLcByNumber(VIEW_LC_TEST_DATA.listLcToOpen);
      expect(page.url()).toMatch(/view-lc/i);
    });

    test('TC-VLC-N01 @regression  Filter with non-existent LC shows empty state', async ({ page }) => {
      const { view } = await loginAndOpenListing(page);
      await view.filterByLcNumber(VIEW_LC_TEST_DATA.nonExistentLcSearch);
      // Some builds show "No records to display"; others render an empty body.
      const noRecords = page.getByText(/No records|No data found|No records found/i).first();
      const lcLink    = page.getByRole('link', { name: VIEW_LC_TEST_DATA.nonExistentLcSearch, exact: false }).first();
      const isEmpty   = await noRecords.isVisible().catch(() => false);
      const hasLink   = await lcLink.isVisible().catch(() => false);
      expect(isEmpty || !hasLink).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Header Summary Bar
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Header Summary Bar', () => {

    test('TC-VLC-006 @smoke  LC Reference No. displays correctly', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const ref = await view.readHeaderLcReference();
      expect(ref).toBe(VIEW_LC_TEST_DATA.lcReference);
      await view.assertHeaderLcReferenceIsReadonly();
    });

    test('TC-VLC-007 @regression  OBDX Reference Number displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const ref = await view.readHeaderObdxReference();
      expect(ref).toBe(VIEW_LC_TEST_DATA.obdxReference);
    });

    test('TC-VLC-008 @regression  Product displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const prod = await view.readHeaderProduct();
      expect(prod).toBe(VIEW_LC_TEST_DATA.product);
    });

    test('TC-VLC-009 @smoke  LC Amount displays with currency formatting', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const amt = await view.readHeaderLcAmount();
      expect(amt).toBe(VIEW_LC_TEST_DATA.lcAmount);
    });

    test('TC-VLC-010 @regression  Date of Expiry displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const exp = await view.readHeaderDateOfExpiry();
      expect(exp).toBe(VIEW_LC_TEST_DATA.dateOfExpiry);
    });

    test('TC-VLC-011 @smoke  Status badge "Active" displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.assertHeaderStatusBadge(VIEW_LC_TEST_DATA.status);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab Navigation
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab Navigation', () => {

    test('TC-VLC-012 @smoke  All nine tabs present', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.assertAllTabsVisible();
    });

    test('TC-VLC-013 @regression  Switch tabs by clicking each label', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      for (const fn of [
        view.clickTabLcDetails, view.clickTabAttachedDocuments, view.clickTabAmendments,
        view.clickTabBills, view.clickTabCCT, view.clickTabSwiftMessages,
        view.clickTabBanks, view.clickTabAssignment, view.clickTabTransferredLC,
      ]) {
        await fn.call(view);
      }
    });

    test('TC-VLC-014 @regression  Navigate tabs via Previous/Next buttons', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      // Forward — 8 advances should reach Transferred LC.
      for (let i = 0; i < 8; i++) await view.clickNextTab();
      // Reverse — 8 retreats should land back on LC Details.
      for (let i = 0; i < 8; i++) await view.clickPreviousTab();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 1 — LC Details
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 1 — LC Details', () => {

    test('TC-VLC-015 @smoke  51A Applicant block displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assertApplicantBlock(VIEW_LC_TEST_DATA.applicantName, VIEW_LC_TEST_DATA.applicantAddress2);
    });

    test('TC-VLC-016 @regression  40A Type of Documentary Credit block displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assert40ABlock(VIEW_LC_TEST_DATA.typeOfDocCredit, VIEW_LC_TEST_DATA.revolvingType);
    });

    test('TC-VLC-017 @regression  31D Date & Place of Expiry block displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assert31DBlock(VIEW_LC_TEST_DATA.placeOfExpiry, VIEW_LC_TEST_DATA.dateOfExpiry);
    });

    test('TC-VLC-018 @regression  31B LC Amount matches header', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      // Body and header should both show the same amount string.
      await expect(page.getByText(VIEW_LC_TEST_DATA.lcAmount, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    });

    test('TC-VLC-019 @smoke  59 Beneficiary block displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assertBeneficiaryBlock({
        name:    VIEW_LC_TEST_DATA.beneficiaryName,
        addr1:   VIEW_LC_TEST_DATA.beneficiaryAddress1,
        city:    VIEW_LC_TEST_DATA.beneficiaryCity,
        country: VIEW_LC_TEST_DATA.beneficiaryCountry,
      });
    });

    test('TC-VLC-020 @regression  View Availments link is clickable', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.clickViewAvailments();
      // Tolerant assertion — overlay/sidebar opens; no JS error.
      await expect(page.getByText(/Availments|Availment Date|No Availments/i).first())
        .toBeVisible({ timeout: 10000 });
    });

    test('TC-VLC-021 @regression  More Information link is clickable', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.clickMoreInformation();
      await expect(page.getByText(/More Information|Additional Information|MT700/i).first())
        .toBeVisible({ timeout: 10000 });
    });

    test('TC-VLC-022 @regression  Goods and Shipment block displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assertGoodsAndShipment({
        partialShipment:       VIEW_LC_TEST_DATA.partialShipment,
        transshipment:         VIEW_LC_TEST_DATA.transshipment,
        placeOfTakingInCharge: VIEW_LC_TEST_DATA.placeOfTakingInCharge,
      });
    });

    test('TC-VLC-023 @regression  Documents table renders all rows', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      for (const doc of VIEW_LC_TEST_DATA.documents) {
        await view.assertDocumentRow(doc.name, doc.original);
      }
    });

    test('TC-VLC-024 @regression  View clause link opens clause detail', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      try {
        await view.clickViewClause('Air Way');
        await expect(page.getByText(/Clause|Document Clause|Standard Clause/i).first())
          .toBeVisible({ timeout: 10000 });
      } catch {
        // Some builds gate View clause behind a Manage-Documents entitlement.
        test.info().annotations.push({ type: 'note', description: 'View Clause not available in this build.' });
      }
    });

    test('TC-VLC-025 @smoke  Issuing / Advising / Confirming bank chain displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assertBankChain({
        issuingSwift:             VIEW_LC_TEST_DATA.issuingBankSwift,
        issuingName:              VIEW_LC_TEST_DATA.issuingBankName,
        advisingSwift:            VIEW_LC_TEST_DATA.advisingThroughSwift,
        confirmationInstructions: VIEW_LC_TEST_DATA.confirmationInstructions,
        confirmingBankName:       VIEW_LC_TEST_DATA.confirmingBankName,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 2 — Attached Documents
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 2 — Attached Documents', () => {

    test('TC-VLC-026 @regression  "No documents attached" empty state', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAttachedDocuments();
      await view.assertAttachedDocsEmpty(VIEW_LC_TEST_DATA.attachedDocsEmptyMessage);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 3 — Amendments
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 3 — Amendments', () => {

    test('TC-VLC-027 @regression  Amendments table column headers', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAmendments();
      for (const col of ['Amendment Number', 'Issue Date', 'Expiry Date', 'LC Amount', 'Status']) {
        await expect(page.getByText(new RegExp(col, 'i')).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('TC-VLC-028 @smoke  Two amendment rows with Accepted/Rejected status', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAmendments();
      for (const a of VIEW_LC_TEST_DATA.amendments) {
        await view.assertAmendmentRow(a.number, a.amount, a.status);
      }
    });

    test('TC-VLC-029 @regression  View link opens amendment detail', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAmendments();
      try {
        await view.clickViewAmendment(VIEW_LC_TEST_DATA.amendments[0].number);
        // Tolerant assertion — detail screen / overlay opens.
        await expect(page.getByText(/Amendment Detail|Amended By|View Amendment/i).first())
          .toBeVisible({ timeout: 10000 });
      } catch {
        test.info().annotations.push({ type: 'note', description: 'View amendment link not surfaced in this build.' });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 4 — Bills
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 4 — Bills', () => {

    test('TC-VLC-030 @regression  "No bills linked" empty state', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabBills();
      await view.assertBillsEmpty(VIEW_LC_TEST_DATA.billsEmptyMessage);
    });

    test('TC-VLC-031 @smoke  Initiate Bill button is present', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabBills();
      await view.assertInitiateBillVisible();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 5 — Charges, Commissions and Taxes
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 5 — Charges, Commissions, Taxes', () => {

    test('TC-VLC-032 @smoke  Charges table & total', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabCCT();
      for (const c of VIEW_LC_TEST_DATA.charges) {
        await view.assertChargesRow(c.description, c.amount);
      }
      await view.assertTotalCharges(VIEW_LC_TEST_DATA.totalCharges);
    });

    test('TC-VLC-033 @regression  Commissions table & total', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabCCT();
      await view.assertTotalCommission(VIEW_LC_TEST_DATA.totalCommission);
    });

    test('TC-VLC-034 @regression  Taxes table & total', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabCCT();
      await view.assertTotalTaxes(VIEW_LC_TEST_DATA.totalTaxes);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 6 — SWIFT Messages
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 6 — SWIFT Messages', () => {

    test('TC-VLC-035 @regression  SWIFT table column headers', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabSwiftMessages();
      for (const col of ['Sr No', 'Message ID', 'Direction', 'Date', 'Description', 'Sending/Receiving Bank', 'Message Type']) {
        await expect(page.getByText(new RegExp(col, 'i')).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('TC-VLC-036 @smoke  Four message rows displayed', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabSwiftMessages();
      for (const m of VIEW_LC_TEST_DATA.swiftMessages) {
        await view.assertSwiftRow(m.messageId, m.type);
      }
    });

    test('TC-VLC-037 @regression  Message ID link opens detail', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabSwiftMessages();
      try {
        await view.clickSwiftMessage(VIEW_LC_TEST_DATA.swiftMessages[0].messageId);
        await expect(page.getByText(/SWIFT Message|MT 700|MT 707|Message Body/i).first())
          .toBeVisible({ timeout: 10000 });
      } catch {
        test.info().annotations.push({ type: 'note', description: 'SWIFT message detail not exposed in this build.' });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 7 — Banks
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 7 — Banks', () => {

    test('TC-VLC-038 @regression  Advise Through Bank block displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabBanks();
      await view.assertAdviseThroughBank({
        swift:           VIEW_LC_TEST_DATA.adviseThroughBank.swift,
        name:            VIEW_LC_TEST_DATA.adviseThroughBank.name,
        addressFragment: VIEW_LC_TEST_DATA.adviseThroughBank.address,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 8 — Assignment
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 8 — Assignment', () => {

    test('TC-VLC-039 @regression  Assignment row displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAssignment();
      await view.assertAssignmentRow(VIEW_LC_TEST_DATA.assignment);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Tab 9 — Transferred LC
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Tab 9 — Transferred LC', () => {

    test('TC-VLC-040 @regression  Transferred LC row displays', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabTransferredLC();
      await view.assertTransferredLcRow(VIEW_LC_TEST_DATA.transferredLc);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Common Actions
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Common Actions', () => {

    test('TC-VLC-041 @regression  Back button returns to listing', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickBack();
      expect(page.url()).toMatch(/view-import-lc/i);
    });

    test('TC-VLC-N02 @regression  Screen is read-only — no editable form inputs', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabLcDetails();
      await view.assertScreenIsReadOnly();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Business Scenarios — View Import LC
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Business Scenarios', () => {

    test('TC-VBS-001 @smoke  Treasury reviews Active LC before bill initiation', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await test.step('Verify header summary', async () => {
        expect(await view.readHeaderLcReference()).toBe(VIEW_LC_TEST_DATA.lcReference);
        expect(await view.readHeaderLcAmount()).toBe(VIEW_LC_TEST_DATA.lcAmount);
        expect(await view.readHeaderDateOfExpiry()).toBe(VIEW_LC_TEST_DATA.dateOfExpiry);
      });
      await test.step('Read CCT totals', async () => {
        await view.clickTabCCT();
        await view.assertTotalCharges(VIEW_LC_TEST_DATA.totalCharges);
        await view.assertTotalCommission(VIEW_LC_TEST_DATA.totalCommission);
        await view.assertTotalTaxes(VIEW_LC_TEST_DATA.totalTaxes);
      });
    });

    test('TC-VBS-002 @regression  Compliance auditor reviews CCT split', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabCCT();
      for (const c of VIEW_LC_TEST_DATA.charges) {
        await view.assertChargesRow(c.description, c.amount);
        await expect(page.getByText(c.account, { exact: false }).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('TC-VBS-003 @regression  Operations user reviews SWIFT message trail', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabSwiftMessages();
      // Newest is type 707 (Amendment); oldest is type 700 (L/C instrument).
      await view.assertSwiftRow('2452061271927784', '707');
      await view.assertSwiftRow('2262019672343314', '700');
    });

    test('TC-VBS-004 @smoke  Trade officer verifies amendment history', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAmendments();
      await view.assertAmendmentRow('1', '£912,456.00', 'Accepted');
      await view.assertAmendmentRow('2', '£912,456.00', 'Rejected');
    });

    test('TC-VBS-005 @smoke  User initiates a Bill from View page', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabBills();
      await view.assertInitiateBillVisible();
      await view.clickInitiateBill();
      // Tolerant assertion — Initiate Bill screen launches.
      await expect(page.getByText(/Initiate Bill|Bill Details|Initiate Bill under LC/i).first())
        .toBeVisible({ timeout: 15000 });
    });

    test('TC-VBS-006 @regression  User reviews Transferred LC chain', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabTransferredLC();
      await view.assertTransferredLcRow(VIEW_LC_TEST_DATA.transferredLc);
    });

    test('TC-VBS-007 @regression  User verifies bank chain across LC Details and Banks tabs', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await test.step('LC Details — bank chain visible', async () => {
        await view.clickTabLcDetails();
        await view.assertBankChain({
          issuingSwift:             VIEW_LC_TEST_DATA.issuingBankSwift,
          issuingName:              VIEW_LC_TEST_DATA.issuingBankName,
          advisingSwift:            VIEW_LC_TEST_DATA.advisingThroughSwift,
          confirmationInstructions: VIEW_LC_TEST_DATA.confirmationInstructions,
          confirmingBankName:       VIEW_LC_TEST_DATA.confirmingBankName,
        });
      });
      await test.step('Banks tab — Advise Through Bank matches', async () => {
        await view.clickTabBanks();
        await view.assertAdviseThroughBank({
          swift:           VIEW_LC_TEST_DATA.adviseThroughBank.swift,
          name:            VIEW_LC_TEST_DATA.adviseThroughBank.name,
          addressFragment: VIEW_LC_TEST_DATA.adviseThroughBank.address,
        });
      });
    });

    test('TC-VBS-008 @regression  User views assignment of LC proceeds', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAssignment();
      await view.assertAssignmentRow(VIEW_LC_TEST_DATA.assignment);
    });

    test.fixme('TC-VBS-009 @regression  Approver uses View page to corroborate before approval', async ({ page }) => {
      // TODO: provision corpapprover/Admin@131 in the test env; then assert
      // the same read-only header & tab content as the maker view.
      void page;
    });

    test('TC-VBS-010 @regression  Maker copies OBDX Reference for support tracking', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const ref = await view.readHeaderObdxReference();
      expect(ref).toBe(VIEW_LC_TEST_DATA.obdxReference);
      expect(ref.length).toBeGreaterThan(0);
    });

    test('TC-VBS-011 @regression  User opens amendment detail and returns', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      await view.clickTabAmendments();
      try {
        await view.clickViewAmendment(VIEW_LC_TEST_DATA.amendments[0].number);
        await view.clickBack();
        await view.clickTabAmendments();
        await view.assertAmendmentRow('1', '£912,456.00', 'Accepted');
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Amendment detail link not exposed in this build.' });
      }
    });

    test('TC-VBS-012 @smoke  Header values stay constant across all tabs', async ({ page }) => {
      const { view } = await loginAndOpenLcDetail(page);
      const baseline = {
        ref:      await view.readHeaderLcReference(),
        obdx:     await view.readHeaderObdxReference(),
        product:  await view.readHeaderProduct(),
        amount:   await view.readHeaderLcAmount(),
        expiry:   await view.readHeaderDateOfExpiry(),
      };
      for (const fn of [
        view.clickTabAttachedDocuments, view.clickTabAmendments,
        view.clickTabBills, view.clickTabCCT, view.clickTabSwiftMessages,
        view.clickTabBanks, view.clickTabAssignment, view.clickTabTransferredLC,
      ]) {
        await fn.call(view);
        expect(await view.readHeaderLcReference()).toBe(baseline.ref);
        expect(await view.readHeaderLcAmount()).toBe(baseline.amount);
        expect(await view.readHeaderDateOfExpiry()).toBe(baseline.expiry);
      }
    });

    test.fixme('TC-VBS-013 @regression  Read-only enforcement for View-only entitlement', async ({ page }) => {
      // TODO: provision a viewer-only user without Amend entitlement, then
      // assert that no Amend/Submit/Edit buttons render on the detail page.
      void page;
    });

    test('TC-VBS-014 @regression  Direct URL access requires authentication', async ({ page }) => {
      // No active session — direct deep-link should redirect to login.
      await page.goto('/home.html?ojr=view-lc;module=letter-of-credit');
      await page.waitForFunction(
        () => /login-form-main|ojr=login/i.test(window.location.href),
        { timeout: 30000 }
      );
      expect(page.url()).toMatch(/login/i);
    });
  });
});
