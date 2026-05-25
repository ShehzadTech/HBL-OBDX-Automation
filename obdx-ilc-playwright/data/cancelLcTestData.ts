/**
 * Test data for Cancel Letter of Credit (FSD 3.2.68, requirement C-9.13).
 *
 * Mirrors the structure of `amendLcTestData.ts`. The Cancel-LC flow has
 * very few editable inputs (Lookup + checkboxes + Special Instructions),
 * so the data surface is small.
 *
 * Live test environment: http://172.20.3.113:7777
 * Maker: corpmaker2 / Admin@131
 */
export const CANCEL_LC_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── LC references ──────────────────────────────────────────────────────
  /** Default cancellable LC — no booked bills/availments. */
  cancellableLcRef: 'PK2ELAC21126A336',
  /** LC with a booked bill — used by TC-CLCBS-002 (negative). */
  lcWithBookedBillRef: '032ELAN230891005',
  /** Expired LC — used by TC-CLCBS-005 (negative). */
  expiredLcRef: '032ELAN230891099',
  /** Non-existent LC for negative search test. */
  nonExistentLcRef: 'ZZZZZZ-NOT-EXIST',

  // ── LC summary (read-only on Cancel screen, verified against live DOM) ─
  expectedSummary: {
    firstBeneficiaryName: 'GOODCARE PLC',
    firstBeneficiaryAddress1: '12 King Street',
    firstBeneficiaryAddress2: 'lane no 4',
    firstBeneficiaryCity: 'London',
    firstBeneficiaryCountry: 'United Kingdom',
    secondBeneficiaryName: 'UAE Walkin',
    secondBeneficiaryAddress1: 'INDV - WALKIN',
    secondBeneficiaryAddress2: 'ENGLAND',
    secondBeneficiaryCountry: 'United Arab Emirates',
    lcAmount: '£1.00',
    expiryDate: 'July 27, 2023',
    product: 'TransferExportproduct',
  },

  // ── Cancel form fields ─────────────────────────────────────────────────
  specialInstructions: 'Cancellation requested due to commercial dispute resolution',
  fileName: 'cancel_lc_supporting_doc.pdf',
  fileNameOversize: 'cancel_lc_oversize.pdf',     // >5 MB — TC-CLC-N03
  fileNameUnsupported: 'cancel_lc_unsupported.exe', // unsupported type

  // ── Confirmation ───────────────────────────────────────────────────────
  expectedStatus: 'Pending for Approval',
  confirmationMessage: 'Transaction submitted for approval.',
  reviewBanner: 'You have initiated a request to cancel Letter of Credit',

  // ── Negative-test labels (verbatim from FSD review) ────────────────────
  blockedByBillError: 'Cancellation not permitted; bill(s) already booked',
  blockedByExpiryWarning: 'LC already expired; cancel not required',
} as const;

export type CancelLcTestData = typeof CANCEL_LC_TEST_DATA;
