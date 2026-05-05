/**
 * E2E Test Specification: Create Import Letter of Credit (ILC-INL)
 * Application: OBDX 25.1 (HBL)
 * Product:     Import Letter of Credit - INLAND SIGHT LC
 *
 * Test Flow:
 *  Login → Trade Finance Menu → Import LC → Create LC
 *  → Tab 1: LC Details
 *  → Tab 2: Goods & Shipment
 *  → Tab 3: Documents (navigate only — NO field interaction)
 *  → Tab 4: Linkages (add collateral)
 *  → Tab 5: Instructions (MUST check Read Standard Instructions checkbox)
 *  → Tab 6: Insurance (select AIG Insurance)
 *  → Tab 7: Attachments → Submit
 *  → Review Page → Final Submit
 *  → Assert: "Transaction submitted for approval." + "Pending for Approval"
 */

import { test, expect } from '@playwright/test';
import { LC_TEST_DATA } from '../test-data/lcTestData';

import { LoginPage }         from '../pages/LoginPage';
import { DashboardPage }     from '../pages/DashboardPage';
import { ImportLcFlowPage }  from '../pages/ImportLcFlowPage';

test.describe('Create Import Letter of Credit — ILC-INL', () => {

  test.describe.configure({ mode: 'serial' });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-ILC-001: Successful E2E Create Import LC (Happy Path)
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-ILC-001: Create Import LC (ILC-INL) end-to-end - happy path', async ({ page }) => {

    // ── Page Object instantiation ────────────────────────────────────────
    const loginPage     = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const ilcFlow       = new ImportLcFlowPage(page);

    // ── STEP 1: Navigate to application and login ────────────────────────
    await test.step('Login with valid credentials', async () => {
      await loginPage.navigate();
      await loginPage.login(LC_TEST_DATA.username, LC_TEST_DATA.password);
      await dashboardPage.waitForDashboard();
    });

    // ── STEP 2: Navigate to Initiate Import LC ───────────────────────────
    await test.step('Navigate: Trade Finance → Import Letter of Credit → Initiate Import LC', async () => {
      await dashboardPage.navigateToInitiateImportLC();
      await ilcFlow.assertOnLcNavPage();
    });

    // ── STEP 3: Click Create LC ──────────────────────────────────────────
    await test.step('Click Create LC button', async () => {
      await ilcFlow.clickCreateLC();
    });

    // ── STEP 4: Fill LC Details Tab ──────────────────────────────────────
    await test.step('Tab 1 - Fill LC Details (product, dates, beneficiary, currency, amount, SWIFT)', async () => {
      await ilcFlow.fillLcDetails({
        product:           LC_TEST_DATA.product,
        dateOfExpiry:      LC_TEST_DATA.dateOfExpiry,
        placeOfExpiry:     LC_TEST_DATA.placeOfExpiry,
        beneficiaryName:   LC_TEST_DATA.beneficiaryName,
        lcCurrency:        LC_TEST_DATA.lcCurrency,
        lcAmount:          LC_TEST_DATA.lcAmount,
        customerReference: LC_TEST_DATA.customerReference,
        swiftCode:         LC_TEST_DATA.swiftCode,
      });
    });

    // ── STEP 5: Fill Goods & Shipment Tab ───────────────────────────────
    await test.step('Tab 2 - Fill Goods & Shipment (partial shipment, ports, dates, goods)', async () => {
      await ilcFlow.fillGoodsAndShipment({
        partialShipment:  LC_TEST_DATA.partialShipment,
        transshipment:    LC_TEST_DATA.transshipment,
        placeOfTaking:    LC_TEST_DATA.placeOfTaking,
        finalDestination: LC_TEST_DATA.finalDestination,
        shipmentDate:     LC_TEST_DATA.shipmentDate,
        portOfLoading:    LC_TEST_DATA.portOfLoading,
        portOfDischarge:  LC_TEST_DATA.portOfDischarge,
        goodsType:        LC_TEST_DATA.goodsType,
        goodsQuantity:    LC_TEST_DATA.goodsQuantity,
        goodsCostPerUnit: LC_TEST_DATA.goodsCostPerUnit,
      });
    });

    // ── STEP 6: Documents Tab — navigate only, NO field interaction ──────
    await test.step('Tab 3 - Documents: navigate through without any field interaction', async () => {
      await ilcFlow.navigateThroughDocuments();
    });

    // ── STEP 7: Linkages Tab — add collateral ────────────────────────────
    await test.step('Tab 4 - Linkages: add collateral account and contribution amount', async () => {
      await ilcFlow.fillLinkages({
        collateralAccountNumber:      LC_TEST_DATA.collateralAccountNumber,
        collateralContributionAmount: LC_TEST_DATA.collateralContributionAmount,
      });
    });

    // ── STEP 8: Instructions Tab — check mandatory checkbox ──────────────
    await test.step('Tab 5 - Instructions: verify SWIFT and check mandatory Read Standard Instructions', async () => {
      await ilcFlow.fillInstructions({
        advisingBankSwift: LC_TEST_DATA.advisingBankSwift,
      });
    });

    // ── STEP 9: Insurance Tab — select AIG Insurance ─────────────────────
    await test.step('Tab 6 - Insurance: select AIG Insurance policy', async () => {
      await ilcFlow.fillInsurance({
        insurancePolicyNumber: LC_TEST_DATA.insurancePolicyNumber,
      });
    });

    // ── STEP 10: Attachments Tab — click Submit ──────────────────────────
    await test.step('Tab 7 - Attachments: click Submit to go to Review page', async () => {
      await ilcFlow.submitFromAttachments();
      await ilcFlow.assertOnReviewPage();
    });

    // ── STEP 11: Review Page — final Submit ──────────────────────────────
    await test.step('Review page: verify and click final Submit', async () => {
      await ilcFlow.submitFromReview();
      await ilcFlow.assertOnConfirmationPage();
    });

    // ── STEP 12: Assert confirmation ─────────────────────────────────────
    await test.step('Confirm: assert success message and Pending for Approval status', async () => {
      await ilcFlow.assertConfirmation(
        LC_TEST_DATA.confirmationMessage,
        LC_TEST_DATA.expectedStatus
      );

      // Log the reference number for traceability
      const refNumber = await ilcFlow.getReferenceNumber();
      console.log(`[ILC-001] Transaction Reference Number: ${refNumber}`);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-ILC-002: Login with invalid credentials
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-ILC-002: Login with invalid credentials should show error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('invaliduser', 'WrongPass@999');
    await loginPage.assertLoginError();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC-ILC-003: Navigate to Import LC listing page
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-ILC-003: Navigation to Import LC listing page is successful', async ({ page }) => {
    const loginPage     = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const ilcFlow       = new ImportLcFlowPage(page);

    await loginPage.navigate();
    await loginPage.login(LC_TEST_DATA.username, LC_TEST_DATA.password);
    await dashboardPage.waitForDashboard();
    await dashboardPage.navigateToInitiateImportLC();
    await ilcFlow.assertOnLcNavPage();
    expect(page.url()).toContain('lc-nav-bar');
  });
});
