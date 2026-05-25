/**
 * scrape-tab4-linkages-subpanel.js
 * ─────────────────────────────────────────────────────────────────────────
 * Focused 2nd-pass scrape: drive Initiate Import LC to Tab 4, click the
 * Add Account / Add Collateral Linkage affordance, and capture the
 * resulting account-picker sub-panel locators.
 *
 * Why: the 1st-pass scrape (data/scraped/initiate-import-lc-locators-rescrape.json)
 * only captured the Add Account *link* (id=AddAccount2665268). The account
 * input + amount input + Save row affordance only render after that click.
 * Our POM's accountNumberInput selector `input[id*="account-input"]` is
 * timing out — likely the live ID prefix changed.
 *
 * Output: data/scraped/tab4-linkages-subpanel.json
 *   { url, addAccountClicked, widgets, buttons, inputsByIdPrefix }
 *
 * Run: node scripts/scrape-tab4-linkages-subpanel.js
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
const OUT_FILE = path.resolve(__dirname, '..', 'data', 'scraped', 'tab4-linkages-subpanel.json');

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function log(m){ console.log(`[t4-scrape] ${m}`); }

const CAPTURE_FN = function () {
  // Visibility must accept position:fixed dialogs (offsetParent === null but rect > 0).
  function vis(el){
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function txt(el){ return el ? (el.textContent || '').trim().slice(0, 200) : null; }
  function inferLabelText(el){
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return txt(lbl);
    }
    let cur = el;
    for (let i=0;i<5;i++){
      cur = cur.parentElement;
      if (!cur) break;
      const lbl = cur.querySelector(':scope > label, :scope > .oj-label');
      if (lbl && txt(lbl)) return txt(lbl);
    }
    return null;
  }

  const widgetSel = [
    'oj-input-text','oj-input-number','oj-input-date',
    'oj-select-one','oj-combobox-one','oj-text-area',
    'oj-radioset','oj-checkboxset',
    'input:not([type="hidden"])','select','textarea',
  ].join(',');

  const widgets = Array.from(document.querySelectorAll(widgetSel))
    .filter(vis)
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      name: el.getAttribute('name') || null,
      type: el.getAttribute('type') || null,
      role: el.getAttribute('role') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      labelText: inferLabelText(el),
      placeholder: el.getAttribute('placeholder') || null,
      value: el.value != null ? String(el.value).slice(0, 200) : null,
      idPrefix: el.id ? el.id.replace(/\d+$/, '') : null,
    }));

  const buttons = Array.from(document.querySelectorAll('button, oj-button, a[role="button"]'))
    .filter(vis)
    .map(el => ({
      text: txt(el),
      id: el.id || null,
      ariaLabel: el.getAttribute('aria-label') || null,
    }))
    .filter(b => (b.text && b.text.length < 60) || b.ariaLabel);

  // Bucket inputs by id-prefix so the user can see which prefixes appeared.
  const inputsByIdPrefix = {};
  for (const w of widgets) {
    if (w.tag !== 'input') continue;
    const prefix = w.idPrefix || '(no-id)';
    inputsByIdPrefix[prefix] = (inputsByIdPrefix[prefix] || 0) + 1;
  }

  // Also dump anything inside an open dialog explicitly, in case the visibility
  // filter on the page-wide query is still missing items.
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"], oj-dialog, .oj-dialog, .oj-popup, [class*="oj-popup"]'))
    .filter(d => {
      const r = d.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map(d => ({
      tag: d.tagName.toLowerCase(),
      id: d.id || null,
      role: d.getAttribute('role') || null,
      class: d.className || null,
      inputs: Array.from(d.querySelectorAll('input, oj-input-text, oj-select-one, oj-combobox-one, oj-input-number')).map(i => ({
        tag: i.tagName.toLowerCase(),
        id: i.id || null,
        idPrefix: i.id ? i.id.replace(/\d+$/, '') : null,
        placeholder: i.getAttribute('placeholder') || null,
        ariaLabel: i.getAttribute('aria-label') || null,
        name: i.getAttribute('name') || null,
        type: i.getAttribute('type') || null,
      })),
      buttons: Array.from(d.querySelectorAll('button, oj-button, a[role="button"]')).map(b => ({
        text: (b.textContent || '').trim().slice(0, 60),
        id: b.id || null,
      })),
    }));

  return { widgets, buttons, inputsByIdPrefix, dialogs, url: location.href };
};

async function ojSelectByText(page, selector, optionText){
  const handle = await page.locator(selector).first();
  await handle.scrollIntoViewIfNeeded().catch(()=>{});
  await handle.click({ timeout: 5000 });
  await sleep(500);
  const opt = page.getByRole('option', { name: new RegExp(optionText, 'i') }).first();
  await opt.click({ timeout: 5000 });
  await sleep(400);
}

async function ojFill(page, selector, value){
  const h = await page.locator(selector).first();
  await h.scrollIntoViewIfNeeded().catch(()=>{});
  await h.click({ timeout: 5000 }).catch(()=>{});
  await h.evaluate((el, v) => {
    const inp = el.querySelector('input, textarea') || el;
    const proto = inp.tagName.toLowerCase() === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(inp, v);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    inp.blur();
  }, value);
  await sleep(400);
}

(async () => {
  const browser = await chromium.launch({ headless: process.env.HEADED !== '1', slowMo: 0 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = { startedAt: new Date().toISOString(), steps: [] };

  try {
    // Login
    await page.goto(`${BASE_URL}/home.html?ojr=login-form-main`, { timeout: 60_000 });
    await page.locator('input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').first().fill(PASS);
    await page.locator('button', { hasText: 'Login' }).first().click();
    await page.waitForFunction(() => !location.href.includes('login-form-main'), { timeout: 60_000 });
    log('Login OK');
    try {
      const close = page.getByRole('button', { name: /^OK$|Continue|Close/i }).first();
      if (await close.isVisible({ timeout: 3000 }).catch(()=>false)) await close.click();
    } catch {}
    await sleep(1500);

    // Hamburger nav (4 levels)
    log('Opening hamburger');
    const burger = page.getByRole('button', { name: /Open Menu|Toggle Menu/i }).first();
    await burger.waitFor({ state: 'visible', timeout: 20_000 });
    await burger.click();
    await sleep(900);
    async function clickMenu(rx) {
      const f = await page.evaluate((rxSrc) => {
        const re = new RegExp(rxSrc, 'i');
        for (const el of document.querySelectorAll('[role="menuitem"]')) {
          if (el.offsetParent === null) continue;
          if (re.test((el.textContent||'').trim())) { el.click(); return true; }
        }
        return false;
      }, rx.source);
      if (!f) throw new Error('menu not found: ' + rx);
      await sleep(900);
    }
    await clickMenu(/^Trade Finance$/);
    await clickMenu(/^Letter Of Credit$/);
    await clickMenu(/^Import Letter of Credit$/);
    await clickMenu(/^Initiate Import LC$/);
    await sleep(2500);

    // Dismiss draft prompt, hit Create LC, navigate directly to form on fallback.
    for (const name of [/^No$/i, /^Close$/i, /^Cancel$/i]) {
      try { const b = page.getByRole('button', { name }).first();
        if (await b.isVisible({ timeout: 600 }).catch(()=>false)) { await b.click(); await sleep(500); }
      } catch {}
    }
    try { await page.locator('#createButton, button:has-text("Create LC")').first().click({ timeout: 8000 }); await sleep(3500); } catch {}
    async function isOnForm() {
      try { await page.locator('oj-select-one[id*="SelectProduct"]').first().waitFor({ state: 'visible', timeout: 6000 }); return true; } catch { return false; }
    }
    if (!(await isOnForm())) {
      log('Falling back: page.goto initiate-letter-of-credit URL');
      await page.goto(`${BASE_URL}/home.html?ojr=initiate-letter-of-credit;module=letter-of-credit`, { timeout: 30_000 });
      await sleep(3500);
      for (const name of [/^No$/i, /^Close$/i, /^Cancel$/i, /^OK$/i]) {
        try { const b = page.getByRole('button', { name }).first();
          if (await b.isVisible({ timeout: 600 }).catch(()=>false)) { await b.click(); await sleep(500); }
        } catch {}
      }
    }
    if (!(await isOnForm())) throw new Error('Could not reach Create LC form');

    log('On Create LC form — filling Tab 1 minimally so Tab 4 can render');
    // Minimal Tab 1 fill — just enough for Tab 4's busy-context to load.
    try { await ojSelectByText(page, 'oj-select-one[id*="SelectProduct"]', 'ILC-INL'); } catch (e) { out.steps.push('tab1 product fail: '+e.message); }
    try {
      const d = page.locator('oj-input-date[id*="DateofExpiry"], oj-input-date[id*="DateOfExpiry"]').first();
      await d.click(); await page.keyboard.type('12/31/2026'); await page.keyboard.press('Tab'); await sleep(400);
    } catch {}
    try { await ojFill(page, 'oj-input-text[id*="PlaceofExpiry"]', 'LONDON'); } catch {}
    try { await ojSelectByText(page, 'oj-select-one[id*="Beneficiary"]', 'Shehzad'); } catch (e) { out.steps.push('tab1 beneficiary fail: '+e.message); }
    try { await ojSelectByText(page, 'oj-select-one[id*="Currency"]', 'USD'); } catch {}
    try { await ojFill(page, 'oj-input-text[id*="lc-amount"]', '50000'); } catch {}
    try { await ojFill(page, 'oj-input-text[id*="availableWithSwiftCode"]', 'CITIGB2LXXX');
          await page.getByRole('button', { name: 'Verify' }).first().click(); await sleep(1500); } catch {}

    // Click directly on the Linkages tab anchor (bypass Next-button validation)
    log('Clicking Linkages tab link');
    const tabClick = await page.evaluate(() => {
      for (const a of document.querySelectorAll('a')) {
        if (a.offsetParent === null) continue;
        if ((a.textContent||'').trim() === 'Linkages') { a.click(); return true; }
      }
      return false;
    });
    if (!tabClick) throw new Error('Linkages tab link not found');
    await sleep(2500);

    // Set Cash Collateral % to a low value first — Add Account may be no-op
    // when % is at default (likely 100% = fully collateralized, no linkage row needed).
    log('Setting Cash Collateral % to 5 to enable Add Account flow');
    try { await ojFill(page, 'oj-input-text#Percent2774746', '5'); } catch (e) { out.steps.push('set Percent fail: ' + e.message); }
    await sleep(800);

    // Capture Tab 4 BEFORE clicking Add Account
    log('Capturing Tab 4 BEFORE Add Account click');
    out.beforeAddAccount = await page.evaluate(CAPTURE_FN);

    // Find Add Account link/button — try the captured IDs first, then fall back to text
    log('Clicking Add Account / Add Collateral Linkage');
    const linkClicked = await page.evaluate(() => {
      const candidates = [
        'a#AddAccount2665268',
        'a[id^="AddAccount"]',
        'a:not([href]):not([role])',
      ];
      // Match by visible text first — most reliable
      const links = Array.from(document.querySelectorAll('a, button'));
      for (const l of links) {
        if (l.offsetParent === null) continue;
        const t = (l.textContent || '').trim();
        if (/^(Add Account|Add Collateral Linkage|Click here to Add Collateral|Click here to Add)/i.test(t)) {
          l.click();
          return { matchedText: t, id: l.id || null, tag: l.tagName.toLowerCase() };
        }
      }
      return null;
    });
    if (!linkClicked) {
      out.addAccountClicked = null;
      out.steps.push('Add Account link not found by any selector');
    } else {
      out.addAccountClicked = linkClicked;
      log('  Clicked: ' + JSON.stringify(linkClicked));
    }
    await sleep(2500);

    // Capture AFTER click
    log('Capturing Tab 4 AFTER Add Account click');
    out.afterAddAccount = await page.evaluate(CAPTURE_FN);

    // Compare new widget IDs vs before
    const beforeIds = new Set(out.beforeAddAccount.widgets.map(w => w.id).filter(Boolean));
    out.newWidgetsAfterClick = out.afterAddAccount.widgets.filter(w => w.id && !beforeIds.has(w.id));

    // Fallback dump: take a screenshot + full HTML so we can debug visually
    const shotPath = path.resolve(__dirname, '..', 'data', 'scraped', 'tab4-after-add-account.png');
    const htmlPath = path.resolve(__dirname, '..', 'data', 'scraped', 'tab4-after-add-account.html');
    await page.screenshot({ path: shotPath, fullPage: true });
    fs.writeFileSync(htmlPath, await page.content(), 'utf8');
    log('Screenshot: ' + path.relative(path.resolve(__dirname, '..'), shotPath));
    log('HTML dump : ' + path.relative(path.resolve(__dirname, '..'), htmlPath));
    out.screenshot = path.relative(path.resolve(__dirname, '..'), shotPath);
    out.htmlDump   = path.relative(path.resolve(__dirname, '..'), htmlPath);

    // Also dump ALL inputs in the page (no visibility filter) so we can see what's available
    out.allInputsRaw = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, oj-input-text, oj-select-one, oj-combobox-one')).map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        idPrefix: el.id ? el.id.replace(/\d+$/, '') : null,
        placeholder: el.getAttribute('placeholder') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        name: el.getAttribute('name') || null,
        type: el.getAttribute('type') || null,
        visible: el.offsetParent !== null,
        rect: (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; })(),
      }));
    });
    log('Total inputs in DOM after click: ' + out.allInputsRaw.length);

    out.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
    log('Done. Wrote ' + path.relative(path.resolve(__dirname, '..'), OUT_FILE));
    log('NEW widgets after Add Account click: ' + out.newWidgetsAfterClick.length);
  } catch (err) {
    out.error = { message: err.message, stack: err.stack };
    out.finishedAt = new Date().toISOString();
    out.url = page.url();
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
    log('FAILED: ' + err.message);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(()=>{});
  }
})();
