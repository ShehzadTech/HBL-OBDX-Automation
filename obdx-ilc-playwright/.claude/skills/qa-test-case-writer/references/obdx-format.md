# OBDX Extended Test-Case Format (HBL Trade Finance)

This format is used for the HBL OBDX Trade Finance project (`data/manual-test-cases.xlsx`).
It **extends** the 6-column Techlogix standard with 5 additional columns to match the
Initiate Import LC sheet schema. Use this format when writing test cases that will be
appended to `data/manual-test-cases.xlsx` for any OBDX module (Import LC, Export LC,
Amend, Transfer, Bank Guarantees, Collections, etc.).

## When to use this format

- Project root contains `obdx-ilc-playwright/` or `data/manual-test-cases.xlsx`.
- The user references the existing Initiate Import LC test cases as a format template.
- The user asks to append to the OBDX manual-test-cases workbook.

If both apply, use this 11-column schema **instead of** the Techlogix 6-column table.

## Column schema (exactly these, in this order)

The workbook places identity, content, and metadata columns in three groups: TC identity + content first, classification next, locator/source columns at the end.

| # | Column | Description |
|---|--------|-------------|
| 1 | **Test Case ID** | `TC-<MODULE>-<NNN>` for tab cases; `TC-<MODULE>BS-<NNN>` or `TC-BS-<NNN>` for business scenarios. Module codes seen: `IMPLC` (Initiate Import LC), `AMLC`/`AMIMP` (Amend Import LC), `EXPLC` (Export LC). Pick a non-colliding prefix when adding a new module. |
| 2 | **Scenario** | One-line scenario summary. May start with `Negative —` / `Boundary —` / `Edge —` to flag non-positive cases. |
| 3 | **Test Objective** | "Verify a maker can …" / "Verify the form rejects …" — one sentence stating intent + business reason. |
| 4 | **Pre-conditions** | Login, entitlements, existing data. Use `corpmaker2 logged in.` for the standard Maker. Dash `-` if genuinely none (only for trivial cases). |
| 5 | **Test Steps** | Numbered with `1) 2) 3) …` and `\n` between steps. Always include login + navigation. Reference data via `LC_TEST_DATA.*` rather than hard-coding. |
| 6 | **Expected Result** | Observable outcome with the OBDX system message verbatim where possible (e.g. "success message 'Transaction submitted for approval.' with OBDX reference; status = Pending for Approval."). |
| 7 | **Type** | `Positive` / `Negative`. (Boundary and Edge are still tagged via the Scenario prefix; Type stays binary to match existing sheet.) |
| 8 | **Priority** | `P1` / `P2` / `P3`. P1 = critical (login, mandatory fields, submit), P2 = important variations, P3 = nice-to-have. |
| 9 | **Source Tab** | UI tab the test belongs to (e.g. `Tab 1 — LC Details`, `Tab 2 — Goods & Shipment`) OR `Business Scenarios` for cross-tab real-world flows. |
| 10 | **Tab / Field** | Specific field or sub-section under the tab, e.g. `LC Details > Applicant`, `Tab 1 — Date of Expiry`. |
| 11 | **FSD Reference** | Page + step from the FSD document, e.g. `FSD pp.128–129 step 1–4`. Blank for business scenarios where FSD doesn't directly apply. |

> **Layout note:** Each sheet places headers in **row 0** directly (no merged title row). Section dividers (rows beginning with `■  `) appear between groups of TCs.

## Section dividers in the xlsx

The sheet uses divider rows whose first cell starts with `■  ` (filled square + 2 spaces),
e.g. `■  Tab 1 — LC Details`, `■  Business Scenarios — Initiate Import LC`. Keep this
convention when generating new sheets — it's how readers locate sections quickly.

Standard section order for any LC-flow sheet:

1. `■  Tab 1 — LC Details`
2. `■  Tab 2 — Goods & Shipment`
3. `■  Tab 3 — Documents & Conditions`
4. `■  Tab 4 — Linkages` *(only when the flow has linkages — e.g. Initiate; skip for Amend)*
5. `■  Tab 5 — Instructions`
6. `■  Tab 6 — Attachments / Submit`
7. `■  Business Scenarios — <Flow Name>`

Adapt tab numbers if the underlying flow has fewer/more tabs.

## Test data conventions

- **Login:** `corpmaker2 / Admin@131` for Maker; `corpchecker2` for Checker (when in scope).
- **Test data references:** `LC_TEST_DATA.product`, `.beneficiaryName`, `.lcCurrency`,
  `.lcAmount`, `.swiftCode`, `.dateOfExpiry`, `.placeOfExpiry`, `.placeOfTaking`,
  `.finalDestination`, `.goodsType` — these point at `data/lcTestData.ts`.
- **Concrete values** are used only when the scenario hinges on the value itself
  (e.g. `Currency = EUR; LC Amount = 25,000` for a multi-currency test, `Tolerance = 5`
  for a tolerance scenario). Default everything else to `LC_TEST_DATA.*`.
- **Counterparty:** existing test counterparty `Shehzad` is referenced when needed.
- **40A:** default `IRREVOCABLE` unless the test is specifically about Type variation.

## Maker-only vs full-flow scope

When the user asks for **Maker-only** test cases, scope ends at the success-message
screen ("Transaction submitted for approval." + reference number + status =
`Pending for Approval`). Skip:

- Back-office approval steps (1-to-5 approver chain)
- Revert-to-Maker / approver-rejection paths
- TI-system handoff
- Checker approval (in OBDX-corporate dual-control)

These belong to a separate sheet/section (e.g. `Approval Flows`) and should be authored
under their own scope.

## Appending to the workbook

Use a Node script modelled on `scripts/append-trade-finance-tcs.js`:

- Read the workbook with `xlsx` (SheetJS community).
- Build a new sheet (or append to an existing one) using `XLSX.utils.aoa_to_sheet`.
- Preserve the 11-column header row.
- Insert section dividers as single-cell rows whose first cell starts with `■  `.
- **Heads-up:** SheetJS community edition does NOT preserve cell styling
  (colors, borders, merged cells) on read+write. Values are preserved, formatting is not.
  Always create a backup (`data/manual-test-cases.backup.xlsx`) before overwriting.

## Inline-preview format (for user review before xlsx generation)

When showing test cases inline for review, use Markdown tables grouped under section
divider headings (e.g. `### ■ Tab 1 — LC Details`). Keep all 11 columns visible. After
the user approves, run the append/write script — never write to xlsx without explicit
approval when the user has asked to review first.
