import { Page, Locator, expect } from '@playwright/test';
import { WaitHelper } from '@utils/waitHelper';

/**
 * View Outward Bank Guarantee / Stand By LC — Read-Only Page Object (OBDX 25.1)
 * FSD 3.2.75.
 *
 * Every locator here was derived from a live happy-path scrape captured at
 *   data/scraped/view-outward-bg-scraped.json
 * on 2026-05-12. Do NOT add locators that aren't backed by the scrape — if
 * the live DOM doesn't match, re-scrape before extending this file.
 *
 * Scrape-verified structure:
 *   • Listing URL:        ?ojr=outward-guarantee-list;module=guarantee
 *   • Listing heading:    "View Outward Guarantee/Stand By LC"
 *   • Listing columns:    14 (Guarantee Number … Transaction Type)
 *   • Listing filters:    Related Party combobox (placeholder "All Parties"),
 *                         Search Transaction input (aria-label),
 *                         Advanced "filter" widget
 *   • Detail URL:         ?ojr=view-bank-guarantee-details;module=guarantee
 *   • Detail action btns: "Initiate Amendment", "Copy and Initiate", "Back"
 *   • Detail tabs (6):    View Guarantee Details / Amendments /
 *                         Attached Documents / Linkages /
 *                         Charges, Commissions and Taxes / SWIFT Messages
 */
export class ViewOutwardBgFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Listing screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly listingPageHeading = this.page.getByRole('heading', {
                                          name: /View Outward Guarantee\/Stand By LC|Outward Guarantee/i,
                                          level: 1,
                                        })
                                          .or(this.page.getByText(/View Outward Guarantee\/Stand By LC/i))
                                          .first();

  // From scrape: aria-label="Search Transaction" placeholder="Search"
  private readonly searchTransactionInput = this.page.getByRole('textbox', { name: /Search Transaction/i })
                                                .or(this.page.locator('input[aria-label="Search Transaction"]'))
                                                .first();
  // From scrape: oj-input-text id="oj-searchselect-filter-RelatedParty…", placeholder="All Parties"
  private readonly relatedPartyDropdown   = this.page.locator('oj-input-text[id^="oj-searchselect-filter-RelatedParty"]')
                                                .or(this.page.getByPlaceholder(/All Parties/i))
                                                .first();
  // From scrape: oj-input-text id="filter" placeholder="[[nls.filterPlaceHolder]]"
  private readonly advancedFilterDropdown = this.page.locator('oj-input-text#filter')
                                                .or(this.page.locator('input#filter\\|input'))
                                                .first();

  // OBDX listing renders as <oj-table> with role-based rows in some builds
  // and as <table><tbody><tr> in others. Scrape capture happened to land
  // on the role-based variant on UAT 2026-05-12; keep both for portability.
  private readonly tableRows = this.page.locator('oj-table tbody tr, table tbody tr, [role="row"]:not([role="row"]:first-child)');

  /** Click the guarantee-number link in a specific listing row. */
  private guaranteeNumberLink(guaranteeNo: string): Locator {
    return this.page.getByRole('link', { name: guaranteeNo, exact: false }).first();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Detail page — header + action buttons
  // ────────────────────────────────────────────────────────────────────────
  // Detail action buttons captured by scrape (all aria-label-bearing).
  private readonly initiateAmendmentButton = this.page.getByRole('button', { name: /^Initiate Amendment$/i }).first();
  private readonly copyAndInitiateButton   = this.page.getByRole('button', { name: /^Copy and Initiate$/i }).first();
  private readonly backButton              = this.page.getByRole('button', { name: /^Back$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab navigation — scrape captured 6 [role="tab"] elements with text labels
  // matching the FSD layout exactly.
  // ────────────────────────────────────────────────────────────────────────
  private tab(label: string | RegExp): Locator {
    const re = typeof label === 'string' ? new RegExp(label, 'i') : label;
    return this.page.getByRole('tab', { name: re }).first();
  }
  private readonly tabDetails           = this.tab(/View Guarantee Details/i);
  private readonly tabAmendments        = this.tab(/^Amendments$/i);
  private readonly tabAttachedDocuments = this.tab(/Attached Documents/i);
  private readonly tabLinkages          = this.tab(/^Linkages$/i);
  private readonly tabCCT               = this.tab(/Charges,\s*Commissions\s*and\s*Taxes/i);
  private readonly tabSwiftMessages     = this.tab(/SWIFT Messages/i);

  // ────────────────────────────────────────────────────────────────────────
  // Label→value helper for read-only fields on the Details tab.
  // OBDX renders Details as <label>+<following-sibling> blocks (verified by
  // the equivalent ViewImportLcFlowPage POM).
  // ────────────────────────────────────────────────────────────────────────
  private valueOfLabel(label: string): Locator {
    const re = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$`, 'i');
    return this.page
               .locator('label, strong, span')
               .filter({ hasText: re })
               .first()
               .locator('xpath=following-sibling::*[1]');
  }

  /** Locate the first row in a section's table by matching a header label. */
  private tableWithHeader(header: string | RegExp): Locator {
    const re = typeof header === 'string' ? new RegExp(header, 'i') : header;
    return this.page.locator('table, oj-table, [role="grid"]')
                    .filter({ has: this.page.locator('th, [role="columnheader"]').filter({ hasText: re }) })
                    .first();
  }

  private wait: WaitHelper;

  constructor(private page: Page) {
    this.wait = new WaitHelper(page);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Listing actions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnListingPage(): Promise<void> {
    // URL is the primary signal — the heading varies by build patch.
    await this.page.waitForURL(/outward-guarantee-list/i, { timeout: 30_000 });
    await this.listingPageHeading.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /** Type into the listing-wide "Search Transaction" input. */
  async searchTransaction(text: string): Promise<void> {
    await this.searchTransactionInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.searchTransactionInput.fill(text);
    await this.wait.shortPause(800);
  }

  /** Open the Related Party dropdown (placeholder "All Parties" in DOM). */
  async openRelatedPartyDropdown(): Promise<void> {
    await this.relatedPartyDropdown.scrollIntoViewIfNeeded();
    await this.relatedPartyDropdown.click();
    await this.wait.shortPause(500);
  }

  /** Open the advanced "filter" dropdown (top-right of the listing). */
  async openAdvancedFilter(): Promise<void> {
    await this.advancedFilterDropdown.scrollIntoViewIfNeeded();
    await this.advancedFilterDropdown.click();
    await this.wait.shortPause(500);
  }

  async openFirstGuarantee(guaranteeNo: string): Promise<void> {
    const link = this.guaranteeNumberLink(guaranteeNo);
    await link.waitFor({ state: 'visible', timeout: 20_000 });
    await link.click();
    await this.wait.waitForUrlFragment('view-bank-guarantee-details', 30_000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Detail page assertions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnDetailPage(): Promise<void> {
    await this.page.waitForURL(/view-bank-guarantee-details/i, { timeout: 30_000 });
    await this.tabDetails.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async assertActionButtonsPresent(): Promise<void> {
    // Per scrape: Initiate Amendment + Copy and Initiate + Back are all
    // present on the detail header.
    await expect(this.initiateAmendmentButton).toBeVisible({ timeout: 15_000 });
    await expect(this.copyAndInitiateButton).toBeVisible({ timeout: 15_000 });
    await expect(this.backButton).toBeVisible({ timeout: 15_000 });
  }

  async clickInitiateAmendment(): Promise<void> {
    await this.initiateAmendmentButton.click();
    await this.wait.shortPause(1500);
  }

  async clickCopyAndInitiate(): Promise<void> {
    await this.copyAndInitiateButton.click();
    await this.wait.shortPause(1500);
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
    await this.wait.shortPause(1000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab open + assertions
  // ════════════════════════════════════════════════════════════════════════

  async openTabDetails():        Promise<void> { await this.tabDetails.click();           await this.wait.shortPause(800); }
  async openTabAmendments():     Promise<void> { await this.tabAmendments.click();        await this.wait.shortPause(800); }
  async openTabAttached():       Promise<void> { await this.tabAttachedDocuments.click(); await this.wait.shortPause(800); }
  async openTabLinkages():       Promise<void> { await this.tabLinkages.click();          await this.wait.shortPause(800); }
  async openTabCCT():            Promise<void> { await this.tabCCT.click();               await this.wait.shortPause(800); }
  async openTabSwiftMessages():  Promise<void> { await this.tabSwiftMessages.click();     await this.wait.shortPause(800); }

  async assertAllTabsPresent(): Promise<void> {
    for (const tab of [
      this.tabDetails,
      this.tabAmendments,
      this.tabAttachedDocuments,
      this.tabLinkages,
      this.tabCCT,
      this.tabSwiftMessages,
    ]) {
      await expect(tab).toBeVisible({ timeout: 15_000 });
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab content assertions — scrape-derived headers
  // ────────────────────────────────────────────────────────────────────────

  async assertAmendmentsTable(): Promise<void> {
    const tbl = this.tableWithHeader(/Amendment Number/i);
    await expect(tbl).toBeVisible({ timeout: 15_000 });
    // Header words verified by scrape
    for (const hdr of ['Amendment Number', 'Issue Date', 'Expiry Date', 'New Guarantee Amount', 'Status']) {
      await expect(tbl.getByText(new RegExp(hdr, 'i')).first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async assertLinkagesTable(): Promise<void> {
    const tbl = this.tableWithHeader(/Account Number/i);
    await expect(tbl).toBeVisible({ timeout: 15_000 });
    for (const hdr of ['Account Number', 'Contribution Amount for Collateral', 'Contribution Percentage']) {
      await expect(tbl.getByText(new RegExp(hdr, 'i')).first()).toBeVisible({ timeout: 10_000 });
    }
  }

  async assertChargesTable(): Promise<void> {
    const tbl = this.tableWithHeader(/Description of Charges/i);
    await expect(tbl).toBeVisible({ timeout: 15_000 });
  }

  async assertCommissionsTable(): Promise<void> {
    const tbl = this.tableWithHeader(/Description of Commissions/i);
    await expect(tbl).toBeVisible({ timeout: 15_000 });
  }

  async assertSwiftMessagesTable(): Promise<void> {
    const tbl = this.tableWithHeader(/Message ID/i);
    await expect(tbl).toBeVisible({ timeout: 15_000 });
    for (const hdr of ['Sr No.', 'Message ID', 'Direction', 'Date', 'Description']) {
      await expect(tbl.getByText(new RegExp(hdr.replace('.', '\\.'), 'i')).first()).toBeVisible({ timeout: 10_000 });
    }
  }

  /** Assert a Details-tab block label is visible (read-only display). */
  async assertDetailsBlockLabel(label: string | RegExp): Promise<void> {
    const re = typeof label === 'string' ? new RegExp(label, 'i') : label;
    await expect(this.page.getByText(re).first()).toBeVisible({ timeout: 15_000 });
  }

  /** Return the value displayed next to a Details-tab label. */
  async readDetailValue(label: string): Promise<string> {
    return (await this.valueOfLabel(label).textContent({ timeout: 10_000 }))?.trim() || '';
  }
}
