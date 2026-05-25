# N8N Test Generator & Runner — OBDX 25.1

End-to-end N8N workflow that takes a TSD/UST, generates OBDX-format manual test cases, transpiles them into a runnable Playwright `.spec.ts`, and (optionally) executes the suite against the local OBDX instance.

```
TSD/UST  →  Claude (Stage 1: 11-col test cases)
              │
              ▼
         Claude (Stage 2: .spec.ts conforming to obdx-25.1-framework)
              │
              ▼
         Write tests/trade-finance/<slug>.spec.ts
              │
              ▼
         npx tsc --noEmit  ──fail──▶  return TS errors
              │ pass
              ▼
         (optional) npx playwright test  →  parse results.json  →  return summary
```

## Files in this folder

| File | Purpose |
|---|---|
| `workflow.json` | Importable N8N workflow. The two Claude system prompts are embedded in `Code` nodes for portability. |
| `prompts/01-test-cases.md` | Stage-1 system prompt (kept in sync with the workflow's `Build Stage-1 Prompt` node — edit both). |
| `prompts/02-playwright.md` | Stage-2 system prompt (kept in sync with `Build Stage-2 Prompt`). |
| `examples/sample-tsd.md` | Sample TSD for a smoke-test of the workflow. |

## Prerequisites

The workflow runs **shell commands on the same machine where N8N is running**, so it must be self-hosted (not n8n.cloud) and have:

- Node.js 18+
- This project cloned, with `npm install` and `npx playwright install chromium` done.
- A reachable OBDX 25.1 instance at the URL configured in `.env` (`BASE_URL`).
- An Anthropic API key with access to `claude-sonnet-4-6` (or change the model in `Set Config` — Opus 4.7 produces stronger code at higher cost).

The workflow's `Set Config` node hard-codes the project path:

```
projectPath = E:/QA Artifacts/HBL-TradeFinance-Automation-main/obdx-ilc-playwright
```

Update this if your repo lives elsewhere.

## Setup

### 1. Install N8N (self-hosted)

```bash
npm install -g n8n
n8n start
```

Open `http://localhost:5678`.

### 2. Create the Anthropic credential

In N8N → Credentials → New → **Header Auth**:

- Name: `Anthropic API Key (x-api-key)`
- Header Name: `x-api-key`
- Header Value: `<your sk-ant-... key>`

The workflow's two HTTP Request nodes already reference this credential by name.

### 3. Import the workflow

N8N → Workflows → Import from File → pick `n8n/workflow.json`.

Open the workflow, click **Save**, then click **Activate** (top-right).

### 4. Trigger it

The Form Trigger exposes a public form URL. Click `Form Trigger` → **Open form** → fill in:

| Field | Example |
|---|---|
| TSD or UST | (paste contents of `examples/sample-tsd.md`) |
| Feature slug | `amend-import-lc` |
| Module code | `AMLC` |
| Execute tests after generation? | `no` (first run), `yes` (subsequent) |

Submit. The form returns the JSON summary directly.

## What you get back

### Generation only (`Execute tests = no`)

```json
{
  "status": "ok",
  "stage": "generated",
  "specPath": ".../tests/trade-finance/amend-import-lc.spec.ts",
  "message": "Spec generated and TypeScript-checked..."
}
```

The spec is on disk, ready for you to review. Open it in VS Code, eyeball the `// FIXME:` comments (these mark test steps where Stage-2 needed a page-object method that doesn't exist yet), and add the missing methods to `ImportLcFlowPage` before running.

### Generation + execution (`Execute tests = yes`)

```json
{
  "status": "ok",
  "stage": "executed",
  "specPath": ".../tests/trade-finance/amend-import-lc.spec.ts",
  "summary": {
    "status": "passed",
    "passed": 18,
    "failed": 0,
    "skipped": 2,
    "flaky": 0,
    "duration_ms": 412330,
    "failures": []
  },
  "stdout_tail": "…last 4 KB of npx playwright test output…"
}
```

The full HTML report is at `playwright-report/index.html` as configured by the project's `playwright.config.ts`.

### Failure cases

| `status` | `stage` | What it means |
|---|---|---|
| `error` | `tsc-failed` | TypeScript compile failed on the generated spec. Response includes `tsc_stdout` / `tsc_stderr`. Almost always: Stage-2 called a method on `ImportLcFlowPage` that doesn't exist — extend the page object or refine the prompt allow-list. |
| `ok` | `executed` with `summary.status = failed` | Spec compiles and runs, but tests fail. `failures[]` lists the first 5 lines of each error. Investigate normally (HTML report, screenshots, video). |
| `ok` | `executed` with `summary.status = no-results` | Playwright started but `playwright-report/results.json` was not produced (usually a top-level crash before any test ran). Check `stdout_tail`. |

## Architecture notes

### Why two Claude calls instead of one

Stage 1 produces a **structured artefact** (the 11-column test-case JSON) that's reviewable, diffable, and storable. It's the same output a human QA engineer produces in `data/manual-test-cases.xlsx`. Decoupling the two stages means:

1. You can review and edit the test cases between stages (add a manual `Edit JSON` step in N8N if you want a human-in-the-loop checkpoint).
2. If only the spec needs regenerating (e.g. you fixed a page-object method name), you can re-run Stage 2 alone with the same Stage-1 JSON.
3. Each prompt is focused — easier to debug than a single mega-prompt.

### Why HTTP Request to the Anthropic API instead of the LangChain node

Portability — the workflow imports cleanly into any N8N instance without requiring `@n8n/n8n-nodes-langchain` to be installed. If you'd rather use the LangChain Anthropic node (`Anthropic Chat Model`), swap the two `Claude — *` nodes; everything else stays the same.

### Why no automatic fix-and-retry loop

A retry loop adds value only if the failure mode is well-bounded (e.g. always a missing page-object method) — which it isn't yet. Until we have a clear catalogue of recurring failure modes, an "AI fixes its own broken spec" loop tends to spiral. v2 idea: add a `Code → Self-Heal` branch off `If TSC Passed`'s false leg that feeds the `tsc` errors back to Claude with the original spec for a second attempt, capped at 1 retry.

### Why the prompts are duplicated in `prompts/*.md` and inside the workflow

Editing prompt text inside an N8N `Code` node is painful. The standalone `.md` files exist so you can edit prompts in VS Code with sane formatting, then paste back into the workflow node when satisfied. **If you change one, change the other.** A future enhancement is to load the prompts from disk via a `Read Binary File` node — but that adds a dependency on the project being mounted at a known path inside N8N.

## Extending the workflow

Common extensions, ranked by effort:

1. **Add Slack notification on failure.** Insert a `Slack` node after `Parse Results` filtered by `summary.failed > 0`.
2. **Generate the manual `manual-test-cases.xlsx` row block.** After `Parse Test Cases`, add a `Code` node that converts the JSON into the 11-column row format and a `Write Binary File` that runs `scripts/append-trade-finance-tcs.js`-style logic (or shells out to a new append script that takes a JSON file as input).
3. **Self-heal loop on TSC failure.** See architecture note above.
4. **Multi-module batch mode.** Replace the Form Trigger with a `Schedule Trigger` + a `Read Binary File` that walks a folder of TSD `.md` files; the rest of the pipeline already runs once per item.
5. **Maker + Checker two-context tests.** Stage 2's prompt currently scopes to Maker only. To produce dual-control tests, extend `auth.fixture.ts` with a `loggedInChecker` fixture and update the prompt's `OBDX GOTCHAS` block to allow it.

## Limitations (be honest about these)

- The Stage-2 prompt's "use only these existing methods" allow-list is a hand-maintained snapshot of `ImportLcFlowPage`. When you add new methods to that class, update the prompt or Stage 2 will keep emitting `// FIXME:` markers.
- The workflow assumes the OBDX test instance is reachable from the machine running N8N. If it's behind VPN, the N8N host must be on the VPN.
- Playwright is configured with `headless: false` in `playwright.config.ts`. This works for a local dev box but not for headless CI — override with `PWDEBUG=0 HEADLESS=true` or change the config before running on a server.
- `playwright-report/index.html` is overwritten on every run. Archive it (Code node + timestamped copy) if you need history.
- Cost: a typical small TSD costs ~$0.10–$0.30 per run on Sonnet 4.6 (most of it Stage 2). Opus 4.7 is roughly 5× that. Cache the system prompts via prompt caching (`cache_control` header on the `system` field) if you run the workflow many times an hour — the prompts are identical across runs and cache nicely.
