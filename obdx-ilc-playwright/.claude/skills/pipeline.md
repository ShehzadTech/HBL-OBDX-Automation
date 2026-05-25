---
name: QA Pipeline
description: End-to-end pipeline definition connecting qa-test-case-writer, playwright-script-writer, and the OBDX-25.1-framework reference. Defines the flow, handoff contract, and shared conventions between the skills.
---

# QA Automation Pipeline

## Project authority — read first

**For this project (OBDX-ILC-Playwright), the `obdx-25.1-framework` skill is the authoritative reference.** It defines the project's actual folder structure, locator strategy for Oracle JET (`oj-*`) elements, OBDX-specific synchronization, and the conventions every page object and spec must follow.

The two pipeline-stage skills (`qa-test-case-writer`, `playwright-script-writer`) describe a generic Techlogix-style framework. **Where they conflict with `obdx-25.1-framework`, the OBDX skill wins** — apply OBDX conventions for file layout (top-level `pages/common/`, `pages/<module>/`, no `src/` wrapper, `PascalCase` filenames), locator patterns (Role / Label / data-testid / `oj-*` CSS, never XPath as first choice), and OBDX-specific waits (`oj-busy-context`, widget initialisation).

Use the two pipeline skills for their workflow shapes (UST → test cases → spec files; planning vs full pipeline; quality gates; selector strategy) but slot the output into the OBDX project layout, not the Techlogix `src/` layout.

## Overview

```
UST / Jira ticket / FSD / RSD / RTM
      │
      ▼
┌─────────────────────┐
│  qa-test-case-writer │  → Techlogix test case table (.md / .xlsx)
└─────────────────────┘
      │
      │  handoff (test case table)
      ▼
┌──────────────────────────────┐
│  locator-scraper (MANDATORY) │  → data/scraped/<flow>-scraped.json
│  drives live AUT happy path  │     (real DOM locators + values)
└──────────────────────────────┘
      │
      │  handoff (test case table + scraped JSON)
      ▼
┌──────────────────────────┐
│  playwright-script-writer │  → .spec.ts files + page objects
└──────────────────────────┘    (referencing ONLY scraped locators)
      │                      ↑
      │                      │  follows OBDX conventions
      │                      │  (folder layout, locators, waits)
      │                      │
      │              ┌─────────────────────┐
      │              │ obdx-25.1-framework │
      │              └─────────────────────┘
      ▼
  npm test  (Playwright runs against the app)
```

**Why the locator-scraper stage is mandatory:** FSD/RSD/RTM describes
requirements, not the rendered DOM. Skipping the scrape and inferring
locators from the requirements doc produces runtime failures — verified
on the Initiate Outward BG run (30% pass rate when locators were inferred
from FSD) vs the View Outward BG run (87% pass rate using scraped
locators).

---

## Stage 1 — qa-test-case-writer

**Input:** UST, Jira ticket ID, FSD, RSD, RTM, or feature description  
**Output:** Techlogix-standard test case table (inline Markdown + optional .xlsx)

Invoke this skill first. Do not attempt to write Playwright code directly from a requirements doc — the test case table is the required intermediate artifact.

There are two entry paths into the pipeline that both converge here:

- **Path A — new requirements (FSD / RSD / RTM):** Stage 1 produces the test case table from the requirements doc, then Stage 2 scrapes locators, then Stage 3 writes the code.
- **Path B — manual TCs already exist:** Skip Stage 1; jump straight to Stage 2 to scrape locators, then Stage 3 writes the code.

---

## Stage 2 — locator-scraper (MANDATORY)

**Input:** Test case table from Stage 1 (or existing manual TC sheet for Path B), plus live AUT credentials (`.env`).  
**Output:** `data/scraped/<flow>-scraped.json` — real DOM locators + values captured from a one-pass happy-path run.

Before any POM or spec is written, drive the live AUT through one end-to-end happy path autonomously and capture, per interacted field:

- Literal `id` (e.g. `Currency2681350`)
- Stable fallback: `[id^="Currency"]`, role + accessible-name, placeholder
- Actual value entered / selected (raw text for inputs, visible option label for dropdowns)
- Tab / SWIFT-section context
- Whether the field appeared mandatory (validation error if left blank)

**Rules:**
- Open every dropdown during the scrape — capture actual visible option labels. Never assume FSD-described values exist verbatim.
- For SWIFT / customer / account LOVs, pick whatever the live dropdown shows. Don't hard-code from the requirements doc.
- For navigation menus, capture the exact label rendered by the build (e.g. live label is `"View Outward Guarantee/Stand By LC"`, not "View Outward BG").
- If the live AUT is unreachable, stop and flag it — do not silently fall back to FSD-guessing.

Reference scraper: `scripts/scrape-<flow>.js` (see `scripts/scrape-view-outward-bg.js` for the canonical pattern).

---

## Stage 3 — Handoff contract

The test case table from Stage 1 **and** the scraped JSON from Stage 2 are the two inputs into playwright-script-writer. The script writer reads both directly — no reformatting needed.

### Required columns (all must be present and non-empty)

| Column | Used by playwright-script-writer for |
|--------|--------------------------------------|
| **Test Case ID** | `test('TC-XXX-NNN @tag  title', ...)` — the TC-ID becomes the test name prefix |
| **Test Title** | The human-readable label in the test name |
| **Preconditions** | Determines which fixture to use (`loggedInInventoryPage` vs bare `loginPage`) |
| **Test Steps** | Maps to page object method calls inside the test body |
| **Expected Result** | Maps to `expect(...)` assertions |
| **Status** | Informational only — not used in generated code |

### TC-ID format

```
TC-[FEATURE]-[NNN]
```

- `FEATURE` is a short uppercase identifier derived from the UST (e.g. `LOGIN`, `CHECKOUT`, `INV`)
- `NNN` is a zero-padded three-digit sequence (001, 002, …)
- The same ID used in the test case table must appear verbatim in the generated spec file test name

### Category → tag mapping

The category assigned internally by qa-test-case-writer maps to the `@tag` in the spec file:

| Category | Tag |
|----------|-----|
| Happy Path | `@smoke` (if primary flow) or `@regression` |
| Negative | `@regression` |
| Boundary | `@regression` |
| Edge | `@regression` |

Primary happy-path tests (typically the first one or two TC-IDs per feature) get `@smoke`. All others get `@regression`.

---

## Stage 4 — playwright-script-writer

**Input:** Test case table from Stage 1 + scraped JSON from Stage 2.  
**Output:** `.spec.ts` files and any new/extended page objects.

The skill reads both inputs, maps each TC row to a test, and generates conformant Playwright code following the Techlogix framework conventions. **Every locator in the generated POM must be backed by an entry in the scraped JSON** — if a TC references a field that wasn't captured during the scrape, mark that test `test.fixme` with a `// TODO: re-scrape …` comment instead of inventing a locator.

---

## Invoking the pipeline

### Typical session

1. Paste the UST / FSD / RSD / RTM → `qa-test-case-writer` runs automatically (Path A). For Path B, skip to step 3.
2. Review and approve test cases (answer any clarifying questions)
3. **Run the locator-scraper** against the live AUT happy path → produces `data/scraped/<flow>-scraped.json`. Verify the JSON contains real locators for every interactive field referenced by the TCs.
4. Say **"automate these"** or **"write the Playwright scripts"** → `playwright-script-writer` runs using the test cases + the scraped JSON. Generated POM/spec reference only scraped locators.
5. Review the plan the script writer produces, then approve to get the code
6. Run `npm test` to verify

### Shortcuts

| You say | What happens |
|---------|--------------|
| `"full pipeline"` | qa-test-case-writer skips its pause block and runs straight through to test cases, then you invoke the script writer |
| `"skip questions"` | Same as above |
| `"automate directly"` | playwright-script-writer skips asking you to run qa-test-case-writer first (use only when you already have test cases) |
| `"just the code"` | playwright-script-writer skips the plan confirmation step and outputs code immediately |

---

## Shared conventions

Both skills must agree on these — changing one requires updating the other.

| Convention | Value |
|------------|-------|
| TC-ID format | `TC-[FEATURE]-[NNN]` |
| Smoke tag | `@smoke` |
| Regression tag | `@regression` |
| Spec file location | `tests/specs/<feature>/<feature>.spec.ts` |
| Page object location | `src/pages/<name>.page.ts` |
| Fixture import | `@fixtures/pages.fixture` |
| Test data import | `@config/test-data` |
| Scraped locator JSON | `data/scraped/<flow>-scraped.json` (Stage 2 output, Stage 4 input) |
| Scraper script | `scripts/scrape-<flow>.js` (one per flow; pattern: `scripts/scrape-view-outward-bg.js`) |
| Test data policy | Synthetic only — no real PII, credentials, or patient data |
