import { Page, Locator, expect } from '@playwright/test';
import { OjHelper } from '@utils/ojHelper';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Initiate Outward Bank Guarantee / Stand By LC — Page Object (OBDX 25.1)
 * FSD 3.2.73.
 *
 * Nine-tab flow (Charges removed on SG/UAE per C-9.1):
 *   1. Outward Guarantee Details   — Applicant, 22D Form, Product, 59A, 56A, 57A
 *   2. Commitment Details           — Customer Ref, 32B Amount, Effective Date, 48D, 45L, 71D, 44J, 48B
 *   3. Presentation Terms & Conds   — 77U Std/Non-Std + 45C
 *   4. Instructions                 — 23B Expiry Type, Expiry Date, Auto Extension, Liability, 72Z, Special, Std Instr
 *   5. Delivery Details             — 24E + 24G
 *   6. Local Undertaking            — conditional
 *   7. Linkages                     — Cash Collateral + Deposits
 *   8. Charges (SG/UAE: removed)
 *   9. Attachments → Submit → Review → Confirm
 */
export class InitiateOutwardBgFlowPage {
  // ────────────────────────────────────────────────────────────────────────
  // Pre-flow tabs (Templates / Copy & Initiate / Drafts)
  // ────────────────────────────────────────────────────────────────────────
  private readonly templatesTab     = this.page.getByRole('tab', { name: /^Templates$/i }).first();
  private readonly copyInitiateTab  = this.page.getByRole('tab', { name: /Copy.*&.*Initiate/i }).first();
  private readonly draftsTab        = this.page.getByRole('tab', { name: /^Drafts$/i }).first();
  private readonly initiateOutwardGuaranteeButton = this.page.getByRole('button',
                                              { name: /Initiate Outward Guarantee/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab navigation
  // ────────────────────────────────────────────────────────────────────────
  private readonly tab1Btn = this.page.getByRole('tab', { name: /Outward Guarantee Details/i }).first();
  private readonly tab2Btn = this.page.getByRole('tab', { name: /Commitment Details/i }).first();
  private readonly tab3Btn = this.page.getByRole('tab', { name: /Presentation Terms.*Conditions/i }).first();
  private readonly tab4Btn = this.page.getByRole('tab', { name: /^Instructions$/i }).first();
  private readonly tab5Btn = this.page.getByRole('tab', { name: /Delivery Details/i }).first();
  private readonly tab6Btn = this.page.getByRole('tab', { name: /Local Undertaking/i }).first();
  private readonly tab7Btn = this.page.getByRole('tab', { name: /^Linkages$/i }).first();
  private readonly tab8Btn = this.page.getByRole('tab', { name: /Charges.*Commissions.*Taxes/i }).first();
  private readonly tab9Btn = this.page.getByRole('tab', { name: /^Attachments$/i }).first();

  private readonly nextButton    = this.page.getByRole('button', { name: /^Next$/i }).first();
  private readonly backButton    = this.page.getByRole('button', { name: /^Back$/i }).first();
  private readonly cancelButton  = this.page.getByRole('button', { name: /^Cancel$/i }).first();
  private readonly saveAsDraftButton = this.page.getByRole('button', { name: /^Save As Draft$/i }).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 1 — Outward Guarantee Details
  // ────────────────────────────────────────────────────────────────────────
  private readonly existingCustomerRadio = this.page.getByRole('radio', { name: /^Existing customer$/i }).first()
                                              .or(this.page.locator('input[type="radio"][value*="Existing"]').first());
  private readonly nonCustomerRadio      = this.page.getByRole('radio', { name: /^Non.customer$/i }).first();
  private readonly nonCustomerNameInput  = this.page.getByRole('textbox', { name: /Applicant Name|^Name$/i }).first()
                                              .or(this.page.locator('input[id*="ApplicantName"][id$="|input"]').first());
  private readonly nonCustomerAddressInput = this.page.getByRole('textbox', { name: /Applicant Address|^Address$/i }).first()
                                              .or(this.page.locator('input[id*="ApplicantAddress"][id$="|input"]').first());
  private readonly nonCustomerCountryDropdown = this.page.getByRole('combobox', { name: /Applicant Country|^Country$/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="ApplicantCountry" i]').first());
  private readonly applicantNameDropdown = this.page.getByRole('combobox', { name: /Applicant Name/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="ApplicantName" i]').first());
  private readonly accounteeNameDropdown = this.page.getByRole('combobox', { name: /Accountee/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="Accountee" i]').first());
  // 22D Form of Undertaking
  private readonly formOfUndertakingDropdown = this.page.getByRole('combobox', { name: /Form of Undertaking/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="FormOfUndertaking" i]').first());
  private readonly productDropdown    = this.page.getByRole('combobox', { name: /Select Product/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="SelectProduct" i]').first());
  // The FSD calls this "Type of Guarantee" but the live SWIFT-tagged
  // 22A field is labelled "Purpose of Message" in the OBDX UI. Match
  // both names so the locator survives either rendering.
  private readonly typeOfGuaranteeDropdown = this.page.getByRole('combobox', { name: /Type of Guarantee|Purpose of Message/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="TypeOfGuarantee" i], oj-select-one[id*="PurposeOfMessage" i], oj-select-one[id*="Purpose" i]').first());
  private readonly narrativeInput     = this.page.getByRole('textbox', { name: /^Narrative$/i }).first()
                                              .or(this.page.locator('textarea[id*="Narrative" i]').first());
  // Instructing Party 51
  private readonly instructingPartyName    = this.page.getByRole('textbox', { name: /Instructing Party Name|^51$/i }).first()
                                              .or(this.page.locator('input[id*="InstructingPartyName"][id$="|input"]').first());
  private readonly instructingPartyAddress = this.page.getByRole('textbox', { name: /Instructing Party Address|^Address$/i }).first()
                                              .or(this.page.locator('input[id*="InstructingPartyAddress"][id$="|input"]').first());
  private readonly instructingPartyCountry = this.page.getByRole('combobox', { name: /Instructing Party Country|^Country$/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="InstructingPartyCountry" i]').first());
  // 59A Beneficiary
  private readonly beneficiaryExistingRadio = this.page.getByRole('radio', { name: /^Existing$/i }).first();
  private readonly beneficiaryNewRadio      = this.page.getByRole('radio', { name: /^New$/i }).first();
  private readonly beneficiaryNameDropdown  = this.page.getByRole('combobox', { name: /Beneficiary Name/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="BeneficiaryName" i]').first());
  private readonly beneficiaryNameInput     = this.page.getByRole('textbox', { name: /Beneficiary Name/i }).first()
                                              .or(this.page.locator('input[id*="BeneficiaryName"][id$="|input"]').first());
  private readonly beneficiaryAddressInput  = this.page.getByRole('textbox', { name: /Beneficiary Address|Address Line 1/i }).first()
                                              .or(this.page.locator('input[id*="BeneficiaryAddress"][id$="|input"], input[placeholder="Address 1"]').first());
  private readonly beneficiaryCountryDropdown = this.page.getByRole('combobox', { name: /Beneficiary Country/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="BeneficiaryCountry" i]').first());
  // 56A Advising Bank
  private readonly advisingBankSwiftRadio = this.page.getByRole('radio', { name: /^SWIFT Code$/i }).first();
  private readonly advisingBankAddressRadio = this.page.getByRole('radio', { name: /^Bank Address$/i }).first();
  private readonly advisingBankSwiftInput = this.page.getByRole('textbox', { name: /Advising Bank SWIFT|^56A.*SWIFT/i }).first()
                                              .or(this.page.locator('input[id*="AdvisingBank"][id*="Swift"][id$="|input"]').first());
  private readonly advisingBankVerifyButton = this.page.getByRole('button', { name: /^Verify$/i }).first();
  // 56A Advising Bank — Bank Address mode (manual entry)
  private readonly advisingBankNameInput = this.page.getByRole('textbox', { name: /Advising Bank Name|^Bank Name$/i }).first()
                                              .or(this.page.locator('input[id*="AdvisingBankName"][id$="|input"]').first());
  private readonly advisingBankAddress1Input = this.page.getByRole('textbox', { name: /Address Line 1|^Address 1$/i }).first()
                                              .or(this.page.locator('input[placeholder="Address 1"]').first());
  private readonly advisingBankAddress2Input = this.page.getByRole('textbox', { name: /Address Line 2|^Address 2$/i }).first()
                                              .or(this.page.locator('input[placeholder="Address 2"]').first());
  private readonly advisingBankAddress3Input = this.page.getByRole('textbox', { name: /Address Line 3|^Address 3$/i }).first()
                                              .or(this.page.locator('input[placeholder="Address 3"]').first());
  // 57A Advising Through Bank
  private readonly advisingThroughBankSwiftInput = this.page.getByRole('textbox', { name: /Advising Through Bank.*SWIFT|^57A.*SWIFT/i }).first()
                                              .or(this.page.locator('input[id*="AdvisingThrough"][id*="Swift"][id$="|input"]').first());
  private readonly advisingThroughVerifyButton = this.page.getByRole('button', { name: /^Verify$/i }).nth(1);

  // ────────────────────────────────────────────────────────────────────────
  // Tab 2 — Commitment Details
  // ────────────────────────────────────────────────────────────────────────
  private readonly customerReferenceNumberInput = this.page.getByRole('textbox', { name: /Customer Reference Number/i }).first()
                                              .or(this.page.locator('input[id*="CustomerReferenceNumber"][id$="|input"]').first());
  private readonly guaranteeCurrencyDropdown = this.page.getByRole('combobox', { name: /Currency/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="Currency" i]').first());
  private readonly guaranteeAmountInput      = this.page.getByRole('textbox', { name: /Undertaking Amount|Guarantee Amount/i }).first()
                                              .or(this.page.locator('input[id*="UndertakingAmount"][id$="|input"]').first());
  private readonly additionalAmountInfoInput = this.page.getByRole('textbox', { name: /Additional Amount Information/i }).first()
                                              .or(this.page.locator('textarea[id*="AdditionalAmount"]').first());
  private readonly effectiveDateInput       = this.page.getByRole('textbox', { name: /Effective Date/i }).first()
                                              .or(this.page.locator('input[id*="EffectiveDate"][id$="|input"]').first());
  private readonly transferIndicatorToggle  = this.page.getByRole('radiogroup', { name: /Transfer Indicator/i });
  private readonly transferConditionInput   = this.page.getByRole('textbox', { name: /Transfer Condition/i }).first()
                                              .or(this.page.locator('textarea[id*="TransferCondition"]').first());
  private readonly underlyingTransactionInput = this.page.getByRole('textbox', { name: /Underlying Transaction Details/i }).first()
                                              .or(this.page.locator('textarea[id*="UnderlyingTransaction"]').first());
  private readonly chargesInput             = this.page.getByRole('textbox', { name: /^Charges$|71D Charges/i }).first()
                                              .or(this.page.locator('textarea[id*="Charges" i]').first());
  private readonly governingLawInput        = this.page.getByRole('textbox', { name: /Governing Law/i }).first()
                                              .or(this.page.locator('textarea[id*="GoverningLaw"]').first());
  private readonly demandIndicatorDropdown  = this.page.getByRole('combobox', { name: /Demand Indicator/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="DemandIndicator" i]').first());

  // ────────────────────────────────────────────────────────────────────────
  // Tab 3 — Presentation Documents & Undertaking Terms & Conditions
  // ────────────────────────────────────────────────────────────────────────
  private readonly undertakingTermsTypeRadio = this.page.getByRole('radiogroup', { name: /Undertaking Terms.*Conditions/i });
  private readonly nonStandardTermsInput   = this.page.getByRole('textbox', { name: /Non.standard.*Terms|Other Amendments to Undertaking/i }).first()
                                              .or(this.page.locator('textarea[id*="NonStandard"]').first());
  private readonly documentPresentationInstrInput = this.page.getByRole('textbox', { name: /Document and Presentation Instructions/i }).first()
                                              .or(this.page.locator('textarea[id*="DocumentPresentation"]').first());

  // ────────────────────────────────────────────────────────────────────────
  // Tab 4 — Instructions (Expiry / Auto-Extension / Liability)
  // ────────────────────────────────────────────────────────────────────────
  private readonly expiryTypeDropdown      = this.page.getByRole('combobox', { name: /Expiry Type/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="ExpiryType" i]').first());
  private readonly guaranteeExpiryDateInput = this.page.getByRole('textbox', { name: /Guarantee Expiry Date/i }).first()
                                              .or(this.page.locator('input[id*="GuaranteeExpiryDate"][id$="|input"]').first());
  private readonly expiryConditionInput    = this.page.getByRole('textbox', { name: /Expiry Condition/i }).first()
                                              .or(this.page.locator('textarea[id*="ExpiryCondition"]').first());
  private readonly closureDateInput        = this.page.getByRole('textbox', { name: /Closure Date/i }).first()
                                              .or(this.page.locator('input[id*="ClosureDate"][id$="|input"]').first());
  private readonly autoExtensionRequiredToggle = this.page.getByRole('radiogroup', { name: /Automatic Extension Required/i });
  private readonly autoExtensionPeriodDropdown = this.page.getByRole('combobox', { name: /Auto.*Extension.*Period|^Period$/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="AutoExtensionPeriod" i]').first());
  private readonly autoExtensionDetailsInput  = this.page.getByRole('textbox', { name: /Auto.*Extension.*Details|^Details$/i }).first()
                                              .or(this.page.locator('input[id*="AutoExtensionDetails"][id$="|input"]').first());
  private readonly autoExtensionNotificationInput = this.page.getByRole('textbox', { name: /Notification Period|Notification Days/i }).first()
                                              .or(this.page.locator('input[id*="NotificationPeriod"][id$="|input"]').first());
  private readonly autoExtensionFinalExpiryInput = this.page.getByRole('textbox', { name: /Final Expiry Date/i }).first()
                                              .or(this.page.locator('input[id*="FinalExpiryDate"][id$="|input"]').first());
  private readonly liabilityScheduleRequiredToggle = this.page.getByRole('radiogroup', { name: /Liability Schedule Required/i });
  private readonly senderToReceiverInfoInput = this.page.getByRole('textbox', { name: /Sender to Receiver Information/i }).first()
                                              .or(this.page.locator('textarea[id*="SenderToReceiver" i]').first());
  private readonly specialInstructionInput = this.page.getByRole('textbox', { name: /Special Instruction/i }).first()
                                              .or(this.page.locator('textarea[id*="SpecialInstruction"]').first());
  private readonly standardInstructionsCheckbox = this.page.getByRole('checkbox', { name: /Kindly go through.*Standard Instructions/i }).first()
                                              .or(this.page.locator('oj-checkboxset[id*="StandardInstructions" i]').first());

  // ────────────────────────────────────────────────────────────────────────
  // Tab 5 — Delivery Details
  // ────────────────────────────────────────────────────────────────────────
  private readonly deliveryOfAmendmentDropdown = this.page.getByRole('combobox', { name: /Delivery of Amendment to the undertaking/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="DeliveryOfAmendment" i]').first());
  private readonly deliveryToBeneficiaryRadio = this.page.getByRole('radio', { name: /^Beneficiary$/i }).first();
  private readonly deliveryToOtherRadio      = this.page.getByRole('radio', { name: /^Other$/i }).first();
  private readonly deliveryToNameInput       = this.page.getByRole('textbox', { name: /Delivery.*Name|^Name$/i }).last();
  private readonly deliveryToAddressInput    = this.page.getByRole('textbox', { name: /Delivery.*Address|^Address$/i }).last();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 7 — Linkages
  // ────────────────────────────────────────────────────────────────────────
  private readonly addAccountLink = this.page.getByRole('link', { name: /Add Account/i }).first()
                                              .or(this.page.getByRole('button', { name: /Add Account/i }).first());
  private readonly contributionAmountInput = this.page.getByRole('textbox', { name: /Contribution Amount for Collateral/i }).first()
                                              .or(this.page.locator('input[id*="ContributionAmount"][id$="|input"]').first());
  private readonly contributionPercentInput = this.page.getByRole('textbox', { name: /Contribution Percentage|Percentage/i }).first()
                                              .or(this.page.locator('input[id*="ContributionPercent"][id$="|input"]').first());
  private readonly selectAccountInput = this.page.getByRole('combobox', { name: /Select Account|Account Number/i }).first()
                                              .or(this.page.locator('input[placeholder*="Select Account" i]').first());
  private readonly addDepositLink = this.page.getByRole('link', { name: /Add Deposit/i }).first()
                                              .or(this.page.getByRole('button', { name: /Add Deposit/i }).first());
  private readonly depositAmountInput = this.page.getByRole('textbox', { name: /Deposit.*Amount|Lien Amount/i }).first()
                                              .or(this.page.locator('input[id*="DepositAmount"][id$="|input"]').first());
  private readonly deleteLinkageButton = this.page.getByRole('button', { name: /^Delete$|Remove/i }).first()
                                              .or(this.page.locator('button[title*="Delete" i], button[title*="Remove" i]').first());
  private readonly localUndertakingNote = this.page.getByText(/Local Undertaking|Form of Undertaking.*Issue/i).first();

  // ────────────────────────────────────────────────────────────────────────
  // Tab 9 — Attachments / Submit
  // ────────────────────────────────────────────────────────────────────────
  private readonly fileInput        = this.page.locator('input[type="file"]').first();
  private readonly fileUploadButton = this.page.getByRole('button',
                                              { name: /Drag and Drop|Select or drop files here|Add Files/i }).first();
  private readonly saveAsTemplateYes = this.page.getByRole('radio', { name: /^Yes$/i }).first();
  private readonly accessTypeDropdown = this.page.getByRole('combobox', { name: /Access Type/i }).first()
                                              .or(this.page.locator('oj-select-one[id*="AccessType" i]').first());
  private readonly templateNameInput = this.page.getByRole('textbox', { name: /Template Name/i }).first()
                                              .or(this.page.locator('input[id*="TemplateName"][id$="|input"]').first());
  private readonly tncCheckbox      = this.page.getByRole('checkbox', { name: /I accept the Terms.*Conditions/i }).first();
  private readonly previewDraftButton = this.page.getByRole('button', { name: /Preview Draft Copy/i }).first();
  private readonly submitButton     = this.page.getByRole('button', { name: /^Submit$/i }).last();

  // ────────────────────────────────────────────────────────────────────────
  // Review screen
  // ────────────────────────────────────────────────────────────────────────
  private readonly reviewBanner   = this.page.getByText(/You initiated a request for Outward Guarantee|Initiate Outward Guarantee/i).first();
  private readonly confirmButton  = this.page.getByRole('button', { name: /^Confirm$/i }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Pre-flow actions
  // ════════════════════════════════════════════════════════════════════════

  async assertOnPreFlowScreen(): Promise<void> {
    await this.initiateOutwardGuaranteeButton.or(this.templatesTab).first()
              .waitFor({ state: 'visible', timeout: 30000 });
  }

  async startNewBg(): Promise<void> {
    await this.initiateOutwardGuaranteeButton.click();
    await this.wait.shortPause(1500);
  }

  async openTemplatesTab(): Promise<void> {
    if (await this.templatesTab.count() > 0) {
      await this.templatesTab.click();
      await this.wait.shortPause(400);
    }
  }

  async openDraftsTab(): Promise<void> {
    if (await this.draftsTab.count() > 0) {
      await this.draftsTab.click();
      await this.wait.shortPause(400);
    }
  }

  async openCopyAndInitiateTab(): Promise<void> {
    if (await this.copyInitiateTab.count() > 0) {
      await this.copyInitiateTab.click();
      await this.wait.shortPause(400);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab navigation
  // ════════════════════════════════════════════════════════════════════════

  async openTab1(): Promise<void> { if (await this.tab1Btn.count() > 0) { await this.tab1Btn.click(); await this.wait.shortPause(400); } }
  async openTab2(): Promise<void> { if (await this.tab2Btn.count() > 0) { await this.tab2Btn.click(); await this.wait.shortPause(400); } }
  async openTab3(): Promise<void> { if (await this.tab3Btn.count() > 0) { await this.tab3Btn.click(); await this.wait.shortPause(400); } }
  async openTab4(): Promise<void> { if (await this.tab4Btn.count() > 0) { await this.tab4Btn.click(); await this.wait.shortPause(400); } }
  async openTab5(): Promise<void> { if (await this.tab5Btn.count() > 0) { await this.tab5Btn.click(); await this.wait.shortPause(400); } }
  async openTab6(): Promise<void> { if (await this.tab6Btn.count() > 0) { await this.tab6Btn.click(); await this.wait.shortPause(400); } }
  async openTab7(): Promise<void> { if (await this.tab7Btn.count() > 0) { await this.tab7Btn.click(); await this.wait.shortPause(400); } }
  async openTab9(): Promise<void> { if (await this.tab9Btn.count() > 0) { await this.tab9Btn.click(); await this.wait.shortPause(400); } }

  async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(800);
  }
  async clickBack(): Promise<void> { await this.backButton.click(); await this.wait.shortPause(600); }
  async clickCancel(): Promise<void> { await this.cancelButton.click(); await this.wait.shortPause(800); }
  async clickSaveAsDraft(): Promise<void> { await this.saveAsDraftButton.click(); await this.wait.shortPause(800); }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 1 — Outward Guarantee Details actions
  // ════════════════════════════════════════════════════════════════════════

  async setApplicantExistingCustomer(): Promise<void> {
    await this.existingCustomerRadio.scrollIntoViewIfNeeded();
    await this.existingCustomerRadio.evaluate(el => (el as HTMLElement).click());
    await this.wait.shortPause(400);
  }

  async setApplicantNonCustomer(d: { name: string; address: string; country: string }): Promise<void> {
    if (await this.nonCustomerRadio.count() > 0) {
      await this.nonCustomerRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(400);
    }
    if (await this.nonCustomerNameInput.count() > 0) {
      await this.oj.ojFillLocator(this.nonCustomerNameInput, d.name);
    }
    if (await this.nonCustomerAddressInput.count() > 0) {
      await this.oj.ojFillLocator(this.nonCustomerAddressInput, d.address);
    }
    const sel = 'oj-select-one[id*="ApplicantCountry" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, d.country, d.country);
    }
  }

  async setAccountee(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="Accountee" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else if (await this.accounteeNameDropdown.count() > 0) {
      await this.accounteeNameDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  async setAdvisingBankAddress(d: { name: string; address1: string; address2?: string; address3?: string }): Promise<void> {
    if (await this.advisingBankAddressRadio.count() > 0) {
      await this.advisingBankAddressRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(400);
    }
    if (await this.advisingBankNameInput.count() > 0) {
      await this.oj.ojFillLocator(this.advisingBankNameInput, d.name);
    }
    if (await this.advisingBankAddress1Input.count() > 0) {
      await this.oj.ojFillLocator(this.advisingBankAddress1Input, d.address1);
    }
    if (d.address2 && await this.advisingBankAddress2Input.count() > 0) {
      await this.oj.ojFillLocator(this.advisingBankAddress2Input, d.address2);
    }
    if (d.address3 && await this.advisingBankAddress3Input.count() > 0) {
      await this.oj.ojFillLocator(this.advisingBankAddress3Input, d.address3);
    }
  }

  async setFormOfUndertaking(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="FormOfUndertaking" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.formOfUndertakingDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(400);
  }

  async setProduct(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="SelectProduct" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.productDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(400);
  }

  async setTypeOfGuarantee(value: string): Promise<void> {
    // FSD calls this "Type of Guarantee"; live UI labels it
    // "22A Purpose of Message". Probe both id patterns.
    const sel = 'oj-select-one[id*="TypeOfGuarantee" i], oj-select-one[id*="PurposeOfMessage" i], oj-select-one[id*="Purpose" i]';
    if (await this.page.locator(sel).first().count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.typeOfGuaranteeDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(400);
  }

  async setNarrative(text: string): Promise<void> {
    // The Narrative locator can resolve to the OJet `<oj-text-area>`
    // wrapper rather than the inner native `<textarea>`. The native
    // value-setter trick used by `ojFillLocator` throws
    // "Illegal invocation" against the wrapper. `.fill()` handles both
    // cases — same workaround AmendImportLcFlowPage uses for textareas.
    if (await this.narrativeInput.count() > 0) {
      await this.narrativeInput.waitFor({ state: 'visible', timeout: 15000 });
      await this.narrativeInput.scrollIntoViewIfNeeded();
      await this.narrativeInput.fill(text);
      await this.narrativeInput.blur();
      await this.wait.shortPause(200);
    }
  }

  async setBeneficiaryExisting(name: string): Promise<void> {
    if (await this.beneficiaryExistingRadio.count() > 0) {
      await this.beneficiaryExistingRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    const sel = 'oj-select-one[id*="BeneficiaryName" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, name, name);
    } else {
      await this.beneficiaryNameDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: name }).first().click();
    }
    await this.wait.shortPause(400);
  }

  async setBeneficiaryNew(d: { name: string; address: string; country: string }): Promise<void> {
    if (await this.beneficiaryNewRadio.count() > 0) {
      await this.beneficiaryNewRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    await this.oj.ojFillLocator(this.beneficiaryNameInput, d.name);
    await this.oj.ojFillLocator(this.beneficiaryAddressInput, d.address);
    const sel = 'oj-select-one[id*="BeneficiaryCountry" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, d.country, d.country);
    } else {
      await this.beneficiaryCountryDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: d.country }).first().click();
    }
    await this.wait.shortPause(400);
  }

  async setAdvisingBankSwiftAndVerify(swift: string): Promise<void> {
    if (await this.advisingBankSwiftRadio.count() > 0) {
      await this.advisingBankSwiftRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    await this.oj.ojFillLocator(this.advisingBankSwiftInput, swift);
    await this.wait.shortPause(300);
    await this.advisingBankVerifyButton.click();
    await this.wait.shortPause(1000);
  }

  async setAdvisingThroughBankSwiftAndVerify(swift: string): Promise<void> {
    await this.oj.ojFillLocator(this.advisingThroughBankSwiftInput, swift);
    await this.wait.shortPause(300);
    await this.advisingThroughVerifyButton.click();
    await this.wait.shortPause(1000);
  }

  async setInstructingParty(d: { name: string; address: string; country: string }): Promise<void> {
    if (await this.instructingPartyName.count() > 0) {
      await this.oj.ojFillLocator(this.instructingPartyName, d.name);
    }
    if (await this.instructingPartyAddress.count() > 0) {
      await this.oj.ojFillLocator(this.instructingPartyAddress, d.address);
    }
    const sel = 'oj-select-one[id*="InstructingPartyCountry" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, d.country, d.country);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 2 — Commitment Details actions
  // ════════════════════════════════════════════════════════════════════════

  async setCustomerReferenceNumber(ref: string): Promise<void> {
    await this.oj.ojFillLocator(this.customerReferenceNumberInput, ref);
  }

  async setGuaranteeCurrency(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="Currency" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.guaranteeCurrencyDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  async setGuaranteeAmount(amount: string): Promise<void> {
    await this.oj.ojFillLocator(this.guaranteeAmountInput, amount);
  }

  async setAdditionalAmountInfo(text: string): Promise<void> {
    if (await this.additionalAmountInfoInput.count() > 0) {
      await this.oj.ojFillLocator(this.additionalAmountInfoInput, text);
    }
  }

  async setEffectiveDate(date: string): Promise<void> {
    await this.effectiveDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.effectiveDateInput.fill('');
    await this.effectiveDateInput.fill(date);
    await this.effectiveDateInput.blur();
  }

  async setTransferIndicator(value: 'Yes' | 'No'): Promise<void> {
    await this.transferIndicatorToggle.scrollIntoViewIfNeeded();
    await this.transferIndicatorToggle.getByText(new RegExp(`^${value}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setTransferCondition(text: string): Promise<void> {
    if (await this.transferConditionInput.count() > 0) {
      await this.oj.ojFillLocator(this.transferConditionInput, text);
    }
  }

  async setUnderlyingTransactionDetails(text: string): Promise<void> {
    await this.oj.ojFillLocator(this.underlyingTransactionInput, text);
  }

  async setCharges(text: string): Promise<void> {
    if (await this.chargesInput.count() > 0) {
      await this.oj.ojFillLocator(this.chargesInput, text);
    }
  }

  async setGoverningLaw(text: string): Promise<void> {
    if (await this.governingLawInput.count() > 0) {
      await this.oj.ojFillLocator(this.governingLawInput, text);
    }
  }

  async setDemandIndicator(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="DemandIndicator" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else if (await this.demandIndicatorDropdown.count() > 0) {
      await this.demandIndicatorDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 3 — Presentation Terms & Conditions
  // ════════════════════════════════════════════════════════════════════════

  async setUndertakingTermsType(value: 'Standard' | 'Non standard'): Promise<void> {
    await this.undertakingTermsTypeRadio.scrollIntoViewIfNeeded();
    await this.undertakingTermsTypeRadio.getByText(new RegExp(`^${value}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setNonStandardTerms(text: string): Promise<void> {
    if (await this.nonStandardTermsInput.count() > 0) {
      await this.oj.ojFillLocator(this.nonStandardTermsInput, text);
    }
  }

  async setDocumentPresentationInstructions(text: string): Promise<void> {
    if (await this.documentPresentationInstrInput.count() > 0) {
      await this.oj.ojFillLocator(this.documentPresentationInstrInput, text);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 4 — Instructions (Expiry + Auto Extension)
  // ════════════════════════════════════════════════════════════════════════

  async setExpiryType(value: 'Fixed' | 'Conditional' | 'Open'): Promise<void> {
    const sel = 'oj-select-one[id*="ExpiryType" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else {
      await this.expiryTypeDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(400);
  }

  async setGuaranteeExpiryDate(date: string): Promise<void> {
    await this.guaranteeExpiryDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.guaranteeExpiryDateInput.fill('');
    await this.guaranteeExpiryDateInput.fill(date);
    await this.guaranteeExpiryDateInput.blur();
  }

  async setExpiryCondition(text: string): Promise<void> {
    if (await this.expiryConditionInput.count() > 0) {
      await this.oj.ojFillLocator(this.expiryConditionInput, text);
    }
  }

  async setClosureDate(date: string): Promise<void> {
    if (await this.closureDateInput.count() > 0) {
      await this.closureDateInput.waitFor({ state: 'visible', timeout: 10000 });
      await this.closureDateInput.fill('');
      await this.closureDateInput.fill(date);
      await this.closureDateInput.blur();
    }
  }

  async setAutoExtensionRequired(value: 'Yes' | 'No'): Promise<void> {
    await this.autoExtensionRequiredToggle.scrollIntoViewIfNeeded();
    await this.autoExtensionRequiredToggle.getByText(new RegExp(`^${value}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setAutoExtensionDetails(d: {
    period?: string;
    details?: string;
    notificationPeriod?: string;
    finalExpiryDate?: string;
  }): Promise<void> {
    if (d.period) {
      const sel = 'oj-select-one[id*="AutoExtensionPeriod" i]';
      if (await this.page.locator(sel).count() > 0) {
        await this.oj.ojSelectWithSearch(sel, d.period, d.period);
      } else if (await this.autoExtensionPeriodDropdown.count() > 0) {
        await this.autoExtensionPeriodDropdown.click();
        await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: d.period }).first().click();
      }
    }
    if (d.details && await this.autoExtensionDetailsInput.count() > 0) {
      await this.oj.ojFillLocator(this.autoExtensionDetailsInput, d.details);
    }
    if (d.notificationPeriod && await this.autoExtensionNotificationInput.count() > 0) {
      await this.oj.ojFillLocator(this.autoExtensionNotificationInput, d.notificationPeriod);
    }
    if (d.finalExpiryDate && await this.autoExtensionFinalExpiryInput.count() > 0) {
      await this.autoExtensionFinalExpiryInput.fill('');
      await this.autoExtensionFinalExpiryInput.fill(d.finalExpiryDate);
      await this.autoExtensionFinalExpiryInput.blur();
    }
  }

  async setLiabilityScheduleRequired(value: 'Yes' | 'No'): Promise<void> {
    await this.liabilityScheduleRequiredToggle.scrollIntoViewIfNeeded();
    await this.liabilityScheduleRequiredToggle.getByText(new RegExp(`^${value}$`, 'i')).first().click();
    await this.wait.shortPause(300);
  }

  async setSenderToReceiverInfo(text: string): Promise<void> {
    if (await this.senderToReceiverInfoInput.count() > 0) {
      await this.oj.ojFillLocator(this.senderToReceiverInfoInput, text);
    }
  }

  async setSpecialInstruction(text: string): Promise<void> {
    if (await this.specialInstructionInput.count() > 0) {
      await this.oj.ojFillLocator(this.specialInstructionInput, text);
    }
  }

  async tickStandardInstructions(): Promise<void> {
    await this.standardInstructionsCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.standardInstructionsCheckbox.isChecked().catch(() => false))) {
      await this.standardInstructionsCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 5 — Delivery Details
  // ════════════════════════════════════════════════════════════════════════

  async setDeliveryOfAmendment(value: string): Promise<void> {
    const sel = 'oj-select-one[id*="DeliveryOfAmendment" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, value, value);
    } else if (await this.deliveryOfAmendmentDropdown.count() > 0) {
      await this.deliveryOfAmendmentDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: value }).first().click();
    }
    await this.wait.shortPause(300);
  }

  async setDeliveryToBeneficiary(): Promise<void> {
    if (await this.deliveryToBeneficiaryRadio.count() > 0) {
      await this.deliveryToBeneficiaryRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
  }

  async setDeliveryToOther(d: { name: string; address: string }): Promise<void> {
    if (await this.deliveryToOtherRadio.count() > 0) {
      await this.deliveryToOtherRadio.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    if (await this.deliveryToNameInput.count() > 0) {
      await this.oj.ojFillLocator(this.deliveryToNameInput, d.name);
    }
    if (await this.deliveryToAddressInput.count() > 0) {
      await this.oj.ojFillLocator(this.deliveryToAddressInput, d.address);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 7 — Linkages
  // ════════════════════════════════════════════════════════════════════════

  async addCashCollateral(d: {
    contributionAmount: string;
    contributionPct: string;
    accountNumber: string;
  }): Promise<void> {
    await this.addAccountLink.click();
    await this.wait.shortPause(800);
    await this.oj.ojFillLocator(this.contributionAmountInput, d.contributionAmount);
    await this.oj.ojFillLocator(this.contributionPercentInput, d.contributionPct);
    await this.selectAccountInput.click();
    await this.wait.shortPause(400);
    const search = this.page.locator('.oj-listbox-search input, .oj-select-search-field, input[placeholder*="Select Account" i]').first();
    if (await search.count() > 0) {
      await search.fill(d.accountNumber);
    }
    await this.page.locator('.oj-listbox-result-label, li[role="option"]')
                   .filter({ hasText: d.accountNumber })
                   .first()
                   .click();
    await this.wait.shortPause(500);
  }

  async addDepositLinkage(d: { accountNumber: string; amount: string }): Promise<void> {
    if (await this.addDepositLink.count() > 0) {
      await this.addDepositLink.click();
      await this.wait.shortPause(800);
    }
    if (await this.depositAmountInput.count() > 0) {
      await this.oj.ojFillLocator(this.depositAmountInput, d.amount);
    }
    if (await this.selectAccountInput.count() > 0) {
      await this.selectAccountInput.click();
      await this.wait.shortPause(400);
      const search = this.page.locator('.oj-listbox-search input, .oj-select-search-field, input[placeholder*="Select Account" i]').first();
      if (await search.count() > 0) {
        await search.fill(d.accountNumber);
      }
      await this.page.locator('.oj-listbox-result-label, li[role="option"]')
                     .filter({ hasText: d.accountNumber })
                     .first()
                     .click();
      await this.wait.shortPause(500);
    }
  }

  async deleteFirstLinkageRow(): Promise<void> {
    if (await this.deleteLinkageButton.count() > 0) {
      await this.deleteLinkageButton.click();
      await this.wait.shortPause(500);
      // Optional confirm modal
      const confirmBtn = this.page.getByRole('button', { name: /^Yes$|^OK$|^Delete$|Confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await this.wait.shortPause(500);
      }
    }
  }

  async assertLocalUndertakingNote(): Promise<void> {
    await expect(this.localUndertakingNote).toBeVisible({ timeout: 10000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 9 — Attachments / Submit
  // ════════════════════════════════════════════════════════════════════════

  async attachFile(filePath: string): Promise<void> {
    if (await this.fileInput.count() > 0) {
      await this.fileInput.setInputFiles(filePath);
    } else {
      await this.fileUploadButton.scrollIntoViewIfNeeded();
      const chooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
      await this.fileUploadButton.click();
      const chooser = await chooserPromise;
      await chooser.setFiles(filePath);
    }
    await this.wait.shortPause(1200);
  }

  async setSaveAsTemplate(name: string, accessType: 'Private' | 'Public' = 'Private'): Promise<void> {
    if (await this.saveAsTemplateYes.count() > 0) {
      await this.saveAsTemplateYes.evaluate(el => (el as HTMLElement).click());
      await this.wait.shortPause(300);
    }
    const sel = 'oj-select-one[id*="AccessType" i]';
    if (await this.page.locator(sel).count() > 0) {
      await this.oj.ojSelectWithSearch(sel, accessType, accessType);
    } else if (await this.accessTypeDropdown.count() > 0) {
      await this.accessTypeDropdown.click();
      await this.page.locator('li[role="option"], .oj-listbox-result-label').filter({ hasText: accessType }).first().click();
    }
    if (await this.templateNameInput.count() > 0) {
      await this.oj.ojFillLocator(this.templateNameInput, name);
    }
  }

  async tickTermsAndConditions(): Promise<void> {
    await this.tncCheckbox.scrollIntoViewIfNeeded();
    if (!(await this.tncCheckbox.isChecked().catch(() => false))) {
      await this.tncCheckbox.click();
    }
    await this.wait.shortPause(300);
  }

  async clickPreviewDraft(): Promise<void> {
    await this.previewDraftButton.click();
    await this.wait.shortPause(800);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.shortPause(2000);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Review screen
  // ════════════════════════════════════════════════════════════════════════

  async assertOnReviewScreen(): Promise<void> {
    await this.confirmButton.waitFor({ state: 'visible', timeout: 20000 });
  }

  async assertReviewBannerVisible(): Promise<void> {
    await expect(this.reviewBanner).toBeVisible({ timeout: 10000 });
  }

  async clickConfirm(): Promise<void> {
    await this.confirmButton.scrollIntoViewIfNeeded();
    try {
      await this.confirmButton.click({ timeout: 5000 });
    } catch {
      await this.confirmButton.evaluate(el => (el as HTMLElement).click());
    }
    await this.wait.shortPause(2500);
  }

  async assertConfirmation(): Promise<void> {
    const success    = this.page.getByText(/Transaction submitted for approval/i).first();
    const guaranteeOk = this.page.getByText(/Outward Guarantee.*successful|Guarantee Initiation.*submitted/i).first();
    const duplicate  = this.page.getByText(/Duplicate transaction not permitted/i).first();
    await success.or(guaranteeOk).or(duplicate).waitFor({ state: 'visible', timeout: 30000 });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Validation helpers
  // ════════════════════════════════════════════════════════════════════════

  async assertVisibleError(...variants: (string | RegExp)[]): Promise<void> {
    const candidates = variants.map(v =>
      typeof v === 'string' ? this.page.getByText(v, { exact: false }) : this.page.getByText(v)
    );
    let found = false;
    for (const c of candidates) {
      if (await c.first().isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, `Expected one of [${variants.map(String).join(' | ')}] to be visible`).toBeTruthy();
  }

  async assertCollateralExceedsError(): Promise<void> {
    await this.assertVisibleError(/Total Linkage Amount cannot exceed Undertaking Amount/i,
                                   /Contribution.*exceed/i);
  }
}
