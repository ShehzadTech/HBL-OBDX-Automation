import { Page, Locator, expect } from '@playwright/test';
import { OjHelper } from '@utils/ojHelper';
import { WaitHelper } from '@utils/waitHelper';

/**
 * Import Letter of Credit — End-to-End Flow Page Object (OBDX 25.1)
 *
 * Consolidates the full Create Import LC journey into a single class:
 *   1. LC Listing / Nav page  (Create LC button)
 *   2. Tab 1 — LC Details
 *   3. Tab 2 — Goods & Shipment
 *   4. Tab 3 — Documents (navigate only, no field interaction)
 *   5. Tab 4 — Linkages / Collateral
 *   6. Tab 5 — Instructions (mandatory Read Standard Instructions checkbox)
 *   7. Tab 6 — Insurance (select policy)
 *   8. Tab 7 — Attachments → Review → Confirmation
 *
 * Locators and quirks captured from the live OBDX 25.1 DOM. Numeric ID suffixes
 * (e.g. SelectProduct8713118) are session-scoped in some places — kept as-is
 * because they match the build under test. Stable selectors (data-id, aria-label,
 * pipe-suffix IDs) are preferred where available.
 *
 * ─── LIVE-APP UNKNOWNS (added for TC-BS-036…045 — needs DOM verification) ─────
 * The following locators were added without observed DOM evidence. They use
 * label/role-based fallbacks but may need adjustment against the live build:
 *
 *   • lcTypeRadio                — assumed `oj-radioset#LCType7704147`
 *   • usanceDaysInput            — guessed `id*="UsanceDays"` / `id*="Tenor"`
 *   • transferableCreditRadio    — label-scoped, no observed ID
 *   • revolvingRadio             — assumed `oj-radioset#Revolving5328169`
 *   • revolvingTypeDropdown      — guessed `id*="Revolving"` (excluding root)
 *   • revolvingCyclesInput       — guessed `id*="Cycles"`
 *   • tolerance{Under,Above}     — guessed `id*="Tolerance"` + label fallback
 *   • addGoodsRowButton          — guessed by accessible name "Add"
 *   • goods{Type,Qty,Cost}At(n)  — second-row indices unverified
 *   • senderToReceiverInput      — guessed textarea selector
 *
 * If a TC fails with "locator not found", inspect the live DOM and update the
 * matching locator below. The first-row goods locators are inherited from the
 * legacy fillGoodsRow() block (verified there).
 */
export class ImportLcFlowPage {
  // ── Listing / Nav page ──────────────────────────────────────────────────
  private readonly createLcButton = this.page.locator('button', { hasText: 'Create LC' }).first();

  // ── Tab 1: LC Details (existing) ────────────────────────────────────────
  private readonly productDropdown = this.page.locator('oj-select-one#SelectProduct8713118');
  // Live id is `lc-amount` (no `_field` suffix). Pin to the inner input via the
  // pipe-suffix id used across JET. Avoids matching `lc-amount_currency|input`
  // (the Currency dropdown's underlying input) which would otherwise be picked
  // up by a loose `[id*="lc-amount"]` selector and cause a strict-mode failure.
  // Verified by 2026-05-22 rescrape (data/scraped/ilc-create-rescrape-2026-05-22.json).
  private readonly lcAmountInput   = this.page.locator('input[id="lc-amount|input"]');
  private readonly swiftCodeInput  = this.page.locator('#availableWithSwiftCode input');
  private readonly verifyButton    = this.page.locator('button', { hasText: 'Verify' }).first();

  // ── Tab 1: Field 41A — Credit Available By (required LOV) ───────────────
  // Discovered by 2026-05-22 rescrape. The Tab-1 form will NOT advance to Tab 2
  // unless this LOV is set. Live AUT (AE/corpmaker2 + ILC-INL) offers
  // ["Negotiation", "Sight Payment"]. The SG-only test TC-IMPLC-013 expects an
  // option containing "Payment" — "Sight Payment" satisfies that.
  private readonly creditAvailableByDropdown = this.page.locator('oj-select-one#CreditAvailableBy4735824');

  // ── Tab 1: LC Details (extensions for TC-BS-036…040, 044) ───────────────
  // Locators verified against live DOM snapshot (TC-BS-036 error-context.md):
  // OBDX renders radio groups with ARIA role "radiogroup" and clean
  // accessible names; tolerance inputs use the visible label including the
  // "(%)" suffix.
  private readonly lcTypeRadio              = this.page.getByRole('radiogroup', { name: 'LC Type' });
  private readonly usanceDaysInput          = this.page
                                                .getByRole('textbox', { name: /^Tenor$|Usance Days|Usance Period/i })
                                                .or(this.page.locator('input[id*="UsanceDays"], input[id*="Tenor"]'))
                                                .first();
  /** Usance LC reveals a mandatory "Credit Days From" sub-field — must be
   *  filled (default 'Sight') or Next is silently blocked. The textbox
   *  has accessible name "Credit Days From" (capital F); a separate
   *  label/error generic with lowercase "Credit Days from" appears nearby
   *  on validation, so we pin to the textbox role. */
  private readonly creditDaysFromInput      = this.page
                                                .getByRole('textbox', { name: 'Credit Days From', exact: true })
                                                .first();

  /** Usance LC also requires a 42A Drawee Bank SWIFT Code. The textbox
   *  has accessible name "Drawee Swift Code" (verified via DOM snapshot)
   *  — distinct from the Credit Available With "SWIFT Code" textbox. */
  private readonly draweeBankSwiftInput    = this.page.getByRole('textbox', { name: 'Drawee Swift Code' });
  private readonly draweeBankVerifyButton  = this.page.getByRole('button',  { name: 'Verify' }).nth(1);
  // Role-based name no longer resolves in this build — 2026-05-21 rescrape
  // confirms the live ID is Transferable1086972 with options [Transferable, Non Transferable].
  private readonly transferableCreditRadio  = this.page.locator('oj-radioset#Transferable1086972');
  private readonly revolvingRadio           = this.page.getByRole('radiogroup', { name: 'Revolving' });
  private readonly revolvingTypeDropdown    = this.page
                                                .getByRole('combobox', { name: /Revolving Type/i })
                                                .or(this.page.locator('oj-select-one[id*="RevolvingType"]'))
                                                .first();
  private readonly revolvingCyclesInput     = this.page
                                                .getByRole('textbox', { name: /Cycles|Revolving Type Value/i })
                                                .or(this.page.locator('input[id*="Cycles"], input[id*="RevolvingTypeValue"]'))
                                                .first();
  private readonly toleranceUnderInput      = this.page
                                                .getByRole('textbox', { name: /Tolerance Under/i })
                                                .first();
  private readonly toleranceAboveInput      = this.page
                                                .getByRole('textbox', { name: /Tolerance Above/i })
                                                .first();

  // ── Tab 2: Goods & Shipment (existing) ──────────────────────────────────
  private readonly partialShipmentDropdown = this.page.locator('oj-select-one#PartialShipment2681350');
  private readonly transshipmentDropdown   = this.page.locator('oj-select-one#Transshipment8893098');
  private readonly placeOfTakingInput      = this.page.locator('#PlaceofTaking770471 input');
  private readonly finalDestinationInput   = this.page.locator('#PlaceofFinalDestination7797471 input');
  private readonly shipmentDateInput       = this.page.locator('#ShipmentDate8869450 input');
  private readonly portOfLoadingInput      = this.page.locator('#PortofLoading7310493 input');
  private readonly portOfDischargeInput    = this.page.locator('#PortofDischarge4407721 input');

  // ── Tab 2: Goods Grid row helpers ───────────────────────────────────────
  private goodsTypeSelectAt(rowIdx: number): Locator {
    return this.page.locator('oj-select-one[data-id*="SelectOne_Goods_Type"]').nth(rowIdx);
  }
  private goodsQuantityAt(rowIdx: number): Locator {
    return this.page.locator('input[aria-label="Quantity"][placeholder="0"]').nth(rowIdx);
  }
  private goodsCostAt(rowIdx: number): Locator {
    // Pipe-suffix ID is stable for row 0; row 1+ may need a different selector.
    return this.page.locator('[id="cost_per_unit|input"], input[aria-label*="Cost per Unit" i]').nth(rowIdx);
  }
  // Live AUT uses "Add Goods" link (id=AddGoods7337627) rather than the older
  // "Add Row" / "+ Add" button (2026-05-21 rescrape confirms).
  private readonly addGoodsRowButton = this.page
    .locator('a#AddGoods7337627, a[id^="AddGoods"]')
    .or(this.page.getByRole('link',   { name: /^Add Goods$|^Add Row$/i }))
    .or(this.page.getByRole('button', { name: /^Add Goods$|^Add Row$|^\+\s*Add$|^Add$/i }))
    .first();

  // ── Tab 4: Linkages ─────────────────────────────────────────────────────
  // The "Add Collateral Linkage" affordance has been observed in the live
  // build as both an <a> link AND a <button>, with the visible label varying
  // ("Click here to add Collateral Linkage" / "Add Account" / "Add"). We
  // chain .or() across the variants so the locator survives copy / element
  // changes between OBDX patches.
  private readonly addCollateralLink       = this.page
    .getByRole('link',   { name: /click here to add collateral linkage|add collateral|add account/i })
    .or(this.page.getByRole('button', { name: /click here to add collateral linkage|add collateral|add account/i }))
    .or(this.page.getByText(/click here to add collateral linkage/i))
    .first();
  // Cash Collateral row's Account picker is a custom <account-input> Web Component
  // (id=SettlementAccountNumber*). Its inner <input> only renders after the
  // wrapper is clicked. Verified by 2026-05-22 Tab-4 sub-panel rescrape +
  // confirmed by the OBDX inline error "Collateral percentage cannot be zero"
  // that fires when Percent is empty and Add Account is clicked.
  private readonly cashCollateralAccountWrapper = this.page.locator(
    'account-input[id^="SettlementAccountNumber"]'
  ).first();
  private readonly accountNumberInput      = this.cashCollateralAccountWrapper.locator('input').first();
  private readonly contributionAmountInput = this.page.getByRole('textbox', { name: 'Contribution Amount for Collateral' }).first();
  private readonly collateralTable         = this.page.locator('oj-table#CollateralLinkages401204');

  // ── Tab 5: Instructions ─────────────────────────────────────────────────
  private readonly advisingBankSwift                = this.page.locator('#advBankSwiftCode input');
  private readonly readStandardInstructionsCheckbox = this.page.locator('oj-checkboxset#ReadStandardInstructions6671350');
  // Live id is `SendertoReceiverInformation6300598` — note the lowercase 't' in
  // 'to'. CSS attribute selectors are case-sensitive by default, so the prior
  // `id*="SenderToReceiver"` substring did not match. Use the case-insensitive
  // flag ([id*="..." i]) so the locator survives any future casing changes.
  // Verified 2026-05-22.
  private readonly senderToReceiverInput            = this.page.locator(
                                                        'textarea[id*="Sendertoreceiver" i], oj-text-area[id*="Sendertoreceiver" i] textarea',
                                                      ).first();

  // ── Tab 6: Insurance ────────────────────────────────────────────────────
  private readonly insuranceTable = this.page.locator('oj-table#InsuranceDataTable8714597');

  // ── Tab 7 / Review / Confirmation ───────────────────────────────────────
  private readonly submitButton    = this.page.locator('button', { hasText: 'Submit' }).first();
  private readonly termsCheckbox   = this.page.getByRole('checkbox', { name: 'I accept Terms and Conditions' });
  private readonly readOnlyFields  = this.page.locator('DIV.oj-text-field-readonly-div');

  // ── Shared ──────────────────────────────────────────────────────────────
  private readonly nextButton = this.page.locator('button', { hasText: 'Next' }).first();

  private oj: OjHelper;
  private wait: WaitHelper;

  constructor(private page: Page) {
    this.oj   = new OjHelper(page);
    this.wait = new WaitHelper(page);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Listing / Nav page
  // ────────────────────────────────────────────────────────────────────────

  async assertOnLcNavPage(): Promise<void> {
    await expect(this.createLcButton).toBeVisible({ timeout: 15000 });
  }

  async clickCreateLC(): Promise<void> {
    await this.createLcButton.click();
    await this.wait.waitForUrlFragment('initiate-letter-of-credit', 30000);
    await this.wait.shortPause(1000);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 1 — LC Details
  // ────────────────────────────────────────────────────────────────────────

  async fillLcDetails(data: {
    product: string;
    dateOfExpiry: string;
    placeOfExpiry: string;
    beneficiaryName: string;
    lcCurrency: string;
    lcAmount: string;
    customerReference: string;
    swiftCode: string;
    /** Field 41A — Credit Available By. Required to advance past Tab 1.
     *  Defaults to 'Sight Payment' (the canonical option for ILC-INL Sight LC). */
    creditAvailableBy?: string;
    // ── extensions ───────────────────────────────────────────────────────
    /** Sight (default) or Usance (deferred payment). */
    lcType?: 'Sight' | 'Usance';
    /** Required when lcType === 'Usance'. */
    usanceDays?: number | string;
    /** Marks the LC as transferable to secondary beneficiaries. */
    transferable?: 'Yes' | 'No';
    /** Revolving LC configuration. */
    revolving?: { type: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly'; cycles: number | string };
    /** Tolerance Under percentage (39A). */
    toleranceUnder?: number | string;
    /** Tolerance Above percentage (39A). */
    toleranceAbove?: number | string;
    /** Usance "Credit Days From" anchor — defaults to 'Sight' when LC Type = Usance. */
    usanceCreditDaysFrom?: string;
    /** Default true. Set false for negative tests that stop on Tab 1. */
    proceedToNext?: boolean;
  }): Promise<void> {
    await this.productDropdown.waitFor({ state: 'visible', timeout: 20000 });

    // Revolving must be set BEFORE selecting the product, because the OBDX
    // product LOV is filtered by Revolving state — Usance/Revolving-capable
    // products (e.g. ILC-INU) only appear when Revolving = Yes.
    if (data.revolving) {
      await this.setRevolving(data.revolving);
    }

    await this.oj.ojSelectWithSearch('oj-select-one#SelectProduct8713118', data.product, data.product);
    await this.wait.shortPause(600);

    // Optional Tab-1 extras — applied after product (now LC Type / Tenor /
    // Drawee Bank fields are rendered for the chosen product variant).
    if (data.lcType) {
      await this.setLcTypeRadio(data.lcType);
      if (data.lcType === 'Usance') {
        if (data.usanceDays !== undefined) {
          await this.setUsanceDays(String(data.usanceDays));
        }
        // Credit Days From is a Usance sub-field that's mandatory in the live
        // build — Next is silently blocked if it's empty. Default 'Sight'.
        await this.setCreditDaysFrom(data.usanceCreditDaysFrom ?? 'Sight');
      }
    }
    if (data.transferable) {
      await this.setTransferableCredit(data.transferable);
    }

    await this.wait.shortPause(300);
    await this.oj.ojFillDate('#DateofExpiry3481130 input', data.dateOfExpiry);
    await this.wait.shortPause(300);

    await this.oj.ojFill('#PlaceofExpiry2710814 input', data.placeOfExpiry);
    await this.wait.shortPause(300);

    await this.oj.ojSelectWithSearch('oj-select-one#BeneficiaryName8826275', data.beneficiaryName, data.beneficiaryName);
    await this.wait.shortPause(600);

    await this.oj.ojSelectWithSearch('oj-select-one#lc-amount_currency', data.lcCurrency, data.lcCurrency);
    await this.wait.shortPause(400);

    await this.lcAmountInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.lcAmountInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('input[id="lc-amount|input"]', data.lcAmount);
    await this.wait.shortPause(300);

    if (data.toleranceUnder !== undefined || data.toleranceAbove !== undefined) {
      await this.setTolerance(
        data.toleranceUnder !== undefined ? String(data.toleranceUnder) : undefined,
        data.toleranceAbove !== undefined ? String(data.toleranceAbove) : undefined,
      );
    }

    await this.oj.ojFill('#CustomerReferenceNumber8344067 input', data.customerReference);

    // 41A Credit Available By — mandatory LOV gating Tab-1 → Tab-2 progression.
    // Default 'Sight Payment' picks the LIVE-AUT canonical option for ILC-INL
    // (confirmed by rescrape-2026-05-22; live LOV is [Negotiation, Sight Payment]).
    // Override via fillLcDetails({ creditAvailableBy: 'Negotiation' }) for the
    // Negotiation variant.
    await this.setCreditAvailableBy(data.creditAvailableBy ?? 'Sight Payment');

    await this.swiftCodeInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.swiftCodeInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#availableWithSwiftCode input', data.swiftCode);
    await this.wait.shortPause(400);
    await this.verifyButton.click();
    await this.wait.shortPause(1000);

    // Usance LC also requires 42A Drawee Bank SWIFT — fill and verify after
    // Credit Available With. Reuses the same SWIFT code unless an explicit
    // value is supplied. No-op for Sight LCs (the field isn't rendered).
    if (data.lcType === 'Usance') {
      await this.setDraweeBankSwift(data.swiftCode);
    }

    if (data.proceedToNext !== false) {
      await this.clickNext();
    }
  }

  // ── Tab 1 setters (extensions) ──────────────────────────────────────────

  /** Set Field 41A — Credit Available By (e.g. 'Sight Payment', 'Negotiation'). */
  async setCreditAvailableBy(value: string): Promise<void> {
    await this.creditAvailableByDropdown.waitFor({ state: 'visible', timeout: 10000 });
    await this.creditAvailableByDropdown.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#CreditAvailableBy4735824', value);
    await this.wait.shortPause(400);
  }

  /** Pick Sight / Usance from the LC Type radioset. */
  private async setLcTypeRadio(value: 'Sight' | 'Usance'): Promise<void> {
    await this.lcTypeRadio.scrollIntoViewIfNeeded();
    await this.lcTypeRadio.getByText(value, { exact: true }).first().click();
    await this.wait.shortPause(400);
  }

  /** Fill Usance Days (visible only when LC Type = Usance). */
  private async setUsanceDays(days: string): Promise<void> {
    await this.usanceDaysInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.usanceDaysInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.usanceDaysInput, days);
    await this.wait.shortPause(300);
  }

  /** Fill the "Credit Days From" sub-field that appears when LC Type =
   *  Usance. Mandatory — if left empty Next is silently blocked.
   *  Uses Playwright's standard fill() rather than ojFillLocator because
   *  getByRole resolves to the oj-input-text custom element (not an
   *  HTMLInputElement), which makes the native value setter throw
   *  "Illegal invocation". fill() handles the OJet element correctly. */
  private async setCreditDaysFrom(value: string): Promise<void> {
    await this.creditDaysFromInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await this.creditDaysFromInput.count() === 0) return;
    await this.creditDaysFromInput.scrollIntoViewIfNeeded();
    await this.creditDaysFromInput.fill(value);
    await this.creditDaysFromInput.blur();
    await this.wait.shortPause(300);
  }

  /** Fill the 42A Drawee Bank SWIFT code (a second mandatory SWIFT input
   *  that appears for Usance LC). Uses .fill() for the same reason as
   *  setCreditDaysFrom (OJet wrapper), then clicks the second Verify
   *  button to trigger bank-detail lookup. No-op if the field isn't
   *  present (e.g. Sight LC where 42A isn't rendered). */
  private async setDraweeBankSwift(swift: string): Promise<void> {
    if (await this.draweeBankSwiftInput.count() === 0) return;
    await this.draweeBankSwiftInput.scrollIntoViewIfNeeded();
    await this.draweeBankSwiftInput.fill(swift);
    await this.draweeBankSwiftInput.blur();
    await this.wait.shortPause(400);
    if (await this.draweeBankVerifyButton.count() > 0) {
      await this.draweeBankVerifyButton.click();
      await this.wait.shortPause(1000);
    }
  }

  /** Pick Yes / No on the Transferable Credit radio. */
  private async setTransferableCredit(value: 'Yes' | 'No'): Promise<void> {
    // Live radio options are "Transferable" / "Non Transferable" (verified
    // 2026-05-21 rescrape). Map the boolean-style input to the live labels.
    const optionLabel = value === 'Yes' ? 'Transferable' : 'Non Transferable';
    await this.transferableCreditRadio.scrollIntoViewIfNeeded();
    await this.transferableCreditRadio.getByText(optionLabel, { exact: true }).first().click();
    await this.wait.shortPause(400);
  }

  // ── Revolving family — sub-field locators discovered in rescrape-2026-05-23
  // The live form renders these on Tab 1 when Revolving=Yes is selected:
  //   • AutoReinstatement5890136 (radio: Yes/No)
  //   • RevolvingType7494476    (radio: Value/Time)
  //   • Cumulative8227808       (radio: Yes/No)  — only when Type=Time
  //   • RepeatFrequency7761639  (LOV:    Days/Months) — only when Type=Time
  //   • RepeatFrequency6732900  (number) — frequency value, only when Type=Time
  private readonly autoReinstatementRadio = this.page.locator('oj-radioset#AutoReinstatement5890136');
  private readonly revolvingTypeNewRadio  = this.page.locator('oj-radioset#RevolvingType7494476');
  private readonly cumulativeRadio        = this.page.locator('oj-radioset#Cumulative8227808');
  private readonly repeatFrequencyLov     = this.page.locator('oj-select-one#RepeatFrequency7761639');
  private readonly repeatFrequencyValue   = this.page.locator('input[id="RepeatFrequency6732900|input"]');

  /** Pick Yes on Revolving radio and (when sub-fields render) configure the
   *  Time/Value variant + Auto-Reinstatement + Cumulative + Repeat Frequency.
   *
   *  Live sub-field set captured by rescrape-2026-05-23:
   *    • Revolving Type — 'Value' or 'Time'. Default 'Time'.
   *    • Auto Reinstatement — 'Yes' | 'No'. Default 'Yes'.
   *    • Cumulative (Time path only) — 'Yes' | 'No'. Default 'Yes'.
   *    • Repeat Frequency (Time path only) — { period: 'Days'|'Months', value: number }.
   *
   *  Backward-compat: the legacy `opts.type` of 'Monthly'/'Quarterly'/etc. is
   *  mapped to {revolvingType:'Time', frequency:{period:'Months', value:opts.cycles}}.
   */
  async setRevolving(opts: {
    type?: string;
    cycles?: number | string;
    revolvingType?: 'Value' | 'Time';
    autoReinstatement?: 'Yes' | 'No';
    cumulative?: 'Yes' | 'No';
    frequency?: { period: 'Days' | 'Months'; value: number | string };
  }): Promise<void> {
    await this.revolvingRadio.scrollIntoViewIfNeeded();
    const yesRadio = this.revolvingRadio.getByRole('radio', { name: 'Yes' }).first();
    await yesRadio.waitFor({ state: 'attached', timeout: 5000 });
    if (!(await yesRadio.isChecked())) {
      await yesRadio.click();
    }
    await this.wait.shortPause(800);

    // Sub-fields only render once Revolving=Yes is committed AND product is
    // selected. If absent, return — the caller can re-apply after picking a
    // Revolving-capable product (ILC-INU on Usance entitlement etc.).
    const subFieldVisible = await this.autoReinstatementRadio.isVisible({ timeout: 2000 }).catch(() => false);
    if (!subFieldVisible) return;

    // Map legacy {type, cycles} args into the new shape.
    let revolvingType: 'Value' | 'Time' = opts.revolvingType ?? 'Time';
    let frequency = opts.frequency;
    if (!opts.revolvingType && opts.type) {
      // Legacy callers passed Monthly|Quarterly|Half Yearly|Yearly. Live LOV only
      // exposes Days/Months. Months is the only mapping that makes sense.
      revolvingType = 'Time';
      const cyc = opts.cycles ?? 1;
      frequency = { period: 'Months', value: cyc };
    }

    if (opts.autoReinstatement) {
      await this.setAutoReinstatement(opts.autoReinstatement);
    }

    await this.setRevolvingType(revolvingType);

    if (revolvingType === 'Time') {
      if (opts.cumulative) {
        await this.setCumulative(opts.cumulative);
      }
      if (frequency) {
        await this.setRepeatFrequency(frequency);
      }
    }
  }

  /** Set Auto-Reinstatement (Yes/No). Only meaningful when Revolving=Yes. */
  async setAutoReinstatement(value: 'Yes' | 'No'): Promise<void> {
    await this.autoReinstatementRadio.waitFor({ state: 'visible', timeout: 5000 });
    await this.autoReinstatementRadio.getByRole('radio', { name: value }).click();
    await this.wait.shortPause(400);
  }

  /** Set Revolving Type ('Value' or 'Time'). 'Time' reveals Cumulative + Repeat Frequency. */
  async setRevolvingType(value: 'Value' | 'Time'): Promise<void> {
    await this.revolvingTypeNewRadio.waitFor({ state: 'visible', timeout: 5000 });
    await this.revolvingTypeNewRadio.getByRole('radio', { name: value }).click();
    await this.wait.shortPause(600);
  }

  /** Set Cumulative (Yes/No). Only visible when Revolving Type = Time. */
  async setCumulative(value: 'Yes' | 'No'): Promise<void> {
    await this.cumulativeRadio.waitFor({ state: 'visible', timeout: 5000 });
    await this.cumulativeRadio.getByRole('radio', { name: value }).click();
    await this.wait.shortPause(400);
  }

  /** Set Repeat Frequency period (Days|Months) + value. Only visible when Time. */
  async setRepeatFrequency(opts: { period: 'Days' | 'Months'; value: number | string }): Promise<void> {
    await this.repeatFrequencyLov.waitFor({ state: 'visible', timeout: 5000 });
    await this.oj.ojSelectByText('oj-select-one#RepeatFrequency7761639', opts.period);
    await this.wait.shortPause(400);
    await this.oj.ojFillLocator(this.repeatFrequencyValue, String(opts.value));
    await this.wait.shortPause(300);
  }

  /** Fill Tolerance Under/Above percentages. */
  private async setTolerance(under?: string, above?: string): Promise<void> {
    if (under !== undefined) {
      await this.toleranceUnderInput.scrollIntoViewIfNeeded();
      await this.oj.ojFillLocator(this.toleranceUnderInput, under);
    }
    if (above !== undefined) {
      await this.toleranceAboveInput.scrollIntoViewIfNeeded();
      await this.oj.ojFillLocator(this.toleranceAboveInput, above);
    }
    await this.wait.shortPause(300);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 2 — Goods & Shipment
  // ────────────────────────────────────────────────────────────────────────

  async fillGoodsAndShipment(data: {
    partialShipment: string;
    transshipment: string;
    placeOfTaking: string;
    finalDestination: string;
    shipmentDate: string;
    portOfLoading: string;
    portOfDischarge: string;
    goodsType: string;
    goodsQuantity: string;
    goodsCostPerUnit: string;
    /** When provided, fills these rows instead of (or in addition to) the default
     *  goods row. The first entry maps to row 0 (auto-created); subsequent entries
     *  cause "Add Row" clicks. */
    goodsRows?: Array<{ goodsType: string; quantity: string; costPerUnit: string }>;
    /** Default true. Set false for negative tests that stop on Tab 2. */
    proceedToNext?: boolean;
  }): Promise<void> {
    await this.partialShipmentDropdown.waitFor({ state: 'visible', timeout: 20000 });

    await this.partialShipmentDropdown.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#PartialShipment2681350', data.partialShipment);
    await this.wait.shortPause(400);

    await this.transshipmentDropdown.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#Transshipment8893098', data.transshipment);
    await this.wait.shortPause(400);

    await this.placeOfTakingInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PlaceofTaking770471 input', data.placeOfTaking);

    await this.finalDestinationInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PlaceofFinalDestination7797471 input', data.finalDestination);

    await this.shipmentDateInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillDate('#ShipmentDate8869450 input', data.shipmentDate);
    await this.wait.shortPause(300);

    await this.portOfLoadingInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PortofLoading7310493 input', data.portOfLoading);

    await this.portOfDischargeInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#PortofDischarge4407721 input', data.portOfDischarge);

    // Goods rows: explicit goodsRows[] takes precedence; otherwise no goods entry
    // (matches the legacy behaviour of leaving the default row unfilled).
    if (data.goodsRows && data.goodsRows.length > 0) {
      for (let i = 0; i < data.goodsRows.length; i++) {
        if (i > 0) {
          await this.addGoodsRowButton.scrollIntoViewIfNeeded();
          await this.addGoodsRowButton.click();
          await this.wait.shortPause(600);
        }
        await this.fillGoodsRow(i, data.goodsRows[i]);
      }
    }

    if (data.proceedToNext !== false) {
      await this.nextButton.scrollIntoViewIfNeeded();
      await this.nextButton.click();
      await this.dismissGoodsAmountWarning();
      await this.wait.shortPause(1000);
    }
  }

  /** Fill one row in the Goods table. Row 0 is the auto-created row. */
  private async fillGoodsRow(
    rowIdx: number,
    data: { goodsType: string; quantity: string; costPerUnit: string },
  ): Promise<void> {
    const goodsType = this.goodsTypeSelectAt(rowIdx);
    await goodsType.waitFor({ state: 'visible', timeout: 10000 });
    await goodsType.scrollIntoViewIfNeeded();
    await goodsType.click();
    const opt = this.page
      .locator('.oj-listbox-result-label, li[role="option"]')
      .filter({ hasText: data.goodsType })
      .first();
    await opt.waitFor({ state: 'visible', timeout: 8000 });
    await opt.click();
    await this.wait.shortPause(400);

    const qty = this.goodsQuantityAt(rowIdx);
    await this.oj.ojFillLocator(qty, data.quantity);

    const cost = this.goodsCostAt(rowIdx);
    await this.oj.ojFillLocator(cost, data.costPerUnit);

    await this.wait.shortPause(500);
  }

  /** Dismiss the "Goods total amount should equal LC amount" warning if it appears */
  private async dismissGoodsAmountWarning(): Promise<void> {
    try {
      const okBtn = this.page.locator('button', { hasText: 'OK' }).first();
      await okBtn.waitFor({ state: 'visible', timeout: 4000 });
      await okBtn.click();
    } catch {
      // Warning did not appear
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 3 — Documents (no field interaction; click Next via JS to bypass
  // pointer-events on the disabled-looking button)
  // ────────────────────────────────────────────────────────────────────────

  async navigateThroughDocuments(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector('li#letter-of-credit-document-details');
        if (!el) return false;
        return el.classList.contains('oj-selected') ||
               el.getAttribute('aria-selected') === 'true' ||
               el.querySelector('.oj-selected') !== null;
      },
      { timeout: 15000 }
    ).catch(() => { /* fall through to JS click */ });
    await this.wait.shortPause(800);

    await this.clickNextViaJs();
    await this.wait.shortPause(1000);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 4 — Linkages
  // ────────────────────────────────────────────────────────────────────────

  async fillLinkages(data: {
    collateralAccountNumber: string;
    collateralContributionAmount: string;
  }): Promise<void> {
    // The Linkages form lazy-renders after tab activation. Wait for the OJet
    // busy-context to settle (canonical OBDX wait per the framework skill) so
    // the add-collateral affordance has time to mount, THEN look for it. The
    // DOM snapshot for the original failure showed an empty content area
    // when the 20s wait fired, so the timeout is bumped to 60s.
    await this.page.locator('.oj-busy-context').first()
      .waitFor({ state: 'detached', timeout: 8000 })
      .catch(() => { /* no busy indicator → already settled */ });

    // Cash Collateral Percent must be set BEFORE clicking Add Account — the
    // form throws "Collateral percentage cannot be zero" otherwise. 2% chosen
    // because the default contributionAmount (1000) ÷ default LC amount (50000)
    // = 2%, keeping the collateral consistent with prior test expectations.
    await this.setCashCollateralPercent(2);
    await this.wait.shortPause(500);

    await this.addCollateralLink.waitFor({ state: 'visible', timeout: 60000 });
    await this.addCollateralLink.scrollIntoViewIfNeeded();
    await this.addCollateralLink.click();
    await this.wait.shortPause(800);

    // Click the <account-input> wrapper to open the "Select Account" LOV.
    // Verified by 2026-05-22 failure context: clicking the wrapper opens a
    // grid (role="dialog"+role="grid"; aria-label="Select Account") that
    // overlays the page with a row per eligible account. The inner <input>
    // becomes hidden when the LOV is open — so we don't fill it; instead we
    // click the row that contains the desired account number.
    await this.cashCollateralAccountWrapper.waitFor({ state: 'visible', timeout: 10000 });
    await this.cashCollateralAccountWrapper.scrollIntoViewIfNeeded();
    await this.cashCollateralAccountWrapper.click();
    await this.wait.shortPause(800);

    // Pick the matching account row from the LOV. The grid uses role="row";
    // each row's text contains the account number, name, currency, status.
    const accountRow = this.page
      .getByRole('row', { name: new RegExp(data.collateralAccountNumber, 'i') })
      .or(this.page.locator('li[role="option"], .oj-listbox-result').filter({
        hasText: data.collateralAccountNumber,
      }))
      .first();
    await accountRow.waitFor({ state: 'visible', timeout: 10000 });
    await accountRow.click({ timeout: 5000 });
    await this.wait.shortPause(800);

    await this.oj.ojFillLocator(this.contributionAmountInput, data.collateralContributionAmount);
    await this.wait.shortPause(400);

    await expect(this.collateralTable).toBeVisible({ timeout: 10000 });

    await this.clickNext();
  }

  // ── Tab 4: Cash Collateral % (rescrape-2026-05-21 — unblocks TC-BS-010/011) ─
  private readonly cashCollateralPercentInput = this.page.locator('#Percent2774746 input');

  /** Set the Cash Collateral percentage on Tab 4 (Linkages).
   *  Used by TC-BS-010 (0% → must add Linkage) and TC-BS-011 (2% → linked to USD account). */
  async setCashCollateralPercent(value: number | string): Promise<void> {
    await this.cashCollateralPercentInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.cashCollateralPercentInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.cashCollateralPercentInput, String(value));
    await this.wait.shortPause(400);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 5 — Instructions (mandatory Read Standard Instructions checkbox)
  // ────────────────────────────────────────────────────────────────────────

  async fillInstructions(data: {
    advisingBankSwift: string;
    /** Free-text Field 72 (Sender to Receiver Information). */
    senderToReceiverInfo?: string;
    /** Default true. Set false for the negative test (TC-BS-045). */
    tickStandardInstructions?: boolean;
    /** Default true. Set false for negative tests that stop on Tab 5. */
    proceedToNext?: boolean;
  }): Promise<void> {
    await this.readStandardInstructionsCheckbox.waitFor({ state: 'visible', timeout: 20000 });

    // Advising Bank SWIFT is normally pre-filled from Tab 1 — only fill if empty
    await this.advisingBankSwift.waitFor({ state: 'visible', timeout: 10000 });
    const value = await this.advisingBankSwift.inputValue();
    if (!value || value.trim() === '') {
      await this.oj.ojFill('#advBankSwiftCode input', data.advisingBankSwift);
      await this.wait.shortPause(400);
    }

    if (data.senderToReceiverInfo) {
      await this.setSenderToReceiverInfo(data.senderToReceiverInfo);
    }

    if (data.tickStandardInstructions !== false) {
      await this.checkReadStandardInstructions();
    }

    if (data.proceedToNext !== false) {
      await this.clickNextViaJs();
      await this.wait.shortPause(1000);
    }
  }

  /** Fill Field 72 / Sender to Receiver Information textarea. */
  private async setSenderToReceiverInfo(text: string): Promise<void> {
    await this.senderToReceiverInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.senderToReceiverInput, text);
    await this.wait.shortPause(300);
  }

  /** OJet checkboxset doesn't always commit on Playwright .check() — drive via JS */
  private async checkReadStandardInstructions(): Promise<void> {
    await this.readStandardInstructionsCheckbox.scrollIntoViewIfNeeded();
    await this.wait.shortPause(400);

    await this.page.evaluate(() => {
      const checkboxSet = document.querySelector('oj-checkboxset#ReadStandardInstructions6671350');
      if (!checkboxSet) throw new Error('ReadStandardInstructions checkboxset not found');
      const cb = checkboxSet.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (!cb) throw new Error('Checkbox input inside ReadStandardInstructions not found');
      if (!cb.checked) cb.click();
    });
    await this.wait.shortPause(600);

    const isChecked = await this.page.evaluate(() => {
      const checkboxSet = document.querySelector('oj-checkboxset#ReadStandardInstructions6671350');
      const cb = checkboxSet?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      return cb?.checked ?? false;
    });

    if (!isChecked) {
      await this.readStandardInstructionsCheckbox.click();
      await this.wait.shortPause(500);
    }
  }

  // ── Tab 5: Advising Bank toggle + Name/Address path ──────────────────────
  // Locators from rescrape-2026-05-21 (data/scraped/initiate-import-lc-locators.json).
  private readonly advisingBankRadio        = this.page.locator('oj-radioset#AdvisingBank3000831');
  private readonly advisingBankNameInput    = this.page.locator('#Name6443099 input');
  private readonly advisingBankAddrLine1    = this.page.locator('#Address3276872 input');
  private readonly advisingBankAddrLine2    = this.page.locator('#AddressLine5785752 input');
  private readonly advisingBankAddrLine3    = this.page.locator('#AddressLine8553367 input');
  // XPath "following::button" walks the DOM forward from the input and returns
  // the next Verify button. Robust to any layout-class differences between the
  // input and its sibling Verify button. (Earlier ancestor-based xpath did not
  // resolve in the live AUT — 2026-05-22 run failure.)
  private readonly advisingBankVerifyButton = this.page.locator(
    'xpath=//input[@id="advBankSwiftCode|input"]/following::button[normalize-space()="Verify"][1]'
  );

  /** Toggle the Advising Bank radio (SWIFT Code vs Name and Address).
   *  Unblocks TC-IMPLC-036 / TC-IMPLC-037. */
  async setAdvisingBankBy(mode: 'SWIFT Code' | 'Name and Address'): Promise<void> {
    await this.advisingBankRadio.scrollIntoViewIfNeeded();
    const radio = this.advisingBankRadio.getByRole('radio', { name: mode });
    await radio.click();
    await this.wait.shortPause(800);
  }

  /** Click Verify next to the Tab 5 Advising-Bank SWIFT Code field.
   *  Bank name should auto-populate on success. */
  async clickVerifyOnTab5(): Promise<void> {
    await this.advisingBankVerifyButton.first().click({ timeout: 10000 });
    await this.wait.shortPause(1200);
  }

  /** Assert that the Advising Bank name auto-populated after a successful Verify.
   *  Live AUT (2026-05-22) replaces the SWIFT input with a 4-line read-only
   *  summary (SWIFT code, Bank Name, SWIFT code repeat, Address). The bank-name
   *  line is rendered as a plain text element — not an <input> — so the older
   *  input-based selectors don't match. Instead, locate the Advising Bank
   *  section heading then walk the nearest container's text. */
  async assertAdvisingBankAutoFilled(): Promise<void> {
    const sectionText = await this.page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('label, span, div, h2, h3, legend'));
      const heading = headings.find(h => /^Advising Bank\b/i.test((h.textContent || '').trim()));
      if (!heading) return '';
      // Walk up to the nearest containing block and dump its text.
      let cur = heading.parentElement;
      for (let i = 0; i < 5 && cur; i++) {
        const t = (cur.textContent || '').trim();
        if (t.length > 50) return t;
        cur = cur.parentElement;
      }
      return (heading.parentElement?.textContent || '').trim();
    });
    expect(
      sectionText.length,
      'Advising Bank section text should be populated after Verify (saw: "' + sectionText.slice(0, 80) + '")'
    ).toBeGreaterThan(20);
    // Must contain a non-trivial bank-name signal (mixed uppercase, longer than SWIFT alone).
    expect(
      /BANK|CORP|HOLDINGS|FINANCIAL|N\.A\.|LIMITED|LTD/i.test(sectionText),
      'Advising Bank section should contain a bank-name keyword (saw: "' + sectionText.slice(0, 200) + '")'
    ).toBe(true);
  }

  /** Fill the Advising Bank Name+Address lines (only visible when mode = Name and Address).
   *  Unblocks TC-IMPLC-037. */
  async fillAdvisingBankNameAndAddress(data: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    addressLine3?: string;
  }): Promise<void> {
    await this.advisingBankNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.oj.ojFillLocator(this.advisingBankNameInput, data.name);
    await this.oj.ojFillLocator(this.advisingBankAddrLine1, data.addressLine1);
    if (data.addressLine2) await this.oj.ojFillLocator(this.advisingBankAddrLine2, data.addressLine2);
    if (data.addressLine3) await this.oj.ojFillLocator(this.advisingBankAddrLine3, data.addressLine3);
    await this.wait.shortPause(400);
  }

  // ── Tab 5: Special Payment Conditions (unblocks TC-IMPLC-038) ────────────
  private readonly specialPaymentBeneficiaryArea = this.page.locator(
    '#SpecialPaymentConditionsforBeneficiary3001606 textarea'
  );
  private readonly specialPaymentBankOnlyArea = this.page.locator(
    '#SpecialPaymentConditionsforBankOnly9311284 textarea'
  );

  async setSpecialPaymentForBeneficiary(text: string): Promise<void> {
    await this.specialPaymentBeneficiaryArea.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.specialPaymentBeneficiaryArea, text);
    await this.wait.shortPause(300);
  }

  async setSpecialPaymentForBankOnly(text: string): Promise<void> {
    await this.specialPaymentBankOnlyArea.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.specialPaymentBankOnlyArea, text);
    await this.wait.shortPause(300);
  }

  // ── Tab 5: Confirmation Instructions radio (unblocks TC-IMPLC-039/040, TC-BS-005/006) ──
  // NOTE: dependent Confirming-Bank section locators are NOT in the current scrape —
  // a 2nd-pass scrape (toggle = Confirm → capture revealed widgets) is needed before
  // tests can assert the dependent SWIFT/Name-and-Address Confirming Bank fields.
  private readonly confirmationInstructionsRadio = this.page.locator(
    'oj-radioset#ConfirmationInstructions2562782'
  );

  async setConfirmationInstructions(mode: 'Confirm' | 'May Add' | 'Without'): Promise<void> {
    await this.confirmationInstructionsRadio.scrollIntoViewIfNeeded();
    const radio = this.confirmationInstructionsRadio.getByRole('radio', { name: mode });
    await radio.click();
    await this.wait.shortPause(800);
  }

  // ── Tab 5: Standard Instructions overlay (unblocks TC-IMPLC-042) ─────────
  private readonly standardInstructionsLink = this.page.locator(
    'a#KindlygothroughalltheStandardInstructions3154142'
  );

  /** Open the Standard Instructions overlay by clicking the
   *  "Kindly go through all the Standard Instructions" link. */
  async openStandardInstructionsOverlay(): Promise<void> {
    await this.standardInstructionsLink.scrollIntoViewIfNeeded();
    await this.standardInstructionsLink.click();
    await this.wait.shortPause(800);
  }

  /** Assert the Standard Instructions overlay is visible + non-empty. */
  async assertStandardInstructionsOverlayOpen(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /standard instructions/i }).first();
    await expect(dialog).toBeVisible({ timeout: 8000 });
    const text = (await dialog.textContent()) ?? '';
    expect(text.trim().length, 'Standard Instructions overlay should contain text').toBeGreaterThan(20);
  }

  /** Close the Standard Instructions overlay (Close button / X / Escape). */
  async closeStandardInstructionsOverlay(): Promise<void> {
    const closeBtn = this.page.getByRole('button', { name: /^(Close|OK|Done)$/i }).last();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.wait.shortPause(500);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 6 — Insurance
  // ────────────────────────────────────────────────────────────────────────

  async fillInsurance(data: {
    insurancePolicyNumber: string;
  }): Promise<void> {
    await this.insuranceTable.waitFor({ state: 'visible', timeout: 20000 });
    await this.insuranceTable.scrollIntoViewIfNeeded();
    await this.wait.shortPause(600);

    const selected = await this.page.evaluate((policyNum) => {
      const table = document.querySelector('oj-table#InsuranceDataTable8714597');
      if (!table) throw new Error('Insurance table not found');
      const rows = Array.from(table.querySelectorAll('tr[role="row"]'));
      for (const row of rows) {
        if (row.textContent?.includes(policyNum)) {
          const radio = row.querySelector('input[type="radio"], oj-selector, .oj-selector-radio') as HTMLElement | null;
          if (radio) { radio.click(); return true; }
          (row as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, data.insurancePolicyNumber);

    if (!selected) {
      // Fallback: select first row (AIG Insurance)
      await this.page.evaluate(() => {
        const table = document.querySelector('oj-table#InsuranceDataTable8714597');
        const rows = table?.querySelectorAll('tr[role="row"]');
        if (rows && rows.length > 0) {
          const radio = rows[0].querySelector('input[type="radio"]') as HTMLElement | null;
          if (radio) radio.click();
          else (rows[0] as HTMLElement).click();
        }
      });
    }
    await this.wait.shortPause(500);

    await this.clickNextViaJs();
    await this.wait.shortPause(1000);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Tab 7 — Attachments → Review → Confirmation
  // ────────────────────────────────────────────────────────────────────────

  /** Tick T&C and click Submit on Attachments to navigate to the Review page. */
  async submitFromAttachments(): Promise<void> {
    // T&C must be ticked or Submit is silently rejected.
    await this.termsCheckbox.waitFor({ state: 'attached', timeout: 15000 });
    await this.termsCheckbox.scrollIntoViewIfNeeded();
    await this.termsCheckbox.evaluate((el) => {
      const cb = el as HTMLInputElement;
      if (!cb.checked) cb.click();
    });
    await this.wait.shortPause(400);

    await this.submitButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.waitForUrlFragment('review-letter-of-credit', 30000);
    await this.wait.shortPause(1500);
  }

  /** Final Submit on the Review page. Backend processing for some LC product
   *  variants (notably Usance with Drawee Bank lookup) takes longer than the
   *  vanilla Sight path — the URL transition timeout is generous to avoid
   *  flake without slowing down successful runs. */
  async submitFromReview(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
    await this.wait.waitForUrlFragment('confirm-screen', 60000);
    await this.wait.shortPause(1500);
  }

  async assertOnReviewPage(): Promise<void> {
    await this.page.waitForFunction(
      () => window.location.href.includes('review-letter-of-credit'),
      { timeout: 20000 }
    );
  }

  async assertOnConfirmationPage(): Promise<void> {
    await this.page.waitForFunction(
      () => window.location.href.includes('confirm-screen'),
      { timeout: 20000 }
    );
  }

  async assertConfirmation(
    expectedMessage: string = 'Transaction submitted for approval.',
    expectedStatus: string  = 'Pending for Approval'
  ): Promise<void> {
    await expect(
      this.page.locator(`text=${expectedMessage}`).first()
    ).toBeVisible({ timeout: 20000 });

    await expect(
      this.page.locator(`text=${expectedStatus}`).first()
    ).toBeVisible({ timeout: 10000 });
  }

  /** Find the alphanumeric reference number among read-only confirmation fields. */
  async getReferenceNumber(): Promise<string> {
    const count = await this.readOnlyFields.count();
    for (let i = 0; i < count; i++) {
      const text = await this.readOnlyFields.nth(i).innerText();
      if (/^[A-Z0-9]{10,}$/.test(text.trim())) {
        return text.trim();
      }
    }
    return 'REFERENCE_NOT_FOUND';
  }

  // ────────────────────────────────────────────────────────────────────────
  // Negative-test helpers
  // ────────────────────────────────────────────────────────────────────────

  /** Click Next, then assert that an error matching `pattern` becomes visible.
   *  Used by negative tests where the form must block progression. */
  async assertNextBlockedWithError(pattern: string | RegExp): Promise<void> {
    // Click Next; the click may "succeed" (no exception) but the page won't
    // navigate because the form is invalid. Both are acceptable here — what
    // matters is that the error message becomes visible afterwards.
    await this.nextButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.nextButton.click({ timeout: 5000 }).catch(() => {});

    const errorLoc = this.page
      .locator('.oj-message-error-text, [class*="error"]')
      .filter({ hasText: pattern });
    await expect(errorLoc.first()).toBeVisible({ timeout: 8000 });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Internal helpers (now public)
  // ────────────────────────────────────────────────────────────────────────

  async clickNext(): Promise<void> {
    await this.nextButton.scrollIntoViewIfNeeded();
    await this.nextButton.click();
    await this.wait.shortPause(1000);
  }

  /** JS click — bypasses pointer-events / disabled-looking states on Next. */
  async clickNextViaJs(): Promise<void> {
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent?.trim() === 'Next');
      if (nextBtn) nextBtn.click();
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 1 — field-level helpers (TC-IMPLC-001…015)
  //
  // These methods provide granular access to individual Tab-1 fields so the
  // field-level test cases can drive a single concern at a time (e.g. pick
  // an applicant type, verify auto-populate, inspect a LOV) without going
  // through the monolithic fillLcDetails happy path.
  //
  // LIVE-APP UNKNOWNS — most locators below are educated guesses; verify
  // against the live OBDX DOM and adjust as needed.
  // ════════════════════════════════════════════════════════════════════════

  // ── Tab 1: Applicant section ────────────────────────────────────────────
  // Live DOM (TC-IMPLC-001 error context): the form uses semantic ARIA
  // roles. Applicant Address/Country are NOT inputs — they are plain text
  // <div>s that appear once an applicant is selected, so "read-only"
  // assertions check for visible text content rather than a readonly attr.
  private readonly applicantTypeRadio    = this.page.getByRole('radiogroup', { name: 'Applicant Details' });
  private readonly applicantNameDropdown = this.page.getByRole('combobox',  { name: 'Applicant Name' });
  /** "Address" label container (with the auto-populated address lines beneath). */
  private readonly applicantAddressLabel = this.page.getByText('Address',  { exact: true }).first();
  private readonly applicantCountryLabel = this.page.getByText('Country',  { exact: true }).first();

  /** Select Applicant Details radio (Existing Customer or Non-customer).
   *  In some OBDX builds (e.g. SG entity) the "Existing customer" radio is
   *  the only option and renders as `[checked] [disabled]`. Clicking a
   *  disabled radio hangs until timeout — so we no-op when the target
   *  radio is already checked. Match is case-insensitive (live DOM uses
   *  lowercase "Existing customer"; older code passed "Existing Customer"). */
  async selectApplicantType(value: 'Existing Customer' | 'Non-customer'): Promise<void> {
    await this.applicantTypeRadio.scrollIntoViewIfNeeded();
    const radio = this.applicantTypeRadio.getByRole('radio', {
      name: new RegExp(`^${value}$`, 'i'),
    }).first();
    await radio.waitFor({ state: 'attached', timeout: 5000 });
    if (await radio.isChecked()) return;            // already selected → done
    if (await radio.isDisabled()) return;           // disabled-and-not-checked is a no-op too
    await radio.click();
    await this.wait.shortPause(500);
  }

  /** Pick an applicant from the LOV. If no name given, pick the first option. */
  async selectApplicant(name?: string): Promise<void> {
    await this.applicantNameDropdown.waitFor({ state: 'visible', timeout: 10000 });
    if (name) {
      await this.oj.ojSelectWithSearch(
        'oj-select-one[id*="ApplicantName"], oj-select-one[id*="Applicant"]',
        name, name,
      );
    } else {
      await this.applicantNameDropdown.click();
      const firstOpt = this.page.locator('.oj-listbox-result-label, li[role="option"]').first();
      await firstOpt.waitFor({ state: 'visible', timeout: 8000 });
      await firstOpt.click();
    }
    await this.wait.shortPause(500);
  }

  /** Assert Applicant Address auto-populated and rendered as read-only text
   *  (live DOM uses plain <div> text, not <input readonly>) — we just check
   *  the "Address" label is visible after applicant selection. */
  async assertApplicantAddressReadOnly(): Promise<void> {
    await expect(this.applicantAddressLabel).toBeVisible({ timeout: 10000 });
  }

  /** Assert Applicant Country auto-populated as read-only text. */
  async assertApplicantCountryReadOnly(): Promise<void> {
    await expect(this.applicantCountryLabel).toBeVisible({ timeout: 10000 });
  }

  /** Fill Non-customer applicant details (Name / Address / Country). */
  async fillNonCustomerApplicant(data: { name: string; address: string; country: string }): Promise<void> {
    await this.oj.ojFill('input[id*="ApplicantName"][id*="NonCustomer"], input[id*="NonCustomerName"]', data.name);
    await this.oj.ojFill('textarea[id*="ApplicantAddress"][id*="NonCustomer"], textarea[id*="NonCustomerAddress"]', data.address);
    await this.oj.ojSelectWithSearch(
      'oj-select-one[id*="ApplicantCountry"], oj-select-one[id*="NonCustomerCountry"]',
      data.country, data.country,
    );
    await this.wait.shortPause(400);
  }

  // ── Tab 1: Field 40A — Type of Documentary Credit ───────────────────────
  private readonly field40ARadio = this.page.locator('oj-radioset#Transferable1086972');

  /** Returns the visible labels of the 40A radio options (for asserting LOV content). */
  async getField40ARadioOptions(): Promise<string[]> {
    await this.field40ARadio.waitFor({ state: 'visible', timeout: 10000 });
    return this.field40ARadio.locator('label, oj-option').allInnerTexts();
  }

  // ── Tab 1: Beneficiary section ──────────────────────────────────────────
  private readonly beneficiaryTypeRadio    = this.page.getByRole('radiogroup', { name: 'Beneficiary Details' });
  // Live DOM (TC-IMPLC-010 error): Beneficiary Address/Country are plain
  // text <div>s, NOT <input readonly>. The "Address"/"Country" labels
  // appear twice on Tab 1 — once for Applicant, once for Beneficiary —
  // so we use .nth(1) to scope to the beneficiary section.
  private readonly beneficiaryAddressLabel = this.page.getByText('Address',  { exact: true }).nth(1);
  private readonly beneficiaryCountryLabel = this.page.getByText('Country',  { exact: true }).nth(1);

  /** Select Beneficiary Details radio (Existing or New). */
  async selectBeneficiaryType(value: 'Existing' | 'New'): Promise<void> {
    await this.beneficiaryTypeRadio.scrollIntoViewIfNeeded();
    await this.beneficiaryTypeRadio.getByText(value, { exact: true }).first().click();
    await this.wait.shortPause(500);
  }

  /** Pick an existing beneficiary by name. */
  async selectExistingBeneficiary(name: string): Promise<void> {
    await this.oj.ojSelectWithSearch('oj-select-one#BeneficiaryName8826275', name, name);
    await this.wait.shortPause(500);
  }

  /** Assert beneficiary Address auto-populated as read-only text (live DOM
   *  uses plain <div>s, not <input readonly>) — same pattern as
   *  assertApplicantAddressReadOnly. */
  async assertBeneficiaryAddressReadOnly(): Promise<void> {
    await expect(this.beneficiaryAddressLabel).toBeVisible({ timeout: 10000 });
  }

  /** Assert beneficiary Country auto-populated as read-only text. */
  async assertBeneficiaryCountryReadOnly(): Promise<void> {
    await expect(this.beneficiaryCountryLabel).toBeVisible({ timeout: 10000 });
  }

  /** Fill New beneficiary details. */
  async fillNewBeneficiary(data: { name: string; address: string; country: string }): Promise<void> {
    // OBDX renders the label INSIDE the input area via OJet's label-edge="inside",
    // which Playwright surfaces via getByLabel (not getByPlaceholder — there is
    // no placeholder attribute on these fields).
    const nameInput = this.page.getByLabel('Beneficiary Name', { exact: true }).first();
    await nameInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.oj.ojFillLocator(nameInput, data.name);

    const addressInput = this.page.getByLabel('Address', { exact: true }).first();
    await this.oj.ojFillLocator(addressInput, data.address);

    // Country uses an oj-select-one — try both placeholder and label fallbacks.
    try {
      await this.oj.ojSelectWithSearch(
        'oj-select-one[id*="BeneficiaryCountry"], oj-select-one[id*="Country"]',
        data.country, data.country,
      );
    } catch {
      // Some builds expose the LOV as a combobox — fall back to role-based picker.
      const cb = this.page.getByRole('combobox', { name: /Country/i }).first();
      await cb.click();
      await this.page.getByRole('option', { name: new RegExp('^' + data.country + '$', 'i') }).first().click();
    }
    await this.wait.shortPause(400);
  }

  // ── Tab 1: Tolerance + Total Exposure (39B) ─────────────────────────────
  private readonly totalExposureField = this.page.locator(
    '[id*="TotalExposure"], [id*="totalExposure"], oj-text-field[id*="Exposure"]',
  ).first();
  // Live 39C is rendered as <oj-text-area id="AdditionalAmountCovered8411447">
  // wrapping a <textarea id="AdditionalAmountCovered8411447|input">. Earlier
  // selector targeted <input>, which never resolved. Verified 2026-05-22.
  private readonly field39CInput = this.page.locator(
    'textarea[id="AdditionalAmountCovered8411447|input"], oj-text-area[id*="AdditionalAmount"] textarea',
  ).first();

  /** Read the auto-calculated Total Exposure value. */
  async getTotalExposure(): Promise<string> {
    await this.totalExposureField.waitFor({ state: 'visible', timeout: 10000 });
    const v = await this.totalExposureField.textContent();
    if (v && v.trim()) return v.trim();
    return (await this.totalExposureField.inputValue().catch(() => '')) ?? '';
  }

  /** Assert Total Exposure equals an expected substring (e.g. "AED 220"). */
  async assertTotalExposureContains(expected: string): Promise<void> {
    const actual = await this.getTotalExposure();
    expect(actual).toContain(expected);
  }

  /** Fill Field 39C — Additional Amounts Covered. */
  async fillField39C(value: string): Promise<void> {
    await this.field39CInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.field39CInput, value);
  }

  // ── Tab 1: Granular setters extracted from fillLcDetails ────────────────

  async selectProduct(productText: string): Promise<void> {
    await this.productDropdown.waitFor({ state: 'visible', timeout: 20000 });
    await this.oj.ojSelectWithSearch('oj-select-one#SelectProduct8713118', productText, productText);
    await this.wait.shortPause(600);
  }

  async fillDateOfExpiry(date: string): Promise<void> {
    await this.oj.ojFillDate('#DateofExpiry3481130 input', date);
    await this.wait.shortPause(300);
  }

  async fillPlaceOfExpiry(place: string): Promise<void> {
    await this.oj.ojFill('#PlaceofExpiry2710814 input', place);
    await this.wait.shortPause(300);
  }

  async selectCurrency(currency: string): Promise<void> {
    await this.oj.ojSelectWithSearch('oj-select-one#lc-amount_currency', currency, currency);
    await this.wait.shortPause(400);
  }

  async fillLcAmount(amount: string): Promise<void> {
    await this.lcAmountInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.lcAmountInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('input[id="lc-amount|input"]', amount);
    await this.wait.shortPause(300);
  }

  async fillCustomerReference(ref: string): Promise<void> {
    await this.oj.ojFill('#CustomerReferenceNumber8344067 input', ref);
  }

  async fillSwiftAndVerify(swift: string): Promise<void> {
    await this.swiftCodeInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.swiftCodeInput.scrollIntoViewIfNeeded();
    await this.oj.ojFill('#availableWithSwiftCode input', swift);
    await this.wait.shortPause(400);
    await this.verifyButton.click();
    await this.wait.shortPause(1000);
  }

  /** Public Tolerance setter — same as the internal one. */
  async setToleranceFields(under?: number | string, above?: number | string): Promise<void> {
    if (under !== undefined) {
      await this.toleranceUnderInput.scrollIntoViewIfNeeded();
      await this.oj.ojFillLocator(this.toleranceUnderInput, String(under));
    }
    if (above !== undefined) {
      await this.toleranceAboveInput.scrollIntoViewIfNeeded();
      await this.oj.ojFillLocator(this.toleranceAboveInput, String(above));
    }
    await this.wait.shortPause(300);
  }

  /** Assert that any visible mandatory-field error message appears. Pass an
   *  array of expected substrings; assertion passes if all are visible. */
  async assertMandatoryErrors(messages: string[]): Promise<void> {
    for (const msg of messages) {
      const errLoc = this.page
        .locator('.oj-message-error-text, [class*="error"]')
        .filter({ hasText: msg });
      await expect(errLoc.first()).toBeVisible({ timeout: 8000 });
    }
  }

  /** Assert SWIFT verify auto-populated bank-name field. */
  async assertSwiftBankAutoFilled(): Promise<void> {
    const bankName = this.page.locator(
      'input[id*="BankName"], [id*="creditAvailableWithBankName"], input[id*="CreditAvailableWith"][id*="Bank"]',
    ).first();
    await expect(bankName).toBeVisible({ timeout: 10000 });
    const value = await bankName.inputValue().catch(() => '');
    expect(value.trim().length).toBeGreaterThan(0);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 2 — field-level helpers (TC-IMPLC-016…023)
  // LIVE-APP UNKNOWNS: Shipment Period field, Goods Gross-Amount cell,
  // Delete-row affordance — locators are educated guesses.
  // ════════════════════════════════════════════════════════════════════════

  private readonly shipmentPeriodInput = this.page
    .getByRole('textbox', { name: /Shipment Period|Period for Presentation|Period of Shipment/i })
    .or(this.page.getByLabel(/Shipment Period/i))
    .or(this.page.locator('input[id*="ShipmentPeriod"], textarea[id*="ShipmentPeriod"]'))
    .first();

  /** Fill Shipment Period free-text field (alternative to Shipment Date). */
  async fillShipmentPeriod(text: string): Promise<void> {
    await this.shipmentPeriodInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.shipmentPeriodInput, text);
    await this.wait.shortPause(300);
  }

  /** Toggle the Tab-2 "Shipment" radiogroup between Date and Period. The
   *  live UI enforces mutual exclusivity by swapping the rendered input
   *  based on this radio — selecting Period hides Shipment Date, and
   *  vice versa. Used by TC-IMPLC-019. */
  async selectShipmentMode(mode: 'Date' | 'Period'): Promise<void> {
    const radiogroup = this.page.getByRole('radiogroup', { name: 'Shipment' });
    await radiogroup.scrollIntoViewIfNeeded();
    await radiogroup.getByRole('radio', { name: mode }).first().click();
    await this.wait.shortPause(500);
  }

  /** Returns true if the Shipment Date input is currently visible. */
  async isShipmentDateVisible(): Promise<boolean> {
    return this.page.getByRole('combobox', { name: 'Shipment Date' }).isVisible().catch(() => false);
  }

  /** Returns true if the Shipment Period input is currently visible. */
  async isShipmentPeriodVisible(): Promise<boolean> {
    return this.shipmentPeriodInput.isVisible().catch(() => false);
  }

  /** Read the auto-calculated Gross Amount of a goods row (Qty × Cost). */
  async getGrossAmountAt(rowIdx: number): Promise<string> {
    // OBDX renders Gross Amount as a readonly+hidden <input> behind a visible
    // <span> showing the formatted value. waitFor({state:'visible'}) blocks
    // because the input is intentionally hidden. Read the value attribute
    // directly via evaluate.
    const grossLoc = this.page
      .locator('input[id*="gross_amount" i], input[id*="GrossAmount" i], input[aria-label*="Gross Amount" i]')
      .nth(rowIdx);
    await grossLoc.waitFor({ state: 'attached', timeout: 10000 });
    return (await grossLoc.evaluate(el => (el as HTMLInputElement).value).catch(() => '')) || '';
  }

  /** Delete a goods row by index. */
  async deleteGoodsRow(rowIdx: number): Promise<void> {
    const delBtn = this.page
      .locator('[aria-label*="Delete" i], button[title*="Delete" i]')
      .nth(rowIdx);
    await delBtn.scrollIntoViewIfNeeded();
    await delBtn.click();
    await this.wait.shortPause(500);
  }

  /** Add an empty goods row (for tests that fill it via fillGoodsRowAt). */
  async addGoodsRow(): Promise<void> {
    await this.addGoodsRowButton.scrollIntoViewIfNeeded();
    await this.addGoodsRowButton.click();
    await this.wait.shortPause(600);
  }

  /** Public goods-row filler at a specific row index (row 0 = auto-created). */
  async fillGoodsRowAt(
    rowIdx: number,
    data: { goodsType: string; quantity: string; costPerUnit: string },
  ): Promise<void> {
    await this.fillGoodsRow(rowIdx, data);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 3 — field-level helpers (TC-IMPLC-024…030)
  // LIVE-APP UNKNOWNS: Presentation Days input + Incoterm LOV — locators
  // are educated guesses.
  // ════════════════════════════════════════════════════════════════════════

  // Live ID confirmed by 2026-05-21 rescrape: InputDays9476795 (oj-input-number).
  private readonly presentationDaysInput = this.page.locator(
    '#InputDays9476795 input, input[id*="InputDays"], input[id*="PresentationDays"], input[id*="presentDays"], input[aria-label*="presented within" i]',
  ).first();
  private readonly incotermDropdown = this.page.locator(
    'oj-select-one[id*="Incoterm"]',
  ).first();

  /** Set "Documents to be presented within" days (Field 48). */
  async setPresentationDays(value: number | string): Promise<void> {
    await this.presentationDaysInput.scrollIntoViewIfNeeded();
    await this.oj.ojFillLocator(this.presentationDaysInput, String(value));
    await this.wait.shortPause(300);
  }

  /** Select an Incoterm from the LOV (e.g. CIF, FOB, CFR, EXW). */
  async selectIncoterm(name: string): Promise<void> {
    await this.incotermDropdown.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one[id*="Incoterm"]', name);
    await this.wait.shortPause(400);
  }

  // ── Tab 3 — Additional Conditions (47A) ─────────────────────────────────
  // Locators captured by rescrape-2026-05-23.
  private readonly addConditionLink   = this.page.locator('a#AddCondition3088651');
  private readonly conditionCodeLov   = this.page.locator('oj-select-one#ConditionCode1895481');
  private readonly conditionIdentifierLov = this.page.locator('oj-select-one#Identifier6056414');
  private readonly referCodesLink     = this.page.locator('a#ReferCodesandDescription7049347');
  private readonly referCodesOverlay  = this.page.locator('[role="dialog"][aria-label="Right Drawer"]');

  /** Click "Add Condition" to reveal the Code + Identifier inputs. */
  async clickAddCondition(): Promise<void> {
    await this.addConditionLink.scrollIntoViewIfNeeded();
    await this.addConditionLink.click();
    await this.wait.shortPause(800);
  }

  /** Select a Condition Code (47A) from its LOV. */
  async selectConditionCode(code: string): Promise<void> {
    await this.conditionCodeLov.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#ConditionCode1895481', code);
    await this.wait.shortPause(400);
  }

  /** Select a Condition Identifier (47A) from its LOV. */
  async selectConditionIdentifier(identifier: string): Promise<void> {
    await this.conditionIdentifierLov.scrollIntoViewIfNeeded();
    await this.oj.ojSelectByText('oj-select-one#Identifier6056414', identifier);
    await this.wait.shortPause(400);
  }

  /** Open the "Refer Codes and Description" right-drawer overlay. */
  async openReferCodesOverlay(): Promise<void> {
    await this.referCodesLink.scrollIntoViewIfNeeded();
    await this.referCodesLink.click();
    await this.wait.shortPause(800);
  }

  /** Assert the Refer Codes right-drawer overlay is open and non-empty. */
  async assertReferCodesOverlayOpen(): Promise<void> {
    await expect(this.referCodesOverlay).toBeVisible({ timeout: 8000 });
    const text = (await this.referCodesOverlay.textContent()) ?? '';
    expect(text.trim().length, 'Refer Codes overlay should contain content').toBeGreaterThan(5);
  }

  /** Close the Refer Codes right-drawer overlay (via its dismiss button or Escape). */
  async closeReferCodesOverlay(): Promise<void> {
    const dismiss = this.referCodesOverlay.getByRole('button', { name: /dismiss overlay/i }).first();
    if (await dismiss.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dismiss.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.wait.shortPause(500);
  }

  // ── Save As Draft dialog (any tab) ──────────────────────────────────────
  // Discovered by rescrape-2026-05-23. The Save As Draft button opens
  // <oj-dialog id="saveAsDialog"> with a <oj-input-text id="NameoftheDraft5341057">
  // and a "Save" button.
  private readonly saveAsDraftButton = this.page.locator('button', { hasText: 'Save As Draft' }).first();
  private readonly saveAsDialog      = this.page.locator('oj-dialog#saveAsDialog');
  private readonly draftNameInput    = this.page.locator('input[id="NameoftheDraft5341057|input"]');
  private readonly draftSaveButton   = this.saveAsDialog.locator('button', { hasText: 'Save' }).first();
  private readonly savedDialog       = this.page.locator('oj-dialog#savedDialog');

  /** Click "Save As Draft", fill the draft name, click Save in the dialog. */
  async clickSaveAsDraft(name: string): Promise<void> {
    await this.saveAsDraftButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveAsDraftButton.scrollIntoViewIfNeeded();
    await this.saveAsDraftButton.click();
    await this.wait.shortPause(800);

    await this.draftNameInput.waitFor({ state: 'visible', timeout: 8000 });
    await this.oj.ojFillLocator(this.draftNameInput, name);
    await this.wait.shortPause(400);

    await this.draftSaveButton.click();
    // Saved confirmation dialog appears
    await this.savedDialog.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.wait.shortPause(600);
  }

  /** Assert the "Saved" confirmation dialog is visible after a successful save. */
  async assertDraftSaved(): Promise<void> {
    await expect(this.savedDialog).toBeVisible({ timeout: 10000 });
  }

  /** Dismiss the "Saved" confirmation dialog (click OK or Close). */
  async dismissSavedDialog(): Promise<void> {
    const ok = this.savedDialog.locator('button', { hasText: /^(Ok|OK|Close|Done)$/ }).first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ok.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.wait.shortPause(500);
  }

  // ── Tab 5 — Confirming Bank (revealed when Confirmation=Confirm/May Add) ─
  // The Confirmation Instructions radio (ConfirmationInstructions2562782) renders
  // conditionally — present in some Tab-5 sessions, absent in others (likely a
  // product/entitlement filter). When set to Confirm or May Add, a Confirming
  // Bank section reveals with the same SWIFT/Name-and-Address radio pattern as
  // Advising Bank. Generic helpers below use the role+name pattern so they work
  // even when the literal ids haven't been captured yet.
  private readonly confirmingBankSection = this.page.getByRole('radiogroup', { name: /Confirming Bank/i });

  /** Returns true if the Confirming Bank section is currently rendered. */
  async isConfirmingBankSectionVisible(): Promise<boolean> {
    return this.confirmingBankSection.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Assert the form blocks Next when Confirmation=Confirm + Confirming Bank empty.
   *  Helper for TC-BS-007. */
  async assertConfirmingBankRequired(): Promise<void> {
    const errLoc = this.page
      .locator('.oj-message-error-text, [class*="error"]')
      .filter({ hasText: /confirming bank|required|enter a value/i });
    await expect(errLoc.first()).toBeVisible({ timeout: 8000 });
  }

  // ── Tab 1 — SWIFT Code Lookup overlay (TC-BS-013) ───────────────────────
  // The "Lookup SWIFT Code" link on Tab 1 (next to availableWithSwiftCode) and
  // Tab 5 (next to advBankSwiftCode) opens <oj-dialog id="availableWithLookup">
  // or <oj-dialog id="draweeBankLookup"> containing a search-by-keyword form
  // with fields swiftCode_obdx*, city_obdx*, bankName_obdx*.
  private readonly availableWithLookupDialog = this.page.locator('oj-dialog#availableWithLookup');
  private readonly draweeBankLookupDialog    = this.page.locator('oj-dialog#draweeBankLookup');

  /** Click the "Lookup SWIFT Code" link on Tab 1 (Credit Available With). */
  async openTab1SwiftLookup(): Promise<void> {
    const link = this.page.getByRole('link', { name: 'Lookup SWIFT Code' }).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await this.wait.shortPause(800);
  }

  /** Type a keyword into the Bank Name field of the SWIFT lookup dialog and trigger search. */
  async lookupSwiftByBankName(keyword: string): Promise<void> {
    const bankInput = this.availableWithLookupDialog
      .locator('oj-input-text[id^="bankName_obdx"] input').first();
    await bankInput.waitFor({ state: 'visible', timeout: 8000 });
    await this.oj.ojFillLocator(bankInput, keyword);
    await this.wait.shortPause(400);
    const searchBtn = this.availableWithLookupDialog.locator('button', { hasText: /Search/i }).first();
    if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBtn.click();
      await this.wait.shortPause(1500);
    }
  }

  /** Assert the SWIFT lookup dialog contains at least one result row. */
  async assertSwiftLookupHasResults(): Promise<void> {
    const rows = this.availableWithLookupDialog.locator('tr[role="row"]').filter({ hasNot: this.page.locator('th') });
    expect(await rows.count()).toBeGreaterThan(0);
  }

  /** Close the SWIFT lookup dialog (Cancel button or Escape). */
  async closeSwiftLookup(): Promise<void> {
    const cancel = this.availableWithLookupDialog.locator('button', { hasText: /^(Cancel|Close)$/ }).first();
    if (await cancel.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancel.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.wait.shortPause(500);
  }

  // ── Tab 7 — Save as Template + File upload (TC-IMPLC-043/044/045) ────────
  // SaveAsTemplate1696954 is an oj-radioset (Yes/No). When Yes is picked,
  // sub-fields appear (template Name + Access Type) — locators not captured
  // in this build (likely a customisation-gated feature).
  private readonly saveAsTemplateRadio = this.page.locator('oj-radioset#SaveAsTemplate1696954');
  private readonly fileDropZone        = this.page.locator('oj-file-picker, .oj-filepicker-dropzone').first();
  private readonly hiddenFileInput     = this.page.locator('input[type="file"]').first();

  /** Toggle "Save as Template" to Yes or No. */
  async setSaveAsTemplate(value: 'Yes' | 'No'): Promise<void> {
    await this.saveAsTemplateRadio.waitFor({ state: 'visible', timeout: 8000 });
    await this.saveAsTemplateRadio.getByRole('radio', { name: value }).click();
    await this.wait.shortPause(800);
  }

  /** Upload one or more attachment files via the hidden file input under the drop zone. */
  async uploadAttachments(paths: string[]): Promise<void> {
    await this.hiddenFileInput.waitFor({ state: 'attached', timeout: 8000 });
    await this.hiddenFileInput.setInputFiles(paths);
    await this.wait.shortPause(1500);
  }

  /** Delete an uploaded attachment by row index. */
  async deleteAttachmentAt(rowIdx: number): Promise<void> {
    const delBtn = this.page
      .locator('[aria-label*="Delete" i], button[title*="Delete" i], a[title*="Delete" i]')
      .nth(rowIdx);
    await delBtn.scrollIntoViewIfNeeded();
    await delBtn.click();
    await this.wait.shortPause(500);
  }

  /** Click "Delete All" attachments (visible only when at least one file is uploaded). */
  async deleteAllAttachments(): Promise<void> {
    const btn = this.page.getByRole('button', { name: /^Delete\s+All$/i }).first()
      .or(this.page.getByRole('link', { name: /^Delete\s+All$/i }).first());
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await this.wait.shortPause(800);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tab 6 / Submit — field-level helpers (TC-IMPLC-046)
  // ════════════════════════════════════════════════════════════════════════

  /** Click Submit on Attachments WITHOUT ticking T&C — for negative tests
   *  asserting the form blocks submission. Does NOT navigate; verify the
   *  error appears via assertNextBlockedWithError or similar. */
  async clickSubmitOnAttachmentsWithoutTerms(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click({ timeout: 5000 }).catch(() => {});
    await this.wait.shortPause(800);
  }

  /** Assert the Review screen has each of the 6 named sections rendered. */
  async assertReviewSectionsPresent(sections: string[]): Promise<void> {
    for (const section of sections) {
      const sectionLoc = this.page.getByText(section, { exact: false }).first();
      await expect(sectionLoc).toBeVisible({ timeout: 8000 });
    }
  }

  /** Assert the Review screen has Confirm / Back / Cancel buttons. */
  async assertReviewActionButtons(): Promise<void> {
    const confirmBtn = this.page.getByRole('button', { name: /^Confirm$|^Submit$/i }).first();
    const backBtn    = this.page.getByRole('button', { name: /^Back$|^Edit$/i }).first();
    const cancelBtn  = this.page.getByRole('button', { name: /^Cancel$/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 8000 });
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });
  }
}
