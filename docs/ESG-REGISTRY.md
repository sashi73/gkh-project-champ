# ESG & Sustainability module: registry and record

The record of how the ESG & Sustainability module is designed, what it is based on, and how it changes from one iteration to the next.
Update this file with every change to the module: the iteration log at the bottom, and the sections it affects.

## 1. What it is

One menu item, **🌿 ESG & Sustainability** (left menu, under Reports), open to every signed-in user.
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

## 7. Carbon avoidance

This follows the WBCSD *Guidance on Avoided Emissions* (2023) and the GHG Protocol.

- **Avoided emissions** = quantity × (baseline factor − solution factor) × attribution share.
- They are reported beside Scope 1, 2 and 3 and are **never netted** against them.
- Each item has a status (Planned, Under way, Delivered) and a verification level (Estimate, Internal review, Third-party verified).
- **Carbon credits retired** are kept in a separate register (avoidance or removal; registry; vintage). Gross emissions are always reported first.

## 8. The AI

- The system prompt (`BASE`) asks for a senior ESG reporting adviser who must not invent numbers, people, awards or certifications, and who writes balanced text that says what is not yet in place.
- The facts the AI receives (`facts()`): organisation, chosen standards, all data entered, computed results, gaps, coverage, avoided emissions, material topics, earlier recommendations.
- **Statement**: 2 parts (`STATEMENT`). **Report**: 7 parts (`REPORT`): A introduction and strategy, B governance, C climate, D environment and avoided emissions, E social, F performance and roadmap, G standards.
- Every document written is recorded with its version, author, tokens and standards in `entity.docs`.

## 9. Iteration log

| Version | Date | Change |
|---|---|---|
| v1 | 2026-11-25 | First draft. One menu item; Setup, E, S, G, Carbon avoidance and Reporting tabs; 17 standards with an 82-entry disclosure index; scoring method v1; Sustainability Statement (under 10 pages) and ESG Report (about 60 pages, up to 100k tokens) in the charter and plan format; Champ answers ESG questions; Records (registry, documents, change log); 🌱 CSO view in Management & leadership. |

## 10. Next iterations (backlog)

- Year-on-year: link an entity to the previous year's for trends and restatements.
- Import data from Project Champ projects (energy, travel, waste on sites) and from spreadsheets.
- Evidence: attach source documents (bills, invoices, certificates) to each data point, for assurance.
- Per-standard templates: a Bursa Malaysia sustainability statement layout with the performance data table, an ESRS sustainability statement structure, and the CDP questionnaire export.
- Sign-off workflow: draft, review, board approval, publish.
- More Scope 3 categories (2, 3, 9, 11, 12, 15) and location-specific grid factors by state.
- Role-based access when the module leaves its open-to-everyone first draft.
