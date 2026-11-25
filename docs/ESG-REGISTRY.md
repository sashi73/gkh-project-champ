# ESG & Sustainability module: registry and record

The record of how the ESG & Sustainability module is designed, what it is based on, and how it changes from one iteration to the next.
Update this file with every change to the module: the iteration log at the bottom, and the sections it affects.

## 1. What it is

One menu item, **🌿 ESG & Sustainability**, in its own section of the left menu (under Projects), open to every signed-in user.
It is a **reporting framework**. Each *reporting entity* is one organisation for one reporting year.
The section menu works like a project's, in six groups:

| Group | Tabs |
|---|---|
| Setup | Overview · Organisation · Standards · Materiality |
| Environment | Scope 1 & 2 · Scope 3 · Energy, water & waste · Climate risk |
| Social | Workforce & safety · Human rights · Community |
| Governance | Board · Ethics & risk · Certifications |
| Carbon avoidance | Avoided emissions · Carbon credits |
| Reporting | Statement · ESG report · Records |

There are two documents, both made in the same designed format as the project charter and plan (the document studio, PDF and Word):

- **Sustainability Statement**: under 10 pages. The AI writes 2 parts (budget `AI_ESG_STATEMENT_TOKENS`, default 28,000). If the PDF runs over 10 pages, the layout steps down: charts first, then the long tables.
- **ESG Report**: about 60 pages in 6 parts plus appendices. The AI writes 7 parts at once (budget `AI_ESG_MAX_TOKENS`, default and maximum 100,000).

The AI is the console's own DeepSeek (`LLM_API_KEY`). There are no API keys in the browser.

### 🌱 CSO view (Management & leadership)

The **🌱 CSO view** sits in the menu's leadership group, under the CEO view. It is the Chief Sustainability Officer's page across every ESG report:
- group footprint (Scope 1, 2 and 3), average ESG score, report readiness, avoided emissions;
- emissions by organisation, readiness by standard;
- *Needs attention*: fatalities, no reduction target, low readiness, no document written, no assurance, intensity above the sector;
- the reporting calendar for the standards in use (`CALENDAR` in `esg.mjs`, checked November 2026);
- a table of every report;
- ✨ Brief me, which asks Champ for a CSO briefing.

Data: action `esgCso` (`cso()` in `esg.mjs`).

## 2. Where it lives

| File | What |
|---|---|
| `netlify/lib/esg.mjs` | Data schema, standards catalogue, disclosure index, factor sets, scoring, avoided emissions, storage, AI writers |
| `netlify/functions/admin.mjs` | Actions `esgSchema`, `esgList`, `esgGet`, `esgCreate`, `esgSample`, `esgSave`, `esgDelete`, `esgAiStatus`; ESG facts for Ask Champ (`guideAsk`) |
| `netlify/functions/planai-background.mjs` | Background AI modes `esgDoc` (statement or report narrative) and `esgInsight` (pillar recommendations) |
| `netlify/lib/users.mjs` | Access: `esg*` actions and modes are open to every signed-in user |
| `admin/admin-esg.js` | The page: list, tabs, forms, results, overview, standards, materiality, avoidance, records, the two documents |
| `admin/champ.css` | Styles (`.esg-*`, `.ptg-e*`) |
| `assets/help/articles.js` | Help article `esg` (also used by Champ) |

Storage (key-value):
- `esg-index`: the list of entities.
- `esg:<id>`: an entity, holding `org`, the E/S/G sections, `std`, `mat`, `avoid`, `credits`, `insights`, `docs` (document history), `log` (change log, last 200) and `rev`.
- `esgdoc:<id>:statement|report`: the last narrative written.

## 3. Where it came from

The module started from three stand-alone GKH tools, brought up to date:

- *GKH Carbon Intelligence Suite* (Environment): Scope 1, 2 and 3 calculator, factor standards, sector benchmark with stars.
- *GKH Social Intelligence*: workforce, safety, age profile, child labour, Indigenous inclusion, SASB alignment.
- *GKH Governance Intelligence*: board, ethics, ISO 45001, 27001 and 9001, GRC, GRI 2 index, maturity radar.

Changes from the originals:

- The OpenAI key fields and EmailJS keys were removed. The AI is the console's DeepSeek, and documents are downloaded as PDF or Word.
- One data model per organisation and year, saved on the server with a change log, instead of three separate pages.
- Women in management is now measured against everyone in management, not the whole workforce.
- Factor sets are by country and are editable per entity. They are shown as indicative defaults.
- Sector comparison now uses emissions intensity (tCO2e of Scope 1 and 2 per million of revenue), not absolute tonnes.
- New in this module: Scope 2 market-based; Scope 3 categories 1, 4, 5, 6 and 7 plus water; energy, water and waste; climate risk and targets; double materiality; a standards catalogue with a disclosure index; carbon avoidance and carbon credits; the two documents; Ask Champ.

## 4. Standards (status checked November 2026)

| Id | Standard | Note |
|---|---|---|
| AASB_S2 | AASB S2 Climate-related Disclosures | Mandatory under the Corporations Act. Group 1 from years beginning 1 Jan 2025, Group 2 from 1 Jul 2026, Group 3 from 1 Jul 2027. Amended Dec 2025 (GHG). |
| AASB_S1 | AASB S1 | Voluntary. |
| IFRS_S1, IFRS_S2 | ISSB standards | Only S1 and S2 are issued. **There is no IFRS S3 yet.** Nature-related disclosures are at exposure draft as a proposed IFRS Practice Statement. Add it when issued. |
| ESRS | ESRS / CSRD | Revised and simplified ESRS adopted July 2026 for 2027 statements. Omnibus I (Directive 2026/470) moved wave 2 to FY2027. |
| GRI | GRI Universal 2021 and Topic Standards | |
| TCFD | TCFD | Superseded by IFRS S2. Kept for organisations that still refer to it. |
| SASB | SASB | Industry metrics, maintained by the ISSB. |
| CDP | CDP climate, water and forests | |
| BURSA | Bursa Malaysia and the NSRF | Common indicators C1 to C11. ISSB applies to Group 1 from 2025, Group 2 from 2026 and Group 3 from 2027. |
| GHGP, ISO14064 | Methods | |
| NGER | Australia | |
| SGX | Singapore | |
| NZCS | New Zealand | |
| TNFD | Nature | |
| SDG | UN SDGs | |

The disclosure index (`DISC` in `esg.mjs`) maps each disclosure to the fields that answer it:
- **Reported** when all of those fields have data.
- **Partly** when some do.
- **Not yet** when none do.

The index has 82 entries. Extend it as standards change.

## 5. Scoring method: `GKH ESG method v1 (2026-11)`

Each pillar is scored out of 100. The overall ESG score is their average.

- **Environment**:
  - Measured, 37 points: Scope 1, Scope 2, up to 5 Scope 3 categories, factor set, base year.
  - Managed, 16 points: water, waste, ISO 14001, no fines.
  - Performing, 22 points: intensity against the sector, renewable share.
  - Climate, 25 points: target, net zero, SBTi, scenario analysis, transition plan, board oversight.
- **Social**:
  - Core, 75 points: diversity (with women in management measured against management), safety training, LTIFR, policies (human rights, anti-discrimination, whistleblowing, psychosocial, child labour, modern slavery, living wage), no under-18 workers, Indigenous peoples, training, pay gap. Fatalities and injuries take points off.
  - Enhancement, 25 points: DEI, parental leave, wellbeing, community investment, supplier audits, local spend, under-represented hires, grievance mechanism.
- **Governance**:
  - Core, 75 points: board diversity and independence, chair and CEO separate, code, whistleblowing, anti-corruption, ERM, internal audit, cyber oversight, sustainability committee and an independent director on it, tax, no corruption incidents, anti-corruption training.
  - Enhancement, 25 points: ISO 45001, 27001 and 9001, GRC, privacy, political contributions, executive ESG pay, board training, report published.
- **GRI 2 alignment index**: as in the original Governance tool.
- **Report readiness**: the average disclosure coverage of the chosen standards.

The scores are a management guide, not a rating agency score. Change `METHOD` whenever the rules change.

## 6. Emission factors

Each factor set is a set of **indicative defaults**:
- NGA (AU)
- Malaysia (Energy Commission, Peninsular grid)
- Singapore (EMA)
- Thailand (TGO)
- UK (DESNZ)
- US (EPA and eGRID)
- NZ (MfE)
- EU average
- IPCC

Choosing a set fills the factors, and any factor can be overwritten. Refrigerants use the GWP entered (default R-410A, AR5 = 1,924). Scope 3 uses spend-based and activity-based defaults (`S3_DEFAULTS`).

Before publishing, check every factor against the current official release. Then record the release here when the defaults change.

### Emission factor library (`netlify/lib/esg-factors.mjs`, action `esgFactors`)

The library holds 156 factors from 13 sources, covering 58 countries and regions. It opens from the *Factor library* sub-tab on Scope 1 & 2 and Scope 3, or from 🔎 next to any factor field (filtered to that field and the report's country).

**Search and filters:** free text, country, kind, source or standard, and field.

**Using a factor:** *Use* fills the field and records the source in `entity.efsrc` (factor id, label with edition, value). The report prints an *Emission factors used* table. Typing your own value records *Entered by you*; choosing a factor set records *Factor set: …*.

**What it contains:**

- **Grid electricity**
  - Australia: NGA / NGER state factors for 2025-26 and 2024-25.
  - Malaysia: Energy Commission grid emission factors for Peninsular, Sabah and Sarawak, 2024 and 2023 (provisional).
  - UK: DESNZ 2024.
  - Singapore: EMA. Thailand: TGO. US: EPA eGRID. New Zealand: MfE.
  - IEA 2025 national averages for 57 countries, as published by ABB. These are CO2 only and per kWh generated; use them only where there is no national factor.
- **Fuels:** NGA, DESNZ, EPA, MfE, TGO and the IPCC 2006 defaults.
- **Gases:** global warming potentials (AR4, AR5 and AR6) for common refrigerants, SF6, methane and N2O.
- **Scope 3:** GKH indicative defaults.

When a source publishes a new edition, add it as new rows (keep the old edition for earlier years) and log it below.

## 7. Carbon avoidance

This follows the WBCSD *Guidance on Avoided Emissions* (2023) and the GHG Protocol.

- **Avoided emissions** = quantity × (baseline factor − solution factor) × attribution share.
- They are reported beside Scope 1, 2 and 3 and are **never netted** against them.
- Each item has a status (Planned, Under way, Delivered) and a verification level (Estimate, Internal review, Third-party verified).
- **Carbon credits retired** are kept in a separate register (avoidance or removal; registry; vintage). Gross emissions are always reported first.

## 7a. Carbon pricing, CBAM and the carbon credit framework

The **Pricing & CBAM** tab has three sub-tabs.

- **Border adjustments (CBAM)**: lines for EU and UK CBAM goods (tonnes, specific embedded emissions, CBAM benchmark, carbon price paid at origin; default or actual data).
  - EU estimate = (embedded − tonnes × benchmark × the free allocation still given) × (certificate price − price paid at origin).
  - The EU CBAM factor runs 2.5% (2026), 5%, 10%, 22.5%, 48.5% (2030), 61%, 73.5%, 86%, 100% (2034), from Directive 2003/87/EC Art 10a(1a).
  - UK estimate = embodied direct emissions × UK CBAM rate.
  - Prices are the user's own assumptions.
- **Carbon prices & taxes**: facilities under a carbon tax or ETS.
  - Cost = (covered − baseline) × price × (1 − share met with credits).
  - The internal carbon price (Climate risk tab) gives a shadow cost on Scope 1 and 2.
- **Frameworks**: the `CARBON_SCHEMES` catalogue, ticked per entity. It has four kinds:
  - Border adjustments: EU CBAM, UK CBAM.
  - Carbon prices: EU ETS, UK ETS, Australia Safeguard (ACCUs and SMCs), Singapore carbon tax and ICCs, Malaysia carbon tax and the National Carbon Market Policy, Japan GX-ETS, China ETS, CORSIA.
  - Crediting: Article 6.2, Article 6.4 PACM, ACCU Scheme, Verra and Gold Standard.
  - Integrity: ICVCM CCP, VCMI, SBTi Net-Zero V2, ISO 14068-1.

The carbon credits register records the standard, ICVCM CCP label, corresponding adjustment and use. The integrity checks flag:
- no CCP label;
- no corresponding adjustment for compliance or neutralisation;
- avoidance credits used to neutralise;
- a vintage more than five years old;
- no registry.

Status as checked in November 2026:

| Scheme | Status |
|---|---|
| EU CBAM | Definitive since 1 Jan 2026. 50 t threshold. Certificate sales from 1 Feb 2027. First declaration and surrender 30 Sep 2027. |
| UK CBAM | From 1 Jan 2027. No electricity or indirect emissions at the start. First return 31 May 2028. |
| Singapore carbon tax | S$45 in 2026-27. Eligible ICCs up to 5%. 2025 quota carried forward. |
| Malaysia carbon tax | Deferred October 2026. National Carbon Market Policy launched April 2026. |
| Japan GX-ETS | Mandatory from April 2026. J-Credits and JCM up to 10%. |
| Australia Safeguard | Baselines decline 4.9% a year to 2030. 2026-27 review under way. |
| Article 6.4 | First credits approved Feb 2026. |
| SBTi Corporate Net-Zero Standard V2.0 | Published June 2026. |

The report has a chapter, *Carbon pricing, CBAM and carbon credits* (AI key `carbon_pricing`). The CSO view shows the CBAM exposure and flags weak credits.

## 7b. Getting data in

- **Electricity bills (Scope 2 evidence)**: in Scope 1 & 2 › Electricity bills, upload PDF bills (several at once).
  - The text is read in the browser (pdf.js) and the AI (background mode `esgBill`) extracts each account or meter: supplier, site, meter or NMI, period, kWh, renewable kWh and the amount.
  - Every line can be checked and edited; *Use the bills' total for Scope 2* sets the electricity and renewable MWh.
  - The extracted figures and the file name are kept in `entity.bills`; the PDFs themselves are not stored, so keep the original bills for assurance. Costs are totalled per currency. The AI says the bills support Scope 2 only when they reconcile with the reported electricity (within 5%).
  - Scanned image bills need a text PDF (no OCR yet).
- **Spreadsheets from other systems**: 📥 Import, on the report header and on every data tab, reads a CSV or Excel (.xlsx) file and matches it to the fields in three ways:
  - by the template's field ids (*⬇ Template* exports every field with its current value);
  - by a field label in the first column (long sheets) or the header row (wide sheets);
  - or ✨ by Champ (background mode `esgMap`), with unit factors and monthly sums.

  The user ticks the values to import; the change log records the file name.

## 8. The AI

- The system prompt (`BASE`) asks for a senior ESG reporting adviser who must not invent numbers, people, awards or certifications, and who writes balanced text that says what is not yet in place.
- The facts the AI receives (`facts()`): organisation, chosen standards, all data entered, computed results, gaps, coverage, avoided emissions, material topics, earlier recommendations.
- **Statement**: 2 parts (`STATEMENT`). **Report**: 7 parts (`REPORT`): A introduction and strategy, B governance, C climate, D environment and avoided emissions, E social, F performance and roadmap, G standards.
- Every document written is recorded with its version, author, tokens and standards in `entity.docs`.

## 9. Iteration log

| Version | Date | Change |
|---|---|---|
| v1 | 2026-11-25 | First draft. One menu item; Setup, E, S, G, Carbon avoidance and Reporting tabs; 17 standards with an 82-entry disclosure index; scoring method v1; Sustainability Statement (under 10 pages) and ESG Report (about 60 pages, up to 100k tokens) in the charter and plan format; Champ answers ESG questions; Records (registry, documents, change log); 🌱 CSO view in Management & leadership. |
| v1.1 | 2026-11-25 | Carbon pricing, CBAM (EU and UK) and the carbon credit framework (Pricing & CBAM tab with sub-tabs; credit integrity checks; report chapter; CSO exposure). Long registers became compact lists that open one item at a time. |
| v1.2 | 2026-11-25 | Own menu section "ESG & Sustainability"; electricity bills read by AI for Scope 2; CSV and Excel import (template, by name, or matched by Champ); data tabs split into sub-tabs (data, bills, factors). |
| v1.3 | 2026-11-25 | Emission factor library (156 factors, 58 countries and regions, 13 sources), searchable by country, kind, source and field; 🔎 on each factor; source recorded per factor and printed in the report. |

## 10. Next iterations (backlog)

- Year-on-year: link an entity to the previous year's for trends and restatements.
- Import data from Project Champ projects (energy, travel, waste on sites); connectors to energy retailers' portals and accounting systems; OCR for scanned bills.
- Evidence: attach source documents (bills, invoices, certificates) to each data point, for assurance.
- Per-standard templates: a Bursa Malaysia sustainability statement layout with the performance data table, an ESRS sustainability statement structure, and the CDP questionnaire export.
- Sign-off workflow: draft, review, board approval, publish.
- More Scope 3 categories (2, 3, 9, 11, 12, 15) and location-specific grid factors by state.
- Role-based access when the module leaves its open-to-everyone first draft.
