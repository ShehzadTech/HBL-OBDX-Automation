/**
 * Test data for Create Import Letter of Credit (ILC-INL) in OBDX 25.1
 * Product: Import Letter of Credit - INLAND SIGHT LC
 */
export const LC_TEST_DATA = {
  // Login — AE entity (default maker, used by loggedInDashboard fixture)
  username: process.env.OBDX_USER || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // Login — SG entity (drives @sg-only tests via loggedInDashboardSg fixture).
  // Same base URL as AE; the back end maps the user to the SG corporate party,
  // which renders entity-customised variants of Tab 1 / Tab 2 fields.
  sgUsername: process.env.OBDX_SG_USER || 'corpmaker3',
  sgPassword: process.env.OBDX_SG_PASSWORD || 'Admin@120',
  // SG entity Import LC product. Confirmed via corpmaker3 Product LOV (2026-05-22):
  // SG sees ILC-SLC as the only Import LC; everything else in the SG LOV is
  // Export LC (ELC-INL / ELC-SC / ELC-FRE / ELC-CON) which doesn't apply here.
  sgProduct: 'ILC-SLC',
  sgProductFullName: 'Import Letter of Credit-SIGHT LETTER OF CREDIT',

  // Product
  product: 'ILC-INL',
  productFullName: 'Import Letter of Credit-INLAND SIGHT LC',
  // Usance variant — used by TC-BS-036 (Usance LC) and any other test that
  // sets LC Type = Usance + Tenor. ILC-INL is Sight-only and rejects Usance
  // submissions with "Tenor should be zero for sight types of LC".
  usanceProduct: 'ILC-INU',
  usanceProductFullName: 'Import Letter of Credit-INLAND USANCE LC',

  // LC Details Tab
  dateOfExpiry: '12/31/2026',
  placeOfExpiry: 'LONDON',
  beneficiaryName: 'Shehzad',
  lcCurrency: 'USD',
  lcAmount: '50000',
  customerReference: 'CUSTREF2024001',
  swiftCode: 'CITIGB2LXXX',
  // Field 41A — Credit Available By. Mandatory LOV (discovered by
  // rescrape-2026-05-22). Live AE/corpmaker2 + ILC-INL LOV is
  // ["Negotiation", "Sight Payment"]. fillLcDetails() applies this
  // value automatically; granular-setter tests must call
  // setCreditAvailableBy() before clickNext().
  creditAvailableBy: 'Sight Payment',

  // Goods & Shipment Tab
  partialShipment: 'Allowed',
  transshipment: 'Allowed',
  placeOfTaking: 'SHANGHAI PORT',
  finalDestination: 'PORT OF LONDON',
  shipmentDate: '11/30/2026',
  portOfLoading: 'SHANGHAI',
  portOfDischarge: 'LONDON',
  // Goods row entered into the "Goods and Services" table.
  // quantity × costPerUnit should equal lcAmount (50000) to avoid the
  // "Goods total amount should equal LC amount" warning on Next.
  //
  // Goods Type LOV in the live AUT (2026-05-22) uses numeric commodity codes,
  // NOT descriptive labels. Confirmed available codes:
  //   1059200, 1060000, 2011000, 2061000, 2064100, 2073300, 2081000
  // (the prior "Manufactured Goods" / "RAW MATERIALS" labels do not exist).
  goodsType: '1059200',
  goodsQuantity: '1',
  goodsCostPerUnit: '50000',

  // Documents Tab - NO INTERACTION
  documentType: 'Air Way',

  // Linkages Tab
  collateralAccountNumber: 'AT30008010036',
  collateralContributionAmount: '1000',

  // Instructions Tab
  advisingBankSwift: 'CITIGB2LXXX',

  // Insurance Tab
  insuranceProvider: 'AIG INSURANCE',
  insurancePolicyNumber: '123456789',

  // Confirmation
  expectedStatus: 'Pending for Approval',
  confirmationMessage: 'Transaction submitted for approval.',
} as const;

export type LcTestData = typeof LC_TEST_DATA;
