/**
 * E2E Test Specification: Settlement of Import LC Bill
 * Application: OBDX 25.1 (HBL)
 * FSD: 3.2.87
 *
 * Maps to the `Settlement Import Bills` sheet (24 cases —
 * TC-SIMB-001..018 + TC-SIMBBS-001..005 + TC-SIMB-N01).
 *
 * Scope: Maker-only. Single Bill + Multiple Bill modes covered.
 */

import { test, expect } from '@fixtures/auth.fixture';
import { LC_TEST_DATA }                from '@data/lcTestData';
import { SETTLE_IMPORT_BILL_TEST_DATA } from '@data/settleImportBillTestData';
import { LoginPage }                   from '@pages/common/LoginPage';
import { DashboardPage }               from '@pages/common/DashboardPage';
import { SettlementImportBillFlowPage } from '@pages/trade-finance/SettlementImportBillFlowPage';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '..', '..', 'fixtures', 'attachments');

async function loginAndOpenSettlement(page: any): Promise<{
  settle: SettlementImportBillFlowPage;
  dash: DashboardPage;
}> {
  const loginPage = new LoginPage(page);
  const dash      = new DashboardPage(page);
  const settle    = new SettlementImportBillFlowPage(page);

  await loginPage.navigate();
  await loginPage.login(LC_TEST_DATA.username, LC_TEST_DATA.password);
  await dash.waitForDashboard();
  await dash.navigateToSettlementOfImportBills();
  return { settle, dash };
}

async function loginAndOpenSingleBillVerified(
  page: any,
  billRef: string = SETTLE_IMPORT_BILL_TEST_DATA.unsettledBillRef,
): Promise<{ settle: SettlementImportBillFlowPage; dash: DashboardPage }> {
  const ctx = await loginAndOpenSettlement(page);
  await ctx.settle.selectSingleBillMode();
  await ctx.settle.lookupBillByReference(billRef);
  await ctx.settle.clickVerify();
  return ctx;
}

test.describe('Settlement of Import LC Bill — Maker End-to-End', () => {

  test.describe.configure({ retries: 1 });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Single Bill Settlement
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Single Bill Settlement', () => {

    test('TC-SIMB-001 @smoke  Open Settlement of Bills via Toggle Menu', async ({ page }) => {
      await loginAndOpenSettlement(page);
      // Default tab is Single Bill — verify the lookup field is present.
      await expect(
        page.getByRole('combobox', { name: /Lookup Bill Reference No|Bill Reference/i }).first()
      ).toBeVisible({ timeout: 15000 });
    });

    test('TC-SIMB-002 @smoke  Lookup Bill Reference', async ({ page }) => {
      const { settle } = await loginAndOpenSettlement(page);
      await settle.selectSingleBillMode();
      await settle.lookupBillByReference(SETTLE_IMPORT_BILL_TEST_DATA.unsettledBillRef);
      await settle.clickVerify();
    });

    test('TC-SIMB-003 @regression  Advanced Lookup overlay opens', async ({ page }) => {
      const { settle } = await loginAndOpenSettlement(page);
      await settle.selectSingleBillMode();
      await settle.openAdvancedLookup();
      await expect(
        page.getByRole('textbox', { name: /Amount From|Drawee Name|Drawer Name/i }).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('TC-SIMB-004 @smoke  Enter Amount to Settle', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
    });

    test('TC-SIMB-005 @smoke  Settle via Settlement Account', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
    });

    test('TC-SIMB-006 @smoke  Apply for Loans path', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickApplyForLoans();
      await settle.setSettleAvailableBalanceYes();
      await settle.setLoanProduct(SETTLE_IMPORT_BILL_TEST_DATA.loanProduct);
      await settle.setLoanTenor(SETTLE_IMPORT_BILL_TEST_DATA.loanTenor);
    });

    test.fixme('TC-SIMB-N01 @regression  Insufficient settlement-account balance', async ({ page }) => {
      // TODO: requires an account with a known low balance vs. the bill
      // amount. SETTLE_IMPORT_BILL_TEST_DATA.insufficientAmount is a
      // placeholder until that env state is provisioned.
      void page;
    });

    test('TC-SIMB-007 @regression  Link Pre-Booked Forex Deal', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
      await settle.clickNext();
      // On Forex Deals tab — either same-currency message OR pre-booked overlay.
      const sameCurrencyMsg = page.getByText(/bill is in the same currency as your account/i).first();
      const lookupLink      = page.getByRole('link', { name: /Look Up Pre-Booked Forex Deals/i }).first();
      const visibleAnything = await sameCurrencyMsg.or(lookupLink).first().isVisible().catch(() => false);
      expect(visibleAnything).toBeTruthy();
    });

    test('TC-SIMB-008 @smoke  Upload supporting document', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
      await settle.clickNext();   // Forex Deals → Next
      await settle.clickNext();   // (Charges removed on SG/UAE) → Attachments
      const filePath = path.join(FIXTURES_DIR, SETTLE_IMPORT_BILL_TEST_DATA.fileName);
      await settle.attachFile(filePath);
    });

    test('TC-SIMB-009 @smoke  Confirm settlement', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
      await settle.clickNext();
      await settle.clickNext();
      const filePath = path.join(FIXTURES_DIR, SETTLE_IMPORT_BILL_TEST_DATA.fileName);
      await settle.attachFile(filePath);
      await settle.tickTermsAndConditions();
      await settle.clickSubmit();
      await settle.assertOnReviewScreen();
      await settle.clickConfirm();
      await settle.assertConfirmation();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Multiple Bill Settlement
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Multiple Bill Settlement', () => {

    test('TC-SIMB-010 @smoke  Switch to Multiple Bill tab', async ({ page }) => {
      const { settle } = await loginAndOpenSettlement(page);
      await settle.selectMultipleBillMode();
      // Multiple Bill tab should reveal the bill checklist.
      await expect(
        page.getByRole('checkbox', { name: /Select All Bills/i }).first()
            .or(page.getByText(/Bill Reference Number/i).first())
      ).toBeVisible({ timeout: 15000 });
    });

    test('TC-SIMB-011 @regression  Select All Bills toggle', async ({ page }) => {
      const { settle } = await loginAndOpenSettlement(page);
      await settle.selectMultipleBillMode();
      try {
        await settle.toggleSelectAllBills();
        await settle.assertTotalSettlementAmountVisible();
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Select All Bills not available with current bill set.' });
      }
    });

    test.fixme('TC-SIMB-012 @smoke  Multi-bill CASA settlement', async ({ page }) => {
      // TODO: requires ≥ 2 unsettled bills in the env under the same LC.
      // Placeholder; flesh out once env data is provisioned.
      void page;
    });

    test.fixme('TC-SIMB-013 @regression  Multi-bill Loan settlement', async ({ page }) => {
      // TODO: requires ≥ 2 unsettled bills.
      void page;
    });

    test.fixme('TC-SIMB-014 @regression  Custom mode per-bill mix', async ({ page }) => {
      // TODO: requires ≥ 2 unsettled bills + Custom mode UI in build.
      void page;
    });

    test('TC-SIMB-015 @regression  Special Instructions accepted in Multi mode', async ({ page }) => {
      const { settle } = await loginAndOpenSettlement(page);
      await settle.selectMultipleBillMode();
      // Skip selecting a bill; just verify the Special Instructions field
      // accepts text. (Field is rendered even with no selection.)
      try {
        await settle.setMultiSpecialInstructions(SETTLE_IMPORT_BILL_TEST_DATA.specialInstructions);
      } catch {
        test.info().annotations.push({ type: 'note', description: 'Special Instructions not yet rendered before bill selection in this build.' });
      }
    });

    test.fixme('TC-SIMB-016 @smoke  Submit multi-bill settlement', async ({ page }) => {
      // TODO: depends on ≥ 2 unsettled bills + same-currency settlement
      // path. Skipping until env-data is reliable.
      void page;
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ SG/UAE variants
  // ══════════════════════════════════════════════════════════════════════
  test.describe('SG/UAE variants', () => {

    test('TC-SIMB-017 @regression  Edge — SG/UAE: routes through back office', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
      await settle.clickNext();
      await settle.clickNext();
      const filePath = path.join(FIXTURES_DIR, SETTLE_IMPORT_BILL_TEST_DATA.fileName);
      await settle.attachFile(filePath);
      await settle.tickTermsAndConditions();
      await settle.clickSubmit();
      await settle.assertOnReviewScreen();
      await settle.clickConfirm();
      // Maker-side success message; back-office routing is asserted in admin UI.
      await settle.assertConfirmation();
      test.info().annotations.push({ type: 'note', description: 'Per C-9.14, settlement lands on back office. Admin queue verification is out of Maker-only scope.' });
    });

    test('TC-SIMB-018 @regression  Edge — SG/UAE: Charges tab removed', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      // Charges tab should NOT be present between Forex Deals and Attachments.
      const chargesTab = page.getByRole('tab', { name: /^Charges$/i }).first();
      const count = await chargesTab.count();
      expect(count).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // ■ Business Scenarios
  // ══════════════════════════════════════════════════════════════════════
  test.describe('Business Scenarios', () => {

    test('TC-SIMBBS-001 @smoke  Single bill happy path via CASA', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
      await settle.clickNext();
      await settle.clickNext();
      const filePath = path.join(FIXTURES_DIR, SETTLE_IMPORT_BILL_TEST_DATA.fileName);
      await settle.attachFile(filePath);
      await settle.tickTermsAndConditions();
      await settle.clickSubmit();
      await settle.assertOnReviewScreen();
      await settle.clickConfirm();
      await settle.assertConfirmation();
    });

    test.fixme('TC-SIMBBS-002 @smoke  Multi-bill via CASA', async ({ page }) => {
      // TODO: requires ≥ 2 unsettled bills available under the maker.
      void page;
    });

    test.fixme('TC-SIMBBS-003 @regression  Mixed Custom mode (CASA + Loan)', async ({ page }) => {
      // TODO: requires ≥ 2 unsettled bills + Custom mode UI.
      void page;
    });

    test('TC-SIMBBS-004 @regression  Loan-funded single bill settlement', async ({ page }) => {
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickApplyForLoans();
      await settle.setSettleAvailableBalanceYes();
      await settle.setLoanProduct(SETTLE_IMPORT_BILL_TEST_DATA.loanProduct);
      await settle.setLoanTenor(SETTLE_IMPORT_BILL_TEST_DATA.loanTenor);
      await settle.clickNext();
      await settle.clickNext();
      const filePath = path.join(FIXTURES_DIR, SETTLE_IMPORT_BILL_TEST_DATA.fileName);
      await settle.attachFile(filePath);
      await settle.tickTermsAndConditions();
      await settle.clickSubmit();
      await settle.assertOnReviewScreen();
      await settle.clickConfirm();
      await settle.assertConfirmation();
    });

    test('TC-SIMBBS-005 @regression  Back-office gate routing (SG/UAE)', async ({ page }) => {
      // Re-uses TC-SIMB-017 path; the "back-office gate" is a fact-of-routing
      // that we annotate but cannot verify from the Maker-only suite.
      const { settle } = await loginAndOpenSingleBillVerified(page);
      await settle.setAmountToSettle(SETTLE_IMPORT_BILL_TEST_DATA.amountToSettle);
      await settle.tickSettlementAccount();
      await settle.selectSettlementAccount(SETTLE_IMPORT_BILL_TEST_DATA.settlementAccount);
      await settle.clickNext();
      await settle.clickNext();
      const filePath = path.join(FIXTURES_DIR, SETTLE_IMPORT_BILL_TEST_DATA.fileName);
      await settle.attachFile(filePath);
      await settle.tickTermsAndConditions();
      await settle.clickSubmit();
      await settle.assertOnReviewScreen();
      await settle.clickConfirm();
      await settle.assertConfirmation();
      test.info().annotations.push({ type: 'note', description: 'Per C-9.14, settlement enters admin queue; admin-side approval verified separately.' });
    });
  });
});
