/**
 * Test data for Amend Import Letter of Credit (HBL OBDX 25.1).
 *
 * Anchored to the live flow walked end-to-end against test environment
 *   http://172.20.3.113:7777/  |  Maker: corpmaker2 / Admin@131
 *   LC under amendment: 032ELAN230891001 (Active, GBP)
 *
 * Mirrors the structure of `lcTestData.ts` (Initiate). All values are
 * synthetic — no real customer / SWIFT-directory data.
 */
export const AMEND_LC_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── LC references ──────────────────────────────────────────────────────
  /** Default Active LC used by every happy-path test.
   *  Verified visible in the live test env's `List of Amendable Import
   *  Letter Of Credits`. Switch to the user's preferred LC if needed. */
  amendLcRef: 'PK2ILUN221108046',
  /** Partially-drawn LC (drawn 5,000 of 7,500) — used by TC-AMLC-N03. */
  partiallyDrawnLcRef: '032ELAN230891005',
  /** Expired LC — used by TC-AMLC-N05 (negative). */
  expiredLcRef: '032ELAN230891099',
  /** Unused LC for cancel-via-amendment scenario — used by TC-AMBS-003. */
  unusedLcRef: '032ELAN230891008',
  /** LC with a pending amendment in the workflow — used by TC-AMBS-014 (Rule 7). */
  pendingAmendmentLcRef: '032ELAN230891007',

  // ── Tab 1 — LC Details ────────────────────────────────────────────────
  typeOfDocCredit: 'Transferable' as 'Transferable' | 'Non Transferable',
  dateOfExpiry: '12/31/2027',
  placeOfExpiry: 'LONDON',
  beneficiaryName: 'MARKS AND SPENCER PLC',
  beneficiaryBankSwift: 'MARGUS2SXXX',
  beneficiaryAddrLine2: '100 Baker Street',
  beneficiaryCountry: 'GB',
  lcCurrency: 'GBP',
  lcAmount: '7500.00',
  toleranceUnder: '5',
  toleranceAbove: '5',
  additionalAmountCovered: 'Insurance charges included',
  customerReferenceNumber: 'PO-2026-INT-00789',
  bankDetailsCreditAvailableWith: 'CITIGB2LXXX',
  tenorDays: '90',
  creditDaysFrom: 'BILL OF LADING DATE',
  draweeSwift: 'CITIGB2LXXX',
  creditAvailableWithMode: 'SWIFT Code' as 'SWIFT Code' | 'Bank Address',

  // ── Tab 2 — Goods & Shipment ──────────────────────────────────────────
  partialShipment: 'Allowed',
  transshipment: 'Allowed',
  placeOfTaking: 'KARACHI PORT',
  portOfLoading: 'KPKHI – Karachi Port',
  portOfDischarge: 'GBLON – Port of London',
  finalDestination: 'LONDON WAREHOUSE',
  shipmentMode: 'Period' as 'Date' | 'Period',
  shipmentPeriod: 'SHIPMENT WITHIN 60 DAYS FROM LC DATE',
  shipmentDate: '11/30/2027',
  goodsHsCode: '1059200',
  goodsQuantity: '500',
  goodsCostPerUnit: '15.00',
  goodsGrossAmount: '7500.00',

  // ── Tab 3 — Documents & Conditions ────────────────────────────────────
  airWayOriginal:           '3',
  airWayOriginalsRequired:  '3',
  airWayCopies:             '2',
  insuranceOriginal:        '2',
  insuranceOriginalsRequired: '2',
  insuranceCopies:          '1',
  invoiceOriginal:          '3',
  invoiceOriginalsRequired: '3',
  invoiceCopies:            '2',
  seaWayOriginal:           '1',
  seaWayOriginalsRequired:  '1',
  seaWayCopies:             '1',
  additionalConditionCode1:       'ADDCONDISS',
  additionalConditionIdentifier1: 'ORIGINAL',
  additionalConditionCode2:       'LCADV',
  additionalConditionIdentifier2: 'COPY',
  additionalConditionCode3:       'SNDRRCVRINF2',
  additionalConditionIdentifier3: 'ORIGINAL',
  numberOfDays: '21',
  incoterm: 'CIF-Cost Insurance Freight',

  // ── Tab 4 — Instructions ──────────────────────────────────────────────
  advisingBankSwift: 'CITIGB2LXXX',
  specialPaymentForBeneficiary: 'Payment to be made within 5 working days of document presentation',
  specialPaymentForBankOnly:    'Documents must be presented at issuing bank counter',
  confirmationInstruction: 'Confirm' as 'Confirm' | 'May Add' | 'Without',
  requestedConfirmationParty: 'Confirming Bank',
  /** Confirming Bank SWIFT — must differ from Advising Bank SWIFT (Rule 3). */
  confirmingBankSwift: 'HBUKGB4BXXX',
  // Address fields: OBDX SWIFT-conformant — no commas / special chars.
  confirmingBankName: 'HSBC BANK PLC',
  confirmingBankAddr1: '8 CANADA SQUARE CANARY WHARF',
  confirmingBankAddr2: 'LONDON',
  confirmingBankAddr3: 'E14 5HQ UNITED KINGDOM',
  senderToReceiverInfo: 'All charges outside Pakistan are for beneficiary account',
  charges:              'ALL CHARGES OUTSIDE PAKISTAN ARE FOR BENEFICIARY ACCOUNT',
  amendmentChargePayableBy: 'Applicant' as 'Applicant' | 'Beneficiary',
  specialInstructions: 'Please advise beneficiary immediately upon receipt',

  // ── Tab 5 — Linkages ──────────────────────────────────────────────────
  collateralContributionAmount: '5000',
  collateralContributionPct:    '100',
  collateralAccount: 'AT30008010014',
  collateralCurrency: 'GBP',
  /** Deposit with Maturity Date > LC Expiry Date (passes Rule 4). */
  depositMaturityValid: '06/30/2028',
  /** Deposit with Maturity Date <= LC Expiry Date (fails Rule 4). */
  depositMaturityInvalid: '11/30/2027',

  // ── Tab 6 — Insurance ─────────────────────────────────────────────────
  insuranceProvider: 'AIG INSURANCE',
  insurancePolicyNumber: '123456789',

  // ── Tab 7 — Attachments / Submit ──────────────────────────────────────
  uploadFileName: 'amendment_supporting_doc.pdf',
  /** File over 5 MB — used by TC-AMLC-N12 (negative). */
  uploadFileNameOversize: 'amendment_oversize.pdf',
  /** Disallowed file type — used by TC-AMLC-N13 (negative). */
  uploadFileNameUnsupported: 'amendment_unsupported.exe',

  // ── Confirmation ──────────────────────────────────────────────────────
  expectedStatus: 'Pending for Approval',
  confirmationMessage: 'Transaction submitted for approval.',
  reviewBanner: 'You initiated a request to amend the Letter of Credit',
  duplicateBlockedMessage: 'Duplicate transaction not permitted',

  // ── Negative-test data (same data type as positives) ──────────────────
  pastDateOfExpiry:        '01/15/2024',
  zeroAmount:              '0.00',
  reducedAmountBelowDrawn: '4500.00',
  outOfRangeTolerance:     '150',
  zeroQuantity:            '0',
  goodsCostMismatchUnit:   '20.00', // 500 × 20 = 10,000 ≠ LC 7,500
  sgPort66Chars: 'PORT OF LONDON BERTH NUMBER VERY LONG STRING TWELVE 0123456789ABC',
} as const;

export type AmendLcTestData = typeof AMEND_LC_TEST_DATA;
