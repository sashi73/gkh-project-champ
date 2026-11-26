/* GKH Project Champ: 🧪 sample data, made once by the super user.
   - three ESG & Sustainability reporting entities (an airline, a palm oil group, a data-centre operator) with a full year of data,
     material topics, standards, achievements and avoided emissions; their Statement and ESG report are left for the user to write
   - two programs: "Green Freight Hub" (about 80% done, two projects) and "Coral Sky Sustainable Operations" (about 50% done, three projects),
     every project with a schedule and costs, actuals, risks, issues, assumptions, dependencies, stakeholders, an approved charter,
     a baseline, a change request, lessons learned and its ESG & Sustainability data (activity data, P5 scores, social figures)
   Running it again adds nothing: the names are checked first. */
import * as kv from './kv.mjs';

const SAMPLE_KEY = 'sample-portfolio';
const d0 = (s) => new Date(s + 'T00:00:00Z');
const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => ymd(new Date(d0(s).getTime() + n * 864e5));

/* ---------- 🌿 three ESG reporting entities ---------- */
export const COMPANIES = [
  { name: 'Coral Sky Airways', year: 'FY2026', industry: 'Airlines', country: 'Australia', currency: 'AUD',
    patch: {
      org: { reg: 'ABN 51 824 753 556 (sample)', from: '2025-07-01', to: '2026-06-30', revenue: 1480, employees: 3120, listing: 'ASX', boundary: 'Operational control',
        entities: 'Coral Sky Airways Limited and its regional subsidiary Coral Sky Connect: 38 aircraft, 4 maintenance bases and 9 airport stations.', assurance: 'Limited assurance', assurer: 'To be appointed',
        about: 'A full-service domestic and short-haul international airline flying 38 aircraft from Brisbane, Sydney and Cairns to 24 destinations in Australia and the Pacific. (Sample data.)' },
      carbon: { fset: 'NGA_AU', jet: 248000000, diesel: 1850000, petrol: 210000, lpg: 0, gas: 9200, refrig: 410, refGwp: 1430, elec: 21500, green: 4300, baseYear: 'FY2023', baseT: 690000 },
      scope3: { purch: 610000, freight: 9600000, landfill: 2350, recycled: 1180, air: 6800000, car: 1450000, hotel: 9800, commute: 18400000, water: 186000 },
      resources: { renewPct: 20, waterWd: 186000, waterStress: 'No', wasteT: 3530, hazT: 142, divertPct: 33, iso14001: 'Certified', envFines: 0, biodiv: 'No' },
      climate: { tgtPct: 25, tgtYear: '2030', netZero: '2050', sbti: 'Committed', scenario: 'Yes', transition: 'Partly', carbonPrice: 40, boardClimate: 'Yes', climatePay: 'Yes',
        risks: 'Carbon pricing and the Safeguard Mechanism baseline decline raising costs · transition · high\nTropical cyclones and floods closing northern airports · physical · high\nShortage and price of sustainable aviation fuel (SAF) · transition · high\nHeat reducing take-off performance in summer · physical · medium',
        opps: 'SAF offtake agreements and a Queensland biorefinery partnership\nNew-generation aircraft with lower fuel burn\nContrail-avoiding flight planning', offsets: 0 },
      workforce: { fte: 3120, under18: 0, a18: 1610, a41: 1100, a55: 410, women: 1310, mgmt: 280, womenMgmt: 96, hires: 410, leavers: 296, injuries: 38, deaths: 0, ltifr: 2.1, hours: 5600000, safetyTrain: 99, trainHrs: 46, payGap: 14.8, bargain: 78 },
      rights: { hrPolicy: 'Yes', antiDisc: 'Yes', sWhistle: 'Yes', psycho: 'Yes', childLabour: 'Yes', modernSlavery: 'Yes', livingWage: 'Yes', indigPolicy: 'Yes', indigPct: 2.6 },
      community: { dei: 'Yes', parental: 'Yes', wellbeing: 'Yes', invest: 1850000, volHrs: 7400, supAudit: 48, localPct: 81, divHires: 34, grievance: 'Formal and published', privacyComplaints: 6 },
      board: { boardSize: 9, boardWomen: 4, indepPct: 78, chairSep: 'Yes', susCommittee: 'Yes', indepSus: 'Yes', boardTrain: 'Yes', execEsg: 'Yes' },
      ethics: { code: 'Yes', gWhistle: 'Yes', antiCorrupt: 'Yes', corruptCases: 0, abcTrain: 94, erm: 'Integrated', audit: 'Yes', cyber: 'Yes', privacy: 'Formal', breaches: 1, tax: 'Yes', political: 'Yes', stakeGriev: 'Yes' },
      certs: { iso45001: 'Yes', iso27001: 'Yes', iso9001: 'Yes', grc: 'Deployed', susReport: 'Yes', ethicsAuditPct: 70 },
      std: ['AASB_S2', 'IFRS_S1', 'IFRS_S2', 'GRI', 'TCFD', 'GHGP', 'NGER', 'SBTI', 'SDG'],
      mat: { ghg: { imp: 4, fin: 4 }, energy: { imp: 4, fin: 4 }, safety: { imp: 4, fin: 4 }, people: { imp: 3, fin: 3 }, dei: { imp: 3, fin: 2 }, customers: { imp: 3, fin: 4 }, supply: { imp: 3, fin: 3 }, waste: { imp: 2, fin: 1 }, cyber: { imp: 2, fin: 4 }, governance: { imp: 2, fin: 3 }, community: { imp: 2, fin: 2 } },
      avoid: [{ name: 'SAF blended into fuel at Brisbane', cat: 'Renewable energy', baseline: 'Fossil jet fuel per litre', unit: 'L', qty: 3100000, base: 2.56, sol: 0.51, attr: 100, status: 'Delivered', verify: 'Internal review', sdg: 'SDG 13' },
        { name: 'Electric ground support equipment at Cairns', cat: 'Fleet electrification and low-emission transport', baseline: 'Diesel tugs and loaders per hour', unit: 'h', qty: 42000, base: 18, sol: 4, attr: 100, status: 'Delivered', verify: 'Estimate', sdg: 'SDG 11' }],
      achieve: [
        { pillar: 'C', area: 'Fleet and equipment renewal', what: 'Took delivery of four new-generation narrow-body aircraft', result: 'They burn about 16% less fuel per seat than the aircraft they replaced', metric: 'New-generation aircraft in the fleet', prev: 18, now: 29, unit: '%', better: 'higher', status: 'Done', when: 'March 2026' },
        { pillar: 'C', area: 'Sustainable fuels (such as SAF)', what: 'First SAF offtake: 3.1 million litres blended at Brisbane', result: 'Cut about 6,300 tCO2e on a life-cycle basis', metric: 'SAF share of fuel', prev: 0.4, now: 1.2, unit: '%', better: 'higher', status: 'Done', when: 'January 2026' },
        { pillar: 'C', area: 'Route, network and operational optimisation', what: 'Single-engine taxi and continuous descent on all domestic routes', result: 'Saved about 7,900 tonnes of fuel', metric: 'Fuel efficiency', prev: 3.62, now: 3.41, unit: 'L per 100 RTK', better: 'lower', status: 'Done', when: 'Through the year' },
        { pillar: 'E', area: 'Waste and circularity', what: 'Removed single-use plastics from in-flight service', result: '96 tonnes of plastic a year avoided', status: 'Done', when: 'October 2025' },
        { pillar: 'S', area: 'Safety performance', what: 'Fatigue risk management system extended to ground crews', result: 'Lost-time injuries fell from 52 to 38', metric: 'Lost-time injury frequency', prev: 2.9, now: 2.1, unit: 'per million hours', better: 'lower', status: 'Done' },
        { pillar: 'S', area: 'Diversity and inclusion', what: 'Women in Aviation cadetship: 22 cadets started', metric: 'Women pilots and engineers', prev: 9.5, now: 11.8, unit: '%', better: 'higher', status: 'Done', when: 'February 2026' },
        { pillar: 'G', area: 'Certifications achieved', what: 'IATA Environmental Assessment (IEnvA) Stage 1 certification', status: 'Done', when: 'May 2026' },
        { pillar: 'G', area: 'Partnerships', what: 'Partnership with a Queensland biorefinery for local SAF supply from 2028', status: 'Under way' }] } },
  { name: 'Kinabalu Palm Holdings Berhad', year: 'FY2026', industry: 'Palm Oil & Plantations', country: 'Malaysia', currency: 'MYR',
    patch: {
      org: { reg: '201501012345 (sample)', from: '2025-01-01', to: '2025-12-31', revenue: 2650, employees: 8400, listing: 'Bursa Malaysia Main Market', boundary: 'Operational control',
        entities: 'Kinabalu Palm Holdings Berhad: 41,000 hectares of oil palm in Sabah, 6 palm oil mills, 2 kernel crushing plants and a refinery in Sandakan.', assurance: 'Limited assurance', assurer: 'To be appointed',
        about: 'An integrated palm oil group in Sabah growing, milling and refining certified sustainable palm oil for export. (Sample data.)' },
      carbon: { fset: 'LIB_EF18', diesel: 9400000, petrol: 520000, lpg: 0, gas: 0, refrig: 180, refGwp: 1924, elec: 38500, green: 22000, baseYear: '2022', baseT: 310000 },
      scope3: { purch: 980000, freight: 46000000, landfill: 1400, recycled: 61000, air: 2100000, car: 3300000, hotel: 2600, commute: 9800000, water: 0 },
      resources: { renewPct: 57, waterWd: 4100000, waterStress: 'No', wasteT: 62400, hazT: 310, divertPct: 98, iso14001: 'Certified', envFines: 0, biodiv: 'Yes' },
      climate: { tgtPct: 42, tgtYear: '2030', netZero: '2050', sbti: 'Validated', scenario: 'Partly', transition: 'Yes', carbonPrice: 15, boardClimate: 'Yes', climatePay: 'Yes',
        risks: 'Drought and El Niño cutting fresh fruit bunch yields · physical · high\nEU Deforestation Regulation (EUDR) traceability for exports · transition · high\nFlooding of low-lying estates and mills · physical · medium\nMalaysian carbon tax on high emitters from 2026 · transition · medium',
        opps: 'Methane capture at every mill, selling biogas power to the grid\nCertified (RSPO, MSPO) premium markets\nCarbon credits from conservation set-asides', offsets: 0 },
      workforce: { fte: 8400, under18: 0, a18: 4100, a41: 3300, a55: 1000, women: 2350, mgmt: 410, womenMgmt: 88, hires: 1980, leavers: 1710, injuries: 96, deaths: 1, ltifr: 3.4, hours: 19800000, safetyTrain: 92, trainHrs: 21, payGap: 11.2, bargain: 54 },
      rights: { hrPolicy: 'Yes', antiDisc: 'Yes', sWhistle: 'Yes', psycho: 'Partly', childLabour: 'Yes', modernSlavery: 'Yes', livingWage: 'Partly', indigPolicy: 'Yes', indigPct: 18 },
      community: { dei: 'Yes', parental: 'Yes', wellbeing: 'Yes', invest: 6400000, volHrs: 12000, supAudit: 74, localPct: 88, divHires: 22, grievance: 'Formal and published', privacyComplaints: 0 },
      board: { boardSize: 9, boardWomen: 3, indepPct: 56, chairSep: 'Yes', susCommittee: 'Yes', indepSus: 'Yes', boardTrain: 'Yes', execEsg: 'Yes' },
      ethics: { code: 'Yes', gWhistle: 'Yes', antiCorrupt: 'Yes', corruptCases: 0, abcTrain: 90, erm: 'Integrated', audit: 'Yes', cyber: 'Yes', privacy: 'Formal', breaches: 0, tax: 'Yes', political: 'Yes', stakeGriev: 'Yes' },
      certs: { iso45001: 'Yes', iso27001: 'No', iso9001: 'Yes', grc: 'Manual', susReport: 'Yes', ethicsAuditPct: 60 },
      std: ['BURSA', 'IFRS_S1', 'IFRS_S2', 'GRI', 'TCFD', 'GHGP', 'TNFD', 'SBTI', 'SDG'],
      mat: { biodiv: { imp: 4, fin: 4 }, ghg: { imp: 4, fin: 3 }, rights: { imp: 4, fin: 3 }, indigenous: { imp: 4, fin: 3 }, water: { imp: 3, fin: 2 }, safety: { imp: 4, fin: 3 }, supply: { imp: 3, fin: 4 }, pollution: { imp: 3, fin: 2 }, community: { imp: 3, fin: 2 }, governance: { imp: 2, fin: 3 } },
      avoid: [{ name: 'Methane capture at four palm oil mills', cat: 'Methane capture', baseline: 'Open POME ponds venting methane', unit: 't COD', qty: 52000, base: 5.6, sol: 0.6, attr: 100, status: 'Delivered', verify: 'Third-party verified', sdg: 'SDG 13' },
        { name: 'Biogas power exported to the Sabah grid', cat: 'Renewable energy', baseline: 'Sabah grid electricity', unit: 'MWh', qty: 21000, base: 539, sol: 0, attr: 100, status: 'Delivered', verify: 'Internal review', sdg: 'SDG 7' }],
      achieve: [
        { pillar: 'C', area: 'Emissions and fuel efficiency', what: 'Methane capture commissioned at the fourth mill', result: 'Mill methane emissions down by about 43,000 tCO2e', metric: 'Mills with methane capture', prev: 3, now: 4, unit: 'mills', better: 'higher', status: 'Done', when: 'August 2025' },
        { pillar: 'E', area: 'Biodiversity and land', what: '2,400 hectares of riparian forest set aside and restored', result: 'Orangutan corridor reconnected along the Kinabatangan', status: 'Done' },
        { pillar: 'E', area: 'Water', what: 'Treated mill effluent reused for boiler feed', metric: 'Water intensity', prev: 1.42, now: 1.18, unit: 'm3 per t FFB', better: 'lower', status: 'Done' },
        { pillar: 'S', area: 'Human rights', what: 'Responsible recruitment: zero recruitment fees for migrant workers', result: 'Fees repaid to 1,240 workers', status: 'Done', when: 'June 2025' },
        { pillar: 'G', area: 'Certifications achieved', what: 'RSPO certification for all six mills', status: 'Done', when: 'November 2025' },
        { pillar: 'G', area: 'Technology, data and digital', what: 'EUDR traceability to plantation for 96% of supply', metric: 'Traceable to plantation', prev: 71, now: 96, unit: '%', better: 'higher', status: 'Done' }] } },
  { name: 'Harbourline Data Centres Pte Ltd', year: 'FY2026', industry: 'Data Centres', country: 'Singapore', currency: 'SGD',
    patch: {
      org: { reg: '201812345K (sample)', from: '2025-04-01', to: '2026-03-31', revenue: 420, employees: 640, listing: 'Not listed', boundary: 'Operational control',
        entities: 'Harbourline Data Centres: three data centres in Singapore (52 MW IT load) and one in Johor, Malaysia (24 MW).', assurance: 'Reasonable assurance', assurer: 'To be appointed',
        about: 'A colocation and hyperscale data-centre operator in Singapore and Johor. (Sample data.)' },
      carbon: { fset: 'SG_EMA', diesel: 210000, petrol: 8000, lpg: 0, gas: 0, refrig: 950, refGwp: 2088, elec: 612000, green: 168000, baseYear: 'FY2024', baseT: 268000 },
      scope3: { purch: 160000, freight: 820000, landfill: 140, recycled: 610, air: 980000, car: 210000, hotel: 1300, commute: 2400000, water: 640000 },
      resources: { renewPct: 27, waterWd: 640000, waterStress: 'No', wasteT: 750, hazT: 22, divertPct: 81, iso14001: 'Certified', envFines: 0, biodiv: 'No' },
      climate: { tgtPct: 50, tgtYear: '2030', netZero: '2040', sbti: 'Validated', scenario: 'Yes', transition: 'Yes', carbonPrice: 45, boardClimate: 'Yes', climatePay: 'Yes',
        risks: 'Rising Singapore carbon tax (S$45 a tonne from 2026) · transition · high\nHeat and humidity raising cooling energy · physical · high\nGrid supply limits on new capacity · transition · medium\nWater scarcity in Johor · physical · medium',
        opps: 'Green power purchase agreements and imported renewable electricity\nLiquid cooling for AI workloads\nHeat reuse for nearby buildings', offsets: 0 },
      workforce: { fte: 640, under18: 0, a18: 300, a41: 270, a55: 70, women: 160, mgmt: 74, womenMgmt: 19, hires: 120, leavers: 74, injuries: 3, deaths: 0, ltifr: 0.8, hours: 1300000, safetyTrain: 100, trainHrs: 38, payGap: 8.1, bargain: 0 },
      rights: { hrPolicy: 'Yes', antiDisc: 'Yes', sWhistle: 'Yes', psycho: 'Yes', childLabour: 'Yes', modernSlavery: 'Yes', livingWage: 'Yes', indigPolicy: 'No', indigPct: 0 },
      community: { dei: 'Yes', parental: 'Yes', wellbeing: 'Yes', invest: 320000, volHrs: 1800, supAudit: 62, localPct: 64, divHires: 31, grievance: 'Formal and published', privacyComplaints: 0 },
      board: { boardSize: 7, boardWomen: 2, indepPct: 57, chairSep: 'Yes', susCommittee: 'Yes', indepSus: 'Yes', boardTrain: 'Yes', execEsg: 'Yes' },
      ethics: { code: 'Yes', gWhistle: 'Yes', antiCorrupt: 'Yes', corruptCases: 0, abcTrain: 97, erm: 'Integrated', audit: 'Yes', cyber: 'Yes', privacy: 'Formal', breaches: 0, tax: 'Yes', political: 'Yes', stakeGriev: 'Yes' },
      certs: { iso45001: 'Yes', iso27001: 'Yes', iso9001: 'Yes', grc: 'Deployed', susReport: 'Yes', ethicsAuditPct: 80 },
      std: ['SGX', 'IFRS_S1', 'IFRS_S2', 'GRI', 'TCFD', 'GHGP', 'ISO50001', 'SBTI', 'SDG'],
      mat: { energy: { imp: 4, fin: 4 }, ghg: { imp: 4, fin: 4 }, water: { imp: 3, fin: 3 }, cyber: { imp: 3, fin: 4 }, customers: { imp: 3, fin: 4 }, supply: { imp: 3, fin: 3 }, people: { imp: 2, fin: 3 }, governance: { imp: 2, fin: 3 }, waste: { imp: 2, fin: 1 } },
      avoid: [{ name: 'Free cooling and higher set points in two halls', cat: 'Energy efficiency', baseline: 'Previous cooling energy per MWh of IT load', unit: 'MWh', qty: 31000, base: 412, sol: 0, attr: 100, status: 'Delivered', verify: 'Internal review', sdg: 'SDG 7' }],
      achieve: [
        { pillar: 'C', area: 'Energy efficiency', what: 'Liquid cooling and hot-aisle containment in Halls 3 and 4', result: 'Power usage effectiveness improved across Singapore', metric: 'Power usage effectiveness (PUE)', prev: 1.42, now: 1.33, unit: 'PUE', better: 'lower', status: 'Done', when: 'September 2025' },
        { pillar: 'C', area: 'Renewable energy', what: '10-year solar power purchase agreement signed in Johor', metric: 'Renewable electricity', prev: 18, now: 27, unit: '%', better: 'higher', status: 'Done', when: 'December 2025' },
        { pillar: 'E', area: 'Water', what: 'NEWater for cooling towers at two sites', metric: 'Water usage effectiveness (WUE)', prev: 1.21, now: 1.05, unit: 'L per kWh', better: 'lower', status: 'Done' },
        { pillar: 'S', area: 'Training and development', what: 'Data-centre technician apprenticeship with ITE: 28 apprentices', status: 'Done', when: 'January 2026' },
        { pillar: 'G', area: 'Certifications achieved', what: 'ISO 50001 energy management certification at all sites', status: 'Done', when: 'March 2026' },
        { pillar: 'G', area: 'Disclosure and assurance', what: 'First reasonable assurance of Scope 1 and 2', status: 'Under way' }] } }];

/* ---------- 🗂 two programs and five projects ---------- */
// a task: [name, working days, rate, qty, unit, resource]
export const PROJECTS = [
  { program: 'Green Freight Hub', target: 88, start: '2026-04-06', name: 'Solar and battery retrofit, Eastern Creek warehouse', client: 'GKH EcoVista Holdings (sample)', site: 'Eastern Creek NSW', manager: 'Priya Nair', sponsor: 'Daniel Ong',
    phases: [['Initiation and design', [['Site survey and roof assessment', 5, 165, 40, 'h', 'Solar engineer'], ['Structural check of the roof', 4, 180, 32, 'h', 'Structural engineer'], ['System design and grid application', 8, 165, 64, 'h', 'Solar engineer'], ['Design approved', 0]]],
      ['Procurement', [['Order panels, inverters and batteries', 3, 412000, 1, 'lot', 'Procurement lead'], ['Mounting system and cabling', 3, 68000, 1, 'lot', 'Procurement lead'], ['Delivery and site set-up', 4, 120, 64, 'h', 'Site crew']]],
      ['Installation', [['Install mounting rails', 10, 95, 320, 'h', 'Installers'], ['Install 1.2 MW of panels', 14, 95, 560, 'h', 'Installers'], ['Install inverters and 2 MWh battery', 8, 120, 256, 'h', 'Electricians'], ['Switchboard upgrade', 5, 130, 120, 'h', 'Electricians']]],
      ['Commissioning and handover', [['Testing and commissioning', 6, 150, 96, 'h', 'Commissioning engineer'], ['Grid connection and metering', 5, 18000, 1, 'lot', 'Network operator'], ['Training for facility staff', 2, 120, 24, 'h', 'Solar engineer'], ['Handover and close', 0]]]],
    esg: { fset: 'NGA_AU', act: { diesel: 2600, petrol: 900, elec: 14000, greenPct: 30, air: 18000, car: 9500, hotel: 30, freight: 54000, landfill: 6.5, recycled: 21, water: 120, steel: 48, aluminium: 36, concrete: 15, glass: 62 },
      baseT: 820, capT: 720, fw: ['IFRS_S2', 'GHGP', 'SBTI', 'P5', 'PAS2080'], soc: { workers: 34, localPct: 79, apprentices: 4, hours: 21400, injuries: 1, lti: 0, invest: 12000, localSpendPct: 61 },
      p5: { 'people.labour': [4, 'Local electricians and four apprentices'], 'people.society': [4, 'Quiet hours kept for neighbours'], 'people.rights': [3, 'Supplier declarations on forced labour in solar supply chains'], 'people.ethics': [4, 'Open tender for panels'], 'planet.transport': [3, 'One delivery consolidated from the port'], 'planet.energy': [5, '1.2 MW of solar replaces grid power for 25 years'], 'planet.land': [3, 'Roof only, no land cleared'], 'planet.consumption': [4, 'Packaging returned to the supplier'], 'prosperity.agility': [4, 'Battery lets the site trade energy'], 'prosperity.economic': [4, 'Local installers'], 'prosperity.roi': [5, 'Payback in 6.5 years'], 'process.maturity': [4, 'Carbon reviewed at each gate'], 'process.efficiency': [3], 'product.lifespan': [5, '25-year panels, cyclone-rated mounts'], 'product.servicing': [4, 'Panel take-back agreed'] } } },
  { program: 'Green Freight Hub', target: 72, start: '2026-05-18', name: 'Electric delivery fleet rollout, Sydney', client: 'GKH EcoVista Holdings (sample)', site: 'Sydney NSW', manager: 'Priya Nair', sponsor: 'Daniel Ong',
    phases: [['Planning', [['Route and duty-cycle analysis', 6, 150, 48, 'h', 'Fleet analyst'], ['Business case and vehicle selection', 5, 150, 40, 'h', 'Fleet analyst'], ['Board approval', 0]]],
      ['Charging infrastructure', [['Depot power upgrade design', 6, 170, 48, 'h', 'Electrical engineer'], ['Install 24 depot chargers', 12, 18500, 24, 'each', 'Charging contractor'], ['Load management software', 4, 42000, 1, 'lot', 'Software vendor']]],
      ['Vehicles', [['Order 30 electric vans', 3, 89000, 30, 'each', 'Procurement lead'], ['Vehicle delivery and fit-out', 15, 2600, 30, 'each', 'Fit-out contractor'], ['Driver training', 6, 95, 240, 'h', 'Trainer']]],
      ['Go-live', [['Pilot on 8 routes', 15, 110, 160, 'h', 'Operations'], ['Roll out to all routes', 20, 110, 320, 'h', 'Operations'], ['Benefits review', 4, 150, 32, 'h', 'Fleet analyst'], ['Close', 0]]]],
    esg: { fset: 'NGA_AU', act: { diesel: 18500, petrol: 2100, elec: 96000, greenPct: 30, air: 9000, car: 6200, hotel: 12, freight: 38000, landfill: 2.4, recycled: 8, water: 60, steel: 6, aluminium: 1.5, concrete: 22 },
      baseT: 210, capT: 190, fw: ['IFRS_S2', 'GHGP', 'SBTI', 'P5'], soc: { workers: 22, localPct: 85, apprentices: 2, hours: 14600, injuries: 1, lti: 1, invest: 5000, localSpendPct: 44 },
      p5: { 'people.labour': [4], 'people.society': [4, 'Quieter vans for night deliveries'], 'people.rights': [2, 'Battery cobalt sourcing not yet traced'], 'people.ethics': [4], 'planet.transport': [5, 'Replaces 30 diesel vans'], 'planet.energy': [4], 'planet.land': [3], 'planet.consumption': [3], 'prosperity.agility': [3], 'prosperity.economic': [3], 'prosperity.roi': [4, 'Fuel and maintenance savings'], 'process.maturity': [3], 'process.efficiency': [4], 'product.lifespan': [4], 'product.servicing': [3, 'Battery second-life plan needed'] } } },
  { program: 'Coral Sky Sustainable Operations', target: 76, start: '2026-06-22', name: 'Hangar LED and HVAC upgrade, Brisbane', client: 'Coral Sky Airways (sample)', site: 'Brisbane Airport QLD', manager: 'Marcus Lee', sponsor: 'Helen Carter',
    phases: [['Design', [['Energy audit of hangars 1 and 2', 5, 160, 40, 'h', 'Energy auditor'], ['LED and HVAC design', 8, 170, 64, 'h', 'Building services engineer'], ['Design approved', 0]]],
      ['Lighting', [['Supply high-bay LED fittings', 3, 96000, 1, 'lot', 'Procurement lead'], ['Install LED with sensors', 10, 105, 320, 'h', 'Electricians']]],
      ['HVAC', [['Supply heat pumps and controls', 4, 288000, 1, 'lot', 'Procurement lead'], ['Install heat pumps', 14, 120, 448, 'h', 'HVAC technicians'], ['Building management system tuning', 6, 150, 48, 'h', 'Controls engineer']]],
      ['Close-out', [['Measurement and verification', 10, 150, 60, 'h', 'Energy auditor'], ['Handover', 0]]]],
    esg: { fset: 'NGA_AU', act: { diesel: 900, petrol: 400, elec: 22000, greenPct: 20, air: 4200, car: 3100, hotel: 6, freight: 12000, landfill: 3.1, recycled: 11, water: 40, steel: 9, aluminium: 4, glass: 2 },
      baseT: 120, capT: 110, fw: ['IFRS_S2', 'GHGP', 'P5', 'GREENSTAR'], soc: { workers: 18, localPct: 90, apprentices: 2, hours: 9800, injuries: 0, lti: 0, localSpendPct: 70 },
      p5: { 'people.labour': [4], 'people.society': [3], 'people.rights': [3], 'people.ethics': [4], 'planet.transport': [3], 'planet.energy': [5, 'Hangar energy down about 38%'], 'planet.land': [3], 'planet.consumption': [4, 'Old fittings recycled'], 'prosperity.agility': [3], 'prosperity.economic': [3], 'prosperity.roi': [5], 'process.maturity': [4], 'process.efficiency': [4], 'product.lifespan': [4], 'product.servicing': [4] } } },
  { program: 'Coral Sky Sustainable Operations', target: 50, start: '2026-08-10', name: 'SAF supply and blending readiness', client: 'Coral Sky Airways (sample)', site: 'Brisbane Airport QLD', manager: 'Marcus Lee', sponsor: 'Helen Carter',
    phases: [['Strategy', [['SAF market scan and supplier long-list', 8, 190, 64, 'h', 'Fuel strategist'], ['Life-cycle emissions method (CORSIA)', 6, 210, 48, 'h', 'Sustainability analyst'], ['SAF strategy approved', 0]]],
      ['Commercial', [['Request for proposals to suppliers', 10, 190, 80, 'h', 'Fuel strategist'], ['Negotiate offtake agreement', 15, 260, 120, 'h', 'Commercial lead'], ['Book-and-claim registry set-up', 6, 38000, 1, 'lot', 'Registry provider']]],
      ['Operations', [['Fuel farm compatibility checks', 8, 175, 64, 'h', 'Fuel engineer'], ['First blended delivery trial', 10, 85000, 1, 'lot', 'Fuel supplier'], ['Reporting into the ESG data', 5, 150, 40, 'h', 'Sustainability analyst'], ['Go-live', 0]]]],
    esg: { fset: 'NGA_AU', act: { diesel: 300, petrol: 200, elec: 3500, greenPct: 20, air: 26000, car: 4800, hotel: 24, landfill: 0.4, recycled: 1, water: 10 },
      baseT: 12, capT: 11, fw: ['IFRS_S2', 'GHGP', 'SBTI', 'ISO14064_2', 'P5'], soc: { workers: 9, localPct: 100, hours: 4200, injuries: 0, lti: 0 },
      p5: { 'people.labour': [3], 'people.society': [4], 'people.rights': [2, 'Feedstock origin must be checked for land and labour rights'], 'people.ethics': [3], 'planet.transport': [3], 'planet.energy': [5, 'Each litre of SAF cuts about 80% of life-cycle CO2'], 'planet.land': [2, 'Feedstock land-use risk'], 'planet.consumption': [4], 'prosperity.agility': [4], 'prosperity.economic': [4, 'Supports a Queensland biorefinery'], 'prosperity.roi': [2, 'SAF costs two to three times fossil jet fuel'], 'process.maturity': [3], 'process.efficiency': [3] } } },
  { program: 'Coral Sky Sustainable Operations', target: 24, start: '2026-09-21', name: 'Ground support equipment electrification, Cairns', client: 'Coral Sky Airways (sample)', site: 'Cairns Airport QLD', manager: 'Aisha Rahman', sponsor: 'Helen Carter',
    phases: [['Assessment', [['Equipment inventory and duty cycles', 6, 140, 48, 'h', 'Ground operations analyst'], ['Charging and power study', 6, 170, 48, 'h', 'Electrical engineer'], ['Investment approved', 0]]],
      ['Procurement', [['Order 14 electric tugs and loaders', 4, 74000, 14, 'each', 'Procurement lead'], ['Order 10 chargers', 3, 9500, 10, 'each', 'Procurement lead']]],
      ['Deployment', [['Install chargers airside', 12, 125, 288, 'h', 'Electricians'], ['Commission equipment', 10, 120, 160, 'h', 'Ground engineers'], ['Operator training', 6, 95, 180, 'h', 'Trainer'], ['Retire diesel units', 5, 110, 80, 'h', 'Ground engineers'], ['Close', 0]]]],
    esg: { fset: 'NGA_AU', act: { diesel: 1200, petrol: 150, elec: 2500, greenPct: 20, air: 9800, car: 2600, hotel: 14, freight: 26000, landfill: 0.8, recycled: 2.5, water: 15, steel: 3, concrete: 6 },
      baseT: 26, capT: 24, fw: ['IFRS_S2', 'GHGP', 'P5'], soc: { workers: 12, localPct: 75, apprentices: 1, hours: 3100, injuries: 0, lti: 0 },
      p5: { 'people.labour': [4], 'people.society': [4, 'Less apron noise and fumes for ground crews'], 'planet.transport': [4], 'planet.energy': [4], 'planet.consumption': [3], 'prosperity.roi': [3], 'process.maturity': [3] } } }];

const RISKS = [
  ['Heatwave or storm stops outdoor work', 'Summer heat and storm season in the work window', 3, 3, 'Mitigate', 'Schedule outdoor work for mornings; weather allowance in the plan', 'Site lead'],
  ['Long lead time for key equipment', 'Global supply of the main equipment is tight', 3, 4, 'Mitigate', 'Order early and agree delivery dates with penalties', 'Procurement lead'],
  ['Carbon price rises faster than planned', 'Policy changes to carbon pricing', 2, 3, 'Accept', 'Track the internal carbon price in the business case', 'Sponsor'],
  ['Contractor safety incident', 'Work at height and electrical work', 2, 5, 'Mitigate', 'SWMS for every high-risk task; daily toolbox talks', 'Safety adviser']];

function buildPlan(P, core, today, by) {
  const phases = P.phases.map((ph, i) => ({ id: 'ph' + (i + 1), name: ph[0] }));
  const tasks = []; let n = 0, prev = null;
  P.phases.forEach((ph, i) => ph[1].forEach((t) => { const id = 't' + (++n); tasks.push({ id, name: t[0], phase: 'ph' + (i + 1), dur: t[1], rate: t[2] || 0, qty: t[3] || 0, unit: t[4] || '', res: t[5] ? [t[5]] : [], pred: prev ? [prev] : [], pct: 0 }); prev = id; }));
  // progress: whole tasks done in order, by working days, up to the target percentage; the one at the edge part-done
  const W = tasks.reduce((a, t) => a + Math.max(1, t.dur), 0); let left = (P.target / 100) * W;
  for (const t of tasks) { const w = Math.max(1, t.dur); if (left >= w) { t.pct = 100; left -= w; } else { t.pct = Math.max(0, Math.min(95, Math.round((left / w) * 100))); left = 0; } }
  // actual cost: done tasks a little over or under their budget, the part-done one in proportion
  const over = [1.04, 0.97, 1.08, 1.0, 0.95, 1.06, 1.02];
  tasks.forEach((t, i) => { const c = (t.rate || 0) * (t.qty || 0); if (t.pct) t.actual = Math.round(c * (t.pct / 100) * over[i % over.length]); t.status = t.pct >= 100 ? 'Done' : t.pct > 0 ? 'In progress' : 'Not started'; });
  const stake = [[P.sponsor, 'Project sponsor', 'A'], [P.manager, 'Project manager', 'R'], ['Head of sustainability', 'ESG data owner', 'C'], ['Site operations manager', 'Operations', 'C'], ['Finance business partner', 'Finance', 'I']];
  const day = (n0) => addDays(P.start, n0);
  return {
    name: P.name, start: P.start, weekends: false,
    charter: { objective: P.name + ': deliver on time and on budget, and cut the site\'s emissions as planned in the ESG data. (Sample data.)', inScope: P.phases.map((p) => p[0]).join(', ') + '.', outScope: 'Work at other sites; ongoing operation after handover.',
      deliverables: P.phases.flatMap((p) => p[1].filter((t) => !t[1]).map((t) => t[0])).join('; ') + '.', acceptance: 'Commissioning tests passed, emissions savings measured for one month, handover signed by the sponsor.',
      assumptions: 'Access to the site on weekdays; approvals within four weeks.', customer: P.client, manager: P.manager, docVersion: '1.0', docStatus: 'Approved' },
    phases, tasks,
    risks: RISKS.map((r, i) => ({ id: 'r' + (i + 1), title: r[0], cause: r[1], p: r[2], i: r[3], response: r[4], action: r[5], owner: r[6], review: day(60 + i * 14), status: 'Open', raised: day(2 + i) })),
    issues: [{ id: 'i1', title: 'Delivery of the main equipment two weeks late', detail: 'The supplier\'s shipment was delayed at the port.', priority: 'High', owner: 'Procurement lead', raised: day(30), due: day(44), status: P.target >= 70 ? 'Resolved' : 'In progress', resolution: P.target >= 70 ? 'Work resequenced; the delay was recovered.' : '' },
      { id: 'i2', title: 'Access permits for the work area', detail: 'Airside or roof access permits needed renewing.', priority: 'Medium', owner: P.manager, raised: day(20), due: day(28), status: 'Resolved', resolution: 'Permits renewed for the whole project.' }],
    assumptions: [{ id: 'a1', title: 'Grid connection approved within six weeks', owner: P.manager, check: day(45), impact: 'High', status: P.target >= 50 ? 'Holds' : 'Unchecked', raised: day(1), response: 'Validate' },
      { id: 'a2', title: 'Equipment prices hold within 5% of the quote', owner: 'Procurement lead', check: day(30), impact: 'Medium', status: 'Holds', raised: day(1), response: 'Validate' }],
    extDeps: [{ id: 'd1', title: 'Network operator approval', kind: 'Approval', party: 'Network operator', need: day(50), owner: P.manager, status: P.target >= 70 ? 'Delivered' : 'On track', raised: day(3), response: 'Expedite' }],
    stakeholders: stake.map((s, i) => ({ id: 's' + (i + 1), name: s[0], role: s[1], raci: s[2] })),
    changes: [{ id: 'cr1', num: 1, title: 'Add energy monitoring to the scope', desc: 'Sub-metering so the emissions savings can be measured for the ESG report.', reason: 'Needed to report the reduction against the baseline (IFRS S2, PAS 2080).', status: P.target >= 70 ? 'Implemented' : 'Approved', raisedBy: P.manager, raisedAt: d0(day(25)).getTime() }],
    lessons: [{ id: 'l1', title: 'Order long-lead equipment at design approval', category: 'Procurement', phase: P.phases[1][0], impact: 'negative', what: 'The main equipment arrived late because it was ordered after detailed design.', cause: 'Ordering waited for final drawings.', rec: 'Place the order as soon as the design is approved in principle.', status: 'Agreed', reuse: true, source: 'manual', by },
      { id: 'l2', title: 'Measure the baseline before work starts', category: 'ESG', phase: P.phases[0][0], impact: 'positive', what: 'A month of metering before work began made the emissions saving easy to prove.', cause: 'Metering was in the charter.', rec: 'Put baseline metering in every charter.', status: 'Agreed', reuse: true, source: 'manual', by }],
    esg: { fset: P.esg.fset, act: P.esg.act, baseT: P.esg.baseT, capT: P.esg.capT, fw: P.esg.fw, soc: P.esg.soc, note: 'Sample data: activity to date, from fuel cards, meter readings, travel bookings and supplier dockets.',
      p5: Object.fromEntries(Object.entries(P.esg.p5).map(([k, v]) => [k, { s: v[0], note: v[1] || '' }])) } };
}

export async function seed(by, today) {
  const E = await import('./esg.mjs'), Pl = await import('./plan.mjs'), J = await import('./jobs.mjs'), PG = await import('./programs.mjs');
  today = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : ymd(new Date());
  const made = { companies: [], programs: [], projects: [], skipped: [] };
  // 🌿 the companies (skipped when one of the same name is already there)
  const have = new Set((await E.list()).map((x) => String(x.name || (x.org || {}).name || '').toLowerCase()));
  for (const C of COMPANIES) {
    if (have.has(C.name.toLowerCase())) { made.skipped.push(C.name); continue; }
    const r = await E.create({ name: C.name, year: C.year, industry: C.industry, country: C.country, currency: C.currency }, by); if (r.error) throw new Error(r.error);
    const patch = { ...C.patch, org: { ...r.entity.org, ...C.patch.org, name: C.name, year: C.year, industry: C.industry, country: C.country, currency: C.currency } };
    const s = await E.save(r.entity.id, { patch }, by); if (s.error) throw new Error(s.error);
    made.companies.push({ id: r.entity.id, name: C.name });
  }
  // 🗂 the programs and their projects
  const progs = await PG.list(), cards = await Pl.portfolio(today).catch(() => []), names = new Set(cards.map((c) => String(c.name || '').toLowerCase()));
  const PROG_INFO = { 'Green Freight Hub': { manager: 'Priya Nair', sponsor: 'Daniel Ong', client: 'GKH EcoVista Holdings (sample)', objective: 'Cut the warehouse and delivery fleet emissions by 40% by 2028. (Sample data.)', start: '2026-04-06', finish: '2027-02-26' },
    'Coral Sky Sustainable Operations': { manager: 'Marcus Lee', sponsor: 'Helen Carter', client: 'Coral Sky Airways (sample)', objective: 'Ground and fuel projects behind the airline\'s 2030 emissions target. (Sample data.)', start: '2026-06-22', finish: '2027-06-30' } };
  for (const [name, info] of Object.entries(PROG_INFO)) if (!progs.some((p) => p.name.toLowerCase() === name.toLowerCase())) { await PG.save({ name, ...info, status: 'active' }, by); made.programs.push(name); }
  for (const P of PROJECTS) {
    if (names.has(P.name.toLowerCase())) { made.skipped.push(P.name); continue; }
    const core = await J.nextCore('P');
    await J.create({ core, name: P.client, suburb: P.site, service: P.name, summary: P.name + ' (sample project)', program: P.program, manager: P.manager, sponsor: P.sponsor, source: 'Project Champ' }, by);
    await J.setProgram(core, P.program); await J.setStage(core, 'won', by);
    const plan = Pl.clean(buildPlan(P, core, today, by), core);
    // the baseline: the plan as first approved (its dates and costs)
    Pl.schedule(plan); const R = Pl.rollup(plan, today);
    plan.baseline = { at: d0(P.start).getTime(), by, finish: plan.tasks.reduce((a, t) => (t.ef && t.ef > a ? t.ef : a), ''), BAC: R.BAC, why: 'Approved with the charter (sample data)', tasks: Object.fromEntries(plan.tasks.map((t) => [t.id, { es: t.es, ef: t.ef, cost: Pl.taskCost(t) }])) };
    const s = await Pl.save(core, plan, 0, by); if (s && s.conflict) throw new Error('A plan already exists for ' + core);
    made.projects.push({ core, name: P.name, program: P.program, target: P.target });
  }
  await kv.set(SAMPLE_KEY, { at: Date.now(), by, made });
  return made;
}
