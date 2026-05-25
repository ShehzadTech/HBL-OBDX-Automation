/**
 * scrape-initiate-import-lc.js
 * ───────────────────────────────────────────────────────────────────────────
 * Autonomous DOM-locator scraper for the Initiate Import LC flow.
 *
 * Drives a live happy-path through Tabs 1→6 using LC_TEST_DATA values and
 * captures every visible interactive widget on each tab — plus targeted
 * dependent-state captures (Advising Bank toggle, Confirmation Instructions
 * toggle, Save as Template) — into a single JSON.
 *
 * Output: data/scraped/initiate-import-lc-locators-rescrape.json
 *   { env, baseUrl, startedAt, finishedAt, url, menu, listing,
 *     tabs: [{ index, label, url, widgets:[…], buttons:[…], toggles:[…] }],
 *     dependentCaptures: { advisingBankByNameAddress:[…], confirmInstructions:[…] },
 *     notes }
 *
 * The output is written to a *separate* file (-rescrape.json) so the existing
 * curated initiate-import-lc-locators.json is preserved for manual merge.
 *
 * Usage:
 *   node scripts/scrape-initiate-import-lc.js              # headless (default)
 *   HEADED=1 node scripts/scrape-initiate-import-lc.js     # watch the browser
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BASE_URL = process.env.BASE_URL  || 'http://172.20.3.113:7777';
const USER     = process.env.OBDX_USER || 'corpmaker2';
const PASS     = process.env.OBDX_PASSWORD || 'Admin@131';
const OUT_DIR  = path.resolve(__dirname, '..', 'data', 'scraped');
const OUT_FILE = path.join(OUT_DIR, 'initiate-import-lc-locators-rescrape.json');

// Happy-path data (mirrors data/lcTestData.ts so we don't introduce drift).
const DATA = {
  product: 'ILC-INL',
  dateOfExpiry: '12/31/2026',
  placeOfExpiry: 'LONDON',
  beneficiaryName: 'Shehzad',
  lcCurrency: 'USD',
  lcAmount: '50000',
  customerReference: 'CUSTREF2024001',
  swiftCode: 'CITIGB2LXXX',
  partialShipment: 'Allowed',
  transshipment: 'Allowed',
  placeOfTaking: 'SHANGHAI PORT',
  finalDestination: 'PORT OF LONDON',
  shipmentDate: '11/30/2026',
  portOfLoading: 'SHANGHAI',
  portOfDischarge: 'LONDON',
  goodsType: 'Manufactured Goods',
  goodsQuantity: '1',
  goodsCostPerUnit: '50000',
  collateralAccountNumber: 'AT30008010036',
  collateralContributionAmount: '1000',
  advisingBankSwift: 'CITIGB2LXXX',
  insuranceProvider: 'AIG INSURANCE',
  insurancePolicyNumber: '123456789',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[scrape] ${msg}`); }

// In-page capture function — runs in browser context. Returns metadata for
// every visible interactive widget (inputs, oj-* components, buttons, links).
// Each entry includes role/aria-label/label-text/current-value/options so the
// JSON can drive Playwright codegen against EITHER stable selectors (role +
// accessible name) OR raw IDs.
const CAPTURE_FN = function () {
  function vis(el) { return el && el.offsetParent !== null; }
  function txt(el) { return el ? (el.textContent || '').trim().slice(0, 200) : null; }

  function ariaLabelFor(el) {
    const lblId = el.getAttribute('aria-labelledby');
    if (lblId) {
      const lbl = document.getElementById(lblId);
      if (lbl) return (lbl.textContent || '').trim().slice(0, 120) || null;
    }
    return el.getAttribute('aria-label') || null;
  }

  function inferLabelText(el) {
    if (el.id) {
      const associated = document.querySelector(`label[for="${el.id}"]`);
      if (associated) return txt(associated);
    }
    let cur = el;
    for (let i = 0; i < 5 && cur; i++) {
      cur = cur.parentElement;
      if (!cur) break;
      const lbl = cur.querySelector(':scope > label, :scope > .oj-label, :scope > .oj-flex > label');
      if (lbl && txt(lbl)) return txt(lbl);
    }
    return null;
  }

  function selectOptions(el) {
    if (el.tagName.toLowerCase() === 'select') {
      return Array.from(el.options).map(o => ({ value: o.value, text: o.text }));
    }
    return null;
  }

  function radioOptions(el) {
    const radios = el.querySelectorAll('oj-option, [role="radio"], input[type="radio"]');
    if (!radios.length) return null;
    return Array.from(radios).map(r => ({
      value: r.value || r.getAttribute('value') || null,
      label: txt(r) || r.getAttribute('aria-label') || null,
      checked: r.matches('[aria-checked="true"], :checked') || null,
    }));
  }

  function elMeta(el) {
    const tag = el.tagName.toLowerCase();
    const ariaLbl = ariaLabelFor(el);
    return {
      tag,
      id: el.id || null,
      role: el.getAttribute('role') || null,
      type: el.getAttribute('type') || null,
      name: el.getAttribute('name') || null,
      ariaLabel: ariaLbl,
      placeholder: el.getAttribute('placeholder') || null,
      labelText: inferLabelText(el),
      value: el.value != null ? String(el.value).slice(0, 200) : (el.getAttribute('value') || null),
      checked: el.matches?.('[aria-checked="true"], :checked') ? true : null,
      readonly: el.hasAttribute('readonly') ? true : (el.getAttribute('aria-readonly') === 'true' ? true : null),
      disabled: el.hasAttribute('disabled') ? true : (el.getAttribute('aria-disabled') === 'true' ? true : null),
      options: selectOptions(el) || radioOptions(el),
      idPattern: el.id ? '[id^="' + el.id.replace(/\d+$/, '') + '"]' : null,
    };
  }

  const widgetSel = [
    'oj-input-text', 'oj-input-number', 'oj-input-date', 'oj-input-password',
    'oj-text-area', 'oj-select-one', 'oj-select-many', 'oj-combobox-one', 'oj-combobox-many',
    'oj-radioset', 'oj-checkboxset', 'oj-switch', 'oj-slider',
    'input:not([type="hidden"])', 'select', 'textarea',
  ].join(',');
  const widgets = Array.from(document.querySelectorAll(widgetSel))
    .filter(vis)
    .filter(el => !el.closest('[role="dialog"]:not([aria-hidden="false"])'))
    .map(elMeta);

  const buttonSel = 'button, oj-button, a[role="button"], [role="button"], input[type="submit"], input[type="button"]';
  const buttons = Array.from(document.querySelectorAll(buttonSel))
    .filter(vis)
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      text: txt(el),
      disabled: el.hasAttribute('disabled') ? true : (el.getAttribute('aria-disabled') === 'true' ? true : null),
    }))
    .filter(b => (b.text && b.text.length < 60) || b.ariaLabel);

  const links = Array.from(document.querySelectorAll('a:not([role="button"])'))
    .filter(vis)
    .slice(0, 40)
    .map(el => ({
      id: el.id || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      text: txt(el),
      href: el.getAttribute('href') || null,
    }))
    .filter(l => l.text && l.text.length < 80);

  return { widgets, buttons, links, url: location.href, title: document.title };
};

// ────────────────────────────────────────────────────────────────────────────
// OJ helpers (browser-side equivalents of utils/ojHelper.ts for the driver)
// ────────────────────────────────────────────────────────────────────────────

async function ojFill(page, selector, value) {
  const handle = await page.locator(selector).first();
  await handle.scrollIntoViewIfNeeded().catch(() => {});
  await handle.click({ timeout: 5000 }).catch(() => {});
  // Find the inner native input via evaluate.
  await handle.evaluate((el, v) => {
    const input = el.querySelector('input, textarea') || el;
    const proto = input.tagName.toLowerCase() === 'textarea'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(input, v);
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }, value);
  await sleep(400);
}

async function ojSelectByText(page, selector, optionText) {
  const handle = await page.locator(selector).first();
  await handle.scrollIntoViewIfNeeded().catch(() => {});
  await handle.click({ timeout: 5000 });
  await sleep(500);
  const optLoc = page.getByRole('option', { name: new RegExp(optionText, 'i') }).first();
  await optLoc.click({ timeout: 5000 });
  await sleep(400);
}

async function clickByName(page, name, kind = 'button') {
  const loc = page.getByRole(kind, { name: new RegExp('^' + name + '$', 'i') }).first();
  await loc.click({ timeout: 5000 });
}

async function jsClick(page, selector) {
  await page.locator(selector).first().evaluate(el => el.click());
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: process.env.HEADED !== '1', slowMo: 0 });
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page    = await ctx.newPage();

  const captured = {
    env: process.env.TEST_ENV || 'dev',
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    menu: [],
    listing: {},
    tabs: [],
    dependentCaptures: {},
    notes: [],
  };

  async function snap(label) {
    log(`Capturing tab snapshot: ${label}`);
    const snap = await page.evaluate(CAPTURE_FN);
    return { label, ...snap, capturedAt: new Date().toISOString() };
  }

  try {
    // ── 1. Login ──────────────────────────────────────────────────────────
    log(`Navigating to ${BASE_URL}/home.html?ojr=login-form-main`);
    await page.goto(`${BASE_URL}/home.html?ojr=login-form-main`, { timeout: 60_000 });
    await page.locator('input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').first().fill(PASS);
    await page.locator('button', { hasText: 'Login' }).first().click();
    await page.waitForFunction(() => !location.href.includes('login-form-main'), { timeout: 60_000 });
    log('Login OK');

    // Dismiss screen-size warning + initial toasts
    try {
      const closeBtn = page.getByRole('button', { name: /^OK$|Continue|Close/i }).first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
      }
    } catch { /* none */ }
    await sleep(1500);

    // ── 2. Hamburger → Trade Finance → Letter Of Credit → Initiate ──────────
    async function clickVisibleMenu(rx, stepLabel) {
      const found = await page.evaluate((rxSrc) => {
        const re = new RegExp(rxSrc, 'i');
        const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
        for (const el of items) {
          if (el.offsetParent === null) continue;
          const t = (el.textContent || '').trim();
          if (re.test(t)) return { id: el.id, text: t, ariaLabel: el.getAttribute('aria-label') };
        }
        return null;
      }, rx.source);
      if (!found) throw new Error(`Visible menuitem not found: ${rx}`);
      captured.menu.push({ step: stepLabel, ...found });
      log(`  → "${found.text}" (id=${found.id || '-'})`);
      if (found.id) {
        await page.locator(`[id="${found.id.replace(/"/g, '\\"')}"]`).click({ timeout: 10_000 });
      } else {
        await page.locator('[role="menuitem"]').filter({ hasText: rx }).first().click({ timeout: 10_000 });
      }
      await sleep(900);
    }

    log('Opening hamburger menu');
    const hamburger = page.getByRole('button', { name: /Open Menu|Toggle Menu/i }).first();
    await hamburger.waitFor({ state: 'visible', timeout: 20_000 });
    await hamburger.click();
    await sleep(900);

    await clickVisibleMenu(/^Trade Finance$/,                'Trade Finance');
    await clickVisibleMenu(/^Letter Of Credit$/,             'Letter Of Credit');
    await clickVisibleMenu(/^Import Letter of Credit$/i,     'Import Letter of Credit');
    await clickVisibleMenu(/^Initiate Import LC$/i,          'Initiate Import LC');
    await sleep(3000);

    captured.listing.url = page.url();
    captured.listing.heading = await page.locator('h1, h2').first().textContent({ timeout: 10_000 })
      .then(t => (t || '').trim())
      .catch(() => null);
    log(`Landed on listing: ${captured.listing.url}`);
    captured.listing.snapshot = await page.evaluate(CAPTURE_FN);

    // ── 3. Open Create LC form (with multi-strategy fallback) ───────────────
    // Run-to-run state pollution: a previous scrape may have left saved drafts
    // and a "Resume draft?" prompt that swallows the Create LC click. Try
    // three strategies in order and pick whichever lands on the form.
    async function isOnCreateForm() {
      try {
        await page.locator('oj-select-one[id*="SelectProduct"], oj-select-one[id*="Product"]').first()
                  .waitFor({ state: 'visible', timeout: 6000 });
        return true;
      } catch { return false; }
    }

    log('Strategy 1: dismiss any modal + click #createButton');
    for (const name of [/^No$/i, /^Close$/i, /^Cancel$/i]) {
      try {
        const btn = page.getByRole('button', { name }).first();
        if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
          await btn.click({ timeout: 2500 });
          await sleep(500);
        }
      } catch {}
    }
    try {
      await page.locator('#createButton, button:has-text("Create LC")').first().click({ timeout: 8000 });
      await sleep(3500);
    } catch {}

    if (!(await isOnCreateForm())) {
      log('Strategy 2: navigate directly to ?ojr=initiate-letter-of-credit');
      await page.goto(`${BASE_URL}/home.html?ojr=initiate-letter-of-credit;module=letter-of-credit`, { timeout: 30_000 });
      await sleep(3500);
      // Dismiss any subsequent prompt
      for (const name of [/^No$/i, /^Close$/i, /^Cancel$/i, /^OK$/i]) {
        try {
          const btn = page.getByRole('button', { name }).first();
          if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
            await btn.click({ timeout: 2500 });
            await sleep(500);
          }
        } catch {}
      }
    }

    if (!(await isOnCreateForm())) {
      log('Strategy 3: click "Click to Proceed" or "Back To Back LC" link');
      try {
        const proceed = page.getByRole('link', { name: /Click to Proceed/i }).first();
        if (await proceed.isVisible({ timeout: 1500 }).catch(() => false)) {
          await proceed.click(); await sleep(3000);
        }
      } catch {}
    }

    captured.createUrl = page.url();
    if (!(await isOnCreateForm())) {
      captured.notes.push(`All 3 strategies failed; landed on ${captured.createUrl}`);
      log(`WARNING: did not reach Create form — current URL: ${captured.createUrl}`);
    } else {
      log(`Reached Create form at ${captured.createUrl}`);
    }
    await sleep(1500);

    // ── 4. Tab 1 — capture initial state ───────────────────────────────────
    captured.tabs.push({ index: 1, label: 'LC Details', ...await snap('Tab 1 — initial state after Create LC') });

    // ── 5. Tab 1 — fill happy-path so SWIFT-Verify-dependent widgets render ──
    log('Filling Tab 1 happy-path (to expose SWIFT-dependent widgets)');
    try { await ojSelectByText(page, 'oj-select-one[id*="SelectProduct"], oj-select-one[id*="Product"]', DATA.product); } catch (e) { captured.notes.push('Tab 1 product fill failed: ' + e.message); }
    try {
      const dateInput = page.locator('oj-input-date[id*="DateOfExpiry"], oj-input-date[id*="Expiry"]').first();
      await dateInput.click(); await page.keyboard.type(DATA.dateOfExpiry); await page.keyboard.press('Tab'); await sleep(400);
    } catch {}
    try { await ojFill(page, 'oj-input-text[id*="PlaceOfExpiry"]', DATA.placeOfExpiry); } catch {}
    try { await ojSelectByText(page, 'oj-select-one[id*="Beneficiary"], oj-combobox-one[id*="Beneficiary"]', DATA.beneficiaryName); } catch (e) { captured.notes.push('Tab 1 beneficiary failed: ' + e.message); }
    try { await ojSelectByText(page, 'oj-select-one[id*="Currency"]', DATA.lcCurrency); } catch {}
    try { await ojFill(page, 'oj-input-number[id*="lc-amount"], oj-input-number[id*="LcAmount"], oj-input-text[id*="lc-amount"]', DATA.lcAmount); } catch {}
    try { await ojFill(page, 'oj-input-text[id*="CustomerReference"]', DATA.customerReference); } catch {}
    try {
      await ojFill(page, 'oj-input-text[id*="availableWithSwiftCode"], oj-input-text[id*="SwiftCode"]', DATA.swiftCode);
      await clickByName(page, 'Verify'); await sleep(1500);
    } catch (e) { captured.notes.push('Tab 1 SWIFT+Verify failed: ' + e.message); }

    // Capture Tab 1 AFTER fill (now Limits LOV, View Limit Details, Reset, Save Draft may all be visible)
    captured.tabs.push({ index: 1, label: 'LC Details (post-fill)', ...await snap('Tab 1 — after happy-path fill') });

    // ── 6. Tab navigation — click tab LINKS, not Next button ────────────────
    // OBDX renders the 7 tabs as anchor links (href="#") inside the form
    // header. Clicking them directly bypasses Next-button validation and
    // lets us capture each tab's contents regardless of fill state.
    async function clickTabLink(name) {
      const found = await page.evaluate((n) => {
        const re = new RegExp('^' + n + '$', 'i');
        const links = Array.from(document.querySelectorAll('a'));
        for (const a of links) {
          if (a.offsetParent === null) continue;
          if (re.test((a.textContent || '').trim())) {
            a.click();
            return true;
          }
        }
        return false;
      }, name);
      if (!found) throw new Error(`Tab link not found / not visible: ${name}`);
      await sleep(1800);
    }

    const TAB_LINKS = [
      { idx: 2, name: 'Goods and Shipment Details' },
      { idx: 3, name: 'Documents and Conditions' },
      { idx: 4, name: 'Linkages' },
      { idx: 5, name: 'Instructions' },
      { idx: 6, name: 'Insurance' },
      { idx: 7, name: 'Attachments' },
    ];

    for (const t of TAB_LINKS) {
      log(`Clicking tab link → "${t.name}"`);
      try {
        await clickTabLink(t.name);
        captured.tabs.push({ index: t.idx, label: t.name, ...await snap(`Tab ${t.idx} — ${t.name}`) });
      } catch (e) {
        captured.notes.push(`Tab link click failed for "${t.name}": ${e.message}`);
        captured.tabs.push({ index: t.idx, label: t.name, error: e.message });
      }
    }

    // ── 7. Tab 5 (Instructions) dependent-state captures ────────────────────
    log('Returning to Tab 5 for dependent captures');
    try { await clickTabLink('Instructions'); } catch {}

    // 7a. Toggle Advising Bank → Name and Address
    try {
      const r = page.getByRole('radio', { name: /^Name (and|&) Address$/i }).first();
      if (await r.isVisible({ timeout: 2000 }).catch(() => false)) {
        await r.click(); await sleep(1200);
        captured.dependentCaptures.advisingBankByNameAddress = await page.evaluate(CAPTURE_FN);
      } else {
        captured.notes.push('Tab 5 — Advising Bank "Name and Address" radio not visible');
      }
    } catch (e) { captured.notes.push('Advising-bank toggle: ' + e.message); }

    // Revert to SWIFT
    try {
      const r = page.getByRole('radio', { name: /^SWIFT Code$/i }).first();
      if (await r.isVisible({ timeout: 1000 }).catch(() => false)) await r.click();
      await sleep(500);
    } catch {}

    // 7b. Confirmation Instructions = CONFIRM
    try {
      const dd = page.locator('oj-select-one[id*="Confirm"], oj-combobox-one[id*="Confirm"]').first();
      if (await dd.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dd.click(); await sleep(400);
        const opt = page.getByRole('option', { name: /^CONFIRM$/i }).first();
        if (await opt.isVisible({ timeout: 1500 }).catch(() => false)) {
          await opt.click(); await sleep(1200);
          captured.dependentCaptures.confirmationInstructionsConfirm = await page.evaluate(CAPTURE_FN);
        }
      } else {
        captured.notes.push('Tab 5 — Confirmation Instructions dropdown not visible');
      }
    } catch (e) { captured.notes.push('Confirm-instructions toggle: ' + e.message); }

    // 7c. Standard Instructions link/overlay detection
    try {
      const link = page.getByRole('link', { name: /Standard Instructions/i }).first();
      const visible = await link.isVisible({ timeout: 1500 }).catch(() => false);
      captured.dependentCaptures.standardInstructionsLinkPresent = visible;
      if (visible) {
        captured.dependentCaptures.standardInstructionsLinkMeta = await link.evaluate(el => ({
          id: el.id, text: (el.textContent || '').trim(),
          href: el.href, ariaLabel: el.getAttribute('aria-label'),
        }));
      }
    } catch {}

    // ── 8. Tab 7 (Attachments) — Save as Template + Preview Draft Copy ──────
    log('Returning to Tab 7 for file-upload / template / preview captures');
    try { await clickTabLink('Attachments'); } catch {}

    // 10a. Look for Save as Template panel toggle
    log('Tab 6 — toggling Save as Template (if available)');
    try {
      const tmplToggle = page.getByRole('switch', { name: /Save as Template/i })
                          .or(page.getByRole('radio', { name: /Save as Template/i }))
                          .or(page.getByLabel(/Save as Template/i))
                          .first();
      if (await tmplToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tmplToggle.click();
        await sleep(1000);
        captured.dependentCaptures.saveAsTemplate = await page.evaluate(CAPTURE_FN);
      } else {
        captured.notes.push('Tab 6 — Save as Template toggle not visible');
      }
    } catch (e) { captured.notes.push('Tab 6 save-as-template toggle failed: ' + e.message); }

    // 10b. Detect Preview Draft Copy button
    try {
      const prev = page.getByRole('button', { name: /Preview Draft( Copy)?/i }).first();
      const visible = await prev.isVisible({ timeout: 1500 }).catch(() => false);
      captured.dependentCaptures.previewDraftCopyPresent = visible;
      if (visible) {
        captured.dependentCaptures.previewDraftCopyMeta = await prev.evaluate(el => ({
          id: el.id, text: (el.textContent || '').trim(), ariaLabel: el.getAttribute('aria-label'),
        }));
      }
    } catch {}

    // 10c. Detect file-upload widget (drop zone + hidden input)
    try {
      const upload = await page.evaluate(() => {
        function vis(el) { return el && el.offsetParent !== null; }
        const dz = Array.from(document.querySelectorAll('oj-file-picker, [class*="drop" i], [class*="upload" i]'))
          .filter(vis)
          .slice(0, 6)
          .map(el => ({
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            ariaLabel: el.getAttribute('aria-label') || null,
            className: el.className || null,
          }));
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'))
          .map(el => ({
            id: el.id || null,
            ariaLabel: el.getAttribute('aria-label') || null,
            accept: el.getAttribute('accept') || null,
            multiple: el.multiple || null,
            visible: vis(el),
          }));
        return { dropZones: dz, fileInputs };
      });
      captured.dependentCaptures.fileUpload = upload;
    } catch (e) { captured.notes.push('Tab 6 file-upload detect failed: ' + e.message); }

    log('Scrape complete — writing JSON');
    captured.finishedAt = new Date().toISOString();
    captured.url = page.url();
    fs.writeFileSync(OUT_FILE, JSON.stringify(captured, null, 2), 'utf8');
    log(`Wrote ${path.relative(path.resolve(__dirname, '..'), OUT_FILE)}`);

  } catch (err) {
    captured.error = { message: err.message, stack: err.stack };
    captured.finishedAt = new Date().toISOString();
    captured.url = page.url();
    fs.writeFileSync(OUT_FILE, JSON.stringify(captured, null, 2), 'utf8');
    log(`FAILED: ${err.message}`);
    log(`Partial output saved to ${OUT_FILE}`);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
