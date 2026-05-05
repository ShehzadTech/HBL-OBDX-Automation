import { Page } from '@playwright/test';
import { WaitHelper } from '../utils/waitHelper';
import { OjHelper } from '../utils/ojHelper';

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
}
