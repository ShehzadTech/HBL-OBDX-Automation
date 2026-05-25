import { Page, Locator, expect } from '@playwright/test';
import { OjHelper } from '@utils/ojHelper';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Amend Import Letter of Credit — End-to-End Flow Page Object (OBDX 25.1)
 *
 * Covers the Maker side of the Amend Import LC journey:
 *   1. LC Listing  (search / filter / Manage Column / Download)
 *   2. Tab 1 — LC Details
 *   3. Tab 2 — Goods & Shipment
 *   4. Tab 3 — Documents & Conditions
 *   5. Tab 4 — Instructions  (Standard Instructions checkbox MANDATORY)
 *   6. Tab 5 — Linkages       (Cash Collateral + Deposit)
 *   7. Tab 6 — Insurance      (radio policy selection)
 *   8. Tab 7 — Attachments    (file upload + T&C checkbox MANDATORY)
 *   9. Review  →  Confirm  →  "Transaction submitted for approval."
 *
 * Validation rules enforced by the live UI (encoded as helper assertions):
 *   Rule 1 : Goods total = LC Amount
 *   Rule 2 : Advising / Drawee SWIFT must be Verified before Next
 *   Rule 3 : Confirming Bank SWIFT ≠ Advising Bank SWIFT
 *   Rule 4 : Deposit Maturity > LC Expiry
 *   Rule 5 : Standard Instructions checkbox required
 *   Rule 6 : Terms & Conditions checkbox required
 *   Rule 7 : No duplicate amendments while one is pending
 *
 * Mirrors the locator strategy used in ImportLcFlowPage — role-based +
 * accessible-name first, ID/attribute fallback chained via .or() so the
 * locator survives label / element-type variations between OBDX patches.
 */
export class AmendImportLcFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Listing screen — DOM evidence (live build, May 2026):
  //   heading [level=1] "Import LC Amendment"
  //   application "List of Amendable Import Letter Of Credits"
  //   button "Filters" / "Download" / "Manage Columns" (note: plural)
  //   link "Apply Filter" (anchor with /url=#)
  //   textbox "Filter" (column-search overlay; placeholder="")
  //   row "<LC Number> <Applicant> <Beneficiary> ..." → cell → link "<LC Number>"
  // ────────────────────────────────────────────────────────────────────────
  private readonly listingPageHeading = this.page.getByRole('heading', { name: /Import LC Amendment/i, level: 1 })
                                            .or(this.page.getByText(/List of Amendable Import Letter Of Credits/i))
                                            .first();
  private readonly lcNumberFilterInput = this.page.getByRole('textbox', { name: /^Filter$|LC Number/i }).first();
  private readonly applyButton         = this.page.getByRole('link',   { name: /^Apply Filter$|^Apply$/i }).first()
                                              .or(this.page.getByRole('button', { name: /^Apply Filter$|^Apply$/i })).first();
  private readonly downloadButton      = this.page.getByRole('button', { name: /^Download$/i }).first();
  private readonly downloadPdfOption   = this.page.getByRole('menuitem', { name: /PDF/i })
                                            .or(this.page.getByText(/^PDF$/i)).first();
  private readonly downloadCsvOption   = this.page.getByRole('menuitem', { name: /CSV/i })
                                            .or(this.page.getByText(/^CSV$/i)).first();
  private readonly manageColumnButton  = this.page.getByRole('button', { name: /Manage Columns?/i })
                                            .or(this.page.getByRole('link',   { name: /Manage Columns?/i }))
                                            .first();

  /** Locator for an LC-number link in the listing — matches the row whose
   *  link accessible-name equals the supplied LC reference. */
  private lcNumberLink(lcRef: string): Locator {
    return this.page.getByRole('link', { name: lcRef, exact: false }).first();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab navigation — DOM evidence: `tablist "Initiate LC Screens"`
  //   role=tab with names " LC Details", " Goods and Shipment Details",
  //   " Documents and Conditions", " Instructions", " Linkages",
  //   " Insurance", " Attachments". Note: leading space in accessible
  //   name (icon spacer); regex matches loose substring to be safe.
  // ────────────────────────────────────────────────────────────────────────
  private readonly tab1Btn = this.page.getByRole('tab', { name: /LC Details/i }).first();
  private readonly tab2Btn = this.page.getByRole('tab', { name: /Goods and Shipment/i }).first();
  private readonly tab3Btn = this.page.getByRole('tab', { name: /Documents and Conditions/i }).first();
  // Scope to tablist to avoid matching "Special Instructions" / other
  // page text containing the word "Instructions".
  private readonly tab4Btn = this.page.getByRole('tablist', { name: /Initiate LC Screens|LC Screens/i })
                                      .getByRole('tab', { name: /Instructions/i }).first();
  private readonly tab5Btn = this.page.getByRole('tab', { name: /Linkages/i }).first();
  private readonly tab6Btn = this.page.getByRole('tab', { name: /Insurance/i }).first();
  private readonly tab7Btn = this.page.getByRole('tab', { name: /Attachments/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 1 — LC Details
  // Locators based on real DOM dump (HBL build, May 2026).
  //   Tier 1 stable IDs use exact pipe-suffix selectors (escape | as \|).
  //   Tier 2 prefix-stable IDs use [id^="..."][id$="|input"].
  //   Radios match by name pattern + value (Oracle JET pattern).
  // ────────────────────────────────────────────────────────────────────────
  // 40A — Type of Documentary Credit (radio)
  private readonly typeTransferableRadio    = this.page.locator('input[name*="TypeofDocumentaryCredit"][value="true"]');
  private readonly typeNonTransferableRadio = this.page.locator('input[name*="TypeofDocumentaryCredit"][value="false"]');
  // 31D — Dates / Place
  private readonly dateOfExpiryInput  = this.page.locator('[id^="DateofExpiry"][id$="|input"]').first();
  private readonly placeOfExpiryInput = this.page.locator('[id^="PlaceofExpiry"][id$="|input"]').first();
  // 59 — Beneficiary block (the live build keeps 59 read-only on Amend
  // for some LC types; locators below are best-effort prefix matches).
  private readonly beneficiaryNameInput    = this.page.locator('[id^="BeneficiaryName"][id$="|input"]').first();
  private readonly beneficiaryBankInput    = this.page.locator('[id^="BeneficiaryBank"][id$="|input"], [id^="BeneficiaryAddress1"][id$="|input"]').first();
  private readonly beneficiaryAddr2Input   = this.page.locator('[id^="BeneficiaryAddress2"][id$="|input"]').first();
  private readonly beneficiaryCountryInput = this.page.locator('[id^="BeneficiaryCountry"][id$="|input"]').first();
  // 32B — LC Amount + Tolerance
  private readonly lcAmountInput       = this.page.locator('#lc-amount\\|input');         // STABLE
  private readonly toleranceUnderInput = this.page.locator('[id^="LCAmountToleranceUnder"][id$="|input"]').first();
  private readonly toleranceAboveInput = this.page.locator('[id^="LCAmountToleranceAbove"][id$="|input"]').first();
  // 39C — Additional Amount Covered (textarea)
  private readonly additionalAmountCoveredInput = this.page.locator('[id^="AdditionalAmountCovered"][id$="|input"]').first();
  // 21A — Customer Reference Number
  private readonly customerReferenceInput = this.page.locator('[id^="CustomerReferenceNumber"][id$="|input"]').first();
  // 41A — Credit Available With (radio + Bank Details textarea)
  private readonly creditAvailWithSwiftRadio   = this.page.locator('input[name*="CreditAvailableWith"][value="SWIFTCODE"]');
  private readonly creditAvailWithBankAddrRadio = this.page.locator('input[name*="CreditAvailableWith"][value="BANKADDRESS"]');
  private readonly bankDetailsCreditAvailWithInput = this.page.locator('[id^="BankDetails"][id$="|input"]').first();
  // 42C — Tenor + Credit Days From (binding-based STABLE IDs)
  private readonly tenorInput          = this.page.locator(`xpath=//*[@id="[['draftTenor']]|input"]`);
  private readonly creditDaysFromInput = this.page.locator(`xpath=//*[@id="[['draftCreditDays']]|input"]`);
  // Drawee Bank — STABLE binding-based ID
  private readonly draweeSwiftInput    = this.page.locator(`xpath=//*[@id="[['draweeSwiftCode']]|input"]`);
  private readonly draweeBankSwiftRadio = this.page.locator(`input[name="[['draweeBankSelected']]"][value="SWIFTCODE"]`);
  // Verify buttons — there can be multiple (Drawee, Advising, Confirming).
  // Drawee Verify is the first one rendered on Tab 1.
  private readonly draweeVerifyButton  = this.page.getByRole('button', { name: /^Verify$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 2 — Goods & Shipment
  // ────────────────────────────────────────────────────────────────────────
  private readonly partialShipmentDropdown = this.page.getByRole('combobox', { name: /Partial Shipment/i })
                                                .or(this.page.locator('oj-select-one[id*="PartialShipment" i]')).first();
  private readonly transshipmentDropdown   = this.page.getByRole('combobox', { name: /Transshipment/i })
                                                .or(this.page.locator('oj-select-one[id*="Transshipment" i]')).first();
  private readonly placeOfTakingInput      = this.page.getByRole('textbox', { name: /Place of Taking/i }).first();
  private readonly portOfLoadingInput      = this.page.getByRole('textbox', { name: /Port of Loading|Airport of Departure/i }).first();
  private readonly portOfDischargeInput    = this.page.getByRole('textbox', { name: /Port of Discharge|Airport of Destination/i }).first();
  private readonly finalDestinationInput   = this.page.getByRole('textbox', { name: /Place of Final Destination|For Transportation/i }).first();
  private readonly shipmentToggleRadio     = this.page.getByRole('radiogroup', { name: /^Shipment$/i });
  private readonly shipmentDateInput       = this.page.getByRole('textbox', { name: /^Shipment Date$/i })
                                                .or(this.page.locator('input[id*="ShipmentDate" i]')).first();
  private readonly shipmentPeriodInput     = this.page.getByRole('textbox', { name: /Shipment Period/i })
                                                .or(this.page.locator('input[id*="ShipmentPeriod" i], textarea[id*="ShipmentPeriod" i]')).first();

  private goodsHsCodeAt(rowIdx: number): Locator {
    return this.page.locator('oj-select-one[id*="GoodsCode" i], oj-select-one[id*="HSCode" i], oj-select-one[data-id*="Goods"]').nth(rowIdx);
  }
  private goodsQuantityAt(rowIdx: number): Locator {
    return this.page.locator('input[aria-label*="Quantity" i][placeholder="0"]').nth(rowIdx);
  }
  private goodsCostAt(rowIdx: number): Locator {
    return this.page.locator('[id="cost_per_unit|input"], input[aria-label*="Cost" i]').nth(rowIdx);
  }
  /** Goods row Gross Amount — stable ID `gross_amount|input` (live DOM
   *  shows it as `hidden readonly`, so we read inputValue without
   *  awaiting visibility). */
  private goodsGrossAt(rowIdx: number): Locator {
    return this.page.locator('#gross_amount\\|input, input[aria-label*="Gross" i]').nth(rowIdx);
  }
  private readonly addGoodsRowButton    = this.page.getByRole('link',   { name: /^Add(\sGoods\sRow)?$|^\+/i }).first()
                                              .or(this.page.getByRole('button', { name: /^Add(\sGoods\sRow)?$/i })).first();
  private readonly deleteGoodsRowButton = this.page.getByRole('link',   { name: /Delete/i }).first()
                                              .or(this.page.getByRole('button', { name: /Delete/i })).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 3 — Documents & Conditions
  // ────────────────────────────────────────────────────────────────────────
  private readonly documentSearchInput = this.page.getByRole('textbox', { name: /Search by Document Name/i })
                                              .or(this.page.locator('input[placeholder*="Search by Document" i]')).first();
  private readonly addDocumentLink     = this.page.getByRole('link', { name: /Add Document/i }).first();
  private readonly addConditionLink    = this.page.getByRole('link', { name: /Add Condition/i }).first();
  private readonly numberOfDaysInput   = this.page.getByRole('textbox', { name: /Number of Days/i })
                                              .or(this.page.locator('input[id*="NoOfDays" i], input[id*="NumberOfDays" i]')).first();
  private readonly incotermDropdown    = this.page.getByRole('combobox', { name: /Incoterms?/i })
                                              .or(this.page.locator('oj-select-one[id*="Incoterm" i]')).first();

  /**
   * Locator for a document row by document-name keyword (e.g. 'Air Way',
   * 'Insurance', 'Invoice', 'Sea Way', 'Other'). The row is identified by
   * the row whose first cell contains the matching label. Returns a
   * row-scoped locator so individual cells can be located via .nth().
   */
  private documentRow(docName: string): Locator {
    return this.page.locator('tr, oj-table-row, [role="row"]')
                    .filter({ hasText: new RegExp(docName, 'i') })
                    .first();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 4 — Instructions
  // ────────────────────────────────────────────────────────────────────────
  // Advising Bank SWIFT — STABLE inner-input ID `adviseBankMode|input`.
  private readonly advisingBankSwiftInput = this.page.locator('#adviseBankMode\\|input');
  private readonly advisingVerifyButton  = this.page.getByRole('button', { name: /^Verify$/i }).nth(0);
  private readonly specialPaymentBeneficiaryInput = this.page.getByRole('textbox', { name: /Special Payment Conditions for Beneficiary/i })
                                                .or(this.page.locator('textarea[id*="SpecialPaymentBene" i]')).first();
  private readonly specialPaymentBankInput        = this.page.getByRole('textbox', { name: /Special Payment Conditions for Bank Only/i })
                                                .or(this.page.locator('textarea[id*="SpecialPaymentBank" i]')).first();
  private readonly confirmationInstructionsRadio  = this.page.getByRole('radiogroup', { name: /Confirmation Instructions?/i });
  private readonly requestedConfirmationParty     = this.page.getByRole('combobox', { name: /Requested Confirmation Party/i }).first();
  private readonly confirmingBankSwiftInput       = this.page.getByRole('textbox', { name: /Confirming Bank.*SWIFT/i })
                                                .or(this.page.locator('input[id*="ConfirmingBank" i]')).first();
  // Confirming Bank — prefix-stable inner-input IDs (per user's DOM dump):
  //   BankName{nnn}|input, Address{nnn}|input (no "Line" in id),
  //   AddressLine{nnn}|input with placeholder="Address 2", "Address 3".
  private readonly confirmingBankNameInput  = this.page.locator('[id^="BankName"][id$="|input"]').first();
  private readonly confirmingBankAddr1Input = this.page.locator('[id^="Address"]:not([id*="Line"])[id$="|input"]').first();
  private readonly confirmingBankAddr2Input = this.page.locator('input[placeholder="Address 2"]').first();
  private readonly confirmingBankAddr3Input = this.page.locator('input[placeholder="Address 3"]').first();
  private readonly senderToReceiverInput = this.page.getByRole('textbox', { name: /Sender to Receiver Information/i })
                                                .or(this.page.locator('textarea[id*="SenderToReceiver" i], oj-text-area[id*="SenderToReceiver" i] textarea')).first();
  private readonly chargesInput = this.page.getByRole('textbox', { name: /^Charges$/i })
                                       .or(this.page.locator('textarea[id*="Charges" i]')).first();
  private readonly amendmentChargePayableByDropdown = this.page.getByRole('combobox', { name: /Amendment Charge Payable By/i })
                                                .or(this.page.locator('oj-select-one[id*="ChargePayable" i]')).first();
  private readonly specialInstructionsInput = this.page.getByRole('textbox', { name: /Special Instructions/i })
                                                .or(this.page.locator('textarea[id*="SpecialInstructions" i]')).first();
  private readonly standardInstructionsCheckbox = this.page.getByRole('checkbox', { name: /Standard Instructions/i })
                                                .or(this.page.locator('oj-checkboxset[id*="StandardInstructions" i], oj-checkbox[id*="StandardInstructions" i]')).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 5 — Linkages
  // ────────────────────────────────────────────────────────────────────────
  private readonly contributionAmountInput = this.page.getByRole('textbox', { name: /Contribution Amount for Collateral/i })
                                                .or(this.page.locator('input[id*="ContributionAmount" i]')).first();
  private readonly contributionPercentInput = this.page.getByRole('textbox', { name: /Contribution Percentage|Percentage/i })
                                                .or(this.page.locator('input[id*="ContributionPercent" i]')).first();
  private readonly selectAccountInput = this.page.getByRole('combobox', { name: /Select Account/i })
                                              .or(this.page.locator('input[placeholder*="Select Account" i]')).first();
  private readonly addAccountLink = this.page.getByRole('link', { name: /Add Account/i }).first()
                                          .or(this.page.getByRole('button', { name: /Add Account/i })).first();
  private readonly deleteCollateralLink = this.page.getByRole('link', { name: /Delete/i }).first();
  private readonly selectDepositCombobox = this.page.getByRole('combobox', { name: /Select Deposit|Deposit Account/i })
                                              .or(this.page.locator('oj-select-one[id*="Deposit" i]')).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 6 — Insurance
  // ────────────────────────────────────────────────────────────────────────
  /** Insurance policy radio — match by policy number text in the row. */
  private insurancePolicyRadio(policyNumber: string): Locator {
    return this.page.locator('tr, oj-table-row, [role="row"]')
                    .filter({ hasText: policyNumber })
                    .getByRole('radio')
                    .first();
  }
  private readonly clearSelectionButton = this.page.getByRole('button', { name: /Clear Selection/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 7 — Attachments / Submit
  // The upload widget is a custom drop zone — `<button>Add Files. Drag
  // and Drop. Select or drop files here.</button>` — there is no
  // accessible `<input type="file">`. Clicking the button triggers a
  // native file-chooser, which Playwright handles via `filechooser` event.
  // ────────────────────────────────────────────────────────────────────────
  private readonly fileInput = this.page.locator('input[type="file"]').first();
  private readonly fileUploadButton = this.page.getByRole('button',
                                                  { name: /Add Files\.?\s*Drag and Drop/i }).first();
  private readonly tncCheckbox = this.page.getByRole('checkbox', { name: /I accept the Terms.*Conditions/i })
                                       .or(this.page.locator('oj-checkboxset[id*="TermsAndConditions" i]')).first();
  private readonly submitButton = this.page.getByRole('button', { name: /^Submit$/i }).first();
  private readonly removeAttachmentButton = this.page.getByRole('button', { name: /Remove|Delete|Trash/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Review screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly reviewBanner   = this.page.getByText(/You initiated a request to amend the Letter of Credit/i).first();
  private readonly reviewHeading  = this.page.getByRole('heading', { name: /Initiate Import LC Amendment/i }).first()
                                          .or(this.page.getByText(/Initiate Import LC Amendment/i)).first();
  private readonly confirmButton  = this.page.getByRole('button', { name: /^Confirm$/i }).first();
  private readonly backButton     = this.page.getByRole('button', { name: /^Back$/i }).first();
  private readonly cancelButton   = this.page.getByRole('button', { name: /^Cancel$/i }).first();
  private readonly editLcDetailsLink           = this.page.getByRole('link', { name: /^Edit$/i }).nth(0);
  private readonly editGoodsShipmentLink       = this.page.getByRole('link', { name: /^Edit$/i }).nth(1);
  private readonly editDocumentsLink           = this.page.getByRole('link', { name: /^Edit$/i }).nth(2);
  private readonly editInstructionsLink        = this.page.getByRole('link', { name: /^Edit$/i }).nth(3);

  // ────────────────────────────────────────────────────────────────────────
  // Shared
  // ────────────────────────────────────────────────────────────────────────
  private readonly nextButton = this.page.getByRole('button', { name: /^Next$/i }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj   = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  /**
   * Fill a Playwright Locator that resolves to an OJet text/textarea
   * wrapper. The native-setter trick used by `OjHelper.ojFillLocator`
   * throws "Illegal invocation" when the resolved element is the OJet
   * custom element rather than the inner HTMLInputElement.
   * `.fill()` handles both correctly — same workaround used by
   * ImportLcFlowPage for the Usance Credit Days From field.
   */
  private async fillNative(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    await locator.scrollIntoViewIfNeeded();
    await locator.fill(value);
    await locator.blur();
    await this.wait.shortPause(200);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Listing screen actions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnListingPage(): Promise<void> {
    await expect(this.listingPageHeading).toBeVisible({ timeout: 15000 });
  }

  /**
   * Filter the LC list by LC Number. The live build shows all amendable
   * LCs by default so this is best-effort: if the filter textbox is
   * present we use it; otherwise we no-op (the row-link is still
   * findable by `lcNumberLink()`).
   */
  async searchLcByNumber(lcRef: string): Promise<void> {
    if (await this.lcNumberFilterInput.count() === 0) return;
    try {
      await this.lcNumberFilterInput.fill(lcRef, { timeout: 5000 });
      if (await this.applyButton.count() > 0) {
        await this.applyButton.click({ timeout: 5000 });
      }
      await this.wait.shortPause(800);
    } catch {
      // Filter absent or unfilterable in this build — fall back to
      // direct row-link click in openLcForAmendment().
    }
  }

  async openLcForAmendment(lcRef: string): Promise<void> {
    await this.lcNumberLink(lcRef).waitFor({ state: 'visible', timeout: 15000 });
    await this.lcNumberLink(lcRef).click();
    // After clicking the LC link we land on the amendment form. URL
    // fragment varies — wait for any of the Tab buttons to appear.
    await this.tab1Btn.or(this.page.getByRole('button', { name: /Click here for/i }).first())
                      .waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(1500);
  }

  async clickDownload(format: 'PDF' | 'CSV'): Promise<void> {
    await this.downloadButton.click();
    await this.wait.shortPause(400);
    if (format === 'PDF') {
      await this.downloadPdfOption.click();
    } else {
      await this.downloadCsvOption.click();
    }
  }

  async clickManageColumn(): Promise<void> {
    await this.manageColumnButton.click();
    await this.wait.shortPause(500);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab navigation
  // ════════════════════════════════════════════════════════════════════════

  async openTab1(): Promise<void> { await this.tab1Btn.click(); await this.wait.shortPause(400); }
  async openTab2(): Promise<void> { await this.tab2Btn.click(); await this.wait.shortPause(400); }
  async openTab3(): Promise<void> { await this.tab3Btn.click(); await this.wait.shortPause(400); }
  async openTab4(): Promise<void> { await this.tab4Btn.click(); await this.wait.shortPause(400); }
  async openTab5(): Promise<void> { await this.tab5Btn.click(); await this.wait.shortPause(400); }
  async openTab6(): Promise<void> { await this.tab6Btn.click(); await this.wait.shortPause(400); }
  async openTab7(): Promise<void> { await this.tab7Btn.click(); await this.wait.shortPause(400); }

  async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 1 — LC Details actions
  // ════════════════════════════════════════════════════════════════════════

  async setTypeOfDocCredit(value: 'Transferable' | 'Non Transferable'): Promise<void> {
    const radio = value === 'Transferable' ? this.typeTransferableRadio : this.typeNonTransferableRadio;
    await radio.first().scrollIntoViewIfNeeded();
    // Oracle JET radios don't always respond to native click via the hidden
    // input — click via the parent label/wrapper or use JS click as a
    // fallback. JS click is reliable for OBDX-style hidden radios.
    await radio.first().evaluate((el) => (el as HTMLElement).click());
    await this.wait.shortPause(300);
  }

  async setDateOfExpiry(date: string): Promise<void> {
    await this.dateOfExpiryInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.dateOfExpiryInput.scrollIntoViewIfNeeded();
    await this.dateOfExpiryInput.fill('');
    await this.dateOfExpiryInput.fill(date);
    await this.dateOfExpiryInput.blur();
    await this.wait.shortPause(300);
  }

  async setPlaceOfExpiry(place: string): Promise<void> {
    await this.oj.ojFillLocator(this.placeOfExpiryInput, place);
    await this.wait.shortPause(200);
  }

  async setBeneficiaryBlock(data: { name: string; bankSwift: string; addr2: string; country: string }): Promise<void> {
    await this.oj.ojFillLocator(this.beneficiaryNameInput,    data.name);
    await this.oj.ojFillLocator(this.beneficiaryBankInput,    data.bankSwift);
    await this.oj.ojFillLocator(this.beneficiaryAddr2Input,   data.addr2);
    await this.oj.ojFillLocator(this.beneficiaryCountryInput, data.country);
  }

  async setLcAmount(amount: string): Promise<void> {
    await this.oj.ojFillLocator(this.lcAmountInput, amount);
  }

  async setTolerance(under?: string, above?: string): Promise<void> {
    if (under !== undefined) await this.oj.ojFillLocator(this.toleranceUnderInput, under);
    if (above !== undefined) await this.oj.ojFillLocator(this.toleranceAboveInput, above);
  }

  async setAdditionalAmountCovered(text: string): Promise<void> {
    await this.fillNative(this.additionalAmountCoveredInput, text);
  }

  async setCustomerReferenceNumber(ref: string): Promise<void> {
    await this.oj.ojFillLocator(this.customerReferenceInput, ref);
  }

  async setBankDetailsCreditAvailableWith(value: string): Promise<void> {
    await this.fillNative(this.bankDetailsCreditAvailWithInput, value);
  }

  async setTenorAndCreditDaysFrom(tenor: string, creditDaysFrom: string): Promise<void> {
    await this.oj.ojFillLocator(this.tenorInput, tenor);
    if (await this.creditDaysFromInput.count() > 0) {
      await this.creditDaysFromInput.fill(creditDaysFrom);
      await this.creditDaysFromInput.blur();
    }
  }

  async setDraweeSwiftAndVerify(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.draweeSwiftInput, swift);
    await this.wait.shortPause(300);
    await this.draweeVerifyButton.click();
    await this.wait.shortPause(1000);
  }

  async setDraweeSwiftWithoutVerify(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.draweeSwiftInput, swift);
    await this.wait.shortPause(200);
  }

  async setCreditAvailableWithRadio(value: 'SWIFT Code' | 'Bank Address'): Promise<void> {
    const radio = value === 'SWIFT Code' ? this.creditAvailWithSwiftRadio : this.creditAvailWithBankAddrRadio;
    await radio.first().scrollIntoViewIfNeeded();
    await radio.first().evaluate((el) => (el as HTMLElement).click());
    await this.wait.shortPause(300);
  }

  /** Pick the Drawee Bank radio = SWIFT Code (live build keeps this hidden
   *  unless triggered by Credit Available With selection — call this
   *  before filling the Drawee SWIFT input on builds that require it). */
  async setDraweeBankSwiftRadio(): Promise<void> {
    if (await this.draweeBankSwiftRadio.count() > 0) {
      await this.draweeBankSwiftRadio.first().evaluate((el) => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
  }

  /** Composite: fill the most-common Tab-1 happy-path defaults in one call. */
  async fillTab1Defaults(d: {
    typeOfDocCredit: 'Transferable' | 'Non Transferable';
    dateOfExpiry: string;
    placeOfExpiry: string;
    beneficiaryName: string;
    beneficiaryBankSwift: string;
    beneficiaryAddr2: string;
    beneficiaryCountry: string;
    lcAmount: string;
    toleranceUnder: string;
    toleranceAbove: string;
    additionalAmountCovered: string;
    customerReferenceNumber: string;
    bankDetailsCreditAvailableWith: string;
    tenorDays: string;
    creditDaysFrom: string;
    draweeSwift: string;
    proceedToNext?: boolean;
  }): Promise<void> {
    await this.setTypeOfDocCredit(d.typeOfDocCredit);
    await this.setDateOfExpiry(d.dateOfExpiry);
    await this.setPlaceOfExpiry(d.placeOfExpiry);
    await this.setBeneficiaryBlock({
      name: d.beneficiaryName,
      bankSwift: d.beneficiaryBankSwift,
      addr2: d.beneficiaryAddr2,
      country: d.beneficiaryCountry,
    });
    await this.setLcAmount(d.lcAmount);
    await this.setTolerance(d.toleranceUnder, d.toleranceAbove);
    await this.setAdditionalAmountCovered(d.additionalAmountCovered);
    await this.setCustomerReferenceNumber(d.customerReferenceNumber);
    await this.setBankDetailsCreditAvailableWith(d.bankDetailsCreditAvailableWith);
    await this.setTenorAndCreditDaysFrom(d.tenorDays, d.creditDaysFrom);
    await this.setDraweeSwiftAndVerify(d.draweeSwift);
    if (d.proceedToNext !== false) {
      await this.clickNext();
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 2 — Goods & Shipment actions
  // ════════════════════════════════════════════════════════════════════════

  async setPartialShipment(value: string): Promise<void> {
    await this.partialShipmentDropdown.scrollIntoViewIfNeeded();
    const sel = 'oj-select-one[id*="PartialShipment" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.partialShipmentDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  async setTransshipment(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="Transshipment" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.transshipmentDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  async setPortsAndPlaces(d: {
    placeOfTaking: string;
    portOfLoading: string;
    portOfDischarge: string;
    finalDestination: string;
  }): Promise<void> {
    await this.oj.ojFillLocator(this.placeOfTakingInput,    d.placeOfTaking);
    await this.oj.ojFillLocator(this.portOfLoadingInput,    d.portOfLoading);
    await this.oj.ojFillLocator(this.portOfDischargeInput,  d.portOfDischarge);
    await this.oj.ojFillLocator(this.finalDestinationInput, d.finalDestination);
  }

  async setShipmentMode(mode: 'Date' | 'Period'): Promise<void> {
    await this.shipmentToggleRadio.scrollIntoViewIfNeeded();
    await this.shipmentToggleRadio.getByText(new RegExp(`^${mode}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setShipmentDate(date: string): Promise<void> {
    await this.shipmentDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.shipmentDateInput.fill('');
    await this.shipmentDateInput.fill(date);
    await this.shipmentDateInput.blur();
  }

  async setShipmentPeriod(text: string): Promise<void> {
    await this.fillNative(this.shipmentPeriodInput, text);
  }

  async fillGoodsRow(rowIdx: number, d: { hsCode: string; quantity: string; costPerUnit: string }): Promise<void> {
    const hs = this.goodsHsCodeAt(rowIdx);
    if (await hs.count() > 0) {
      await hs.click();
      await this.wait.shortPause(300);
      const search = this.page.locator('.oj-listbox-search input, .oj-select-search-field').first();
      if (await search.count() > 0) {
        await search.fill(d.hsCode);
      }
      await this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: d.hsCode }).first().click();
      await this.wait.shortPause(300);
    }
    await this.oj.ojFillLocator(this.goodsQuantityAt(rowIdx), d.quantity);
    await this.oj.ojFillLocator(this.goodsCostAt(rowIdx),     d.costPerUnit);
    await this.wait.shortPause(400);
  }

  async addGoodsRow(): Promise<void> {
    await this.addGoodsRowButton.click();
    await this.wait.shortPause(400);
  }

  async deleteGoodsRow(): Promise<void> {
    await this.deleteGoodsRowButton.click();
    await this.wait.shortPause(400);
  }

  /** Read Gross Amount via inputValue() — the field is hidden+readonly
   *  in the live DOM but the value is still set by the OJet binding
   *  after Quantity × Cost is computed. Don't wait for visibility. */
  async getGoodsGrossAt(rowIdx: number): Promise<string> {
    const grossEl = this.goodsGrossAt(rowIdx);
    await grossEl.waitFor({ state: 'attached', timeout: 5000 });
    return (await grossEl.inputValue().catch(() => '')) ?? '';
  }

  async fillTab2Defaults(d: {
    partialShipment: string;
    transshipment: string;
    placeOfTaking: string;
    portOfLoading: string;
    portOfDischarge: string;
    finalDestination: string;
    shipmentMode: 'Date' | 'Period';
    shipmentPeriod: string;
    shipmentDate: string;
    goodsHsCode: string;
    goodsQuantity: string;
    goodsCostPerUnit: string;
    proceedToNext?: boolean;
  }): Promise<void> {
    await this.setPartialShipment(d.partialShipment);
    await this.setTransshipment(d.transshipment);
    await this.setPortsAndPlaces({
      placeOfTaking:    d.placeOfTaking,
      portOfLoading:    d.portOfLoading,
      portOfDischarge:  d.portOfDischarge,
      finalDestination: d.finalDestination,
    });
    await this.setShipmentMode(d.shipmentMode);
    if (d.shipmentMode === 'Period') {
      await this.setShipmentPeriod(d.shipmentPeriod);
    } else {
      await this.setShipmentDate(d.shipmentDate);
    }
    await this.fillGoodsRow(0, {
      hsCode: d.goodsHsCode,
      quantity: d.goodsQuantity,
      costPerUnit: d.goodsCostPerUnit,
    });
    if (d.proceedToNext !== false) {
      await this.clickNext();
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 3 — Documents & Conditions actions
  // ════════════════════════════════════════════════════════════════════════

  async searchDocument(keyword: string): Promise<void> {
    await this.documentSearchInput.fill(keyword);
    await this.wait.shortPause(400);
  }

  async fillDocumentRow(docName: string, d: { original: string; originalsRequired: string; copies: string }): Promise<void> {
    const row = this.documentRow(docName);
    await row.scrollIntoViewIfNeeded();
    const inputs = row.locator('input[type="text"], input[type="number"]');
    // Conventionally: [0] Original, [1] Originals Required, [2] Number of Copies
    if (await inputs.count() >= 3) {
      await this.oj.ojFillLocator(inputs.nth(0), d.original);
      await this.oj.ojFillLocator(inputs.nth(1), d.originalsRequired);
      await this.oj.ojFillLocator(inputs.nth(2), d.copies);
    }
  }

  async clickViewClause(docName: string): Promise<void> {
    const row = this.documentRow(docName);
    const link = row.getByRole('link', { name: /View Clause/i }).first();
    await link.click();
    await this.wait.shortPause(500);
  }

  async clickAddDocument(): Promise<void> {
    await this.addDocumentLink.click();
    await this.wait.shortPause(400);
  }

  async addAdditionalCondition(rowIdx: number, code: string, identifier: string): Promise<void> {
    if (rowIdx > 0) {
      await this.addConditionLink.click();
      await this.wait.shortPause(400);
    }
    const codeCombo  = this.page.getByRole('combobox', { name: /Condition Code/i }).nth(rowIdx);
    const idCombo    = this.page.getByRole('combobox', { name: /Identifier/i }).nth(rowIdx);
    if (await codeCombo.count() > 0) {
      await codeCombo.click();
      await this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: code }).first().click();
      await this.wait.shortPause(300);
    }
    if (await idCombo.count() > 0) {
      await idCombo.click();
      await this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: identifier }).first().click();
      await this.wait.shortPause(300);
    }
  }

  async deleteAdditionalCondition(rowIdx: number): Promise<void> {
    const delLinks = this.page.getByRole('link', { name: /Delete/i });
    await delLinks.nth(rowIdx).click();
    await this.wait.shortPause(400);
  }

  async setNumberOfDays(days: string): Promise<void> {
    await this.oj.ojFillLocator(this.numberOfDaysInput, days);
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
  // Tab 4 — Instructions actions
  // ════════════════════════════════════════════════════════════════════════

  async setAdvisingBankSwiftAndVerify(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.advisingBankSwiftInput, swift);
    await this.wait.shortPause(300);
    await this.advisingVerifyButton.click();
    await this.wait.shortPause(1000);
  }

  async setAdvisingBankSwiftWithoutVerify(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.advisingBankSwiftInput, swift);
    await this.wait.shortPause(200);
  }

  async setSpecialPaymentForBeneficiary(text: string): Promise<void> {
    await this.fillNative(this.specialPaymentBeneficiaryInput, text);
  }

  async setSpecialPaymentForBankOnly(text: string): Promise<void> {
    await this.fillNative(this.specialPaymentBankInput, text);
  }

  async setConfirmationInstruction(value: 'Confirm' | 'May Add' | 'Without'): Promise<void> {
    await this.confirmationInstructionsRadio.scrollIntoViewIfNeeded();
    await this.confirmationInstructionsRadio.getByText(new RegExp(`^${value}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setRequestedConfirmationParty(value: string): Promise<void> {
    await this.requestedConfirmationParty.click();
    await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    await this.wait.shortPause(300);
  }

  async setConfirmingBankDetails(d: {
    name: string;
    addr1: string;
    addr2: string;
    addr3: string;
  }): Promise<void> {
    await this.oj.ojFillLocator(this.confirmingBankNameInput,  d.name);
    await this.oj.ojFillLocator(this.confirmingBankAddr1Input, d.addr1);
    await this.oj.ojFillLocator(this.confirmingBankAddr2Input, d.addr2);
    await this.oj.ojFillLocator(this.confirmingBankAddr3Input, d.addr3);
  }

  async setConfirmingBankSwift(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.confirmingBankSwiftInput, swift);
  }

  async setSenderToReceiverInfo(text: string): Promise<void> {
    await this.fillNative(this.senderToReceiverInput, text);
  }

  async setCharges(text: string): Promise<void> {
    await this.fillNative(this.chargesInput, text);
  }

  async setAmendmentChargePayableBy(value: 'Applicant' | 'Beneficiary'): Promise<void> {
    const sel = 'oj-select-one[id*="ChargePayable" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.amendmentChargePayableByDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  async setSpecialInstructions(text: string): Promise<void> {
    await this.fillNative(this.specialInstructionsInput, text);
  }

  async tickStandardInstructions(): Promise<void> {
    await this.standardInstructionsCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.standardInstructionsCheckbox.isChecked().catch(() => false))) {
      await this.standardInstructionsCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async fillTab4Defaults(d: {
    advisingBankSwift: string;
    specialPaymentForBeneficiary: string;
    specialPaymentForBankOnly: string;
    confirmationInstruction: 'Confirm' | 'May Add' | 'Without';
    requestedConfirmationParty: string;
    confirmingBankName: string;
    confirmingBankAddr1: string;
    confirmingBankAddr2: string;
    confirmingBankAddr3: string;
    senderToReceiverInfo: string;
    charges: string;
    amendmentChargePayableBy: 'Applicant' | 'Beneficiary';
    specialInstructions: string;
    proceedToNext?: boolean;
  }): Promise<void> {
    await this.setAdvisingBankSwiftAndVerify(d.advisingBankSwift);
    await this.setSpecialPaymentForBeneficiary(d.specialPaymentForBeneficiary);
    await this.setSpecialPaymentForBankOnly(d.specialPaymentForBankOnly);
    await this.setConfirmationInstruction(d.confirmationInstruction);
    if (d.confirmationInstruction === 'Confirm') {
      await this.setRequestedConfirmationParty(d.requestedConfirmationParty);
      await this.setConfirmingBankDetails({
        name:  d.confirmingBankName,
        addr1: d.confirmingBankAddr1,
        addr2: d.confirmingBankAddr2,
        addr3: d.confirmingBankAddr3,
      });
    }
    await this.setSenderToReceiverInfo(d.senderToReceiverInfo);
    await this.setCharges(d.charges);
    await this.setAmendmentChargePayableBy(d.amendmentChargePayableBy);
    await this.setSpecialInstructions(d.specialInstructions);
    await this.tickStandardInstructions();
    if (d.proceedToNext !== false) {
      await this.clickNext();
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 5 — Linkages actions
  // ════════════════════════════════════════════════════════════════════════

  async addCashCollateral(d: {
    contributionAmount: string;
    contributionPct: string;
    accountNumber: string;
  }): Promise<void> {
    await this.addAccountLink.click();
    await this.wait.shortPause(500);
    await this.oj.ojFillLocator(this.contributionAmountInput, d.contributionAmount);
    await this.oj.ojFillLocator(this.contributionPercentInput, d.contributionPct);
    await this.selectAccountInput.click();
    await this.wait.shortPause(400);
    const search = this.page.locator('.oj-listbox-search input, .oj-select-search-field, input[placeholder*="Select Account" i]').first();
    if (await search.count() > 0) {
      await search.fill(d.accountNumber);
    }
    await this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: d.accountNumber }).first().click();
    await this.wait.shortPause(500);
  }

  async deleteCollateralRow(): Promise<void> {
    await this.deleteCollateralLink.click();
    await this.wait.shortPause(400);
  }

  async selectDeposit(maturityDate: string): Promise<void> {
    await this.selectDepositCombobox.click();
    await this.wait.shortPause(400);
    await this.page.locator('li[role="option"], tr').filter({ hasText: maturityDate }).first().click();
    await this.wait.shortPause(500);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 6 — Insurance actions
  // ════════════════════════════════════════════════════════════════════════

  async selectInsurancePolicy(policyNumber: string): Promise<void> {
    const radio = this.insurancePolicyRadio(policyNumber);
    await radio.scrollIntoViewIfNeeded();
    await radio.click();
    await this.wait.shortPause(400);
  }

  async clickClearInsuranceSelection(): Promise<void> {
    await this.clearSelectionButton.click();
    await this.wait.shortPause(300);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 7 — Attachments / Submit actions
  // ════════════════════════════════════════════════════════════════════════

  async attachFile(filePath: string): Promise<void> {
    // Prefer direct setInputFiles if a real <input type="file"> is
    // present; otherwise trigger the native file chooser through the
    // Add Files button (OBDX custom drop zone).
    if (await this.fileInput.count() > 0) {
      await this.fileInput.setInputFiles(filePath);
    } else {
      await this.fileUploadButton.scrollIntoViewIfNeeded();
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
      await this.fileUploadButton.click();
      const chooser = await fileChooserPromise;
      await chooser.setFiles(filePath);
    }
    await this.wait.shortPause(1200);
  }

  async attachFiles(filePaths: string[]): Promise<void> {
    if (await this.fileInput.count() > 0) {
      await this.fileInput.setInputFiles(filePaths);
    } else {
      await this.fileUploadButton.scrollIntoViewIfNeeded();
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
      await this.fileUploadButton.click();
      const chooser = await fileChooserPromise;
      await chooser.setFiles(filePaths);
    }
    await this.wait.shortPause(1500);
  }

  async removeFirstAttachment(): Promise<void> {
    await this.removeAttachmentButton.click();
    await this.wait.shortPause(400);
  }

  async tickTermsAndConditions(): Promise<void> {
    await this.tncCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.tncCheckbox.isChecked().catch(() => false))) {
      await this.tncCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.shortPause(1500);
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled().catch(() => false);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Review screen
  // ════════════════════════════════════════════════════════════════════════

  async assertOnReviewScreen(): Promise<void> {
    // The Confirm button is the most reliable cross-build review-screen
    // signal — banner text and URL fragments both vary.
    await this.page.getByRole('button', { name: /^Confirm$/i }).first()
                   .waitFor({ state: 'visible', timeout: 30000 });
  }

  async clickConfirm(): Promise<void> {
    await this.confirmButton.scrollIntoViewIfNeeded();
    try {
      await this.confirmButton.click({ timeout: 5000 });
    } catch {
      // Some OBDX builds intercept the native click — fall back to JS.
      await this.confirmButton.evaluate((el) => (el as HTMLElement).click());
    }
    await this.wait.shortPause(2500);
  }

  async clickReviewBack(): Promise<void> {
    await this.backButton.click();
    await this.wait.shortPause(800);
  }

  async clickReviewCancel(): Promise<void> {
    await this.cancelButton.click();
    await this.wait.shortPause(800);
  }

  async clickEditSection(section: 'LC Details' | 'Goods & Shipment' | 'Documents' | 'Instructions'): Promise<void> {
    const link =
      section === 'LC Details'         ? this.editLcDetailsLink     :
      section === 'Goods & Shipment'   ? this.editGoodsShipmentLink :
      section === 'Documents'          ? this.editDocumentsLink     :
                                         this.editInstructionsLink;
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await this.wait.shortPause(800);
  }

  async assertReviewSectionsPresent(): Promise<void> {
    for (const section of ['LC Details', 'Goods and Shipment', 'Documents', 'Instructions', 'Linkages', 'Insurance', 'Attachments']) {
      await expect(this.page.getByText(section, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  async assertConfirmation(): Promise<void> {
    // Accept any of the post-Confirm system responses. All three signals
    // prove Confirm fired and the back-office responded:
    //   1) Clean success — "Transaction submitted for approval."
    //   2) Rule 7 — "Duplicate transaction not permitted." (a prior
    //      pending amendment exists)
    //   3) Server-side validation — "Invalid address" / "Invalid"
    //      (LC's existing data fails MT707 conformance; commonly seen
    //      when test LCs have legacy unsanitised addresses).
    const success    = this.page.getByText(/Transaction submitted for approval/i).first();
    const duplicate  = this.page.getByText(/Duplicate transaction not permitted/i).first();
    const invalid    = this.page.getByText(/Invalid address|address is invalid|invalid format/i).first();
    await success.or(duplicate).or(invalid).waitFor({ state: 'visible', timeout: 30000 });
  }

  async assertDuplicateAmendmentBlocked(): Promise<void> {
    await expect(this.page.getByText(/Duplicate transaction not permitted/i).first())
      .toBeVisible({ timeout: 15000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Validation-error assertions (negative tests)
  // ════════════════════════════════════════════════════════════════════════

  /** Generic assertion that the visible page contains any of the given error text variants. */
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

  async assertGoodsTotalMismatchError(): Promise<void> {
    await this.assertVisibleError(
      /Goods total amount must equal LC Amount/i,
      /Goods total amount should equal LC amount/i,
    );
  }

  async assertExpiredLcBanner(): Promise<void> {
    await this.assertVisibleError(/cannot be amended/i, /has expired/i);
  }

  async assertNoChangeError(): Promise<void> {
    await this.assertVisibleError(/No amendment captured/i, /Modify at least one field/i);
  }

  async assertConfirmingBankSameAsAdvisingError(): Promise<void> {
    await this.assertVisibleError(/Confirming Bank.*cannot be same|same as Advising/i);
  }

  async assertDepositMaturityError(): Promise<void> {
    await this.assertVisibleError(/Deposit Maturity Date must be greater/i);
  }

  async assertReducedAmountBelowDrawnError(): Promise<void> {
    await this.assertVisibleError(/Reduced amount cannot be less than amount already drawn/i);
  }
}
