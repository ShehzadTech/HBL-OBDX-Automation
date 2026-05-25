# Sample TSD — Amend Import Letter of Credit (test input)

Use this as a smoke-test input for the N8N workflow. Paste it into the form's "TSD or UST" field with:

- Feature slug: `amend-import-lc`
- Module code: `AMLC`
- Execute tests after generation: `no` (set to `yes` once you've reviewed the generated spec)

---

## Feature: Amend Import Letter of Credit (Maker)

### Background
A corporate Maker can amend an active Import LC (status = Active) to change financial or non-financial terms. Amendments require Checker approval downstream; this UST scopes the Maker journey only — through to the success-message screen.

### Acceptance Criteria

1. **Search and select an active LC.**
   Maker navigates Trade Finance → Letter of Credit → Amend Import Letter of Credit. The screen lists all LCs in `Active` status owned by the Maker's party. Maker can filter by LC Reference Number, Beneficiary Name, or Currency. Clicking a row opens the Amendment form pre-populated with current LC values.

2. **Editable financial fields.**
   On the Amendment form, the following fields are editable:
   - LC Amount (must remain > 0 and ≤ Maker's daily limit)
   - Tolerance Under (%) and Tolerance Above (%) — each in range 0–10
   - Date of Expiry — must be a future date strictly later than the current Date of Expiry on file

3. **Editable non-financial fields.**
   - Place of Expiry (free text, max 35 chars)
   - Goods Description (free text, max 65 chars)
   - Port of Loading and Port of Discharge

4. **Mandatory amendment reason.**
   The form has an `Amendment Reason` textarea (max 250 chars) that must be filled before Submit. If blank, Submit shows "Amendment Reason is required".

5. **Submit and confirmation.**
   On Submit, the system shows a Review screen with a side-by-side diff (Old Value vs New Value) for every changed field. On final Submit from Review, the system shows "Amendment submitted for approval." with a fresh OBDX reference number, and the LC status moves to `Amendment Pending Approval`.

### Out of scope
- Checker approval flow (covered by a separate UST)
- Amendments to LCs in any state other than Active
- Amending Beneficiary or SWIFT Code (those changes require LC cancellation + reissue)
