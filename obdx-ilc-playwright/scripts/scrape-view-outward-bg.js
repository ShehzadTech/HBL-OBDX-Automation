/**
 * scrape-view-outward-bg.js
 * ────────────────────────────────────────────────────────────────────────────
 * Autonomous DOM-locator scraper for the View Outward BG flow.
 *
 * Goal: produce `data/scraped/view-outward-bg-scraped.json` containing real
 * locators + values captured from the live AUT. The POM/spec generator then
 * references only this JSON — never the FSD.
 *
 * Output schema:
 *   {
 *     env, startedAt, finishedAt, url,
 *     menu: [{ step, locatorId, role, name, href }],
 *     listing: {
 *       heading, filters: [field+], tableHeaders, firstRowGuaranteeNo, columns
 *     },
 *     detail: {
 *       header: [{ label, value }],
 *       tabs: [{ index, label, ariaLabel, contents: [{label, value, locator}] }]
 *     }
 *   }
 *
 * Usage:
 *   node scripts/scrape-view-outward-bg.js                 # headless
 *   HEADED=1 node scripts/scrape-view-outward-bg.js        # watch in browser
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
const OUT_FILE = path.join(OUT_DIR, 'view-outward-bg-scraped.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg)   { console.log(`[scrape] ${msg}`); }

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: process.env.HEADED !== '1', slowMo: 0 });
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page    = await ctx.newPage();

  const captured = {
    env:        process.env.TEST_ENV || 'dev',
    baseUrl:    BASE_URL,
    startedAt:  new Date().toISOString(),
    menu:       [],
    listing:    { heading: null, filters: [], tableHeaders: [], rows: [] },
    detail:     { header: [], tabs: [], actions: [] },
    notes:      [],
  };

  try {
    // ── 1. Login ──────────────────────────────────────────────────────────
    log(`Navigating to ${BASE_URL}/home.html?ojr=login-form-main`);
    await page.goto(`${BASE_URL}/home.html?ojr=login-form-main`, { timeout: 60_000 });
    await page.locator('input[type="text"]').first().fill(USER);
    await page.locator('input[type="password"]').first().fill(PASS);
    await page.locator('button', { hasText: 'Login' }).first().click();
    await page.waitForFunction(() => !window.location.href.includes('login-form-main'),
                               { timeout: 60_000 });
    log('Login OK');

    // Dismiss screen-size warning + initial toasts
    try {
      const closeBtn = page.getByRole('button', { name: /^OK$|Continue|Close/i }).first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
      }
    } catch { /* none */ }
    await sleep(1500);

    // ── 2. Hamburger → Trade Finance → Bank Guarantee → Outward Bank Guarantee → View ─
    // Click the FIRST VISIBLE menuitem matching `nameRegex`. Captures the
    // chosen element's id/aria-label/text into `captured.menu`.
    async function clickVisibleMenu(nameRegex, stepLabel) {
      // Find first visible matching menuitem via evaluate (Playwright's
      // .first() picks DOM-first, not visible-first).
      const found = await page.evaluate((rxSrc) => {
        const re = new RegExp(rxSrc, 'i');
        const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
        for (const el of items) {
          if (el.offsetParent === null) continue;
          const txt = (el.textContent || '').trim();
          if (re.test(txt)) {
            return { id: el.id, text: txt, ariaLabel: el.getAttribute('aria-label') };
          }
        }
        return null;
      }, nameRegex.source);

      if (!found) throw new Error(`Visible menuitem not found for: ${nameRegex}`);
      captured.menu.push({ step: stepLabel, ...found });
      log(`  → "${found.text}" (id=${found.id})`);

      if (found.id) {
        // Use attribute selector to avoid needing to CSS-escape the id
        // (Node has no CSS global).
        await page.locator(`[id="${found.id.replace(/"/g, '\\"')}"]`).click({ timeout: 10_000 });
      } else {
        await page.locator('[role="menuitem"]')
                  .filter({ hasText: nameRegex })
                  .first()
                  .click({ timeout: 10_000 });
      }
      await sleep(900);
    }

    log('Opening hamburger');
    const hamburger = page.getByRole('button', { name: /Open Menu|Toggle Menu/i }).first();
    await hamburger.waitFor({ state: 'visible', timeout: 20_000 });
    await hamburger.click();
    await sleep(900);

    await clickVisibleMenu(/^Trade Finance$/,                            'Trade Finance');
    await clickVisibleMenu(/^Bank Guarantee\/Stand By LC$/,              'Bank Guarantee/Stand By LC');
    await clickVisibleMenu(/^Outward Bank Guarantee\/Stand By LC$/,      'Outward Bank Guarantee/Stand By LC');
    await clickVisibleMenu(/^View Outward Guarantee\/Stand By LC$/,      'View Outward Guarantee/Stand By LC');

    await sleep(3000);

    captured.url = page.url();
    log(`Landed on listing page: ${captured.url}`);

    // ── 3. Listing page snapshot ──────────────────────────────────────────
    // Heading
    captured.listing.heading = await page.locator('h1, h2, [class*="header" i] [role="heading"]')
                                          .first()
                                          .textContent({ timeout: 10_000 })
                                          .then(t => (t || '').trim())
                                          .catch(() => null);

    // Filter form fields — capture every visible input / combobox / button on
    // the page before any row click.
    captured.listing.filters = await page.evaluate(() => {
      function meta(el) {
        return {
          tag:           el.tagName.toLowerCase(),
          id:            el.id || null,
          name:          el.getAttribute('name') || null,
          type:          el.getAttribute('type') || null,
          role:          el.getAttribute('role') || null,
          ariaLabel:     el.getAttribute('aria-label') || null,
          placeholder:   el.getAttribute('placeholder') || null,
          labelledBy:    el.getAttribute('aria-labelledby') || null,
          className:     el.className || null,
          visible:       el.offsetParent !== null,
          value:         (el.value != null ? String(el.value) : null),
        };
      }
      const sel = 'input:not([type="hidden"]), oj-input-text, oj-select-one, oj-combobox-one, oj-input-date, button[role], a[role="button"]';
      return Array.from(document.querySelectorAll(sel))
                  .map(meta)
                  .filter(m => m.visible);
    });

    // Listing table
    captured.listing.tableHeaders = await page.evaluate(() => {
      const hdr = document.querySelector('table thead, [role="rowgroup"] [role="row"]:first-child, oj-table thead');
      if (!hdr) return [];
      return Array.from(hdr.querySelectorAll('th, [role="columnheader"]'))
                  .map(c => (c.textContent || '').trim())
                  .filter(Boolean);
    });
    captured.listing.rows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr, [role="row"]'))
                        .slice(0, 5);
      return rows.map(r => Array.from(r.querySelectorAll('td, [role="gridcell"], [role="cell"]'))
                                .map(c => (c.textContent || '').trim()));
    });

    log(`Listing heading: "${captured.listing.heading}"`);
    log(`Listing filters: ${captured.listing.filters.length} visible widgets captured`);
    log(`Listing headers : ${JSON.stringify(captured.listing.tableHeaders)}`);
    log(`First data row  : ${JSON.stringify(captured.listing.rows[1] || captured.listing.rows[0])}`);

    // ── 4. Open first record's detail page ────────────────────────────────
    // The Guarantee Number is typically a link in the first or second column.
    const firstLink = page.locator('table tbody tr a, [role="row"] a').first();
    const linkInfo = await firstLink.evaluate(el => ({
      text:     (el.textContent || '').trim(),
      href:     el.getAttribute('href') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
    })).catch(() => null);
    captured.listing.firstRowOpenLink = linkInfo;

    if (linkInfo) {
      log(`Opening first record via link "${linkInfo.text}"`);
      await firstLink.click();
      await sleep(3000);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    } else {
      captured.notes.push('No clickable row link found on listing — detail capture will be skipped');
      throw new Error('No clickable row link to open detail');
    }

    captured.detail.url = page.url();
    log(`Detail page URL: ${captured.detail.url}`);

    // Header summary fields
    captured.detail.header = await page.evaluate(() => {
      const items = [];
      // Common header pattern: aria-labelled readonly inputs
      const inputs = Array.from(document.querySelectorAll('input[readonly], input[aria-label]'))
                          .filter(el => el.offsetParent !== null)
                          .slice(0, 30);
      for (const inp of inputs) {
        const label = inp.getAttribute('aria-label')
                   || (document.getElementById(inp.getAttribute('aria-labelledby') || '')?.textContent || '').trim()
                   || null;
        items.push({
          label,
          id: inp.id || null,
          value: inp.value || null,
          placeholder: inp.getAttribute('placeholder') || null,
        });
      }
      return items;
    });
    log(`Detail header fields captured: ${captured.detail.header.length}`);

    // Action buttons on detail page
    captured.detail.actions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a[role="button"]'))
                  .filter(el => el.offsetParent !== null)
                  .slice(0, 50)
                  .map(el => ({
                    text:      (el.textContent || '').trim(),
                    id:        el.id || null,
                    ariaLabel: el.getAttribute('aria-label') || null,
                  }))
                  .filter(x => x.text && x.text.length < 50);
    });

    // ── 5. Tab discovery + walk ───────────────────────────────────────────
    const tabHandles = await page.locator('[role="tab"], [aria-label^="Click here for"]').elementHandles();
    log(`Found ${tabHandles.length} tabs`);

    for (let i = 0; i < tabHandles.length; i++) {
      const t = tabHandles[i];
      const tabMeta = await t.evaluate(el => ({
        text:      (el.textContent || '').trim(),
        ariaLabel: el.getAttribute('aria-label') || null,
        id:        el.id || null,
        role:      el.getAttribute('role') || null,
      }));
      log(`  Tab ${i}: "${tabMeta.text || tabMeta.ariaLabel}"`);

      try {
        await t.scrollIntoViewIfNeeded();
        await t.click({ timeout: 8000 });
      } catch (e) {
        // skip non-clickable header
      }
      await sleep(1500);

      // Capture all visible label→value pairs on this tab
      const contents = await page.evaluate(() => {
        function vis(el) { return el && el.offsetParent !== null; }
        const out = [];

        // (a) readonly inputs with aria-label
        Array.from(document.querySelectorAll('input[readonly], input[aria-readonly="true"]'))
              .filter(vis)
              .forEach(el => out.push({
                kind: 'readonly-input',
                label: el.getAttribute('aria-label') || null,
                id: el.id || null,
                value: el.value || null,
              }));

        // (b) label→value sibling pattern
        Array.from(document.querySelectorAll('label, strong'))
              .filter(vis)
              .slice(0, 200)
              .forEach(lbl => {
                const txt = (lbl.textContent || '').trim();
                if (!txt || txt.length > 80) return;
                const sib = lbl.nextElementSibling;
                if (sib && vis(sib)) {
                  out.push({
                    kind: 'label-sibling',
                    label: txt,
                    value: (sib.textContent || '').trim().slice(0, 200),
                    siblingTag: sib.tagName.toLowerCase(),
                    siblingId: sib.id || null,
                  });
                }
              });

        // (c) tables on this tab
        const tables = Array.from(document.querySelectorAll('table, oj-table, [role="grid"]'))
                            .filter(vis);
        const tableInfo = tables.map(tbl => ({
          headers: Array.from(tbl.querySelectorAll('thead th, [role="columnheader"]'))
                        .map(c => (c.textContent || '').trim())
                        .filter(Boolean),
          firstRow: (() => {
            const r = tbl.querySelector('tbody tr, [role="row"]');
            if (!r) return null;
            return Array.from(r.querySelectorAll('td, [role="gridcell"]'))
                         .map(c => (c.textContent || '').trim());
          })(),
          rowCount: tbl.querySelectorAll('tbody tr, [role="row"]').length,
        }));

        return { fields: out, tables: tableInfo };
      });

      captured.detail.tabs.push({
        index: i,
        label: tabMeta.text,
        ariaLabel: tabMeta.ariaLabel,
        id: tabMeta.id,
        contents,
      });
    }

    log('Scrape complete — writing JSON');
    captured.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT_FILE, JSON.stringify(captured, null, 2), 'utf8');
    log(`Wrote ${path.relative(path.resolve(__dirname, '..'), OUT_FILE)}`);
  } catch (err) {
    captured.error = { message: err.message, stack: err.stack };
    captured.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT_FILE, JSON.stringify(captured, null, 2), 'utf8');
    log(`FAILED: ${err.message}`);
    log(`Partial output saved to ${OUT_FILE}`);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
