import { Page, Locator, expect } from '@playwright/test';
import { OjHelper } from '@utils/ojHelper';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Settlement of Import LC Bill — Page Object (OBDX 25.1)
 * FSD 3.2.87.
 *
 * Two-mode flow:
 *   • Single Bill Detailed Settlement Instruction — granular per-bill
 *     settlement with Pay-with-Collateral / Settlement Account / Apply
 *     for Loans (and SG/UAE C-9.16 mixed CASA+Loan).
 *   • Multiple Bill Settlement (Multiple Quick Bill Pay) — bulk
 *     selection + Current and Savings Account / Loan / Custom modes.
 *
 * Tabs (Single Bill mode):
 *   1. Settlement Details
 *   2. Forex Deals
 *   3. (Charges — removed for SG/UAE per C-9.1)
 *   4. Attachments → Submit → Review → Confirm
 */
export class SettlementImportBillFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Mode tabs
  // ────────────────────────────────────────────────────────────────────────
  private readonly singleBillModeTab = this.page.getByRole('tab', { name: /Single Bill.*Detailed settlement/i }).first()
                                            .or(this.page.getByText(/^Single Bill$/i)).first();
  private readonly multipleBillModeTab = this.page.getByRole('tab', { name: /Multiple Bill|Settle multiple bills quickly/i }).first()
                                            .or(this.page.getByText(/^Multiple Bill$/i)).first();

  // ────────────────────────────────────────────────────────────────────────
  // Single Bill — Settlement Details tab
  // ────────────────────────────────────────────────────────────────────────
  private readonly lookupBillDropdown = this.page.getByRole('combobox', { name: /Lookup Bill Reference No|Bill Reference/i }).first()
                                            .or(this.page.locator('oj-select-one[id*="LookupBill" i], oj-combobox-one[id*="LookupBill" i]')).first();
  private readonly advancedLookupLink = this.page.getByRole('link', { name: /Advanced Lookup/i }).first()
                                            .or(this.page.getByRole('button', { name: /Advanced Lookup/i }).first());
  private readonly verifyButton      = this.page.getByRole('button', { name: /^Verify$/i }).first();
  private readonly resetButton       = this.page.getByRole('button', { name: /^Reset$/i }).first();
  private readonly amountToSettleInput = this.page.getByRole('textbox', { name: /Amount to settle|Amount Settle/i }).first()
                                            .or(this.page.locator('input[id*="AmountToSettle" i]')).first();
  private readonly payWithCollateralsCheckbox = this.page.getByRole('checkbox', { name: /Pay with [Cc]ollaterals?/i }).first();
  private readonly viewCollateralDetailsLink = this.page.getByRole('link', { name: /View Collateral Details/i }).first();
  private readonly settlementAccountCheckbox = this.page.getByRole('checkbox', { name: /^Settlement Account$/i }).first();
  private readonly settlementAccountDropdown = this.page.getByRole('combobox', { name: /^Settlement Account$|Select Account/i }).first()
                                            .or(this.page.locator('oj-select-one[id*="SettlementAccount" i]')).first();
  private readonly applyForLoansCheckbox = this.page.getByRole('checkbox', { name: /Apply for Loans?/i }).first();
  private readonly settleAvailableBalanceYes = this.page.getByRole('radio', { name: /Yes/i }).first();
  private readonly loanProductDropdown = this.page.getByRole('combobox', { name: /Loan Product/i }).first()
                                            .or(this.page.locator('oj-select-one[id*="LoanProduct" i]')).first();
  private readonly tenorInput        = this.page.getByRole('textbox', { name: /^Tenor$/i }).first()
                                            .or(this.page.locator('input[id*="Tenor" i]')).first();

  // ────────────────────────────────────────────────────────────────────────
  // Forex Deals tab
  // ────────────────────────────────────────────────────────────────────────
  private readonly lookupPrebookedDealLink = this.page.getByRole('link', { name: /Look Up Pre-Booked Forex Deals/i }).first();
  private readonly forexRefInput     = this.page.getByRole('textbox', { name: /Forex Reference Number/i }).first()
                                            .or(this.page.locator('input[id*="ForexReference" i]')).first();
  private readonly forexDealRefInput = this.page.getByRole('textbox', { name: /Deal Reference Number/i }).first()
                                            .or(this.page.locator('input[id*="DealReference" i]')).first();
  private readonly forexExchangeRateInput = this.page.getByRole('textbox', { name: /Exchange Rate/i }).first()
                                            .or(this.page.locator('input[id*="ExchangeRate" i]')).first();
  private readonly forexLinkedAmountInput = this.page.getByRole('textbox', { name: /Linked Amount/i }).first()
                                            .or(this.page.locator('input[id*="LinkedAmount" i]')).first();
  private readonly forexDealSubmitButton = this.page.getByRole('button', { name: /^Submit$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Attachments tab
  // ────────────────────────────────────────────────────────────────────────
  private readonly fileInput         = this.page.locator('input[type="file"]').first();
  private readonly fileUploadButton  = this.page.getByRole('button',
                                              { name: /Drag and Drop|Select or drop files here|Add Files/i }).first();
  private readonly tncCheckbox       = this.page.getByRole('checkbox', { name: /I accept the Terms.*Conditions/i }).first();
  private readonly submitButton      = this.page.getByRole('button', { name: /^Submit$/i }).last();
  private readonly cancelButton      = this.page.getByRole('button', { name: /^Cancel$/i }).first();
  private readonly backButton        = this.page.getByRole('button', { name: /^Back$/i }).first();
  private readonly nextButton        = this.page.getByRole('button', { name: /^Next$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Multiple Bill mode
  // ────────────────────────────────────────────────────────────────────────
  private readonly selectAllBillsCheckbox = this.page.getByRole('checkbox', { name: /Select All Bills/i }).first();
  /** Per-row checkbox in the Multiple-bill list, matched by bill reference. */
  private billRowCheckbox(billRef: string): Locator {
    return this.page.locator('tr, [role="row"]')
                    .filter({ hasText: billRef })
                    .first()
                    .getByRole('checkbox').first();
  }
  private readonly currentAndSavingsAccountTab = this.page.getByRole('tab', { name: /^Current and Savings Account$/i }).first();
  private readonly loanModeTab        = this.page.getByRole('tab', { name: /^Loan$/i }).first();
  private readonly customModeTab      = this.page.getByRole('tab', { name: /^Custom$/i }).first();
  private readonly multiSpecialInstructionsInput = this.page.getByRole('textbox', { name: /Special Instructions/i }).first();
  private readonly totalSettlementAmountLabel = this.page.getByText(/Total Settlement Amount in Local Currency/i).first();

  // ────────────────────────────────────────────────────────────────────────
  // Review screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly reviewBanner   = this.page.getByText(/You initiated a request for.*Bill Settlement/i).first();
  private readonly confirmButton  = this.page.getByRole('button', { name: /^Confirm$/i }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Mode selection
  // ════════════════════════════════════════════════════════════════════════

  async selectSingleBillMode(): Promise<void> {
    if (await this.singleBillModeTab.count() > 0) {
      await this.singleBillModeTab.click();
      await this.wait.shortPause(500);
    }
  }

  async selectMultipleBillMode(): Promise<void> {
    await this.multipleBillModeTab.scrollIntoViewIfNeeded();
    await this.multipleBillModeTab.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Single Bill — Lookup + Verify
  // ════════════════════════════════════════════════════════════════════════

  async lookupBillByReference(billRef: string): Promise<void> {
    const sel = 'oj-select-one[id*="LookupBill" i], oj-combobox-one[id*="LookupBill" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, billRef, billRef);
    } else {
      await this.lookupBillDropdown.click();
      await this.wait.shortPause(400);
      await this.page.locator('li[role="option"], .oj-listbox-result-label')
                     .filter({ hasText: billRef })
                     .first()
                     .click();
    }
    await this.wait.shortPause(400);
  }

  async clickVerify(): Promise<void> {
    await this.verifyButton.scrollIntoViewIfNeeded();
    await this.verifyButton.click();
    await this.wait.shortPause(1500);
  }

  async openAdvancedLookup(): Promise<void> {
    await this.advancedLookupLink.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Settlement Details — fill actions
  // ════════════════════════════════════════════════════════════════════════

  async setAmountToSettle(amount: string): Promise<void> {
    await this.oj.ojFillLocator(this.amountToSettleInput, amount);
  }

  async tickPayWithCollaterals(): Promise<void> {
    await this.payWithCollateralsCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.payWithCollateralsCheckbox.isChecked().catch(() => false))) {
      await this.payWithCollateralsCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async openCollateralDetails(): Promise<void> {
    await this.viewCollateralDetailsLink.click();
    await this.wait.shortPause(600);
  }

  async tickSettlementAccount(): Promise<void> {
    await this.settlementAccountCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.settlementAccountCheckbox.isChecked().catch(() => false))) {
      await this.settlementAccountCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async selectSettlementAccount(accountMask: string): Promise<void> {
    const sel = 'oj-select-one[id*="SettlementAccount" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, accountMask, accountMask);
    } else {
      await this.settlementAccountDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label')
                     .filter({ hasText: accountMask })
                     .first()
                     .click();
    }
    await this.wait.shortPause(400);
  }

  async tickApplyForLoans(): Promise<void> {
    await this.applyForLoansCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.applyForLoansCheckbox.isChecked().catch(() => false))) {
      await this.applyForLoansCheckbox.click();
    }
    await this.wait.shortPause(400);
  }

  async setSettleAvailableBalanceYes(): Promise<void> {
    await this.settleAvailableBalanceYes.scrollIntoViewIfNeeded();
    await this.settleAvailableBalanceYes.click();
    await this.wait.shortPause(300);
  }

  async setLoanProduct(productName: string): Promise<void> {
    const sel = 'oj-select-one[id*="LoanProduct" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, productName, productName);
    } else {
      await this.loanProductDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label')
                     .filter({ hasText: productName })
                     .first()
                     .click();
    }
    await this.wait.shortPause(400);
  }

  async setLoanTenor(tenor: string): Promise<void> {
    await this.oj.ojFillLocator(this.tenorInput, tenor);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Forex Deals — link / fill
  // ════════════════════════════════════════════════════════════════════════

  async openPrebookedForexDealsOverlay(): Promise<void> {
    await this.lookupPrebookedDealLink.click();
    await this.wait.shortPause(800);
  }

  async setForexReferenceNumber(ref: string): Promise<void> {
    await this.oj.ojFillLocator(this.forexRefInput, ref);
  }

  async setForexLinkedAmount(amount: string): Promise<void> {
    await this.oj.ojFillLocator(this.forexLinkedAmountInput, amount);
  }

  async submitForexLink(): Promise<void> {
    await this.forexDealSubmitButton.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Attachments → Submit
  // ════════════════════════════════════════════════════════════════════════

  async attachFile(filePath: string): Promise<void> {
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

  async tickTermsAndConditions(): Promise<void> {
    await this.tncCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.tncCheckbox.isChecked().catch(() => false))) {
      await this.tncCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(800);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.shortPause(2000);
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
  // Multiple Bill mode actions
  // ════════════════════════════════════════════════════════════════════════

  async toggleSelectAllBills(): Promise<void> {
    await this.selectAllBillsCheckbox.scrollIntoViewIfNeeded();
    await this.selectAllBillsCheckbox.click();
    await this.wait.shortPause(400);
  }

  async selectBill(billRef: string): Promise<void> {
    const cb = this.billRowCheckbox(billRef);
    await cb.scrollIntoViewIfNeeded();
    if (!(await cb.isChecked().catch(() => false))) {
      await cb.click();
    }
    await this.wait.shortPause(300);
  }

  async switchMultiMode(mode: 'CASA' | 'Loan' | 'Custom'): Promise<void> {
    const target = mode === 'CASA' ? this.currentAndSavingsAccountTab
                 : mode === 'Loan' ? this.loanModeTab
                 : this.customModeTab;
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await this.wait.shortPause(500);
  }

  async setMultiSpecialInstructions(text: string): Promise<void> {
    await this.multiSpecialInstructionsInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.multiSpecialInstructionsInput.fill(text);
    await this.multiSpecialInstructionsInput.blur();
  }

  async assertTotalSettlementAmountVisible(): Promise<void> {
    await expect(this.totalSettlementAmountLabel).toBeVisible({ timeout: 10000 });
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
    const settled    = this.page.getByText(/Bill Settlement.*successful|Settlement request.*submitted/i).first();
    const duplicate  = this.page.getByText(/Duplicate transaction not permitted/i).first();
    await success.or(settled).or(duplicate).waitFor({ state: 'visible', timeout: 30000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Validation helpers
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

  async assertInsufficientBalanceError(): Promise<void> {
    await this.assertVisibleError(/Insufficient balance/i, /Settlement Amount exceeds/i);
  }
}
