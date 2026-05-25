# Code Patterns

Concrete templates for common tasks. Copy these structures; don't improvise.

---

## Pattern 1 — New spec file from test cases

**Input:** A table of test cases with TC-ID, Title, Preconditions, Steps, Expected Result.

**Output:** One `.spec.ts` file, one test per row, using existing fixtures.

**Template:**

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';

/**
 * <Feature> — <short description>
 *
 * Covers: <list the TC-IDs this file includes>
 */

test.describe('<Feature> — <short description>', () => {
  test('TC-<FEATURE>-001 @smoke  <title>', async ({ <fixtures> }) => {
    // Arrange: <reference preconditions from the TC>

    // Act: <reference steps from the TC — but translate into POM method calls>

    // Assert: <reference expected result from the TC>
  });

  // Continue for each test case...
});
```

**Translating TC Steps → POM calls:**

| TC Step says... | Spec code should be... |
|------|------|
| "Navigate to login page" | handled by `loginPage` fixture |
| "Enter 'standard_user' in username field" | `await loginPage.login(user.username, user.password)` — don't fill the field directly |
| "Click the Login button" | (same line as above — `login()` includes the click) |
| "Verify user is on the inventory page" | `await inventoryPage.waitForLoad()` + assertion on page content |

If a TC step can't be mapped to an existing page object method, **add the method first**, don't inline the raw selector in the spec.

---

## Pattern 2 — New page object

**When:** A test case references a page or component that doesn't have a page object yet.

**Template:**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * <PageName>
 * ──────────
 * <One-line description of what this page is.>
 *
 * <Additional notes — navigation context, state dependencies, etc.>
 */
export class <PageName>Page extends BasePage {
  readonly url = '/<relative-path>';
  readonly pageIdentifier: Locator;

  // ─── Locators ─────────────────────────────────────────────
  private readonly <locator1>: Locator;
  private readonly <locator2>: Locator;
  // ...

  constructor(page: Page) {
    super(page);
    this.<locator1> = page.locator('<selector>');
    this.<locator2> = page.getByRole('<role>', { name: '<n>' });
    // ...
    this.pageIdentifier = this.<most-stable-locator>;
  }

  // ─── Actions ──────────────────────────────────────────────

  async <actionName>(<params>): Promise<void> {
    // ...
  }

  // ─── Queries ──────────────────────────────────────────────

  async get<Something>(): Promise<<type>> {
    // ...
  }

  // ─── Assertions ───────────────────────────────────────────

  async expect<Condition>(expected: <type>): Promise<void> {
    await expect(this.<locator>).<assertion>(expected);
  }
}
```

**Then register the fixture** in `src/fixtures/pages.fixture.ts`:

```ts
type PageFixtures = {
  // ... existing
  <pageName>Page: <PageName>Page;
};

export const test = base.extend<PageFixtures & StateFixtures>({
  // ... existing
  <pageName>Page: async ({ page }, use) => {
    await use(new <PageName>Page(page));
  },
});
```

---

## Pattern 3 — Data-driven tests

**When:** The same test shape runs against multiple inputs — e.g. "invalid emails all produce an error."

**Template:**

```ts
const invalidEmails = [
  { input: 'plain-text',          reason: 'no @ sign' },
  { input: '@nodomain.com',       reason: 'no local part' },
  { input: 'user@',               reason: 'no domain' },
  { input: 'user @example.com',   reason: 'contains space' },
] as const;

for (const { input, reason } of invalidEmails) {
  test(`TC-REG-DD-${reason.replace(/\s+/g, '-')}  Email rejected: ${reason}`, async ({
    registrationPage,
  }) => {
    await registrationPage.enterEmail(input);
    await registrationPage.submit();
    await registrationPage.expectEmailError(/invalid/i);
  });
}
```

**Rules:**
- Use `as const` on the data array — gives you autocomplete and type safety
- TC-IDs get a `-DD-<variant>` suffix so they're traceable
- Keep the test body identical across iterations — if it diverges, split into separate tests

---

## Pattern 4 — Test requiring backend setup

**When:** A test needs a seeded user, a pre-populated cart, a scheduled appointment, etc.

**Template (using ApiHelper):**

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { ApiHelper } from '@helpers/api.helper';

test.describe('Appointments — cancel flow', () => {
  let api: ApiHelper;
  let appointmentId: string;

  test.beforeEach(async () => {
    api = new ApiHelper();
    await api.init();
    const appointment = await api.post('/appointments', {
      patientId: 'synthetic-patient-001',
      date: '2026-05-01T10:00:00Z',
    });
    appointmentId = (appointment as { id: string }).id;
  });

  test.afterEach(async () => {
    await api.delete(`/appointments/${appointmentId}`);
    await api.dispose();
  });

  test('TC-APPT-001 @smoke  Patient cancels upcoming appointment', async ({
    loggedInInventoryPage,
    // ... whatever page objects you need
  }) => {
    // Test body uses the seeded appointmentId
  });
});
```

**Notes:**
- `beforeEach` / `afterEach` keep each test independent — no shared state between tests
- Use `test.beforeAll` only for truly expensive setup that can't vary per test (rare)
- Always clean up what you create — leaking test data pollutes the environment

---

## Pattern 5 — Visual / screenshot test

**When:** The test case says "verify the UI matches the approved design" or mentions visual regression.

**Template:**

```ts
test('TC-VIS-001 @visual  Login page matches baseline', async ({ loginPage }) => {
  await expect(loginPage.page).toHaveScreenshot('login-page.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});
```

**Notes:**
- First run creates the baseline; subsequent runs compare
- `maxDiffPixelRatio` tolerates minor antialiasing differences (0.01 = 1%)
- Store baselines in `tests/__screenshots__/` — they're committed to Git
- Visual tests are platform-sensitive — run them in CI only, not locally

---

## Pattern 6 — Test that handles async UI state

**When:** A test case says "wait for the loading spinner to disappear" or "verify the results appear."

**Don't use:**
```ts
await page.waitForTimeout(3000);  // ❌ flaky, ignores reality
```

**Do use:**
```ts
// Option A — wait for a specific element (preferred)
await expect(resultsTable).toBeVisible();

// Option B — wait for URL change
await page.waitForURL(/\/results/);

// Option C — custom condition (when no selector works)
await WaitHelper.forCondition(
  async () => (await api.get('/job/status')).status === 'complete',
  { timeout: 30_000, message: 'Job did not complete' },
);
```

---

## Pattern 7 — Parametrised page object constructor

**When:** A page object varies by environment or role (e.g. admin dashboard vs user dashboard).

**Template:**

```ts
export class DashboardPage extends BasePage {
  readonly url: string;
  readonly pageIdentifier: Locator;

  constructor(page: Page, role: 'admin' | 'user' = 'user') {
    super(page);
    this.url = role === 'admin' ? '/admin/dashboard' : '/dashboard';
    // ... locators may differ too
  }
}
```

Then the fixture supplies the default, and tests that need the variant construct directly:

```ts
test('admin sees extra menu', async ({ page }) => {
  const dashboard = new DashboardPage(page, 'admin');
  await dashboard.navigate();
  // ...
});
```

---

## Pattern 8 — Tagging tests with metadata

When you need to attach info to a test (ticket ID, author, environment restriction):

```ts
test('TC-LOGIN-001 @smoke  Valid user logs in', async ({ loginPage }, testInfo) => {
  testInfo.annotations.push(
    { type: 'jira', description: 'INST-1234' },
    { type: 'author', description: 'QA-Auto' },
  );
  // test body
});
```

These annotations appear in the HTML report and can be used by custom reporters.

---

## Pattern 9 — Angular Material form validation (disabled submit button)

**When:** The app uses Angular Material (or any SPA framework) where the submit button is **disabled** when the form is invalid. This is the default Angular Material reactive-form pattern.

**The problem:** `submitForm()` / `button.click()` will wait indefinitely for the button to become enabled and then time out. You cannot submit a form to trigger validation — you must trigger validation via `blur` events instead.

**Detecting this pattern:** Look for `disabled="true"` or `mat-button-disabled` on the submit button in the error log, or `<button type="submit" [disabled]="form.invalid">` in the source. If the button is disabled when the form is empty, this pattern applies.

**How to test empty-field validation:**

```ts
// ─── Page object ─────────────────────────────────────────────────────────────

// Blur actions — trigger Angular's blur-event validation without submitting
async blurEmailField(): Promise<void> {
  await this.emailInput.focus();
  await this.page.keyboard.press('Tab');
}

async blurPasswordField(): Promise<void> {
  await this.passwordInput.focus();
  await this.page.keyboard.press('Tab');
}

// Primary assertion for "field is invalid" — button state is the reliable signal.
// Do NOT use aria-invalid as the primary signal: embedded third-party Angular forms
// (external IdP pages, white-labelled portals) often do not set it even when invalid.
async expectSubmitButtonDisabled(): Promise<void> {
  await expect(this.submitButton).toBeDisabled();
}

// Text-based assertion for malformed-input errors (e.g. "Please enter a valid email address.")
// These only appear for malformed input (e.g. "abc"), NOT for empty fields.
async expectEmailFormatError(): Promise<void> {
  await expect(this.emailError).toBeVisible();
}
```

```ts
// ─── Spec ────────────────────────────────────────────────────────────────────

test('TC-LOGIN-010  Empty email shows validation error', async ({ loginPage }) => {
  // Cannot submit — button is disabled. Blur the field to trigger validation.
  await loginPage.blurEmailField();
  await loginPage.expectSubmitButtonDisabled();   // ← reliable: button state
});

test('TC-LOGIN-013  Malformed email shows format error', async ({ loginPage }) => {
  await loginPage.enterEmail('notanemail');
  await loginPage.blurEmailField();
  await loginPage.expectEmailFormatError();        // ← reliable: text appears for malformed, not empty
});

test('TC-LOGIN-027  Validation error clears after correction', async ({ loginPage }) => {
  // Use malformed email (not empty) to trigger the visible text error first
  await loginPage.enterEmail('notanemail');
  await loginPage.blurEmailField();
  await loginPage.expectEmailFormatError();

  // Correct it — error clears reactively
  await loginPage.enterEmail(TestData.users.valid!.email);
  await loginPage.expectEmailFormatErrorGone();
});
```

**Decision tree for form-validation tests:**

```
Does the test need to see a validation error?
  └─ Is it testing an EMPTY required field?
       └─ YES → blur the field → assert submitButton.toBeDisabled()
       └─ NO (malformed input, e.g. bad email format)?
            → enter bad value → blur → assert error text is visible
Does the test need to SUBMIT the form to reach the server?
  └─ Ensure ALL required fields are filled before calling submitForm()
```

---

## Pattern 10 — Performance thresholds for external services

**When:** A test case measures response time for a feature that calls an external service (IdP, payment gateway, third-party API).

**The problem:** A fixed threshold (e.g. 5 000 ms) that is reasonable for an internal API is almost always too tight for an external OAuth/IdP provider (Azure B2C, Auth0, Keycloak, Okta) in a test environment, especially when tests run in parallel with 4+ workers. The login round-trip alone can take 3–6 s with normal network variance.

**Pattern:**

```ts
test('TC-LOGIN-004  Login completes within acceptable time', async ({ loginPage }) => {
  const start = Date.now();

  await loginPage.loginAs(TestData.users.valid!);
  await loginPage.expectOnDashboard();

  const elapsed = Date.now() - start;

  // Threshold is intentionally generous for an external IdP in the test environment.
  // External IdP round-trips vary 2–6 s; 8 s gives headroom without masking regressions.
  // Tighten if SLA is tested against a staging environment with a fixed budget.
  expect(elapsed, `Login took ${elapsed} ms — exceeds SLA`).toBeLessThanOrEqual(8_000);
});
```

**Rules:**
- Never hard-code 5 000 ms for a test that hits an external IdP. Use 8 000 ms minimum.
- Add a comment explaining the chosen threshold and when to revise it.
- If the test is measuring internal API performance (same data centre), 3 000–5 000 ms is appropriate.
- Mark genuinely flaky perf tests with `@flaky` so CI tracks them without blocking deploy.

---

## Pattern 11 — Keyboard navigation with `autofocus`

**When:** A page has `autofocus` on the first field (common on login pages). The standard "press Tab to reach the first field" approach will fail because Tab moves focus *away* from the already-focused field.

**The problem:**

```ts
// ❌ Broken when emailInput has autofocus:
// Page loads → email is already focused.
// Tab → focus moves to password, not to email.
// toBeFocused() on email immediately fails.
async verifyKeyboardNavigation(): Promise<void> {
  await this.page.keyboard.press('Tab');
  await expect(this.emailInput).toBeFocused();   // ← fails: Tab moved away
}
```

**Correct pattern:**

```ts
// ✅ Explicitly assert autofocus on page load, then Tab forward.
async verifyKeyboardNavigation(): Promise<void> {
  // Email has autofocus — assert it's focused before pressing any key
  await this.emailInput.focus();     // idempotent if already focused
  await expect(this.emailInput).toBeFocused();

  await this.page.keyboard.press('Tab');
  await expect(this.passwordInput).toBeFocused();

  await this.page.keyboard.press('Tab');
  // Note: skip disabled buttons — browsers exclude them from Tab order.
  // The next focusable element after password is the CANCEL button, not SIGN IN.
  await expect(this.cancelButton).toBeFocused();
}
```

**Rules:**
- Always use `element.focus()` to establish a known starting point before Tab navigation tests.
- Disabled buttons are excluded from the browser's Tab order — account for this when asserting Tab sequence.
- Do NOT rely on page-load autofocus behaviour as the starting condition; use explicit `.focus()` for determinism.
