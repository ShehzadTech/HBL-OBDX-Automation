/**
 * Wait helpers for OBDX 25.1 / Oracle JET SPA
 * Avoids hard waits — uses Playwright auto-waiting + condition polling.
 */
import { Page } from '@playwright/test';

export class WaitHelper {
  constructor(private page: Page) {}

  /** Wait for AJAX/fetch spinner to disappear */
  async waitForSpinner(timeout = 30000): Promise<void> {
    try {
      await this.page.locator('.oj-waiting, .oj-loading, [class*="spinner"], [class*="loading"]')
        .first()
        .waitFor({ state: 'hidden', timeout });
    } catch {
      // Spinner may never have appeared — that's fine
    }
  }

  /** Wait for a URL fragment to appear in the current URL */
  async waitForUrlFragment(fragment: string, timeout = 30000): Promise<void> {
    await this.page.waitForFunction(
      (frag) => window.location.href.includes(frag),
      fragment,
      { timeout }
    );
  }

  /** Wait for tab to become the active/selected tab */
  async waitForTabActive(tabLabelText: string, timeout = 15000): Promise<void> {
    await this.page.waitForFunction(
      (label) => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        const tab = tabs.find(t => t.textContent?.trim().includes(label));
        return tab?.getAttribute('aria-selected') === 'true' ||
               tab?.classList.contains('oj-selected');
      },
      tabLabelText,
      { timeout }
    );
  }

  /** Wait for a visible text on the page */
  async waitForText(text: string, timeout = 20000): Promise<void> {
    await this.page.waitForFunction(
      (t) => document.body.innerText.includes(t),
      text,
      { timeout }
    );
  }

  /** Short pause — use only when absolutely necessary (e.g., after OJet animation) */
  async shortPause(ms = 800): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Wait for network to be idle (no pending requests) */
  async waitForNetworkIdle(timeout = 15000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}
