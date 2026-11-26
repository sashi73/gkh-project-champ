// GKH Project Champ: 🌿 ESG & Sustainability reporting (one menu item: Environment · Social · Governance · Reporting).
// A reporting entity is one organisation for one reporting year. Its data is entered in the E, S and G tabs, scored here,
// mapped to the reporting standards it chooses (AASB S1/S2, IFRS S1/S2, ESRS/CSRD, GRI, TCFD, SASB, CDP, Bursa Malaysia and more),
// and written up by the AI (DeepSeek, the console's own AI) as a Sustainability Statement (under 10 pages) or a full ESG Report (about 60 pages).
// The browser lays the documents out in the same designed format as the project charter and plan (admin-studio.js).
//   esg-index           { ents: { id: summary } }
//   esg:<id>            the entity: { id, rev, org, std, mat, env, soc, gov, insights, docs, log }
//   esgdoc:<id>:<kind>  the last narrative written: { at, by, kind, ver, lang, tokens, cap, sections }   kind: statement | report
// The design, the scoring rules, the standards list and the iteration log are kept in docs/ESG-REGISTRY.md.
import * as kv from './kv.mjs';
import { EF_LIBRARY } from './esg-factors.mjs';
import { llmJson, usage, checkLimit, llmSetup } from './ai.mjs';

export const METHOD = 'GKH ESG method v1 (2026-11)';   // bump when the scoring or the factor defaults change (see docs/ESG-REGISTRY.md)
const str = (s, max = 400) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const num = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[, ]/g, '')); return Number.isFinite(n) ? n : null; };
const arr = (a, n) => (Array.isArray(a) ? a : []).slice(0, n);
const r2 = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const uid = () => 'E' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

/* ---------------- 📚 reporting standards ---------------- */
// status and dates as checked in November 2026; kept up to date in docs/ESG-REGISTRY.md
export const STD_GROUPS = ['Global baseline (ISSB)', 'Jurisdictions', 'Climate targets and carbon accounting', 'Impact reporting', 'Nature and biodiversity', 'Human rights and supply chain', 'Management systems (ISO)', 'Projects, buildings and infrastructure', 'Investors, finance and ratings', 'Assurance'];
export const STANDARDS = [
  { id: 'AASB_S2', group: 'Jurisdictions', short: 'AASB S2', name: 'AASB S2 Climate-related Disclosures', region: 'Australia', kind: 'Mandatory', note: 'Corporations Act climate reporting, phased in: Group 1 from years beginning 1 January 2025, Group 2 from 1 July 2026, Group 3 from 1 July 2027. Amended December 2025 to match the IFRS S2 GHG amendments.' },
  { id: 'AASB_S1', group: 'Jurisdictions', short: 'AASB S1', name: 'AASB S1 General Requirements for Disclosure of Sustainability-related Financial Information', region: 'Australia', kind: 'Voluntary', note: 'The Australian version of IFRS S1. Voluntary; AASB S2 carries the parts of S1 it needs.' },
  { id: 'IFRS_S1', group: 'Global baseline (ISSB)', short: 'IFRS S1', name: 'IFRS S1 General Requirements for Disclosure of Sustainability-related Financial Information', region: 'Global (ISSB)', kind: 'Baseline', note: 'The ISSB global baseline. ISSB has issued S1 and S2; nature-related disclosures are at exposure draft (a proposed IFRS Practice Statement), not yet a standard.' },
  { id: 'IFRS_S2', group: 'Global baseline (ISSB)', short: 'IFRS S2', name: 'IFRS S2 Climate-related Disclosures', region: 'Global (ISSB)', kind: 'Baseline', note: 'Climate: governance, strategy, risk management, metrics and targets (built on TCFD). GHG amendments issued December 2025.' },
  { id: 'ESRS', group: 'Jurisdictions', short: 'ESRS', name: 'ESRS under the EU CSRD', region: 'European Union', kind: 'Mandatory (in scope)', note: 'Double materiality. Revised and simplified ESRS adopted July 2026 for 2027 statements (early use allowed from 2026); Omnibus I moved wave 2 to financial year 2027.' },
  { id: 'GRI', group: 'Impact reporting', short: 'GRI', name: 'GRI Standards (Universal 2021 and Topic Standards)', region: 'Global', kind: 'Voluntary', note: 'Impact materiality. GRI 2 general disclosures, GRI 3 material topics, and topic standards such as 302 Energy, 303 Water, 305 Emissions, 306 Waste, 403 Safety, 405 Diversity, 408 Child labour.' },
  { id: 'TCFD', group: 'Global baseline (ISSB)', short: 'TCFD', name: 'TCFD Recommendations', region: 'Global', kind: 'Framework', note: 'Governance, strategy, risk management, metrics and targets. Now carried by IFRS S2, which fully supersedes it.' },
  { id: 'SASB', group: 'Global baseline (ISSB)', short: 'SASB', name: 'SASB Standards (industry-based)', region: 'Global (ISSB)', kind: 'Industry metrics', note: 'Industry-specific metrics, maintained by the ISSB and referenced by IFRS S1.' },
  { id: 'CDP', group: 'Investors, finance and ratings', short: 'CDP', name: 'CDP Climate Change, Water Security and Forests', region: 'Global', kind: 'Disclosure system', note: 'Investor and supply-chain questionnaire, aligned with IFRS S2.' },
  { id: 'BURSA', group: 'Jurisdictions', short: 'Bursa', name: 'Bursa Malaysia Sustainability Reporting and the NSRF', region: 'Malaysia', kind: 'Mandatory (listed)', note: 'Main Market Listing Requirements sustainability statement with common indicators; under the National Sustainability Reporting Framework the ISSB standards apply to Group 1 from 2025, Group 2 from 2026 and Group 3 (ACE Market, large non-listed) from 2027.' },
  { id: 'GHGP', group: 'Climate targets and carbon accounting', short: 'GHG Protocol', name: 'GHG Protocol Corporate Standard and Scope 3 Standard', region: 'Global', kind: 'Method', note: 'How Scope 1, 2 and 3 emissions are counted; the method under IFRS S2, AASB S2, ESRS E1, GRI 305 and CDP.' },
  { id: 'ISO14064', group: 'Climate targets and carbon accounting', short: 'ISO 14064-1', name: 'ISO 14064-1 Greenhouse gases', region: 'Global', kind: 'Method', note: 'Organisation-level GHG inventory and verification.' },
  { id: 'NGER', group: 'Jurisdictions', short: 'NGER', name: 'NGER Scheme (National Greenhouse and Energy Reporting)', region: 'Australia', kind: 'Mandatory (thresholds)', note: 'Facility and corporate emissions and energy reporting above the thresholds; the NGA Factors are its emission factors.' },
  { id: 'SGX', group: 'Jurisdictions', short: 'SGX', name: 'SGX Sustainability Reporting', region: 'Singapore', kind: 'Mandatory (listed)', note: 'Listed issuers report climate in line with ISSB standards on a phased timetable.' },
  { id: 'NZCS', group: 'Jurisdictions', short: 'NZ CS', name: 'Aotearoa New Zealand Climate Standards (XRB)', region: 'New Zealand', kind: 'Mandatory (climate reporting entities)', note: 'NZ CS 1-3 for climate reporting entities.' },
  { id: 'TNFD', group: 'Nature and biodiversity', short: 'TNFD', name: 'TNFD Recommendations (nature)', region: 'Global', kind: 'Framework', note: 'Nature-related dependencies, impacts, risks and opportunities (LEAP approach).' },
  { id: 'SDG', group: 'Impact reporting', short: 'SDGs', name: 'UN Sustainable Development Goals', region: 'Global', kind: 'Reference', note: 'The goals the organisation contributes to.' },
  { id: 'SBTI', group: 'Climate targets and carbon accounting', short: 'SBTi', name: 'Science Based Targets initiative (SBTi) Corporate Net-Zero Standard', region: 'Global', kind: 'Target validation (voluntary)', note: 'Validated near-term and net-zero targets. Version 2.0 was published on 11 June 2026, with validation against it from 2027; companies renewing targets in 2026 or 2027 can keep using V1.3.' },
  { id: 'ISO14064_2', group: 'Climate targets and carbon accounting', short: 'ISO 14064-2', name: 'ISO 14064-2 GHG projects', region: 'Global', kind: 'Method', note: 'Quantifying and reporting emission reductions and removals from a project against its baseline.' },
  { id: 'ISO14064_3', group: 'Climate targets and carbon accounting', short: 'ISO 14064-3', name: 'ISO 14064-3 Validation and verification of GHG statements', region: 'Global', kind: 'Assurance', note: 'How an independent body validates or verifies a GHG inventory or project claim.' },
  { id: 'ISO14068', group: 'Climate targets and carbon accounting', short: 'ISO 14068-1', name: 'ISO 14068-1 Carbon neutrality', region: 'Global', kind: 'Claims', note: 'Requirements for carbon neutrality claims (reduce first, then offset residual emissions); the successor to PAS 2060.' },
  { id: 'PCAF', group: 'Investors, finance and ratings', short: 'PCAF', name: 'PCAF Global GHG Accounting and Reporting Standard', region: 'Global', kind: 'Method (financial sector)', note: 'Financed, facilitated and insured emissions (Scope 3 Category 15) for banks, investors and insurers.' },
  { id: 'TPT', group: 'Climate targets and carbon accounting', short: 'TPT', name: 'Transition Plan Taskforce disclosure framework', region: 'Global (ISSB)', kind: 'Framework', note: 'How to disclose a credible climate transition plan; its materials are now held by the IFRS Foundation to support IFRS S2.' },
  { id: 'UK_SRS', group: 'Jurisdictions', short: 'UK SRS', name: 'UK Sustainability Reporting Standards (UK SRS S1 and S2)', region: 'United Kingdom', kind: 'Voluntary (mandatory use proposed)', note: 'The UK versions of IFRS S1 and S2, issued 25 February 2026 for voluntary use; the FCA has proposed making UK SRS S2 mandatory for listed companies.' },
  { id: 'CSDS', group: 'Jurisdictions', short: 'CSDS', name: 'Canadian Sustainability Disclosure Standards (CSDS 1 and 2)', region: 'Canada', kind: 'Voluntary', note: 'Based on IFRS S1 and S2 with longer transition relief; voluntary unless required by securities regulators.' },
  { id: 'SSBJ', group: 'Jurisdictions', short: 'SSBJ', name: 'SSBJ Sustainability Disclosure Standards', region: 'Japan', kind: 'Mandatory (listed, phased)', note: 'Japan\'s ISSB-based standards; the FSA has mandated them for listed companies, phased in by market capitalisation.' },
  { id: 'CN_CSDS', group: 'Jurisdictions', short: 'China CSDS', name: 'China Corporate Sustainability Disclosure Standards and stock exchange guidelines', region: 'China', kind: 'Mandatory (large listed) and developing', note: 'The Ministry of Finance basic standard (2024) and the Shanghai, Shenzhen and Beijing exchange guidelines for large listed companies.' },
  { id: 'HKEX', group: 'Jurisdictions', short: 'HKEX', name: 'HKEX ESG Code and climate requirements', region: 'Hong Kong', kind: 'Mandatory (listed)', note: 'ESG reporting for listed issuers, with ISSB-aligned climate disclosures phased in from 2025.' },
  { id: 'BRSR', group: 'Jurisdictions', short: 'BRSR', name: 'SEBI Business Responsibility and Sustainability Report (BRSR, BRSR Core)', region: 'India', kind: 'Mandatory (top listed)', note: 'For the largest listed companies, with assurance of BRSR Core indicators phased in along the value chain.' },
  { id: 'OJK', group: 'Jurisdictions', short: 'OJK', name: 'OJK Sustainability Report (POJK 51/2017)', region: 'Indonesia', kind: 'Mandatory (listed and financial)', note: 'Sustainability reports for financial services institutions, issuers and public companies.' },
  { id: 'TH_SEC', group: 'Jurisdictions', short: 'Thai SEC', name: 'Thai SEC One Report (Form 56-1) sustainability section', region: 'Thailand', kind: 'Mandatory (listed)', note: 'ESG and GHG disclosures in the annual One Report of listed companies.' },
  { id: 'CA_SB253', group: 'Jurisdictions', short: 'California', name: 'California SB 253 and SB 261', region: 'United States (California)', kind: 'Mandatory (revenue thresholds)', note: 'SB 253: Scope 1 and 2 from 2026 and Scope 3 from 2027 for companies over US$1 billion revenue doing business in California. SB 261 (climate risk, over US$500 million) is paused by the Ninth Circuit and voluntary for now.' },
  { id: 'EU_TAX', group: 'Jurisdictions', short: 'EU Taxonomy', name: 'EU Taxonomy Regulation (Article 8 KPIs)', region: 'European Union', kind: 'Mandatory (CSRD scope)', note: 'Share of turnover, CapEx and OpEx aligned with the taxonomy\'s technical screening criteria; simplified under the Omnibus.' },
  { id: 'VSME', group: 'Impact reporting', short: 'VSME', name: 'EFRAG Voluntary Sustainability Reporting Standard for SMEs (VSME)', region: 'European Union', kind: 'Voluntary (SMEs)', note: 'A short standard for small and medium-sized companies, often used to answer customers\' and banks\' ESG questions.' },
  { id: 'IR', group: 'Impact reporting', short: '<IR>', name: 'Integrated Reporting Framework', region: 'Global (IFRS Foundation)', kind: 'Framework', note: 'How the organisation creates value over time across six capitals; now part of the IFRS Foundation.' },
  { id: 'UNGC', group: 'Human rights and supply chain', short: 'UN Global Compact', name: 'UN Global Compact Ten Principles', region: 'Global', kind: 'Commitment', note: 'Human rights, labour, environment and anti-corruption, with an annual Communication on Progress.' },
  { id: 'UNGP', group: 'Human rights and supply chain', short: 'UNGPs / OECD', name: 'UN Guiding Principles on Business and Human Rights and OECD Guidelines for Multinational Enterprises', region: 'Global', kind: 'Due diligence', note: 'Human rights and responsible business due diligence across operations and the value chain.' },
  { id: 'AU_MSA', group: 'Human rights and supply chain', short: 'Modern Slavery Act', name: 'Australian Modern Slavery Act 2018 statements', region: 'Australia', kind: 'Mandatory (revenue over A$100 million)', note: 'Annual statement on modern slavery risks in operations and supply chains, and the actions taken.' },
  { id: 'ISO20400', group: 'Human rights and supply chain', short: 'ISO 20400', name: 'ISO 20400 Sustainable procurement', region: 'Global', kind: 'Guidance', note: 'Building sustainability into purchasing policy, process and supplier engagement.' },
  { id: 'ISO26000', group: 'Human rights and supply chain', short: 'ISO 26000', name: 'ISO 26000 Social responsibility', region: 'Global', kind: 'Guidance', note: 'Guidance on the seven core subjects of social responsibility.' },
  { id: 'ISO14001', group: 'Management systems (ISO)', short: 'ISO 14001', name: 'ISO 14001 Environmental management systems', region: 'Global', kind: 'Certification', note: 'A certified system for managing environmental aspects, compliance and improvement.' },
  { id: 'ISO50001', group: 'Management systems (ISO)', short: 'ISO 50001', name: 'ISO 50001 Energy management systems', region: 'Global', kind: 'Certification', note: 'A certified system for measuring and improving energy performance.' },
  { id: 'ISO45001', group: 'Management systems (ISO)', short: 'ISO 45001', name: 'ISO 45001 Occupational health and safety', region: 'Global', kind: 'Certification', note: 'A certified system for managing work health and safety.' },
  { id: 'TNFD_GRI101', group: 'Nature and biodiversity', short: 'GRI 101', name: 'GRI 101 Biodiversity 2024', region: 'Global', kind: 'Voluntary', note: 'The GRI topic standard for biodiversity impacts across the supply chain, in effect from 2026.' },
  { id: 'SBTN', group: 'Nature and biodiversity', short: 'SBTN', name: 'Science Based Targets Network (SBTN) targets for nature', region: 'Global', kind: 'Target validation (voluntary)', note: 'Science-based targets for freshwater and land, alongside SBTi climate targets.' },
  { id: 'P5', group: 'Projects, buildings and infrastructure', short: 'PMI GPM P5', name: 'PMI GPM P5 Standard for Sustainability in Project Management', region: 'Global (PMI and GPM)', kind: 'Project standard', note: 'Sustainability across people, planet and prosperity, and the project\'s process and product; version 4.0 (April 2026) aligns with the PMBOK Guide, Eighth Edition, and uses a 1 to 5 impact scoring model.' },
  { id: 'PAS2080', group: 'Projects, buildings and infrastructure', short: 'PAS 2080', name: 'PAS 2080 Carbon management in buildings and infrastructure', region: 'Global (BSI)', kind: 'Specification', note: 'Whole-life carbon management across the value chain of buildings and infrastructure projects.' },
  { id: 'ISC_IS', group: 'Projects, buildings and infrastructure', short: 'IS Rating', name: 'ISC Infrastructure Sustainability (IS) Rating', region: 'Australia and New Zealand', kind: 'Rating', note: 'Sustainability rating for infrastructure planning, design, construction and operation.' },
  { id: 'GREENSTAR', group: 'Projects, buildings and infrastructure', short: 'Green Star', name: 'Green Star (Green Building Council of Australia)', region: 'Australia', kind: 'Rating', note: 'Environmental rating for buildings, fit-outs and communities.' },
  { id: 'NABERS', group: 'Projects, buildings and infrastructure', short: 'NABERS', name: 'NABERS energy, water, waste and embodied carbon ratings', region: 'Australia and New Zealand', kind: 'Rating', note: 'Measured operational performance of buildings.' },
  { id: 'LEED', group: 'Projects, buildings and infrastructure', short: 'LEED / BREEAM', name: 'LEED and BREEAM green building certification', region: 'Global', kind: 'Rating', note: 'The US Green Building Council and BRE building certification schemes.' },
  { id: 'ENVISION', group: 'Projects, buildings and infrastructure', short: 'Envision', name: 'Envision (Institute for Sustainable Infrastructure)', region: 'Global (US-based)', kind: 'Rating', note: 'Sustainability framework and verification for infrastructure projects.' },
  { id: 'IFC_PS', group: 'Projects, buildings and infrastructure', short: 'IFC PS', name: 'IFC Performance Standards on Environmental and Social Sustainability', region: 'Global', kind: 'Lender requirement', note: 'Eight standards for managing environmental and social risk in projects financed by IFC and others.' },
  { id: 'EQUATOR', group: 'Investors, finance and ratings', short: 'Equator Principles', name: 'Equator Principles (EP4)', region: 'Global', kind: 'Lender framework', note: 'Environmental and social risk management for project finance, applying the IFC Performance Standards.' },
  { id: 'GRESB', group: 'Investors, finance and ratings', short: 'GRESB', name: 'GRESB Real Estate and Infrastructure Assessments', region: 'Global', kind: 'Investor benchmark', note: 'Annual ESG benchmark of real asset portfolios and developments for investors.' },
  { id: 'ECOVADIS', group: 'Investors, finance and ratings', short: 'EcoVadis', name: 'EcoVadis sustainability rating', region: 'Global', kind: 'Rating', note: 'A supplier sustainability rating across environment, labour and human rights, ethics and procurement.' },
  { id: 'BCORP', group: 'Investors, finance and ratings', short: 'B Corp', name: 'B Corp Certification (B Lab)', region: 'Global', kind: 'Certification', note: 'Whole-company certification of social and environmental performance, accountability and transparency.' },
  { id: 'WEF_SCM', group: 'Investors, finance and ratings', short: 'WEF metrics', name: 'WEF Stakeholder Capitalism Metrics', region: 'Global', kind: 'Metrics set', note: 'Common metrics across principles of governance, planet, people and prosperity.' },
  { id: 'ISSA5000', group: 'Assurance', short: 'ISSA 5000', name: 'ISSA 5000 General Requirements for Sustainability Assurance Engagements (IAASB)', region: 'Global', kind: 'Assurance standard', note: 'The international standard for limited and reasonable assurance of sustainability information.' }
];
const STD_IDS = new Set(STANDARDS.map((s) => s.id));

/* ---------------- 🧾 the data the user enters (one schema for the forms, the checks and the AI) ---------------- */
export const INDUSTRY_GROUPS = [
  ['Extractives & Minerals', ['Mining & Metals', 'Coal Operations', 'Oil & Gas: Exploration & Production', 'Oil & Gas: Midstream & Pipelines', 'Oil & Gas: Refining & Marketing', 'Oil & Gas: Services', 'Construction Materials & Cement', 'Quarrying & Aggregates']],
  ['Materials & Chemicals', ['Steel Manufacturing', 'Aluminium & Non-ferrous Metals', 'Petrochemicals', 'Chemicals', 'Fertilisers & Agricultural Chemicals', 'Plastics & Rubber Products', 'Glass & Ceramics', 'Containers & Packaging', 'Pulp & Paper Products', 'Forestry & Timber']],
  ['Energy & Utilities', ['Energy & Utilities', 'Electric Utilities & Power Generation', 'Gas Utilities & Distribution', 'Water Utilities & Services', 'Waste Management & Recycling', 'Solar Energy', 'Wind Energy', 'Hydro & Geothermal', 'Biofuels & Bioenergy', 'Hydrogen & Fuel Cells', 'Oil & Gas Downstream Retail (fuel stations)']],
  ['Manufacturing & Industrials', ['Manufacturing', 'Industrial Machinery & Equipment', 'Electrical & Electronic Equipment', 'Automotive & Auto Parts', 'Electric Vehicles & Batteries', 'Shipbuilding & Marine Equipment', 'Aviation & Aerospace', 'Defence & Security Equipment', 'Semiconductors', 'Textiles & Apparel Manufacturing', 'Furniture & Building Products', 'Printing & Publishing']],
  ['Food, Beverage & Agriculture', ['Agriculture & Farming', 'Livestock & Meat Processing', 'Dairy', 'Fisheries & Aquaculture', 'Palm Oil & Plantations', 'Food Processing & Manufacturing', 'Beverages (non-alcoholic)', 'Alcoholic Beverages', 'Tobacco', 'Food Retail & Distribution', 'Restaurants & Food Service']],
  ['Transport & Logistics', ['Logistics & Warehousing', 'Transportation Services', 'Road Freight & Trucking', 'Rail Transport', 'Shipping & Marine Transport', 'Ports & Terminals', 'Airlines', 'Airports', 'Courier & Last-mile Delivery', 'Public Transport & Passenger Services', 'Car Rental & Leasing']],
  ['Infrastructure & Real Estate', ['Construction & Engineering', 'Infrastructure Development', 'Engineering & Design Services', 'Real Estate & Facilities', 'Real Estate Development', 'Property Management & REITs', 'Facilities Management & Maintenance', 'Data Centres', 'Telecommunications Towers & Networks']],
  ['Technology & Communications', ['IT & Software Services', 'Software & Cloud (SaaS)', 'Hardware & Devices', 'Telecommunications', 'Internet & Digital Media', 'Media & Entertainment', 'E-commerce & Online Marketplaces', 'Fintech & Digital Payments', 'Cyber Security Services']],
  ['Consumer Goods & Retail', ['Retail & Wholesale', 'Supermarkets & Grocery', 'Department & Specialty Stores', 'Apparel, Footwear & Accessories', 'Household & Personal Products', 'Toys & Sporting Goods', 'Consumer Electronics Retail', 'Luxury Goods & Jewellery', 'Cosmetics & Beauty']],
  ['Services', ['Sustainability Consulting', 'Management Consulting', 'Professional Services (Legal, Accounting)', 'Engineering & Technical Consulting', 'Marketing & Advertising', 'Staffing & Recruitment', 'Security Services', 'Cleaning & Facility Services', 'Hospitality & Tourism', 'Hotels & Resorts', 'Travel & Tour Operators', 'Casinos & Gaming', 'Events & Exhibitions', 'Sports, Fitness & Recreation']],
  ['Health & Life Sciences', ['Healthcare Services', 'Hospitals & Clinics', 'Pharmaceuticals', 'Biotechnology', 'Medical Devices & Equipment', 'Aged Care & Disability Services', 'Health Insurance', 'Laboratories & Diagnostics']],
  ['Financial Services', ['Financial Services', 'Commercial Banking', 'Investment Banking & Brokerage', 'Asset Management & Custody', 'Insurance', 'Islamic Finance', 'Superannuation & Pension Funds', 'Real Estate Finance & Mortgages']],
  ['Public Sector & Not-for-profit', ['Government & Public Sector', 'Local Government & Councils', 'Defence', 'Education & Training', 'Universities & Research', 'Schools', 'Not-for-profit & Charities', 'International Development & NGOs', 'Religious & Community Organisations']],
  ['Other', ['Conglomerate / Diversified Holdings', 'Other']]];
export const INDUSTRIES = INDUSTRY_GROUPS.flatMap((g) => g[1]);
const YN = ['Yes', 'No'], PARTIAL = ['Yes', 'Partly', 'No'];
// [key, label, type, unit/options, hint] — type: n number, p percent, t text, l long text, s select, y yes/no, d date
export const SECTIONS = [
  { id: 'org', g: 'rep', title: 'Organisation and report', fields: [
    ['name', 'Organisation name', 't'], ['reg', 'Registration number', 't'], ['industry', 'Industry sector', 's', INDUSTRIES], ['country', 'Main country of operation', 't'],
    ['year', 'Reporting year', 't', null, 'e.g. FY2026'], ['from', 'Period start', 'd'], ['to', 'Period end', 'd'], ['currency', 'Currency', 's', ['AUD', 'MYR', 'SGD', 'NZD', 'USD', 'EUR', 'GBP', 'THB', 'IDR']],
    ['revenue', 'Revenue (millions)', 'n', 'M', 'For emissions intensity'], ['employees', 'Employees (headcount)', 'n'], ['listing', 'Listing', 's', ['Not listed', 'ASX', 'Bursa Malaysia Main Market', 'Bursa Malaysia ACE Market', 'SGX', 'NZX', 'EU regulated market', 'Other']],
    ['boundary', 'Consolidation approach', 's', ['Operational control', 'Financial control', 'Equity share']], ['entities', 'Entities and sites included', 'l'], ['assurance', 'External assurance', 's', ['None yet', 'Limited assurance', 'Reasonable assurance']],
    ['assurer', 'Assurance provider', 't'], ['contact', 'Report contact', 't'], ['about', 'What the organisation does', 'l', null, 'Two or three sentences: products, services, markets']] },
  { id: 'carbon', g: 'env', title: 'Scope 1 and 2 emissions', fields: [
    ['fset', 'Emission factor set', 's', null, 'Fills the factors below; check them against the current official set'],
    ['diesel', 'Diesel', 'n', 'L'], ['petrol', 'Petrol', 'n', 'L'], ['jet', 'Jet fuel', 'n', 'L'], ['lpg', 'LPG', 'n', 'L'], ['gas', 'Natural gas', 'n', 'GJ'], ['refrig', 'Refrigerant top-up', 'n', 'kg'], ['refGwp', 'Refrigerant GWP', 'n', 'kgCO2e/kg', 'R-410A is 1,924 (AR5) or 2,256 (AR6)'],
    ['elec', 'Electricity bought', 'n', 'MWh'], ['green', 'Of which renewable (contracts, certificates)', 'n', 'MWh', 'For market-based Scope 2'],
    ['fDiesel', 'Factor: diesel', 'n', 'kgCO2e/L'], ['fPetrol', 'Factor: petrol', 'n', 'kgCO2e/L'], ['fJet', 'Factor: jet fuel', 'n', 'kgCO2e/L'], ['fLpg', 'Factor: LPG', 'n', 'kgCO2e/L'], ['fGas', 'Factor: natural gas', 'n', 'kgCO2e/GJ'], ['fElec', 'Factor: grid electricity', 'n', 'kgCO2e/kWh'],
    ['baseYear', 'Base year', 't'], ['baseT', 'Base-year emissions (Scope 1 and 2)', 'n', 'tCO2e']] },
  { id: 'scope3', g: 'env', title: 'Scope 3 value chain', fields: [
    ['purch', 'Cat 1 Purchased goods and services (spend)', 'n', 'k$'], ['freight', 'Cat 4 Freight', 'n', 'tonne-km'], ['landfill', 'Cat 5 Waste to landfill', 'n', 't'], ['recycled', 'Cat 5 Waste recycled', 'n', 't'],
    ['air', 'Cat 6 Business travel: flights', 'n', 'passenger-km'], ['car', 'Cat 6 Business travel: car', 'n', 'km'], ['hotel', 'Cat 6 Business travel: hotel nights', 'n', 'nights'], ['commute', 'Cat 7 Employee commuting', 'n', 'km'], ['water', 'Water supplied and treated', 'n', 'm3'],
    ['fPurch', 'Factor: purchases', 'n', 'tCO2e/k$'], ['fFreight', 'Factor: freight', 'n', 'kgCO2e/t-km'], ['fLandfill', 'Factor: landfill', 'n', 'tCO2e/t'], ['fRecycled', 'Factor: recycling', 'n', 'tCO2e/t'], ['fAir', 'Factor: flights', 'n', 'kgCO2e/p-km'], ['fCar', 'Factor: car', 'n', 'kgCO2e/km'], ['fHotel', 'Factor: hotel night', 'n', 'kgCO2e/night'], ['fCommute', 'Factor: commuting', 'n', 'kgCO2e/km'], ['fWater', 'Factor: water', 'n', 'kgCO2e/m3']] },
  { id: 'resources', g: 'env', title: 'Energy, water and waste', fields: [
    ['energyMWh', 'Total energy used (all sources)', 'n', 'MWh', 'Leave blank to work it out from fuels and electricity'], ['renewPct', 'Renewable share of energy', 'p'], ['waterWd', 'Water withdrawn', 'n', 'm3'], ['waterStress', 'Sites in water-stressed areas', 'y', YN],
    ['wasteT', 'Total waste generated', 'n', 't'], ['hazT', 'Of which hazardous', 'n', 't'], ['divertPct', 'Waste diverted from landfill', 'p'], ['iso14001', 'ISO 14001 environmental management', 's', ['Certified', 'Working towards it', 'No']],
    ['envFines', 'Environmental fines and breaches (count)', 'n'], ['biodiv', 'Sites in or near protected or high-biodiversity areas', 'y', YN]] },
  { id: 'climate', g: 'env', title: 'Climate risk and targets', fields: [
    ['tgtPct', 'Emissions reduction target', 'p', null, 'Scope 1 and 2, from the base year'], ['tgtYear', 'Target year', 't'], ['netZero', 'Net zero year', 't'], ['sbti', 'Science-based target', 's', ['Validated', 'Committed', 'No']],
    ['scenario', 'Climate scenario analysis', 's', PARTIAL], ['transition', 'Transition plan', 's', PARTIAL], ['carbonPrice', 'Internal carbon price', 'n', '$/tCO2e'], ['boardClimate', 'Board oversees climate risk', 's', PARTIAL],
    ['climatePay', 'Climate targets in executive pay', 'y', YN], ['risks', 'Climate risks (one per line: risk · physical or transition · high/medium/low)', 'l'], ['opps', 'Climate opportunities (one per line)', 'l'], ['offsets', 'Carbon credits retired', 'n', 'tCO2e']] },
  { id: 'workforce', g: 'soc', title: 'Workforce, health and safety', fields: [
    ['fte', 'Total workforce', 'n', 'FTE'], ['under18', 'Under 18 years', 'n'], ['a18', '18 to 40 years', 'n'], ['a41', '41 to 55 years', 'n'], ['a55', 'Over 55 years', 'n'],
    ['women', 'Women in the workforce', 'n'], ['mgmt', 'People in management', 'n'], ['womenMgmt', 'Women in management', 'n'], ['hires', 'New hires in the year', 'n'], ['leavers', 'Leavers in the year', 'n'],
    ['injuries', 'Recordable injuries', 'n'], ['deaths', 'Fatalities', 'n'], ['ltifr', 'Lost time injury frequency rate (LTIFR)', 'n', 'per million hours'], ['hours', 'Hours worked', 'n', 'hours'],
    ['safetyTrain', 'Safety training completion', 'p'], ['trainHrs', 'Average training hours per employee', 'n', 'hours'], ['payGap', 'Gender pay gap', 'p'], ['bargain', 'Covered by collective agreements', 'p']] },
  { id: 'rights', g: 'soc', title: 'Human rights and labour', fields: [
    ['hrPolicy', 'Human rights policy (ILO aligned)', 'y', YN], ['antiDisc', 'Anti-discrimination and harassment policy', 'y', YN], ['sWhistle', 'Whistleblower channel for workers', 'y', YN], ['psycho', 'Fatigue and psychosocial risk management', 's', PARTIAL],
    ['childLabour', 'Child labour checks (ILO C138 and C182)', 'y', YN], ['modernSlavery', 'Modern slavery statement or due diligence', 'y', YN], ['livingWage', 'Living wage paid', 's', PARTIAL],
    ['indigPolicy', 'Indigenous peoples policy or plan (e.g. RAP)', 's', ['Yes', 'No', 'Not applicable']], ['indigPct', 'Indigenous participation in the workforce', 'p']] },
  { id: 'community', g: 'soc', title: 'Community, suppliers and customers', fields: [
    ['dei', 'Diversity, equity and inclusion program', 'y', YN], ['parental', 'Paid parental leave', 'y', YN], ['wellbeing', 'Wellbeing and mental health support', 'y', YN], ['invest', 'Community investment', 'n', '$'],
    ['volHrs', 'Volunteering hours', 'n', 'hours'], ['supAudit', 'Key suppliers with social or ESG audits', 'p'], ['localPct', 'Spend with local suppliers', 'p'], ['divHires', 'Under-represented or veteran hires', 'n'],
    ['grievance', 'Grievance mechanism', 's', ['Formal and published', 'Basic', 'None']], ['privacyComplaints', 'Customer privacy complaints', 'n']] },
  { id: 'board', g: 'gov', title: 'Board and oversight', fields: [
    ['boardSize', 'Board size', 'n'], ['boardWomen', 'Women on the board', 'n'], ['indepPct', 'Independent directors', 'p'], ['chairSep', 'Chair and CEO are different people', 'y', YN],
    ['susCommittee', 'Board sustainability committee', 'y', YN], ['indepSus', 'Independent director on the sustainability committee', 'y', YN], ['boardTrain', 'Board ESG training in the year', 'y', YN], ['execEsg', 'ESG targets in executive pay', 'y', YN]] },
  { id: 'ethics', g: 'gov', title: 'Ethics, risk and compliance', fields: [
    ['code', 'Code of conduct published', 'y', YN], ['gWhistle', 'Whistleblower policy (board level)', 'y', YN], ['antiCorrupt', 'Anti-bribery and corruption policy', 'y', YN], ['corruptCases', 'Confirmed corruption incidents', 'n'], ['abcTrain', 'Staff trained on anti-corruption', 'p'],
    ['erm', 'Enterprise risk management covers ESG', 's', ['Integrated', 'Partly', 'No']], ['audit', 'Internal audit function', 'y', YN], ['cyber', 'Board oversight of cyber security', 'y', YN], ['privacy', 'Data privacy program', 's', ['Formal', 'Basic', 'None']], ['breaches', 'Data breaches reported', 'n'],
    ['tax', 'Tax transparency disclosure', 'y', YN], ['political', 'Political contributions disclosed', 'y', YN], ['stakeGriev', 'Stakeholder grievance mechanism', 'y', YN]] },
  { id: 'certs', g: 'gov', title: 'Certifications and systems', fields: [
    ['iso45001', 'ISO 45001 safety management', 'y', YN], ['iso27001', 'ISO 27001 information security', 'y', YN], ['iso9001', 'ISO 9001 quality management', 'y', YN], ['grc', 'GRC platform', 's', ['Deployed', 'Manual', 'None']],
    ['susReport', 'Sustainability report published last year', 'y', YN], ['ethicsAuditPct', 'Third-party ethics audits of suppliers', 'p']] }
];
const FIELDS = {}; SECTIONS.forEach((s) => s.fields.forEach((f) => { FIELDS[s.id + '.' + f[0]] = { sec: s.id, k: f[0], label: f[1], t: f[2], opts: Array.isArray(f[3]) ? f[3] : null, unit: typeof f[3] === 'string' ? f[3] : '' }; }));
const PILLAR_OF = { org: 'org', carbon: 'env', scope3: 'env', resources: 'env', climate: 'env', workforce: 'soc', rights: 'soc', community: 'soc', board: 'gov', ethics: 'gov', certs: 'gov' };

// 🧭 materiality: the usual topics; each is rated for its impact on people and planet and its financial effect on the organisation (double materiality)
// 🎯 material topics: [key, label, pillar, what it covers, GRI, ESRS, other references]
export const TOPICS_FULL = [
  ['ghg', 'Climate change and GHG emissions', 'E', 'Scope 1, 2 and 3 emissions, reduction targets and the transition plan.', 'GRI 305', 'ESRS E1', 'IFRS S2 · AASB S2 · TCFD · CDP climate'],
  ['adapt', 'Physical climate risk and adaptation', 'E', 'Heat, flood, fire and storm exposure of sites, supply chains and people, and the plans to adapt.', 'GRI 201-2', 'ESRS E1', 'IFRS S2 · TCFD'],
  ['energy', 'Energy', 'E', 'Energy use, efficiency and the shift to renewable energy.', 'GRI 302', 'ESRS E1', 'SASB energy metrics'],
  ['water', 'Water and marine resources', 'E', 'Water withdrawal, discharge and quality, water stress, oceans.', 'GRI 303', 'ESRS E3', 'CDP water'],
  ['waste', 'Waste and circularity', 'E', 'Waste generated and diverted, product design for reuse and recycling.', 'GRI 306', 'ESRS E5', ''],
  ['materials', 'Materials, packaging and resource use', 'E', 'Raw materials, recycled content, packaging and resource efficiency.', 'GRI 301', 'ESRS E5', ''],
  ['biodiv', 'Biodiversity, land and ecosystems', 'E', 'Impacts on nature, land use, deforestation and sensitive areas.', 'GRI 101 / 304', 'ESRS E4', 'TNFD · CDP forests'],
  ['pollution', 'Pollution of air, water and soil', 'E', 'Emissions to air (NOx, SOx, particulates), spills, contamination.', 'GRI 305-7', 'ESRS E2', ''],
  ['chemicals', 'Hazardous substances and chemicals', 'E', 'Use, storage and disposal of hazardous materials and substances of concern.', 'GRI 306', 'ESRS E2', ''],
  ['safety', 'Occupational health and safety', 'S', 'Injuries, fatalities, critical risks, contractor safety and safety culture.', 'GRI 403', 'ESRS S1', 'ISO 45001'],
  ['wellbeing', 'Wellbeing and psychosocial safety', 'S', 'Mental health, fatigue, workload, bullying and harassment.', 'GRI 403-6', 'ESRS S1', 'ISO 45003'],
  ['people', 'Attracting, developing and keeping people', 'S', 'Hiring, turnover, training, careers and engagement.', 'GRI 401 / 404', 'ESRS S1', ''],
  ['labour', 'Fair work, pay and labour practices', 'S', 'Living wage, working hours, collective bargaining, secure work.', 'GRI 402 / 407', 'ESRS S1', ''],
  ['dei', 'Diversity, equity and inclusion', 'S', 'Gender and diversity at every level, equal pay, inclusion.', 'GRI 405 / 406', 'ESRS S1', 'WGEA (Australia)'],
  ['rights', 'Human rights and modern slavery', 'S', 'Forced and child labour, due diligence and remedy across operations and suppliers.', 'GRI 408 / 409 / 414', 'ESRS S1 / S2', 'Modern Slavery Acts · UNGPs'],
  ['supply', 'Responsible supply chain', 'S', 'Supplier ESG screening, audits, local and diverse suppliers.', 'GRI 204 / 308 / 414', 'ESRS S2 / G1', ''],
  ['community', 'Communities and social licence', 'S', 'Local impacts, community investment, engagement and grievances.', 'GRI 413', 'ESRS S3', ''],
  ['indigenous', 'Indigenous peoples and cultural heritage', 'S', 'Indigenous rights, participation, procurement and cultural heritage.', 'GRI 411', 'ESRS S3', 'RAP (Australia)'],
  ['customers', 'Customers, product quality and safety', 'S', 'Product and service safety, quality, responsible marketing and complaints.', 'GRI 416 / 417', 'ESRS S4', ''],
  ['access', 'Access, affordability and inclusion of customers', 'S', 'Fair access to products and services, vulnerable customers, financial inclusion.', '', 'ESRS S4', 'SASB access metrics'],
  ['ethics', 'Business ethics and anti-corruption', 'G', 'Bribery, fraud, conflicts of interest, whistleblowing and culture.', 'GRI 205', 'ESRS G1', 'UN Global Compact'],
  ['competition', 'Fair competition and lawful conduct', 'G', 'Anti-competitive behaviour, regulatory compliance and legal proceedings.', 'GRI 206 / 2-27', 'ESRS G1', ''],
  ['governance', 'Board governance and oversight', 'G', 'Board make-up and independence, oversight of sustainability, executive pay.', 'GRI 2-9 to 2-21', 'ESRS 2 / G1', 'ASX Corporate Governance Principles · MCCG'],
  ['risk', 'Risk management and resilience', 'G', 'Enterprise risk, business continuity and crisis response.', 'GRI 2-12 / 2-25', 'ESRS 2', 'ISO 31000'],
  ['cyber', 'Cyber security and data privacy', 'G', 'Information security, privacy, data breaches and resilience.', 'GRI 418', 'ESRS S4', 'ISO 27001 · SASB'],
  ['ai', 'Responsible technology and AI', 'G', 'Safe, fair and transparent use of AI and automation.', '', 'ESRS S4 (entity-specific)', 'ISO 42001'],
  ['tax', 'Tax transparency', 'G', 'Tax strategy, country-by-country reporting and contributions.', 'GRI 207', '', 'Voluntary Tax Transparency Code'],
  ['policy', 'Public policy and political engagement', 'G', 'Lobbying, political contributions and industry association alignment.', 'GRI 415', 'ESRS G1', ''],
  ['economic', 'Economic performance and value distributed', 'G', 'Revenue, wages, taxes, local economic contribution.', 'GRI 201 / 203', '', '']];
export const TOPICS = TOPICS_FULL.map((t) => t.slice(0, 3));
export const IRO_KINDS = ['Negative, actual', 'Negative, potential', 'Positive, actual', 'Positive, potential', 'Financial risk', 'Financial opportunity'];
export const HORIZONS = ['Short (under 1 year)', 'Medium (1 to 5 years)', 'Long (over 5 years)'];
// topics usually material by sector (a starting point to check, not a rating)
const SECT = { heavy: ['ghg', 'energy', 'water', 'pollution', 'chemicals', 'biodiv', 'safety', 'wellbeing', 'community', 'indigenous', 'adapt', 'ethics'], transport: ['ghg', 'energy', 'pollution', 'safety', 'wellbeing', 'labour', 'people', 'supply', 'adapt', 'customers'],
  build: ['ghg', 'safety', 'wellbeing', 'materials', 'waste', 'biodiv', 'community', 'indigenous', 'rights', 'supply', 'labour'], make: ['ghg', 'energy', 'materials', 'waste', 'pollution', 'chemicals', 'water', 'safety', 'rights', 'supply', 'customers'],
  services: ['people', 'dei', 'wellbeing', 'ethics', 'cyber', 'ai', 'ghg', 'governance', 'community'], tech: ['energy', 'ghg', 'cyber', 'ai', 'customers', 'people', 'dei', 'supply', 'waste', 'access'] };
const SP = { energyU: ['ghg', 'energy', 'adapt', 'water', 'biodiv', 'safety', 'access', 'community', 'cyber', 'policy'], agri: ['ghg', 'water', 'biodiv', 'pollution', 'chemicals', 'rights', 'labour', 'supply', 'customers', 'adapt'], avia: ['ghg', 'energy', 'pollution', 'safety', 'customers', 'people', 'adapt', 'policy', 'supply'], realestate: ['ghg', 'energy', 'adapt', 'water', 'materials', 'community', 'customers', 'safety', 'governance'], hosp: ['ghg', 'energy', 'water', 'waste', 'labour', 'wellbeing', 'community', 'customers', 'supply', 'rights'], retail: ['supply', 'rights', 'materials', 'waste', 'ghg', 'customers', 'people', 'labour', 'access'], health: ['customers', 'access', 'safety', 'wellbeing', 'cyber', 'waste', 'chemicals', 'ethics', 'people'], edu: ['people', 'wellbeing', 'dei', 'access', 'cyber', 'community', 'ghg', 'governance'], finance: ['ghg', 'access', 'customers', 'cyber', 'ethics', 'governance', 'risk', 'dei', 'ai', 'policy'], gov: ['ghg', 'adapt', 'access', 'community', 'indigenous', 'ethics', 'cyber', 'ai', 'people', 'economic'], water: ['water', 'energy', 'ghg', 'adapt', 'biodiv', 'pollution', 'access', 'community', 'safety', 'customers'], waste: ['waste', 'ghg', 'pollution', 'chemicals', 'safety', 'community', 'materials', 'labour', 'policy'], renew: ['ghg', 'biodiv', 'community', 'indigenous', 'materials', 'supply', 'rights', 'safety', 'adapt', 'policy'], food: ['ghg', 'water', 'supply', 'rights', 'customers', 'waste', 'materials', 'biodiv', 'safety', 'labour'] };
// every industry has a starting set (extra topics are added once, see uniqSect)
export const SECTOR_TOPICS = Object.fromEntries(Object.entries({
  // Extractives & Minerals
  'Mining & Metals': SECT.heavy, 'Coal Operations': [...SECT.heavy, 'policy'], 'Oil & Gas: Exploration & Production': [...SECT.heavy, 'policy'], 'Oil & Gas: Midstream & Pipelines': [...SECT.heavy, 'policy'], 'Oil & Gas: Refining & Marketing': [...SECT.heavy, 'policy'], 'Oil & Gas: Services': SECT.heavy, 'Construction Materials & Cement': [...SECT.heavy, 'materials'], 'Quarrying & Aggregates': SECT.heavy,
  // Materials & Chemicals
  'Steel Manufacturing': [...SECT.heavy, 'materials'], 'Aluminium & Non-ferrous Metals': [...SECT.heavy, 'materials'], 'Petrochemicals': [...SECT.heavy, 'policy'], 'Chemicals': [...SECT.heavy, 'customers'], 'Fertilisers & Agricultural Chemicals': [...SECT.heavy, 'supply'], 'Plastics & Rubber Products': SECT.make, 'Glass & Ceramics': SECT.make, 'Containers & Packaging': SECT.make, 'Pulp & Paper Products': [...SECT.heavy, 'materials'], 'Forestry & Timber': SP.agri,
  // Energy & Utilities
  'Energy & Utilities': SP.energyU, 'Electric Utilities & Power Generation': SP.energyU, 'Gas Utilities & Distribution': SP.energyU, 'Water Utilities & Services': SP.water, 'Waste Management & Recycling': SP.waste, 'Solar Energy': SP.renew, 'Wind Energy': SP.renew, 'Hydro & Geothermal': SP.renew, 'Biofuels & Bioenergy': [...SP.renew, ...SP.agri], 'Hydrogen & Fuel Cells': SP.renew, 'Oil & Gas Downstream Retail (fuel stations)': [...SECT.transport, 'customers'],
  // Manufacturing & Industrials
  'Manufacturing': SECT.make, 'Industrial Machinery & Equipment': SECT.make, 'Electrical & Electronic Equipment': [...SECT.make, ...SECT.tech], 'Automotive & Auto Parts': [...SECT.make, 'customers'], 'Electric Vehicles & Batteries': [...SECT.make, 'supply'], 'Shipbuilding & Marine Equipment': SECT.make, 'Aviation & Aerospace': SP.avia, 'Defence & Security Equipment': [...SECT.make, 'ethics'], 'Semiconductors': [...SECT.make, ...SECT.tech], 'Textiles & Apparel Manufacturing': [...SECT.make, 'labour'], 'Furniture & Building Products': SECT.make, 'Printing & Publishing': SECT.make,
  // Food, Beverage & Agriculture
  'Agriculture & Farming': SP.agri, 'Livestock & Meat Processing': SP.agri, 'Dairy': SP.agri, 'Fisheries & Aquaculture': SP.agri, 'Palm Oil & Plantations': [...SP.agri, 'indigenous'], 'Food Processing & Manufacturing': SP.food, 'Beverages (non-alcoholic)': SP.food, 'Alcoholic Beverages': SP.food, 'Tobacco': [...SP.food, 'policy'], 'Food Retail & Distribution': SP.retail, 'Restaurants & Food Service': SP.hosp,
  // Transport & Logistics
  'Logistics & Warehousing': SECT.transport, 'Transportation Services': SECT.transport, 'Road Freight & Trucking': SECT.transport, 'Rail Transport': SECT.transport, 'Shipping & Marine Transport': SECT.transport, 'Ports & Terminals': [...SECT.transport, 'community'], 'Airlines': SP.avia, 'Airports': [...SECT.transport, 'community'], 'Courier & Last-mile Delivery': SECT.transport, 'Public Transport & Passenger Services': SECT.transport, 'Car Rental & Leasing': [...SECT.transport, 'customers'],
  // Infrastructure & Real Estate
  'Construction & Engineering': SECT.build, 'Infrastructure Development': SECT.build, 'Engineering & Design Services': [...SECT.services, 'safety'], 'Real Estate & Facilities': SP.realestate, 'Real Estate Development': [...SECT.build, 'customers'], 'Property Management & REITs': SP.realestate, 'Facilities Management & Maintenance': [...SP.realestate, 'safety'], 'Data Centres': [...SECT.tech, 'water'], 'Telecommunications Towers & Networks': [...SECT.tech, 'community'],
  // Technology & Communications
  'IT & Software Services': SECT.tech, 'Software & Cloud (SaaS)': SECT.tech, 'Hardware & Devices': [...SECT.tech, ...SECT.make], 'Telecommunications': [...SECT.tech, 'access'], 'Internet & Digital Media': SECT.tech, 'Media & Entertainment': [...SECT.tech, 'community'], 'E-commerce & Online Marketplaces': [...SP.retail, 'cyber'], 'Fintech & Digital Payments': SP.finance, 'Cyber Security Services': SECT.tech,
  // Consumer Goods & Retail
  'Retail & Wholesale': SP.retail, 'Supermarkets & Grocery': SP.retail, 'Department & Specialty Stores': SP.retail, 'Apparel, Footwear & Accessories': [...SP.retail, 'labour'], 'Household & Personal Products': [...SECT.make, 'customers'], 'Toys & Sporting Goods': [...SECT.make, 'customers'], 'Consumer Electronics Retail': [...SP.retail, 'waste'], 'Luxury Goods & Jewellery': [...SP.retail, 'rights'], 'Cosmetics & Beauty': [...SECT.make, 'customers'],
  // Services
  'Sustainability Consulting': SECT.services, 'Management Consulting': SECT.services, 'Professional Services (Legal, Accounting)': SECT.services, 'Engineering & Technical Consulting': [...SECT.services, 'safety'], 'Marketing & Advertising': [...SECT.services, 'customers'], 'Staffing & Recruitment': [...SECT.services, 'labour'], 'Security Services': [...SECT.services, 'safety'], 'Cleaning & Facility Services': [...SECT.services, 'safety'], 'Hospitality & Tourism': SP.hosp, 'Hotels & Resorts': SP.hosp, 'Travel & Tour Operators': [...SP.hosp, ...SECT.transport], 'Casinos & Gaming': [...SP.hosp, 'ethics'], 'Events & Exhibitions': SP.hosp, 'Sports, Fitness & Recreation': [...SP.hosp, 'wellbeing'],
  // Health & Life Sciences
  'Healthcare Services': SP.health, 'Hospitals & Clinics': SP.health, 'Pharmaceuticals': [...SP.health, 'chemicals'], 'Biotechnology': SP.health, 'Medical Devices & Equipment': [...SP.health, ...SECT.make], 'Aged Care & Disability Services': [...SP.health, 'wellbeing'], 'Health Insurance': [...SP.finance, ...SP.health], 'Laboratories & Diagnostics': SP.health,
  // Financial Services
  'Financial Services': SP.finance, 'Commercial Banking': SP.finance, 'Investment Banking & Brokerage': SP.finance, 'Asset Management & Custody': SP.finance, 'Insurance': [...SP.finance, 'adapt'], 'Islamic Finance': SP.finance, 'Superannuation & Pension Funds': SP.finance, 'Real Estate Finance & Mortgages': SP.finance,
  // Public Sector & Not-for-profit
  'Government & Public Sector': SP.gov, 'Local Government & Councils': [...SP.gov, 'waste'], 'Defence': [...SP.gov, 'safety'], 'Education & Training': SP.edu, 'Universities & Research': [...SP.edu, 'ai'], 'Schools': SP.edu, 'Not-for-profit & Charities': SP.gov, 'International Development & NGOs': [...SP.gov, 'rights'], 'Religious & Community Organisations': SP.gov,
  // Other
  'Conglomerate / Diversified Holdings': [...SECT.services, 'ghg'], 'Other': SECT.services,
}).map(([k, v]) => [k, [...new Set(v)]]));

/* ---------------- 🧮 emission factor sets (indicative defaults: check them against the current official set before you report) ---------------- */
export const FACTOR_SETS = {
  NGA_AU: { label: 'Australia: NGA Factors (DCCEEW)', diesel: 2.71, petrol: 2.33, jet: 2.56, lpg: 1.56, gas: 51.53, elec: 0.66 },
  MY_EC: { label: 'Malaysia: Energy Commission grid (Peninsular 2024), IPCC fuels', diesel: 2.68, petrol: 2.31, jet: 2.55, lpg: 1.61, gas: 56.1, elec: 0.740 },
  SG_EMA: { label: 'Singapore: EMA grid, IPCC fuels', diesel: 2.68, petrol: 2.31, jet: 2.55, lpg: 1.61, gas: 56.1, elec: 0.412 },
  TH_TGO: { label: 'Thailand: TGO', diesel: 2.71, petrol: 2.24, jet: 2.53, lpg: 1.68, gas: 56.1, elec: 0.4999 },
  UK_DESNZ: { label: 'UK: DESNZ / DEFRA conversion factors', diesel: 2.51, petrol: 2.08, jet: 2.54, lpg: 1.56, gas: 50.8, elec: 0.207 },
  US_EPA: { label: 'United States: EPA hub, eGRID', diesel: 2.70, petrol: 2.32, jet: 2.58, lpg: 1.51, gas: 50.3, elec: 0.373 },
  NZ_MFE: { label: 'New Zealand: Ministry for the Environment', diesel: 2.68, petrol: 2.33, jet: 2.53, lpg: 1.60, gas: 54.0, elec: 0.073 },
  EU: { label: 'European Union: average grid, IPCC fuels', diesel: 2.68, petrol: 2.31, jet: 2.55, lpg: 1.61, gas: 56.1, elec: 0.25 },
  IPCC: { label: 'IPCC 2006 defaults (fuels); enter your grid factor', diesel: 2.68, petrol: 2.31, jet: 2.55, lpg: 1.61, gas: 56.1, elec: 0.5 }
};
// 📚 one more set for every grid factor in the library (each country, state and edition), with that country's own fuel factors where the
// library has them and the IPCC defaults otherwise: so the list covers every country in the library, not only the presets above
Object.values(FACTOR_SETS).forEach((x) => { x.group = 'Presets'; });
{ const fuelBy = {}; EF_LIBRARY.filter((x) => x.cat === 'Fuel').forEach((x) => { const f = (fuelBy[x.country] = fuelBy[x.country] || { std: x.std, year: x.year }); f[x.field.split('.')[1]] = x.value; });
  const ip = fuelBy.Global;
  EF_LIBRARY.filter((x) => x.field === 'carbon.fElec').forEach((x) => { const fu = fuelBy[x.country] || ip;
    FACTOR_SETS['LIB_' + x.id] = { label: x.country + (x.region ? ', ' + x.region : '') + ': grid ' + x.std + ' ' + x.year + '; fuels ' + fu.std + (fu === ip ? ' defaults' : ''), group: x.country, diesel: fu.fDiesel, petrol: fu.fPetrol, jet: fu.fJet, lpg: fu.fLpg, gas: fu.fGas, elec: x.value, lib: x.id }; }); }
export const S3_DEFAULTS = { fPurch: 0.35, fFreight: 0.11, fLandfill: 0.46, fRecycled: 0.021, fAir: 0.15, fCar: 0.17, fHotel: 15, fCommute: 0.12, fWater: 0.34 };
// indicative sector intensity (tCO2e of Scope 1 and 2 per million of revenue), for a rough position only
// indicative Scope 1+2 intensity by industry, tCO2e per million of revenue (a rough benchmark to compare against, not a target)
const INTENSITY = { 'Mining & Metals': 600, 'Coal Operations': 1200, 'Oil & Gas: Exploration & Production': 700, 'Oil & Gas: Midstream & Pipelines': 500, 'Oil & Gas: Refining & Marketing': 800, 'Oil & Gas: Services': 300, 'Construction Materials & Cement': 2500, 'Quarrying & Aggregates': 400, 'Steel Manufacturing': 1500, 'Aluminium & Non-ferrous Metals': 1300, 'Petrochemicals': 900, 'Chemicals': 600, 'Fertilisers & Agricultural Chemicals': 1000, 'Plastics & Rubber Products': 350, 'Glass & Ceramics': 600, 'Containers & Packaging': 300, 'Pulp & Paper Products': 700, 'Forestry & Timber': 300, 'Energy & Utilities': 2000, 'Electric Utilities & Power Generation': 2500, 'Gas Utilities & Distribution': 900, 'Water Utilities & Services': 400, 'Waste Management & Recycling': 600, 'Solar Energy': 60, 'Wind Energy': 40, 'Hydro & Geothermal': 60, 'Biofuels & Bioenergy': 300, 'Hydrogen & Fuel Cells': 150, 'Oil & Gas Downstream Retail (fuel stations)': 200, 'Manufacturing': 150, 'Industrial Machinery & Equipment': 120, 'Electrical & Electronic Equipment': 100, 'Automotive & Auto Parts': 150, 'Electric Vehicles & Batteries': 150, 'Shipbuilding & Marine Equipment': 200, 'Aviation & Aerospace': 800, 'Defence & Security Equipment': 100, 'Semiconductors': 250, 'Textiles & Apparel Manufacturing': 200, 'Furniture & Building Products': 150, 'Printing & Publishing': 100, 'Agriculture & Farming': 400, 'Livestock & Meat Processing': 900, 'Dairy': 700, 'Fisheries & Aquaculture': 300, 'Palm Oil & Plantations': 800, 'Food Processing & Manufacturing': 200, 'Beverages (non-alcoholic)': 120, 'Alcoholic Beverages': 120, 'Tobacco': 100, 'Food Retail & Distribution': 60, 'Restaurants & Food Service': 80, 'Logistics & Warehousing': 250, 'Transportation Services': 300, 'Road Freight & Trucking': 600, 'Rail Transport': 300, 'Shipping & Marine Transport': 900, 'Ports & Terminals': 250, 'Airlines': 1200, 'Airports': 150, 'Courier & Last-mile Delivery': 300, 'Public Transport & Passenger Services': 250, 'Car Rental & Leasing': 150, 'Construction & Engineering': 60, 'Infrastructure Development': 90, 'Engineering & Design Services': 15, 'Real Estate & Facilities': 70, 'Real Estate Development': 80, 'Property Management & REITs': 60, 'Facilities Management & Maintenance': 40, 'Data Centres': 600, 'Telecommunications Towers & Networks': 150, 'IT & Software Services': 8, 'Software & Cloud (SaaS)': 8, 'Hardware & Devices': 60, 'Telecommunications': 60, 'Internet & Digital Media': 10, 'Media & Entertainment': 20, 'E-commerce & Online Marketplaces': 30, 'Fintech & Digital Payments': 5, 'Cyber Security Services': 6, 'Retail & Wholesale': 40, 'Supermarkets & Grocery': 60, 'Department & Specialty Stores': 30, 'Apparel, Footwear & Accessories': 60, 'Household & Personal Products': 100, 'Toys & Sporting Goods': 80, 'Consumer Electronics Retail': 30, 'Luxury Goods & Jewellery': 30, 'Cosmetics & Beauty': 80, 'Sustainability Consulting': 5, 'Management Consulting': 6, 'Professional Services (Legal, Accounting)': 5, 'Engineering & Technical Consulting': 10, 'Marketing & Advertising': 8, 'Staffing & Recruitment': 5, 'Security Services': 15, 'Cleaning & Facility Services': 30, 'Hospitality & Tourism': 60, 'Hotels & Resorts': 80, 'Travel & Tour Operators': 60, 'Casinos & Gaming': 40, 'Events & Exhibitions': 40, 'Sports, Fitness & Recreation': 40, 'Healthcare Services': 50, 'Hospitals & Clinics': 60, 'Pharmaceuticals': 80, 'Biotechnology': 40, 'Medical Devices & Equipment': 40, 'Aged Care & Disability Services': 30, 'Health Insurance': 3, 'Laboratories & Diagnostics': 40, 'Financial Services': 3, 'Commercial Banking': 3, 'Investment Banking & Brokerage': 3, 'Asset Management & Custody': 2, 'Insurance': 3, 'Islamic Finance': 3, 'Superannuation & Pension Funds': 2, 'Real Estate Finance & Mortgages': 2, 'Government & Public Sector': 30, 'Local Government & Councils': 40, 'Defence': 80, 'Education & Training': 40, 'Universities & Research': 50, 'Schools': 30, 'Not-for-profit & Charities': 15, 'International Development & NGOs': 15, 'Religious & Community Organisations': 15, 'Conglomerate / Diversified Holdings': 150 };

/* ---------------- 📋 the disclosure index: which data answers which disclosure (for coverage, the content index and the AI) ---------------- */
// [standard, reference, title, fields (any one present = reported, all present = full)]
const DISC = [
  ['IFRS_S2', 'S2 §5-7', 'Climate governance: board and management oversight', ['climate.boardClimate', 'board.susCommittee']], ['IFRS_S2', 'S2 §9-12', 'Climate risks and opportunities', ['climate.risks', 'climate.opps']], ['IFRS_S2', 'S2 §22', 'Climate resilience and scenario analysis', ['climate.scenario']],
  ['IFRS_S2', 'S2 §14', 'Transition plan', ['climate.transition']], ['IFRS_S2', 'S2 §29(a)', 'Scope 1, 2 and 3 GHG emissions', ['carbon.diesel', 'carbon.elec', 'scope3.purch']], ['IFRS_S2', 'S2 §29(g)', 'Internal carbon price', ['climate.carbonPrice']], ['IFRS_S2', 'S2 §33-36', 'Climate targets', ['climate.tgtPct', 'climate.tgtYear']], ['IFRS_S2', 'S2 §29(g)', 'Remuneration linked to climate', ['climate.climatePay']],
  ['IFRS_S1', 'S1 §26-27', 'Governance of sustainability risks and opportunities', ['board.susCommittee', 'ethics.erm']], ['IFRS_S1', 'S1 §28-42', 'Strategy and material sustainability risks', ['mat']], ['IFRS_S1', 'S1 §43-44', 'Risk management', ['ethics.erm']], ['IFRS_S1', 'S1 §45-53', 'Metrics and targets', ['climate.tgtPct', 'workforce.ltifr']],
  ['GRI', 'GRI 2-9', 'Governance structure and composition', ['board.boardSize', 'board.indepPct']], ['GRI', 'GRI 2-11', 'Chair of the highest governance body', ['board.chairSep']], ['GRI', 'GRI 2-12', 'Oversight of the management of impacts', ['board.susCommittee']], ['GRI', 'GRI 2-23', 'Policy commitments', ['ethics.code', 'rights.hrPolicy']],
  ['GRI', 'GRI 2-26', 'Seeking advice and raising concerns', ['ethics.gWhistle']], ['GRI', 'GRI 2-30', 'Collective bargaining agreements', ['workforce.bargain']], ['GRI', 'GRI 3-1/3-2', 'Material topics', ['mat']], ['GRI', 'GRI 205-3', 'Confirmed incidents of corruption', ['ethics.corruptCases']],
  ['GRI', 'GRI 302-1', 'Energy consumption', ['resources.energyMWh', 'carbon.elec']], ['GRI', 'GRI 303-3', 'Water withdrawal', ['resources.waterWd']], ['GRI', 'GRI 304-1', 'Sites in or near protected areas', ['resources.biodiv']], ['GRI', 'GRI 305-1', 'Direct (Scope 1) emissions', ['carbon.diesel', 'carbon.gas']],
  ['GRI', 'GRI 305-2', 'Energy indirect (Scope 2) emissions', ['carbon.elec']], ['GRI', 'GRI 305-3', 'Other indirect (Scope 3) emissions', ['scope3.purch', 'scope3.air']], ['GRI', 'GRI 305-4', 'GHG intensity', ['org.revenue']], ['GRI', 'GRI 306-3', 'Waste generated', ['resources.wasteT']],
  ['GRI', 'GRI 401-1', 'New hires and turnover', ['workforce.hires', 'workforce.leavers']], ['GRI', 'GRI 403-9', 'Work-related injuries', ['workforce.injuries', 'workforce.ltifr']], ['GRI', 'GRI 404-1', 'Training hours', ['workforce.trainHrs']], ['GRI', 'GRI 405-1', 'Diversity of governance bodies and employees', ['workforce.women', 'board.boardWomen']],
  ['GRI', 'GRI 408-1', 'Operations at risk of child labour', ['rights.childLabour']], ['GRI', 'GRI 411-1', 'Rights of Indigenous peoples', ['rights.indigPolicy']], ['GRI', 'GRI 413-1', 'Community engagement and investment', ['community.invest']], ['GRI', 'GRI 414-1', 'Suppliers screened on social criteria', ['community.supAudit']], ['GRI', 'GRI 418-1', 'Customer privacy complaints', ['community.privacyComplaints']],
  ['ESRS', 'ESRS 1/2 IRO-1', 'Double materiality assessment', ['mat']], ['ESRS', 'ESRS 2 GOV-1', 'Role of the board in sustainability', ['board.susCommittee', 'board.boardWomen']], ['ESRS', 'ESRS E1-6', 'Gross Scope 1, 2, 3 and total GHG emissions', ['carbon.diesel', 'carbon.elec', 'scope3.purch']], ['ESRS', 'ESRS E1-1', 'Transition plan for climate change mitigation', ['climate.transition']],
  ['ESRS', 'ESRS E1-5', 'Energy consumption and mix', ['resources.energyMWh', 'resources.renewPct']], ['ESRS', 'ESRS E3', 'Water', ['resources.waterWd']], ['ESRS', 'ESRS E5-5', 'Resource outflows and waste', ['resources.wasteT']], ['ESRS', 'ESRS S1-6/9', 'Own workforce characteristics and diversity', ['workforce.fte', 'workforce.women']],
  ['ESRS', 'ESRS S1-14', 'Health and safety metrics', ['workforce.injuries', 'workforce.deaths']], ['ESRS', 'ESRS S1-16', 'Remuneration and gender pay gap', ['workforce.payGap']], ['ESRS', 'ESRS G1', 'Business conduct and anti-corruption', ['ethics.antiCorrupt', 'ethics.corruptCases']],
  ['TCFD', 'Governance', 'Board oversight and management role', ['climate.boardClimate']], ['TCFD', 'Strategy', 'Risks, opportunities, scenarios', ['climate.risks', 'climate.scenario']], ['TCFD', 'Risk management', 'Identifying and managing climate risk', ['ethics.erm']], ['TCFD', 'Metrics and targets', 'Scope 1, 2, 3 and targets', ['carbon.elec', 'climate.tgtPct']],
  ['BURSA', 'C1', 'Anti-corruption (training, operations assessed, incidents)', ['ethics.abcTrain', 'ethics.corruptCases']], ['BURSA', 'C2', 'Community and society investment', ['community.invest']], ['BURSA', 'C3', 'Diversity (gender, age) of employees and directors', ['workforce.women', 'workforce.a18', 'board.boardWomen']],
  ['BURSA', 'C4', 'Energy management', ['resources.energyMWh', 'carbon.elec']], ['BURSA', 'C5', 'Health and safety (fatalities, LTIR, training)', ['workforce.deaths', 'workforce.ltifr', 'workforce.safetyTrain']], ['BURSA', 'C6', 'Labour practices and standards (training, turnover, complaints)', ['workforce.trainHrs', 'workforce.leavers']],
  ['BURSA', 'C7', 'Supply chain management (local suppliers)', ['community.localPct']], ['BURSA', 'C8', 'Data privacy and security', ['community.privacyComplaints', 'ethics.breaches']], ['BURSA', 'C9', 'Water', ['resources.waterWd']], ['BURSA', 'C10', 'Waste management', ['resources.wasteT', 'resources.divertPct']], ['BURSA', 'C11', 'Emissions management (Scope 1, 2, 3)', ['carbon.diesel', 'carbon.elec', 'scope3.air']],
  ['CDP', 'C1/C4', 'Governance, targets and performance', ['climate.boardClimate', 'climate.tgtPct']], ['CDP', 'C6/C7', 'Emissions data and breakdowns', ['carbon.diesel', 'carbon.elec', 'scope3.purch']], ['CDP', 'W1', 'Water accounting', ['resources.waterWd']],
  ['SASB', 'Industry', 'GHG emissions and energy (most industries)', ['carbon.diesel', 'resources.energyMWh']], ['SASB', 'Industry', 'Workforce health and safety', ['workforce.ltifr']], ['SASB', 'Industry', 'Business ethics', ['ethics.corruptCases']],
  ['AASB_S2', 'AASB S2 §6-9', 'Climate governance', ['climate.boardClimate']], ['AASB_S2', 'AASB S2 §10-22', 'Strategy, scenario analysis and resilience', ['climate.risks', 'climate.scenario']], ['AASB_S2', 'AASB S2 §24-26', 'Risk management', ['ethics.erm']], ['AASB_S2', 'AASB S2 §29', 'Scope 1, 2 and 3 emissions (NGER method allowed)', ['carbon.diesel', 'carbon.elec', 'scope3.purch']], ['AASB_S2', 'AASB S2 §33-36', 'Climate targets', ['climate.tgtPct']],
  ['AASB_S1', 'AASB S1 §26-53', 'Governance, strategy, risk, metrics for other sustainability topics', ['board.susCommittee', 'mat']], ['GHGP', 'Ch 4-8', 'Boundary, Scope 1-2 inventory, base year', ['org.boundary', 'carbon.baseYear']], ['ISO14064', '5-9', 'GHG inventory and quantification', ['carbon.diesel', 'carbon.elec']],
  ['NGER', 'NGER', 'Scope 1, Scope 2 and energy', ['carbon.diesel', 'carbon.elec', 'resources.energyMWh']], ['SGX', 'Climate', 'Climate-related disclosures (ISSB)', ['climate.risks', 'carbon.elec']], ['NZCS', 'NZ CS 1', 'Governance, strategy, risk, metrics and targets', ['climate.boardClimate', 'climate.scenario', 'climate.tgtPct']],
  ['IFRS_S2', 'S2 §36(e)', 'Planned use of carbon credits to meet targets', ['credits']], ['AASB_S2', 'AASB S2 §36(e)', 'Planned use of carbon credits', ['credits']], ['ESRS', 'ESRS E1-7', 'GHG removals and carbon credits', ['credits']], ['ESRS', 'ESRS E1-8', 'Internal carbon pricing', ['climate.carbonPrice']],
  ['CDP', 'C11', 'Carbon pricing (schemes, internal price, credits)', ['pricing', 'climate.carbonPrice', 'credits']], ['GHGP', 'Ch 9', 'Offsets reported separately from the inventory', ['credits']],
  ['TNFD', 'LEAP', 'Nature-related dependencies and impacts', ['resources.biodiv', 'resources.waterStress']], ['SDG', 'SDGs', 'Contribution to the Sustainable Development Goals', ['mat']],
  // 🧭 more standards: each one's disclosures, mapped to the data already collected
  ['SBTI', 'C1-C4', 'Near-term target: Scope 1 and 2 reduction, target year', ['climate.tgtPct', 'climate.tgtYear']], ['SBTI', 'C5', 'Base year and its emissions', ['carbon.baseYear', 'carbon.baseT']], ['SBTI', 'C6-C9', 'Scope 3 screening and target', ['scope3.purch', 'scope3.freight']], ['SBTI', 'NZ', 'Net-zero target and status of validation', ['climate.netZero', 'climate.sbti']], ['SBTI', 'Implementation', 'Transition plan and progress', ['climate.transition']],
  ['ISO14064_2', '§5-6', 'Project baseline, reductions and monitoring', ['avoid']], ['ISO14064_3', '§6', 'Verification or validation of the GHG statement', ['org.assurance', 'org.assurer']], ['ISO14068', '§8-9', 'Reduction plan and residual emissions offset', ['climate.transition', 'credits']],
  ['PCAF', 'Part A', 'Financed emissions (Category 15): needs the financed-emissions inventory, which this report does not collect yet', ['scope3.financed']], ['TPT', 'Framework', 'Transition plan: ambition, actions, accountability', ['climate.transition', 'climate.tgtPct', 'board.execEsg']],
  ['UK_SRS', 'UK SRS S2', 'Climate governance, strategy, risks, metrics and targets', ['climate.boardClimate', 'climate.risks', 'carbon.elec', 'climate.tgtPct']], ['UK_SRS', 'UK SRS S1', 'Other sustainability risks and opportunities', ['mat']],
  ['CSDS', 'CSDS 2', 'Climate-related disclosures', ['climate.boardClimate', 'climate.risks', 'carbon.elec', 'climate.tgtPct']], ['CSDS', 'CSDS 1', 'General sustainability disclosures', ['mat', 'board.susCommittee']],
  ['SSBJ', 'Climate', 'Climate-related disclosures', ['climate.boardClimate', 'climate.risks', 'carbon.elec', 'climate.tgtPct']], ['SSBJ', 'General', 'General disclosures', ['mat']],
  ['CN_CSDS', 'Climate', 'Climate and emissions', ['carbon.elec', 'climate.risks']], ['CN_CSDS', 'Governance', 'Sustainability governance and material topics', ['board.susCommittee', 'mat']],
  ['HKEX', 'Part D', 'Climate-related disclosures', ['climate.risks', 'carbon.elec', 'climate.tgtPct']], ['HKEX', 'Part C', 'Environmental and social KPIs', ['resources.wasteT', 'resources.waterWd', 'workforce.ltifr']],
  ['BRSR', 'Principle 6', 'Environment: energy, emissions, water, waste', ['resources.energyMWh', 'carbon.elec', 'resources.waterWd', 'resources.wasteT']], ['BRSR', 'Principles 3 and 5', 'Employees and human rights', ['workforce.women', 'workforce.ltifr', 'rights.hrPolicy']], ['BRSR', 'Principle 1', 'Ethics and anti-corruption', ['ethics.antiCorrupt', 'ethics.corruptCases']],
  ['OJK', 'POJK 51', 'Sustainability strategy, performance and governance', ['mat', 'carbon.elec', 'board.susCommittee']], ['TH_SEC', '56-1', 'ESG and GHG disclosures', ['carbon.elec', 'workforce.ltifr', 'ethics.antiCorrupt']],
  ['CA_SB253', 'SB 253', 'Scope 1, 2 and 3 emissions', ['carbon.diesel', 'carbon.elec', 'scope3.purch']], ['CA_SB253', 'SB 261', 'Climate-related financial risk report', ['climate.risks', 'climate.scenario']],
  ['EU_TAX', 'Art. 8', 'Taxonomy-aligned turnover, CapEx and OpEx', ['avoid', 'org.revenue']], ['VSME', 'Basic', 'Energy, emissions, workforce and conduct basics', ['resources.energyMWh', 'carbon.elec', 'workforce.fte', 'ethics.corruptCases']], ['IR', 'Content', 'Business model, strategy and value creation', ['org.about', 'mat']],
  ['UNGC', 'CoP', 'Human rights, labour, environment and anti-corruption', ['rights.hrPolicy', 'rights.childLabour', 'resources.iso14001', 'ethics.antiCorrupt']], ['UNGP', 'HRDD', 'Human rights due diligence and grievance', ['rights.hrPolicy', 'rights.modernSlavery', 'community.grievance']],
  ['AU_MSA', 's16', 'Modern slavery risks, actions and effectiveness', ['rights.modernSlavery', 'community.supAudit']], ['ISO20400', 'Procurement', 'Sustainable procurement and supplier assessment', ['community.supAudit', 'community.localPct']], ['ISO26000', 'Core subjects', 'Social responsibility across the core subjects', ['rights.hrPolicy', 'community.invest', 'ethics.code']],
  ['ISO14001', 'Certificate', 'Environmental management system', ['resources.iso14001']], ['ISO50001', 'Energy', 'Energy performance', ['resources.energyMWh', 'resources.renewPct']], ['ISO45001', 'Certificate', 'Health and safety management system', ['certs.iso45001', 'workforce.ltifr']],
  ['TNFD_GRI101', '101-1 to 101-8', 'Biodiversity impacts, sites and supply chain', ['resources.biodiv', 'resources.waterStress']], ['SBTN', 'Steps 1-3', 'Nature targets for freshwater and land', ['resources.waterStress', 'resources.biodiv']],
  ['P5', 'Planet', 'Energy, emissions, water, waste and materials', ['carbon.elec', 'resources.waterWd', 'resources.wasteT']], ['P5', 'People', 'Labour, safety, human rights, community', ['workforce.ltifr', 'rights.hrPolicy', 'community.invest']], ['P5', 'Prosperity', 'Economic value and business agility', ['org.revenue', 'ethics.erm']],
  ['PAS2080', 'Whole life', 'Whole-life carbon management and reduction', ['carbon.baseT', 'climate.tgtPct', 'scope3.purch']], ['ISC_IS', 'Rating', 'Energy and carbon, resources, people and governance', ['carbon.elec', 'resources.wasteT', 'workforce.ltifr']],
  ['GREENSTAR', 'Rating', 'Energy, water and materials in buildings', ['resources.energyMWh', 'resources.waterWd', 'resources.renewPct']], ['NABERS', 'Rating', 'Measured energy and water use', ['resources.energyMWh', 'resources.waterWd']], ['LEED', 'Rating', 'Energy, water, materials and indoor quality', ['resources.energyMWh', 'resources.waterWd']],
  ['ENVISION', 'Rating', 'Quality of life, leadership, resources, natural world, climate', ['community.invest', 'resources.biodiv', 'climate.risks']], ['IFC_PS', 'PS1-PS8', 'Environmental and social risk management for the project', ['climate.risks', 'workforce.ltifr', 'resources.biodiv', 'rights.indigPolicy']], ['EQUATOR', 'EP4', 'Environmental and social assessment, climate risk and human rights', ['climate.risks', 'rights.hrPolicy']],
  ['GRESB', 'Assessment', 'Management, performance and development of real assets', ['resources.energyMWh', 'carbon.elec', 'resources.waterWd']], ['ECOVADIS', 'Themes', 'Environment, labour and human rights, ethics, procurement', ['resources.iso14001', 'rights.hrPolicy', 'ethics.code', 'community.supAudit']],
  ['BCORP', 'Impact', 'Governance, workers, community, environment, customers', ['board.execEsg', 'workforce.payGap', 'community.invest', 'carbon.elec']], ['WEF_SCM', 'Core', 'Governance, planet, people, prosperity metrics', ['board.indepPct', 'carbon.elec', 'workforce.ltifr', 'org.revenue']], ['ISSA5000', 'Assurance', 'Assurance of the sustainability information', ['org.assurance', 'org.assurer']]
];
export const DISCLOSURES = DISC.map((d, i) => ({ id: 'D' + (i + 1), std: d[0], ref: d[1], title: d[2], fields: d[3] }));

/* ---------------- 🌱 carbon avoidance: emissions avoided by the organisation's projects and solutions (WBCSD Guidance on Avoided Emissions, 2023) ---------------- */
// Reported beside the Scope 1-3 inventory, never netted against it. Avoided = quantity × (baseline factor − solution factor) × attribution share.
// Carbon credits retired are a separate register (avoidance and removal credits are not the same as avoided emissions).
export const AVOID_CATS = ['Renewable energy', 'Energy efficiency', 'Fleet electrification and low-emission transport', 'Circularity and recycling', 'Product or service that cuts customer emissions', 'Process and fuel switching', 'Nature-based solutions', 'Other'];
export const AVOID_STATUS = ['Planned', 'Under way', 'Delivered'], AVOID_VERIFY = ['Estimate', 'Internal review', 'Third-party verified'];
export const CREDIT_TYPES = ['Avoidance credit', 'Removal credit (nature-based)', 'Removal credit (technological)'];
// typical starting points (indicative; set the baseline from your grid or the product you replace)
export const AVOID_TEMPLATES = [
  { name: 'Rooftop solar', cat: 'Renewable energy', unit: 'MWh', base: 660, sol: 0, baseline: 'Grid electricity' },
  { name: 'LED lighting and building efficiency', cat: 'Energy efficiency', unit: 'MWh saved', base: 660, sol: 0, baseline: 'Previous electricity use' },
  { name: 'Electric delivery vehicles', cat: 'Fleet electrification and low-emission transport', unit: 'km', base: 0.85, sol: 0.21, baseline: 'Diesel truck per km (charged on the grid)' },
  { name: 'Recycling instead of landfill', cat: 'Circularity and recycling', unit: 't', base: 460, sol: 21, baseline: 'Waste to landfill' },
  { name: 'Low-carbon freight service for customers', cat: 'Product or service that cuts customer emissions', unit: 'tonne-km', base: 0.11, sol: 0.06, baseline: 'Customer\'s conventional freight' }
];
function cleanAvoid(L) {
  return arr(L, 60).map((x) => { x = x && typeof x === 'object' ? x : {}; const q = num(x.qty), b = num(x.base), s0 = num(x.sol), at = num(x.attr);
    return { id: str(x.id, 20).replace(/[^A-Za-z0-9]/g, '') || uid(), name: str(x.name, 120), cat: AVOID_CATS.includes(x.cat) ? x.cat : 'Other', baseline: str(x.baseline, 240), unit: str(x.unit, 30), qty: q, base: b, sol: s0, attr: at == null ? 100 : Math.max(0, Math.min(100, at)),
      status: AVOID_STATUS.includes(x.status) ? x.status : 'Delivered', verify: AVOID_VERIFY.includes(x.verify) ? x.verify : 'Estimate', sdg: str(x.sdg, 60), note: str(x.note, 400) }; }).filter((x) => x.name);
}
function cleanCredits(L) {
  return arr(L, 40).map((x) => { x = x && typeof x === 'object' ? x : {};
    return { id: str(x.id, 20).replace(/[^A-Za-z0-9]/g, '') || uid(), project: str(x.project, 140), type: CREDIT_TYPES.includes(x.type) ? x.type : 'Avoidance credit', registry: str(x.registry, 60), vintage: str(x.vintage, 10), t: num(x.t), cost: num(x.cost), purpose: str(x.purpose, 200),
      std: CREDIT_STANDARDS.includes(x.std) ? x.std : '', ccp: ['Yes', 'No', 'Unknown'].includes(x.ccp) ? x.ccp : 'Unknown', ca: ['Yes', 'No', 'Not needed', 'Unknown'].includes(x.ca) ? x.ca : 'Unknown', use: CREDIT_USES.includes(x.use) ? x.use : 'Not decided', scheme: str(x.scheme, 20) }; }).filter((x) => x.project);
}
export function avoided(e) {
  const items = (e.avoid || []).map((x) => { const v = x.qty != null && x.base != null ? (x.qty * (x.base - (x.sol || 0)) / 1000) * (x.attr == null ? 1 : x.attr / 100) : null; return { ...x, t: v == null ? null : r2(v, 2) }; });
  const by = (f) => { const o = {}; items.forEach((x) => { if (x.t != null) o[x[f]] = r2((o[x[f]] || 0) + x.t, 2); }); return o; };
  const delivered = items.filter((x) => x.status === 'Delivered' && x.t != null).reduce((a, x) => a + x.t, 0), all = items.reduce((a, x) => a + (x.t || 0), 0);
  const cr = e.credits || [], creditsT = cr.reduce((a, x) => a + (x.t || 0), 0), removalT = cr.filter((x) => /^Removal/.test(x.type)).reduce((a, x) => a + (x.t || 0), 0);
  return { items, total: r2(all, 2), delivered: r2(delivered, 2), planned: r2(all - delivered, 2), byCat: by('cat'), byStatus: by('status'), verified: r2(items.filter((x) => x.verify === 'Third-party verified').reduce((a, x) => a + (x.t || 0), 0), 2), credits: r2(creditsT, 2), removals: r2(removalT, 2), n: items.length };
}

/* ---------------- normalise what is saved ---------------- */
function cleanSection(sec, v) {
  const s = SECTIONS.find((x) => x.id === sec), o = {}; if (!s) return o; v = v && typeof v === 'object' ? v : {};
  s.fields.forEach(([k, , t, opts]) => {
    const x = v[k];
    if (t === 'n' || t === 'p') { const n = num(x); if (n != null) o[k] = k === 'payGap' ? Math.max(-100, Math.min(100, n)) : t === 'p' ? Math.max(0, Math.min(100, n)) : Math.max(-1e12, Math.min(1e12, n)); }
    else if (t === 's' || t === 'y') { if (k === 'fset') { if (FACTOR_SETS[x]) o[k] = x; } else if ((opts || []).includes(x)) o[k] = x; }
    else if (t === 'd') { if (/^\d{4}-\d{2}-\d{2}$/.test(String(x || ''))) o[k] = x; }
    else { const t2 = str(x, t === 'l' ? 3000 : 200); if (t2) o[k] = t2; }
  });
  return o;
}
const RATE = ['', 'Low', 'Medium', 'High', 'Very high'];
function cleanMat(m) { const o = {}; TOPICS.forEach(([k]) => { const x = (m || {})[k]; if (!x) return; const imp = Math.max(0, Math.min(4, Math.round(Number(x.imp) || 0))), fin = Math.max(0, Math.min(4, Math.round(Number(x.fin) || 0)));
  const d = { imp, fin, note: str(x.note, 300), kind: arr(x.kind, 6).map(String).filter((v) => IRO_KINDS.includes(v)), horizon: HORIZONS.includes(x.horizon) ? x.horizon : '', who: str(x.who, 200), action: str(x.action, 300) };
  if (imp || fin || d.note || d.kind.length || d.horizon || d.who || d.action) o[k] = d; }); return o; }   // a topic with details is kept when its ratings are cleared
/* ---------------- 💱 carbon pricing, border adjustments and the carbon credit framework (status checked November 2026; see docs/ESG-REGISTRY.md §7a) ---------------- */
// kind: Carbon price (a tax or an ETS on your own emissions) · Border adjustment (a charge on embedded emissions of imports) · Crediting (who issues credits) · Integrity (how to judge and claim credits)
export const CARBON_SCHEMES = [
  { id: 'EU_CBAM', kind: 'Border adjustment', region: 'European Union', name: 'EU Carbon Border Adjustment Mechanism (CBAM)', status: 'Definitive regime since 1 January 2026',
    note: 'Iron and steel, aluminium, cement, fertilisers, hydrogen and electricity imported into the EU. Importers above 50 tonnes a year must be authorised declarants. Certificates are priced on EU ETS auctions (quarterly average in 2026, weekly from 2027); sales open 1 February 2027 and the first declaration and surrender for 2026 imports is due 30 September 2027. A carbon price paid in the country of origin can be deducted.', credits: 'No offsets; only a carbon price effectively paid at origin reduces the charge.' },
  { id: 'UK_CBAM', kind: 'Border adjustment', region: 'United Kingdom', name: 'UK Carbon Border Adjustment Mechanism', status: 'Starts 1 January 2027 (no transitional period)',
    note: 'A tax on the embodied direct emissions of aluminium, cement, fertiliser, hydrogen, and iron and steel goods imported into the UK; electricity and indirect emissions are out of scope at the start. First accounting period is calendar 2027, with the return and payment due 31 May 2028, then quarterly.', credits: 'No offsets; relief for carbon prices paid overseas.' },
  { id: 'EU_ETS', kind: 'Carbon price', region: 'European Union', name: 'EU Emissions Trading System', status: 'In force', note: 'Cap-and-trade for power, industry, aviation and maritime in the EU; sets the price used for CBAM certificates.', credits: 'No international credits.' },
  { id: 'UK_ETS', kind: 'Carbon price', region: 'United Kingdom', name: 'UK Emissions Trading Scheme', status: 'In force', note: 'Cap-and-trade for power, industry and aviation; the reference for the UK CBAM rate.', credits: 'No international credits.' },
  { id: 'AU_SGM', kind: 'Carbon price', region: 'Australia', name: 'Safeguard Mechanism (baselines, ACCUs and SMCs)', status: 'In force; 2026-27 review under way',
    note: 'Facilities over 100,000 tCO2e of Scope 1 have production-adjusted baselines that decline 4.9% a year to 2030. Emissions above the baseline are covered by surrendering ACCUs or Safeguard Mechanism Credits (SMCs); facilities below earn SMCs. Data comes from NGER.', credits: 'ACCUs and SMCs (domestic).' },
  { id: 'SG_TAX', kind: 'Carbon price', region: 'Singapore', name: 'Singapore carbon tax and International Carbon Credit framework', status: 'S$45/tCO2e for 2026 and 2027',
    note: 'Facilities emitting 25,000 tCO2e or more. The rate rose from S$25 to S$45 per tonne in 2026, heading for S$50-80 by 2030.', credits: 'Eligible international carbon credits (from countries with an implementation agreement, with corresponding adjustments) for up to 5% of taxable emissions; unused 2025 quota carried into 2026.' },
  { id: 'MY_TAX', kind: 'Carbon price', region: 'Malaysia', name: 'Malaysia carbon tax and National Carbon Market Policy', status: 'Carbon tax deferred (October 2026); Climate Change Bill pending',
    note: 'Announced for iron and steel and energy from 2026, now deferred until the policy and enforcement framework (Climate Change Act) is in place. The National Carbon Market Policy was launched in April 2026; Bursa Carbon Exchange (BCX) trades voluntary credits, with nature-based supply from the Malaysia Forest Fund.', credits: 'Domestic credit verification under the National Carbon Market Policy; BCX contracts.' },
  { id: 'JP_GXETS', kind: 'Carbon price', region: 'Japan', name: 'Japan GX-ETS', status: 'Mandatory from April 2026 (Phase 2, FY2026-2032)', note: 'Companies over 100,000 tCO2e of Scope 1; first allocations in 2027, with a price floor and ceiling.', credits: 'J-Credits and JCM credits for up to 10% of emissions.' },
  { id: 'CN_ETS', kind: 'Carbon price', region: 'China', name: 'China national ETS', status: 'In force; expanding beyond power', note: 'Intensity-based ETS for power, being extended to steel, cement and aluminium.', credits: 'CCER (domestic) within limits.' },
  { id: 'CORSIA', kind: 'Carbon price', region: 'International aviation', name: 'ICAO CORSIA', status: 'First phase 2024-2026', note: 'Airlines offset growth in international aviation emissions above the baseline.', credits: 'CORSIA-eligible emissions units (with host-country letters of authorisation).' },
  { id: 'ART62', kind: 'Crediting', region: 'Paris Agreement', name: 'Article 6.2 cooperative approaches (ITMOs)', status: 'Operating bilaterally', note: 'Countries trade authorised mitigation outcomes with corresponding adjustments, for example Singapore and Japan (JCM) with host countries.', credits: 'ITMOs with corresponding adjustments.' },
  { id: 'ART64', kind: 'Crediting', region: 'Paris Agreement', name: 'Article 6.4 Paris Agreement Crediting Mechanism (PACM)', status: 'First credits approved February 2026', note: 'The UN-supervised mechanism replacing the CDM; issues A6.4ERs, authorised or as mitigation contributions.', credits: 'A6.4ERs.' },
  { id: 'ACCU', kind: 'Crediting', region: 'Australia', name: 'ACCU Scheme (Clean Energy Regulator)', status: 'In force', note: 'Australian Carbon Credit Units from registered projects under approved methods.', credits: 'ACCUs.' },
  { id: 'VCS', kind: 'Crediting', region: 'Global', name: 'Verra VCS, Gold Standard and other independent standards', status: 'In force', note: 'The main voluntary crediting programmes; check the ICVCM CCP label on the methodology.', credits: 'VCUs, GS VERs and others.' },
  { id: 'ICVCM', kind: 'Integrity', region: 'Global', name: 'ICVCM Core Carbon Principles (CCP label)', status: 'Assessing programmes and methodologies', note: 'A quality threshold for credits: additionality, permanence, robust quantification, no double counting, safeguards.', credits: 'Prefer CCP-labelled credits.' },
  { id: 'VCMI', kind: 'Integrity', region: 'Global', name: 'VCMI Claims Code of Practice', status: 'In force', note: 'How a company may claim credit use (Silver, Gold, Platinum) once it is on track with science-based targets; Scope 3 Action claim.', credits: 'High-quality credits beyond the value chain.' },
  { id: 'SBTI', kind: 'Integrity', region: 'Global', name: 'SBTi Corporate Net-Zero Standard V2.0', status: 'Published June 2026; targets under V2 from 2027', note: 'Credits complement, never replace, reductions: an ongoing emissions responsibility for unabated emissions, and removals to neutralise residual emissions at net zero.', credits: 'Removals for residual emissions; credits for ongoing emissions responsibility.' },
  { id: 'ISO14068', kind: 'Integrity', region: 'Global', name: 'ISO 14068-1 Carbon neutrality', status: 'In force', note: 'Rules for carbon-neutral claims: reductions first, then offsetting with credits that meet quality criteria.', credits: 'Credits meeting the standard’s quality criteria.' }
];
// the EU CBAM factor: the share of embedded emissions that needs certificates as EU ETS free allocation is phased out (Directive 2003/87/EC Art 10a(1a))
export const CBAM_FACTOR = { 2026: 2.5, 2027: 5, 2028: 10, 2029: 22.5, 2030: 48.5, 2031: 61, 2032: 73.5, 2033: 86, 2034: 100 };
export const CBAM_GOODS = ['Iron and steel', 'Aluminium', 'Cement', 'Fertilisers', 'Hydrogen', 'Electricity'];
export const CREDIT_STANDARDS = ['Verra VCS', 'Gold Standard', 'ACCU (Australia)', 'Article 6.4 PACM (A6.4ER)', 'Article 6.2 ITMO', 'J-Credit', 'JCM', 'Global Carbon Council', 'Puro.earth', 'Isometric', 'Bursa Carbon Exchange listing', 'Other'];
export const CREDIT_USES = ['Compliance (carbon tax or ETS)', 'Ongoing emissions responsibility (contribution)', 'Neutralise residual emissions (net zero)', 'Carbon-neutral claim (ISO 14068-1)', 'Not decided'];
const YNU = ['Yes', 'No', 'Unknown'], CA = ['Yes', 'No', 'Not needed', 'Unknown'], SV = ['Actual (verified)', 'Default values'];
const SCHEME_IDS = new Set(CARBON_SCHEMES.map((x) => x.id));
function cleanPricing(p) {
  p = p && typeof p === 'object' ? p : {};
  return { schemes: arr(p.schemes, 20).map(String).filter((x) => SCHEME_IDS.has(x)), euaPrice: num(p.euaPrice), ukRate: num(p.ukRate),
    cbam: arr(p.cbam, 40).map((x) => { x = x && typeof x === 'object' ? x : {}; return { id: str(x.id, 20).replace(/[^A-Za-z0-9]/g, '') || uid(), market: x.market === 'UK' ? 'UK' : 'EU', good: CBAM_GOODS.includes(x.good) ? x.good : 'Iron and steel', cn: str(x.cn, 20), dest: str(x.dest, 80),
      tonnes: num(x.tonnes), see: num(x.see), bench: num(x.bench), paid: num(x.paid), sv: SV.includes(x.sv) ? x.sv : 'Default values', note: str(x.note, 300) }; }).filter((x) => x.tonnes != null || x.cn || x.dest),
    exp: arr(p.exp, 20).map((x) => { x = x && typeof x === 'object' ? x : {}; return { id: str(x.id, 20).replace(/[^A-Za-z0-9]/g, '') || uid(), scheme: SCHEME_IDS.has(x.scheme) ? x.scheme : '', site: str(x.site, 120), covered: num(x.covered), baseline: num(x.baseline), price: num(x.price), cur: str(x.cur, 6) || 'AUD', offsetPct: num(x.offsetPct), note: str(x.note, 300) }; }).filter((x) => x.site || x.covered != null) };
}
// what the carbon prices cost, what CBAM exposes, and how strong the credits are
export function pricing(e, em) {
  const p = e.pricing || {}, eua = p.euaPrice, uk = p.ukRate;
  const yr0 = Number(String((e.org || {}).year || '').match(/\d{4}/) || 0) || new Date().getFullYear(), fac = yr0 >= 2034 ? 100 : CBAM_FACTOR[yr0] || (yr0 < 2026 ? 0 : 100);
  // EU: certificates = embedded − the free allocation adjustment (benchmark × the free allocation still given); UK: tax on embedded direct emissions; both less any carbon price paid at origin
  const cb = (p.cbam || []).map((x) => { const emb = x.tonnes != null && x.see != null ? x.tonnes * x.see : null, rate = x.market === 'UK' ? uk : eua;
    const adj = x.market === 'EU' && emb != null && x.bench != null ? Math.min(emb, x.tonnes * x.bench * (1 - fac / 100)) : 0, liable = emb == null ? null : emb - adj;
    const cost = liable != null && rate != null ? liable * Math.max(0, rate - (x.paid || 0)) : null; return { ...x, emb: r2(emb, 1), adj: r2(adj, 1), liable: r2(liable, 1), rate, cost: r2(cost, 0), cur: x.market === 'UK' ? 'GBP' : 'EUR' }; });
  const sum = (L, k, f) => r2(L.filter(f || (() => true)).reduce((a, x) => a + (x[k] || 0), 0), 0);
  const ex = (p.exp || []).map((x) => { const liable = x.baseline != null && x.covered != null ? Math.max(0, x.covered - x.baseline) : x.covered; const net = liable != null && x.price != null ? liable * x.price * (1 - Math.min(100, x.offsetPct || 0) / 100) : null; return { ...x, liable: r2(liable, 0), cost: r2(net, 0) }; });
  const icp = (e.climate || {}).carbonPrice, shadow = icp != null && em ? r2(((em.s1t || 0) + (em.s2loc || 0)) * icp, 0) : null;
  const yr = Number(String((e.org || {}).year || '').match(/\d{4}/) || 0) || new Date().getFullYear();
  const cr = (e.credits || []).map((x) => { const flags = [];
    if (x.ccp !== 'Yes') flags.push('No ICVCM CCP label confirmed');
    if (/Compliance|Neutralise/.test(x.use || '') && x.ca !== 'Yes' && x.ca !== 'Not needed') flags.push('No corresponding adjustment confirmed');
    if (/Neutralise/.test(x.use || '') && !/^Removal/.test(x.type)) flags.push('Only removal credits can neutralise residual emissions');
    if (Number(x.vintage) && yr - Number(x.vintage) > 5) flags.push('Vintage more than five years old');
    if (!x.registry) flags.push('Registry not recorded');
    return { ...x, flags, quality: Math.max(0, 100 - flags.length * 25) }; });
  const credT = cr.reduce((a, x) => a + (x.t || 0), 0), hiQ = cr.filter((x) => !x.flags.length).reduce((a, x) => a + (x.t || 0), 0);
  return { schemes: p.schemes || [], eua, uk, cbamYear: yr0, cbamFactor: fac, cbam: cb, cbamEU: sum(cb, 'cost', (x) => x.cur === 'EUR'), cbamUK: sum(cb, 'cost', (x) => x.cur === 'GBP'), cbamEmb: sum(cb, 'emb'), exp: ex, shadow, icp,
    credits: cr, creditT: r2(credT, 0), highQualityPct: credT ? Math.round(hiQ / credT * 100) : null, byUse: cr.reduce((a, x) => { a[x.use || 'Not decided'] = r2((a[x.use || 'Not decided'] || 0) + (x.t || 0), 0); return a; }, {}) };
}
/* ---------------- 🧾 electricity bills: the evidence behind Scope 2 (read by the AI from the bill, checked by the user) ---------------- */
function cleanBills(L) {
  const seen = new Set();
  return arr(L, 400).map((x) => { x = x && typeof x === 'object' ? x : {}; let id = str(x.id, 20).replace(/[^A-Za-z0-9]/g, ''); if (!id || seen.has(id)) id = uid(); seen.add(id);
    return { id, file: str(x.file, 120), supplier: str(x.supplier, 80), site: str(x.site, 120), meter: str(x.meter, 40), from: /^\d{4}-\d{2}-\d{2}$/.test(String(x.from || '')) ? x.from : '', to: /^\d{4}-\d{2}-\d{2}$/.test(String(x.to || '')) ? x.to : '',
      kwh: num(x.kwh), green: num(x.green), cost: num(x.cost), cur: str(x.cur, 6), note: str(x.note, 200) }; }).filter((x) => x.kwh != null || x.supplier || x.file);
}
export function billsSum(e) {
  const L = e.bills || [], kwh = L.reduce((a, x) => a + (x.kwh || 0), 0), green = L.reduce((a, x) => a + (x.green || 0), 0), cost = L.reduce((a, x) => { if (x.cost != null) { const k = x.cur || 'unknown currency'; a[k] = r2((a[k] || 0) + x.cost, 2); } return a; }, {});   // costs are added per currency, never across
  const days = L.reduce((a, x) => a + (x.from && x.to ? Math.max(0, (Date.parse(x.to) - Date.parse(x.from)) / 864e5 + 1) : 0), 0);
  return { n: L.length, mwh: r2(kwh / 1000, 3), greenMwh: r2(green / 1000, 3), cost, days: Math.round(days), sites: [...new Set(L.map((x) => x.site).filter(Boolean))].length };
}
// where each emission factor came from: { 'carbon.fElec': { id: 'EF12', label: 'NGA 2025-26 · New South Wales', value: 0.64 } } (only for the factor fields)
const EF_FIELDS = new Set(['carbon.fDiesel', 'carbon.fPetrol', 'carbon.fJet', 'carbon.fLpg', 'carbon.fGas', 'carbon.fElec', 'carbon.refGwp', 'scope3.fPurch', 'scope3.fFreight', 'scope3.fLandfill', 'scope3.fRecycled', 'scope3.fAir', 'scope3.fCar', 'scope3.fHotel', 'scope3.fCommute', 'scope3.fWater']);
function cleanEfSrc(o) { const out = {}; if (o && typeof o === 'object') Object.keys(o).slice(0, 30).forEach((k) => { const x = o[k]; if (EF_FIELDS.has(k) && x && typeof x === 'object') out[k] = { id: str(x.id, 12), label: str(x.label, 200), value: num(x.value) }; }); return out; }
// ids must be unique in a list (lists are edited by id): a repeated id gets a new one
const uniqIds = (L) => { const seen = new Set(L.map((x) => x.id).filter(Boolean)), done = new Set(); L.forEach((x) => { if (!x.id || done.has(x.id)) { let n; do n = uid(); while (seen.has(n)); x.id = n; seen.add(n); } done.add(x.id); }); return L; };
export function clean(e) {
  e = e && typeof e === 'object' ? e : {};
  const out = { std: arr(e.std, 80).map(String).filter((s) => STD_IDS.has(s)), mat: cleanMat(e.mat), avoid: uniqIds(cleanAvoid(e.avoid)), credits: uniqIds(cleanCredits(e.credits)), pricing: (() => { const P = cleanPricing(e.pricing); uniqIds(P.cbam); uniqIds(P.exp); return P; })(), bills: cleanBills(e.bills), efsrc: cleanEfSrc(e.efsrc) };
  SECTIONS.forEach((s) => { out[s.id] = cleanSection(s.id, e[s.id]); });
  // a source record only stands while the field still holds its value (an import or a typed value replaces it)
  Object.keys(out.efsrc).forEach((fk) => { const [sec, key] = fk.split('.'), cur = (out[sec] || {})[key], src = out.efsrc[fk]; if (!(cur == null ? src.value == null : Number(cur) === Number(src.value))) delete out.efsrc[fk]; });
  return out;
}

/* ---------------- 🧮 the numbers ---------------- */
const has = (v) => v != null && v !== '';
function emissions(e) {
  const c = e.carbon || {}, s3 = e.scope3 || {}, set = FACTOR_SETS[c.fset] || FACTOR_SETS.IPCC;
  const f = (k, d) => (has(c[k]) ? c[k] : d), g = (k) => (has(s3[k]) ? s3[k] : S3_DEFAULTS[k]);
  const kgT = (q, fac) => (has(q) ? (q * fac) / 1000 : null);
  const s1 = { diesel: kgT(c.diesel, f('fDiesel', set.diesel)), petrol: kgT(c.petrol, f('fPetrol', set.petrol)), jet: kgT(c.jet, f('fJet', set.jet)), lpg: kgT(c.lpg, f('fLpg', set.lpg)), gas: kgT(c.gas, f('fGas', set.gas)), refrig: kgT(c.refrig, has(c.refGwp) ? c.refGwp : 1924) };
  const elecF = f('fElec', set.elec), s2loc = has(c.elec) ? (c.elec * 1000 * elecF) / 1000 : null, s2mkt = has(c.elec) ? (Math.max(0, c.elec - (c.green || 0)) * 1000 * elecF) / 1000 : null;
  const s3c = { purch: has(s3.purch) ? s3.purch * g('fPurch') : null, freight: kgT(s3.freight, g('fFreight')), landfill: has(s3.landfill) ? s3.landfill * g('fLandfill') : null, recycled: has(s3.recycled) ? s3.recycled * g('fRecycled') : null,
    air: kgT(s3.air, g('fAir')), car: kgT(s3.car, g('fCar')), hotel: kgT(s3.hotel, g('fHotel')), commute: kgT(s3.commute, g('fCommute')), water: kgT(s3.water, g('fWater')) };
  const sum = (o) => Object.values(o).reduce((a, v) => a + (v || 0), 0), anyOf = (o) => Object.values(o).some((v) => v != null);
  const S1 = anyOf(s1) ? sum(s1) : null, S3 = anyOf(s3c) ? sum(s3c) : null, total = S1 == null && s2loc == null && S3 == null ? null : (S1 || 0) + (s2loc || 0) + (S3 || 0);   // nothing measured is not zero
  const rev = (e.org || {}).revenue, fte = (e.workforce || {}).fte || (e.org || {}).employees;
  // energy: what was entered, or fuels and electricity converted to MWh (GJ = L × energy content)
  const ec = { diesel: 0.0386, petrol: 0.0342, jet: 0.0367, lpg: 0.0257 }, gj = ['diesel', 'petrol', 'jet', 'lpg'].reduce((a, k) => a + (c[k] || 0) * ec[k], 0) + (c.gas || 0);
  const energy = has((e.resources || {}).energyMWh) ? e.resources.energyMWh : (gj || c.elec ? r2(gj / 3.6 + (c.elec || 0), 1) : null);
  const s12 = S1 == null && s2loc == null ? null : (S1 || 0) + (s2loc || 0), base = c.baseT, bench = INTENSITY[(e.org || {}).industry];
  return { s1: Object.fromEntries(Object.entries(s1).map(([k, v]) => [k, r2(v, 3)])), s1t: r2(S1, 3), s2loc: r2(s2loc, 3), s2mkt: r2(s2mkt, 3), s3: Object.fromEntries(Object.entries(s3c).map(([k, v]) => [k, r2(v, 3)])), s3t: r2(S3, 3), total: r2(total, 3), s12: r2(s12, 3),
    intensity: rev && s12 != null ? r2(s12 / rev, 2) : null, perFte: fte && total != null ? r2(total / fte, 2) : null, bench: bench || null, vsBench: rev && bench && s12 != null ? r2((s12 / rev / bench - 1) * 100, 1) : null, energy, elecFactor: elecF, set: c.fset || 'IPCC', setLabel: set.label,
    vsBase: base > 0 && s12 != null ? r2((s12 / base - 1) * 100, 1) : null, cars: total == null ? null : r2(total / 4.6, 1) };
}
const yes = (v) => v === 'Yes' || v === 'Certified' || v === 'Validated' || v === 'Integrated' || v === 'Formal' || v === 'Deployed' || v === 'Formal and published';
const part = (v) => v === 'Partly' || v === 'Committed' || v === 'Working towards it' || v === 'Basic' || v === 'Manual';
const pts = (v, full, half) => (yes(v) ? full : part(v) ? (half == null ? full / 2 : half) : 0);
// Environment maturity (out of 100): measured, managed, performing, planning for climate
function envScore(e, em) {
  const c = e.carbon || {}, s3 = e.scope3 || {}, r = e.resources || {}, k = e.climate || {}; let p = 0; const why = [];
  const s3n = ['purch', 'freight', 'landfill', 'air', 'car', 'hotel', 'commute', 'water'].filter((x) => has(s3[x])).length;
  p += em.s1t != null ? 12 : 0; p += em.s2loc != null ? 8 : 0; p += Math.min(10, s3n * 2); p += c.fset ? 3 : 0; p += has(c.baseYear) && has(c.baseT) ? 4 : 0;   // measured (37)
  p += has(r.waterWd) ? 4 : 0; p += has(r.wasteT) ? 4 : 0; p += pts(r.iso14001, 5, 2); p += has(r.envFines) && !r.envFines ? 3 : 0;   // managed (16)
  if (em.vsBench != null) p += em.vsBench <= -50 ? 15 : em.vsBench <= -30 ? 12 : em.vsBench <= 0 ? 9 : em.vsBench <= 30 ? 5 : 2;   // performing (15 + 7)
  p += Math.min(7, (r.renewPct || 0) / 100 * 7);
  p += has(k.tgtPct) && has(k.tgtYear) ? 6 : 0; p += has(k.netZero) ? 3 : 0; p += pts(k.sbti, 4, 2); p += pts(k.scenario, 4); p += pts(k.transition, 4); p += pts(k.boardClimate, 4);   // climate (25)
  if (em.vsBench == null) why.push('Add revenue and the industry to compare emissions intensity with the sector.');
  if (!s3n) why.push('No Scope 3 categories yet: start with purchases, travel and waste.');
  if (!has(k.tgtPct)) why.push('No emissions reduction target yet.');
  return { score: Math.round(Math.min(100, p)), why };
}
// Social (out of 100): from the GKH Social Intelligence tool, with women in management measured against management (not the whole workforce)
function socScore(e) {
  const w = e.workforce || {}, h = e.rights || {}, m = e.community || {}; let core = 0, opt = 0; const why = [];
  const wp = w.fte ? (w.women || 0) / w.fte * 100 : null, mp = w.mgmt ? (w.womenMgmt || 0) / w.mgmt * 100 : null;
  core += wp == null ? 0 : wp >= 40 ? 8 : wp >= 25 ? 6 : wp >= 12 ? 3 : 1; core += mp == null ? 0 : mp >= 40 ? 7 : mp >= 25 ? 5 : mp >= 12 ? 2 : 1;
  core += has(w.safetyTrain) ? (w.safetyTrain >= 95 ? 7 : w.safetyTrain >= 80 ? 5 : w.safetyTrain >= 60 ? 2 : 0) : 0;
  core += has(w.ltifr) ? (w.ltifr <= 0.5 ? 7 : w.ltifr <= 1.2 ? 5 : w.ltifr <= 2 ? 3 : 1) : 0;
  core -= (w.deaths || 0) > 0 ? 6 : 0; core -= Math.min(3, Math.floor((w.injuries || 0) / 5));
  core += pts(h.hrPolicy, 4) + pts(h.antiDisc, 3) + pts(h.sWhistle, 4) + pts(h.psycho, 3) + pts(h.childLabour, 4) + pts(h.modernSlavery, 3) + pts(h.livingWage, 2);
  core += has(w.under18) && !w.under18 ? 4 : 0;
  core += h.indigPolicy === 'Yes' ? 3 : h.indigPolicy === 'Not applicable' ? 2 : 0; core += (h.indigPct || 0) >= 3 ? 2 : (h.indigPct || 0) >= 1 ? 1 : 0;
  core += has(w.trainHrs) ? Math.min(4, w.trainHrs / 6) : 0; core += has(w.payGap) ? (Math.abs(w.payGap) <= 5 ? 4 : Math.abs(w.payGap) <= 12 ? 2 : 0) : 0;
  core = Math.max(0, Math.min(75, core * 75 / 69));   // the core items add up to 69 at best: scaled onto the documented 75 points
  opt += pts(m.dei, 4) + pts(m.parental, 3) + pts(m.wellbeing, 3); opt += Math.min(4, (m.invest || 0) / 50000); opt += Math.min(4, (m.supAudit || 0) / 20); opt += Math.min(3, (m.localPct || 0) / 25);
  opt += Math.min(2, (m.divHires || 0) / 20); opt += m.grievance === 'Formal and published' ? 2 : m.grievance === 'Basic' ? 1 : 0; opt = Math.min(25, opt);
  if ((w.deaths || 0) > 0) why.push('A fatality in the year: report it openly with the investigation and actions.');
  if (!has(w.ltifr)) why.push('Add the LTIFR (lost time injuries per million hours).');
  if (h.childLabour !== 'Yes') why.push('Confirm child labour checks across operations and suppliers.');
  return { score: Math.round(core + opt), core: Math.round(core), opt: Math.round(opt), womenPct: r2(wp, 1), womenMgmtPct: r2(mp, 1), why };
}
// Governance (out of 100) and the GRI 2 alignment index: from the GKH Governance Intelligence tool
function govScore(e) {
  const b = e.board || {}, t = e.ethics || {}, c = e.certs || {}; let core = 0, opt = 0, gri = 0; const why = [];
  const bw = b.boardSize ? (b.boardWomen || 0) / b.boardSize * 100 : null, ip = b.indepPct;
  core += bw == null ? 0 : bw >= 30 ? 8 : bw >= 20 ? 6 : bw >= 10 ? 3 : 0; core += ip == null ? 0 : ip >= 50 ? 10 : ip >= 33 ? 7 : ip >= 20 ? 3 : 0;
  core += pts(b.chairSep, 4) + pts(t.code, 6) + pts(t.gWhistle, 7) + pts(t.antiCorrupt, 6) + pts(t.erm, 6, 3) + pts(t.audit, 5) + pts(t.cyber, 5) + pts(b.susCommittee, 6) + pts(b.indepSus, 4) + pts(t.tax, 3);
  core += has(t.corruptCases) && !t.corruptCases ? 3 : 0; core += Math.min(2, (t.abcTrain || 0) / 50); core = Math.min(75, core);
  opt += pts(c.iso45001, 4) + pts(c.iso27001, 4) + pts(c.iso9001, 3) + pts(c.grc, 3, 1) + pts(t.privacy, 3, 1) + pts(t.political, 2) + pts(b.execEsg, 2) + pts(b.boardTrain, 2) + pts(c.susReport, 2); opt = Math.min(25, opt);
  gri += ip == null ? 0 : ip >= 33 ? 20 : ip >= 20 ? 12 : 5; gri += pts(t.code, 15) + pts(t.gWhistle, 15) + pts(b.susCommittee, 15) + pts(b.indepSus, 12) + pts(t.antiCorrupt, 10) + pts(t.audit, 8) + pts(t.tax, 5); gri = Math.min(100, gri);
  const radar = [['Board independence', Math.min(100, ip || 0)], ['Ethics and whistleblowing', (yes(t.code) ? 50 : 0) + (yes(t.gWhistle) ? 50 : 0)], ['Sustainability oversight', (yes(b.susCommittee) ? 60 : 0) + (yes(b.indepSus) ? 40 : 0)],
    ['Certifications', (yes(c.iso45001) ? 35 : 0) + (yes(c.iso27001) ? 35 : 0) + (yes(c.iso9001) ? 30 : 0)], ['Risk and audit', (yes(t.erm) ? 50 : part(t.erm) ? 25 : 0) + (yes(t.audit) ? 50 : 0)], ['Anti-corruption', yes(t.antiCorrupt) ? (t.corruptCases ? 60 : 100) : 0]];
  if (ip != null && ip < 50) why.push('Fewer than half the directors are independent.');
  if (!yes(b.susCommittee)) why.push('No board sustainability committee yet.');
  return { score: Math.round(core + opt), core: Math.round(core), opt: Math.round(opt), gri: Math.round(gri), boardWomenPct: r2(bw, 1), radar, why };
}
function fieldHas(e, f) { if (f === 'mat') return Object.values(e.mat || {}).filter((v) => v.imp || v.fin).length >= 3; if (f === 'credits' || f === 'avoid') return (e[f] || []).length > 0; if (f === 'pricing') return !!((e.pricing || {}).cbam || []).length || !!((e.pricing || {}).exp || []).length; const [s, k] = f.split('.'); return has((e[s] || {})[k]); }
export function coverage(e) {
  const by = {};
  DISCLOSURES.forEach((d) => { const n = d.fields.filter((f) => fieldHas(e, f)).length, st = n === d.fields.length ? 'Reported' : n ? 'Partly' : 'Not yet'; (by[d.std] = by[d.std] || []).push({ ...d, status: st }); });
  const pct = {}; Object.keys(by).forEach((s) => { const L = by[s]; pct[s] = Math.round(L.reduce((a, d) => a + (d.status === 'Reported' ? 1 : d.status === 'Partly' ? 0.5 : 0), 0) / L.length * 100); });
  return { by, pct };
}
export function compute(e) {
  const em = emissions(e), E = envScore(e, em), S = socScore(e), G = govScore(e), cv = coverage(e), chosen = (e.std || []).length ? e.std : ['IFRS_S2', 'GRI'];
  const readiness = Math.round(chosen.reduce((a, s) => a + (cv.pct[s] || 0), 0) / chosen.length);
  const filled = SECTIONS.filter((s) => s.id !== 'org').map((s) => ({ id: s.id, pillar: PILLAR_OF[s.id], n: s.fields.filter((f) => has((e[s.id] || {})[f[0]])).length, of: s.fields.length }));
  return { method: METHOD, em, env: E, soc: S, gov: G, esg: Math.round((E.score + S.score + G.score) / 3), coverage: cv.pct, readiness, filled, avoid: avoided(e), price: pricing(e, em), bills: billsSum(e) };
}

/* ---------------- 📂 storage ---------------- */
const summary = (e, c) => ({ id: e.id, rev: e.rev || 0, name: (e.org || {}).name || 'Untitled', year: (e.org || {}).year || '', industry: (e.org || {}).industry || '', updated: e.updated || 0, esg: c ? c.esg : null, total: c ? c.em.total : null, std: e.std || [] });
export async function list() { const i = (await kv.get('esg-index')) || { ents: {} }; return Object.values(i.ents || {}).sort((a, b) => (b.updated || 0) - (a.updated || 0)); }
export async function get(id) { id = String(id || '').replace(/[^A-Z0-9]/gi, '').slice(0, 24); return id ? kv.get('esg:' + id) : null; }
async function put(e) { await kv.set('esg:' + e.id, e); const c = compute(e); await kv.update('esg-index', (x) => { x.ents = x.ents || {}; x.ents[e.id] = summary(e, c); return x; }, () => ({ ents: {} })); return c; }
const logIt = (e, by, what) => { e.log = [{ at: Date.now(), by: str(by, 60), what: str(what, 300) }].concat(e.log || []).slice(0, 200); };
export async function create(body, by) {
  const org = cleanSection('org', { name: body.name, year: body.year, industry: body.industry, country: body.country, currency: body.currency || 'AUD' });
  if (!org.name) return { error: 'Give the organisation a name' };
  const e = { id: uid(), rev: 1, created: Date.now(), updated: Date.now(), by: str(by, 60), std: ['IFRS_S2', 'GRI', 'SDG'], mat: {}, avoid: [], credits: [], insights: {}, docs: [], log: [] };
  SECTIONS.forEach((s) => { e[s.id] = s.id === 'org' ? org : {}; });
  e.carbon.fset = { Australia: 'NGA_AU', Malaysia: 'MY_EC', Singapore: 'SG_EMA', Thailand: 'TH_TGO', 'United Kingdom': 'UK_DESNZ', 'New Zealand': 'NZ_MFE', 'United States': 'US_EPA' }[org.country] || 'IPCC';
  logIt(e, by, 'Reporting entity created: ' + org.name + (org.year ? ' ' + org.year : ''));
  const c = await put(e); return { entity: e, calc: c };
}
export async function save(id, body, by) {
  id = String(id || '').replace(/[^A-Z0-9]/gi, '').slice(0, 24); if (!id) return { error: 'This reporting entity was not found', code: 404 };
  let res = null;
  // compare-and-set: the revision check and the write happen together, so two people saving at once cannot overwrite each other
  const e = await kv.update('esg:' + id, (cur) => {
    if (!cur) { res = { error: 'This reporting entity was not found', code: 404 }; return cur; }
    if (body.rev != null && Number(body.rev) !== cur.rev) { res = { error: 'Someone else changed this report since you opened it. Reload to see their changes.', code: 409, entity: cur }; return cur; }
    const x = structuredClone(cur), nx = clean({ ...x, ...(body.patch || {}) }), changed = [];
    SECTIONS.forEach((sec) => { const a = x[sec.id] || {}, b = nx[sec.id]; sec.fields.forEach(([k, label]) => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(sec.title + ': ' + label); }); x[sec.id] = b; });
    if (JSON.stringify(x.std || []) !== JSON.stringify(nx.std)) changed.push('Standards: ' + nx.std.join(', ')); x.std = nx.std;
    if (JSON.stringify(x.mat || {}) !== JSON.stringify(nx.mat)) changed.push('Materiality ratings'); x.mat = nx.mat;
    if (JSON.stringify(x.avoid || []) !== JSON.stringify(nx.avoid)) changed.push('Carbon avoidance: ' + nx.avoid.length + ' item' + (nx.avoid.length === 1 ? '' : 's')); x.avoid = nx.avoid;
    if (JSON.stringify(x.credits || []) !== JSON.stringify(nx.credits)) changed.push('Carbon credits register'); x.credits = nx.credits;
    if (JSON.stringify(x.pricing || {}) !== JSON.stringify(nx.pricing)) changed.push('Carbon pricing and CBAM'); x.pricing = nx.pricing;
    if (JSON.stringify(x.bills || []) !== JSON.stringify(nx.bills)) changed.push('Electricity bills: ' + nx.bills.length); x.bills = nx.bills;
    if (JSON.stringify(x.efsrc || {}) !== JSON.stringify(nx.efsrc)) changed.push('Emission factor sources: ' + Object.keys(nx.efsrc).filter((k) => JSON.stringify((x.efsrc || {})[k]) !== JSON.stringify(nx.efsrc[k])).map((k) => (nx.efsrc[k] || {}).label || k + ' cleared').join('; ')); x.efsrc = nx.efsrc;
    if (body.source) changed.push('(imported from ' + str(body.source, 80) + ')');
    if (!changed.length) { res = { same: true }; return cur; }
    x.rev = (x.rev || 0) + 1; x.updated = Date.now();
    logIt(x, by, changed.length > 4 ? changed.slice(0, 4).join('; ') + ' and ' + (changed.length - 4) + ' more' : changed.join('; '));
    res = null; return x;
  }, () => null);
  if (res && res.error) return res;
  const c = compute(e);
  // the list entry: written on every save (so a retry repairs a half-finished one), never replaced by an older revision
  await kv.update('esg-index', (x) => { x.ents = x.ents || {}; const old = x.ents[e.id]; if (!old || !(old.rev > (e.rev || 0))) x.ents[e.id] = summary(e, c); return x; }, () => ({ ents: {} }));
  return { entity: e, calc: c, cover: coverage(e).by };
}
export async function remove(id, by) { const e = await get(id); if (!e) return { error: 'Not found', code: 404 }; await kv.del('esg:' + e.id); await kv.del('esgdoc:' + e.id + ':statement').catch(() => {}); await kv.del('esgdoc:' + e.id + ':report').catch(() => {}); await kv.update('esg-index', (x) => { delete (x.ents || {})[e.id]; return x; }, () => ({ ents: {} })); return { ok: true, name: (e.org || {}).name }; }
export async function lastDoc(id, kind) { return kv.get('esgdoc:' + String(id).replace(/[^A-Z0-9]/gi, '') + ':' + (kind === 'report' ? 'report' : 'statement')); }

// 🧪 a worked example: the three GKH tools' sample data brought together and brought up to date
export async function sample(by) {
  const r = await create({ name: 'GKH EcoVista Holdings', year: 'FY2026', industry: 'Logistics & Warehousing', country: 'Australia', currency: 'AUD' }, by); if (r.error) return r;
  const patch = {
    org: { name: 'GKH EcoVista Holdings', reg: 'GKH-8872-X', industry: 'Logistics & Warehousing', country: 'Australia', year: 'FY2026', from: '2025-07-01', to: '2026-06-30', currency: 'AUD', revenue: 185, employees: 717, listing: 'Not listed', boundary: 'Operational control',
      entities: 'GKH EcoVista Holdings and its Australian and Malaysian logistics subsidiaries: 4 warehouses, 2 offices and the road and air freight fleet.', assurance: 'Limited assurance', assurer: 'To be appointed', contact: 'sustainability@gkh-ecovista.example', about: 'An integrated logistics group offering warehousing, road freight and air freight forwarding across Australia and Malaysia for retail, healthcare and industrial customers.' },
    carbon: { fset: 'NGA_AU', diesel: 520500, petrol: 80002, jet: 12500, lpg: 18000, gas: 1507.5, refrig: 22, refGwp: 1924, elec: 4850, green: 900, fDiesel: 2.71, fPetrol: 2.33, fJet: 2.56, fLpg: 1.56, fGas: 51.53, fElec: 0.66, baseYear: 'FY2023', baseT: 4100 },
    scope3: { purch: 32000, freight: 2400000, landfill: 410, recycled: 820, air: 1250000, car: 185000, hotel: 1400, commute: 2100000, water: 52000, ...S3_DEFAULTS },
    resources: { renewPct: 14, waterWd: 52000, waterStress: 'No', wasteT: 1230, hazT: 18, divertPct: 67, iso14001: 'Working towards it', envFines: 0, biodiv: 'No' },
    climate: { tgtPct: 42, tgtYear: '2030', netZero: '2045', sbti: 'Committed', scenario: 'Partly', transition: 'Partly', carbonPrice: 35, boardClimate: 'Yes', climatePay: 'No',
      risks: 'Extreme heat and flooding disrupting warehouse and road operations · physical · high\nCarbon pricing and fuel costs rising on the diesel fleet · transition · high\nCustomers requiring low-emission freight in tenders · transition · medium\nCyclone and storm damage to Queensland and Malaysian sites · physical · medium',
      opps: 'Electric and hydrogen trucks for urban delivery\nRooftop solar and batteries on the warehouses\nLow-carbon freight services for customers with Scope 3 targets', offsets: 0 },
    workforce: { fte: 717, under18: 0, a18: 420, a41: 210, a55: 87, women: 156, mgmt: 96, womenMgmt: 29, hires: 132, leavers: 98, injuries: 9, deaths: 0, ltifr: 1.6, hours: 1380000, safetyTrain: 98, trainHrs: 18.5, payGap: 9.4, bargain: 61 },
    rights: { hrPolicy: 'Yes', antiDisc: 'Yes', sWhistle: 'Yes', psycho: 'Partly', childLabour: 'Yes', modernSlavery: 'Yes', livingWage: 'Yes', indigPolicy: 'Yes', indigPct: 3.1 },
    community: { dei: 'Yes', parental: 'Yes', wellbeing: 'Yes', invest: 125000, volHrs: 1900, supAudit: 35, localPct: 72, divHires: 28, grievance: 'Formal and published', privacyComplaints: 1 },
    board: { boardSize: 7, boardWomen: 2, indepPct: 43, chairSep: 'Yes', susCommittee: 'Yes', indepSus: 'Yes', boardTrain: 'Yes', execEsg: 'No' },
    ethics: { code: 'Yes', gWhistle: 'Yes', antiCorrupt: 'Yes', corruptCases: 0, abcTrain: 88, erm: 'Partly', audit: 'Yes', cyber: 'Yes', privacy: 'Formal', breaches: 0, tax: 'No', political: 'Yes', stakeGriev: 'Yes' },
    certs: { iso45001: 'Yes', iso27001: 'No', iso9001: 'Yes', grc: 'Manual', susReport: 'No', ethicsAuditPct: 45 },
    std: ['AASB_S2', 'IFRS_S1', 'GRI', 'TCFD', 'GHGP', 'NGER', 'SDG'],
    avoid: [{ name: 'Rooftop solar on four warehouses', cat: 'Renewable energy', baseline: 'Grid electricity (NGA national factor)', unit: 'MWh', qty: 900, base: 660, sol: 0, attr: 100, status: 'Delivered', verify: 'Internal review', sdg: 'SDG 7' },
      { name: 'Electric vans for Sydney and Melbourne deliveries', cat: 'Fleet electrification and low-emission transport', baseline: 'Diesel van per km', unit: 'km', qty: 640000, base: 0.32, sol: 0.12, attr: 100, status: 'Delivered', verify: 'Estimate', sdg: 'SDG 11' },
      { name: 'Pallet and packaging recycling', cat: 'Circularity and recycling', baseline: 'Waste to landfill', unit: 't', qty: 820, base: 460, sol: 21, attr: 100, status: 'Delivered', verify: 'Estimate', sdg: 'SDG 12' },
      { name: 'Consolidated low-carbon freight for retail customers', cat: 'Product or service that cuts customer emissions', baseline: 'Customers shipping part loads', unit: 'tonne-km', qty: 3500000, base: 0.11, sol: 0.07, attr: 50, status: 'Under way', verify: 'Estimate', sdg: 'SDG 9', note: 'Half the saving is attributed to GKH, half to the customers who changed how they ship.' }],
    credits: [{ project: 'Human-induced regeneration, western NSW', type: 'Removal credit (nature-based)', std: 'ACCU (Australia)', registry: 'ACCU Scheme register', vintage: '2025', t: 300, cost: 10500, purpose: 'Part of the ongoing emissions responsibility for FY2026', ccp: 'Unknown', ca: 'Not needed', use: 'Ongoing emissions responsibility (contribution)' },
      { project: 'Efficient cookstoves, Ghana', type: 'Avoidance credit', std: 'Gold Standard', registry: 'Gold Standard Impact Registry', vintage: '2019', t: 200, cost: 1600, purpose: 'Bought in 2022 for a carbon-neutral event', ccp: 'No', ca: 'Unknown', use: 'Carbon-neutral claim (ISO 14068-1)' }],
    pricing: { schemes: ['EU_CBAM', 'AU_SGM', 'ACCU', 'ICVCM', 'VCMI', 'SBTI'], euaPrice: 75,
      cbam: [{ market: 'EU', good: 'Iron and steel', cn: '7308', dest: 'Steel racking shipped to Rotterdam for a client (we act as indirect customs representative)', tonnes: 1200, see: 2.1, paid: 0, sv: 'Default values' },
        { market: 'EU', good: 'Aluminium', cn: '7610', dest: 'Aluminium frames to Hamburg', tonnes: 140, see: 8.4, paid: 0, sv: 'Default values' }],
      exp: [] },
    mat: { ghg: { imp: 4, fin: 4 }, energy: { imp: 3, fin: 3 }, safety: { imp: 4, fin: 3 }, people: { imp: 3, fin: 3 }, dei: { imp: 3, fin: 2 }, rights: { imp: 3, fin: 2 }, supply: { imp: 3, fin: 3 }, ethics: { imp: 2, fin: 3 }, cyber: { imp: 2, fin: 4 }, waste: { imp: 2, fin: 1 }, water: { imp: 1, fin: 1 }, community: { imp: 2, fin: 1 }, customers: { imp: 2, fin: 3 }, governance: { imp: 2, fin: 3 }, risk: { imp: 2, fin: 3 } }
  };
  return save(r.entity.id, { patch }, by);
}

/* ---------------- ✨ the AI: insights, the Sustainability Statement and the ESG Report ---------------- */
const LANG = { ms: 'Bahasa Melayu (Malay)', id: 'Bahasa Indonesia', ta: 'Tamil', zh: 'Simplified Chinese', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese', th: 'Thai', tl: 'Filipino', ja: 'Japanese', ko: 'Korean', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese' };
const BASE = 'You are a senior ESG and sustainability reporting adviser (ISSB IFRS S1 and S2, AASB S1 and S2, ESRS/CSRD, GRI, TCFD, SASB, CDP, Bursa Malaysia, GHG Protocol) writing for GKH Project Champ. ' +
  'Write for the board, investors, regulators and other stakeholders: specific to THIS organisation and its real data, balanced (say what is not yet in place as plainly as what is), and in the style of a published sustainability report. Australian spelling. ' +
  'Never invent numbers, people, awards, certifications or events that are not in the data; where data is missing say what the organisation will do to measure or report it. Refer to the standards the organisation chose by name and paragraph where useful. ' +
  'Use **bold** for key points and "- " for bullets inside text values. No emoji. Numbers with thousands separators; emissions in tCO2e. Reply JSON only, with exactly the keys asked for.';
function facts(e) {
  const c = compute(e), o = e.org || {}, std = (e.std || []).map((s) => (STANDARDS.find((x) => x.id === s) || {}).name).filter(Boolean);
  const mat = Object.entries(e.mat || {}).filter(([, v]) => v.imp || v.fin).map(([k, v]) => { const t = TOPICS_FULL.find((x) => x[0] === k) || []; return { topic: t[1], pillar: t[2], impact: RATE[v.imp], financial: RATE[v.fin], kinds: v.kind, horizon: v.horizon, stakeholders: v.who, actions: v.action, gri: t[4], esrs: t[5], note: v.note || undefined }; }).sort((a, b) => RATE.indexOf(b.impact) + RATE.indexOf(b.financial) - RATE.indexOf(a.impact) - RATE.indexOf(a.financial));
  const data = {}; SECTIONS.forEach((s) => { const v = e[s.id] || {}; if (Object.keys(v).length) data[s.title] = Object.fromEntries(s.fields.filter((f) => has(v[f[0]])).map((f) => [f[1] + (typeof f[3] === 'string' && f[3] ? ' (' + f[3] + ')' : ''), v[f[0]]])); });
  return { organisation: o, standards_chosen: std, data, results: { emissions_tCO2e: { scope1: c.em.s1t, scope1_by_source: c.em.s1, scope2_location: c.em.s2loc, scope2_market: c.em.s2mkt, scope3: c.em.s3t, scope3_by_category: c.em.s3, total: c.em.total,
    intensity_per_million_revenue: c.em.intensity, sector_intensity_indicative: c.em.bench, vs_sector_pct: c.em.vsBench, change_vs_base_year_pct: c.em.vsBase, per_employee: c.em.perFte, energy_MWh: c.em.energy, factor_set: c.em.setLabel },
    scores_out_of_100: { environment: c.env.score, social: c.soc.score, governance: c.gov.score, overall: c.esg, gri2_alignment: c.gov.gri }, women_pct: c.soc.womenPct, women_in_management_pct: c.soc.womenMgmtPct, women_on_board_pct: c.gov.boardWomenPct,
    gaps: [...c.env.why, ...c.soc.why, ...c.gov.why], standards_coverage_pct: c.coverage,
    emission_factor_sources: Object.keys(e.efsrc || {}).length ? Object.fromEntries(Object.entries(e.efsrc).map(([k, v]) => [k, v.label])) : undefined,
    electricity_bills: (() => { const B = c.bills; const el = (e.carbon || {}).elec, o = e.org || {}, L = e.bills || [], close = B.mwh > 0 && el > 0 && Math.abs(B.mwh - el) / el <= 0.05;
      // the bills support the year only if every bill sits inside the reporting period (a month's grace each side for billing cycles)
      const lo = o.from ? Date.parse(o.from) - 31 * 864e5 : null, hi = o.to ? Date.parse(o.to) + 31 * 864e5 : null, inYear = !!(lo && hi) && L.length > 0 && L.every((x) => x.from && x.to && Date.parse(x.from) >= lo && Date.parse(x.to) <= hi);
      return B.n ? { bills: B.n, sites: B.sites, total_MWh: B.mwh, renewable_MWh: B.greenMwh, days_covered: B.days, reported_electricity_MWh: el, reporting_period: [o.from, o.to], periods: L.slice(0, 60).map((x) => [x.site, x.from, x.to, x.kwh]),
        note: close && inYear ? 'The reported electricity reconciles with the bills for the reporting period (within 5%)' : close ? 'The quantities are close, but the bill periods do not show the reporting year: do not claim the bills support Scope 2' : 'The bills do not reconcile with the reported electricity: say so, do not claim the bills support Scope 2' } : undefined; })(),
    carbon_pricing: (() => { const P = c.price; return { schemes_that_apply: P.schemes.map((id) => (CARBON_SCHEMES.find((x) => x.id === id) || {}).name), internal_carbon_price: P.icp, shadow_cost_scope1_2: P.shadow,
      cbam_lines: P.cbam.map((x) => ({ market: x.market, good: x.good, cn_code: x.cn, what: x.dest, tonnes: x.tonnes, embedded_tCO2e: x.emb, values: x.sv, est_cost: x.cost, currency: x.cur })), cbam_cost_eur: P.cbamEU, cbam_cost_gbp: P.cbamUK,
      carbon_price_exposures: P.exp.map((x) => ({ scheme: x.scheme, site: x.site, liable_tCO2e: x.liable, price: x.price, currency: x.cur, est_cost: x.cost })),
      credits: P.credits.map((x) => ({ project: x.project, type: x.type, standard: x.std, vintage: x.vintage, tCO2e: x.t, use: x.use, ccp_label: x.ccp, corresponding_adjustment: x.ca, integrity_flags: x.flags })), high_quality_share_pct: P.highQualityPct }; })(),
    avoided_emissions_tCO2e: { total: c.avoid.total, delivered: c.avoid.delivered, planned_or_under_way: c.avoid.planned, by_category: c.avoid.byCat, third_party_verified: c.avoid.verified, items: c.avoid.items.map((x) => ({ name: x.name, category: x.cat, baseline: x.baseline, tCO2e: x.t, attribution_pct: x.attr, status: x.status, verification: x.verify })), carbon_credits_retired: c.avoid.credits, of_which_removals: c.avoid.removals } }, material_topics: mat, insights: e.insights || {}, today: new Date().toISOString().slice(0, 10) };
}
// 🇺🇳 the 17 UN Sustainable Development Goals: covered by default in every statement and report
export const SDGS = ['No poverty', 'Zero hunger', 'Good health and well-being', 'Quality education', 'Gender equality', 'Clean water and sanitation', 'Affordable and clean energy', 'Decent work and economic growth',
  'Industry, innovation and infrastructure', 'Reduced inequalities', 'Sustainable cities and communities', 'Responsible consumption and production', 'Climate action', 'Life below water', 'Life on land', 'Peace, justice and strong institutions', 'Partnerships for the goals'];
const STATEMENT = [
  { ask: 'Write the first half of a concise Sustainability Statement (the whole statement must stay under 10 pages). Keys: "leadership_message" (220-280 words, from the board chair or CEO), "basis_of_preparation" (160-220 words: reporting period, entities and boundary, consolidation approach, the standards applied and how, assurance, restatements), ' +
    '"governance" (180-240 words: how the board and management oversee sustainability and climate), "materiality" (140-200 words: how material topics were chosen, double materiality where ESRS is chosen), "material_topics" (6-10 items {"topic":"","pillar":"E|S|G","why":"one sentence"}), "strategy" (160-220 words), "sdgs" (the 3 to 6 UN Sustainable Development Goals the organisation contributes to most, from its data and activities: {"sdg":"SDG 13 Climate action","contribution":"one sentence with a number where there is one"}).' },
  { ask: 'Write the second half of a concise Sustainability Statement (the whole statement must stay under 10 pages). Keys: "environment" (220-280 words: emissions, energy, water, waste, with the numbers), "climate" (240-300 words: IFRS S2 / AASB S2 summary of governance, strategy and resilience, risk management, metrics and targets), ' +
    '"social" (220-280 words: people, safety, diversity, human rights, community, with the numbers), "governance_performance" (160-220 words: board, ethics, risk, certifications), "avoided" (110-160 words: emissions avoided by its solutions, reported separately from Scope 1-3 and not netted, per the WBCSD guidance; say if none yet), "targets" (5-8 items {"target":"","baseline":"","status":"On track|Watch|Not started|Achieved"}), "outlook" (120-170 words: priorities for next year).' }
];
const REPORT = [
  { ask: 'Write PART A (introduction and strategy) of a full ESG Report of about 60 pages. Keys: "ceo_message" (420-520 words), "about_report" (320-420 words: period, boundary, consolidation, standards applied with how each is used, content index, restatements, assurance, contact), "organisation_profile" (320-400 words), ' +
    '"strategy" (450-550 words: sustainability strategy, its pillars and how it links to the business), "stakeholder_engagement" (300-380 words), "stakeholders" (6-8 items {"group":"","concerns":"","how_engaged":"","frequency":""}), "materiality" (380-460 words: the assessment method, double materiality for ESRS, impact and financial ratings, validation), ' +
    '"material_topics" (8-16 items, the rated material topics first {"topic":"","pillar":"E|S|G","impact":"High|Medium|Low","financial":"High|Medium|Low","why":"one or two sentences: the impact, risk or opportunity, and the response"}), "sdg_overview" (150-220 words: how the organisation contributes to the UN Sustainable Development Goals, the goals it affects most, positively and negatively, and how it tracks them), "sdgs" (ALL 17 UN Sustainable Development Goals, in order, one item each: {"sdg":"SDG 1 No poverty","relevance":"High|Medium|Low|Not material","contribution":"one or two sentences grounded in the facts given; for a goal that is not material say why in a few words","metric":"the reported figure that tracks it, or empty"}).' },
  { ask: 'Write PART B (governance of sustainability) of a full ESG Report of about 60 pages. Keys: "governance_structure" (420-500 words), "board_oversight" (320-400 words), "sustainability_committee" (260-340 words), "roles" (5-8 items {"role":"","responsibilities":""}), "policies" (6-10 items {"policy":"","covers":"","status":"In place|In progress|Planned"}), ' +
    '"ethics_conduct" (320-400 words), "anti_corruption" (260-340 words), "whistleblowing" (220-300 words), "risk_management" (420-500 words: ERM and how sustainability and climate risks are integrated), "cyber_privacy" (260-340 words), "tax_transparency" (160-240 words), "remuneration" (220-300 words).' },
  { ask: 'Write PART C (climate, under IFRS S2 / AASB S2 / TCFD) of a full ESG Report of about 60 pages. Keys: "climate_governance" (320-400 words), "climate_strategy" (460-550 words), "climate_risks" (6-10 items {"risk":"","type":"Physical acute|Physical chronic|Transition policy|Transition market|Transition technology|Transition reputation","horizon":"Short|Medium|Long","likelihood":"High|Medium|Low","impact":"High|Medium|Low","financial_effect":"","response":""}), ' +
    '"opportunities" (3-6 items {"opportunity":"","horizon":"Short|Medium|Long","financial_effect":"","action":""}), "scenario_analysis" (460-550 words: at least a 1.5°C orderly, a 2.5-3°C and a 4°C hot-house scenario, with assumptions and what changes for the business), "resilience" (260-340 words), "climate_risk_management" (320-400 words), ' +
    '"metrics_targets" (360-440 words: with the emission numbers, intensity and targets), "transition_plan" (360-440 words), "transition_actions" (5-8 items {"action":"","timing":"","emissions_effect":"","status":"Done|Under way|Planned"}).' },
  { ask: 'Write PART D (environmental performance) of a full ESG Report of about 60 pages. Keys: "ghg_methodology" (420-500 words: GHG Protocol, boundary, factor set and GWP values, Scope 2 location and market based, Scope 3 categories included and excluded, estimation and uncertainty), "emissions_performance" (460-550 words: analysis of the numbers, intensity, the sector comparison and the base year), ' +
    '"scope3" (320-400 words), "energy" (320-400 words), "water" (300-380 words), "waste" (300-380 words), "biodiversity" (240-320 words), "environmental_compliance" (200-280 words), "carbon_pricing" (320-420 words: the carbon prices, carbon taxes and border adjustments (EU and UK CBAM) that apply, the exposure in the data, the internal carbon price, and the carbon credits held: type, standard, integrity (ICVCM CCP label, corresponding adjustments) and how they are used and claimed under SBTi, VCMI or ISO 14068-1, never netted against gross emissions; say what is not yet in place), "avoided_emissions" (380-460 words: the projects and solutions that avoid emissions, the baselines and attribution, verification, why they are reported separately from and never netted against Scope 1-3 under the WBCSD Guidance on Avoided Emissions and the GHG Protocol, and the carbon credits retired, distinguishing avoidance and removal credits; if there are none, say what is planned), "env_initiatives" (5-8 items {"initiative":"","outcome":"","next":""}).' },
  { ask: 'Write PART E (social performance) of a full ESG Report of about 60 pages. Keys: "people_strategy" (320-400 words), "workforce_profile" (320-400 words: analysis of the numbers), "health_safety" (460-550 words: with injuries, fatalities, LTIFR, training and the safety system), "dei" (360-440 words), "training_development" (300-380 words), ' +
    '"human_rights" (360-440 words: ILO, child labour, modern slavery, living wage), "indigenous" (240-320 words), "community" (300-380 words), "supply_chain" (300-380 words), "customers_data" (220-300 words), "social_initiatives" (5-8 items {"initiative":"","outcome":"","next":""}).' },
  { ask: 'Write PART F (governance performance, targets and roadmap) of a full ESG Report of about 60 pages. Keys: "governance_performance" (360-440 words: the governance scores and GRI 2 alignment explained), "certifications" (260-340 words), "scorecard_commentary" (320-400 words: what the environment, social and governance scores mean and what moves them), ' +
    '"targets" (8-12 items {"pillar":"E|S|G","target":"","baseline":"","target_year":"","status":"On track|Watch|Not started|Achieved"}), "roadmap" (6-10 items {"year":"e.g. FY2027","focus":"","actions":""}), "data_quality" (320-400 words: data sources, controls, estimates, assurance readiness), "forward_looking" (150-220 words), "glossary" (14-22 items {"term":"","meaning":""}).' },
  { ask: 'Write PART G (reporting standards) of a full ESG Report of about 60 pages, for the standards the organisation chose (standards_chosen). Keys: "standards_overview" (300-380 words: why these standards, how they fit together, e.g. IFRS S2 and AASB S2 for climate, GRI for impacts, ESRS for double materiality, Bursa common indicators), ' +
    '"alignment" (one item per chosen standard {"standard":"","how_applied":"140-200 words","gaps":"","next_steps":""}), "sasb_metrics" (4-8 items {"metric":"","value":"from the data or Not yet measured","unit":"","note":""} for the organisation\'s industry), "assurance_readiness" (240-320 words).' }
];
const cap = (kind) => kind === 'report' ? Math.max(30000, Math.min(100000, Number(process.env.AI_ESG_MAX_TOKENS || 100000) || 100000)) : Math.max(12000, Math.min(40000, Number(process.env.AI_ESG_STATEMENT_TOKENS || 28000) || 28000));
export async function writeDoc(id, kind, lang, by) {
  kind = kind === 'report' ? 'report' : 'statement';
  const e = await get(id); if (!e) return { error: 'This reporting entity was not found' };
  if (!llmSetup()) return { error: 'AI is not set up yet: add LLM_API_KEY (DeepSeek) in Netlify.' };
  try { await checkLimit(); } catch (err) { return { error: err.message }; }
  const PARTS = kind === 'report' ? REPORT : STATEMENT, F = facts(e), budget = cap(kind), inTok = Math.ceil(JSON.stringify(F).length / 3.6) + 900;
  const perOut0 = Math.floor((budget - PARTS.length * inTok) / PARTS.length), perOut = Math.max(3000, Math.min(8000, Math.floor((budget - PARTS.length * inTok) / PARTS.length)));
  if (perOut0 < 3000) return { error: 'There is too much data for the AI budget of ' + budget.toLocaleString('en-AU') + ' tokens (' + PARTS.length + ' parts need about ' + (PARTS.length * (inTok + 3000)).toLocaleString('en-AU') + '). Raise AI_ESG_' + (kind === 'report' ? 'MAX' : 'STATEMENT') + '_TOKENS, or shorten the long text fields.' };
  const L = LANG[lang] ? lang : 'en', sys = BASE + (L !== 'en' ? ` Write every value in ${LANG[L]} (natural, professional ${LANG[L]}; JSON keys stay in English; keep standard names such as IFRS S2, GRI 305, ESRS E1 and units as they are).` : '');
  // every part is asked for; a part that fails or comes back empty is asked again (up to twice, while there is time), so the whole document gets written
  const t0 = Date.now(), keysOf = (p) => [...new Set([...p.ask.matchAll(/"([a-z][a-z0-9_]{2,})"\s*\(/g)].map((m) => m[1]))], textKeys = (p) => [...new Set([...p.ask.matchAll(/"([a-z][a-z0-9_]{2,})"\s*\(\d+-\d+ words/g)].map((m) => m[1]))];
  const asText = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' && !Array.isArray(v) && typeof (v.text || v.content || v.body) === 'string' ? (v.text || v.content || v.body) : v);   // {"text":"…"} is read as text
  const usable = (v) => (typeof v === 'string' ? v.trim().length > 20 : Array.isArray(v) ? v.some((x) => (x && typeof x === 'object' ? Object.values(x).join('').trim() : String(x || '').trim())) : false);
  // a part's answer: what it gave (usable values only) and which narrative sections it left out
  const one = (p, tries, ms) => llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ task: p.ask + (tries ? ' Keep each text at the lower end of its word range, include every key asked for, and return complete, valid JSON.' : ''), organisation_data: F }) }], { maxTokens: perOut, timeoutMs: ms, temperature: 0.35 })
    .then((r) => { const d0 = r.data && typeof r.data === 'object' ? r.data : {}, d = {}; Object.keys(d0).forEach((k) => { if (k === '_cutOff') return; const v = textKeys(p).includes(k) ? asText(d0[k]) : d0[k]; if (usable(v)) d[k] = v; });
      const miss = textKeys(p).filter((k) => typeof d[k] !== 'string');
      if (!Object.keys(d).length) throw new Error('the AI returned no usable text');
      return { data: d, miss, used: r.used || 0, cut: !!(r.cutOff || d0._cutOff) }; })
    .catch((err) => ({ data: {}, miss: textKeys(p), used: 0, error: err.message }));
  const res = await Promise.all(PARTS.map((p) => one(p, 0, 420000)));
  // a part that failed, or left out any narrative section, is asked again (up to twice, while there is time); the better answers are merged
  for (let round = 1; round <= 2; round++) {
    const left = 840000 - (Date.now() - t0), todo = res.map((r, i) => (r.error || r.miss.length ? i : -1)).filter((i) => i >= 0);
    if (!todo.length || left < 150000) break;
    const again = await Promise.all(todo.map((i) => one(PARTS[i], round, Math.min(360000, left - 45000))));
    todo.forEach((i, j) => { const a = again[j], b = res[i], used = (b.used || 0) + (a.used || 0); if (a.error) { res[i] = { ...b, used, error: b.error && a.error }; return; }
      const data = { ...b.data, ...a.data }; res[i] = { data, used, cut: a.cut || (b.cut && Object.keys(b.data).some((k) => !(k in a.data))), retried: round, miss: textKeys(PARTS[i]).filter((k) => typeof data[k] !== 'string') }; });
  }
  const failed = res.filter((r) => r.error); if (failed.length === res.length) return { error: 'The AI could not write the ' + (kind === 'report' ? 'ESG report' : 'sustainability statement') + ': ' + failed[0].error };
  const raw = Object.assign({}, ...res.map((r) => r.data)), tokens = res.reduce((a, r) => a + (r.used || 0), 0);
  const sections = {};   // text stays text (long), lists stay lists of small objects
  Object.entries(raw).forEach(([k, v]) => { const kk = str(k, 40).replace(/[^a-z0-9_]/gi, ''); if (!kk) return;
    if (typeof v === 'string') sections[kk] = str(v, 9000);
    else if (Array.isArray(v)) sections[kk] = v.slice(0, 24).map((x) => (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).slice(0, 8).map(([a, b]) => [str(a, 30), str(b, 1500)])) : str(x, 600))).filter((x) => (typeof x === 'string' ? x : Object.values(x).join('')));
  });
  // a part the AI still could not write keeps its text from the latest earlier version, so no chapter is left empty
  const prev0 = await kv.get('esgdoc:' + e.id + ':' + kind).catch(() => null), prevDoc = prev0 && prev0.lang === L ? prev0 : null, kept = [], lost = [];   // only text in the same language is reused
  let keptRev = null;
  res.forEach((r, i) => { const miss = keysOf(PARTS[i]).filter((k) => sections[k] == null); if (!r.error && !miss.length) return; const name = (PARTS[i].ask.match(/PART ([A-Z]) \(([^)]+)\)/) || [])[0] || ('part ' + (i + 1)), ks = keysOf(PARTS[i]).filter((k) => prevDoc && prevDoc.sections && prevDoc.sections[k] != null && sections[k] == null);
    if (ks.length) { ks.forEach((k) => { sections[k] = prevDoc.sections[k]; }); keptRev = keptRev == null ? prevDoc.rev : Math.min(keptRev, prevDoc.rev); kept.push((r.error ? name : ks.length + ' section' + (ks.length === 1 ? '' : 's') + ' of ' + name) + ' kept from v' + prevDoc.ver); }
    const still = keysOf(PARTS[i]).filter((k) => sections[k] == null);   // narratives and tables alike   // checked again after any text was restored, so every missing section is named
    if (still.length) lost.push(name + ' (' + (r.error && !ks.length ? str(r.error, 90) + '; ' : '') + 'left out: ' + still.join(', ') + ')'); });
  const cut = res.filter((r) => r.cut).length;
  const rec = { at: Date.now(), by: str(by, 60), kind, ver: 0, lang: L, tokens, cap: budget, parts: PARTS.length, partial: [lost.length ? lost.length + ' of ' + PARTS.length + ' parts could not be written in full: ' + lost.join('; ') : '', kept.length ? 'the AI could not rewrite ' + kept.join(', ') : '', cut ? cut + ' part' + (cut === 1 ? ' was' : 's were') + ' cut short by the token limit' : ''].filter(Boolean).join('; '), method: METHOD, std: e.std || [], rev: keptRev != null && keptRev < e.rev ? keptRev : e.rev, sections };   // text kept from an older version keeps the older data version, so the out-of-date warning shows
  // the version is given out atomically, so two people writing at once get v2 and v3, not two v2s
  const saved = await kv.update('esgdoc:' + e.id + ':' + kind, (prev) => ({ ...rec, ver: ((prev && prev.ver) || 0) + 1 }), () => null), ver = saved.ver; rec.ver = ver;
  await kv.update('esg:' + e.id, (x) => { if (!x) return x; x.docs = [{ kind, ver, at: rec.at, by: rec.by, lang: L, tokens, std: rec.std, partial: rec.partial, rev: rec.rev }].concat(x.docs || []).sort((a, b) => (b.kind === a.kind ? b.ver - a.ver : b.at - a.at)).slice(0, 40); logIt(x, by, (kind === 'report' ? 'ESG report' : 'Sustainability statement') + ' narrative v' + ver + ' written by AI (' + tokens.toLocaleString('en-AU') + ' tokens)'); return x; }, () => null).catch(() => {});
  await usage(1, tokens);
  return rec;
}
const PILLAR = { env: 'Environment (emissions, energy, water, waste, climate risk and targets)', soc: 'Social (workforce, safety, diversity, human rights, Indigenous peoples, community, suppliers)', gov: 'Governance (board, ethics, anti-corruption, risk, cyber, certifications)' };
/* ---------------- 📥 reading data in: electricity bills, and spreadsheets from other systems ---------------- */
const BILL_SYS = 'You read electricity bills (utility invoices) for greenhouse gas reporting. Return JSON only. Never invent a number: leave a value null when the bill does not show it. Quantities are energy actually used in the billing period (not demand kW, not estimates of future use).';
export async function readBill(text, file, by) {
  if (!llmSetup()) return { error: 'AI is not set up yet: add LLM_API_KEY (DeepSeek) in Netlify.' };
  try { await checkLimit(); } catch (err) { return { error: err.message }; }
  text = String(text || '').slice(0, 24000); if (text.replace(/\s/g, '').length < 40) return { error: '“' + str(file, 120) + '” has no readable text. A scanned bill needs a text PDF (most suppliers can send one), or type the figures in.' };
  const r = await llmJson([{ role: 'system', content: BILL_SYS }, { role: 'user', content: JSON.stringify({ task: 'Find every electricity account or meter on this bill. Keys: "bills": [{"supplier":"","site":"supply address or site name","meter":"NMI, MPAN, meter or account number","from":"YYYY-MM-DD","to":"YYYY-MM-DD","kwh": total electricity used in the period in kWh (add peak, off-peak, shoulder and controlled load; convert MWh to kWh),"green": kWh of GreenPower or renewable electricity bought on this bill (0 if none shown),"cost": total amount of the bill including tax,"cur":"AUD, MYR, SGD..."}], "warnings": ["anything unclear"]', file: str(file, 120), bill: text }) }],
    { maxTokens: 1800, timeoutMs: 120000, temperature: 0 }).catch((err) => ({ error: err.message }));
  if (r.error) return { error: r.error };
  const bills = cleanBills(arr((r.data || {}).bills, 20).map((x) => ({ ...x, file }))), warnings = arr((r.data || {}).warnings, 6).map((x) => str(x, 200)).filter(Boolean);
  await usage(1, r.used || 0);
  return { bills, warnings, tokens: r.used || 0 };
}
// every field a spreadsheet can fill: "section.key" with its label and unit (also the import template)
export function fieldList() { return SECTIONS.flatMap((sec) => sec.fields.map(([k, label, t, opts, hint]) => ({ id: sec.id + '.' + k, section: sec.title, label, type: t, unit: typeof opts === 'string' ? opts : t === 'p' ? '%' : '', options: Array.isArray(opts) ? opts : null }))); }
export async function mapColumns(head, rows, by) {
  if (!llmSetup()) return { error: 'AI is not set up yet: add LLM_API_KEY (DeepSeek) in Netlify.' };
  try { await checkLimit(); } catch (err) { return { error: err.message }; }
  const F = fieldList().map((f) => f.id + ' | ' + f.label + (f.unit ? ' (' + f.unit + ')' : ''));
  const r = await llmJson([{ role: 'system', content: 'You map data exported from another system (an energy portal, HR, payroll, safety, finance or ERP report) onto ESG reporting fields. Return JSON only. Map only when you are sure; convert units when needed (give the factor). Never invent values.' },
    { role: 'user', content: JSON.stringify({ task: 'The sheet is either long (one row per metric: a name column and a value column) or wide (one column per metric). Keys: "layout": "long" or "wide", "name_col": index of the metric-name column (long), "value_col": index of the value column (long), "map": [{"source": the metric name (long) or the column header (wide), "field": one of the field ids, "factor": number to multiply by to get the field unit (1 if none), "why": "short"}]. Wide sheets with several rows: say "sum" true in a map item when the rows should be added up (e.g. monthly kWh).', fields: F, header: arr(head, 60).map((x) => str(x, 80)), rows: arr(rows, 40).map((r0) => arr(r0, 60).map((x) => str(x, 80))) }) }],
    { maxTokens: 2500, timeoutMs: 120000, temperature: 0 }).catch((err) => ({ error: err.message }));
  if (r.error) return { error: r.error };
  const ids = new Set(fieldList().map((f) => f.id)), d = r.data || {};
  await usage(1, r.used || 0);
  return { layout: d.layout === 'wide' ? 'wide' : 'long', nameCol: Number(d.name_col) || 0, valueCol: Number.isFinite(Number(d.value_col)) ? Number(d.value_col) : 1,
    map: arr(d.map, 120).map((m) => ({ source: str(m && m.source, 80), field: str(m && m.field, 40), factor: Number(m && m.factor) || 1, sum: !!(m && m.sum), why: str(m && m.why, 160) })).filter((m) => m.source && ids.has(m.field)), tokens: r.used || 0 };
}
export async function insight(id, pillar, by) {
  const e = await get(id); if (!e) return { error: 'This reporting entity was not found' };
  if (!PILLAR[pillar]) return { error: 'Pick environment, social or governance' };
  if (!llmSetup()) return { error: 'AI is not set up yet: add LLM_API_KEY (DeepSeek) in Netlify.' };
  try { await checkLimit(); } catch (err) { return { error: err.message }; }
  const r = await llmJson([{ role: 'system', content: BASE }, { role: 'user', content: JSON.stringify({ task: 'Review the ' + PILLAR[pillar] + ' performance and disclosures. Keys: "headline" (one sentence), "strengths" (2-4 short strings), "recommendations" (exactly 5 items {"title":"","why":"one sentence with the data","how":"two or three practical steps","standard":"the disclosure it improves, e.g. GRI 305-3 or IFRS S2 §29"}).', organisation_data: facts(e) }) }], { maxTokens: 2500, timeoutMs: 180000, temperature: 0.3 })
    .catch((err) => ({ error: err.message }));
  if (r.error) return { error: r.error };
  const d = r.data || {}, out = { at: Date.now(), by: str(by, 60), headline: str(d.headline, 400), strengths: arr(d.strengths, 6).map((x) => str(x, 300)).filter(Boolean),
    recs: arr(d.recommendations, 6).map((x) => ({ title: str(x && x.title, 160), why: str(x && x.why, 500), how: str(x && x.how, 800), standard: str(x && x.standard, 120) })).filter((x) => x.title) };
  await kv.update('esg:' + e.id, (x) => { if (!x) return x; x.insights = { ...(x.insights || {}), [pillar]: out }; logIt(x, by, 'AI recommendations for ' + { env: 'Environment', soc: 'Social', gov: 'Governance' }[pillar]); return x; }, () => null);
  await usage(1, r.used || 0);
  return { insight: out, tokens: r.used || 0 };
}
/* ---------------- 🌱 the CSO view: every reporting entity at a glance, for the Chief Sustainability Officer ---------------- */
// The reporting calendar (checked November 2026); a date is shown when one of the entity's chosen standards (or its country) applies.
export const CALENDAR = [
  { std: 'AASB_S2', when: '2026-07-01', what: 'AASB S2 Group 2 entities: first climate statements for years beginning on or after 1 July 2026' },
  { std: 'AASB_S2', when: '2027-07-01', what: 'AASB S2 Group 3 entities: first climate statements for years beginning on or after 1 July 2027' },
  { std: 'BURSA', when: '2026-01-01', what: 'NSRF Group 2 (other Main Market issuers): IFRS S2 climate reporting from FY2026' },
  { std: 'BURSA', when: '2027-01-01', what: 'NSRF Group 3 (ACE Market and large non-listed companies): ISSB reporting from FY2027' },
  { std: 'ESRS', when: '2027-01-01', what: 'CSRD wave 2 (after Omnibus I): first reports for FY2027 under the revised ESRS' },
  { std: 'IFRS_S2', when: '2027-01-01', what: 'IFRS S2 amendments on GHG emissions (December 2025) take effect (earlier use allowed)' },
  { std: 'CDP', when: '2027-06-30', what: 'CDP disclosure cycle: questionnaire usually due mid-year (check the CDP timeline)' },
  { std: 'NGER', when: '2027-10-31', what: 'NGER report for 2026-27 due 31 October' }
];
export async function cso(year) {
  const ids = Object.keys(((await kv.get('esg-index')) || { ents: {} }).ents || {}), rows = [];
  for (const id of ids.slice(0, 200)) {
    const e = await get(id); if (!e) continue; const c = compute(e), o = e.org || {};
    const chosen = e.std || [], docs = e.docs || [], last = (k) => docs.filter((d) => d.kind === k)[0] || null;
    rows.push({ id: e.id, name: o.name || 'Untitled', year: o.year || '', industry: o.industry || '', country: o.country || '', updated: e.updated || 0, esg: c.esg, env: c.env.score, soc: c.soc.score, gov: c.gov.score,
      s1: c.em.s1t, s2: c.em.s2loc, s3: c.em.s3t, total: c.em.total, intensity: c.em.intensity, bench: c.em.bench, vsBase: c.em.vsBase, renew: (e.resources || {}).renewPct,
      tgt: (e.climate || {}).tgtPct != null ? (e.climate.tgtPct + '% by ' + (e.climate.tgtYear || '?')) : '', netZero: (e.climate || {}).netZero || '', avoided: c.avoid.total, credits: c.avoid.credits, cbamEU: c.price.cbamEU, cbamUK: c.price.cbamUK, creditQ: c.price.highQualityPct,
      readiness: c.readiness, coverage: c.coverage, std: chosen, gaps: c.env.why.concat(c.soc.why, c.gov.why).slice(0, 4),
      women: c.soc.womenPct, ltifr: (e.workforce || {}).ltifr, deaths: (e.workforce || {}).deaths, indep: (e.board || {}).indepPct, assurance: o.assurance || '',
      statement: last('statement'), report: last('report'), insights: Object.keys(e.insights || {}).length });
  }
  rows.sort((a, b) => (b.total || 0) - (a.total || 0));
  // the headline figures are for one reporting year (adding different years would double count); the table keeps every report and its year
  const years = [...new Set(rows.map((r) => r.year).filter(Boolean))].sort().reverse(), yr = years.includes(year) ? year : years[0] || '', Y = rows.filter((r) => !yr || r.year === yr);
  const sum = (k) => Y.reduce((a, r) => a + (Number(r[k]) || 0), 0), avg = (k) => { const L = Y.filter((r) => r[k] != null); return L.length ? Math.round(L.reduce((a, r) => a + r[k], 0) / L.length) : null; };
  const stdUse = {}; Y.forEach((r) => r.std.forEach((s) => { stdUse[s] = stdUse[s] || { n: 0, cov: 0 }; stdUse[s].n++; stdUse[s].cov += r.coverage[s] || 0; }));
  const byStd = Object.keys(stdUse).map((s) => ({ std: s, name: (STANDARDS.find((x) => x.id === s) || {}).name || s, n: stdUse[s].n, cov: Math.round(stdUse[s].cov / stdUse[s].n) })).sort((a, b) => b.n - a.n);
  const used = new Set(Object.keys(stdUse)), cal = CALENDAR.filter((d) => used.has(d.std)).sort((a, b) => a.when.localeCompare(b.when));
  return { method: METHOD, rows, years, year: yr, totals: { n: Y.length, s1: sum('s1'), s2: sum('s2'), s3: sum('s3'), total: sum('total'), avoided: sum('avoided'), credits: sum('credits'), cbamEU: sum('cbamEU'), cbamUK: sum('cbamUK'), esg: avg('esg'), env: avg('env'), soc: avg('soc'), gov: avg('gov'), readiness: avg('readiness'),
    docs: Y.filter((r) => r.statement || r.report).length, assured: Y.filter((r) => /limited|reasonable/i.test(r.assurance)).length, targets: Y.filter((r) => r.tgt).length }, byStd, calendar: cal };
}

// for Champ (Ask Champ): a short view of every reporting entity, and the open one in full
export async function champFacts(openId) {
  const L = (await list()).slice(0, 12), open = openId ? await get(openId) : null;
  return { entities: L.map((x) => ({ name: x.name, year: x.year, industry: x.industry, esg_score: x.esg, total_tCO2e: x.total, standards: x.std })), open: open ? facts(open) : null };
}
