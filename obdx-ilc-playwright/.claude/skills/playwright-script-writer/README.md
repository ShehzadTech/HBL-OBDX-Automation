# Playwright Script Writer — Skill Package

A Claude Code skill that generates Playwright + TypeScript automation scripts matching the Techlogix QA Framework conventions.

**Scope:** Produces page objects and `.spec.ts` files that conform to the framework's POM structure, import aliases, test ID naming, fixture registration, and selector priority rules.

---

## How it works

When you ask Claude Code to write a Playwright test (e.g. "automate these test cases" or "add a test for TC-LOGIN-005"), the skill auto-triggers, reads the current framework, produces a plan, waits for your OK, and then generates the code.

It never improvises on conventions — everything it produces follows the rules in `framework-conventions.md`, which mirror the rest of your repo.

---

## Files in this skill

| File | Purpose |
|------|------|
| `SKILL.md` | The skill's entry point. Workflow, triggering rules, quality gates. |
| `framework-conventions.md` | The non-negotiable rules: file layout, imports, naming, fixtures. |
| `code-patterns.md` | Concrete templates for 8 common tasks (new spec, new page object, data-driven, API setup, etc.). |
| `selector-strategy.md` | The priority order for choosing locators — `data-test` first, XPath never. |
| `examples.md` | Worked examples: real test cases transformed into real spec files. |
| `README.md` | This file. |

---

## Installation

The skill lives at `.claude/skills/playwright-script-writer/` inside the QA Automation Framework repo. Claude Code auto-discovers it when you run `claude` from the project root — no manual registration.

**To verify it's loaded:**

```bash
cd /path/to/qa-automation-framework
claude
# Then in the Claude prompt:
> list your available skills
```

You should see `playwright-script-writer` in the list.

---

## How to use it in the Week 4 session

**Typical prompt:**

> Here are four test cases for the new password-reset flow. Automate them.
> [paste test case table]

Claude will:
1. Read the framework conventions (automatic)
2. Produce a plan (new files, page objects needed, risks)
3. Wait for your ack
4. Generate the spec file and any new page objects
5. Register new page objects in the fixture
6. Tell you how to run it

**If a page object is missing:** The skill will offer to create it, using the patterns in `code-patterns.md`.

**If a selector strategy is ambiguous:** It'll flag it in the plan and recommend the safest option.

---

## Maintaining the skill

This skill is **not a black box** — all six files are plain Markdown, committed to the repo, and versioned with the framework.

**When to update it:**
- You add a new path alias or helper → update `framework-conventions.md`
- You add a new common pattern (e.g. visual tests, GraphQL API tests) → add to `code-patterns.md`
- The selector strategy changes (e.g. team adopts `data-cy` instead of `data-test`) → update `selector-strategy.md`
- You find a gap — the skill produces something wrong → update `examples.md` with a counter-example

Edits to the skill take effect on the next Claude Code session. No rebuild needed.

---

## Limitations

**Known:**
- The skill assumes the framework's layout. If someone clones it into a different project layout, they need to update `framework-conventions.md` first.
- It does not generate visual baseline files — those have to be recorded by running the tests.
- It doesn't know the app under test. If your test case says "click the Submit button" and the button's actual label is "Confirm", the skill will generate a best-guess selector and flag it in the plan. Always review.

**Intentional:**
- It will not produce code with `test.only()` or `test.skip()` — these leak into CI.
- It will not inline hard-coded credentials. If no fixture exists, it'll create one in `test-data/`.
- It will not use `waitForTimeout()`. If a genuine need for a fixed sleep exists, it'll force you to acknowledge it in the plan.

---

## Relationship to the Week 3 skill (QA Test Case Writer)

The two skills form a chain:

```
UST  →  QA Test Case Writer (Week 3)  →  Test cases
                                            ↓
                              Playwright Script Writer (Week 4)  →  .spec.ts files + page objects
```

In the Week 4 session, you'll chain them: generate test cases with the Week 3 skill, pipe them into the Week 4 skill, and watch a UST turn into runnable automation end-to-end.

---

## Changelog

- **v1.0** (Week 4, 28-Apr) — initial release. Covers spec generation, page object creation, selector strategy, 8 code patterns.
