/**
 * Test data for View Import Letter of Credit (HBL OBDX 25.1).
 *
 * Anchored to the live DOM dump captured against
 *   http://172.20.3.113:7777/  |  Maker: corpmaker2 / Admin@131
 *   LC under view: 032ELAN230891001 (Active, Export LC Usance Non Revolving)
 *   List-page row to click: PK2ILUN221108046
 *
 * Mirrors the structure of `amendLcTestData.ts`. All values are read-only
 * display strings — the View screen has no editable inputs.
 */
export const VIEW_LC_TEST_DATA = {
  // ── Login ──────────────────────────────────────────────────────────────
  username: process.env.OBDX_USER     || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // ── List page ──────────────────────────────────────────────────────────
  listPageUrlFragment: 'view-import-lc',
  /** LC Number link to click on the listing — opens the detail page. */
  listLcToOpen: 'PK2ILUN221108046',
  secondaryListLc: 'PK2ILUN221108/047',
  nonExistentLcSearch: 'ZZZZZZ-NOT-EXIST',

  // ── Header summary bar (constant across all tabs) ──────────────────────
  detailPageUrlFragment: 'view-lc',
  lcReference: '032ELAN230891001',
  obdxReference: 'XXXCVFGHJ768',
  product: 'Export LC Usance Non Revolving',
  lcAmount: '£5,000.00',
  dateOfExpiry: '11/11/2026',
  status: 'Active',

  // ── Tab 1 — LC Details ─────────────────────────────────────────────────
  applicantName: 'MARKS AND SPENCER',
  applicantSwift: 'MARGUS2SXXX',
  applicantAddress2: '87 knights street',
  dateOfApplication: '5/5/2026',

  typeOfDocCredit: 'Transferable',
  revolvingType: 'Non Revolving',

  placeOfExpiry: 'vfgg',

  beneficiaryName: 'GOODCARE PLC',
  beneficiaryAddress1: '12 King Street',
  beneficiaryAddress2: 'lane no 4',
  beneficiaryCity: 'London',
  beneficiaryCountry: 'United Kingdom',

  partialShipment: 'Not Allowed',
  transshipment: 'Not Allowed',
  placeOfTakingInCharge: 'dfdf',
  placeOfFinalDestination: 'fdfdfdf',
  shipmentPeriod: 'fdfdf fgfgffh',

  // Documents table — row label + expected Original / Copies strings.
  documents: [
    { name: 'Air Way',   original: '4/4', copies: '3' },
    { name: 'Insurance', original: '6/9', copies: '2' },
    { name: 'Invoice',   original: '0/0', copies: '' },
    { name: 'Sea Way',   original: '0/0', copies: '' },
    { name: 'Other',     original: '0/0', copies: '' },
  ] as const,

  issuingBankSwift: 'CITIGB2LRRR',
  issuingBankName:  'CITII BANK2',
  advisingThroughSwift: 'CITIGB2LXXX',
  advisingThroughName:  'CITII BANK',
  confirmationInstructions: 'Confirm',
  requestedConfirmationParty: 'Confirming Bank',
  confirmingBankName: 'CITI BANK',

  // ── Tab 2 — Attached Documents ─────────────────────────────────────────
  attachedDocsEmptyMessage: 'Currently no documents attached to this contract',

  // ── Tab 3 — Amendments ─────────────────────────────────────────────────
  amendments: [
    { number: '1', issueDate: '3/16/2020', expiryDate: '7/21/2020', amount: '£912,456.00', status: 'Accepted' },
    { number: '2', issueDate: '3/16/2020', expiryDate: '7/21/2020', amount: '£912,456.00', status: 'Rejected' },
  ] as const,

  // ── Tab 4 — Bills ──────────────────────────────────────────────────────
  billsEmptyMessage: 'Currently, there are no bills linked to this contract.',

  // ── Tab 5 — Charges, Commissions and Taxes ─────────────────────────────
  charges: [
    { account: 'PK20010440017', description: 'SWIFT CHARGES FOR LC ISSUE',   amount: '£50.00'  },
    { account: 'PK20010440017', description: 'COURIER CHARGES FOR LC ISSUE', amount: '£121.00' },
    { account: 'PK20010440017', description: 'ARAP Charge',                  amount: '£50.00'  },
  ] as const,
  totalCharges:     '£221.00',
  totalCommission:  '£100.00',
  totalTaxes:       '£6,004.00',

  // ── Tab 6 — SWIFT Messages ─────────────────────────────────────────────
  swiftMessages: [
    { sr: '1', messageId: '2452061271927784', date: '6/2/2019', description: 'Amendment Instrument', bank: 'CITIBANK IRELAND', type: '707' },
    { sr: '2', messageId: '2462055584291534', date: '5/2/2019', description: 'Amendment Instrument', bank: 'CITIBANK IRELAND', type: '707' },
    { sr: '3', messageId: '2262019867555360', date: '4/2/2019', description: 'Amendment Instrument', bank: 'CITIBANK IRELAND', type: '707' },
    { sr: '4', messageId: '2262019672343314', date: '3/2/2019', description: 'L/C instrument',       bank: 'CITIBANK IRELAND', type: '700' },
  ] as const,

  // ── Tab 7 — Banks ──────────────────────────────────────────────────────
  adviseThroughBank: {
    swift: 'CITIGB2LXXX',
    name:  'CITII BANK',
    address: 'new tech park',
  },

  // ── Tab 8 — Assignment ─────────────────────────────────────────────────
  assignment: {
    assigneeName: 'Trade Indiv 1',
    accountNumber: 'PK1000321013',
    amount: '5000',
  },

  // ── Tab 9 — Transferred LC ─────────────────────────────────────────────
  transferredLc: {
    lcNumber: 'PK2ELAC211258505',
    dateOfTransfer: '5/5/2021',
    dateOfExpiry: '11/11/2021',
    lcAmount: '£1,000.00',
  },
} as const;

export type ViewLcTestData = typeof VIEW_LC_TEST_DATA;
