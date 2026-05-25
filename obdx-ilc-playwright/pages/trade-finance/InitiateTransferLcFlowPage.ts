import { Page, Locator, expect } from '@playwright/test';
import { OjHelper } from '@utils/ojHelper';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Initiate Transfer Letter of Credit — Page Object (OBDX 25.1)
 * FSD 3.2.64.
 *
 * Six-tab flow:
 *   1. Second Beneficiary Details
 *   2. Goods, Shipment & LC Details
 *   3. Documents and Conditions
 *   4. Instructions
 *   5. (Charges — removed for SG/UAE per C-9.1)
 *   6. Attachments / Submit → Review → Confirm
 *
 * Mirrors the locator strategy of `AmendImportLcFlowPage`:
 *   - role + accessible-name first, attribute fallback chained via `.or()`
 *   - no `ref_xxx` session-scoped IDs
 *   - stable inner-input ID patterns where known (e.g. pipe-suffix)
 */
export class InitiateTransferLcFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Listing screen (Transfer LCs available to transfer)
  // ────────────────────────────────────────────────────────────────────────
  private readonly listingPageHeading = this.page.getByRole('heading', { name: /Transfer Letter of Credit/i, level: 1 })
                                              .or(this.page.getByText(/List of Transferable.*Letter of Credit/i))
                                              .first();
  private readonly lcNumberFilterInput = this.page.getByRole('textbox', { name: /^Filter$|LC Number/i }).first();
  private readonly applyFilterLink     = this.page.getByRole('link', { name: /Apply Filter|^Apply$/i }).first()
                                              .or(this.page.getByRole('button', { name: /Apply Filter|^Apply$/i }).first());

  private lcNumberLink(lcRef: string): Locator {
    return this.page.getByRole('link', { name: lcRef, exact: false }).first();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Multi-step tab navigation (numbered nodes 1..6 in the live UI)
  // ────────────────────────────────────────────────────────────────────────
  private readonly tab1Btn = this.page.getByRole('tab', { name: /Second Beneficiary Details/i }).first();
  private readonly tab2Btn = this.page.getByRole('tab', { name: /Goods.*Shipment.*LC Details/i }).first();
  private readonly tab3Btn = this.page.getByRole('tab', { name: /Documents and Conditions/i }).first();
  private readonly tab4Btn = this.page.getByRole('tab', { name: /^Instructions$/i }).first();
  // Charges tab — removed on SG/UAE. Tab 5 is Attachments on those entities.
  private readonly tab5Btn = this.page.getByRole('tab', { name: /Charges.*Commissions.*Taxes/i }).first();
  private readonly tab6Btn = this.page.getByRole('tab', { name: /^Attachments$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Common Next / Back / Cancel
  // ────────────────────────────────────────────────────────────────────────
  private readonly nextButton    = this.page.getByRole('button', { name: /^Next$/i }).first();
  private readonly backButton    = this.page.getByRole('button', { name: /^Back$/i }).first();
  private readonly cancelButton  = this.page.getByRole('button', { name: /^Cancel$/i }).first();
  private readonly saveAsDraftButton = this.page.getByRole('button', { name: /^Save As Draft$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 1 — Second Beneficiary Details
  // ────────────────────────────────────────────────────────────────────────
  private readonly addSecondBeneficiaryLink = this.page.getByRole('link', { name: /Add Second Beneficiary/i }).first()
                                                .or(this.page.getByRole('button', { name: /Add Second Beneficiary/i }).first());
  private readonly viewParentLcDetailsLink  = this.page.getByRole('link', { name: /View Parent LC Details/i }).first();

  // Add Second Beneficiary overlay
  private readonly beneficiaryExistingRadio = this.page.getByRole('radio', { name: /^Existing$/i }).first()
                                                  .or(this.page.locator('input[type="radio"][value="Existing"]').first());
  private readonly beneficiaryNewRadio      = this.page.getByRole('radio', { name: /^New$/i }).first()
                                                  .or(this.page.locator('input[type="radio"][value="New"]').first());
  private readonly secondBeneficiaryNameDropdown = this.page.getByRole('combobox', { name: /Second Beneficiary Name/i }).first()
                                                  .or(this.page.locator('oj-select-one[id*="SecondBeneficiaryName" i]').first());
  private readonly secondBeneficiaryNameInput   = this.page.getByRole('textbox', { name: /Second Beneficiary Name|Beneficiary Name/i }).first()
                                                  .or(this.page.locator('input[id*="BeneficiaryName"][id$="|input"]').first());
  private readonly addressLine1Input = this.page.getByRole('textbox', { name: /Address Line 1/i }).first()
                                              .or(this.page.locator('input[placeholder="Address 1"], input[id*="AddressLine1"][id$="|input"]').first());
  private readonly addressLine2Input = this.page.getByRole('textbox', { name: /Address Line 2/i }).first()
                                              .or(this.page.locator('input[placeholder="Address 2"], input[id*="AddressLine2"][id$="|input"]').first());
  private readonly addressLine3Input = this.page.getByRole('textbox', { name: /Address Line 3/i }).first()
                                              .or(this.page.locator('input[placeholder="Address 3"], input[id*="AddressLine3"][id$="|input"]').first());
  private readonly beneficiaryCountryDropdown = this.page.getByRole('combobox', { name: /^Country$/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="Country" i]').first());
  private readonly customerReferenceNumberInput = this.page.getByRole('textbox', { name: /Customer Reference Number/i }).first()
                                              .or(this.page.locator('input[id*="CustomerReferenceNumber"][id$="|input"]').first());
  private readonly productDropdown   = this.page.getByRole('combobox', { name: /^Product$|Select Product/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="Product" i]').first());
  private readonly addBeneficiaryButton = this.page.getByRole('button', { name: /^Add$/i }).first();
  private readonly overlayCancelButton  = this.page.getByRole('button', { name: /^Cancel$/i }).last();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 2 — Goods, Shipment & LC Details
  // ────────────────────────────────────────────────────────────────────────
  private readonly substituteDocumentsRadio = this.page.getByRole('radiogroup', { name: /Substitute documents/i });

  private goodsTransferQuantityAt(rowIdx: number): Locator {
    return this.page.locator('input[aria-label*="Transfer Quantity" i], input[id*="TransferQuantity"][id$="|input"]').nth(rowIdx);
  }
  private goodsTransferCostAt(rowIdx: number): Locator {
    return this.page.locator('input[aria-label*="Transfer Cost" i], input[id*="TransferCost"][id$="|input"]').nth(rowIdx);
  }

  private readonly lcTransferAmountInput = this.page.getByRole('textbox', { name: /LC Transfer Amount/i }).first()
                                              .or(this.page.locator('input[id*="LCTransferAmount"][id$="|input"]').first());
  private readonly dateOfExpiryInput   = this.page.getByRole('textbox', { name: /Date of Expiry/i }).first()
                                              .or(this.page.locator('input[id*="DateofExpiry"][id$="|input"]').first());
  private readonly placeOfExpiryInput  = this.page.getByRole('textbox', { name: /Place of Expiry/i }).first()
                                              .or(this.page.locator('input[id*="PlaceofExpiry"][id$="|input"]').first());
  private readonly additionalAmountCoveredInput = this.page.getByRole('textbox', { name: /Additional Amount Covered/i }).first()
                                              .or(this.page.locator('textarea[id*="AdditionalAmountCovered"]').first());
  private readonly shipmentToggle      = this.page.getByRole('radiogroup', { name: /^Shipment$/i });
  private readonly shipmentDateInput   = this.page.getByRole('textbox', { name: /Shipment Date/i }).first()
                                              .or(this.page.locator('input[id*="ShipmentDate"][id$="|input"]').first());
  private readonly shipmentPeriodInput = this.page.getByRole('textbox', { name: /Shipment Period/i }).first()
                                              .or(this.page.locator('textarea[id*="ShipmentPeriod"], input[id*="ShipmentPeriod"]').first());
  private readonly documentsWithinDaysInput = this.page.getByRole('textbox', { name: /Number of Days|Documents to be presented within/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 3 — Documents and Conditions
  // ────────────────────────────────────────────────────────────────────────
  private documentRow(docName: string): Locator {
    return this.page.locator('tr, oj-table-row, [role="row"]')
                    .filter({ hasText: new RegExp(docName, 'i') })
                    .first();
  }
  private readonly addConditionLink   = this.page.getByRole('link', { name: /Add Condition/i }).first();
  private readonly incotermDropdown   = this.page.getByRole('combobox', { name: /Incoterms?/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="Incoterm" i]').first());

  // ────────────────────────────────────────────────────────────────────────
  // Tab 4 — Instructions
  // ────────────────────────────────────────────────────────────────────────
  private readonly advisingBankSwiftRadio    = this.page.getByRole('radio', { name: /^SWIFT Code$/i }).first();
  private readonly advisingBankSwiftInput    = this.page.locator('#adviseBankMode\\|input')
                                                .or(this.page.getByRole('textbox', { name: /Advising Bank SWIFT/i }).first())
                                                .first();
  private readonly advisingVerifyButton      = this.page.getByRole('button', { name: /^Verify$/i }).first();
  private readonly advisingThroughSwiftInput = this.page.locator('#advisingThroughBankMode\\|input')
                                                .or(this.page.getByRole('textbox', { name: /Advising Through Bank.*SWIFT/i }).first())
                                                .first();
  private readonly senderToReceiverInfoInput = this.page.getByRole('textbox', { name: /Sender to Receiver Information/i }).first()
                                                .or(this.page.locator('textarea[id*="SenderToReceiver" i]').first());
  private readonly intermediaryBankInstrInput = this.page.getByRole('textbox', { name: /Instructions to Intermediary Bank|^78D$/i }).first()
                                                .or(this.page.locator('textarea[id*="Intermediary" i]').first());

  // ────────────────────────────────────────────────────────────────────────
  // Tab 6 — Attachments / Submit
  // ────────────────────────────────────────────────────────────────────────
  private readonly fileInput        = this.page.locator('input[type="file"]').first();
  private readonly fileUploadButton = this.page.getByRole('button',
                                              { name: /Drag and Drop|Select or drop files here|Add Files/i }).first();
  private readonly tncCheckbox      = this.page.getByRole('checkbox', { name: /I accept the Terms.*Conditions/i }).first();
  private readonly previewDraftButton = this.page.getByRole('button', { name: /Preview Draft Copy/i }).first();
  private readonly submitButton     = this.page.getByRole('button', { name: /^Submit$/i }).last();

  // ────────────────────────────────────────────────────────────────────────
  // Review screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly reviewBanner   = this.page.getByText(/You initiated a request for LC Transfer Initiation|Initiate Transfer LC/i).first();
  private readonly confirmButton  = this.page.getByRole('button', { name: /^Confirm$/i }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Listing actions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnListingPage(): Promise<void> {
    await this.listingPageHeading.or(this.page.getByText(/Letter of Credit/i)).first()
                                  .waitFor({ state: 'visible', timeout: 30000 });
  }

  async filterListingByLcNumber(lcRef: string): Promise<void> {
    if (await this.lcNumberFilterInput.count() === 0) return;
    try {
      await this.lcNumberFilterInput.fill(lcRef, { timeout: 5000 });
      if (await this.applyFilterLink.count() > 0) {
        await this.applyFilterLink.click({ timeout: 5000 });
      }
      await this.wait.shortPause(800);
    } catch { /* filter unavailable */ }
  }

  async openLcForTransfer(lcRef: string): Promise<void> {
    const link = this.lcNumberLink(lcRef);
    await link.waitFor({ state: 'visible', timeout: 20000 });
    await link.click();
    await this.tab1Btn.or(this.addSecondBeneficiaryLink).first().waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(1200);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab navigation
  // ════════════════════════════════════════════════════════════════════════

  async openTab1(): Promise<void> { if (await this.tab1Btn.count() > 0) { await this.tab1Btn.click(); await this.wait.shortPause(400); } }
  async openTab2(): Promise<void> { if (await this.tab2Btn.count() > 0) { await this.tab2Btn.click(); await this.wait.shortPause(400); } }
  async openTab3(): Promise<void> { if (await this.tab3Btn.count() > 0) { await this.tab3Btn.click(); await this.wait.shortPause(400); } }
  async openTab4(): Promise<void> { if (await this.tab4Btn.count() > 0) { await this.tab4Btn.click(); await this.wait.shortPause(400); } }
  async openTab6(): Promise<void> { if (await this.tab6Btn.count() > 0) { await this.tab6Btn.click(); await this.wait.shortPause(400); } }

  async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(800);
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.wait.shortPause(600);
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
    await this.wait.shortPause(800);
  }

  async clickSaveAsDraft(): Promise<void> {
    await this.saveAsDraftButton.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 1 — Second Beneficiary
  // ════════════════════════════════════════════════════════════════════════

  async openAddSecondBeneficiary(): Promise<void> {
    await this.addSecondBeneficiaryLink.scrollIntoViewIfNeeded();
    await this.addSecondBeneficiaryLink.click();
    await this.wait.shortPause(800);
  }

  async addExistingSecondBeneficiary(d: {
    beneficiaryName: string;
    customerReferenceNumber: string;
    product: string;
  }): Promise<void> {
    if (await this.beneficiaryExistingRadio.count() > 0) {
      await this.beneficiaryExistingRadio.first().evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    // Select beneficiary name
    const selSecond = 'oj-select-one[id*="SecondBeneficiaryName" i], oj-combobox-one[id*="SecondBeneficiaryName" i]';
    if (await this.page.locator(selSecond).count() > 0) {
      await this.oj.ojSelectWithSearch(selSecond, d.beneficiaryName, d.beneficiaryName);
    } else {
      await this.secondBeneficiaryNameDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: d.beneficiaryName }).first().click();
    }
    await this.wait.shortPause(400);
    await this.oj.ojFillLocator(this.customerReferenceNumberInput, d.customerReferenceNumber);
    const selProduct = 'oj-select-one[id*="Product" i]';
    if (await this.page.locator(selProduct).count() > 0) {
      await this.oj.ojSelectWithSearch(selProduct, d.product, d.product);
    } else {
      await this.productDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: d.product }).first().click();
    }
    await this.addBeneficiaryButton.click();
    await this.wait.shortPause(800);
  }

  async addNewSecondBeneficiary(d: {
    name: string;
    address: string;
    country: string;
    customerReferenceNumber: string;
    product: string;
  }): Promise<void> {
    if (await this.beneficiaryNewRadio.count() > 0) {
      await this.beneficiaryNewRadio.first().evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    await this.oj.ojFillLocator(this.secondBeneficiaryNameInput, d.name);
    await this.oj.ojFillLocator(this.addressLine1Input, d.address);
    const selCountry = 'oj-select-one[id*="Country" i]';
    if (await this.page.locator(selCountry).count() > 0) {
      await this.oj.ojSelectWithSearch(selCountry, d.country, d.country);
    } else {
      await this.beneficiaryCountryDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: d.country }).first().click();
    }
    await this.oj.ojFillLocator(this.customerReferenceNumberInput, d.customerReferenceNumber);
    const selProduct = 'oj-select-one[id*="Product" i]';
    if (await this.page.locator(selProduct).count() > 0) {
      await this.oj.ojSelectWithSearch(selProduct, d.product, d.product);
    } else {
      await this.productDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: d.product }).first().click();
    }
    await this.addBeneficiaryButton.click();
    await this.wait.shortPause(800);
  }

  async openViewParentLcDetails(): Promise<void> {
    await this.viewParentLcDetailsLink.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 2 — Goods, Shipment & LC Details
  // ════════════════════════════════════════════════════════════════════════

  async setSubstituteDocuments(value: 'Yes' | 'No'): Promise<void> {
    await this.substituteDocumentsRadio.scrollIntoViewIfNeeded();
    await this.substituteDocumentsRadio.getByText(new RegExp(`^${value}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setTransferGoodsRow(rowIdx: number, d: { quantity: string; costPerUnit: string }): Promise<void> {
    await this.oj.ojFillLocator(this.goodsTransferQuantityAt(rowIdx), d.quantity);
    await this.oj.ojFillLocator(this.goodsTransferCostAt(rowIdx),     d.costPerUnit);
  }

  async setLcTransferAmount(amount: string): Promise<void> {
    await this.oj.ojFillLocator(this.lcTransferAmountInput, amount);
  }

  async setDateOfExpiry(date: string): Promise<void> {
    await this.dateOfExpiryInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.dateOfExpiryInput.fill('');
    await this.dateOfExpiryInput.fill(date);
    await this.dateOfExpiryInput.blur();
    await this.wait.shortPause(300);
  }

  async setPlaceOfExpiry(place: string): Promise<void> {
    await this.oj.ojFillLocator(this.placeOfExpiryInput, place);
  }

  async setAdditionalAmountCovered(text: string): Promise<void> {
    await this.oj.ojFillLocator(this.additionalAmountCoveredInput, text);
  }

  async setShipmentMode(mode: 'Date' | 'Period'): Promise<void> {
    await this.shipmentToggle.scrollIntoViewIfNeeded();
    await this.shipmentToggle.getByText(new RegExp(`^${mode}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setShipmentDate(date: string): Promise<void> {
    await this.shipmentDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.shipmentDateInput.fill('');
    await this.shipmentDateInput.fill(date);
    await this.shipmentDateInput.blur();
  }

  async setShipmentPeriod(text: string): Promise<void> {
    await this.oj.ojFillLocator(this.shipmentPeriodInput, text);
  }

  async setDocumentsWithinDays(days: string): Promise<void> {
    if (await this.documentsWithinDaysInput.count() > 0) {
      await this.oj.ojFillLocator(this.documentsWithinDaysInput, days);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 3 — Documents and Conditions
  // ════════════════════════════════════════════════════════════════════════

  async tickDocumentRow(docName: string): Promise<void> {
    const row = this.documentRow(docName);
    await row.scrollIntoViewIfNeeded();
    const cb = row.getByRole('checkbox').first();
    if (await cb.count() > 0 && !(await cb.isChecked().catch(() => false))) {
      await cb.click();
    }
    await this.wait.shortPause(300);
  }

  async addAdditionalCondition(code: string, identifier: string): Promise<void> {
    await this.addConditionLink.click();
    await this.wait.shortPause(400);
    const codeCombo = this.page.getByRole('combobox', { name: /Condition Code/i }).first();
    const idCombo   = this.page.getByRole('combobox', { name: /Identifier/i }).first();
    await codeCombo.click();
    await this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: code }).first().click();
    await this.wait.shortPause(300);
    await idCombo.click();
    await this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: identifier }).first().click();
    await this.wait.shortPause(300);
  }

  async setIncoterm(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="Incoterm" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.incotermDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 4 — Instructions
  // ════════════════════════════════════════════════════════════════════════

  async setAdvisingBankSwift(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.advisingBankSwiftInput, swift);
    await this.wait.shortPause(300);
  }

  async clickAdvisingVerify(): Promise<void> {
    await this.advisingVerifyButton.click();
    await this.wait.shortPause(1000);
  }

  async setAdvisingThroughBankSwift(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.advisingThroughSwiftInput, swift);
    await this.wait.shortPause(300);
  }

  async setSenderToReceiverInfo(text: string): Promise<void> {
    await this.oj.ojFillLocator(this.senderToReceiverInfoInput, text);
  }

  async setIntermediaryBankInstruction(text: string): Promise<void> {
    if (await this.intermediaryBankInstrInput.count() > 0) {
      await this.oj.ojFillLocator(this.intermediaryBankInstrInput, text);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 6 — Attachments / Submit
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

  async clickPreviewDraft(): Promise<void> {
    await this.previewDraftButton.click();
    await this.wait.shortPause(800);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.shortPause(2000);
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
      await this.confirmButton.evaluate(el => (el as HTMLElement).click());
    }
    await this.wait.shortPause(2500);
  }

  async assertConfirmation(): Promise<void> {
    const success    = this.page.getByText(/Transaction submitted for approval/i).first();
    const transferOk = this.page.getByText(/LC Transfer.*successful|Transfer Initiation.*submitted/i).first();
    const duplicate  = this.page.getByText(/Duplicate transaction not permitted/i).first();
    await success.or(transferOk).or(duplicate).waitFor({ state: 'visible', timeout: 30000 });
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

  async assertTransferQuantityExceedsError(): Promise<void> {
    await this.assertVisibleError(/Transfer Quantity cannot exceed Available Quantity/i,
                                   /exceeds available/i);
  }

  async assertExpiryAfterParentError(): Promise<void> {
    await this.assertVisibleError(/Transfer Expiry cannot exceed parent LC Expiry/i,
                                   /Expiry.*greater than parent/i);
  }
}
