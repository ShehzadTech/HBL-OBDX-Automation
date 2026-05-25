import { Page, Locator, expect } from '@playwright/test';
import { WaitHelper } from '@utils/waitHelper';
import { OjHelper }   from '@utils/ojHelper';

/**
 * View Import Letter of Credit — Read-Only Page Object (OBDX 25.1)
 *
 * Covers the View LC journey end-to-end:
 *   1. View Import LC Listing  (Related-Party filter / LC-Number filter / Apply)
 *   2. Detail header summary    (LC Ref / OBDX Ref / Product / Amount / Expiry / Status)
 *   3. Nine tabs:
 *       LC Details, Attached Documents, Amendments, Bills,
 *       Charges Commissions and Taxes, SWIFT Messages, Banks,
 *       Assignment, Transferred LC
 *
 * Locator strategy (per skills/obdx-25.1-framework.md):
 *   Tier 1 — role + accessible-name first, then aria-label CSS, then label-text
 *            XPath via .or() chains so the locator survives label / element-type
 *            variations between OBDX patches.
 *   Tier 2 — ref_xxx IDs are session-scoped and intentionally NOT used.
 *   The screen is read-only; every input here is readonly/display.
 */
export class ViewImportLcFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Listing screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly listingPageHeading = this.page.getByRole('heading', { name: /View Import Letter Of Credit|Letter Of Credit/i, level: 1 })
                                            .or(this.page.getByText(/Letter Of Credits|List of/i))
                                            .first();
  private readonly relatedPartyCombobox = this.page.getByRole('combobox', { name: /Related Party|Party Name/i }).first();
  private readonly lcNumberFilterInput  = this.page.getByRole('textbox', { name: /^Filter$|LC Number/i }).first();
  private readonly applyFilterLink      = this.page.getByRole('link',   { name: /Apply Filter|^Apply$/i }).first()
                                              .or(this.page.getByRole('button', { name: /Apply Filter|^Apply$/i }).first());
  private readonly noRecordsMessage     = this.page.getByText(/No records to display|No data found|No records found/i).first();

  /** Listing row LC-number link, scoped by accessible name. */
  private lcNumberLink(lcRef: string): Locator {
    return this.page.getByRole('link', { name: lcRef, exact: false }).first();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Header summary bar — read-only textboxes, identified by aria-label.
  // The Tier-1 stable pattern is `input[aria-label="..."]`; for builds where
  // the label is rendered as a sibling instead, the role-based getByLabel
  // fallback (.or chain) kicks in.
  // ────────────────────────────────────────────────────────────────────────
  private readonly headerLcReference   = this.page.locator('input[aria-label="LC Reference No."]')
                                              .or(this.page.getByLabel(/^LC Reference No\.?$/i))
                                              .first();
  private readonly headerObdxReference = this.page.locator('input[aria-label*="Obdx Reference" i], input[aria-label*="OBDX Reference" i]')
                                              .or(this.page.getByLabel(/Obdx Reference Number/i))
                                              .first();
  private readonly headerProduct       = this.page.locator('input[aria-label="Product"]')
                                              .or(this.page.getByLabel(/^Product$/i))
                                              .first();
  private readonly headerLcAmount      = this.page.locator('input[aria-label="LC Amount"]')
                                              .or(this.page.getByLabel(/^LC Amount$/i))
                                              .first();
  private readonly headerDateOfExpiry  = this.page.locator('input[aria-label="Date of Expiry"]')
                                              .or(this.page.getByLabel(/^Date of Expiry$/i))
                                              .first();
  /** Status badge — non-input chip; located by text within the header region. */
  private readonly headerStatusBadge   = this.page.locator('[class*="status"], [class*="badge"]').filter({ hasText: /^(Active|Closed|Cancelled|Expired)$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab navigation — aria-label "Click here for {Tab}" (verified DOM).
  // Match loose substring with regex so single-word variants like "CCT"
  // would still resolve if the build labels them differently.
  // ────────────────────────────────────────────────────────────────────────
  private tab(label: string): Locator {
    return this.page.locator(`[aria-label="Click here for ${label}"]`)
               .or(this.page.getByRole('tab', { name: new RegExp(label, 'i') }))
               .first();
  }
  private readonly tabLcDetails         = this.tab('LC Details');
  private readonly tabAttachedDocuments = this.tab('Attached Documents');
  private readonly tabAmendments        = this.tab('Amendments');
  private readonly tabBills             = this.tab('Bills');
  private readonly tabCCT               = this.page.locator('[aria-label*="Charges, Commissions" i]')
                                              .or(this.page.getByRole('tab', { name: /Charges.*Commissions.*Taxes/i }))
                                              .first();
  private readonly tabSwiftMessages     = this.tab('SWIFT Messages');
  private readonly tabBanks             = this.tab('Banks');
  private readonly tabAssignment        = this.tab('Assignment');
  private readonly tabTransferredLC     = this.tab('Transferred LC');

  private readonly prevTabButton = this.page.getByRole('button', { name: /^Previous$/i }).first();
  private readonly nextTabButton = this.page.getByRole('button', { name: /^Next$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Common action buttons
  // ────────────────────────────────────────────────────────────────────────
  private readonly backButton          = this.page.getByRole('button', { name: /^Back$/i }).first();
  private readonly initiateBillButton  = this.page.getByRole('button', { name: /^Initiate Bill$/i }).first()
                                              .or(this.page.locator('button').filter({ hasText: /^Initiate Bill$/i }).first());
  private readonly viewAvailmentsLink  = this.page.getByRole('link',   { name: /View Availments/i }).first();
  private readonly moreInformationLink = this.page.getByRole('link',   { name: /More Information/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Per-section locators — built lazily where they depend on input data.
  // ────────────────────────────────────────────────────────────────────────

  /** Return the value-cell that sits immediately after a label with the given text. */
  private valueOfLabel(label: string): Locator {
    // Robust label→value pattern that survives both <label>+<div> and
    // <strong>+<div> markup. Matches case-insensitively.
    const re = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$`, 'i');
    return this.page
      .locator('label, strong, span')
      .filter({ hasText: re })
      .first()
      .locator('xpath=following-sibling::*[1]');
  }

  /** Locate a row in a section's table by a unique cell text. */
  private rowByText(text: string): Locator {
    return this.page.locator('tr, [role="row"]').filter({ hasText: text }).first();
  }

  private wait: WaitHelper;
  private oj:   OjHelper;

  constructor(private page: Page) {
    this.wait = new WaitHelper(page);
    this.oj   = new OjHelper(page);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Listing actions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnListingPage(): Promise<void> {
    // URL fragment is the only build-stable signal — the listing heading
    // varies across HBL builds ("View Import Letter Of Credit" /
    // "Letter of Credit" / "View LC List"), and waiting on it has
    // produced false negatives even when the listing has fully rendered.
    await this.page.waitForFunction(
      () => window.location.href.includes('view-import-lc') || window.location.href.includes('view-lc'),
      { timeout: 30000 }
    );
    await this.wait.shortPause(1000);
  }

  /** Filter the listing by LC Number using the column-overlay textbox. */
  async filterByLcNumber(lcRef: string): Promise<void> {
    if (await this.lcNumberFilterInput.count() === 0) return;
    try {
      await this.lcNumberFilterInput.fill(lcRef, { timeout: 5000 });
      if (await this.applyFilterLink.count() > 0) {
        await this.applyFilterLink.click({ timeout: 5000 });
      }
      await this.wait.shortPause(800);
    } catch {
      // Filter unavailable in this build — caller can still click row link.
    }
  }

  /** Open the Related-Party combobox and pick the first available option. */
  async selectFirstRelatedParty(): Promise<void> {
    if (await this.relatedPartyCombobox.count() === 0) return;
    await this.relatedPartyCombobox.click();
    await this.wait.shortPause(400);
    const option = this.page.locator('li[role="option"], .oj-listbox-result-label').first();
    if (await option.count() > 0) {
      await option.click();
      await this.wait.shortPause(400);
    }
  }

  async clickApplyFilter(): Promise<void> {
    if (await this.applyFilterLink.count() > 0) {
      await this.applyFilterLink.click();
      await this.wait.shortPause(800);
    }
  }

  async openLcByNumber(lcRef: string): Promise<void> {
    const link = this.lcNumberLink(lcRef);
    await link.waitFor({ state: 'visible', timeout: 20000 });
    await link.click();
    // Detail screen — URL contains view-lc and at least one tab is visible.
    await this.page.waitForFunction(
      () => window.location.href.includes('view-lc'),
      { timeout: 30000 }
    );
    await this.tabLcDetails.waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(1000);
  }

  async assertNoRecords(): Promise<void> {
    await expect(this.noRecordsMessage).toBeVisible({ timeout: 10000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Header summary bar — read-only assertions
  // ════════════════════════════════════════════════════════════════════════

  async readHeaderLcReference():  Promise<string> { return this.readReadonlyInput(this.headerLcReference); }
  async readHeaderObdxReference(): Promise<string> { return this.readReadonlyInput(this.headerObdxReference); }
  async readHeaderProduct():       Promise<string> { return this.readReadonlyInput(this.headerProduct); }
  async readHeaderLcAmount():      Promise<string> { return this.readReadonlyInput(this.headerLcAmount); }
  async readHeaderDateOfExpiry():  Promise<string> { return this.readReadonlyInput(this.headerDateOfExpiry); }

  /** Read a readonly OJet textbox — inputValue() reflects the bound model. */
  private async readReadonlyInput(loc: Locator): Promise<string> {
    await loc.waitFor({ state: 'attached', timeout: 10000 });
    return (await loc.inputValue().catch(() => '')) ?? '';
  }

  async assertHeaderLcReferenceIsReadonly(): Promise<void> {
    await this.headerLcReference.waitFor({ state: 'attached', timeout: 10000 });
    const readonly = await this.headerLcReference.getAttribute('readonly');
    const ariaReadonly = await this.headerLcReference.getAttribute('aria-readonly');
    expect(readonly !== null || ariaReadonly === 'true').toBeTruthy();
  }

  async assertHeaderStatusBadge(expected: string): Promise<void> {
    // Use a tolerant match — header status may render as <span> or <div>.
    const badge = this.page.getByText(new RegExp(`^${expected}$`, 'i')).first();
    await expect(this.headerStatusBadge.or(badge).first()).toBeVisible({ timeout: 10000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab navigation
  // ════════════════════════════════════════════════════════════════════════

  async clickTabLcDetails():         Promise<void> { await this.activateTab(this.tabLcDetails); }
  async clickTabAttachedDocuments(): Promise<void> { await this.activateTab(this.tabAttachedDocuments); }
  async clickTabAmendments():        Promise<void> { await this.activateTab(this.tabAmendments); }
  async clickTabBills():             Promise<void> { await this.activateTab(this.tabBills); }
  async clickTabCCT():               Promise<void> { await this.activateTab(this.tabCCT); }
  async clickTabSwiftMessages():     Promise<void> { await this.activateTab(this.tabSwiftMessages); }
  async clickTabBanks():             Promise<void> { await this.activateTab(this.tabBanks); }
  async clickTabAssignment():        Promise<void> { await this.activateTab(this.tabAssignment); }
  async clickTabTransferredLC():     Promise<void> { await this.activateTab(this.tabTransferredLC); }

  private async activateTab(tab: Locator): Promise<void> {
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await this.wait.shortPause(700);
  }

  async clickPreviousTab(): Promise<void> {
    if (await this.prevTabButton.count() > 0) {
      await this.prevTabButton.click();
      await this.wait.shortPause(500);
    }
  }
  async clickNextTab(): Promise<void> {
    if (await this.nextTabButton.count() > 0) {
      await this.nextTabButton.click();
      await this.wait.shortPause(500);
    }
  }

  async assertAllTabsVisible(): Promise<void> {
    for (const t of [
      this.tabLcDetails, this.tabAttachedDocuments, this.tabAmendments,
      this.tabBills, this.tabCCT, this.tabSwiftMessages,
      this.tabBanks, this.tabAssignment, this.tabTransferredLC,
    ]) {
      await expect(t).toBeVisible({ timeout: 10000 });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 1 — LC Details
  // ════════════════════════════════════════════════════════════════════════

  async assertApplicantBlock(applicant: string, address2: string): Promise<void> {
    await expect(this.page.getByText(applicant, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(address2,  { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }

  async assert40ABlock(typeOfDocCredit: string, revolvingType: string): Promise<void> {
    await expect(this.page.getByText(typeOfDocCredit, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(revolvingType,   { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }

  async assert31DBlock(placeOfExpiry: string, dateOfExpiry: string): Promise<void> {
    await expect(this.page.getByText(placeOfExpiry, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(dateOfExpiry,  { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }

  async assertBeneficiaryBlock(d: { name: string; addr1: string; city: string; country: string }): Promise<void> {
    for (const v of [d.name, d.addr1, d.city, d.country]) {
      await expect(this.page.getByText(v, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  async clickViewAvailments():  Promise<void> {
    await this.viewAvailmentsLink.scrollIntoViewIfNeeded();
    await this.viewAvailmentsLink.click();
    await this.wait.shortPause(800);
  }
  async clickMoreInformation(): Promise<void> {
    await this.moreInformationLink.scrollIntoViewIfNeeded();
    await this.moreInformationLink.click();
    await this.wait.shortPause(800);
  }

  async assertGoodsAndShipment(d: { partialShipment: string; transshipment: string; placeOfTakingInCharge: string }): Promise<void> {
    for (const v of [d.partialShipment, d.transshipment, d.placeOfTakingInCharge]) {
      await expect(this.page.getByText(v, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  /** Documents table — verify a row exists for the given document keyword. */
  async assertDocumentRow(docKeyword: string, originalText: string): Promise<void> {
    const row = this.rowByText(docKeyword);
    await expect(row).toBeVisible({ timeout: 10000 });
    if (originalText) {
      await expect(row).toContainText(originalText);
    }
  }

  async clickViewClause(docKeyword: string): Promise<void> {
    const row = this.rowByText(docKeyword);
    const link = row.getByRole('link', { name: /^View(\sClause)?$/i }).first();
    await link.click();
    await this.wait.shortPause(700);
  }

  async assertBankChain(d: {
    issuingSwift: string;
    issuingName: string;
    advisingSwift: string;
    confirmationInstructions: string;
    confirmingBankName: string;
  }): Promise<void> {
    for (const v of [d.issuingSwift, d.issuingName, d.advisingSwift, d.confirmationInstructions, d.confirmingBankName]) {
      await expect(this.page.getByText(v, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 2 — Attached Documents
  // ════════════════════════════════════════════════════════════════════════
  async assertAttachedDocsEmpty(expectedMsg: string): Promise<void> {
    await expect(this.page.getByText(expectedMsg, { exact: false }).first())
      .toBeVisible({ timeout: 10000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 3 — Amendments
  // ════════════════════════════════════════════════════════════════════════
  async assertAmendmentRow(num: string, amount: string, status: string): Promise<void> {
    const row = this.page.locator('tr, [role="row"]').filter({ hasText: amount }).filter({ hasText: status }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(num);
  }

  async clickViewAmendment(num: string): Promise<void> {
    const row = this.page.locator('tr, [role="row"]').filter({ has: this.page.locator(`text=${num}`) }).first();
    await row.getByRole('link', { name: /^View$/i }).first().click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 4 — Bills
  // ════════════════════════════════════════════════════════════════════════
  async assertBillsEmpty(expectedMsg: string): Promise<void> {
    await expect(this.page.getByText(expectedMsg, { exact: false }).first())
      .toBeVisible({ timeout: 10000 });
  }

  async assertInitiateBillVisible(): Promise<void> {
    await expect(this.initiateBillButton).toBeVisible({ timeout: 10000 });
  }

  async clickInitiateBill(): Promise<void> {
    await this.initiateBillButton.scrollIntoViewIfNeeded();
    await this.initiateBillButton.click();
    await this.wait.shortPause(1500);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 5 — Charges, Commissions and Taxes
  // ════════════════════════════════════════════════════════════════════════
  async assertChargesRow(description: string, amount: string): Promise<void> {
    const row = this.rowByText(description);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(amount);
  }
  async assertTotalCharges(total: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(`Total\\s*Charges`, 'i')).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(total, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
  async assertTotalCommission(total: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(`Total\\s*Commission`, 'i')).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(total, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
  async assertTotalTaxes(total: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(`Total\\s*Taxes`, 'i')).first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(total, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 6 — SWIFT Messages
  // ════════════════════════════════════════════════════════════════════════
  async assertSwiftRow(messageId: string, type: string): Promise<void> {
    const row = this.rowByText(messageId);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(type);
  }
  async clickSwiftMessage(messageId: string): Promise<void> {
    const link = this.page.getByRole('link', { name: messageId, exact: false }).first();
    await link.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 7 — Banks
  // ════════════════════════════════════════════════════════════════════════
  async assertAdviseThroughBank(d: { swift: string; name: string; addressFragment: string }): Promise<void> {
    for (const v of [d.swift, d.name, d.addressFragment]) {
      await expect(this.page.getByText(v, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 8 — Assignment
  // ════════════════════════════════════════════════════════════════════════
  async assertAssignmentRow(d: { assigneeName: string; accountNumber: string; amount: string }): Promise<void> {
    const row = this.rowByText(d.assigneeName);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(d.accountNumber);
    await expect(row).toContainText(d.amount);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 9 — Transferred LC
  // ════════════════════════════════════════════════════════════════════════
  async assertTransferredLcRow(d: { lcNumber: string; dateOfTransfer: string; dateOfExpiry: string; lcAmount: string }): Promise<void> {
    const row = this.page.locator('tr, [role="row"]').filter({ hasText: d.lcNumber }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(d.lcAmount);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Common actions
  // ════════════════════════════════════════════════════════════════════════
  async clickBack(): Promise<void> {
    await this.backButton.scrollIntoViewIfNeeded();
    await this.backButton.click();
    await this.wait.shortPause(800);
  }

  /**
   * Assert the screen has no editable form inputs — every input is either
   * readonly, disabled, or aria-readonly="true". Loop is bounded to the
   * first 40 visible inputs to keep runtime sane on heavy detail pages.
   */
  async assertScreenIsReadOnly(): Promise<void> {
    const inputs = this.page.locator('input:visible');
    const total  = Math.min(await inputs.count(), 40);
    for (let i = 0; i < total; i++) {
      const el = inputs.nth(i);
      const readonly      = await el.getAttribute('readonly');
      const disabled      = await el.getAttribute('disabled');
      const ariaReadonly  = await el.getAttribute('aria-readonly');
      const ariaDisabled  = await el.getAttribute('aria-disabled');
      const isEditable    = readonly === null && disabled === null
                          && ariaReadonly !== 'true' && ariaDisabled !== 'true';
      // The Filter overlay textbox on listing-side widgets is allowed to be
      // editable — exclude inputs scoped under a filter overlay.
      if (isEditable) {
        const placeholder = await el.getAttribute('placeholder');
        if ((placeholder || '').toLowerCase().includes('filter')) continue;
        const ariaLabel   = (await el.getAttribute('aria-label')) || '';
        if (/filter|search/i.test(ariaLabel)) continue;
        // Anything else editable is a violation of the View-screen contract.
        expect(isEditable, `Editable input found at index ${i}; aria-label="${ariaLabel}"`).toBeFalsy();
      }
    }
  }
}
