# Framework Conventions

The rules of the Techlogix QA Automation Framework. Every generated script must conform.

---

## File layout

```
tests/specs/<feature>/<feature>.spec.ts       ← test files
src/pages/<name>.page.ts                      ← page objects
src/components/<name>.component.ts            ← reusable UI fragments
src/helpers/<purpose>.helper.ts               ← cross-cutting utilities
src/fixtures/pages.fixture.ts                 ← test() fixtures (single file)
src/config/{environments,test-data}.ts        ← config
test-data/<name>.json                         ← typed fixtures
```

**Where does a new file go?**
- A test for a feature → `tests/specs/<feature>/`
- A new page object → `src/pages/<name>.page.ts` (lowercase, dot-separated)
- A shared component that appears on 2+ pages → `src/components/`
- A utility used by 3+ tests → `src/helpers/`

---

## Imports — always use path aliases

Configured in `tsconfig.json`:

| Alias | Resolves to |
|-------|-------------|
| `@pages/*` | `src/pages/*` |
| `@components/*` | `src/components/*` |
| `@helpers/*` | `src/helpers/*` |
| `@fixtures/*` | `src/fixtures/*` |
| `@config/*` | `src/config/*` |
| `@types/*` | `src/types/*` |
| `@data/*` | `test-data/*` |

**Correct:**
```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';
import { DataHelper } from '@helpers/data.helper';
```

**Wrong — never use relative paths across directories:**
```ts
import { test, expect } from '../../../src/fixtures/pages.fixture';  // ❌
import { LoginPage } from '../../src/pages/login.page';               // ❌
```

Relative imports are OK *within* a directory (e.g. `import { BasePage } from './base.page'` inside `src/pages/`).

---

## Spec file anatomy

Every spec file follows this template:

```ts
import { test, expect } from '@fixtures/pages.fixture';
import { TestData } from '@config/test-data';
// Additional imports: DataHelper, AssertionHelper, etc.

/**
 * <Feature name> — <short description>
 *
 * <2-3 sentences describing coverage.>
 */

test.describe('<Feature> — <short description>', () => {
  test('TC-<FEATURE>-001 @smoke  <short title>', async ({ <fixtures> }) => {
    // Arrange
    // ...

    // Act
    // ...

    // Assert
    // ...
  });

  // More tests...
});
```

**Rules:**
- One top-level `test.describe` per file — don't nest multiple describes at the top
- File name matches feature: `tests/specs/login/login.spec.ts` → `describe('Login — ...')`
- JSDoc at top explains coverage, not every test
- Arrange / Act / Assert comments are optional but recommended for non-trivial tests

---

## Test naming

Format: `TC-<FEATURE>-<NNN> @<tag>  <description>`

- `TC-` — literal prefix
- `<FEATURE>` — uppercase feature tag: LOGIN, INV, CART, E2E, API
- `<NNN>` — 3-digit counter within the feature, zero-padded
- `@<tag>` — at least one: `@smoke` or `@regression`. Both is fine.
- Two spaces after the tag, then a **short, declarative** description (not the full acceptance criterion)

**Good:**
```
TC-LOGIN-001 @smoke  Valid user logs in and lands on inventory
TC-CART-014 @regression  Remove last item empties cart
```

**Bad:**
```
TC-1  Test login                                  ← no feature, no tag, vague
test login works @smoke                           ← missing TC ID
TC-LOGIN-001 @smoke @regression @happy-path @ui   ← tag soup
```

---

## Fixtures — when to use each

Provided by `@fixtures/pages.fixture`:

| Fixture | Use when... |
|---------|-------------|
| `loginPage` | Login itself is under test (already navigated) |
| `inventoryPage` | Inventory is under test but login is prerequisite — you'll handle login manually |
| `cartPage`, `checkoutPage` | Similar — page object available, state not pre-set |
| `loggedInInventoryPage` | Login is NOT under test — you want to start on inventory as the standard user |
| `header` | Header component (burger menu, cart icon) — composes into any authenticated page |

**Pick the right fixture.** If your test starts with `loginPage.loginAs(TestData.users.standard)` just to get to the real action, use `loggedInInventoryPage` instead.

---

## Adding a new fixture

When you create a new page object, register it in `src/fixtures/pages.fixture.ts`:

```ts
type PageFixtures = {
  loginPage: LoginPage;
  // ... existing
  productDetailsPage: ProductDetailsPage;  // ← add here
};

export const test = base.extend<PageFixtures & StateFixtures>({
  // ... existing

  productDetailsPage: async ({ page }, use) => {
    await use(new ProductDetailsPage(page));
  },
});
```

For fixtures that require setup (e.g. already-authenticated state), follow the `loggedInInventoryPage` pattern — do the setup before `use()`.

---

## Page object method naming

| Method type | Prefix | Example |
|------|------|------|
| User-intent action | verb | `login()`, `addProductToCart()`, `submitCheckoutInfo()` |
| Query / getter | `get` | `getCartItemCount()`, `getProductNames()` |
| Boolean check | `is` | `isErrorVisible()`, `isDisplayed()` |
| Assertion | `expect` | `expectCartBadgeCount()`, `expectOrderComplete()` |
| Navigation helper | verb | `openCart()`, `openProductDetails()` |

**Naming checklist:**
- Reads like a sentence? `cart.expectItemCount(3)` → "cart, expect item count 3" ✓
- Describes intent, not mechanism? `login(user, pass)` not `fillFormAndClickButton()` ✓
- Consistent with existing methods? Don't add `assertCartCount()` when the pattern is `expectCartCount()` ✓

---

## Assertions — prefer web-first

Playwright's `expect(locator)` auto-waits and auto-retries. Use it:

```ts
// ✅ Auto-waits up to 10s for the element
await expect(cartBadge).toHaveText('3');

// ❌ Race condition — element might not be there yet
expect(await cartBadge.textContent()).toBe('3');
```

When writing custom assertions on page objects, wrap web-first assertions:

```ts
async expectCartBadgeCount(expected: number): Promise<void> {
  if (expected === 0) {
    await expect(this.cartBadge).not.toBeVisible();
  } else {
    await expect(this.cartBadge).toHaveText(String(expected));
  }
}
```

---

## Test data — always go through TestData

All fixed data comes from `TestData` (backed by JSON files in `/test-data/`).

```ts
// ✅ Typed, traceable, editable in one place
await loginPage.loginAs(TestData.users.standard);

// ❌ Magic strings — who is this user? What if the password changes?
await loginPage.login('standard_user', 'secret_sauce');
```

**Adding new test data:**
1. Edit the appropriate JSON in `/test-data/`
2. Add the type to `src/config/test-data.ts` if it's a new category
3. Commit with the test that uses it

**Synthesised data** (random, per-test) comes from `DataHelper`:

```ts
import { DataHelper } from '@helpers/data.helper';

const info = DataHelper.fakeCheckoutInfo();    // fresh every run
const id = DataHelper.uniqueId('TC');          // collision-free for parallel runs
const attack = DataHelper.maliciousString();   // negative-test string
```

**Never put real patient data, real PII, or production credentials in the repo.** Not even in comments.

---

## Tags

| Tag | Meaning |
|------|------|
| `@smoke` | Must pass for any deploy. ~10-20 tests, run on every PR. |
| `@regression` | Full coverage. Run nightly and before release. |
| `@api` | API-only (no browser). Runs fast. |
| `@visual` | Visual regression. Runs in its own job. |
| `@flaky` | Known flaky — under investigation. Still runs, but tracked. |

A test can have multiple tags. `@smoke` tests are a subset of `@regression` — don't worry about duplicating.

---

## What NOT to do

These are the most common mistakes. Check against them before delivering code:

1. **No `test.skip()` / `test.only()`** in delivered code. `only` is forbidden by `forbidOnly: true` in CI config, but catch it before it lands.
2. **No `console.log()`** in specs. If you need to trace, use `test.info().annotations`.
3. **No test dependencies.** Each test sets up its own state, asserts, and cleans up (if needed). If test B assumes test A ran first, that's a bug.
4. **No external network calls** without a comment explaining why and a timeout. Tests should not depend on external services unless that's explicitly what they're testing.
5. **No `page.waitForTimeout(ms)`** unless you're commenting exactly what you're waiting for and why no selector-based wait works.
6. **No partial implementations.** If a test case references functionality not yet available (e.g. a page object that doesn't exist), either create the page object or stub the test with `test.fixme()` and a clear TODO — don't commit a broken test.

7. **No `waitForLoadState('networkidle')` in SPA tests.** Angular, React, and Vue applications maintain persistent background connections (polling, WebSockets, prefetch). `networkidle` requires zero network activity for 500 ms — in an SPA this condition is almost never met, so the call will always hit its timeout. Use targeted waits instead:

   ```ts
   // ❌ Will time out on Angular / React / Vue SPAs
   await page.waitForLoadState('networkidle');

   // ✅ Wait for the specific thing you actually care about
   await page.waitForURL(/\/dashboard/);              // URL change after navigation
   await expect(successBanner).toBeVisible();         // element that proves the action completed
   await page.waitForLoadState('domcontentloaded');   // DOM parsed — safe fallback, always fires
   ```

   If you absolutely need a short network settle (e.g. a test inspects response data after a form submit), cap the timeout and catch the error:

   ```ts
   try {
     await page.waitForLoadState('networkidle', { timeout: 5_000 });
   } catch {
     await page.waitForLoadState('domcontentloaded');
   }
   ```

   This ensures the test continues rather than hanging for 30 s.
