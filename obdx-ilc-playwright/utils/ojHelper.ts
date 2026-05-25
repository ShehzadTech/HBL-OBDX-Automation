/**
 * Oracle JET (OJet) component helpers for OBDX 25.1
 *
 * OJet web components use custom elements (oj-input-text, oj-select-one, etc.)
 * Standard Playwright fill() does NOT trigger OJet reactive bindings.
 * These helpers use native HTMLInputElement value setter + event dispatch.
 */
import { Page, Locator } from '@playwright/test';

export class OjHelper {
  constructor(private page: Page) {}

  /**
   * Locator-based variant of ojFill. Use when there is no stable CSS selector
   * (e.g. table-row inputs) and we have to target by role/accessible name.
   * Same focus → native-setter → blur cycle as ojFill so OJet commits.
   */
  async ojFillLocator(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 15000 });
    await locator.scrollIntoViewIfNeeded();
    await locator.focus();
    await locator.evaluate((input, val) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement;
      // Pick the right prototype based on the actual tag — calling the
      // HTMLInputElement setter on a <textarea> throws "Illegal invocation".
      const proto = el.tagName.toLowerCase() === 'textarea'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
      setter.call(el, val);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    }, value);
    await locator.blur();
  }

  /**
   * Set a text value in an OJet input using native value setter.
   * OJet commits its bound value on blur, so we must focus → write → blur,
   * otherwise the component's internal value stays empty and validation
   * reports "Enter a value" even though the DOM input shows text.
   */
  async ojFill(selector: string, value: string): Promise<void> {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.scrollIntoViewIfNeeded();
    await el.focus();
    await this.page.evaluate(
      ([sel, val]) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        if (!input) throw new Error(`ojFill: element not found: ${sel}`);
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        )!.set!;
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      },
      [selector, value] as [string, string]
    );
    await el.blur();
  }

  /**
   * Select an OJet dropdown option by visible text.
   * Clicks the dropdown trigger, waits for the list, then clicks the option.
   */
  async ojSelectByText(dropdownSelector: string, optionText: string): Promise<void> {
    const trigger = this.page.locator(`${dropdownSelector} .oj-select-arrow, ${dropdownSelector} .oj-combobox-arrow, ${dropdownSelector} a[role="button"]`).first();
    await trigger.waitFor({ state: 'visible', timeout: 15000 });
    await trigger.click();
    const option = this.page.locator(`.oj-listbox-result-label, .oj-select-choice, li[role="option"]`).filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  /**
   * Select OJet dropdown using the internal input + option search.
   * For dropdowns that show a floating search overlay.
   */
  async ojSelectWithSearch(dropdownSelector: string, searchText: string, optionText: string): Promise<void> {
    // Click the dropdown arrow/trigger
    const container = this.page.locator(dropdownSelector).first();
    await container.waitFor({ state: 'visible', timeout: 15000 });
    await container.scrollIntoViewIfNeeded();
    const arrow = container.locator('.oj-select-arrow, a[role="button"], .oj-combobox-arrow').first();
    await arrow.click();
    // Type in the search box that appears
    const searchInput = this.page.locator('.oj-listbox-search input, .oj-select-search-field').first();
    await searchInput.waitFor({ state: 'visible', timeout: 8000 });
    await searchInput.fill(searchText);
    // Click the matching option
    const option = this.page.locator('.oj-listbox-result-label, li[role="option"]').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  /**
   * Fill an OJet date field.
   * Clears existing value first, then uses native setter.
   * Focus → write → blur so OJet's date component commits its bound value
   * (without blur the component reports "Enter a value" on validation).
   */
  async ojFillDate(selector: string, dateValue: string): Promise<void> {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.scrollIntoViewIfNeeded();
    await el.focus();
    await this.page.evaluate(
      ([sel, val]) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        if (!input) throw new Error(`ojFillDate: element not found: ${sel}`);
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        )!.set!;
        nativeSetter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      },
      [selector, dateValue] as [string, string]
    );
    await el.blur();
  }

  /**
   * Check an OJet checkbox by setting its checked property.
   */
  async ojCheckCheckbox(checkboxSelector: string): Promise<void> {
    await this.page.evaluate((sel) => {
      const cb = document.querySelector(sel) as HTMLInputElement;
      if (!cb) throw new Error(`ojCheckCheckbox: not found: ${sel}`);
      if (!cb.checked) {
        cb.click();
      }
    }, checkboxSelector);
  }

  /**
   * Dismiss any visible toast/notification by clicking its close button.
   */
  async dismissToasts(): Promise<void> {
    try {
      const closeButtons = this.page.locator('.oj-messages-close, button[title="Close"], .oj-button-icon.oj-component-icon.oj-close-icon');
      const count = await closeButtons.count();
      for (let i = 0; i < count; i++) {
        try { await closeButtons.nth(i).click({ timeout: 2000 }); } catch { /* ignore */ }
      }
    } catch { /* no toasts */ }
  }

  /**
   * Click a button by text content using JS (bypasses greyed-out CSS pointer-events).
   */
  async jsClickButton(buttonText: string): Promise<void> {
    await this.page.evaluate((text) => {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      const btn = buttons.find(b => b.textContent?.trim() === text) as HTMLElement | undefined;
      if (btn) btn.click();
      else throw new Error(`jsClickButton: "${text}" not found`);
    }, buttonText);
  }
}
