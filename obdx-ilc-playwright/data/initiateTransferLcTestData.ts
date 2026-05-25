/**
 * Test data for Initiate Transfer Letter of Credit (FSD 3.2.64).
 *
 * Six-tab flow:
 *   1. Second Beneficiary Details
 *   2. Goods, Shipment & LC Details
 *   3. Documents and Conditions
 *   4. Instructions (Advising Bank, Advising Through Bank, 72Z, 78D, T&C)
 *   5. (Charges — removed for SG/UAE per C-9.1)
 *   6. Attachments → Submit → Review → Confirm
 */
export const INITIATE_TRANSFER_LC_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── Parent LC selection ────────────────────────────────────────────────
  /** Default parent Export LC available for transfer. */
  parentLcRef: 'PK2ELAC211258504',

  // ── Tab 1 — Second Beneficiary Details ─────────────────────────────────
  secondBeneficiaryExisting: 'Faizan',
  secondBeneficiaryExistingAddress: 'Block-7 F.B AREA, A-9 Abbas Square, Karachi',
  secondBeneficiaryExistingCountry: 'Pakistan',
  secondBeneficiaryNewName: 'ABC Trading LLC',
  secondBeneficiaryNewAddress: '12 King Street, London',
  secondBeneficiaryNewCountry: 'United Kingdom',
  customerReferenceNumber: 'Test1',
  transferProduct: 'Transfer Export product',

  // ── Tab 2 — Goods, Shipment & LC Details ───────────────────────────────
  /** Transfer Quantity must be ≤ Available Quantity for that goods row.
   *  Parent has Original 1000 / Available 100. */
  transferQuantity: '100',
  transferCostPerUnit: '0.00',
  substituteDocuments: 'Yes' as 'Yes' | 'No',
  lcTransferAmount: '3000.00',
  transferLcCurrency: 'GBP',
  dateOfExpiry: '11/11/2026',         // must be ≤ parent expiry
  placeOfExpiry: 'vfgg',
  additionalAmountCovered: 'Insurance covered up to 10% of LC value',
  shipmentMode: 'Period' as 'Date' | 'Period',
  shipmentPeriod: 'SHIPMENT WITHIN 60 DAYS FROM LC DATE',
  shipmentDate: '11/30/2026',
  documentsWithinDays: '21',

  // ── Tab 3 — Documents and Conditions ───────────────────────────────────
  documentToSelect: 'Invoice Documents',
  documentOriginals: '0/0',
  additionalConditionCode: 'ADDCONDISS',
  additionalConditionIdentifier: 'ORIGINAL',
  incoterm: 'CIF-Cost Insurance Freight',

  // ── Tab 4 — Instructions ───────────────────────────────────────────────
  advisingBankSwift: 'CITIGB2LXXX',
  advisingThroughBankSwift: 'CITIGB2LXXX',
  senderToReceiverInfo: 'Confirmation requested at beneficiary demand',
  intermediaryBankInstruction: 'Process payment via correspondent only',

  // ── Tab 6 — Attachments ────────────────────────────────────────────────
  fileName: 'transfer_lc_supporting.pdf',
  fileNameOversize: 'transfer_lc_oversize.pdf',
  fileNameUnsupported: 'transfer_lc.exe',
  templateName: 'TransferLC-Faizan-Standard',

  // ── Confirmation ───────────────────────────────────────────────────────
  expectedStatus: 'Pending for Approval',
  confirmationMessage: 'Transaction submitted for approval.',
  reviewBanner: 'You initiated a request for LC Transfer Initiation',

  // ── Negative-test data ─────────────────────────────────────────────────
  excessiveQuantity: '150',          // > Available (100)
  pastExpiryDate: '12/11/2021',      // before parent expiry
} as const;

export type InitiateTransferLcTestData = typeof INITIATE_TRANSFER_LC_TEST_DATA;
