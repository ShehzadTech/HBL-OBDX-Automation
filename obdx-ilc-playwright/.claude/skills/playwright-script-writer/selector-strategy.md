# Selector Strategy

The single biggest cause of flaky Playwright tests is bad selectors. This document is the priority order, with the reasoning behind it.

---

## Priority order

Always pick the highest-priority option that works. Drop down the list only when the one above is unavailable.

### 1. `data-test` / `data-testid` attributes — **preferred**

```ts
page.locator('[data-test="login-button"]')
page.locator('[data-testid="cart-badge"]')
```

**Why first:**
- Stable — dev changes to styling, copy, or structure don't break them
- Explicit — they exist specifically for testing, so developers know not to remove them
- Framework-agnostic — works with React, Vue, Angular, vanilla

**When to use:** Any time the element has one. If the app under test doesn't have them, flag it and recommend adding them. Meanwhile, fall through to the next option.

### 2. `getByRole()` — semantic, accessible

```ts
page.getByRole('button', { name: 'Login' })
page.getByRole('textbox', { name: 'Username' })
page.getByRole('heading', { level: 1 })
```

**Why second:**
- Rewards accessible markup (buttons should be `<button>`, not `<div onclick>`)
- Stable across visual redesigns — the role of a button is a button
- Readable — tests double as accessibility smoke checks

**When to use:** Interactive elements (buttons, links, form controls, headings, dialogs).

**Available roles:** `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `option`, `heading`, `list`, `listitem`, `dialog`, `alert`, `tab`, `tabpanel`, `menu`, `menuitem`, and many more.

### 3. `getByLabel()` — form fields

```ts
page.getByLabel('Email address')
page.getByLabel(/password/i)
```

**Why third:**
- Matches how screen readers find fields — if accessibility is broken, this breaks too, which is a useful signal
- Survives DOM restructuring as long as the `<label for="...">` relationship is preserved

**When to use:** Form inputs where a visible label is associated with the field.

### 4. `getByText()` / `getByPlaceholder()` — text-based

```ts
page.getByText('Welcome back')
page.getByText(/^Your cart is empty$/)       // exact match via regex
page.getByPlaceholder('Search products')
```

**Why fourth:**
- Copy changes more often than IDs or roles
- Internationalisation breaks these
- Regex lets you handle minor variations

**When to use:** When there's no test ID, the element isn't interactive (so no role), and it has stable, distinctive text.

### 5. CSS selectors — last resort structural

```ts
page.locator('.inventory_item:nth-child(3)')
page.locator('table.results tbody tr')
```

**Why fifth:**
- Break whenever the DOM structure, class names, or Tailwind utilities change
- Tie tests to implementation details, not user behaviour

**When to use:** Lists of similar items with no individual test IDs, table rows, complex structural queries. Prefer `.filter()` chains over long descendant selectors.

### 6. XPath — avoid

```ts
page.locator('xpath=//div[@class="card"][3]/button')   // ❌
```

**Why last:**
- Hardest to read
- Most sensitive to DOM changes
- No advantage over CSS for 99% of cases

**When to use:** Only when you need something CSS genuinely can't express (following-sibling axis, text-with-context-parent). In 6 years you might need it twice.

---

## Composing selectors — `.filter()`

When a base selector matches multiple elements, narrow with `.filter()` rather than writing a more complex single selector:

```ts
// ✅ Readable, composable
const cartItems = page.locator('.cart_item');
const backpackItem = cartItems.filter({ hasText: 'Sauce Labs Backpack' });
await backpackItem.getByRole('button', { name: 'Remove' }).click();

// ❌ Hard to read, hard to debug
await page.locator('.cart_item:has-text("Sauce Labs Backpack") button:has-text("Remove")').click();
```

---

## Dynamic / generated selectors

**Good pattern** — parametrised method on the page object:

```ts
class CartPage extends BasePage {
  async removeItem(productId: string): Promise<void> {
    await this.page.locator(`[data-test="remove-${productId}"]`).click();
  }
}

// Usage in test:
await cartPage.removeItem('sauce-labs-backpack');
```

The selector is dynamic, but the *method* is stable. Tests never see the template string.

---

## Worked examples

### Example 1 — Login button

HTML:
```html
<input id="login-button" type="submit" value="Login" class="btn btn_action">
```

- ✓ `page.locator('[data-test="login-button"]')` — if a `data-test` were present
- ✓ `page.getByRole('button', { name: 'Login' })` — works (input[type=submit] has button role)
- ~ `page.locator('#login-button')` — works but ties to implementation
- ✗ `page.locator('.btn.btn_action')` — fragile, matches all action buttons

**Pick:** The `getByRole` version.

### Example 2 — Error message in a banner

HTML:
```html
<h3 data-test="error">Epic sadface: Username and password do not match any user in this service</h3>
```

- ✓ `page.locator('[data-test="error"]')` — stable, explicit
- ~ `page.getByText(/Epic sadface/)` — works but couples to copy
- ✗ `page.locator('h3.error')` — brittle

**Pick:** The `data-test` selector.

### Example 3 — Nth product card

HTML:
```html
<div class="inventory_item">...</div>
<div class="inventory_item">...</div>
<div class="inventory_item">...</div>
```

- ✓ `page.locator('.inventory_item').nth(2)` — structural, but OK for a list
- ✓ `page.locator('.inventory_item').filter({ hasText: 'Backpack' })` — better, content-based
- ✗ `page.locator('.inventory_item:nth-child(3)')` — tied to CSS position

**Pick:** The `.filter()` version — survives re-ordering.

---

## Angular Material / SPA gotchas

Angular Material and similar component libraries frequently break the assumed role-to-HTML mapping. Know these before writing selectors.

### Navigation items rendered as `<button>`, not `<a>`

Angular Material's `<button mat-button>` is used for both actions and navigation-style links. A "Forgot your password?" element that looks like a link in the UI is almost certainly `<button>` in the DOM.

```ts
// ❌ Will fail — Angular Material renders this as <button>, not <a>
page.getByRole('link', { name: 'Forgot your password?' })

// ✅ Role-agnostic — works regardless of element type
page.getByText('Forgot your password?')
```

Rule: any clickable element that looks like a styled text link in an Angular Material app — use `getByText()` unless you have confirmed it is a genuine `<a>` element.

### Visual headings may not be semantic headings

Page section titles styled to look like `<h2>` are often `<span class="heading">` or `<b>` in SPAs. `getByRole('heading')` will return nothing.

```ts
// ❌ Will fail — "Account Locked" is a styled <b>, not an <h*> element
page.getByRole('heading', { name: 'Account Locked' })

// ✅ Text-based — works regardless of element type
page.getByText('Account Locked').first()
```

Rule: if you cannot confirm the semantic element from a DOM snippet or screenshot, prefer `getByText()` over `getByRole('heading')` for SPA content.

### `aria-invalid` may not be set by non-standard Angular forms

Standard Angular Material reactive forms do set `aria-invalid="true"` on touched invalid inputs. However, embedded third-party Angular forms (external IdP login pages, white-labelled portals, custom form libraries) often do not — even when the field is visibly invalid. Never rely on `aria-invalid` without confirming it from the live DOM.

Instead, use the disabled state of the submit button as the primary assertion signal when the form is in an invalid state (see **Pattern 9** in `code-patterns.md`).

---

## Quick checklist before shipping a selector

1. Does it use a `data-test` / `data-testid`? ✓ ship it
2. If not: Is it role-based (`getByRole`)? ✓ ship it
3. If not: Is the text content stable and unique? ✓ OK, ship it with a regex
4. If not: Are you selecting by class or structure? Flag it — this test will break sooner than it should
5. XPath? Stop. Almost certainly there's a better way.
