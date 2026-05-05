/**
 * Test data for Create Import Letter of Credit (ILC-INL) in OBDX 25.1
 * Product: Import Letter of Credit - INLAND SIGHT LC
 */
export const LC_TEST_DATA = {
  // Login
  username: process.env.OBDX_USER || 'corpmaker2',
  password: process.env.OBDX_PASSWORD || 'Admin@131',

  // Product
  product: 'ILC-INL',
  productFullName: 'Import Letter of Credit-INLAND SIGHT LC',

  // LC Details Tab
  dateOfExpiry: '12/31/2026',
  placeOfExpiry: 'LONDON',
  beneficiaryName: 'Shehzad',
  lcCurrency: 'USD',
  lcAmount: '50000',
  customerReference: 'CUSTREF2024001',
  swiftCode: 'CITIGB2LXXX',

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
  // Adjust goodsType to match an option present in your build's dropdown.
  goodsType: 'Manufactured Goods',
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
