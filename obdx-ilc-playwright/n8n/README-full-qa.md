# n8n Full QA Pipeline — OBDX 25.1 (all modules)

End-to-end n8n workflow that works across **every OBDX module** (Trade Finance, Funds Transfer, Bill Payment, Reports, Bulk File Upload, Approvals, User Management, Retail Payments). It implements the full 4-stage pipeline defined in `.claude/skills/pipeline.md`:

1. **Watches a Google Drive folder** for FSD / RSD / Requirements docs
2. **Stage 0 — Extract structured digest** from all three docs (Claude). The digest captures the module and pulls in the matching `module_profile` (page-object dir, fixture name, gotchas).
3. **Stage 1 — Generate test-data file** at `data/<camelCasedSlug>TestData.ts` in append-mode (Claude)
4. **Stage 2 — Generate manual test cases** (11-column JSON) including dedicated **Business Scenario** rows + module-specific extras (Claude)
5. **Pauses for human review** of the test-cases JSON (HITL)
6. **Stage 2.5 — Scrape live DOM locators** *(MANDATORY per pipeline.md)*. If `data/scraped/<slug>-scraped.json` is missing, Claude generates `scripts/scrape-<slug>.js` modelled on the canonical scraper, then runs it against the live AUT. The workflow halts on scraper failure — never proceeds with invented locators. Pre-place a scraped JSON manually to skip this step.
7. **Stage 3 — Generate spec + page object** *(two files in one Claude call)*: `tests/<module>/<feature>.spec.ts` AND `pages/<module>/<PascalCase>FlowPage.ts`. Every selector backed by an entry in the scraped JSON; missing locators trigger `test.fixme` rather than invention.
8. **Gates on `npx tsc --noEmit`**
9. **Runs `npx playwright test`** for the new spec
10. **Generates the custom HTML report** (`npm run report:custom`)
11. **Logs one Jira Cloud Bug per failed test** with screenshot / trace / video attached. Bug summary + labels carry the module tag.

```
Drive folder
   │  (poll every minute; trigger on <module>__<slug>__GO.txt)
   ▼
Set Config → Load Project Context (regen project-context.md from skills) →
   list FSD/RSD/REQ siblings → download → extract text → merge
   │
   ▼
Claude Stage 0: digest JSON                              ◀── prompts/v2-00-extract-requirements.md
   │
   ▼
Read data/<slug>TestData.ts (if any)
   │
   ▼
Claude Stage 1: test-data .ts                            ◀── prompts/v2-01-test-data.md
   │
   ▼
Claude Stage 2: 11-col test cases JSON                   ◀── prompts/v2-02-test-cases.md
   │
   ▼
Write n8n/staging/<slug>-cases.json
   │
   ▼  ◀── HITL gate (Wait node, resume on webhook)
   │
   ▼
Check data/scraped/<slug>-scraped.json
   │
   ├ exists ──────────────────────────────────┐
   │                                          │
   └ missing → Claude Stage 2.5: scraper js   │       ◀── prompts/v2-04-scraper.md
              → write scripts/scrape-<slug>.js │
              → node scripts/scrape-<slug>.js  │ (drives live AUT, captures locators)
              → data/scraped/<slug>-scraped.json
                                              │
                       ▼ ◀────────────────────┘
Read scraped JSON
   │
   ▼
Claude Stage 3: spec.ts + page object        ◀── prompts/v2-03-playwright.md
   │   (two File: <path> blocks in one response, locators from scraped JSON only)
   │
   ├─ writes tests/<module>/<slug>.spec.ts
   └─ writes pages/<module>/<PascalCase>FlowPage.ts
   │
   ▼
tsc --noEmit ──fail──▶ TSC failed response
   │ pass
   ▼
npx playwright test  →  npm run report:custom
   │
   ▼
scripts/build-jira-bugs.js → for each failure:
   Jira Create Bug → upload screenshot/trace/video attachment
   │
   ▼
Final summary JSON
```

This is the **v2 / full** workflow. The original `workflow.json` (single-file TSD → spec → run) is still here for the simpler use case.

## Files

| File | Purpose |
|---|---|
| `workflow-full-qa.json` | The importable n8n workflow (39 nodes). |
| `prompts/v2-00-extract-requirements.md` | Stage-0 prompt (kept in sync with the `Build Stage-0 Prompt` Code node — edit both). |
| `prompts/v2-01-test-data.md` | Stage-1 prompt (test-data .ts append-mode). Sync with `Build Stage-1 Prompt`. |
| `prompts/v2-02-test-cases.md` | Stage-2 prompt (test cases + Business Scenarios). Sync with `Build Stage-2 Prompt`. |
| `prompts/v2-03-playwright.md` | Stage-3 prompt (spec + page object — multi-file output). Sync with `Build Stage-3 Prompt`. |
| `prompts/v2-04-scraper.md`    | Stage-2.5 prompt (DOM-locator scraper script). Sync with `Build Scraper Prompt`. |
| `../scripts/build-jira-bugs.js` | Reads `playwright-report/results.json`, emits Jira-Cloud ADF bug payloads + attachment paths. |

## Drive folder convention

The workflow watches **one folder** (set as `DRIVE_WATCH_FOLDER_ID` in the workflow's variables). For each feature, upload **four files** to that folder. The filename pattern carries both the **module** and the **feature slug**:

```
<module>__<feature-slug>__<ROLE>.<ext>
<module>__<feature-slug>__GO.txt          ← trigger, upload last
```

| Filename | Required? | Notes |
|---|---|---|
| `<module>__<slug>__FSD.md` (or `.txt`, `.pdf`, Google Doc) | Yes | The FSD. |
| `<module>__<slug>__RSD.md` (or `.txt`, `.pdf`, Google Doc) | Optional | RSD. If absent, the digest's `sources.rsd_present` is `false`. |
| `<module>__<slug>__REQ.md` (or `.txt`, `.pdf`, Google Doc) | Optional | Free-form Requirements. |
| `<module>__<slug>__GO.txt` | **Yes — this is the trigger** | Empty or one-line "go". Upload this LAST. |

`<module>` is the OBDX module slug — one of the values in the table below — and `<feature-slug>` is the kebab-case feature name. Examples:

| Filename | → Generated artefacts |
|---|---|
| `trade-finance__amend-import-lc__GO.txt`           | `tests/trade-finance/amend-import-lc.spec.ts` + `data/amendImportLcTestData.ts` |
| `funds-transfer__internal-fx-transfer__GO.txt`     | `tests/funds-transfer/internal-fx-transfer.spec.ts` + `data/internalFxTransferTestData.ts` |
| `bill-payment__utility-quick-pay__GO.txt`          | `tests/bill-payment/utility-quick-pay.spec.ts` + `data/utilityQuickPayTestData.ts` |
| `reports__account-statement__GO.txt`               | `tests/reports/account-statement.spec.ts` + `data/accountStatementTestData.ts` |
| `bulk-file-upload__payroll-upload__GO.txt`         | `tests/bulk-file-upload/payroll-upload.spec.ts` + `data/payrollUploadTestData.ts` |

`.docx` is **not** supported natively. Convert to `.pdf` or `.md` first, or use Google Docs (the workflow asks Drive to export Docs as `text/plain`).

### Supported modules

| Module slug | Description | Page-object dir | Fixture name |
|---|---|---|---|
| `trade-finance`     | Letter of Credit, Bank Guarantee, Bills, Settlement | `pages/trade-finance/`     | per-flow (e.g. `importLcFlowPage`) |
| `funds-transfer`    | Internal / Domestic / International / Own-Account transfers, FX, SI, Future-dated | `pages/funds-transfer/`    | `fundsTransferFlowPage`     |
| `bill-payment`      | Biller management, quick pay, recurring, fetch billers | `pages/bill-payment/`      | `billPaymentFlowPage`       |
| `reports`           | Generate / schedule / download reports                | `pages/reports/`           | `reportsPage`               |
| `bulk-file-upload`  | Template-based bulk transactions, file-level + record-level approval | `pages/bulk-file-upload/`  | `bulkFileUploadFlowPage`    |
| `approvals`         | Pending approvals queue, approve / reject / send back | `pages/approvals/`         | `approvalsPage`             |
| `user-management`   | Users, roles, entitlements                            | `pages/user-management/`   | `userManagementPage`        |
| `retail-payments`   | Retail-side single-actor payment flows                | `pages/retail/`            | `retailPaymentPage`         |

If you use a module slug not in the table, the workflow still runs — the page-object dir is guessed as `pages/<module>/` and a question is added to `open_questions[0]` of the digest for the QA lead to confirm.

Most modules (Funds Transfer, Bill Payment, Reports, Bulk File Upload) **do not yet have page objects in this repo** — the generated spec will contain `// FIXME:` markers for missing fixtures and POM methods that you flesh out before running. That's expected: the workflow scaffolds the spec, you wire up the page object.

## Prerequisites

The workflow runs shell commands on the n8n host:

- Node.js 18+
- This project cloned, `npm install` + `npx playwright install chromium` done
- A reachable OBDX 25.1 instance at the URL in `.env`
- A Google Drive folder to watch, with at least Viewer access from the OAuth credential

## Setup — Docker (recommended)

Bundles n8n + Node + Playwright + Chromium into one container. Project source is bind-mounted; spec/data writes land back on the host.

### 1. Create the env file

```bash
cd n8n
cp .env.example .env
```

Edit `.env`:

| Field | Required for | Notes |
|---|---|---|
| `CLAUDE_MODEL`             | The four Claude stages           | Optional — defaults to `sonnet`. No API key needed; auth happens interactively below. |
| `OBDX_BASE_URL`, `OBDX_USER`, `OBDX_PASSWORD` | Playwright runs | OBDX is openly available — set the public URL |
| `N8N_BASIC_AUTH_PASSWORD`  | Securing the n8n UI + webhooks   | Change before exposing the container |
| `WEBHOOK_URL`              | HITL resume URL                  | Leave default for local; set to ngrok URL when sharing the HITL gate with QA |
| `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` | Logging failures to Jira | Same values you'll paste into the n8n Jira credential at first boot |
| `DRIVE_WATCH_FOLDER_ID`    | Drive trigger                    | Folder ID — paste into the n8n workflow variable at first boot |

### 2. Build + start

```bash
docker compose build              # ~3 min first time (Playwright image is big)
docker compose up -d
docker compose logs -f n8n        # watch boot
```

Open `http://localhost:5678` → enter the basic-auth creds from `.env`.

### 3a. Authenticate Claude CLI (one-time)

The four Claude stages call `claude -p` inside the container. The first run needs an interactive login that persists in the `obdx_qa_claude_auth` named volume — after that, every subsequent workflow run reuses the saved session.

```bash
docker compose exec -it n8n claude
```

The CLI prints a URL — open it in your browser, sign in with your Claude.ai (Pro/Max) account, paste the verification code back into the terminal. You should see the interactive Claude prompt. Type `/exit` (or Ctrl-D) to quit; the session is now stored.

Verify the CLI works non-interactively:

```bash
docker compose exec n8n bash -c "echo 'Reply with the single word ok' | claude -p --output-format text --model sonnet"
# expected output: ok
```

If the model name "sonnet" isn't recognised on your account, override `CLAUDE_MODEL` in `.env` to a model your account has access to (`opus`, `haiku`, or a full ID like `claude-sonnet-4-6`) and `docker compose up -d` to apply.

### 3b. Create the other two credentials in n8n (one-time)

The workflow references two more credentials by name. Create them via the n8n UI:

| Credential type       | Name                           | Fill with                       |
|---|---|---|
| `Google Drive OAuth2` | `Google Drive OAuth2`           | Standard Google Cloud OAuth client (scope `drive.readonly`). The redirect URL is `${WEBHOOK_URL}rest/oauth2-credential/callback` |
| `Jira Software Cloud` | `Jira Cloud (OBDX)`             | `$JIRA_USER_EMAIL` + `$JIRA_API_TOKEN` + your Atlassian domain |

### 4. Import + activate workflow

n8n → Workflows → Import from File → `n8n/workflow-full-qa.json` → Save.

Top-right gear → Variables → add `DRIVE_WATCH_FOLDER_ID` (paste the value from `.env`).

The `Set Config` node's `projectPath` reads from the `PROJECT_PATH` container env (set to `/workspace` in `docker-compose.yml`) — no manual edit needed.

Activate the workflow.

### 5. Exposing the HITL gate publicly (optional)

For local-only use, the HITL resume URL is `http://localhost:5678/webhook-waiting/...` — clickable from your laptop's browser only. To let other QA reviewers click resume links:

```bash
# In a second terminal
ngrok http 5678
```

Update `.env`:

```
N8N_PROTOCOL=https
N8N_HOST=abc123.ngrok-free.app
WEBHOOK_URL=https://abc123.ngrok-free.app/
```

```bash
docker compose up -d   # picks up the new envs
```

### 6. Smoke test

In your watched Drive folder, drop two files:

- `trade-finance__smoke-amend-lc__FSD.md` (paste content from `n8n/examples/sample-tsd.md`)
- `trade-finance__smoke-amend-lc__GO.txt` (just the word `go` is fine)

Within 1 minute the Drive trigger fires. Watch the workflow execute in n8n → Executions. On the HITL gate, the staged JSON appears at `n8n/staging/smoke-amend-lc-cases.json` on the host — review/edit, then GET the resume URL n8n surfaces.

### Stopping / clearing

```bash
docker compose stop                # pause, keep volumes
docker compose down                # remove container, keep volumes
docker compose down -v             # also wipe n8n_data (creds + workflows) and node_modules
```

## Setup — without Docker (legacy)

### 1. Install n8n self-hosted

```bash
npm install -g n8n
n8n start
```

Open `http://localhost:5678`.

### 2. Install + authenticate the Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
claude                                # one-time interactive login, then /exit
```

The login persists at `~/.claude/`. The workflow's four Claude stages run `claude -p` against this saved session — no API key needed.

### 3. Create credentials in n8n

You need **two** credentials. The workflow references them by name:

| Credential type | Name | Notes |
|---|---|---|
| `Google Drive OAuth2` | `Google Drive OAuth2`           | Standard Google Cloud OAuth client (scope: `drive.readonly`) |
| `Jira Software Cloud` | `Jira Cloud (OBDX)`             | Email + API token + domain (e.g. `your-org.atlassian.net`) |

The Jira credential's `domain` field is referenced from the attachment-upload node via `$credentials.jiraSoftwareCloudApi.domain`, so it must be filled out.

### 4. Set workflow variable

Workflow → top-right gear → Variables → add:

| Key | Value |
|---|---|
| `DRIVE_WATCH_FOLDER_ID` | Google Drive folder ID (the part of the folder URL after `/folders/`) |

### 5. Update `Set Config` defaults if needed

The `Set Config` node defaults:

- `projectPath` reads from `PROJECT_PATH` env, falling back to the Windows path baked into the workflow. Set `PROJECT_PATH` in the shell or container env to override.
- `jiraProjectKey = OBDX`

To switch the Claude model, export `CLAUDE_MODEL` in the same shell where `n8n start` runs (e.g. `CLAUDE_MODEL=opus n8n start`).

Edit if your local path / project key differs.

### 5. Import + activate

n8n → Workflows → Import from File → `workflow-full-qa.json`. Save → Activate.

## How the HITL gate works

When Stage 2 finishes, the workflow:

1. Writes the test-cases JSON to `n8n/staging/<slug>-cases.json`
2. Pauses on the `HITL — wait for QA approval` Wait node
3. Surfaces a **resume URL** in the workflow execution view (and in the optional notification you can wire in)

QA's actions:

- Open `n8n/staging/<slug>-cases.json`
- Edit it freely (add/remove/reword test cases; fix typos in `expected_result`; flip priorities)
- Save the file
- **GET the resume URL** in a browser (or `curl` it)

The next node re-reads the file from disk, so all your edits flow through to Stage 3. No JSON pasted into the n8n form — file-on-disk is the contract.

To skip HITL entirely, delete the Wait node and wire `Parse + stage test cases` directly to `Build Stage-3 Prompt`.

## What you get back

The `Final summary` node returns:

```json
{
  "status": "ok",
  "feature": "amend-import-lc",
  "specPath": ".../tests/trade-finance/amend-import-lc.spec.ts",
  "testDataPath": ".../data/amendImportLcTestData.ts",
  "playwright": { "exitCode": 0, "stdoutTail": "…" },
  "customReport": ".../reports/custom-report.html",
  "htmlReport":   ".../playwright-report/index.html",
  "jira": {
    "issuesCreated": ["OBDX-1023", "OBDX-1024"],
    "bugCount": 2
  }
}
```

### Failure modes

| `status` | `stage` | Meaning |
|---|---|---|
| `error` | `tsc-failed` | The generated spec failed `tsc --noEmit`. Response includes `tsc_stdout` / `tsc_stderr`. Almost always: Stage 3 called a method on a flow POM that doesn't exist — extend the page object, or extend the prompt's "use only these existing methods" allow-list. |
| `ok`    | `executed`, `jira.bugCount > 0` | Some tests failed, Jira bugs were created with attachments. Open `customReport` or `htmlReport` to investigate. |
| `ok`    | `executed`, `jira.bugCount = 0` | All tests passed. |

## Architecture notes

### Why four Claude calls instead of one

Each stage produces a **diffable artefact**:

1. **Digest JSON** — reviewable summary of what the FSD/RSD/REQ actually said. Catches doc inconsistencies before they pollute test cases.
2. **Test data .ts** — typed file, committed to the repo, can be re-used across many specs.
3. **Test cases JSON** — manual-test-case format, edited by QA in the HITL gate.
4. **Playwright spec** — runnable code.

Decoupling means: re-running Stage 3 alone (e.g. after fixing a POM method) is cheap; you don't burn a new digest.

### Why "append-mode" test data

The project convention is **one `data/<flow>TestData.ts` per flow**, accumulating values across many features added over time. Append-mode means:

- Existing keys are preserved exactly (including comments, type annotations).
- New keys are added to the appropriate section (or a new section if a new tab appears).
- If the digest conflicts with an existing value, the existing value WINS and a `// NOTE: digest specifies <X>; existing value retained — review` comment is added.

This protects test data from accidental regression when a new FSD revision introduces a slightly-different default value.

### Why the prompts are duplicated in `prompts/*.md` and inside the workflow

Editing prompt text inside an n8n `Code` node is painful. The standalone `.md` files exist so prompts can be edited in VS Code with sane formatting, then pasted back into the Code nodes. **If you change one, change the other.** A future enhancement: load prompts from disk via a `Read Binary File` node at workflow-start, removing the duplication.

### Why Jira attachments use a raw HTTP node, not the Jira node

n8n's Jira node (v1) does not have a first-class "attach file" operation. The Jira REST API exposes `POST /rest/api/3/issue/{key}/attachments` with multipart form data + the `X-Atlassian-Token: no-check` header. We use the `HTTP Request` node configured for that endpoint, authenticated via the same Jira Cloud credential.

### Why Claude Code CLI instead of the Anthropic HTTP API

Three reasons:

1. **No API key needed.** The CLI uses your Claude.ai subscription (Pro / Max). Auth is interactive once, then persisted in the `obdx_qa_claude_auth` volume. No `sk-ant-...` to provision, rotate, or budget.
2. **Predictable cost.** Pay-per-token would run ~$0.30 per feature on Sonnet, ~$1.50 on Opus. CLI runs against your subscription quota — cost is flat, not per-call.
3. **Same models.** `claude -p --model sonnet` resolves to the latest Sonnet your account can access. Same quality as the API, different billing path.

Tradeoff: **subscription rate limits, not pay-per-token.** Sustained bulk-batch runs (e.g. 20 features in one hour) may throttle, where pay-per-token would just bill more. For day-to-day QA, the CLI path is the right default.

### How the CLI is wired into the workflow

Each Claude stage is two nodes:

1. A `Code` node ("Build Stage-N Prompt") that assembles the project-context block + system text + user input and writes it to `/tmp/<slug>-stageN-prompt.md`.
2. An `Execute Command` node ("Claude — Stage N (...)") that runs:
   ```
   cd "$PROJECT_PATH" && claude -p --output-format text --model "${CLAUDE_MODEL:-sonnet}" < /tmp/<slug>-stageN-prompt.md
   ```
   The CLI's stdout (the assistant's response) becomes the next node's `$json.stdout`, where the downstream parser extracts the fenced code block.

If you ever need to swap back to the HTTP API (e.g. for a high-volume CI run with no rate limits), each `Execute Command` node can be replaced with an `HTTP Request` node pointing at `https://api.anthropic.com/v1/messages` — the prompt assembly stays identical.

### How project context flows into every stage

A single consolidated knowledge base — `n8n/project-context.md` — feeds every Claude stage. It's auto-generated from the four canonical skills:

```
.claude/skills/pipeline.md
.claude/skills/obdx-25.1-framework/SKILL.md
.claude/skills/qa-test-case-writer/{SKILL, coverage-patterns, techlogix-standards, references/obdx-format}.md
.claude/skills/playwright-script-writer/{SKILL, framework-conventions, selector-strategy, code-patterns}.md
        │
        ▼ scripts/build-project-context.js
n8n/project-context.md   (≈ 145 KB / ≈ 36k tokens, 10 sections, ToC + anchors)
        │
        ▼ Load Project Context node (runs the build script first, then reads)
<PROJECT_CONTEXT> ... </PROJECT_CONTEXT>  ← prepended to all 4 Stage prompts
```

The `Load Project Context` Code node:

1. Runs `node scripts/build-project-context.js` (idempotent, ~50 ms).
2. Reads the resulting `n8n/project-context.md`.
3. Emits the content as `projectContext` for every downstream Stage builder.

All four Stage builders wrap that single string in `<PROJECT_CONTEXT>` at the top of their `/tmp/<slug>-stageN-prompt.md` — same context, every stage. Plus `cd "$PROJECT_PATH"` before `claude -p` so CLAUDE.md auto-discovery kicks in too.

| Stage | Context per call | ≈ tokens |
|---|---|---|
| 0 — Digest      | full `project-context.md` | ~36k |
| 1 — Test Data   | full `project-context.md` | ~36k |
| 2 — Test Cases  | full `project-context.md` | ~36k |
| 3 — Playwright  | full `project-context.md` | ~36k |

Per-run total: ~144k context tokens across 4 calls (well under Sonnet's 200k window per call).

**Maintenance flow:**

- Edit any skill file in `.claude/skills/` → next workflow run regenerates `project-context.md` automatically.
- Add a new skill or content file → edit the `SECTIONS` array in `scripts/build-project-context.js` (one place).
- Manually regenerate any time: `node scripts/build-project-context.js`.
- `n8n/project-context.md` is a derived artefact — review it for what the LLM sees, but don't hand-edit (it's overwritten on every workflow run).

## Limitations / known gaps

- **`.docx` ingestion** is not native. Convert to `.pdf` / `.md` or use Google Docs.
- **Stage-3 method allow-list** is encoded in the prompt only — it doesn't introspect the actual POM source. When you add a new method to `ImportLcFlowPage`, the prompt won't know unless you update `prompts/v2-03-playwright.md` (and the Code node mirror).
- **Append-mode is text-level**, not AST-level. If the existing file has unusual formatting (e.g. multi-line nested objects), Stage 1 may struggle to preserve it exactly. A future enhancement: parse with `ts-morph` and merge at AST level.
- **HITL resume URL** is shown in the workflow execution view by default — no notification is sent. To get a Slack/email ping when the workflow pauses, insert a `Slack` / `Email` node between `Parse + stage test cases` and the Wait node.
- **No retry loop on tsc failure.** A v2 idea: feed the tsc errors back to Claude with the original spec and ask for a fix, capped at 1 retry.
- **Multi-feature batch mode.** This workflow handles one feature per GO marker. Drop multiple `<slug>__GO.txt` files into the folder and they'll each fire independently.

## Relationship to the original `workflow.json`

The original `workflow.json` is **simpler and Trade-Finance-only**: form-trigger with a pasted TSD, two-stage generation (test cases + spec), no Drive, no Jira, no HITL. Keep using it for **quick experiments** within Trade Finance. Use `workflow-full-qa.json` for **production QA runs across any OBDX module** where you want Drive-driven inputs, business scenarios, and Jira tracking.

Both workflows can coexist — they have different webhook IDs and node names.

## Cross-module checklist when onboarding a new module

When you start automating a module that doesn't yet have page objects in the repo (Funds Transfer, Bill Payment, Reports, Bulk File Upload, …), expect a first pass like this:

1. First run drops a spec in `tests/<module>/<feature>.spec.ts` with `// FIXME: missing on <FlowPage> — add method <name>(...)` markers.
2. tsc gate fails (no POM yet) — workflow returns `stage: tsc-failed`.
3. You manually create `pages/<module>/<FlowPage>.ts` with the flagged methods, using the digest's `tabs[]` as a structural guide.
4. Add a fixture entry for the module to `fixtures/auth.fixture.ts` so the spec can use `{ loggedInDashboard, <flowPage> }`.
5. Re-trigger the workflow (or run Stage 3 only). The spec compiles and runs.

This onboarding cost is one-time per module. After that, every new feature in the same module produces a ready-to-run spec.
