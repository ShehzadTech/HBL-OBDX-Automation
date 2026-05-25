# QA Test Case Writer — Skill

A Claude skill that auto-activates when you're doing QA work on a User Story Task (UST). Produces Techlogix-standard test cases, test plans, and refinements without you having to remember which prompt to run.

## What this skill does

Replaces the explicit "Run Prompt #14" pattern with **automatic activation**. When you paste a UST into Claude (or fetch one via Atlassian MCP), the skill recognises the context and produces the appropriate output — full pipeline, planning only, enrichment, or targeted subset depending on what you asked for.

**Coverage:**
- Full pipeline: Test Plan Summary + Clarifying Questions + Assumptions + Test Cases + Coverage Notes
- Planning-only mode for early-stage UST review
- Enricher mode for reviewing existing test cases
- Targeted mode for specific asks (edge cases, negative scenarios, clarifying questions)
- Follow-up mode that doesn't repeat output already in the conversation

**Output:** By default the skill produces both an inline Markdown preview in chat AND a downloadable `.xlsx` file ready for Jira import. Sheet 1 has the test cases in the Techlogix 5-column format; Sheet 2 has the plan summary, clarifying questions, assumptions, and coverage notes. If you want just the file without the preview, say "just give me the file" and the skill will skip the inline output.

**Pattern-aware coverage:** The skill detects what kind of UST it's working with and applies standard coverage checklists for that type. Four patterns covered:

- **REST API Endpoint** — HTTP method validation, headers, URL encoding, auth variants, SLA, idempotency, audit, injection
- **UI Feature** — form validation, authorisation, session handling, loading/error states, responsive, cross-browser, accessibility, privacy
- **State-change Workflow** — valid and invalid transitions, role-based access, audit history, concurrent actors, notifications, override paths
- **Integration** — schema mapping, retry logic, DLQ, rate limiting, idempotency, circuit breaker, monitoring, data privacy across boundary

Multi-pattern USTs (e.g. a UI form that calls an API) get both checklists applied with test case IDs scoped by layer.

## How to use it

**The whole point of a skill is that you don't invoke it explicitly.** You just write normally:

```
[Paste your UST]

Work through this please.
```

Or:

```
Fetch INST-1234 from Jira and give me test cases.
```

Or even just:

```
[Paste UST]
```

Claude recognises the UST shape and triggers the skill. No more "Run Prompt #14" ceremony.

## How to install

The skill is distributed as a zipped folder. Each team member installs it into their Claude Project.

### Installation steps

1. **Download** the `qa-test-case-writer.zip` file from `#ai-qa-wins`
2. **Unzip** it to get the `qa-test-case-writer/` folder
3. **Open your Claude Project** — "QA Test Planning — Techlogix"
4. **Go to Project Knowledge**
5. **Upload** the entire `qa-test-case-writer/` folder (including the `references/` subfolder and the `SKILL.md` file)
6. **Verify installation:** start a fresh conversation and paste any UST. Claude should produce the full pipeline output automatically — no explicit prompt needed.

### If the skill doesn't auto-activate

Possible causes:
- The folder structure wasn't preserved during upload (check that `references/` is still nested inside the skill folder)
- Your Claude Project has the old Prompt Library taking priority — remove `Prompt_Library_Test_Planning.md` OR keep both (they can coexist; skill takes priority on fresh USTs)
- The UST you pasted is too short or too generic for the skill to recognise. Add the `Acceptance Criteria:` heading to make it more UST-shaped.

If none of those fix it, fall back to explicitly calling it:

```
Use the QA Test Case Writer skill on this.
```

## Skill vs Prompt Library — which to keep?

You can keep both during the transition. The skill handles the common "fresh UST" case faster and with less typing. The Prompt Library is still useful for:

- The narrow prompts (#2 Edge Case Hunter, #5 API Test Strategy, etc.) where you want explicit control
- When you want to see the reasoning step by step rather than the full pipeline in one go
- Learning / teaching the underlying prompt patterns

**Recommended:** keep both. Use the skill by default, reach for specific prompts when you need surgical control.

## Files in this skill

```
qa-test-case-writer/
├── SKILL.md                         (main skill file — Claude reads this first)
├── README.md                        (this file)
└── references/
    ├── techlogix-standards.md       (format rules, conventions, data handling)
    ├── examples.md                  (worked examples of each workflow)
    ├── coverage-patterns.md         (pattern detection + per-pattern coverage checklists)
    └── generate_xlsx.md             (xlsx export spec + Python generation script)
```

## Prerequisites

- Claude Project named "QA Test Planning — Techlogix" with Custom Instructions already configured (Week 2 setup)
- Code Execution / File Creation enabled in your Claude settings (required for xlsx generation)
- Atlassian MCP connected if you want to fetch USTs directly from Jira (optional but recommended)

## Feedback & iteration

Post in `#ai-qa-wins` if:
- The skill activates when it shouldn't (false positive — e.g. on a general Jira query that isn't a UST)
- The skill doesn't activate when it should (false negative — Claude gives a generic response instead)
- The output structure needs tweaking for your workflow
- You spot a pattern that should be added as a new workflow

The skill will be iterated based on usage feedback. This is the first version — expect refinements.

## Limitations

- **Requires the Techlogix QA Project setup** (Custom Instructions, Prompt Library as Project Knowledge). The skill assumes these are in place.
- **Requires Code Execution / File Creation enabled** for the xlsx generation. If not enabled, the skill falls back to inline Markdown output only.
- **Does not replace review discipline.** AI-generated test cases still need human review against the Technical Notes. The skill surfaces the reasoning (plan, questions, assumptions) to make review easier, but doesn't remove the reviewer responsibility.
- **Synthetic data rule is enforced**, but depends on you not pasting real data in the first place. The skill can't stop you from including real identifiers in a prompt.
- **Auto-triggering can be wrong.** If the skill activates on something that isn't really a UST, explicitly tell Claude what you actually want.

## Version

**v1.4** — refinements based on first-round production feedback from live USTs (SECP and TMX):
- **Don't paraphrase the UST.** Test case Expected Results now retain UST phrasing verbatim, with observable detail added alongside rather than instead. Matters for traceability on every project and especially for regulated-domain clients reviewing test cases against UST text.
- **Date-sensitive Behaviour cross-cutting micro-pattern** added to `coverage-patterns.md`. Triggers on cut-off / deadline / expiry / "by the Xth" / calendar-based cues and forces systematic coverage: day-before / day-of-start / day-of-end / day-after, month-length variations (28/29/30/31), year rollover, timezone, clock skew, business-day vs calendar-day. Applies IN ADDITION to whichever main pattern(s) fit. **Cut-off classification** (calendar-anchored vs rolling-window) added on top so month-length tests apply only where they're meaningful; rolling-window checklists still force 1–2 month-boundary / leap-year tests because date arithmetic is a classic bug site.
- **Category-scope overrides honoured.** Instructions like "skip negatives", "happy path only", or "no edge cases" are treated as definitive — the skill drops that category and notes the omission in Coverage Notes. No confirmation needed.
- **Shape-before-writing decision.** The skill decides PAUSED (3 sections) vs FULL PASS (5 sections) before typing. Fixes a v1.3/v1.4.0 bug where the skill would list clarifying questions and then keep writing test cases anyway instead of pausing.
- **Clarifying-question admissibility test.** No more soft cap of 5. Every CQ must pass *"would my test cases be meaningfully different depending on the answer?"* — padding questions go to Assumptions instead. A clear UST gets zero; an ambiguous one gets exactly as many as genuinely qualify.
- **Gap verification loop before xlsx render.** After drafting test cases and coverage notes, the skill re-reads the Pattern Checklist Status and classifies every ❌ as ADDRESSABLE (in-scope gap → fill it) or OUT_OF_SCOPE (convert to N/A with reason). Fills addressable gaps in up to 2 rounds, surfaces the list to the user first if there are more than 5. Prevents the "honest-but-shipped gap" failure mode where a ❌ in coverage notes never gets turned into a test case.

**v1.3** — refined clarifying-question behaviour. Zero questions is now a valid answer (skill won't invent filler). When genuine questions exist, skill pauses after Assumptions and waits for user input before generating test cases. Override phrases ("skip questions", "xlsx only", etc.) bypass the pause for speed.

**v1.2** — added UI Feature, State-change Workflow, and Integration patterns alongside the existing REST API pattern. Multi-pattern USTs now handled explicitly (e.g. UI+API, API+Workflow, UI+Workflow).

**v1.1** — added pattern-aware coverage with REST API pattern. Pattern Checklist Status appears in Coverage Notes for transparency.

**v1.0** — initial release, Week 3 of the Techlogix QA AI Transformation Initiative.
