/**
 * Test data for View Outward Bank Guarantee / Stand By LC (FSD 3.2.75).
 *
 * Values + labels here were captured from a live happy-path scrape against
 * the UAT environment (data/scraped/view-outward-bg-scraped.json). Do not
 * edit field labels without re-running the scrape — they must match the
 * rendered DOM exactly so the label→value helper in the POM resolves.
 */
export const VIEW_OUTWARD_BG_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── Listing page ───────────────────────────────────────────────────────
  // Scraped heading text.
  listingPageHeading: 'View Outward Guarantee/Stand By LC',
  // 14 columns captured from the live <thead>.
  listingColumns: [
    'Guarantee Number',
    'Customer Name',
    'Applicant Name',
    'Beneficiary Name',
    'Customer Reference Number',
    'Obdx Reference Number',
    'Issue Date',
    'Date of Expiry',
    'Status',
    'Undertaking Amount',
    'Equivalent Undertaking Amount',
    'Outstanding Amount',
    'Equivalent Outstanding Amount',
    'Transaction Type',
  ] as const,

  // First real record from the seeded env — used to open the detail page.
  // Reseed-sensitive (see CLAUDE.md "things known to be brittle").
  sampleGuaranteeNo: 'PK2GUIR211250504',
  sampleCustomerName: 'GOODCARE PLC',
  sampleApplicantName: 'GOODCARE PLC',
  sampleBeneficiaryName: 'MARKS AND SPENCER',
  sampleStatus: 'Active',

  // ── Detail page ────────────────────────────────────────────────────────
  // Scraped tab order. The POM uses tab labels (not indexes) so this list
  // is the canonical reference.
  tabLabels: [
    'View Guarantee Details',
    'Amendments',
    'Attached Documents',
    'Linkages',
    'Charges, Commissions and Taxes',
    'SWIFT Messages',
  ] as const,

  // Header detail action buttons captured on the detail page.
  detailActions: ['Initiate Amendment', 'Copy and Initiate', 'Back'] as const,

  // ── Tab 2 — Amendments table (scraped column headers) ──────────────────
  amendmentsTableColumns: [
    'Amendment Number',
    'Issue Date',
    'Expiry Date',
    'New Guarantee Amount',
    'Status',
  ] as const,

  // ── Tab 4 — Linkages table (scraped column headers) ────────────────────
  linkagesTableColumns: [
    'Account Number',
    'Contribution Amount for Collateral',
    'Contribution Percentage',
  ] as const,

  // ── Tab 5 — CCT tables (scraped column headers) ────────────────────────
  cctChargesColumns: [
    'Account No',
    'Description of Charges',
    'Amount',
    'Split Amount Borne by You',
    'Split Amount Borne by Other Party',
  ] as const,
  cctCommissionsColumns: [
    'Account No',
    'Description of Commissions',
    'Amount',
    'Split Amount Borne by You',
    'Split Amount Borne by Other Party',
  ] as const,

  // ── Tab 6 — SWIFT Messages table (scraped column headers) ──────────────
  swiftMessagesColumns: [
    'Sr No.',
    'Message ID',
    'Direction',
    'Date',
    'Description',
    'Sending/Receiving Bank',
    'Message Type',
    'Action',
  ] as const,

  // ── Listing filters (placeholder strings captured from live DOM) ───────
  // The Related Party dropdown's placeholder is "All Parties". The page
  // also has a global "Search Transaction" input.
  filterRelatedPartyPlaceholder: 'All Parties',
  filterSearchAriaLabel:         'Search Transaction',
} as const;

export type ViewOutwardBgTestData = typeof VIEW_OUTWARD_BG_TEST_DATA;
