import { Page, expect } from '@playwright/test';
import { OjHelper } from '../utils/ojHelper';
import { WaitHelper } from '../utils/waitHelper';

/**
 * Import Letter of Credit — End-to-End Flow Page Object (OBDX 25.1)
 *
 * Consolidates the full Create Import LC journey into a single class:
 *   1. LC Listing / Nav page  (Create LC button)
 *   2. Tab 1 — LC Details
 *   3. Tab 2 — Goods & Shipment
 *   4. Tab 3 — Documents (navigate only, no field interaction)
 *   5. Tab 4 — Linkages / Collateral
 *   6. Tab 5 — Instructions (mandatory Read Standard Instructions checkbox)
 *   7. Tab 6 — Insurance (select policy)
 *   8. Tab 7 — Attachments → Review → Confirmation
 *
 * Locators and quirks captured from the live OBDX 25.1 DOM. Numeric ID suffixes
 * (e.g. SelectProduct8713118) are session-scoped in some places — kept as-is
 * because they match the build under test. Stable selectors (data-id, aria-label,
 * pipe-suffix IDs) are preferred where available.
 */
export class ImportLcFlowPage {
  // ── Listing / Nav page ──────────────────────────────────────────────────
  private readonly createLcButton = this.page.locator('button', { hasText: 'Create LC' }).first();

  // ── Tab 1: LC Details ───────────────────────────────────────────────────
  private readonly productDropdown = this.page.locator('oj-select-one#SelectProduct8713118');
  private readonly lcAmountInput   = this.page.locator('#lc-amount_field input, input[id*="lc-amount"]').first();
  private readonly swiftCodeInput  = this.page.locator('#availableWithSwiftCode input');
  private readonly verifyButton    = this.page.locator('button', { hasText: 'Verify' }).first();

  // ── Tab 2: Goods & Shipment ─────────────────────────────────────────────
  private readonly partialShipmentDropdown = this.page.locator('oj-select-one#PartialShipment2681350');
  private readonly transshipmentDropdown   = this.page.locator('oj-select-one#Transshipment8893098');
  private readonly placeOfTakingInput      = this.page.locator('#PlaceofTaking770471 input');
  private readonly finalDestinationInput   = this.page.locator('#PlaceofFinalDestination7797471 input');
  private readonly shipmentDateInput       = this.page.locator('#ShipmentDate8869450 input');
  private readonly portOfLoadingInput      = this.page.locator('#PortofLoading7310493 input');
  private readonly portOfDischargeInput    = this.page.locator('#PortofDischarge4407721 input');

  // ── Tab 4: Linkages ─────────────────────────────────────────────────────
  private readonly addCollateralLink       = this.page.getByRole('link', { name: 'Click here to add Collateral Linkage' }).first();
  private readonly accountNumberInput      = this.page.locator('input[id*="account-input"]').first();
  private readonly contributionAmountInput = this.page.getByRole('textbox', { name: 'Contribution Amount for Collateral' }).first();
  private readonly collateralTable         = this.page.locator('oj-table#CollateralLinkages401204');

  // ── Tab 5: Instructions ─────────────────────────────────────────────────
  private readonly advisingBankSwift                = this.page.locator('#advBankSwiftCode input');
  private readonly readStandardInstructionsCheckbox = this.page.locator('oj-checkboxset#ReadStandardInstructions6671350');

  // ── Tab 6: Insurance ────────────────────────────────────────────────────
  private readonly insuranceTable = this.page.locator('oj-table#InsuranceDataTable8714597');

  // ── Tab 7 / Review / Confirmation ───────────────────────────────────────
  private readonly submitButton    = this.page.locator('button', { hasText: 'Submit' }).first();
  private readonly termsCheckbox   = this.page.getByRole('checkbox', { name: 'I accept Terms and Conditions' });
  private readonly readOnlyFields  = this.page.locator('DIV.oj-text-field-readonly-div');

  // ── Shared ──────────────────────────────────────────────────────────────
  private readonly nextButton = this.page.locator('button', { hasText: 'Next' }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj   = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Listing / Nav page
  // ────────────────────────────────────────────────────────────────────────

  async assertOnLcNavPage(): Promise<void> {
    await expect(this.createLcButton).toBeVisible({ timeout: 15000 });
  }

  async clickCreateLC(): Promise<void> {
    await this.createLcButton.click();
    await this.wait.waitForUrlFragment('initiate-letter-of-credit', 30000);
    await this.wait.shortPause(1000);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 1 — LC Details
  // ────────────────────────────────────────────────────────────────────────

  async fillLcDetails(data: {
    product: string;
    dateOfExpiry: string;
    placeOfExpiry: string;
    beneficiaryName: string;
    lcCurrency: string;
    lcAmount: string;
    customerReference: string;
    swiftCode: string;
  }): Promise<void> {
    await this.productDropdown.waitFor({ state: 'visible', timeout: 20000 });

    await this.oj.ojSelectWithSearch('oj-select-one#SelectProduct8713118', data.product, data.product);
    await this.wait.shortPause(600);

    await this.wait.shortPause(300);
    await this.oj.ojFillDate('#DateofExpiry3481130 input', data.dateOfExpiry);
    await this.wait.shortPause(300);

    await this.oj.ojFill('#PlaceofExpiry2710814 input', data.placeOfExpiry);
    await this.wait.shortPause(300);

    await this.oj.ojSelectWithSearch('oj-select-one#BeneficiaryName8826275', data.beneficiaryName, data.beneficiaryName);
    await this.wait.shortPause(600);

    await this.oj.ojSelectWithSearch('oj-select-one#lc-amount_currency', data.lcCurrency, data.lcCurrency);
    await this.wait.shortPause(400);

    await this.lcAmountInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.lcAmountInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#lc-amount_field input, input[id*="lc-amount"]', data.lcAmount);
    await this.wait.shortPause(300);

    await this.oj.ojFill('#CustomerReferenceNumber8344067 input', data.customerReference);

    await this.swiftCodeInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.swiftCodeInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#availableWithSwiftCode input', data.swiftCode);
    await this.wait.shortPause(400);
    await this.verifyButton.click();
    await this.wait.shortPause(1000);

    await this.clickNext();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 2 — Goods & Shipment
  // ────────────────────────────────────────────────────────────────────────

  async fillGoodsAndShipment(data: {
    partialShipment: string;
    transshipment: string;
    placeOfTaking: string;
    finalDestination: string;
    shipmentDate: string;
    portOfLoading: string;
    portOfDischarge: string;
    goodsType: string;
    goodsQuantity: string;
    goodsCostPerUnit: string;
  }): Promise<void> {
    await this.partialShipmentDropdown.waitFor({ state: 'visible', timeout: 20000 });

    await this.partialShipmentDropdown.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#PartialShipment2681350', data.partialShipment);
    await this.wait.shortPause(400);

    await this.transshipmentDropdown.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#Transshipment8893098', data.transshipment);
    await this.wait.shortPause(400);

    await this.placeOfTakingInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PlaceofTaking770471 input', data.placeOfTaking);

    await this.finalDestinationInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PlaceofFinalDestination7797471 input', data.finalDestination);

    await this.shipmentDateInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillDate('#ShipmentDate8869450 input', data.shipmentDate);
    await this.wait.shortPause(300);

    await this.portOfLoadingInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PortofLoading7310493 input', data.portOfLoading);

    await this.portOfDischargeInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PortofDischarge4407721 input', data.portOfDischarge);

    // Goods row entry is intentionally skipped in this build — see legacy
    // GoodsShipmentPage.fillGoodsRow for the captured implementation.

    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.dismissGoodsAmountWarning();
    await this.wait.shortPause(1000);
  }

  /** Dismiss the "Goods total amount should equal LC amount" warning if it appears */
  private async dismissGoodsAmountWarning(): Promise<void> {
    try {
      const okBtn = this.page.locator('button', { hasText: 'OK' }).first();
      await okBtn.waitFor({ state: 'visible', timeout: 4000 });
      await okBtn.click();
    } catch {
      // Warning did not appear
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 3 — Documents (no field interaction; click Next via JS to bypass
  // pointer-events on the disabled-looking button)
  // ────────────────────────────────────────────────────────────────────────

  async navigateThroughDocuments(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector('li#letter-of-credit-document-details');
        if (!el) return false;
        return el.classList.contains('oj-selected') ||
               el.getAttribute('aria-selected') === 'true' ||
               el.querySelector('.oj-selected') !== null;
      },
      { timeout: 15000 }
    ).catch(() => { /* fall through to JS click */ });
    await this.wait.shortPause(800);

    await this.clickNextViaJs();
    await this.wait.shortPause(1000);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 4 — Linkages
  // ────────────────────────────────────────────────────────────────────────

  async fillLinkages(data: {
    collateralAccountNumber: string;
    collateralContributionAmount: string;
  }): Promise<void> {
    await this.addCollateralLink.waitFor({ state: 'visible', timeout: 20000 });

    await this.addCollateralLink.scrollIntoViewIfNeeded();
    await this.addCollateralLink.click();
    await this.wait.shortPause(800);

    await this.accountNumberInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.accountNumberInput.scrollIntoViewIfNeeded();
    await this.accountNumberInput.fill(data.collateralAccountNumber);
    await this.wait.shortPause(600);
    try {
      const suggestion = this.page.locator('.oj-listbox-result, li[role="option"]').first();
      await suggestion.waitFor({ state: 'visible', timeout: 3000 });
      await suggestion.click();
    } catch {
      // No suggestion dropdown — value already filled
    }

    await this.oj.ojFillLocator(this.contributionAmountInput, data.collateralContributionAmount);
    await this.wait.shortPause(400);

    await expect(this.collateralTable).toBeVisible({ timeout: 10000 });

    await this.clickNext();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 5 — Instructions (mandatory Read Standard Instructions checkbox)
  // ────────────────────────────────────────────────────────────────────────

  async fillInstructions(data: {
    advisingBankSwift: string;
  }): Promise<void> {
    await this.readStandardInstructionsCheckbox.waitFor({ state: 'visible', timeout: 20000 });

    // Advising Bank SWIFT is normally pre-filled from Tab 1 — only fill if empty
    await this.advisingBankSwift.waitFor({ state: 'visible', timeout: 10000 });
    const value = await this.advisingBankSwift.inputValue();
    if (!value || value.trim() === '') {
      await this.oj.ojFill('#advBankSwiftCode input', data.advisingBankSwift);
      await this.wait.shortPause(400);
    }

    await this.checkReadStandardInstructions();

    await this.clickNextViaJs();
    await this.wait.shortPause(1000);
  }

  /** OJet checkboxset doesn't always commit on Playwright .check() — drive via JS */
  private async checkReadStandardInstructions(): Promise<void> {
    await this.readStandardInstructionsCheckbox.scrollIntoViewIfNeeded();
    await this.wait.shortPause(400);

    await this.page.evaluate(() => {
      const checkboxSet = document.querySelector('oj-checkboxset#ReadStandardInstructions6671350');
      if (!checkboxSet) throw new Error('ReadStandardInstructions checkboxset not found');
      const cb = checkboxSet.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (!cb) throw new Error('Checkbox input inside ReadStandardInstructions not found');
      if (!cb.checked) cb.click();
    });
    await this.wait.shortPause(600);

    const isChecked = await this.page.evaluate(() => {
      const checkboxSet = document.querySelector('oj-checkboxset#ReadStandardInstructions6671350');
      const cb = checkboxSet?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      return cb?.checked ?? false;
    });

    if (!isChecked) {
      await this.readStandardInstructionsCheckbox.click();
      await this.wait.shortPause(500);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 6 — Insurance
  // ────────────────────────────────────────────────────────────────────────

  async fillInsurance(data: {
    insurancePolicyNumber: string;
  }): Promise<void> {
    await this.insuranceTable.waitFor({ state: 'visible', timeout: 20000 });
    await this.insuranceTable.scrollIntoViewIfNeeded();
    await this.wait.shortPause(600);

    const selected = await this.page.evaluate((policyNum) => {
      const table = document.querySelector('oj-table#InsuranceDataTable8714597');
      if (!table) throw new Error('Insurance table not found');
      const rows = Array.from(table.querySelectorAll('tr[role="row"]'));
      for (const row of rows) {
        if (row.textContent?.includes(policyNum)) {
          const radio = row.querySelector('input[type="radio"], oj-selector, .oj-selector-radio') as HTMLElement | null;
          if (radio) { radio.click(); return true; }
          (row as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, data.insurancePolicyNumber);

    if (!selected) {
      // Fallback: select first row (AIG Insurance)
      await this.page.evaluate(() => {
        const table = document.querySelector('oj-table#InsuranceDataTable8714597');
        const rows = table?.querySelectorAll('tr[role="row"]');
        if (rows && rows.length > 0) {
          const radio = rows[0].querySelector('input[type="radio"]') as HTMLElement | null;
          if (radio) radio.click();
          else (rows[0] as HTMLElement).click();
        }
      });
    }
    await this.wait.shortPause(500);

    await this.clickNextViaJs();
    await this.wait.shortPause(1000);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 7 — Attachments → Review → Confirmation
  // ────────────────────────────────────────────────────────────────────────

  /** Tick T&C and click Submit on Attachments to navigate to the Review page. */
  async submitFromAttachments(): Promise<void> {
    // T&C must be ticked or Submit is silently rejected.
    await this.termsCheckbox.waitFor({ state: 'attached', timeout: 15000 });
    await this.termsCheckbox.scrollIntoViewIfNeeded();
    await this.termsCheckbox.evaluate((el) => {
      const cb = el as HTMLInputElement;
      if (!cb.checked) cb.click();
    });
    await this.wait.shortPause(400);

    await this.submitButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.waitForUrlFragment('review-letter-of-credit', 30000);
    await this.wait.shortPause(1500);
  }

  /** Final Submit on the Review page. */
  async submitFromReview(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.waitForUrlFragment('confirm-screen', 30000);
    await this.wait.shortPause(1500);
  }

  async assertOnReviewPage(): Promise<void> {
    await this.page.waitForFunction(
      () => window.location.href.includes('review-letter-of-credit'),
      { timeout: 20000 }
    );
  }

  async assertOnConfirmationPage(): Promise<void> {
    await this.page.waitForFunction(
      () => window.location.href.includes('confirm-screen'),
      { timeout: 20000 }
    );
  }

  async assertConfirmation(
    expectedMessage: string = 'Transaction submitted for approval.',
    expectedStatus: string  = 'Pending for Approval'
  ): Promise<void> {
    await expect(
      this.page.locator(`text=${expectedMessage}`).first()
    ).toBeVisible({ timeout: 20000 });

    await expect(
      this.page.locator(`text=${expectedStatus}`).first()
    ).toBeVisible({ timeout: 10000 });
  }

  /** Find the alphanumeric reference number among read-only confirmation fields. */
  async getReferenceNumber(): Promise<string> {
    const count = await this.readOnlyFields.count();
    for (let i = 0; i < count; i++) {
      const text = await this.readOnlyFields.nth(i).innerText();
      if (/^[A-Z0-9]{10,}$/.test(text.trim())) {
        return text.trim();
      }
    }
    return 'REFERENCE_NOT_FOUND';
  }

  // ────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ────────────────────────────────────────────────────────────────────────

  private async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(1000);
  }

  /** JS click — bypasses pointer-events / disabled-looking states on Next. */
  private async clickNextViaJs(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent?.trim() === 'Next');
      if (nextBtn) nextBtn.click();
    });
  }
}
