/**
 * Test data for Initiate Outward Bank Guarantee / Stand By LC (FSD 3.2.73).
 *
 * Eight-tab flow:
 *   1. Outward Guarantee Details (Applicant, 22D Form, Beneficiary, Advising Bank, Advising Through Bank)
 *   2. Commitment Details (Customer Ref, 32B Amount, 48D Transfer, 45L Underlying Transaction, 71D Charges, 44J Governing Law, 48B Demand Indicator)
 *   3. Presentation Documents and Undertaking Terms & Conditions (77U Std/Non-Std, 45C)
 *   4. Instructions (23B Expiry Type, Expiry Date, Auto Extension, 72Z, Special Instructions, Standard Instructions)
 *   5. Delivery Details (24E, 24G)
 *   6. Local Undertaking (conditional, shows note when Form = Issue of Undertaking)
 *   7. Linkages (Cash Collateral + Deposits)
 *   8. (Charges — removed for SG/UAE per C-9.1)
 *   9. Attachments → Submit → Review → Confirm
 */
export const INITIATE_OUTWARD_BG_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── Tab 1 — Outward Guarantee Details ──────────────────────────────────
  applicantType: 'Existing' as 'Existing' | 'Non Customer',
  formOfUndertaking: 'Demand Guarantee',
  // Live HBL Select Product dropdown captured from the env. Each row
  // is "CODE  Description" but the live search filter only matches the
  // CODE prefix — typing the full description returns "No matches".
  // Use the short product code for search; the page object will match
  // the option by substring (so the option's description doesn't need
  // to exactly mirror the live label).
  product: 'IGT-APY',
  productLabel: 'IGT-APY  Import Guarantee-Import Guarantee Advance Payment',
  productOptions: {
    importGuaranteeAdvancePayment: 'IGT-APY',
    importGuaranteeStbylcDa:       'IGT-DA',
    importGuaranteeStandard:       'IGT-IG',
  },
  // FSD calls this "Type of Guarantee" but the live UI field is the
  // SWIFT 22A "Purpose of Message" combobox. Valid LOV values include
  // "Issue of undertaking", "Issuance of counter-undertaking",
  // "Request for issue of undertaking", etc. Default to the live
  // pre-selected value to keep the test data-driven without requiring
  // a specific selection.
  typeOfGuarantee: 'Issue of undertaking',
  guaranteeNarrative: 'Performance Guarantee for PO 2026/INT/00789',
  instructingPartyName: 'OBL Pakistan',
  instructingPartyAddress: 'Karachi',
  instructingPartyCountry: 'Pakistan',
  beneficiaryNameExisting: 'MARKS AND SPENCER',
  beneficiaryNameNew: 'MARKS AND SPENCER PLC',
  beneficiaryAddress1: '100 Baker Street',
  beneficiaryCountry: 'United Kingdom',
  advisingBankSwift: 'CITIGB2LRRR',
  advisingThroughBankSwift: 'CITIGB2LXXX',
  applicableRules: 'Uniform Rules For Demand Guarantees',
  purposeOfMessage: 'Issue of undertaking',

  // ── Tab 2 — Commitment Details ─────────────────────────────────────────
  customerReferenceNumber: 'PO-2026-INT-00789',
  guaranteeCurrency: 'AED',
  guaranteeAmount: '20',
  additionalAmountInfo: 'Includes interest at 5%',
  effectiveDate: '05/05/2026',
  transferIndicator: 'No' as 'Yes' | 'No',
  transferCondition: 'Partial transfer allowed',
  underlyingTransactionDetails: 'Performance guarantee for project PO-2026-INT-00789',
  charges: 'Charges for issuance to applicant account',
  governingLaw: 'UAE Law, Dubai courts',
  demandIndicator: 'Multiple and partial demands not permitted',

  // ── Tab 3 — Presentation Terms & Conditions ────────────────────────────
  undertakingTermsType: 'Standard' as 'Standard' | 'Non standard',
  nonStandardUndertakingTerms: 'Custom undertaking terms per commercial agreement…',
  documentAndPresentationInstr: 'Documents to be presented in person at issuing bank',

  // ── Tab 4 — Instructions ───────────────────────────────────────────────
  expiryType: 'Fixed' as 'Fixed' | 'Conditional' | 'Open',
  guaranteeExpiryDate: '07/31/2025',
  expiryCondition: 'On project completion',  // Conditional only
  closureDate: '07/31/2025',                 // Open only
  autoExtensionRequired: 'No' as 'Yes' | 'No',
  autoExtensionPeriod: 'Days',
  autoExtensionDetails: '30',
  autoExtensionNotificationPeriod: '14',
  autoExtensionFinalExpiryDate: '07/31/2026',
  liabilityScheduleRequired: 'No' as 'Yes' | 'No',
  senderToReceiverInfo: 'Sender to receiver information narrative',
  specialInstructions: 'Urgent issuance — operational priority',

  // ── Tab 5 — Delivery Details ───────────────────────────────────────────
  deliveryOfAmendment: 'By Collection',
  deliveryTo: 'Beneficiary' as 'Beneficiary' | 'Other',
  deliveryToOtherName: 'Receiver Inc.',
  deliveryToOtherAddress: '12 King Street, London',

  // ── Tab 7 — Linkages ───────────────────────────────────────────────────
  collateralAccount: 'AT30008010014',
  collateralContributionAmount: '5000',
  collateralContributionPercent: '10',
  depositAmount: '500',

  // ── Tab 9 — Attachments ────────────────────────────────────────────────
  fileName: 'outward_bg_supporting.pdf',
  fileNameOversize: 'outward_bg_oversize.pdf',
  fileNameUnsupported: 'outward_bg.exe',
  templateAccessType: 'Private' as 'Private' | 'Public',
  templateName: 'OBG-Performance-Standard',

  // ── Confirmation ───────────────────────────────────────────────────────
  expectedStatus: 'Pending for Approval',
  confirmationMessage: 'Transaction submitted for approval.',
  reviewBanner: 'You initiated a request for Outward Guarantee Initiation',

  // ── Negative-test data ─────────────────────────────────────────────────
  collateralExceedingAmount: '100',          // > guarantee amount 20
  pastExpiryDate: '01/01/2024',              // in the past
} as const;

export type InitiateOutwardBgTestData = typeof INITIATE_OUTWARD_BG_TEST_DATA;
