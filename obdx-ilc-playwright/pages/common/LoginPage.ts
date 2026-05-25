import { Page, expect } from '@playwright/test';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Login Page — OBDX 25.1
 * URL: /home.html?ojr=login-form-main
 *
 * Real locators captured from live DOM:
 *   input[type="text"]     → Username field (first)
 *   input[type="password"] → Password field (first)
 *   button "Login"         → Login submit button
 */
export class LoginPage {
  private readonly usernameInput = this.page.locator('input[type="text"]').first();
  private readonly passwordInput = this.page.locator('input[type="password"]').first();
  private readonly loginButton   = this.page.locator('button', { hasText: 'Login' }).first();

  private wait: WaitHelper;

  constructor(private page: Page) {
    this.wait = new WaitHelper(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto('/home.html?ojr=login-form-main');
    await this.usernameInput.waitFor({ state: 'visible', timeout: 30000 });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Resolve as soon as we either leave the login page (success) or a
    // login error becomes visible (invalid credentials). Without the error
    // branch, invalid-credential tests hang here until timeout.
    await this.page.waitForFunction(
      () => {
        if (!window.location.href.includes('login-form-main')) return true;
        const err = document.querySelector(
          '.oj-message-error-text, [class*="error"]'
        ) as HTMLElement | null;
        return !!err && err.offsetParent !== null;
      },
      { timeout: 30000 }
    );
  }

  async assertLoginError(): Promise<void> {
    await expect(
      this.page.locator('.oj-message-error-text, [class*="error"]').first()
    ).toBeVisible({ timeout: 5000 });
  }
}
