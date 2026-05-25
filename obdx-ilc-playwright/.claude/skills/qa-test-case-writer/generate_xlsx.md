# XLSX Export — Specification & Script

Full spec for producing downloadable `.xlsx` files from QA skill output. Read this before generating the first xlsx in a conversation.

## When to generate an xlsx

Produce an xlsx for these workflows:
- **Full pipeline** — always, unless user explicitly opts out
- **Enricher** — always, unless user explicitly opts out
- **Targeted** — only if the output contains ≥3 test cases
- **Planning only** — never (no test cases to export)
- **Follow-up** — only if the user explicitly asks for an updated xlsx

## Default behaviour: inline + xlsx

By default, produce **both** the inline Markdown output (for quick reading in chat) **and** the xlsx download. The user sees the content immediately and can also download for Jira import.

## Override: xlsx only

If the user says any of:
- "just give me the file"
- "file only"
- "skip the preview"
- "no inline"
- "xlsx only"

Produce ONLY the xlsx and a one-line confirmation. Do not inline the table.

## File structure

Each xlsx contains **exactly two sheets**:

1. **Sheet 1: `Test Cases`** — the test case table
2. **Sheet 2: `Plan & Notes`** — everything else (plan summary, clarifying questions, assumptions, coverage notes)

### Sheet 1: Test Cases

Columns (in exact order):

| Column | Header | Column letter | Width |
|--------|--------|---------------|-------|
| 1 | Test Case ID | A | 18 |
| 2 | Test Title | B | 35 |
| 3 | Preconditions | C | 45 |
| 4 | Test Steps | D | 55 |
| 5 | Expected Result | E | 50 |
| 6 | Status | F | 15 |

**Grouping (mandatory):** Rows in Sheet 1 are sorted and grouped by Category in this order: Happy Path → Negative → Boundary → Edge. Category is **not** a visible column — grouping is conveyed entirely via coloured group-header rows. Before the first row of each category group, insert a full-width group-header row spanning all 6 columns. The group-header row shows the category name in ALL CAPS and the case count (e.g. `HAPPY PATH  (28 test cases)`):

| Category | Group-header fill | Text colour |
|----------|------------------|-------------|
| Happy Path | `#B8D9AF` (mid green) | `#1E5C14` (dark green) |
| Negative | `#F0AAAA` (mid red) | `#8B0000` (dark red) |
| Boundary | `#FFE380` (mid yellow) | `#7D5A00` (dark amber) |
| Edge | `#A8C8F0` (mid blue) | `#1A3F6F` (dark blue) |

Group-header rows use bold 11pt font in the category text colour. Do **not** apply alternating grey fill (`#F5F5F5`) on data rows — the group headers provide all necessary visual separation.

**Other formatting:**
- Column header row: bold, white text on `#9D1E20` (Techlogix red) background
- Column header row height: 30pt
- Column header row frozen (freeze panes at A2)
- Data rows: wrap text enabled, vertical alignment top
- Data row height: auto (let Excel calculate based on wrapped content)
- Thin grey borders around all populated cells

**Test Steps cell:** preserve numbered list formatting using newline characters. So "1. Navigate to /portal/login\n2. Enter email\n3. Click Log In" renders as three lines within a single cell.

### Sheet 2: Plan & Notes

A single-column layout with section headers and content. Not a table — more like a document.

Structure:

```
Row 1:  [Bold header 16pt, red bg] TEST PLAN SUMMARY
Row 2:  [Bold 12pt] Functional scope:
Row 3:  [Normal 11pt, wrapped] <scope text>
Row 4:  [blank]
Row 5:  [Bold 12pt] Acceptance criteria breakdown:
Row 6+: [Normal 11pt] 1. <AC text>
        [Normal 11pt] 2. <AC text>
        ...
Row N:  [blank]
Row N+1:[Bold 12pt] Test scenarios by category:
Row N+2:[Italic 11pt] Positive:
Row N+3:[Normal 11pt] <scenario list>
Row N+4:[Italic 11pt] Negative:
        ...

Then the same pattern for:
- [Bold header 16pt, red bg] CLARIFYING QUESTIONS
- [Bold header 16pt, red bg] ASSUMPTIONS MADE
- [Bold header 16pt, red bg] COVERAGE NOTES
```

**Column width on Sheet 2:** A = 100 (wide, to let text wrap nicely).

## Filename convention

Choose the filename based on what's available, in this priority order:

1. **If fetched via Atlassian MCP** — use the Jira ticket ID:
   `TestCases_INST-1234_20260420.xlsx`

2. **Otherwise** — derive a FEATURE identifier from the UST title:
   `TestCases_PatientPortalLogin_20260420.xlsx`
   
   Rules for deriving FEATURE:
   - Use PascalCase
   - Maximum 30 characters
   - No spaces, no special characters
   - Drop articles ("the", "a", "an")

3. **Date format:** `YYYYMMDD` (today's date in the Claude environment)

## Generating the xlsx — Python script

Use this script pattern. Call it via the code execution tool. Adjust the variables at the top for each invocation.

```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from pathlib import Path

# ============================================================
# Configure these per UST:
# ============================================================

OUTPUT_DIR = Path("/mnt/user-data/outputs")
FILENAME = "TestCases_PatientPortalLogin_20260420.xlsx"  # adjust per UST

# Test cases data — list of dicts.
# "category" must be one of: "Happy Path", "Negative", "Boundary", "Edge"
# Category is used for grouping only — it does NOT appear as a visible column.
test_cases = [
    {
        "id": "TC-LOGIN-001",
        "title": "Valid credentials login",
        "preconditions": "Active patient account exists with email test.patient@example.com and password TestPass!2024. User not currently logged in.",
        "steps": "1. Navigate to /portal/login
2. Enter test.patient@example.com in Email field
3. Enter TestPass!2024 in Password field
4. Click Log In button",
        "expected": "User is redirected to /portal/dashboard. Header displays patient's first name. Dashboard shows up to 5 upcoming appointments.",
        "category": "Happy Path",
        "status": "Not Executed",
    },
    {
        "id": "TC-LOGIN-002",
        "title": "Invalid password — single attempt",
        "preconditions": "Active patient account exists. Account is not currently locked.",
        "steps": "1. Navigate to /portal/login
2. Enter test.patient@example.com
3. Enter WrongPassword!
4. Click Log In",
        "expected": "User remains on /portal/login. Error: 'Invalid email or password'. Failed attempt counter increments to 1.",
        "category": "Negative",
        "status": "Not Executed",
    },
    # ... more test cases
]

# Plan & Notes sections — populate what's relevant, omit what isn't
plan_summary = {
    "functional_scope": "Authentication flow for returning patients on the Patient Portal...",
    "acceptance_criteria": [
        "Users enter valid registered email and password",
        "On successful login, user is redirected to /portal/dashboard",
        "After 3 failed attempts, account locks for 15 minutes",
        "Forgot Password link initiates password reset",
        "20 min inactivity logs user out",
    ],
    "scenarios": {
        "Happy Path": "Valid credentials login, dashboard load, show/hide password toggle, forgot password link",
        "Negative": "Invalid email, invalid password, non-existent account, locked account login attempt",
        "Boundary": "Exactly 3 failed attempts (triggers lockout), exactly 20 min inactivity, exactly 15 min lockout",
        "Edge": "Network interruption mid-login, concurrent login from two devices, browser back after logout",
    },
    "test_data": "1x active registered patient account (synthetic). 1x locked account. Pre-configured invalid emails. Test email inbox for reset emails.",
    "dependencies": "OAuth 2.0 identity provider reachable. Email service for reset. Session store backend.",
    "privacy": "All test accounts use synthetic data only.",
}

clarifying_questions = [
    ("What email address receives the lockout notification, if any?",
     "Affects whether we test for a notification email alongside the UI lockout state."),
    # ... more
]

assumptions_made = [
    "Account lockout is client-side visible (user sees 'Account locked' message), not silent",
    # ... more
]

coverage_notes = {
    "ac_mapping": [
        ("AC #1 (valid credentials)", "TC-LOGIN-001"),
        ("AC #2 (dashboard redirect)", "TC-LOGIN-001"),
    ],
    "not_tested": [
        "MFA / 2FA scenarios — waiting on Clarifying Question #5",
    ],
}

# ============================================================
# Generation — do not edit below this line
# ============================================================

CATEGORY_ORDER = ["Happy Path", "Negative", "Boundary", "Edge"]

GROUP_HDR_FILLS = {
    "Happy Path": PatternFill(start_color="B8D9AF", end_color="B8D9AF", fill_type="solid"),
    "Negative":   PatternFill(start_color="F0AAAA", end_color="F0AAAA", fill_type="solid"),
    "Boundary":   PatternFill(start_color="FFE380", end_color="FFE380", fill_type="solid"),
    "Edge":       PatternFill(start_color="A8C8F0", end_color="A8C8F0", fill_type="solid"),
}
GROUP_HDR_FONTS = {
    "Happy Path": Font(bold=True, size=11, name="Calibri", color="1E5C14"),
    "Negative":   Font(bold=True, size=11, name="Calibri", color="8B0000"),
    "Boundary":   Font(bold=True, size=11, name="Calibri", color="7D5A00"),
    "Edge":       Font(bold=True, size=11, name="Calibri", color="1A3F6F"),
}

RED_FILL     = PatternFill(start_color="9D1E20", end_color="9D1E20", fill_type="solid")
WHITE_BOLD   = Font(color="FFFFFF", bold=True, size=12, name="Calibri")
SEC_HDR_FONT = Font(color="FFFFFF", bold=True, size=14, name="Calibri")
BOLD_FONT    = Font(bold=True, size=11, name="Calibri")
ITALIC_FONT  = Font(italic=True, size=11, name="Calibri")
NORMAL_FONT  = Font(size=11, name="Calibri")
WRAP_TOP     = Alignment(wrap_text=True, vertical="top", horizontal="left")
HDR_ALIGN    = Alignment(horizontal="center", vertical="center", wrap_text=True)
THIN_BORDER  = Border(
    left=Side(style="thin", color="CCCCCC"),
    right=Side(style="thin", color="CCCCCC"),
    top=Side(style="thin", color="CCCCCC"),
    bottom=Side(style="thin", color="CCCCCC"),
)

wb = openpyxl.Workbook()

# ---------- Sheet 1: Test Cases ----------
ws1 = wb.active
ws1.title = "Test Cases"

headers = ["Test Case ID", "Test Title", "Preconditions", "Test Steps", "Expected Result", "Status"]
widths  = [18, 35, 45, 55, 50, 15]
NUM_COLS = len(headers)

for col_idx, (header, width) in enumerate(zip(headers, widths), start=1):
    cell = ws1.cell(row=1, column=col_idx, value=header)
    cell.fill = RED_FILL
    cell.font = WHITE_BOLD
    cell.alignment = HDR_ALIGN
    cell.border = THIN_BORDER
    ws1.column_dimensions[cell.column_letter].width = width

ws1.row_dimensions[1].height = 30

# Sort by category order
sorted_tcs = sorted(test_cases, key=lambda tc: CATEGORY_ORDER.index(tc.get("category", "Edge")))

write_row = 2
current_cat = None

for tc in sorted_tcs:
    cat = tc.get("category", "")

    # Group-header row on category change
    if cat != current_cat:
        count = sum(1 for t in sorted_tcs if t.get("category") == cat)
        label = f"  {cat.upper()}  ({count} test case{'s' if count != 1 else ''})"
        for c in range(1, NUM_COLS + 1):
            cell = ws1.cell(row=write_row, column=c)
            cell.value = label if c == 1 else None
            cell.fill = GROUP_HDR_FILLS.get(cat, PatternFill())
            cell.font = GROUP_HDR_FONTS.get(cat, Font(bold=True, size=11))
            cell.alignment = Alignment(vertical="center", horizontal="left" if c == 1 else "center")
            cell.border = THIN_BORDER
        ws1.row_dimensions[write_row].height = 22
        write_row += 1
        current_cat = cat

    # Data row — 6 columns, no Category column in output
    values = [tc["id"], tc["title"], tc["preconditions"], tc["steps"], tc["expected"], tc["status"]]
    for col_idx, value in enumerate(values, start=1):
        cell = ws1.cell(row=write_row, column=col_idx, value=value)
        cell.alignment = WRAP_TOP
        cell.border = THIN_BORDER
        cell.font = NORMAL_FONT
    write_row += 1

ws1.freeze_panes = "A2"

# ---------- Sheet 2: Plan & Notes ----------
ws2 = wb.create_sheet("Plan & Notes")
ws2.column_dimensions["A"].width = 100

row = 1

def section_header(title):
    global row
    cell = ws2.cell(row=row, column=1, value=title)
    cell.fill = RED_FILL
    cell.font = SEC_HDR_FONT
    cell.alignment = HDR_ALIGN
    ws2.row_dimensions[row].height = 28
    row += 1

def sub_header(text):
    global row
    cell = ws2.cell(row=row, column=1, value=text)
    cell.font = BOLD_FONT
    row += 1

def italic_line(text):
    global row
    cell = ws2.cell(row=row, column=1, value=text)
    cell.font = ITALIC_FONT
    row += 1

def normal_line(text):
    global row
    cell = ws2.cell(row=row, column=1, value=text)
    cell.font = NORMAL_FONT
    cell.alignment = WRAP_TOP
    row += 1

def blank_row():
    global row
    row += 1

# TEST PLAN SUMMARY
section_header("TEST PLAN SUMMARY")
sub_header("Functional scope:")
normal_line(plan_summary["functional_scope"])
blank_row()
sub_header("Acceptance criteria:")
for i, ac in enumerate(plan_summary["acceptance_criteria"], start=1):
    normal_line(f"{i}. {ac}")
blank_row()
sub_header("Test scenarios by category:")
for category, scenarios in plan_summary["scenarios"].items():
    italic_line(f"{category}:")
    normal_line(scenarios)
blank_row()
sub_header("Test data requirements:")
normal_line(plan_summary["test_data"])
blank_row()
sub_header("Dependencies:")
normal_line(plan_summary["dependencies"])
blank_row()
sub_header("Privacy & data handling:")
normal_line(plan_summary["privacy"])
blank_row()

# CLARIFYING QUESTIONS
if clarifying_questions:
    section_header("CLARIFYING QUESTIONS")
    for i, (question, rationale) in enumerate(clarifying_questions, start=1):
        sub_header(f"{i}. {question}")
        italic_line(f"   Why it matters: {rationale}")
        blank_row()

# ASSUMPTIONS MADE
section_header("ASSUMPTIONS MADE")
for assumption in assumptions_made:
    normal_line(f"- {assumption}")
blank_row()

# COVERAGE NOTES
section_header("COVERAGE NOTES")
sub_header("AC-to-test-case mapping:")
for ac, tc_ids in coverage_notes["ac_mapping"]:
    normal_line(f"{ac}: {tc_ids}")
blank_row()
sub_header("Scenarios identified but NOT turned into test cases:")
for item in coverage_notes["not_tested"]:
    normal_line(f"- {item}")

# Save
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
output_path = OUTPUT_DIR / FILENAME
wb.save(output_path)
print(f"Written: {output_path}")
```

## After generation

Once the xlsx is written, use the `present_files` tool with the file path so the user gets a download link in the chat.

If the inline+xlsx mode is active, the flow is:
1. Produce the inline Markdown output (all sections)
2. Run the xlsx generation script
3. Call `present_files` with the xlsx path
4. End with a one-line pointer: *"Download the xlsx below to paste into Jira."*

If xlsx-only mode is active, skip step 1.

## Filename derivation examples

| Input | Filename |
|-------|----------|
| Jira fetch of `INST-1234` | `TestCases_INST-1234_20260420.xlsx` |
| UST titled "Patient Portal Login Enhancement" | `TestCases_PatientPortalLogin_20260420.xlsx` |
| UST titled "The New Appointment Booking Flow" | `TestCases_NewAppointmentBookingFlow_20260420.xlsx` |
| UST titled "Paramedic updates in-progress incident report mid-flow" | `TestCases_ParamedicIncidentReport_20260420.xlsx` |

## Edge cases

**Very long test case content:** Excel cells have a 32,767 character limit per cell. If a single preconditions/steps/expected value exceeds this, split into two test cases rather than truncating.

**Tables with merged cells:** Do NOT use merged cells in the Test Cases sheet. Jira import dislikes them. Use wrap_text only.

**Empty optional sections:** If a workflow didn't produce clarifying questions (e.g. because the UST was unambiguous), skip the CLARIFYING QUESTIONS section in Sheet 2 entirely rather than leaving an empty header.

**Enricher workflow xlsx:** Structure Sheet 1 as before (revised + new test cases in one combined table, sorted by Category then ID, with group-header rows). Replace Sheet 2 with:
- Section: "WHAT WAS MISSING OR VAGUE" (list of changes)
- Section: "NEW TEST CASES ADDED" (rationale for additions)
- Omit: Plan Summary, Clarifying Questions, Assumptions (those belong to the original, not the enrichment)

**Targeted workflow xlsx:** Only produce if ≥3 test cases. Sheet 1 contains only the targeted test cases. Sheet 2 contains a brief note about what subset was produced and why (e.g. "Edge cases focused on concurrent sessions — generated on request, not a full test pass").
