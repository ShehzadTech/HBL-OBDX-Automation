# Examples — Test Cases to Spec Files

Three worked examples showing end-to-end transformations. Study these before writing your first spec.

---

## Example 1 — Simple positive case

### Input (test case)

| Field | Value |
|------|------|
| **TC ID** | TC-PROVLOGIN-001 |
| **Title** | Valid provider credentials log in and land on dashboard |
| **Preconditions** | A notblocked provider account exists in the test environment |
| **Steps** | 1. Navigate to the instED Provider Portal login page 2. Enter valid email 3. Enter valid password 4. Click SIGN IN |
| **Expected** | Browser navigates to `/after-login`. Dashboard header is visible. |

### Plan

```
Fixtures needed:  instedLoginPage (handles navigation)
Page objects:     InstedLoginPage exists — no changes needed
Test data:        TestData.instedUsers.notblocked — existing
New files:        tests/specs/insted-login/insted-login.spec.ts (append)
```

### Output

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';

test.describe('instED Provider Login — authentication flows', () => {
  test('TC-PROVLOGIN-001 @smoke  Valid provider credentials log in successfully', async ({
    instedLoginPage,
  }) => {
    // Arrange — instedLoginPage is already navigated by the fixture

    // Act
    await instedLoginPage.loginAs(TestData.instedUsers.notblocked!);

    // Assert
    await instedLoginPage.expectOnDashboard();
  });
});
```

### Notes on the transformation

- **Step 1 → no explicit code.** The `instedLoginPage` fixture navigates before the test body runs.
- **Steps 2–4 → `loginAs()`.** Encapsulates field fill + button click. Never fill fields individually in a spec.
- **Expected → `expectOnDashboard()`.** The page object method asserts the URL and/or a stable dashboard element. No raw `waitForURL` in the spec.

---

## Example 2 — Negative case (Angular Material form validation)

### Input

| Field | Value |
|------|------|
| **TC ID** | TC-PROVLOGIN-010 |
| **Title** | Empty email field shows validation state |
| **Preconditions** | User is on the instED Provider Portal login page |
| **Steps** | 1. Leave Email field empty 2. Click on Email field then Tab away to trigger blur |
| **Expected** | SIGN IN button remains disabled. Form is in an invalid state. |

### Plan

```
Fixtures needed:  instedLoginPage
Page objects:     InstedLoginPage — needs blurEmailField(), expectSignInButtonDisabled()
Test data:        None (empty field test)
Angular Material note: Submit button is disabled when form is invalid.
                  submitForm() will hang on a disabled button — use blur-based validation instead.
```

### Output

```ts
import { test, expect } from '@fixtures/pages.fixture';

test.describe('instED Provider Login — form validation', () => {
  test('TC-PROVLOGIN-010 @regression  Empty email keeps SIGN IN button disabled', async ({
    instedLoginPage,
  }) => {
    // Act — blur the email field without entering a value
    await instedLoginPage.blurEmailField();

    // Assert — button state is the reliable validation signal for Angular Material forms
    await instedLoginPage.expectSignInButtonDisabled();
  });
});
```

### Notes

- **Why not `submitForm()`?** Angular Material disables the submit button when the form is invalid. Calling `click()` on a disabled button waits indefinitely and times out. Always use `blurEmailField()` + `expectSignInButtonDisabled()` for empty-field validation tests.
- **Why not `aria-invalid`?** Embedded third-party Angular forms (Azure B2C, white-labelled portals) often do not set `aria-invalid`, even when the field is visibly invalid. `toBeDisabled()` on the button is always reliable.
- See **Pattern 9** in `code-patterns.md` for the full Angular Material validation decision tree.

---

## Example 3 — Negative case using synthesised attack input

### Input

| Field | Value |
|------|------|
| **TC ID** | TC-PROVLOGIN-015 |
| **Title** | Malicious input does not bypass authentication |
| **Preconditions** | User is on the instED Provider Portal login page |
| **Steps** | 1. Enter a known attack payload in Email 2. Enter the same payload in Password 3. Attempt to submit |
| **Expected** | No authentication. User remains on login page. No server error. |

### Plan

```
Fixtures needed:  instedLoginPage
Page objects:     InstedLoginPage — uses blurEmailField() to trigger validation
Test data:        DataHelper.maliciousString() — centralised attack payload
Security note:    This is a negative test; the string is synthesised — never use real attack data.
```

### Output

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { DataHelper } from '@helpers/data.helper';

test.describe('instED Provider Login — security', () => {
  test('TC-PROVLOGIN-015 @regression  Malicious input does not bypass auth', async ({
    instedLoginPage,
  }) => {
    // Synthesised attack string — DataHelper keeps payloads centralised
    await instedLoginPage.enterEmail(DataHelper.maliciousString());
    await instedLoginPage.blurEmailField();

    // Assert — button disabled (form invalid) or user stays on login page
    await instedLoginPage.expectSignInButtonDisabled();
  });
});
```

### Notes

- `DataHelper.maliciousString()` keeps attack payloads in one place. If a new payload is needed, update the helper — all tests benefit.
- The assertion focuses on outcome (cannot proceed) not mechanism (which validator fired).

---

## Counter-examples — what NOT to produce

### ❌ Bad example 1 — raw selectors in spec

```ts
// DO NOT DO THIS
test('TC-PROVLOGIN-001', async ({ page }) => {
  await page.goto('https://portal.example.com/login');
  await page.locator('input[type="email"]').fill('user@example.com');
  await page.locator('input[type="password"]').fill('password123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/after-login/);
});
```

Problems: no TC description, no tag, hard-coded URL, raw selectors, magic credentials. If you ever write this, stop and put it all in a page object.

### ❌ Bad example 2 — page object method that's too low-level

```ts
// DO NOT ADD METHODS LIKE THIS TO PAGE OBJECTS
async clickSignInButton(): Promise<void> {
  await this.signInButton.click();
}
async fillEmail(value: string): Promise<void> {
  await this.emailInput.fill(value);
}
```

Problems: these just wrap a single Playwright call with nothing added. Aggregate into `loginAs(user)` or `enterEmail(value)` + a combined action instead.

### ❌ Bad example 3 — submitting a disabled Angular Material form

```ts
// DO NOT DO THIS for empty-field validation
test('TC-PROVLOGIN-010', async ({ instedLoginPage }) => {
  // ❌ SIGN IN is disabled when form is empty — this will hang and time out
  await instedLoginPage.submitForm();
  await expect(instedLoginPage.emailError).toBeVisible();
});
```

Fix: use `blurEmailField()` + `expectSignInButtonDisabled()`. See Pattern 9 in `code-patterns.md`.

---

## Common translation patterns

| Test case language | Spec code |
|------|------|
| "Navigate to the login page" | Handled by the fixture — no code |
| "Enter 'X' in the Y field" | Method on the page object (`loginAs(user)`, `enterEmail(X)`, etc.) |
| "Click the Z button" | Usually included in the action method above |
| "Leave field empty and Tab away" | `await page.blurEmailField()` — NOT `submitForm()` |
| "Verify the W message appears" | `await <pageObject>.expect...()` — page object assertion method |
| "Wait for the results to load" | `await expect(<locator>).toBeVisible()` — never `waitForTimeout` |
| "User should stay on login page" | `await <pageObject>.expectStayOnLogin()` |
| "The URL should be /after-login" | `await <pageObject>.expectOnDashboard()` — via the page object |
