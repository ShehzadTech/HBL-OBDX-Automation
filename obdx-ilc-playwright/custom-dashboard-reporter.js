/**
 * Custom Playwright reporter that regenerates the dashboard after the run.
 *
 * Reporters' onEnd hooks fire in the order they're declared in
 * playwright.config.ts, so listing this reporter AFTER the json reporter
 * guarantees results.json has been written before we read it. This is the
 * reason this lives in a reporter rather than globalTeardown — globalTeardown
 * runs before reporter onEnd, so it would read stale JSON from a prior run.
 */

'use strict';

const { run } = require('./generate-custom-report');

class CustomDashboardReporter {
  async onEnd() {
    try {
      run();
    } catch (err) {
      console.error('[report] Custom report generation failed:', err);
    }
  }
}

module.exports = CustomDashboardReporter;
