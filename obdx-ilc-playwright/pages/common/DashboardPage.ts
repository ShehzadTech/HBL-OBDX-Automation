import { Page } from '@playwright/test';
import { WaitHelper } from '@utils/waitHelper';
import { OjHelper } from '@utils/ojHelper';

/**
 * Dashboard / Home Page — OBDX 25.1
 * URL: /home.html?ojr=home
 *
 * Responsibilities:
 *  - Dismiss the screen-size warning dialog that appears after first login
 *  - Dismiss "System cannot process" toast notifications
 *  - Open the hamburger side-menu
 *  - Navigate to: Trade Finance → Letter Of Credit → Import Letter of Credit → Initiate Import LC
 *
 * Real locators from live DOM:
 *   button "Open Menu" (aria-label)      → Hamburger menu (oj-button)
 *   menuitem "Trade Finance"             → Trade Finance menu item
 *   menuitem "Letter Of Credit"          → Sub-menu item
 *   menuitem "Import Letter of Credit"   → Sub-menu item
 *   menuitem "Initiate Import LC"        → Final nav item
 */
export class DashboardPage {
  private readonly hamburgerMenu     = this.page.getByRole('button', { name: 'Open Menu' });
  private readonly tradeFinanceMenu  = this.page.locator('[role="menuitem"]').filter({ hasText: 'Trade Finance' }).first();
  private readonly letterOfCredit    = this.page.locator('[role="menuitem"]').filter({ hasText: 'Letter Of Credit' }).first();
  private readonly importLC          = this.page.locator('[role="menuitem"]').filter({ hasText: 'Import Letter of Credit' }).first();
  private readonly initiateImportLC  = this.page.locator('[role="menuitem"]').filter({ hasText: 'Initiate Import LC' }).first();
  // Menu labels in the live HBL build vary — "Amend Letter of Credit",
  // "Amend Import LC", "Amend Import Letter of Credit". Match any menu
  // item containing "Amend" once the Import-LC submenu is open. Same
  // approach for View — just match "View".
  private readonly amendImportLC     = this.page.locator('[role="menuitem"]').filter({ hasText: /amend/i }).first();
  // Live OBDX renders the menu item with a leading icon-spacer character,
  // so a `^view` anchor fails. A bare `/view/i` also fails: it greedily
  // matches the hidden "Overview" sidebar entry first. Require the word
  // "view" followed by "import" or "letter" (the actual Import-LC submenu
  // labels: "View Import LC", "View Letter of Credit").
  private readonly viewImportLC      = this.page.locator('[role="menuitem"]')
                                            .filter({ hasText: /\bview\s+(import|letter)/i })
                                            .first();
  // ── Cancel / Settlement / Outward BG / Transfer LC menu items
  // Same word-boundary + keyword approach as viewImportLC to avoid
  // false matches from "Overview" or other ambient menu entries.
  private readonly cancelImportLC     = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /\bcancel\s+(letter|import|lc)/i })
                                              .first();
  private readonly settlementImportBills = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /settlement\s+of\s+bills?/i })
                                              .first();
  private readonly initiateTransferLC = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /\binitiate\s+transfer\s+lc/i })
                                              .first();
  private readonly exportLetterOfCredit = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /Export\s+Letter\s+Of\s+Credit/i })
                                              .first();
  private readonly bankGuarantee     = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /^[\s ]*Bank\s+Guarantee/i })
                                              .first();
  private readonly outwardBankGuarantee = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /Outward\s+Bank\s+Guarantee/i })
                                              .first();
  // The live HBL menu reads "Initiate Outward Guarantee/Stand By LC"
  // (not "Initiate Bank Guarantee"). Match by "Initiate Outward Guarantee".
  private readonly initiateOutwardGuarantee = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /Initiate\s+Outward\s+Guarantee/i })
                                              .first();
  // Scraped from live menu: text="View Outward Guarantee/Stand By LC".
  // Anchor on "View Outward Guarantee" to avoid clashing with
  // "View Outward Claim" further down the same submenu.
  private readonly viewOutwardGuarantee = this.page.locator('[role="menuitem"]')
                                              .filter({ hasText: /View\s+Outward\s+Guarantee/i })
                                              .first();

  private wait: WaitHelper;
  private oj: OjHelper;

  constructor(private page: Page) {
    this.wait = new WaitHelper(page);
    this.oj   = new OjHelper(page);
  }

  /** Dismiss the screen-size warning dialog if it appears */
  async dismissScreenSizeWarning(): Promise<void> {
    try {
      const closeBtn = this.page.locator('.oj-dialog-header-close-wrapper, button[title="Close"]').first();
      await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
      await closeBtn.click();
    } catch {
      // Dialog did not appear — OK
    }
  }

  /** Dismiss all visible toast notifications */
  async dismissAllToasts(): Promise<void> {
    await this.oj.dismissToasts();
    await this.wait.shortPause(500);
  }

  /** Wait for the dashboard to be fully loaded */
  async waitForDashboard(): Promise<void> {
    await this.page.waitForFunction(
      () => window.location.href.includes('home') && !window.location.href.includes('login'),
      { timeout: 30000 }
    );
    await this.wait.shortPause(1500);
    await this.dismissScreenSizeWarning();
    await this.dismissAllToasts();
  }

  /** Open hamburger menu and navigate to Initiate Import LC */
  async navigateToInitiateImportLC(): Promise<void> {
    // Open the side menu
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    // Trade Finance
    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    // Letter Of Credit
    await this.letterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.letterOfCredit.click();
    await this.wait.shortPause(600);

    // Import Letter of Credit
    await this.importLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.importLC.click();
    await this.wait.shortPause(600);

    // Initiate Import LC
    await this.initiateImportLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.initiateImportLC.click();

    // Wait for LC nav/listing page
    await this.wait.waitForUrlFragment('lc-nav-bar', 30000);
  }

  /**
   * Open hamburger menu and navigate to:
   *   Trade Finance → Letter Of Credit → Import LC → Amend Import LC.
   * Lands on the Amend Import LC listing screen
   * (URL contains `ojr=amend-lc;module=letter-of-credit`).
   */
  async navigateToAmendImportLC(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.letterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.letterOfCredit.click();
    await this.wait.shortPause(600);

    await this.importLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.importLC.click();
    await this.wait.shortPause(600);

    await this.amendImportLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.amendImportLC.click();

    // The Amend listing landing page heading is "Import LC Amendment"
    // (shown in level=1 heading). URL fragment varies by build, so we
    // pin to the heading instead of `waitForUrlFragment`.
    await this.page.getByRole('heading', { name: /Import LC Amendment/i, level: 1 })
                   .or(this.page.getByText(/List of Amendable Import Letter Of Credits/i))
                   .first()
                   .waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(1000);
  }

  /**
   * Open hamburger menu and navigate to View Import LC.
   * Used by alt-nav tests (View LC → Amendments → Initiate Amendment link).
   */
  async navigateToViewImportLC(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.letterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.letterOfCredit.click();
    await this.wait.shortPause(600);

    await this.importLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.importLC.click();
    await this.wait.shortPause(600);

    await this.viewImportLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.viewImportLC.click();

    await this.wait.waitForUrlFragment('view', 30000);
    await this.wait.shortPause(1000);
  }

  /**
   * Open hamburger menu and navigate to:
   *   Trade Finance → Letter Of Credit → Import LC → Cancel Letter of Credit.
   * Used by the C-9.13 Cancel LC flow.
   */
  async navigateToCancelLetterOfCredit(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.letterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.letterOfCredit.click();
    await this.wait.shortPause(600);

    await this.importLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.importLC.click();
    await this.wait.shortPause(600);

    await this.cancelImportLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.cancelImportLC.click();

    // Cancel LC lands on its own screen with the LC Reference lookup
    // selector — no consistent URL fragment across builds, so pin to the
    // heading instead.
    await this.page.getByRole('heading', { name: /Cancel Letter Of Credit/i, level: 1 })
                   .or(this.page.getByText(/Lookup\s+LC\s+Reference\s+No/i))
                   .first()
                   .waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(800);
  }

  /**
   * Open hamburger menu and navigate to:
   *   Trade Finance → Letter Of Credit → Import LC → Settlement of Bills.
   */
  async navigateToSettlementOfImportBills(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.letterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.letterOfCredit.click();
    await this.wait.shortPause(600);

    await this.importLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.importLC.click();
    await this.wait.shortPause(600);

    await this.settlementImportBills.waitFor({ state: 'visible', timeout: 10000 });
    await this.settlementImportBills.click();

    await this.page.getByRole('heading', { name: /Bill Settlement/i, level: 1 })
                   .or(this.page.getByText(/Mode of Settlement/i))
                   .first()
                   .waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(800);
  }

  /**
   * Open hamburger menu and navigate to:
   *   Trade Finance → Letter Of Credit → Export Letter of Credit → Initiate Transfer LC.
   */
  async navigateToInitiateTransferLC(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.letterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.letterOfCredit.click();
    await this.wait.shortPause(600);

    await this.exportLetterOfCredit.waitFor({ state: 'visible', timeout: 10000 });
    await this.exportLetterOfCredit.click();
    await this.wait.shortPause(600);

    await this.initiateTransferLC.waitFor({ state: 'visible', timeout: 10000 });
    await this.initiateTransferLC.click();

    await this.page.getByRole('heading', { name: /Transfer Letter of Credit|Initiate Transfer LC/i, level: 1 })
                   .or(this.page.getByText(/List of Transferable.*Letter of Credit/i))
                   .first()
                   .waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(800);
  }

  /**
   * Open hamburger menu and navigate to:
   *   Trade Finance → Bank Guarantee → Outward Bank Guarantee → Initiate Bank Guarantee.
   */
  async navigateToInitiateOutwardBG(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.bankGuarantee.waitFor({ state: 'visible', timeout: 10000 });
    await this.bankGuarantee.click();
    await this.wait.shortPause(600);

    await this.outwardBankGuarantee.waitFor({ state: 'visible', timeout: 10000 });
    await this.outwardBankGuarantee.click();
    await this.wait.shortPause(600);

    await this.initiateOutwardGuarantee.waitFor({ state: 'visible', timeout: 10000 });
    await this.initiateOutwardGuarantee.click();

    await this.page.getByRole('heading', { name: /Initiate Outward Guarantee|Outward Bank Guarantee/i, level: 1 })
                   .or(this.page.getByRole('button', { name: /Initiate Outward Guarantee/i }))
                   .first()
                   .waitFor({ state: 'visible', timeout: 30000 });
    await this.wait.shortPause(800);
  }

  /**
   * Open hamburger menu and navigate to:
   *   Trade Finance → Bank Guarantee/Stand By LC → Outward Bank Guarantee/Stand By LC → View Outward Guarantee/Stand By LC.
   *
   * Sequence verified by scrape on 2026-05-12. Landing URL contains
   * "outward-guarantee-list" and the page heading is
   * "View Outward Guarantee/Stand By LC".
   */
  async navigateToViewOutwardBG(): Promise<void> {
    await this.hamburgerMenu.click();
    await this.wait.shortPause(800);

    await this.tradeFinanceMenu.waitFor({ state: 'visible', timeout: 15000 });
    await this.tradeFinanceMenu.click();
    await this.wait.shortPause(600);

    await this.bankGuarantee.waitFor({ state: 'visible', timeout: 10000 });
    await this.bankGuarantee.click();
    await this.wait.shortPause(600);

    await this.outwardBankGuarantee.waitFor({ state: 'visible', timeout: 10000 });
    await this.outwardBankGuarantee.click();
    await this.wait.shortPause(600);

    await this.viewOutwardGuarantee.waitFor({ state: 'visible', timeout: 10000 });
    await this.viewOutwardGuarantee.click();

    await this.wait.waitForUrlFragment('outward-guarantee-list', 30000);
    await this.wait.shortPause(800);
  }
}
