/**
 * Auth fixtures — page-object and pre-authenticated state fixtures.
 *
 * Tests should import `test` and `expect` from this file (NOT from
 * '@playwright/test') so that the page-object fixtures are available.
 *
 * Available fixtures:
 *   loginPage          — fresh LoginPage, already navigated
 *   dashboardPage      — fresh DashboardPage (no login performed)
 *   importLcFlowPage   — fresh ImportLcFlowPage
 *   loggedInDashboard  — DashboardPage on a session that has logged in
 *                        as the default maker user. Use this for tests
 *                        where login itself is NOT under test.
 *   loggedInDashboardSg — DashboardPage logged in as the SG-entity maker
 *                        (corpmaker3). Use for @sg-only tests that depend
 *                        on SG-customised field rendering.
 *
 * The login fixtures run the login flow on every test (no storageState
 * caching yet — easy upgrade later if runs get slow).
 */

import { test as base } from '@playwright/test';
import { LoginPage }              from '@pages/common/LoginPage';
import { DashboardPage }          from '@pages/common/DashboardPage';
import { ImportLcFlowPage }       from '@pages/trade-finance/ImportLcFlowPage';
import { AmendImportLcFlowPage }  from '@pages/trade-finance/AmendImportLcFlowPage';
import { ViewImportLcFlowPage }   from '@pages/trade-finance/ViewImportLcFlowPage';
import { CancelImportLcFlowPage } from '@pages/trade-finance/CancelImportLcFlowPage';
import { SettlementImportBillFlowPage } from '@pages/trade-finance/SettlementImportBillFlowPage';
import { InitiateTransferLcFlowPage }   from '@pages/trade-finance/InitiateTransferLcFlowPage';
import { InitiateOutwardBgFlowPage }    from '@pages/trade-finance/InitiateOutwardBgFlowPage';
import { ViewOutwardBgFlowPage }        from '@pages/trade-finance/ViewOutwardBgFlowPage';
import { LC_TEST_DATA }           from '@data/lcTestData';

type PageFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  importLcFlowPage: ImportLcFlowPage;
  amendImportLcFlowPage: AmendImportLcFlowPage;
  viewImportLcFlowPage: ViewImportLcFlowPage;
  cancelImportLcFlowPage: CancelImportLcFlowPage;
  settlementImportBillFlowPage: SettlementImportBillFlowPage;
  initiateTransferLcFlowPage: InitiateTransferLcFlowPage;
  initiateOutwardBgFlowPage: InitiateOutwardBgFlowPage;
  viewOutwardBgFlowPage: ViewOutwardBgFlowPage;
};

type StateFixtures = {
  loggedInDashboard: DashboardPage;
  loggedInDashboardSg: DashboardPage;
};

export const test = base.extend<PageFixtures & StateFixtures>({
  loginPage: async ({ page }, use) => {
    const lp = new LoginPage(page);
    await lp.navigate();
    await use(lp);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  importLcFlowPage: async ({ page }, use) => {
    await use(new ImportLcFlowPage(page));
  },

  amendImportLcFlowPage: async ({ page }, use) => {
    await use(new AmendImportLcFlowPage(page));
  },

  viewImportLcFlowPage: async ({ page }, use) => {
    await use(new ViewImportLcFlowPage(page));
  },

  cancelImportLcFlowPage: async ({ page }, use) => {
    await use(new CancelImportLcFlowPage(page));
  },

  settlementImportBillFlowPage: async ({ page }, use) => {
    await use(new SettlementImportBillFlowPage(page));
  },

  initiateTransferLcFlowPage: async ({ page }, use) => {
    await use(new InitiateTransferLcFlowPage(page));
  },

  initiateOutwardBgFlowPage: async ({ page }, use) => {
    await use(new InitiateOutwardBgFlowPage(page));
  },

  viewOutwardBgFlowPage: async ({ page }, use) => {
    await use(new ViewOutwardBgFlowPage(page));
  },

  loggedInDashboard: async ({ page }, use) => {
    const lp = new LoginPage(page);
    const dp = new DashboardPage(page);
    await lp.navigate();
    await lp.login(LC_TEST_DATA.username, LC_TEST_DATA.password);
    await dp.waitForDashboard();
    await use(dp);
  },

  loggedInDashboardSg: async ({ page }, use) => {
    const lp = new LoginPage(page);
    const dp = new DashboardPage(page);
    await lp.navigate();
    await lp.login(LC_TEST_DATA.sgUsername, LC_TEST_DATA.sgPassword);
    await dp.waitForDashboard();
    await use(dp);
  },
});

export { expect } from '@playwright/test';
