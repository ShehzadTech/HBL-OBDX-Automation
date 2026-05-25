# Worked Examples — QA Test Case Writer

Examples showing what each workflow produces. Use these as format references when producing output.

---

## Example 1: Full Pipeline (fresh UST)

**User prompt:**

> Here's a UST for you:
>
> **Title:** Patient Portal Login Enhancement
>
> **Description:** As a returning patient, I want to log in to the patient portal using my email and password, so that I can access my appointment history.
>
> **Acceptance Criteria:**
> 1. Users enter valid registered email and password.
> 2. On successful login, user is redirected to /portal/dashboard.
> 3. After 3 failed attempts, account locks for 15 minutes.
> 4. "Forgot Password" link initiates password reset.
> 5. 20 min inactivity logs user out.
>
> **Technical Notes:** OAuth 2.0. Dashboard shows next 5 appointments. Password field masked with show-password toggle. Min password length 8 chars (reset only).

**Expected skill output:**

```
=== 1. TEST PLAN SUMMARY ===

**Functional scope:** Authentication flow for returning patients on the 
Patient Portal. Covers valid/invalid login, account lockout after repeated 
failures, password reset initiation, and session timeout behaviour.

**Acceptance criteria breakdown:**
1. Valid credentials → successful authentication
2. Successful auth → redirect to /portal/dashboard
3. Account lockout after 3 consecutive failed attempts (15 min)
4. Password reset flow accessible via "Forgot Password" link
5. Session timeout after 20 min of inactivity

**Test scenarios by category:**

*Positive:* Valid credentials login, successful dashboard load, show/hide 
password toggle, password reset link navigation

*Negative:* Invalid email, invalid password, non-existent account, 
attempting login with locked account, session expired mid-action

*Boundary:* Exactly 3 failed attempts (triggers lockout), exactly 20 min 
inactivity, exactly 15 min lockout duration

*Edge:* Login during network interruption, concurrent login from two 
devices, browser back button after logout, password containing special 
characters, password reset requested while logged in

**Test data requirements:**
- 1x active registered patient account (synthetic)
- 1x locked patient account (synthetic)
- Pre-configured invalid email addresses
- Test email inbox for receiving password reset emails

**Integration / dependency notes:**
- OAuth 2.0 identity provider must be reachable
- Email service required for password reset flow
- Session management dependency on backend session store

**Privacy considerations:** All test accounts use synthetic data. No real 
patient identifiers, real email addresses, or real medical record numbers.

=== 2. CLARIFYING QUESTIONS ===

1. **What email address receives the "locked account" notification, if any?** 
   Affects whether we need to test for a notification email in addition to 
   the UI lockout state.

2. **What happens at exactly minute 20 of inactivity — is there a warning 
   before logout, or does it happen silently?** 
   Affects whether we test for a session timeout warning modal.

3. **Is the "Remember Me" checkbox in scope for this UST?** 
   Not mentioned in the AC but common on login screens. Need PO confirmation 
   before generating or skipping those test cases.

4. **After 15 minutes of lockout, does the account unlock automatically or 
   require a manual action?** 
   Affects test steps for the post-lockout recovery scenario.

5. **Does the login support any MFA step beyond password, now or planned?** 
   Affects whether any 2FA scenarios should be in scope.

=== 3. ASSUMPTIONS MADE ===

- Account lockout is client-side visible (user sees "Account locked" message), not silent
- "Failed attempt" counter resets on successful login
- Password reset email arrives within 5 minutes (reasonable SLA assumption)
- Session timeout logs user out and redirects to /portal/login
- "Remember Me" is NOT in scope (not mentioned in AC)

=== 4. TEST CASES ===

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-LOGIN-001 | Valid credentials login | Active patient account exists with email `test.patient@example.com` and password `TestPass!2024`. User not currently logged in. | 1. Navigate to /portal/login<br>2. Enter `test.patient@example.com` in Email field<br>3. Enter `TestPass!2024` in Password field<br>4. Click "Log In" button | User is redirected to /portal/dashboard. Header displays patient's first name. Dashboard shows up to 5 upcoming appointments. | Not Executed |
| TC-LOGIN-002 | Invalid password — single attempt | Active patient account exists with email `test.patient@example.com`. Account is not currently locked. | 1. Navigate to /portal/login<br>2. Enter `test.patient@example.com` in Email field<br>3. Enter `WrongPassword!` in Password field<br>4. Click "Log In" button | User remains on /portal/login. Error message displayed: "Invalid email or password". Failed attempt counter increments to 1. | Not Executed |
| TC-LOGIN-003 | Non-existent email login attempt | No patient account exists with email `nonexistent.user@example.com`. | 1. Navigate to /portal/login<br>2. Enter `nonexistent.user@example.com` in Email field<br>3. Enter any password<br>4. Click "Log In" button | User remains on /portal/login. Error message displayed: "Invalid email or password". (Same message as invalid password — no account enumeration.) | Not Executed |
| TC-LOGIN-004 | Account lockout after 3 failed attempts | Active patient account exists with email `test.patient@example.com`. Failed attempt counter is 0. | 1. Navigate to /portal/login<br>2. Attempt login 3 times with correct email but wrong password<br>3. On 4th attempt, enter correct credentials | On 3rd failed attempt, account locks. On 4th attempt (even with correct credentials), error: "Account locked. Try again in 15 minutes." | Not Executed |
| TC-LOGIN-005 | Lockout duration — 15 min expiry | Patient account is locked. Lockout started at time T. | 1. At T+14:59, attempt login with correct credentials<br>2. At T+15:01, attempt login with correct credentials | At T+14:59: error message confirms account still locked. At T+15:01: login succeeds and user is redirected to /portal/dashboard. | Not Executed |
| [... continuing in same format ...] | | | | | |

=== 5. COVERAGE NOTES ===

**AC mapping:**
- AC #1 (valid credentials): TC-LOGIN-001
- AC #2 (dashboard redirect): TC-LOGIN-001
- AC #3 (lockout after 3): TC-LOGIN-002, TC-LOGIN-004, TC-LOGIN-005
- AC #4 (forgot password): TC-LOGIN-006 [forgot password happy path], TC-LOGIN-007 [reset while locked]
- AC #5 (20 min timeout): TC-LOGIN-008, TC-LOGIN-009

**Scenarios identified but NOT turned into test cases:**
- MFA / 2FA scenarios — waiting on Clarifying Question #5
- "Remember Me" scenarios — waiting on Clarifying Question #3
- Concurrent login from multiple devices — flagged but would be a separate UST (not clearly in AC #1-#5)
```

---

## Example 2: Enricher workflow

**User prompt:**

> Here are some test cases. Can you review and enrich them?
>
> | TC-APPT-001 | Book appointment | User logged in | Fill form, click submit | Appointment booked |

**Expected skill output:**

```
=== WHAT WAS MISSING OR VAGUE ===

- TC-APPT-001: Preconditions too generic ("User logged in" doesn't specify 
  role, data state, or environment). Expanded.
- TC-APPT-001: Test Steps too vague ("Fill form, click submit" not 
  actionable). Rewrote as numbered specific steps.
- TC-APPT-001: Expected Result not observable ("Appointment booked" doesn't 
  specify what changes to verify). Replaced with 3 observable criteria.
- Missing coverage: no negative scenarios, no boundary scenarios, no 
  double-booking scenario. Added 4 new test cases.

=== REVISED TEST CASES ===

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-APPT-001 | Book appointment — valid inputs | Patient logged in with role `patient`. At least one available appointment slot exists for the target provider in the next 30 days. Patient has no existing appointments in the target slot window. | 1. Navigate to /portal/appointments/new<br>2. Select provider `Dr. Demo Physician` from the Provider dropdown<br>3. Select date 7 days in the future<br>4. Select time slot `10:00 AM`<br>5. Enter reason `Annual checkup` in the Reason field<br>6. Click "Confirm Appointment" button | Appointment appears in patient's appointment list with status `Confirmed`. Confirmation email is sent to patient's registered email address. Appointment slot is removed from available slots for that provider. | Not Executed |

=== NEW TEST CASES ADDED ===

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-APPT-002 | Book appointment — provider has no available slots | Patient logged in. Target provider `Dr. Fully Booked` has zero available slots in the next 30 days. | 1. Navigate to /portal/appointments/new<br>2. Select `Dr. Fully Booked` from Provider dropdown | Date picker is disabled or shows "No available slots". Informational message displayed: "This provider has no availability. Try another provider or date." | Not Executed |
| TC-APPT-003 | Book appointment — attempting double booking | Patient logged in. Patient already has an appointment at 10:00 AM on the target date with any provider. | 1. Navigate to /portal/appointments/new<br>2. Select any provider<br>3. Select the same date as existing appointment<br>4. Select 10:00 AM time slot<br>5. Click "Confirm Appointment" | Booking is rejected. Error message: "You already have an appointment at this time. Please choose another slot or cancel the existing appointment first." | Not Executed |
| TC-APPT-004 | Book appointment — missing required field | Patient logged in. Patient on the new appointment form. | 1. Fill all fields except Reason<br>2. Click "Confirm Appointment" | Submission is blocked. Reason field is highlighted with error: "Please provide a reason for your visit." No API call is made. | Not Executed |

**Rationale for additions:** The original test case covered only the happy 
path. Added a negative (no availability), an edge case (double booking), 
and a validation scenario (missing field) to provide realistic coverage.
```

---

## Example 3: Targeted workflow

**User prompt:**

> For the patient portal login UST, just give me edge cases focused on concurrent sessions.

**Expected skill output:**

```
| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-LOGIN-EDGE-001 | Login from second device while already logged in elsewhere | Patient has active session on Device A (browser window open at /portal/dashboard). | 1. On Device B, navigate to /portal/login<br>2. Enter the same patient's credentials<br>3. Click "Log In" | Device B login succeeds. Device A session remains active OR is invalidated (per session policy — confirm with PO). If session is preserved, dashboard on both devices shows consistent data. | Not Executed |
| TC-LOGIN-EDGE-002 | Logout on Device A — effect on Device B | Patient is logged in on both Device A and Device B. | 1. On Device A, click Logout<br>2. On Device B, attempt to navigate to any authenticated page | Device A redirects to /portal/login. Device B: behaviour depends on session policy — either still works or is logged out. Confirm with PO. | Not Executed |
| TC-LOGIN-EDGE-003 | Password change on one device invalidates other session | Patient logged in on Device A and Device B. | 1. On Device A, complete password reset flow with new password<br>2. On Device B, attempt to refresh any authenticated page | Device B session is terminated. Device B redirects to /portal/login with message "Please log in again — your password has changed." | Not Executed |

**Note:** These concurrent session behaviours are not explicitly covered 
in AC #1-#5 of the UST. Before finalising these test cases, confirm the 
session policy with the PO: *"When a user logs in from a second device, 
should the first session be terminated, preserved, or show a warning?"*
```

---

## Example 4: Follow-up workflow

**User prompt (after earlier output of Example 1):**

> TC-LOGIN-002 has "Invalid email or password" in Expected Result. What if the password field is empty — is that the same error?

**Expected skill output:**

```
Good catch — empty password field isn't covered by TC-LOGIN-002 or any 
other test case in the set. Adding:

| Test Case ID | Test Title | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-LOGIN-010 | Submit login with empty Password field | User on /portal/login, not logged in. | 1. Navigate to /portal/login<br>2. Enter `test.patient@example.com` in Email field<br>3. Leave Password field empty<br>4. Click "Log In" button | Client-side validation prevents submission. Password field is highlighted. Error message displayed beneath Password: "Password is required." No API call is made. No failed attempt counter increment. | Not Executed |
| TC-LOGIN-011 | Submit login with empty Email field | User on /portal/login, not logged in. | 1. Navigate to /portal/login<br>2. Leave Email field empty<br>3. Enter `TestPass!2024` in Password field<br>4. Click "Log In" button | Client-side validation prevents submission. Email field is highlighted. Error message displayed beneath Email: "Email is required." No API call is made. | Not Executed |
| TC-LOGIN-012 | Submit login with both fields empty | User on /portal/login, not logged in. | 1. Navigate to /portal/login<br>2. Leave both Email and Password empty<br>3. Click "Log In" button | Both fields are highlighted. Errors displayed: "Email is required." and "Password is required." No API call made. | Not Executed |

**Coverage update:** These client-side validation cases strengthen AC #1 
coverage and close a gap in TC-LOGIN-002. Earlier ACs assumed the user 
enters "invalid" credentials, but didn't explicitly cover "empty" — 
different validation path.
```

---

## Example 5: Planning only

**User prompt:**

> Here's a UST. Just give me a test plan — I'll come back for test cases later.
>
> [UST content]

**Expected skill output:**

Just sections 1, 2, and 3 from the full pipeline (Test Plan Summary, Clarifying Questions, Assumptions Made). Skip sections 4 and 5. End with:

> *When you're ready, ask me to generate test cases from this plan — I'll keep the scope and clarifications in context.*
