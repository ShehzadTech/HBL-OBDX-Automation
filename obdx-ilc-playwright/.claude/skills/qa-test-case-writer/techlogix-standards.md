# Techlogix QA Standards — Reference

Full reference for test case format, naming conventions, and data handling rules used by the Techlogix QA team working on the instED programme.

## Test case table format

Every test case produced must use exactly this column structure:

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |

### Column rules

**Test Case ID**

- Format: `TC-[FEATURE]-[NNN]`
- `TC-` is a literal prefix (always uppercase)
- `FEATURE` is a short uppercase identifier derived from the feature being tested. Common examples:
  - `TC-LOGIN-001` — login-related test cases
  - `TC-PROFILE-001` — user profile test cases
  - `TC-APPT-001` — appointment booking
  - `TC-INCIDENT-001` — incident report
  - `TC-DISPATCH-001` — dispatcher workflows
- `NNN` is a zero-padded 3-digit sequence number starting at 001
- IDs must be unique within a test case set
- When enriching existing test cases, preserve original IDs. Only assign new IDs to net-new test cases.

**Test Title**

- Short description of *what* is being tested (the action or scenario)
- NOT the expected outcome
- Good: "Valid credentials login"
- Good: "Login with email containing special characters"
- Bad: "User successfully logs in" (that's the outcome, not the test)
- Bad: "Login test" (too generic)

**Preconditions**

- Required on every test case. Never blank, never "none".
- Must specify what state the system must be in before the test can run
- Include:
  - User role / permissions if relevant
  - Data that must exist in the database
  - Environment flags or feature toggles
  - External system state (integrations up, mocks in place, etc.)
  - Browser, device, or network conditions if they affect the test
- Good: "Registered patient account exists with email `test.patient@example.com`. Account is in Active status. Patient portal is accessible."
- Bad: "User exists"

**Test Steps**

- Numbered list (1, 2, 3…)
- Each step must be specific and actionable
- Include *what* to click, *where* it is, and *what* data to enter
- Good:
  1. Navigate to `/portal/login`
  2. Enter `test.patient@example.com` in the Email field
  3. Enter `TestPass!2024` in the Password field
  4. Click the "Log In" button in the top-right of the form
- Bad:
  1. Go to login page
  2. Enter credentials
  3. Click login

**Expected Result**

- Must be observable — a tester must be able to verify it with their own eyes, or with a deterministic check
- Include concrete UI indicators, URL paths, data changes, or API responses
- Good: "User is redirected to `/portal/dashboard`. The header displays the logged-in user's first name. The 'Last login' timestamp in the profile dropdown updates to the current time."
- Bad: "Login works"
- Bad: "User can access dashboard" (what does "can access" mean observably?)

**UST wording preservation (applies to Expected Result, and also to Preconditions and Test Steps where relevant)**

Where the UST provides specific language for what happens — phrases in quotes, text labelled "System Response" or "Displays…", validation message text, button or field labels — that language must appear in the test case verbatim. Augment with observable detail (URL, visible UI state, data changes) but do not replace the UST phrase with rephrased prose.

- Good:
  - *UST: "Displays the Company Type page"*
  - *Expected Result: "System displays the Company Type page. URL navigates to /company-type. Definition, overview, basic requirements, fee structure, and documentary requirements sections are visible."*
- Bad:
  - *Expected Result: "The Company Type guidance page for Section 42 is shown, including all required informational sections for the user."*
  - *(Loses the UST phrase "Displays the Company Type page" — traceability back to the UST is broken.)*

The same rule applies to Preconditions and Test Steps where the UST supplies specific phrasing for user actions (e.g. UST says "Applicant clicks 'Proceed'" → the Test Step uses "Click 'Proceed'", not "Advance to next section"). This matters for every project but especially for regulated-domain clients, who review test cases against UST text for traceability and compliance evidence.

**Category**

- Assigned to every test case internally but is **not** a visible column in the output. Category drives the grouping structure in the xlsx and Markdown output.
- Must be one of four values:
  - **Happy Path** — valid inputs, correct preconditions, expected successful outcome
  - **Negative** — invalid inputs, missing mandatory fields, unauthorised access, blocked actions
  - **Boundary** — at, just below, or just above a defined numeric or time limit (character counts, thresholds, SLA windows, similarity percentages)
  - **Edge** — unusual but reachable conditions: mid-flow state changes, concurrent actors, integration failures, data-wipe triggers, PIN invalidation after edits
- When in doubt between Negative and Edge: if a tester could trigger it with a simple invalid input, it's Negative. If it requires a specific sequence of valid actions or an environmental condition, it's Edge.

**Status**

- Defaults to "Not Executed" on all newly generated test cases
- Values: "Not Executed", "Passed", "Failed", "Blocked", "Skipped"
- For AI-generated output, always use "Not Executed"

## Syntax and format rules

**Never use Given/When/Then.** That's Cucumber `.feature` file syntax, which is a separate artefact used in Week 4 onward for automation. Test cases use the table format exclusively.

**Tables in Markdown.** When output renders as Markdown, use pipe-separated tables with the original 6 columns. Group test cases under bold category headings (e.g. `**Happy Path**`) rather than adding a column.

**Test cases in xlsx are grouped by Category — no Category column.** Within Sheet 1, rows are sorted Happy Path → Negative → Boundary → Edge. A coloured group-header row precedes each section showing the category name in ALL CAPS and the case count (e.g. `HAPPY PATH  (28 test cases)`). The group header provides all the visual categorisation — there is no separate Category column in the data rows. Colour coding for group-header rows: Happy Path = `#B8D9AF`, Negative = `#F0AAAA`, Boundary = `#FFE380`, Edge = `#A8C8F0`.

**One test case per row.** Do not combine multiple scenarios into one test case. If a test has conditional branches ("if A happens, verify X; if B happens, verify Y"), split it into separate test cases.

## Data handling rules

**Synthetic data only.** Never paste real patient data, real credentials, real identifiers, real medical record numbers, or real names of people or organisations into prompts or test cases.

**Synthetic data patterns:**

- Names: use clearly fake but realistic-feeling names (`Test Patient`, `Sample User`, `Demo Paramedic`)
- Emails: use `@example.com` domain (`test.patient@example.com`, `demo.admin@example.com`)
- Phone numbers: use `555` prefix
- Medical Record Numbers: use a fake prefix like `TEST-MRN-` or `DEMO-`
- Dates of birth: use obviously synthetic dates (`1990-01-01`)

**Domain flexibility.** The synthetic-data rule applies to any confidential domain — healthcare, finance, PII-containing systems. It's not HIPAA-specific; treat it as a general practice.

## Coverage expectations

A good test case set for a typical UST includes, at minimum:

- **Positive scenarios** — the happy path for each acceptance criterion
- **Negative scenarios** — what happens when inputs are invalid, missing, or malformed
- **Boundary scenarios** — exactly at the limits (minimum/maximum values, edge of allowed ranges)
- **Edge scenarios** — unusual but possible conditions (concurrent sessions, network interruption, permission changes mid-flow)

For features with state transitions, roles, or permissions, additional coverage categories apply:

- **Role-based variants** — same action attempted by different user roles
- **Invalid state transitions** — attempting actions when the system is in a state that should prevent them
- **Concurrent actor scenarios** — multiple users acting on the same resource

## Acceptance criteria mapping

Every acceptance criterion in the UST should be covered by at least one test case. When producing Coverage Notes, include a brief mapping:

```
AC #1 covered by: TC-LOGIN-001, TC-LOGIN-002, TC-LOGIN-005
AC #2 covered by: TC-LOGIN-003, TC-LOGIN-004
AC #3 covered by: TC-LOGIN-008, TC-LOGIN-009
AC #4 covered by: TC-LOGIN-010
AC #5 covered by: TC-LOGIN-011, TC-LOGIN-012
```

If an AC has no test cases mapped to it, that's a coverage gap and should be flagged prominently.

## Output length expectations

For typical USTs with 4–6 acceptance criteria, expect 15–30 test cases in the final output. Going significantly below 15 usually means missed coverage. Going much above 30 usually means the UST is large enough to warrant splitting, or test cases are being duplicated at different levels of specificity.

## When standards conflict with user instruction

If the user explicitly asks for something that conflicts with these standards (e.g. "give me test cases in Given/When/Then format"), explain briefly why the standard differs ("Test cases use the 5-column table format at Techlogix; Given/When/Then is reserved for Cucumber `.feature` files in Week 4's automation track") and offer the compliant format. Don't refuse — offer the right thing plus a short explanation.
