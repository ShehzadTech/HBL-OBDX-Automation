/**
 * Test data for Settlement of Import LC Bill (FSD 3.2.87).
 *
 * Two settlement modes:
 *   1. Single Bill Detailed Settlement Instruction (granular per-bill)
 *   2. Multiple Bill Settlement — Multiple Quick Bill Pay (bulk)
 *
 * The flow drives three settlement sources (and combinations on SG/UAE
 * per C-9.16): CASA (Settlement Account), Loan (Apply for Loans), and
 * Collateral (Pay With Collaterals).
 */
export const SETTLE_IMPORT_BILL_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── Bill references ────────────────────────────────────────────────────
  /** Default unsettled Import Bill (Sight, GBP). */
  unsettledBillRef: 'PK2ISLA221108014',
  /** Bill in different currency from the chosen settlement account
   *  (drives the FX-deal-link path). */
  foreignCurrencyBillRef: 'PK2EUUA221107502',
  /** Two additional bills used for Multiple-bill-settlement scenarios. */
  multiBillRefs: ['PK2ISLA221108007', 'PK2ISLA221108014'] as const,
  /** A bill known to have insufficient account-balance settlement path
   *  (drives the "Insufficient balance" negative). */
  largeBillRef: 'PK2ISLA221108015',

  // ── Settlement form fields ─────────────────────────────────────────────
  amountToSettle: '100.00',         // partial settlement
  loanProduct: 'Advance by loan-TAD2',
  loanTenor: '6',
  loanTenorType: 'Month',           // shown beneath the Tenor input
  settlementAccount: 'xxxxxxxxxxx0014', // MyAccount | GBP | ACTIVE | CON
  forexDealRefNumber: '12345677',
  forexLinkedAmount: '120',
  specialInstructions: 'Settlement to be completed within 2 working days',
  fileName: 'bill_settlement_supporting.pdf',

  // ── Confirmation ───────────────────────────────────────────────────────
  expectedStatus: 'Pending for Approval',
  confirmationMessage: 'Transaction submitted for approval.',

  // ── Negative-test data ─────────────────────────────────────────────────
  insufficientAmount: '999999.99',  // > Outstanding for any test bill
  zeroAmount: '0.00',
} as const;

export type SettleImportBillTestData = typeof SETTLE_IMPORT_BILL_TEST_DATA;
