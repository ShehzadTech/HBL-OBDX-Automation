# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: trade-finance\ilc-create.spec.ts >> Tab 1 — LC Details (TC-IMPLC-001…015) >> TC-IMPLC-004: SG entity — Field 40A LOV exact set + mandatory
- Location: tests\trade-finance\ilc-create.spec.ts:734:7

# Error details

```
Error: SG customisation C-9.5: 40A must render as a LOV on the SG entity. Live build (corpmaker3 + ILC-SLC, 2026-05-22) renders it as a radio group [Transferable, Non Transferable] instead — customisation defect.

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - link "Skip to main content" [ref=e5] [cursor=pointer]:
      - /url: "#maincontent"
    - generic [ref=e6]:
      - banner [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - generic [ref=e10]:
              - generic "Toggle Menu" [ref=e11]:
                - button "Open Menu" [ref=e12] [cursor=pointer]:
                  - generic [ref=e15]: 
              - link "Open Dashboard" [ref=e17] [cursor=pointer]:
                - /url: "#"
                - img "Open Dashboard" [ref=e18]
            - generic "Search Transaction" [ref=e22]:
              - generic [ref=e24]: 
              - combobox "Search Transaction" [ref=e25]:
                - textbox "Search Transaction" [ref=e26]:
                  - /placeholder: Search
            - generic [ref=e27]:
              - generic "4" [ref=e29]:
                - button "4" [ref=e30] [cursor=pointer]:
                  - generic [ref=e33]:
                    - text: 
                    - generic [ref=e34]: "4"
              - button "corpmaker3" [ref=e37] [cursor=pointer]:
                - generic [ref=e38]:
                  - img "corpmaker3" [ref=e40]:
                    - generic [ref=e43]: CA
                  - text:  
          - generic [ref=e48]:
            - generic "Back" [ref=e51]:
              - button "Back" [ref=e52] [cursor=pointer]:
                - generic [ref=e53]:
                  - generic [ref=e55]: 
                  - generic [ref=e56]: Back
            - generic [ref=e57]:
              - heading "Initiate Letter of Credit" [level=1] [ref=e58]
              - generic [ref=e59]: JZNNZI ZO AZNZM ULI KZKVI YLCVH ZMW | P000168
      - main [ref=e61]:
        - generic [ref=e73]:
          - generic [ref=e80]:
            - text: 
            - tablist "Initiate LC Screens" [ref=e83]:
              - tab " LC Details" [selected] [ref=e84] [cursor=pointer]:
                - generic [ref=e85]: 
                - generic [ref=e87]: LC Details
              - tab " Goods and Shipment Details" [ref=e88] [cursor=pointer]:
                - generic [ref=e89]: 
                - generic [ref=e91]: Goods and Shipment Details
              - tab " Documents and Conditions" [ref=e92] [cursor=pointer]:
                - generic [ref=e93]: 
                - generic [ref=e95]: Documents and Conditions
              - tab " Linkages" [ref=e96] [cursor=pointer]:
                - generic [ref=e97]: 
                - generic [ref=e99]: Linkages
              - tab " Instructions" [ref=e100] [cursor=pointer]:
                - generic [ref=e101]: 
                - generic [ref=e103]: Instructions
              - tab " Insurance" [ref=e104] [cursor=pointer]:
                - generic [ref=e105]: 
                - generic [ref=e107]: Insurance
              - tab " Attachments" [ref=e108] [cursor=pointer]:
                - generic [ref=e109]: 
                - generic [ref=e111]: Attachments
            - text: 
          - generic [ref=e113]:
            - generic [ref=e127]:
              - heading "LC Details" [level=2] [ref=e130]
              - generic "LC Details" [ref=e132]:
                - generic [ref=e140]:
                  - generic [ref=e141]: "50"
                  - radiogroup "Applicant Details" [ref=e142]:
                    - generic [ref=e145]: Applicant Details
                    - generic [ref=e147]:
                      - generic [ref=e148]:
                        - text: 
                        - radio "Existing customer" [checked] [disabled] [ref=e149]
                      - generic [ref=e152]: Existing customer
                  - generic [ref=e154]:
                    - combobox "Applicant Name" [ref=e155]:
                      - generic [ref=e156]:
                        - generic [ref=e159]: Applicant Name
                        - generic [ref=e160]: JZNNZI ZO AZNZM ULI KZKVI YLCVH ZMW
                      - generic [ref=e161]: 
                    - text: 
                  - generic [ref=e164]:
                    - generic [ref=e167]: Address
                    - generic [ref=e168]: Third Avenue
                    - generic [ref=e169]: Fort bay
                    - generic [ref=e170]: Den Forest
                    - generic [ref=e174]: Country
                    - generic [ref=e175]: UK
                  - generic [ref=e176]: 40A
                  - generic [ref=e177]:
                    - radiogroup "Type of Documentary Credit" [ref=e178]:
                      - generic [ref=e181]: Type of Documentary Credit
                      - generic [ref=e182]:
                        - generic [ref=e183]:
                          - generic [ref=e184]:
                            - text: 
                            - radio "Transferable" [ref=e185]
                          - generic [ref=e188]: Transferable
                        - generic [ref=e189]:
                          - generic [ref=e190]:
                            - text: 
                            - radio "Non Transferable" [checked] [ref=e191]
                          - generic [ref=e194]: Non Transferable
                    - radiogroup "LC Type" [ref=e196]:
                      - generic [ref=e199]: LC Type
                      - generic [ref=e200]:
                        - generic [ref=e201]:
                          - generic [ref=e202]:
                            - text: 
                            - radio "Sight" [checked] [ref=e203]
                          - generic [ref=e206]: Sight
                        - generic [ref=e207]:
                          - generic [ref=e208]:
                            - text: 
                            - radio "Usance" [ref=e209]
                          - generic [ref=e212]: Usance
                    - radiogroup "Revolving" [ref=e214]:
                      - generic [ref=e217]: Revolving
                      - generic [ref=e218]:
                        - generic [ref=e219]:
                          - generic [ref=e220]:
                            - text: 
                            - radio "Yes" [ref=e221]
                          - generic [ref=e224]: "Yes"
                        - generic [ref=e225]:
                          - generic [ref=e226]:
                            - text: 
                            - radio "No" [checked] [ref=e227]
                          - generic [ref=e230]: "No"
                    - generic [ref=e232]:
                      - combobox "Select Product" [active] [ref=e233]:
                        - generic [ref=e234]:
                          - generic [ref=e237]: Select Product
                          - generic [ref=e238]: ILC-SLC - Import Letter of Credit-SIGHT LETTER OF CREDIT
                        - generic [ref=e239]: 
                      - text: 
                  - generic [ref=e242]: 31D
                  - generic [ref=e243]:
                    - generic [ref=e246]:
                      - generic [ref=e247]:
                        - generic [ref=e248]:
                          - generic [ref=e251]: Date of Expiry
                          - combobox "Date of Expiry" [ref=e252]
                        - generic [ref=e253]:
                          - generic "Select Date." [ref=e254] [cursor=pointer]: 
                          - generic [ref=e255]: Press Key down or Key up for access to Calendar.
                      - generic [ref=e257]: Required
                    - generic [ref=e260]:
                      - generic [ref=e261]:
                        - generic [ref=e264]: Place of Expiry
                        - textbox "Place of Expiry" [ref=e265]:
                          - /placeholder: ""
                      - generic [ref=e267]: Required
                  - generic [ref=e268]: "59"
                  - radiogroup "Beneficiary Details" [ref=e269]:
                    - generic [ref=e272]: Beneficiary Details
                    - generic [ref=e273]:
                      - generic [ref=e274]:
                        - generic [ref=e275]:
                          - text: 
                          - radio "Existing" [checked] [ref=e276]
                        - generic [ref=e279]: Existing
                      - generic [ref=e280]:
                        - generic [ref=e281]:
                          - text: 
                          - radio "New" [ref=e282]
                        - generic [ref=e285]: New
                  - generic [ref=e287]:
                    - combobox "Beneficiary Name" [ref=e288]:
                      - generic [ref=e292]: Beneficiary Name
                      - generic [ref=e294]: 
                    - text: 
                    - generic [ref=e297]: Required
                  - generic [ref=e298]: 32B
                  - generic [ref=e300]:
                    - generic [ref=e301]:
                      - generic [ref=e303]:
                        - combobox "Currency" [ref=e304]:
                          - generic [ref=e305]:
                            - generic [ref=e308]: Currency
                            - generic [ref=e309]: KRW
                          - generic [ref=e310]: 
                        - text: 
                      - generic [ref=e313]:
                        - generic [ref=e314]:
                          - generic [ref=e317]: LC Amount
                          - textbox "LC Amount" [ref=e318]:
                            - /placeholder: ""
                        - generic [ref=e320]: Required
                    - generic [ref=e321]: Local Currency Equivalent 0
                  - generic [ref=e325]: LC Amount Tolerance
                  - generic [ref=e326]:
                    - generic [ref=e330]:
                      - generic [ref=e333]: Tolerance Under(%)
                      - textbox "Tolerance Under(%)" [ref=e334]:
                        - /placeholder: ""
                        - text: "0"
                    - generic [ref=e339]:
                      - generic [ref=e342]: Tolerance Above(%)
                      - textbox "Tolerance Above(%)" [ref=e343]:
                        - /placeholder: ""
                        - text: "0"
                  - generic [ref=e348]:
                    - generic [ref=e351]: Total Exposure
                    - textbox "Total Exposure" [ref=e353]
                  - generic [ref=e354]: 39C
                  - generic [ref=e356]:
                    - generic [ref=e359]: Additional Amount Covered
                    - textbox "Additional Amount Covered" [ref=e360]:
                      - /placeholder: ""
                  - generic [ref=e363]:
                    - generic [ref=e366]: Customer Reference Number
                    - textbox "Customer Reference Number" [ref=e367]:
                      - /placeholder: ""
                  - generic [ref=e369]: 41A
                  - generic [ref=e370]:
                    - combobox "Credit Available By" [ref=e371]:
                      - generic [ref=e372]:
                        - generic [ref=e375]: Credit Available By
                        - generic [ref=e376]: Negotiation
                      - generic [ref=e377]: 
                    - text: 
                  - generic [ref=e380]: 42P
                  - generic [ref=e383]: Negotiation/Deferred Payment Details
                  - textbox "Payment Details" [ref=e386]:
                    - /placeholder: ""
                  - radiogroup "Credit Available With" [ref=e388]:
                    - generic [ref=e391]: Credit Available With
                    - generic [ref=e392]:
                      - generic [ref=e393]:
                        - generic [ref=e394]:
                          - text: 
                          - radio "SWIFT Code" [checked] [ref=e395]
                        - generic [ref=e398]: SWIFT Code
                      - generic [ref=e399]:
                        - generic [ref=e400]:
                          - text: 
                          - radio "Bank Address" [ref=e401]
                        - generic [ref=e404]: Bank Address
                  - generic [ref=e406]:
                    - generic [ref=e408]:
                      - generic [ref=e410]:
                        - generic [ref=e412]:
                          - img "Required" [ref=e414]: "*"
                          - generic [ref=e415]: SWIFT Code
                        - textbox "SWIFT Code" [ref=e416]:
                          - /placeholder: ""
                      - link "Lookup SWIFT Code" [ref=e418] [cursor=pointer]:
                        - /url: "#"
                    - button "Verify" [ref=e421] [cursor=pointer]:
                      - generic [ref=e423]: Verify
                  - generic [ref=e424]: 42C
                  - generic [ref=e427]:
                    - generic [ref=e430]: Tenor
                    - textbox "Tenor" [ref=e431]:
                      - /placeholder: ""
                  - generic [ref=e434]:
                    - generic [ref=e437]: Credit Days From
                    - textbox "Credit Days From" [ref=e438]:
                      - /placeholder: ""
                  - generic [ref=e440]: 42A
                  - radiogroup "Drawee Bank" [ref=e441]:
                    - generic [ref=e444]: Drawee Bank
                    - generic [ref=e445]:
                      - generic [ref=e446]:
                        - generic [ref=e447]:
                          - text: 
                          - radio "SWIFT Code" [checked] [ref=e448]
                        - generic [ref=e451]: SWIFT Code
                      - generic [ref=e452]:
                        - generic [ref=e453]:
                          - text: 
                          - radio "Name and Address" [ref=e454]
                        - generic [ref=e457]: Name and Address
                  - generic [ref=e459]:
                    - generic [ref=e461]:
                      - generic [ref=e463]:
                        - generic [ref=e466]: SWIFT Code
                        - textbox "Drawee Swift Code" [ref=e467]:
                          - /placeholder: ""
                      - link "Lookup SWIFT Code" [ref=e469] [cursor=pointer]:
                        - /url: "#"
                    - button "Verify" [ref=e472] [cursor=pointer]:
                      - generic [ref=e474]: Verify
            - generic [ref=e475]:
              - button "Next" [ref=e477] [cursor=pointer]:
                - generic [ref=e479]: Next
              - button "Save As Draft" [ref=e481] [cursor=pointer]:
                - generic [ref=e483]: Save As Draft
              - button "Cancel" [ref=e485] [cursor=pointer]:
                - generic [ref=e487]: Cancel
      - contentinfo:
        - generic:
          - generic:
            - log
  - text:    兩                              
```

# Test source

```ts
  660 | /** Common Tab-1 setup — login is handled by the loggedInDashboard fixture. */
  661 | async function openTab1(loggedIn: DashboardPage, flow: ImportLcFlowPage): Promise<void> {
  662 |   await loggedIn.navigateToInitiateImportLC();
  663 |   await flow.assertOnLcNavPage();
  664 |   await flow.clickCreateLC();
  665 |   await flow.selectProduct(LC_TEST_DATA.product);
  666 | }
  667 | 
  668 | test.describe('Tab 1 — LC Details (TC-IMPLC-001…015)', () => {
  669 |   test.describe.configure({ mode: 'serial' });
  670 | 
  671 |   test(
  672 |     'TC-IMPLC-001: Existing Customer applicant — Address & Country auto-populate',
  673 |     { tag: ['@positive', '@P1', '@regression', '@tab1'] },
  674 |     async ({ loggedInDashboard, importLcFlowPage }) => {
  675 |       await openTab1(loggedInDashboard, importLcFlowPage);
  676 |       await importLcFlowPage.selectApplicantType('Existing Customer');
  677 |       await importLcFlowPage.selectApplicant();      // first mapped party
  678 |       await importLcFlowPage.assertApplicantAddressReadOnly();
  679 |       await importLcFlowPage.assertApplicantCountryReadOnly();
  680 |     }
  681 |   );
  682 | 
  683 |   test(
  684 |     'TC-IMPLC-002: SG entity — "Non-customer" radio is absent',
  685 |     { tag: ['@customization', '@P1', '@regression', '@tab1', '@sg-only'] },
  686 |     async ({ loggedInDashboardSg, importLcFlowPage, page }) => {
  687 |       await loggedInDashboardSg.navigateToInitiateImportLC();
  688 |       await importLcFlowPage.assertOnLcNavPage();
  689 |       await importLcFlowPage.clickCreateLC();
  690 | 
  691 |       // SG customisation — Applicant Details radio should expose only
  692 |       // "Existing Customer"; the "Non-Customer" option is removed.
  693 |       const applicantGroup = page.getByRole('radiogroup', { name: 'Applicant Details' });
  694 |       await applicantGroup.waitFor({ state: 'visible', timeout: 15000 });
  695 |       const nonCustomer = applicantGroup.getByRole('radio', { name: /^Non[\s-]?Customer$/i });
  696 |       expect(await nonCustomer.count(), 'Non-Customer radio must not render on SG entity').toBe(0);
  697 |     }
  698 |   );
  699 | 
  700 |   test(
  701 |     'TC-IMPLC-003: Non-customer applicant — manual entry proceeds to next tab',
  702 |     { tag: ['@positive', '@P1', '@regression', '@tab1'] },
  703 |     async ({ loggedInDashboard, importLcFlowPage, page }) => {
  704 |       await openTab1(loggedInDashboard, importLcFlowPage);
  705 | 
  706 |       // Some OBDX entities (e.g. SG) remove the Non-Customer radio entirely.
  707 |       // If it isn't rendered, the test is not applicable here — skip cleanly.
  708 |       const nonCustomerRadio = page.getByRole('radiogroup', { name: 'Applicant Details' })
  709 |         .getByRole('radio', { name: /^Non-customer$/i });
  710 |       test.skip(
  711 |         await nonCustomerRadio.count() === 0,
  712 |         'Non-Customer radio not present in this OBDX build (likely SG-style entity); covered by TC-IMPLC-002.',
  713 |       );
  714 | 
  715 |       await importLcFlowPage.selectApplicantType('Non-customer');
  716 |       await importLcFlowPage.fillNonCustomerApplicant({
  717 |         name:    'Test Manual Applicant',
  718 |         address: '123 Demo Street, Demo City',
  719 |         country: 'United States',
  720 |       });
  721 |       await importLcFlowPage.fillDateOfExpiry(LC_TEST_DATA.dateOfExpiry);
  722 |       await importLcFlowPage.fillPlaceOfExpiry(LC_TEST_DATA.placeOfExpiry);
  723 |       await importLcFlowPage.selectExistingBeneficiary(LC_TEST_DATA.beneficiaryName);
  724 |       await importLcFlowPage.selectCurrency(LC_TEST_DATA.lcCurrency);
  725 |       await importLcFlowPage.fillLcAmount(LC_TEST_DATA.lcAmount);
  726 |       await importLcFlowPage.fillCustomerReference(LC_TEST_DATA.customerReference);
  727 |       await importLcFlowPage.fillSwiftAndVerify(LC_TEST_DATA.swiftCode);
  728 |       await importLcFlowPage.clickNext();
  729 |       // Successful click → Tab 2 reached. No further assert needed; if Next
  730 |       // had been blocked we'd have hit a timeout in clickNext.
  731 |     }
  732 |   );
  733 | 
  734 |   test(
  735 |     'TC-IMPLC-004: SG entity — Field 40A LOV exact set + mandatory',
  736 |     { tag: ['@customization', '@P1', '@regression', '@tab1', '@sg-only'] },
  737 |     async ({ loggedInDashboardSg, importLcFlowPage, page }) => {
  738 |       await loggedInDashboardSg.navigateToInitiateImportLC();
  739 |       await importLcFlowPage.assertOnLcNavPage();
  740 |       await importLcFlowPage.clickCreateLC();
  741 |       await importLcFlowPage.selectProduct(LC_TEST_DATA.sgProduct);
  742 | 
  743 |       // Per SG customisation C-9.5, 40A must render as a LOV. If the live build
  744 |       // ships the radio variant instead, that IS a customisation defect — fail
  745 |       // the test with a clear message rather than skipping. Detection: a
  746 |       // `oj-select-one` with a "Type of Documentary Credit" / "40A" label.
  747 |       const field40ALov = page.locator(
  748 |         'oj-select-one[label-hint*="Type of Documentary Credit" i], ' +
  749 |         'oj-select-one[aria-label*="Type of Documentary Credit" i], ' +
  750 |         'oj-select-one[id*="TypeOfDocumentary" i], ' +
  751 |         'oj-select-one[id*="DocumentaryCredit" i]',
  752 |       ).first();
  753 | 
  754 |       const lovCount = await field40ALov.count();
  755 |       expect(
  756 |         lovCount,
  757 |         'SG customisation C-9.5: 40A must render as a LOV on the SG entity. ' +
  758 |         'Live build (corpmaker3 + ILC-SLC, 2026-05-22) renders it as a radio ' +
  759 |         'group [Transferable, Non Transferable] instead — customisation defect.',
> 760 |       ).toBeGreaterThan(0);
      |         ^ Error: SG customisation C-9.5: 40A must render as a LOV on the SG entity. Live build (corpmaker3 + ILC-SLC, 2026-05-22) renders it as a radio group [Transferable, Non Transferable] instead — customisation defect.
  761 | 
  762 |       // Once the LOV exists, open it and assert the four IRREVOCABLE variants.
  763 |       await field40ALov.click();
  764 |       const optionList = page.locator('.oj-listbox-result-label, li[role="option"]');
  765 |       await optionList.first().waitFor({ state: 'visible', timeout: 10000 });
  766 |       const labels = (await optionList.allInnerTexts()).map(s => s.trim().toUpperCase()).filter(Boolean);
  767 |       for (const expected of [
  768 |         'IRREVOCABLE',
  769 |         'IRREVOCABLE TRANSFERABLE',
  770 |         'IRREVOCABLE STANDBY',
  771 |         'IRREVOC TRANS STANDBY',
  772 |       ]) {
  773 |         expect(labels, `40A LOV must include "${expected}". Saw: ${labels.join(' | ')}`).toContain(expected);
  774 |       }
  775 |     }
  776 |   );
  777 | 
  778 |   test(
  779 |     'TC-IMPLC-005: UAE — Field 40A renders as Transferable / Non-transferable radio',
  780 |     { tag: ['@positive', '@P2', '@regression', '@tab1'] },
  781 |     async ({ loggedInDashboard, importLcFlowPage }) => {
  782 |       await openTab1(loggedInDashboard, importLcFlowPage);
  783 |       const labels = (await importLcFlowPage.getField40ARadioOptions())
  784 |         .map(s => s.trim())
  785 |         .filter(Boolean);
  786 |       // Allow "Transferable" / "Transferrable" spellings AND
  787 |       // "Non Transferable" (live DOM) / "Non-Transferable" / "NonTransferable" variants.
  788 |       const hasTransferable    = labels.some(l => /^Transfer{1,2}able$/i.test(l));
  789 |       const hasNonTransferable = labels.some(l => /^Non[\s-]?Transfer{1,2}able$/i.test(l));
  790 |       expect(hasTransferable,    `40A options seen: ${labels.join('|')}`).toBe(true);
  791 |       expect(hasNonTransferable, `40A options seen: ${labels.join('|')}`).toBe(true);
  792 |     }
  793 |   );
  794 | 
  795 |   test.fixme(
  796 |     'TC-IMPLC-006: Limits LOV + View Limit Details overlay + Reset clears selection',
  797 |     { tag: ['@positive', '@P1', '@regression', '@tab1'] },
  798 |     async () => {
  799 |       // PENDING: Limits LOV + View Limit Details overlay + Reset are confirmed absent in the
  800 |       //          AE/corpmaker2 build per 2026-05-21 rescrape (no widget present).
  801 |       // Unblock: Run the test on an entity/user that has Limits-management entitlement (likely
  802 |       //          a different corporate party). Re-scrape Tab 1 in that session to capture the
  803 |       //          LOV + overlay + Reset locators.
  804 |     }
  805 |   );
  806 | 
  807 |   test.fixme(
  808 |     'TC-IMPLC-007: Revolving by Time — Auto Reinstatement + Cumulative + Repeat Frequency',
  809 |     { tag: ['@positive', '@P1', '@regression', '@tab1'] },
  810 |     async ({ loggedInDashboard, importLcFlowPage }) => {
  811 |       // PENDING: Revolving sub-fields not rendered on Sight product (ILC-INL) — same blocker
  812 |       //          as TC-BS-038.
  813 |       // Unblock: Provide a Revolving-capable product entitlement, then exercise setRevolving +
  814 |       //          verify Auto Reinstatement + Cumulative + Repeat Frequency dependents.
  815 |     }
  816 |   );
  817 | 
  818 |   test.fixme(
  819 |     'TC-IMPLC-008: Revolving by Value — no further sub-fields required',
  820 |     { tag: ['@positive', '@P2', '@regression', '@tab1'] },
  821 |     async ({ loggedInDashboard, importLcFlowPage }) => {
  822 |       // PENDING: Revolving by Value path requires both a Revolving-capable product
  823 |       //          AND POM extension (current setRevolving only handles the by-Time path).
  824 |       // Unblock: After product entitlement is sorted (TC-IMPLC-007), extend setRevolving
  825 |       //          to handle the Value sub-path and re-author this test.
  826 |       await openTab1(loggedInDashboard, importLcFlowPage);
  827 |       await importLcFlowPage.fillLcDetails({
  828 |         product:           LC_TEST_DATA.product,
  829 |         dateOfExpiry:      LC_TEST_DATA.dateOfExpiry,
  830 |         placeOfExpiry:     LC_TEST_DATA.placeOfExpiry,
  831 |         beneficiaryName:   LC_TEST_DATA.beneficiaryName,
  832 |         lcCurrency:        LC_TEST_DATA.lcCurrency,
  833 |         lcAmount:          LC_TEST_DATA.lcAmount,
  834 |         customerReference: LC_TEST_DATA.customerReference,
  835 |         swiftCode:         LC_TEST_DATA.swiftCode,
  836 |         revolving:         { type: 'Monthly', cycles: 1 },
  837 |       });
  838 |     }
  839 |   );
  840 | 
  841 |   test(
  842 |     'TC-IMPLC-009: Product selection + future expiry + Place of Expiry persist',
  843 |     { tag: ['@positive', '@P1', '@regression', '@tab1'] },
  844 |     async ({ loggedInDashboard, importLcFlowPage }) => {
  845 |       await openTab1(loggedInDashboard, importLcFlowPage);
  846 |       await importLcFlowPage.fillDateOfExpiry(LC_TEST_DATA.dateOfExpiry);
  847 |       await importLcFlowPage.fillPlaceOfExpiry(LC_TEST_DATA.placeOfExpiry);
  848 |       await importLcFlowPage.selectExistingBeneficiary(LC_TEST_DATA.beneficiaryName);
  849 |       await importLcFlowPage.selectCurrency(LC_TEST_DATA.lcCurrency);
  850 |       await importLcFlowPage.fillLcAmount(LC_TEST_DATA.lcAmount);
  851 |       await importLcFlowPage.fillCustomerReference(LC_TEST_DATA.customerReference);
  852 |       await importLcFlowPage.fillSwiftAndVerify(LC_TEST_DATA.swiftCode);
  853 |       await importLcFlowPage.clickNext();
  854 |     }
  855 |   );
  856 | 
  857 |   test(
  858 |     'TC-IMPLC-010: Existing beneficiary auto-populates Address & Country (read-only)',
  859 |     { tag: ['@positive', '@P1', '@regression', '@tab1'] },
  860 |     async ({ loggedInDashboard, importLcFlowPage }) => {
```