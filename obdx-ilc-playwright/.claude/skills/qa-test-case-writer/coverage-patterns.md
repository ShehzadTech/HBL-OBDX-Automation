# Coverage Patterns — Reference

Pattern detection and per-pattern coverage checklists. Use this file to ensure test case coverage matches the kind of UST being tested, so that API USTs don't miss HTTP-contract tests, UI USTs don't miss accessibility tests, workflow USTs don't miss invalid state transitions, and integration USTs don't miss failure modes.

## How to use this file

Before finalising test cases in the Full Pipeline, Enricher, or Targeted workflows, run pattern detection on the UST:

1. Read the pattern detection cues below
2. Identify which pattern (or patterns — a UST can match more than one) applies to the current UST
3. For each matched pattern, apply the **Standard Coverage Checklist** for that pattern
4. If a checklist item is already covered by test cases you generated, skip it
5. If a checklist item is not covered AND is applicable given the UST details, generate test cases for it
6. If a checklist item is not applicable to this specific UST, note it in Coverage Notes as "Not applicable: [reason]"

If the UST doesn't clearly match any pattern, fall back to general coverage (positive, negative, boundary, edge) without pattern-specific additions — but note this in Coverage Notes so the user knows to review extra carefully.

**Do not force a pattern if the UST doesn't match.** It's better to produce a leaner output with general coverage than to pad with irrelevant pattern-specific test cases.

**Multi-pattern USTs are common.** A "patient books appointment via web form that calls the booking API" UST is both UI and API. Apply both checklists; explicitly scope which test cases address which layer.

---

## Pattern 1: REST API Endpoint

### Detection cues

A UST matches this pattern if it contains any of:

- HTTP method + path (e.g. `GET /identity/{ucid}`, `POST /appointments`, `PUT /users/{id}`)
- Mention of RAML, OpenAPI, Swagger, or API specification files
- Mention of endpoint, route, path parameter, query parameter, request body, response body
- Mention of HTTP status codes (200, 201, 400, 401, 404, 500, etc.)
- Mention of stored procedures called from API layer, database access via API
- Mention of bearer tokens, API keys, OAuth scopes, mTLS at the API layer
- System/service names ending in `-api`, `-service`, or similar (e.g. `sys-api-identity`)
- Headers, content types, response formats (JSON, XML, protobuf)

If two or more cues are present, the UST is a REST API endpoint.

### Standard Coverage Checklist

**A. Happy path — per resource type**
- Valid request returns expected status (usually 200, 201 for POST, 204 for DELETE) with expected body
- If the endpoint returns different response shapes based on resource type, one test case per type

**B. HTTP method validation**
- Unsupported methods on the same path return **405 Method Not Allowed**
- Example: for GET /identity/{ucid}, test POST/PUT/DELETE/PATCH on same path — all should return 405

**C. Path parameter validation**
- Non-existent resource → 404
- Malformed parameter → 400 (specific assertion, not "400 or 404")
- Empty/missing path segment → 404 route not matched
- Case sensitivity (same identifier in different cases: same result or different?)
- URL encoding edge cases (`%20`, `+`, `/`, `#`, trailing slashes)
- Very long parameter values — at least one test probing for 414 URI Too Long

**D. Query parameter validation (if applicable)**
- Required query params missing → 400
- Unexpected/unknown query params → 400 or ignored (test actual behaviour)
- Query param with invalid type → 400

**E. Request body validation (for POST/PUT/PATCH)**
- Missing required fields → 400 with specific error
- Extra/unknown fields → 400 or ignored (test actual behaviour)
- Invalid field types → 400
- Empty request body → 400
- Malformed JSON/XML → 400

**F. Header handling**
- Valid Accept header returns matching Content-Type
- Unsupported Accept header → 406 Not Acceptable
- Missing Content-Type on POST/PUT/PATCH → 415 or 400
- Case-insensitive header name matching

**G. Authentication & authorisation**
- Missing auth header → 401
- Invalid/malformed auth token → 401
- Expired token → 401
- Valid token for different user/tenant accessing another user's resource → 403
- Role-based access differences (if roles are defined)

**H. Response contract validation**
- Response body validates against the published schema (RAML/OpenAPI/Swagger)
- Required fields present on 2xx responses
- Error body structure consistent on 4xx/5xx responses
- If spec includes examples, examples pass schema validation

**I. Downstream dependency failure**
- Backing database unreachable → 500 with safe error message (no DB internals leaked)
- Backing service timeout → 504 or 500
- Stored procedure error → 500
- Explicit assertion: no sensitive error details leaked

**J. Performance / SLA**
- At least one response-time assertion. If the UST doesn't specify an SLA, raise as a Clarifying Question AND still include a baseline with a reasonable default (e.g., 1s for simple lookups, 3s for complex aggregations).

**K. Idempotency & consistency**
- GET: repeated calls return identical results
- PUT: repeated identical calls have identical effect
- DELETE: repeated calls after first success return 404 or 204 consistently
- Concurrent requests for same resource: consistent responses

**L. Audit / observability**
- Successful access generates audit log with caller identity, resource accessed, timestamp
- Failed access attempts are logged
- For confidential domains (healthcare, finance, identity) — mandatory; if not in UST, raise as CQ

**M. Injection & security hardening**
- Parameters with SQL-like characters (`'`, `;`, `--`, `/*`) safely handled
- Path traversal attempts (`../`) rejected
- XSS payloads in string fields escaped on response (if rendered anywhere)

**N. Caching behaviour (if applicable)**
- Caching headers (Cache-Control, ETag, Last-Modified) honoured if set
- After data change, cache serves fresh data (or correctly serves stale per design)

### Coverage expectations

Typical: 20–35 test cases. Below 15 likely means gaps. Above 40 likely means consolidating opportunities.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"REST API Pattern Checklist Status"** listing each category A–N with:
- ✅ Covered by TC-XXX-NNN (list IDs)
- ⚠️ Partially covered — [what's missing]
- ❌ Not covered — [reason]
- N/A — [reason]

---

## Pattern 2: UI Feature

### Detection cues

A UST matches this pattern if it contains any of:

- User-facing language ("as a user", "patient sees", "dispatcher clicks", "displays")
- Screen, page, form, button, modal, dialog, dropdown, tooltip, menu
- URL paths that serve HTML views (not API routes) — e.g. `/portal/dashboard`, `/login`
- Field validation language (required, min length, max length, format)
- Visual outcomes — redirect, display, show, hide, enable, disable, highlight
- Browser behaviour — back button, refresh, session, cookie, tab
- Responsive, mobile, tablet, desktop
- Keyboard, screen reader, accessibility, ARIA, WCAG

If two or more cues are present, the UST is a UI feature.

### Standard Coverage Checklist

**A. Happy path**
- Primary user flow completes successfully
- Observable outcome: URL change, visible UI state, data persistence confirmed on reload
- All success-state UI elements render (confirmations, indicators, data displays)

**B. Form field validation (if forms are present)**
- Required fields: blank submission → blocked with specific error near field
- Min/max length: at, below, and above the limits
- Format validation: invalid inputs for typed fields (email without @, phone with letters, etc.)
- Character encoding edge cases (emoji, RTL scripts, very long strings)
- Paste behaviour (especially for password fields with show/hide toggles)
- Whitespace handling (leading/trailing trim behaviour)

**C. Authorisation & visibility**
- Page accessible to authorised user role → renders correctly
- Page accessed by unauthorised role → redirect or 403 page
- Page accessed when logged out → redirect to login
- Conditional UI elements (admin-only buttons, etc.) visible only to appropriate roles

**D. State & session**
- Session expiry during page interaction → redirect or warning modal
- Browser back button after action → expected state (not resubmission or stale data)
- Browser refresh preserves expected state (form values / scroll position / selected tab per design)
- Multiple tabs: action in one tab reflects in others (or doesn't, per design)

**E. Loading, error, and empty states**
- Loading indicator while async operations run
- Network error during async operation → user-visible error, retry option if applicable
- Empty-data state (no results, no appointments, no records) → designed empty message, not broken UI
- Partial data / slow API → graceful degradation, not blank page

**F. Responsive / multi-device**
- Mobile viewport (≤ 480px): layout reflows, no horizontal scroll, touch targets ≥ 44px
- Tablet viewport (768–1024px): layout intermediate
- Desktop (≥ 1280px): layout as designed
- Portrait/landscape orientation on mobile

**G. Cross-browser**
- Chrome (primary)
- Firefox
- Safari (if macOS/iOS users in scope)
- Edge
- Note: document the browser matrix agreed with the team; if not defined, raise as CQ

**H. Accessibility (WCAG 2.1 AA minimum)**
- Keyboard-only navigation: all interactive elements reachable via Tab
- Focus indicators visible on all interactive elements
- Screen reader: labels announced correctly, form fields have accessible names, error messages announced
- Colour contrast: text meets 4.5:1 ratio (3:1 for large text)
- No information conveyed by colour alone
- ARIA attributes used correctly where applicable
- Heading hierarchy (h1 → h2 → h3) is logical

**I. Visual regression**
- Component renders consistently with design spec (usually a visual QA step, not a functional test — but flag in Coverage Notes)
- Fonts, spacing, colours match design system

**J. Error recovery**
- Validation errors clear on correction (don't persist after the user fixes the issue)
- Form data preserved if submission fails (user doesn't lose their work)
- Destructive actions have confirmation (delete, cancel, logout)

**K. Performance**
- Initial page load time under threshold (e.g. LCP < 2.5s for good UX)
- Interaction responsiveness (INP < 200ms)
- If the UST doesn't specify, include a baseline and raise as CQ

**L. Content & localisation**
- All user-facing strings externalised (not hardcoded) if product supports multiple languages
- Long translated strings don't break layout
- Date/time/number formats respect locale

**M. Privacy & confidential data**
- Password fields masked by default, show-password toggle works
- Sensitive data (SSN, MRN, card numbers) masked in displays where appropriate
- Data doesn't appear in browser history / URL params when sensitive
- No PII logged to browser console

### Coverage expectations

Typical: 20–35 test cases. Accessibility coverage alone often adds 5+ dedicated test cases.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"UI Feature Pattern Checklist Status"** listing A–M.

---

## Pattern 3: State-change Workflow

### Detection cues

A UST matches this pattern if it contains any of:

- State names or statuses (Draft, In Progress, Completed, Cancelled, Approved, Rejected, Active, Inactive)
- Language about status transitions ("moves from X to Y", "can only be edited while…", "cannot be changed once…")
- Role-specific permissions ("paramedic can edit", "dispatcher can view", "supervisor can override")
- Audit trail / audit log / history / change log
- Real-time sync, propagation, notification on change
- Concurrent actor scenarios (multiple users on same resource)
- Time-based automatic transitions (auto-cancel after 24h, auto-archive after 30d)
- Approval workflows, review workflows, escalation

If two or more cues are present, the UST is a state-change workflow.

### Standard Coverage Checklist

**A. Happy path — per valid transition**
- Each allowed transition triggered by correct role → succeeds and state updates
- Post-transition observable state (UI shows new status, DB row updated, events fired)

**B. Invalid transitions**
- Every disallowed transition attempted → rejected with specific error
- E.g. if valid is `In Progress → Completed`, test `Completed → In Progress` (reverse not allowed)
- Test that bypass attempts via direct API calls are also rejected (not just UI-blocked)

**C. Role-based access**
- Each role that SHOULD be able to perform an action → succeeds
- Each role that should NOT → rejected with 403 / unauthorised error
- Privilege escalation attempts (lower-priv user crafting request as higher-priv) → rejected
- For each transition, test at least one authorised and one unauthorised role

**D. Assignment / ownership**
- Only the assigned actor can perform the restricted action (e.g. only the paramedic assigned to an incident can edit it)
- Un-assigned user attempting same action → rejected
- Re-assignment mid-workflow: old assignee loses access, new assignee gains it

**E. Audit history**
- Every state change generates an audit log entry with: actor, timestamp, previous value, new value, reason (if applicable)
- Audit entries immutable (cannot be edited or deleted by normal users)
- Audit entries visible to appropriate roles (usually includes supervisors)

**F. Real-time sync / propagation**
- Change by one actor visible to other actors within the specified SLA (e.g. 5 seconds)
- WebSocket/polling mechanism tested for correctness
- Network interruption during sync → recovery on reconnect, no lost updates

**G. Concurrent actors**
- Two users editing same resource simultaneously → last-write-wins or optimistic locking behaviour per design
- Conflict detection (if optimistic locking): second user sees conflict error, not silent overwrite
- Reading while another user edits: reader sees consistent state (pre-edit or post-edit, not partial)

**H. Time-based transitions (if applicable)**
- Automatic transitions fire at correct time
- Manual intervention before auto-transition preserves manual action
- Clock skew / timezone handling: transitions based on server time, not client time

**I. Approval / review flows (if applicable)**
- Submission → pending approval state
- Approval by authorised role → moves to next state
- Rejection by authorised role → moves to rejected state with reason required
- Re-submission after rejection → returns to pending
- Approver cannot approve own submission (separation of duties)

**J. Data integrity across transitions**
- Required fields per state: transition blocked if required fields for target state are missing
- Immutable fields after transition: fields locked after state X cannot be edited
- Dependent records: cascade updates / deletes work correctly per design

**K. Notifications**
- State change triggers expected notification (email, push, in-app)
- Notification sent to correct parties (assigned, watchers, supervisors)
- Notification content includes correct state and context
- Notification deduplication if rapid transitions occur

**L. Override & exception paths**
- Supervisor override of normal rules (e.g. edit after Completed) → allowed with extra authentication / reason capture
- Override generates distinct audit entry flagged as an override
- Override cannot bypass legally-required holds (if applicable)

**M. Observable outcomes per state**
- For every state, a test confirming the observable indicators: UI badge, DB row value, API response field, downstream event

### Coverage expectations

Typical: 25–40 test cases. State-change workflows have more combinatorial coverage than simple features.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"State-change Workflow Pattern Checklist Status"** listing A–M.

---

## Pattern 4: Integration

### Detection cues

A UST matches this pattern if it contains any of:

- Third-party service names (Salesforce, Stripe, Twilio, SendGrid, etc.)
- Integration, webhook, callback, event, message queue
- MCP (Model Context Protocol) tool calls, connector
- Sync, replication, data feed, nightly job, batch
- File transfer (SFTP, S3, FTP)
- Enterprise service bus, middleware, Mulesoft, ESB
- Retry, circuit breaker, dead letter queue, timeout, backoff
- Transformation, mapping, ETL

If two or more cues are present, the UST is an integration.

### Standard Coverage Checklist

**A. Happy path — full round trip**
- Message/call from source arrives at destination intact
- Data transformed correctly at each hop (schema mappings, unit conversions, timezone)
- Acknowledgements / confirmations returned to source where expected

**B. Source → destination schema mapping**
- All required fields mapped correctly
- Optional fields handle both present and absent cases
- Default values applied correctly when source doesn't provide
- Unknown source fields handled per design (ignored, logged, or rejected)

**C. Data type & format handling**
- Dates/times across timezones (source in UTC, destination in local, or vice versa)
- Numeric precision (source float → destination decimal with correct rounding)
- String encoding (UTF-8, special characters, emoji)
- Null vs empty string vs missing — each handled distinctly

**D. Authentication & credentials**
- Valid credentials → successful connection
- Expired credentials → graceful failure with clear error, retry after refresh
- Revoked credentials → immediate failure, no silent retries
- Credential rotation (old and new valid during grace period)

**E. Network & transport failures**
- Destination unreachable → retry per policy, escalation on repeated failure
- Timeout during call → retry with backoff, idempotency respected
- Partial delivery / connection drop mid-payload → recovery or clean failure
- DNS failure, TLS handshake failure, certificate expiry

**F. Rate limiting & throttling**
- Within rate limit → normal behaviour
- At rate limit → throttle respected, requests queued or delayed
- Exceeds rate limit → 429 response handled, backoff applied
- Burst handling if applicable

**G. Retry logic**
- Retryable errors (5xx, timeouts) trigger retry per config
- Non-retryable errors (4xx) do NOT retry — fail fast
- Max retry count respected, no infinite loops
- Exponential backoff timing correct

**H. Idempotency**
- Duplicate message delivery → destination processes once (if idempotent)
- Idempotency key mechanism works if implemented
- If not idempotent, duplicate detection alert/log generated

**I. Dead letter / error queue**
- Messages that fail all retries land in DLQ with full context (payload, error, attempts)
- DLQ alerts trigger per config
- DLQ reprocessing after fix works correctly

**J. Circuit breaker (if applicable)**
- Open circuit → fast-fail with specific error, no overload on failing downstream
- Half-open state → probe requests, close on success, re-open on continued failure
- Metrics emitted for circuit state changes

**K. Ordering & consistency**
- Messages delivered in correct order where required (or documented as not required)
- Out-of-order delivery handled if it can occur
- Eventual consistency windows respected (don't assert immediately after async writes)

**L. Batch / bulk operations (if applicable)**
- Large batches: all records processed
- Batch failures: partial success semantics (per design — all-or-nothing vs best-effort)
- Batch size limits: at, below, and above the limit

**M. Monitoring & observability**
- Success/failure metrics emitted to monitoring system
- Correlation IDs propagate end-to-end for traceability
- Log entries contain enough context to debug (request ID, timestamps, source/dest)
- Alerts fire on elevated failure rates

**N. Data privacy across boundary**
- Only necessary fields cross the integration boundary (no over-sharing)
- PII / confidential fields encrypted in transit (TLS) and at rest (if persisted)
- Logs don't contain sensitive payload content
- Data retention at destination respects source policies

**O. Replay & reconciliation**
- Historical replay for recovery works (e.g. after destination outage)
- Reconciliation check detects discrepancies between source and destination
- Manual repair tools work (if applicable)

### Coverage expectations

Typical: 25–40 test cases. Integrations require extensive failure-mode coverage — easily under-tested.

### Mandatory Pattern Checklist Status

Coverage Notes must end with **"Integration Pattern Checklist Status"** listing A–O.

---

## Cross-cutting micro-pattern: Date-sensitive behaviour

Some USTs contain cut-off, deadline, expiry, or calendar-based logic that needs explicit boundary coverage **regardless of which main pattern(s) apply**. Apply this micro-pattern IN ADDITION to the main pattern checklist(s) — not instead of.

### Detection cues

A UST needs this micro-pattern if it contains any of:

- "by the Xth of [the month / the following month]"
- "within N days", "after N days"
- "cut-off", "deadline", "expires after", "auto-cancelled after", "auto-released after"
- Specific calendar references (15th, end of month, end of quarter, fiscal year end)
- SLA windows defined in calendar days or business days
- Any rule whose correctness depends on clock or calendar state (monthly cycles, billing periods, reporting windows, reservation windows)

If any cue is present, apply the checklist below. If the UST's date logic is only incidental (e.g. a timestamp is stored but no behaviour depends on it), skip this micro-pattern.

### Classify the cut-off type first

Before applying the checklist, determine which kind of cut-off this UST uses:

- **Calendar-anchored cut-off** — absolute date reference: *"by the 15th of the following month"*, *"end of quarter"*, *"before 31 March"*, *"fiscal year end"*. Month length matters because different creation months produce different cut-off dates.
- **Rolling-window cut-off** — elapsed time from an event: *"within 7 days of submission"*, *"24 hours after approval"*, *"30 days from last access"*. Month length mostly doesn't matter because the math is timestamp + N.

Some USTs mix both (e.g. *"within 30 days, but not later than 31 December"*). Apply both lenses in that case.

State the cut-off type at the top of the Date-sensitive Behaviour Checklist Status (e.g. *"Cut-off type: rolling-window (7-day payment window)"*).

**Applicability in the checklist below:**
- Items A, B, E, F, G, H apply to **both cut-off types**.
- Items C and D apply **primarily to calendar-anchored cut-offs**. For rolling windows most C/D sub-items are N/A, EXCEPT that at least one rolling-window test should cross a month boundary and one should cross the leap-year boundary — the date-arithmetic library handling these transitions is a classic bug site, so even rolling windows need 1–2 tests in this area.
- Item I applies only when the UST specifies business days.

When an item is N/A due to cut-off type, mark it **N/A** with the reason (*"N/A — rolling-window cut-off, no creation-month dependency"*). Do not mark it ❌ — this is not a gap, it's out of scope for the cut-off type in use.

### Standard Coverage Checklist

**A. Immediately before the boundary**
- Action one day before cut-off → succeeds
- Action at start / middle / end of the cut-off day itself → succeeds on all three

**B. Immediately after the boundary**
- Action at 00:00:00 on the day after cut-off → blocked with the UST-specified error message (use UST wording verbatim)
- Action mid-day on the day after cut-off → blocked
- Action at 23:59 on the day after cut-off → blocked

**C. Creation date vs action date edge cases**
- Item created on the 1st of a month and one created on the last day of the same month → same cut-off
- Item created at 23:59 on the last day of the month → cut-off falls in the following month (not two months away)

**D. Month length variations** *(each tested as the creation month)*
- 28-day month (February non-leap)
- 29-day month (February leap year)
- 30-day month (April, June, September, November)
- 31-day month
- Each should produce the correct following-month cut-off

**E. Year rollover**
- Item created in December, cut-off falls in January of the following year
- Verify date logic handles the year change correctly — this is a common bug site

**F. Stale beyond one cycle**
- Item from 2+ months before current date — blocked, or purged per policy
- Item from 6+ months ago (long-stale) — handled per policy, no crashes or stack traces

**G. Timezone**
- Which clock defines the boundary — server, user, specific region (e.g. PKT for Techlogix clients)
- Cross-timezone test: user in TZ A, server in TZ B, action at exactly the boundary second
- If the UST doesn't specify, raise as a Clarifying Question AND pick one (usually server time) for the baseline tests

**H. Client-vs-server clock skew**
- Action submitted from client before cut-off, arrives at server after → honoured or blocked per design (server clock usually wins)
- Action submitted from client after cut-off but server clock lags → blocked per server clock

**I. Business day vs calendar day distinction** *(only if UST specifies business days)*
- Weekend handling: Saturday cut-off — rolls to Monday, or holds?
- Public holiday handling

### Coverage expectations

Typical: 8–15 additional test cases on top of the main pattern's checklist. These spread across Boundary (most) and Negative (the "blocked after cut-off" cases) categories.

### Mandatory Pattern Checklist Status

When this micro-pattern is applied, Coverage Notes must include a **"Date-sensitive Behaviour Checklist Status"** sub-section listing A–I with ✅ / ⚠️ / ❌ / N/A, alongside the main pattern's checklist status.

---

## Multi-pattern USTs

Many real USTs match more than one pattern. Handle these by:

1. **Apply every matching pattern's checklist.** Don't pick one and skip others.
2. **Scope test cases by layer.** A single UST like "patient books appointment via web form that POSTs to the booking-api" should produce test cases explicitly scoped to the UI layer (e.g. TC-BOOK-UI-001) and the API layer (e.g. TC-BOOK-API-001). Use the layer suffix in the ID to keep them visually distinct.
3. **Consolidate when honest.** If a test case is genuinely testing end-to-end (UI submission all the way to API response), it can cover one item from each pattern's checklist. But only if it genuinely validates both layers observably.
4. **Report both checklists in Coverage Notes.** Include Pattern Checklist Status for every pattern applied.

### Example

UST: *"Add an Appointment Booking form on /portal/book. Submit calls POST /appointments. On 200, show confirmation and redirect to /portal/appointments. On error, show error inline."*

Matches: UI Feature (form, URL paths, submit, redirect, inline error) AND REST API Endpoint (POST /appointments, 200, error). Apply both.

Scope:
- TC-BOOK-UI-001 through TC-BOOK-UI-015 — form, validation, redirect, error states, accessibility
- TC-BOOK-API-001 through TC-BOOK-API-020 — POST contract, 400/401/409 cases, idempotency, SLA
- 3–5 end-to-end test cases spanning both layers (submitting the form and verifying the API was called correctly)

Coverage Notes ends with *both* "UI Feature Pattern Checklist Status" AND "REST API Pattern Checklist Status".

---

## Pattern matching examples

**Example 1 — REST API only:**

UST: *"We're adding a new GET endpoint `/identity/{ucid}` on sys-api-identity..."*

Apply REST API checklist only.

**Example 2 — UI Feature only:**

UST: *"As a returning patient, I want to log in to the patient portal using my email and password..."*

Apply UI Feature checklist only.

**Example 3 — State-change Workflow only:**

UST: *"A paramedic updates an incident report mid-flow. Status transitions: In Progress → Completed. Dispatcher view syncs in real time..."*

Apply Workflow checklist only.

**Example 4 — Integration only:**

UST: *"Nightly sync from Billing system to Salesforce. Failed records go to DLQ..."*

Apply Integration checklist only.

**Example 5 — Multi-pattern (UI + API):**

UST: *"Add an Appointment Booking form that calls POST /appointments..."*

Apply both. Scope test case IDs by layer (TC-BOOK-UI-001 vs TC-BOOK-API-001).

**Example 6 — Multi-pattern (API + Workflow):**

UST: *"Expose PUT /incidents/{id}/status to change incident status. Paramedic can only transition In Progress → Completed..."*

Apply both REST API and State-change Workflow checklists.

**Example 7 — Multi-pattern (UI + Workflow):**

UST: *"Dispatcher can assign an incident to a paramedic from the dispatch board. Assigned paramedic sees new incident on their screen within 5 seconds..."*

Apply both UI Feature (board UI, viewport behaviour) and Workflow (assignment, real-time sync, roles).

---

## When to ask before applying

If a UST contains cues for a pattern but is sparse on details (like the sys-api-identity UST where the attachment was missing), **apply the checklist but be honest about what you can and can't assert.** Don't invent schema details or UI specs. Flag gaps as Clarifying Questions or in Coverage Notes.

If pattern detection is genuinely ambiguous (a UST could be read as API or Integration, or as UI or Workflow), briefly ask the user which scope they want before proceeding. Better a 10-second clarification than a 30-test-case output in the wrong direction.
