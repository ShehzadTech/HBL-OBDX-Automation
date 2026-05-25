---
name: qa-test-case-writer
description: Use this skill whenever the user is working on QA for a healthcare or enterprise feature and provides (or fetches via MCP) a User Story Task (UST), Jira ticket, feature description, acceptance criteria, or equivalent requirements document and wants test planning, test cases, or related QA artefacts. Trigger on any UST-shaped input even if the user doesn't explicitly ask for test cases — confirm the user's intent briefly, then produce the appropriate QA output. Covers the full workflow from fresh UST through refinement and enrichment. Use this skill in preference to generic responses whenever QA work on a real feature specification is happening.
---

# QA Test Case Writer

This skill produces Techlogix-standard test cases from User Story Tasks (USTs) and handles the full QA authoring workflow — test planning, test case generation, refinement, and enrichment. Built for QA engineers working on the instED programme and similar enterprise features.

## When this skill activates

Activate when the user's message contains (or references) any of:

- A User Story Task, Jira ticket, or Confluence page with a feature description
- Acceptance criteria (numbered list of requirements)
- A request for test cases, test plan, edge cases, test scenarios, or test data
- An existing test case table the user wants to review, enrich, or extend
- A Jira ticket ID that can be fetched via Atlassian MCP (e.g. `INST-1234`, `PROJ-456`)

If a UST is present but the user's intent is ambiguous, briefly confirm before producing output — for example: *"You've pasted a UST. Would you like the full pipeline (plan + questions + test cases), just test cases, or something else?"*

If only a ticket ID is mentioned and Atlassian MCP is available, fetch the ticket first, then proceed.

## The Techlogix test case standard

All test case output from this skill must conform to this format. This is non-negotiable.

**Table columns (exactly these, in this order):**

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |

**Standards:**

- **Test Case ID** format: `TC-[FEATURE]-[NNN]` where FEATURE is a short uppercase identifier derived from the UST (e.g. `TC-LOGIN-001`, `TC-PROFILE-014`)
- **Test Title** is short and describes *what* is being tested, not the expected outcome
- **Preconditions** must be on every test case — what state must exist before the test runs. Never "none" or blank. Include user role, data state, environment flags, and any external system dependencies.
- **Test Steps** must be numbered and specific. "Click the Log In button in the top-right corner of the landing page" is good. "Click login" is not.
- **Expected Result** must be observable and testable. "User lands on /dashboard and header displays logged-in user's name" is good. "Login works correctly" is not.
- **Category** is assigned to every test case internally but is **not** a visible column in the output table. Instead, it drives grouping: test cases are sorted and presented in four labelled groups — Happy Path first, then Negative, then Boundary, then Edge. Use these definitions when categorising:
  - **Happy Path** — valid inputs, correct preconditions, expected successful outcome
  - **Negative** — invalid inputs, missing mandatory fields, unauthorised access, blocked actions
  - **Boundary** — at, just below, or just above a defined limit (numeric thresholds, time windows, character lengths, similarity percentages)
  - **Edge** — unusual but valid conditions: state changes mid-flow, concurrent actors, integration failures, data-wipe triggers
- **Status** defaults to "Not Executed"
- **Test data** is synthetic only — never real patient data, real credentials, or real PII

**Explicit rule: NEVER use Given/When/Then syntax.** That's Cucumber `.feature` file syntax, which is a separate output format. Test cases use the table above.

## Choosing the right workflow

This skill adapts its output to what the user is asking for. Identify the user's intent, then apply the matching workflow:

| User asks for… | Use workflow | Produces .xlsx? |
|----------------|--------------|-----------------|
| Fresh UST, broad ask ("work through this", "generate test cases", "I need test cases for this UST") | **Full pipeline** | Yes |
| Test planning only, no test cases yet | **Planning only** | No |
| Review/enrich existing test cases | **Enricher** | Yes |
| Specific subset (edge cases only, negative scenarios only, clarifying questions only) | **Targeted** | Only if ≥3 test cases |
| Follow-up in existing conversation (continuing a prior output) | **Follow-up** (do not repeat sections already produced) | No |

When in doubt, lean toward the full pipeline — it's the default for a fresh UST.

## Output mode: inline + downloadable xlsx

For every workflow that produces a .xlsx (see table above), **by default produce BOTH**:

1. The inline Markdown output in the chat (so the user can read/skim immediately)
2. A downloadable .xlsx file generated via the script in `references/generate_xlsx.md`

**Override:** If the user says "just give me the file", "file only", "skip the preview", or similar, produce only the .xlsx and a one-line confirmation (e.g. "Generated. Download below."). Do not inline the table.

**See `references/generate_xlsx.md` for the exact xlsx format specification and the Python script to run.** Always read that file before generating the first xlsx in a conversation — the format rules matter for clean Jira import.

---

## Workflow: Full pipeline (fresh UST → test cases)

Use when the user pastes a fresh UST and wants the whole thing worked through.

Internally, run: Initial Analysis → Edge Case Hunter on the 3 highest-risk scenarios → identify preconditions and test data → **pattern detection against `references/coverage-patterns.md`** → cross-reference against Technical Notes. Then decide on output mode:

### Step 1: Decide response shape BEFORE writing

Make this decision before you type anything. It determines whether your response has 3 sections or 5.

**PAUSED shape (3 sections + pause block, STOP after section 3) when:**
- You identified at least one genuine clarifying question AND
- The user's message does NOT contain an override phrase

**FULL PASS shape (all 5 sections, with gap verification loop before rendering) when either:**
- Zero genuine clarifying questions, OR
- Override phrase present: *"skip questions"*, *"no pause"*, *"full pipeline"*, *"just generate"*, *"xlsx only"*, *"file only"*, *"proceed anyway"*

If you are in the PAUSED shape, your response ENDS at the pause block at the end of section 3. Writing sections 4 and 5 in a paused response is a bug. Default assumption: a well-written UST produces the FULL PASS shape. Don't invent questions to force a pause.

### Output order

All sections use these exact headers:

```
=== 1. TEST PLAN SUMMARY ===
- Functional scope (2-3 sentences)
- Acceptance criteria breakdown (numbered list, matching the UST)
- Test scenarios grouped by category: Positive / Negative / Boundary / Edge
- Test data requirements
- Integration or dependency notes
- Privacy / data-handling considerations (if confidential domain)
- Detected pattern (e.g. "REST API Endpoint") — or "General" if no pattern matched

=== 2. CLARIFYING QUESTIONS ===

Default: ZERO. Every question you add must pass this admissibility test:

    "If I don't know the answer to this, would my test cases be
     MEANINGFULLY DIFFERENT depending on which answer is true?"

If "no, I can assume something reasonable" → it goes in Assumptions, NOT here.
If "yes, it splits into different test cases" → genuine clarifying question.

There is no target count. A clear UST gets zero. An ambiguous one gets exactly
as many as pass the test — never padded to hit a number, never capped if more
genuinely qualify.

If ZERO qualify: write exactly "No clarifying questions — the UST is sufficient.
Proceeding with the assumptions below." Then continue to section 3.

If one or more qualify: number them 1, 2, 3... Add one sentence each explaining
why the answer changes the test cases.

Examples that COUNT:
- UST says "within 30 days" without calendar/business-day clarification → boundary tests differ
- UST mentions roles but doesn't define permissions per role → role-based tests differ
- UST specifies a cut-off without stating the reference timezone → boundary tests differ

Examples that DO NOT count (go in Assumptions instead):
- "What exact error message?" (quote UST if given, else assume reasonable wording)
- "What email should notifications go to?" (synthetic, flag as assumption)
- "Does the system support MFA?" (not in UST = out of scope, not a CQ)

=== 3. ASSUMPTIONS MADE ===
Anything assumed to fill a gap in the UST. One line per assumption.

TERMINATION CHECK (perform before writing anything else below this section):

- Did you list one or more clarifying questions in section 2?
- Was the user's message free of override phrases?

If BOTH are yes, this response ENDS HERE. Write the pause block below as the
final text and STOP. Do NOT write sections 4 or 5.

    ---
    ⏸ Pausing here. Review the clarifying questions and assumptions above.
    Reply with answers, corrections, or "proceed" to continue generating test cases.

If EITHER is no, skip the pause block and continue directly to section 4.

=== 4. TEST CASES ===
Full test case table in the Techlogix standard format (see above).

Include pattern-specific coverage as per `references/coverage-patterns.md`.

=== 5. COVERAGE NOTES ===
- Brief mapping: which test case IDs cover which acceptance criterion
- Any scenarios identified but not turned into test cases (and why)
- If a pattern was applied: the Pattern Checklist Status sub-section
  (see coverage-patterns.md for format)
```

### Step 2: Gap verification loop (before rendering xlsx)

After drafting sections 4 and 5 internally, verify coverage against the Pattern Checklist(s) BEFORE calling the xlsx generation script. This applies to both the full-pass run and the continuation after a pause.

**A. Classify every ❌ in the Pattern Checklist Status** as one of:

- **ADDRESSABLE** — UST has cues for this item, it's in scope, a test case can reasonably be written. Example: *"Month-length variations ❌"* when the UST has a monthly cut-off rule but tests cover only one creation month.
- **OUT_OF_SCOPE** — UST is silent on this dimension, or the item doesn't apply to this UST's architecture. Example: *"Cross-browser matrix ❌"* when UST makes no browser claims; *"Rate limiting ❌"* when no API rate limits are documented.

Convert OUT_OF_SCOPE items from ❌ to **N/A** with a one-line reason inline. This prevents honest-but-misleading ❌ reporting for items that aren't real gaps.

**B. Gate check — surface if > 5 ADDRESSABLE gaps.** If the ADDRESSABLE list has more than 5 items, pause and show the user this block:

    === GAP ANALYSIS ===

    I found N addressable coverage gaps before rendering the xlsx:

    1. [Checklist item] — [one-line reason it applies here]
    2. ...

    I'll generate test cases for all of these unless you say otherwise
    (e.g. "skip 2 and 5", "only 1 and 3", "proceed with all").

Then STOP and wait for user input. When the user replies, filter the list per their instruction and proceed to C. If there are 5 or fewer ADDRESSABLE gaps, proceed silently to C without surfacing.

**C. Fill gaps.** For each ADDRESSABLE gap, generate the test case(s) — one if narrow, multiple if broad (e.g. month-length = up to 4 test cases for 28/29/30/31-day creation months). Append to the test case set with fresh IDs in the correct Category. Update Pattern Checklist Status: ❌ → ✅ with new TC IDs listed.

**D. Second classification pass.** Re-run step A against the updated test case set. If new ADDRESSABLE gaps appear (rare but possible — filling one gap can reveal downstream coverage needs), fill them once more via step C. **Hard cap: 2 fill rounds total.** Remaining gaps after round 2 stay as ❌, get logged in "Scenarios identified but NOT turned into test cases" in Coverage Notes, and the loop ends.

Only after the loop completes, call the xlsx generation script. The xlsx reflects the post-loop test case set, including any cases added in the fill rounds.

### Handling user responses after a pause

When the user responds to a paused output, continue from section 4 without re-producing sections 1–3.

- **If user answers questions** → update Assumptions with their answers (noted inline — e.g. "Per user: UCID is alphanumeric, 10–20 chars"), then generate sections 4 and 5
- **If user says "proceed", "use those assumptions", "go ahead", "looks good"** → generate sections 4 and 5 using the assumptions as-is
- **If user corrects assumptions inline** (e.g. edits a list, says "change #3 to X") → apply the corrections, then generate sections 4 and 5
- **If user asks for clarification on a question** → answer conversationally, do not yet generate test cases

In all continuation cases, start the response with a brief one-line confirmation of what you're doing ("Proceeding with your confirmation…" / "Updated assumptions per your answers, generating test cases now…"). After drafting sections 4 and 5, run the **Step 2 gap verification loop** (above) before rendering the xlsx — the loop applies to continuations exactly as it does to full-pass runs.

**Category-scope overrides.** If the user's message contains instructions like "no negatives", "skip negative scenarios", "happy path only", "skip boundary", "don't create edge cases", or similar category-scoping phrases, omit the specified category from all output. Note the omission at the top of Coverage Notes (e.g. "Negative scenarios omitted per user instruction"). Apply the same rule to Enricher and Targeted workflows. Do not ask for confirmation — treat the instruction as definitive. If the UST itself triggers pattern-specific coverage in the omitted category, skip that too and note it in the relevant Pattern Checklist Status as "Omitted per user instruction" rather than "Not covered".

**Pattern detection is a required step.** Read `references/coverage-patterns.md` and identify which pattern or patterns the UST matches — REST API Endpoint, UI Feature, State-change Workflow, or Integration. Apply the relevant checklist(s). Multi-pattern USTs (e.g. a UI that calls an API) require multiple checklists applied in parallel. This is what stops the skill from shipping half-cooked output that silently misses standard coverage for the UST type. **Also run date-sensitive detection independently** — check whether the UST contains cut-off / deadline / expiry / "by the Xth" / calendar-based cues per the Date-sensitive Behaviour micro-pattern in `references/coverage-patterns.md`. If it does, apply that checklist IN ADDITION to the main pattern's checklist and include its Pattern Checklist Status in Coverage Notes alongside the main pattern's.

## Workflow: Planning only

Use when the user wants the plan but not yet the test cases.

Output sections 1, 2, and 3 only (Test Plan Summary, Clarifying Questions, Assumptions). Omit the test case table and coverage notes. Offer at the end: *"When you're ready, ask me to generate test cases from this plan."*

## Workflow: Enricher

Use when the user provides existing test cases and asks for review, enrichment, or gap-filling.

Look for and fix:

1. **Missing preconditions** — any test case with blank or "none" preconditions
2. **Vague steps** — generic verbs like "click login" or "enter details" that lack specificity
3. **Vague expected results** — outcomes like "works correctly" or "succeeds" instead of observable criteria
4. **Missing coverage** — scenarios that should exist but don't: negative variants of positive tests, boundary values on numeric fields, role/permission variants, session/state-dependent variants
5. **Pattern-specific coverage gaps** — if the test cases are for an API, UI, workflow, or integration, apply the appropriate checklist from `references/coverage-patterns.md` and fill gaps

For pattern detection: infer the pattern from the test cases themselves and any UST context provided in the conversation. If the test case IDs, titles, and content clearly indicate an API (HTTP methods, status codes, endpoint paths), apply the REST API checklist.

Output structure:

```
=== WHAT WAS MISSING OR VAGUE ===
- For each test case changed, one line: which test case, what was wrong, what you did

=== REVISED TEST CASES ===
Full table with edits applied, preserving original test case IDs where possible

=== NEW TEST CASES ADDED ===
Any new test cases created to fill coverage gaps, with brief rationale. 
If pattern-specific coverage was added, group by checklist category 
(e.g. "Added HTTP method validation: TC-XXX-016 to TC-XXX-019").

=== PATTERN CHECKLIST STATUS ===
(Only if a pattern was applied)
List each checklist category with ✅ / ⚠️ / ❌ / N/A as per 
coverage-patterns.md format. This closes the loop on the enrichment.
```

Preserve the original test case IDs and only assign new IDs to genuinely new test cases.

## Workflow: Targeted

Use when the user asks for a specific subset.

Produce only what was asked for. Match the section format from the full pipeline but drop everything else. Examples:

- *"Give me 5 more edge cases for TC-LOGIN-007"* → just the edge case scenarios and their test cases, no plan
- *"What should I ask the PO?"* → just the Clarifying Questions section
- *"What negative tests am I missing?"* → just the negative scenarios

Keep responses tight. Don't pad with plan sections the user didn't request.

## Workflow: Follow-up

Use when the user is continuing from a prior output in the same conversation.

Do not repeat sections that have already been produced in the chat. Instead:

- Reference prior test case IDs ("Updating TC-LOGIN-005 as you asked")
- Show only the delta (new or changed test cases, new scenarios, answers to new questions)
- Preserve the Techlogix format for any new test cases

## Quality checks (always run these before producing final output)

Before showing test cases to the user, internally verify:

- [ ] Every test case has a non-blank, specific Preconditions value
- [ ] Every Expected Result is observable (would pass a "can a tester verify this with their own eyes" check)
- [ ] Test case IDs follow the `TC-[FEATURE]-[NNN]` convention and are unique
- [ ] No Given/When/Then syntax anywhere in test case content
- [ ] Test data is synthetic (no realistic-looking real names, real emails, real identifiers)
- [ ] Cross-reference against the UST's Technical Notes — no test cases reference features, endpoints, or buttons the Technical Notes don't mention
- [ ] **Every test case has an assigned Category** (Happy Path / Negative / Boundary / Edge) used for grouping — even though Category is not a visible column
- [ ] **xlsx Sheet 1 is grouped by Category** — rows sorted Happy Path → Negative → Boundary → Edge, with a coloured group-header row before each section showing the category name and case count. No Category column in the data rows.
- [ ] **Pattern detection applied** — if the UST matches a pattern in `references/coverage-patterns.md`, the corresponding checklist has been applied and the Pattern Checklist Status is in Coverage Notes
- [ ] **No either-or expected results** — if a test case says "returns 400 or 404," split it into two test cases or clarify the expected behaviour upfront (belongs in Clarifying Questions instead)

If any check fails, fix internally before outputting.

## Working with Atlassian MCP

If the user mentions a ticket ID and Atlassian MCP is available:

1. Fetch the ticket via MCP first
2. If the ticket references linked Confluence pages, read those too
3. Confirm briefly: *"Fetched INST-1234 from Jira and read the linked Confluence page. Running the full pipeline now…"*
4. Proceed with the appropriate workflow

If MCP isn't available or fails, fall back gracefully: *"I couldn't fetch the ticket via MCP. Paste the UST directly and I'll work through it."*

## Pitfalls to avoid

**Don't produce generic test cases.** Every test case should reference specific details from the UST — actual button names, actual URL paths, actual field names. Generic test cases ("Verify user can log in") are a failure mode; specific test cases ("Verify user is redirected to /portal/dashboard after submitting valid credentials on /portal/login") are the goal.

**Don't paraphrase the UST.** When the UST specifies an outcome using particular phrasing — phrases in quotes, explicit "System Response" or "Displays…" text, specific validation messages, button or field labels — use that wording verbatim in the test case. Observable detail is added *alongside* UST phrasing, not as a replacement. Example: if the UST says *"Displays interface to propose names"*, the Expected Result says *"System displays the interface to propose names. Form fields for 1st/2nd/3rd Proposed Name and Meaning/significance are visible. URL is /name-proposal."* — NOT a rewritten version that loses the UST phrase. This matters especially for regulated-domain clients who review test cases against UST text for traceability.

**Don't invent features.** If the UST doesn't mention a feature, don't test for it. If you notice a likely-missing feature (e.g. UST says "login" but doesn't mention "remember me"), raise it as a Clarifying Question — don't generate test cases for it.

**Don't skip preconditions.** This is the #1 gap in AI-generated test cases. Every test case needs explicit Preconditions. If a test case has no meaningful preconditions, ask yourself whether it really stands alone or depends on something.

**Don't over-pad the output.** If the user asked for "just edge cases," don't give them a full plan. Respect the scope of the ask.

**Don't hallucinate test case IDs in follow-ups.** When referencing prior test cases, only use IDs that actually appeared earlier in the conversation.

## For more detail

See `references/techlogix-standards.md` for the full QA standards reference (format rules, naming conventions, data handling rules).
See `references/examples.md` for worked examples of each workflow.
See `references/coverage-patterns.md` for pattern detection and per-pattern coverage checklists. **Read this before producing output on any UST where pattern detection is ambiguous.**
See `references/generate_xlsx.md` for the xlsx export specification and the Python script to generate files.
See `references/obdx-format.md` for the **OBDX Trade Finance extended 11-column format** used in `data/manual-test-cases.xlsx`. **Use this format (not the 6-column Techlogix default) when the user asks to write test cases for any HBL OBDX module — Initiate/Amend/Transfer LC, Bank Guarantees, Collections, etc. — or to append to the OBDX manual-test-cases workbook.**

---

## Handoff to automation

After producing the final test case table, always append this prompt at the end of your response:

> **Ready to automate?** Say "automate these" or "write the Playwright scripts" and the playwright-script-writer skill will convert the test cases above into runnable `.spec.ts` files.

Do not begin writing Playwright code yourself — that is the playwright-script-writer skill's responsibility. Your output (the test case table) is the input contract for that skill. See `skills/pipeline.md` for the full pipeline definition and the handoff contract between the two skills.
