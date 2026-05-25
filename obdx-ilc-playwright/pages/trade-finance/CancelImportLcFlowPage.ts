import { Page, Locator, expect } from '@playwright/test';
import { OjHelper } from '@utils/ojHelper';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Cancel Letter of Credit — Page Object (OBDX 25.1)
 * FSD 3.2.68; customisation requirement C-9.13 (new Cancel LC screen).
 *
 * Flow:
 *   1. Lookup LC Reference No  (or Advanced Lookup overlay)
 *   2. Verify → renders read-only Bank Guarantee Details block
 *   3. Next → Attachments tab
 *   4. Attach doc + Special Instructions + Standard Instructions checkbox
 *      + I agree to surrender original LC + T&C
 *   5. Submit → Review → Confirm
 *
 * Locator strategy (per skills/obdx-25.1-framework.md):
 *   - Role + accessible-name first (`getByRole`, `getByLabel`)
 *   - `.or()` chains for label / element-type variations between OBDX builds
 *   - `ref_xxx` IDs are session-scoped and intentionally NOT used
 */
export class CancelImportLcFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Lookup screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly lookupRefDropdown = this.page.getByRole('combobox', { name: /Lookup\s+LC\s+Reference\s+No/i }).first()
                                            .or(this.page.locator('oj-select-one[id*="LookupLC" i]')).first();
  private readonly advancedLookupLink = this.page.getByRole('link', { name: /Advanced Lookup/i }).first()
                                            .or(this.page.getByRole('button', { name: /Advanced Lookup/i }).first());
  private readonly verifyButton      = this.page.getByRole('button', { name: /^Verify$/i }).first();
  private readonly resetButton       = this.page.getByRole('button', { name: /^Reset$/i }).first();

  // Advanced Lookup overlay
  private readonly advFirstBeneficiary = this.page.getByRole('textbox', { name: /First Beneficiary Name/i }).first();
  private readonly advSecondBeneficiary = this.page.getByRole('textbox', { name: /Second Beneficiary Name/i }).first();
  private readonly advCurrency        = this.page.getByRole('combobox', { name: /^Currency$/i }).first();
  private readonly advAmountFrom      = this.page.getByRole('textbox', { name: /Amount From/i }).first();
  private readonly advAmountTo        = this.page.getByRole('textbox', { name: /Amount To/i }).first();
  private readonly advApplyButton     = this.page.getByRole('button', { name: /^Apply$/i }).first();
  private readonly advCancelButton    = this.page.getByRole('button', { name: /^Cancel$/i }).first();
  private readonly advClearButton     = this.page.getByRole('button', { name: /^Clear$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab navigation
  // ────────────────────────────────────────────────────────────────────────
  private readonly letterOfCreditDetailsTab = this.page.getByRole('tab', { name: /Letter Of Credit Details|LC Details|Transfer LC Details/i }).first();
  private readonly attachmentsTab    = this.page.getByRole('tab', { name: /^Attachments$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 1 — Letter of Credit Details (read-only summary)
  // ────────────────────────────────────────────────────────────────────────
  /**
   * Locate a value cell that follows a given label.
   * Common OBDX pattern: `<label>` followed by either `<div>` text or
   * a readonly `<input>`. We use a tolerant XPath sibling lookup that
   * handles both markup variants.
   */
  private valueOfLabel(label: string): Locator {
    return this.page.locator(`xpath=//label[normalize-space()="${label}"]/following::*[self::div or self::span or self::input][1]`)
                    .first();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 2 — Attachments
  // ────────────────────────────────────────────────────────────────────────
  private readonly fileInput        = this.page.locator('input[type="file"]').first();
  private readonly fileUploadButton = this.page.getByRole('button',
                                              { name: /Drag and Drop|Select or drop files here|Add Files/i }).first();
  private readonly specialInstructionsInput = this.page.getByRole('textbox', { name: /Special Instructions/i }).first()
                                              .or(this.page.locator('textarea[id*="SpecialInstructions" i]')).first();
  private readonly standardInstructionsCheckbox = this.page.getByRole('checkbox', { name: /Kindly go through.*Standard Instructions/i }).first()
                                              .or(this.page.locator('oj-checkboxset[id*="StandardInstructions" i]')).first();
  private readonly surrenderOriginalCheckbox = this.page.getByRole('checkbox', { name: /I agree to surrender.*original.*(Letter of Credit|Transfer LC)/i }).first()
                                              .or(this.page.locator('oj-checkboxset[id*="Surrender" i]')).first();
  private readonly tncCheckbox      = this.page.getByRole('checkbox', { name: /I accept the Terms.*Conditions/i }).first()
                                              .or(this.page.locator('oj-checkboxset[id*="TermsAndConditions" i]')).first();
  private readonly previewDraftButton = this.page.getByRole('button', { name: /Preview Draft Copy/i }).first();
  private readonly submitButton     = this.page.getByRole('button', { name: /^Submit$/i }).first();
  private readonly backButton       = this.page.getByRole('button', { name: /^Back$/i }).first();
  private readonly cancelButton     = this.page.getByRole('button', { name: /^Cancel$/i }).first();
  private readonly nextButton       = this.page.getByRole('button', { name: /^Next$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Review screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly reviewBanner   = this.page.getByText(/You have initiated a request to cancel Letter of Credit/i).first();
  private readonly confirmButton  = this.page.getByRole('button', { name: /^Confirm$/i }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Page assertions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnCancelLcPage(): Promise<void> {
    await this.page.getByRole('heading', { name: /Cancel Letter Of Credit/i, level: 1 })
                   .or(this.page.getByText(/Lookup\s+LC\s+Reference\s+No/i))
                   .first()
                   .waitFor({ state: 'visible', timeout: 30000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Lookup actions
  // ════════════════════════════════════════════════════════════════════════

  /** Pick an LC reference from the Lookup dropdown. */
  async selectLcReference(lcRef: string): Promise<void> {
    const sel = 'oj-select-one[id*="LookupLC" i], oj-combobox-one[id*="LookupLC" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, lcRef, lcRef);
    } else {
      await this.lookupRefDropdown.click();
      await this.wait.shortPause(400);
      await this.page.locator('li[role="option"], .oj-listbox-result-label')
                     .filter({ hasText: lcRef })
                     .first()
                     .click();
    }
    await this.wait.shortPause(400);
  }

  /** Click Verify after a Lookup selection. */
  async clickVerify(): Promise<void> {
    await this.verifyButton.scrollIntoViewIfNeeded();
    await this.verifyButton.click();
    await this.wait.shortPause(1500);
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
    await this.wait.shortPause(400);
  }

  async openAdvancedLookup(): Promise<void> {
    await this.advancedLookupLink.click();
    await this.wait.shortPause(800);
  }

  async filterAdvancedLookup(d: {
    firstBeneficiary?: string;
    secondBeneficiary?: string;
    currency?: string;
    amountFrom?: string;
    amountTo?: string;
  }): Promise<void> {
    if (d.firstBeneficiary) {
      await this.oj.ojFillLocator(this.advFirstBeneficiary, d.firstBeneficiary);
    }
    if (d.secondBeneficiary) {
      await this.oj.ojFillLocator(this.advSecondBeneficiary, d.secondBeneficiary);
    }
    if (d.currency) {
      await this.advCurrency.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label')
                     .filter({ hasText: d.currency }).first().click();
    }
    if (d.amountFrom) await this.oj.ojFillLocator(this.advAmountFrom, d.amountFrom);
    if (d.amountTo)   await this.oj.ojFillLocator(this.advAmountTo, d.amountTo);
  }

  async applyAdvancedLookup(): Promise<void> {
    await this.advApplyButton.click();
    await this.wait.shortPause(800);
  }

  async cancelAdvancedLookup(): Promise<void> {
    await this.advCancelButton.click();
    await this.wait.shortPause(400);
  }

  async clearAdvancedLookup(): Promise<void> {
    await this.advClearButton.click();
    await this.wait.shortPause(400);
  }

  /** Click an LC row inside the Advanced Lookup result table. */
  async selectAdvancedLookupRow(lcRef: string): Promise<void> {
    await this.page.locator('tr, [role="row"]')
                   .filter({ hasText: lcRef })
                   .first()
                   .getByRole('link', { name: lcRef, exact: false })
                   .or(this.page.getByRole('link', { name: lcRef, exact: false }))
                   .first()
                   .click();
    await this.wait.shortPause(600);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 1 — read-only summary assertions
  // ════════════════════════════════════════════════════════════════════════

  async assertLcSummaryVisible(d: {
    firstBeneficiaryName: string;
    secondBeneficiaryName: string;
    lcAmount: string;
    expiryDate: string;
    product: string;
  }): Promise<void> {
    // Tolerant text-based assertions — values appear as plain text inside
    // div/label/span cells on the read-only summary block.
    for (const v of [d.firstBeneficiaryName, d.secondBeneficiaryName, d.lcAmount, d.expiryDate, d.product]) {
      await expect(this.page.getByText(v, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  /** Read a labelled value from the LC summary block. */
  async readLabel(label: string): Promise<string> {
    const cell = this.valueOfLabel(label);
    await cell.waitFor({ state: 'attached', timeout: 10000 });
    // Try inputValue (readonly input) first, then innerText.
    const fromInput = await cell.inputValue().catch(() => '');
    if (fromInput) return fromInput;
    return (await cell.innerText().catch(() => '')) ?? '';
  }

  // ════════════════════════════════════════════════════════════════════════
  // Navigation between tabs
  // ════════════════════════════════════════════════════════════════════════

  async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(800);
  }

  async openAttachmentsTab(): Promise<void> {
    if (await this.attachmentsTab.count() > 0) {
      await this.attachmentsTab.click();
      await this.wait.shortPause(600);
    } else {
      // Some builds advance via Next rather than direct tab click.
      await this.clickNext();
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 2 — Attachments actions
  // ════════════════════════════════════════════════════════════════════════

  async attachFile(filePath: string): Promise<void> {
    // Prefer direct setInputFiles if a real <input type="file"> is present;
    // otherwise trigger the native file chooser through the Drag-and-Drop
    // button (OBDX custom drop zone).
    if (await this.fileInput.count() > 0) {
      await this.fileInput.setInputFiles(filePath);
    } else {
      await this.fileUploadButton.scrollIntoViewIfNeeded();
      const chooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
      await this.fileUploadButton.click();
      const chooser = await chooserPromise;
      await chooser.setFiles(filePath);
    }
    await this.wait.shortPause(1200);
  }

  async setSpecialInstructions(text: string): Promise<void> {
    await this.specialInstructionsInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.specialInstructionsInput.scrollIntoViewIfNeeded();
    await this.specialInstructionsInput.fill(text);
    await this.specialInstructionsInput.blur();
    await this.wait.shortPause(200);
  }

  async tickStandardInstructions(): Promise<void> {
    await this.standardInstructionsCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.standardInstructionsCheckbox.isChecked().catch(() => false))) {
      await this.standardInstructionsCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async tickSurrenderOriginal(): Promise<void> {
    await this.surrenderOriginalCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.surrenderOriginalCheckbox.isChecked().catch(() => false))) {
      await this.surrenderOriginalCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async tickTermsAndConditions(): Promise<void> {
    await this.tncCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.tncCheckbox.isChecked().catch(() => false))) {
      await this.tncCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async isSubmitEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled().catch(() => false);
  }

  async clickPreviewDraft(): Promise<void> {
    await this.previewDraftButton.click();
    await this.wait.shortPause(800);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.shortPause(1500);
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.wait.shortPause(800);
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Review screen
  // ════════════════════════════════════════════════════════════════════════

  async assertOnReviewScreen(): Promise<void> {
    await this.confirmButton.waitFor({ state: 'visible', timeout: 20000 });
  }

  async assertReviewBannerVisible(): Promise<void> {
    await expect(this.reviewBanner).toBeVisible({ timeout: 10000 });
  }

  async clickConfirm(): Promise<void> {
    await this.confirmButton.scrollIntoViewIfNeeded();
    try {
      await this.confirmButton.click({ timeout: 5000 });
    } catch {
      await this.confirmButton.evaluate((el) => (el as HTMLElement).click());
    }
    await this.wait.shortPause(2500);
  }

  async assertConfirmation(): Promise<void> {
    const success    = this.page.getByText(/Transaction submitted for approval/i).first();
    const cancelMsg  = this.page.getByText(/Cancel Letter of Credit.*successful|cancellation request.*submitted/i).first();
    const duplicate  = this.page.getByText(/Duplicate transaction not permitted/i).first();
    await success.or(cancelMsg).or(duplicate).waitFor({ state: 'visible', timeout: 30000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Validation-error assertions (negative tests)
  // ════════════════════════════════════════════════════════════════════════

  async assertVisibleError(...variants: (string | RegExp)[]): Promise<void> {
    const candidates = variants.map(v =>
      typeof v === 'string' ? this.page.getByText(v, { exact: false }) : this.page.getByText(v)
    );
    let found = false;
    for (const c of candidates) {
      if (await c.first().isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, `Expected one of [${variants.map(String).join(' | ')}] to be visible`).toBeTruthy();
  }

  async assertBlockedByBookedBill(): Promise<void> {
    await this.assertVisibleError(/Cancellation not permitted/i, /bill.*already booked/i);
  }
}
