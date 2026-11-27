/* GKH Project Champ: 🧪 sample data, second set (loaded once, like the first: sample-once.mjs runOnce2, flag 'sample-esg-2').
   Three more ESG & Sustainability reporting companies, each in industries the first set did not use:
   - Lion City Marine Logistics (Singapore, shipping): a poor performer: emissions rising, no target, weak safety and governance
   - Al Rimal Towers Development (Dubai, real estate development): a poor performer: energy and waste up, few policies, no assurance
   - Najd Cement Company (Saudi Arabia, cement): an average performer: some progress, a target, gaps still open
   Each gets a Sustainability vault with two full years and most of a third, month by month (so the GKH ESG Progress Index
   and the target path show), and supplier ESG data at each SEDG level: Basic (accepted), Intermediate (waiting for review)
   and Advanced (accepted). Their Statement and ESG report are left for the user to write. Running it again adds nothing. */
import * as kv from './kv.mjs';

const YRS = ['2024', '2025', '2026'];   // two full years and January to October 2026
const sea = (m, amp) => 1 + amp * Math.cos(((m - 1) / 12) * 2 * Math.PI - Math.PI * 1.1);   // a seasonal swing (hotter months use more cooling)

export const COMPANIES2 = [
  { name: 'Lion City Marine Logistics Pte Ltd', year: 'FY2025', industry: 'Shipping & Marine Transport', country: 'Singapore', currency: 'SGD', grade: 'poor',
    patch: {
      org: { reg: '200912345M (sample)', from: '2025-01-01', to: '2025-12-31', revenue: 310, employees: 1150, listing: 'Not listed', boundary: 'Operational control',
        entities: 'Lion City Marine Logistics: 14 feeder container vessels and 6 harbour tugs in the Strait of Malacca, a depot at Pasir Panjang.', assurance: 'None', assurer: '',
        about: 'A regional feeder shipping and harbour towage company based in Singapore. (Sample data: a poor performer.)' },
      carbon: { diesel: 61000000, petrol: 120000, lpg: 0, gas: 0, refrig: 1400, refGwp: 2088, elec: 9800, green: 0, baseYear: '', baseT: 0 },
      scope3: { purch: 95000, freight: 0, landfill: 2100, recycled: 140, air: 1600000, car: 380000, hotel: 2200, commute: 3100000, water: 210000 },
      resources: { renewPct: 0, waterWd: 210000, waterStress: 'No', wasteT: 2240, hazT: 310, divertPct: 6, iso14001: 'No', envFines: 3, biodiv: 'No' },
      climate: { tgtPct: 0, tgtYear: '', netZero: '', sbti: 'No', scenario: 'No', transition: 'No', carbonPrice: 0, boardClimate: 'No', climatePay: 'No',
        risks: 'IMO carbon levy and the EU ETS reaching shipping · transition · high\nRising sea levels and storms at the Pasir Panjang depot · physical · medium\nCustomers asking for low-carbon shipping · transition · high', opps: 'Slow steaming and hull cleaning to save fuel', offsets: 0 },
      workforce: { fte: 1150, under18: 0, a18: 420, a41: 520, a55: 210, women: 92, mgmt: 96, womenMgmt: 6, hires: 260, leavers: 240, injuries: 41, deaths: 2, ltifr: 6.4, hours: 2600000, safetyTrain: 58, trainHrs: 9, payGap: 24, bargain: 0 },
      rights: { hrPolicy: 'No', antiDisc: 'Yes', sWhistle: 'No', psycho: 'No', childLabour: 'Yes', modernSlavery: 'No', livingWage: 'No', indigPolicy: 'No', indigPct: 0 },
      community: { dei: 'No', parental: 'No', wellbeing: 'No', invest: 15000, volHrs: 0, supAudit: 4, localPct: 38, divHires: 5, grievance: 'None', privacyComplaints: 2 },
      board: { boardSize: 5, boardWomen: 0, indepPct: 20, chairSep: 'No', susCommittee: 'No', indepSus: 'No', boardTrain: 'No', execEsg: 'No' },
      ethics: { code: 'Yes', gWhistle: 'No', antiCorrupt: 'No', corruptCases: 1, abcTrain: 22, erm: 'Informal', audit: 'Yes', cyber: 'No', privacy: 'Informal', breaches: 1, tax: 'No', political: 'No', stakeGriev: 'No' },
      certs: { iso45001: 'No', iso27001: 'No', iso9001: 'Yes', grc: 'None', susReport: 'No', ethicsAuditPct: 0 },
      achieve: [{ pillar: 'C', area: 'Energy efficiency', what: 'Hull cleaning on four vessels', metric: 'Fuel per voyage', prev: 41, now: 44, unit: 't', better: 'lower', status: 'Under way' },
        { pillar: 'S', area: 'Health and safety', what: 'Two fatalities during mooring operations: investigation open', metric: 'Lost-time injury frequency', prev: 5.1, now: 6.4, unit: 'per million hours', better: 'lower', status: 'Not started' }] },
    vault: { growth: 0.14, amp: 0.05, m: { 'carbon.diesel': 4700000, 'carbon.elec': 760, 'carbon.refrig': 105, 'resources.waterWd': 16500, 'resources.wasteT': 165, 'scope3.landfill': 155, 'scope3.recycled': 10, 'scope3.air': 120000, 'workforce.fte': 1100, 'workforce.hours': 205000, 'workforce.injuries': 3, 'workforce.hires': 20, 'workforce.leavers': 18, 'org.revenue': 25 } } },
  { name: 'Al Rimal Towers Development LLC', year: 'FY2025', industry: 'Real Estate Development', country: 'United Arab Emirates', currency: 'AED', grade: 'poor',
    patch: {
      org: { reg: 'DED-1123456 (sample)', from: '2025-01-01', to: '2025-12-31', revenue: 1850, employees: 2400, listing: 'Not listed', boundary: 'Operational control',
        entities: 'Al Rimal Towers Development: three residential towers under construction in Dubai Marina and Business Bay, two completed towers it manages.', assurance: 'None', assurer: '',
        about: 'A residential tower developer and property manager in Dubai. (Sample data: a poor performer.)' },
      carbon: { diesel: 9200000, petrol: 340000, lpg: 60000, gas: 0, refrig: 3100, refGwp: 2088, elec: 148000, green: 0, baseYear: '', baseT: 0 },
      scope3: { purch: 1450000, freight: 5200000, landfill: 46000, recycled: 2900, air: 4200000, car: 1900000, hotel: 5400, commute: 9800000, water: 1650000 },
      resources: { renewPct: 0, waterWd: 1650000, waterStress: 'Yes', wasteT: 49000, hazT: 820, divertPct: 6, iso14001: 'No', envFines: 2, biodiv: 'No' },
      climate: { tgtPct: 0, tgtYear: '', netZero: '', sbti: 'No', scenario: 'No', transition: 'No', carbonPrice: 0, boardClimate: 'No', climatePay: 'No',
        risks: 'Extreme heat stopping site work in summer · physical · high\nUAE net-zero 2050 rules for new buildings · transition · high\nWater stress and desalination costs · physical · medium', opps: 'Green building ratings (Estidama, LEED) for premium buyers', offsets: 0 },
      workforce: { fte: 2400, under18: 0, a18: 1300, a41: 900, a55: 200, women: 110, mgmt: 140, womenMgmt: 9, hires: 900, leavers: 780, injuries: 96, deaths: 3, ltifr: 7.9, hours: 5900000, safetyTrain: 61, trainHrs: 6, payGap: 31, bargain: 0 },
      rights: { hrPolicy: 'No', antiDisc: 'No', sWhistle: 'No', psycho: 'No', childLabour: 'Yes', modernSlavery: 'No', livingWage: 'No', indigPolicy: 'No', indigPct: 0 },
      community: { dei: 'No', parental: 'No', wellbeing: 'No', invest: 40000, volHrs: 0, supAudit: 0, localPct: 22, divHires: 3, grievance: 'None', privacyComplaints: 4 },
      board: { boardSize: 6, boardWomen: 0, indepPct: 0, chairSep: 'No', susCommittee: 'No', indepSus: 'No', boardTrain: 'No', execEsg: 'No' },
      ethics: { code: 'No', gWhistle: 'No', antiCorrupt: 'No', corruptCases: 2, abcTrain: 10, erm: 'None', audit: 'No', cyber: 'No', privacy: 'Informal', breaches: 2, tax: 'No', political: 'No', stakeGriev: 'No' },
      certs: { iso45001: 'No', iso27001: 'No', iso9001: 'No', grc: 'None', susReport: 'No', ethicsAuditPct: 0 },
      achieve: [{ pillar: 'E', area: 'Waste', what: 'Construction waste segregation at one site', metric: 'Waste diverted from landfill', prev: 8, now: 6, unit: '%', better: 'higher', status: 'Under way' },
        { pillar: 'S', area: 'Health and safety', what: 'Midday work ban in summer applied late at two sites', metric: 'Recordable injuries', prev: 71, now: 96, unit: '', better: 'lower', status: 'Not started' }] },
    vault: { growth: 0.18, amp: 0.22, m: { 'carbon.elec': 11500, 'carbon.diesel': 720000, 'carbon.petrol': 27000, 'carbon.refrig': 240, 'resources.waterWd': 128000, 'resources.wasteT': 3700, 'scope3.landfill': 3450, 'scope3.recycled': 230, 'scope3.freight': 400000, 'workforce.fte': 2250, 'workforce.hours': 470000, 'workforce.injuries': 6, 'workforce.hires': 70, 'workforce.leavers': 62, 'org.revenue': 140 } } },
  { name: 'Najd Cement Company', year: 'FY2025', industry: 'Construction Materials & Cement', country: 'Saudi Arabia', currency: 'SAR', grade: 'average',
    patch: {
      org: { reg: '1010123456 (sample)', from: '2025-01-01', to: '2025-12-31', revenue: 2100, employees: 1650, listing: 'Listed', boundary: 'Operational control',
        entities: 'Najd Cement: two integrated cement plants near Riyadh and Qassim (9.5 million tonnes of clinker a year) and a ready-mix business.', assurance: 'Limited assurance', assurer: 'To be appointed',
        about: 'A cement and ready-mix producer in central Saudi Arabia. (Sample data: an average performer.)' },
      carbon: { diesel: 6800000, petrol: 210000, lpg: 0, gas: 14500000, refrig: 600, refGwp: 2088, elec: 1020000, green: 61000, baseYear: '2022', baseT: 7600000 },
      scope3: { purch: 820000, freight: 380000000, landfill: 1900, recycled: 6100, air: 2100000, car: 900000, hotel: 3100, commute: 7400000, water: 2400000 },
      resources: { renewPct: 6, waterWd: 2400000, waterStress: 'Yes', wasteT: 8000, hazT: 140, divertPct: 76, iso14001: 'Certified', envFines: 0, biodiv: 'No' },
      climate: { tgtPct: 20, tgtYear: '2030', netZero: '2060', sbti: 'Committed', scenario: 'Yes', transition: 'No', carbonPrice: 0, boardClimate: 'Yes', climatePay: 'No',
        risks: 'Carbon pricing under Saudi Green Initiative policies · transition · high\nWater scarcity at the Qassim plant · physical · high\nDemand from Vision 2030 giga-projects for low-carbon cement · transition · medium',
        opps: 'Calcined clay and limestone cement (LC3) to cut clinker\nWaste-heat recovery power at Riyadh\nSolar power purchase agreement', offsets: 0 },
      workforce: { fte: 1650, under18: 0, a18: 600, a41: 820, a55: 230, women: 140, mgmt: 120, womenMgmt: 14, hires: 150, leavers: 120, injuries: 14, deaths: 0, ltifr: 2.1, hours: 3600000, safetyTrain: 92, trainHrs: 24, payGap: 14, bargain: 0 },
      rights: { hrPolicy: 'Yes', antiDisc: 'Yes', sWhistle: 'Yes', psycho: 'No', childLabour: 'Yes', modernSlavery: 'Yes', livingWage: 'No', indigPolicy: 'No', indigPct: 0 },
      community: { dei: 'Yes', parental: 'Yes', wellbeing: 'No', invest: 2400000, volHrs: 900, supAudit: 28, localPct: 71, divHires: 18, grievance: 'Formal', privacyComplaints: 0 },
      board: { boardSize: 9, boardWomen: 1, indepPct: 44, chairSep: 'Yes', susCommittee: 'Yes', indepSus: 'No', boardTrain: 'Yes', execEsg: 'No' },
      ethics: { code: 'Yes', gWhistle: 'Yes', antiCorrupt: 'Yes', corruptCases: 0, abcTrain: 74, erm: 'Integrated', audit: 'Yes', cyber: 'Yes', privacy: 'Formal', breaches: 0, tax: 'Yes', political: 'Yes', stakeGriev: 'Yes' },
      certs: { iso45001: 'Yes', iso27001: 'No', iso9001: 'Yes', grc: 'Partly', susReport: 'Yes', ethicsAuditPct: 40 },
      achieve: [{ pillar: 'C', area: 'Decarbonisation', what: 'Clinker factor cut with limestone and fly ash', metric: 'Clinker-to-cement ratio', prev: 0.86, now: 0.82, unit: '', better: 'lower', status: 'Done', when: 'November 2025' },
        { pillar: 'C', area: 'Energy efficiency', what: 'Waste-heat recovery at Riyadh: design approved', status: 'Under way' },
        { pillar: 'E', area: 'Water', what: 'Dry dust handling at Qassim', metric: 'Water per tonne of cement', prev: 0.29, now: 0.27, unit: 'm3', better: 'lower', status: 'Done' },
        { pillar: 'S', area: 'Health and safety', what: 'Contractor safety passport at both plants', metric: 'Lost-time injury frequency', prev: 2.4, now: 2.1, unit: 'per million hours', better: 'lower', status: 'Done' }] },
    vault: { growth: -0.06, people: 0.05, amp: 0.08, m: { 'carbon.elec': 85000, 'carbon.green': 5000, 'carbon.gas': 1200000, 'carbon.diesel': 560000, 'carbon.refrig': 50, 'resources.waterWd': 200000, 'resources.wasteT': 660, 'scope3.landfill': 160, 'scope3.recycled': 500, 'scope3.freight': 31500000, 'workforce.fte': 1640, 'workforce.hours': 300000, 'workforce.injuries': 1, 'workforce.hires': 12, 'workforce.leavers': 10, 'org.revenue': 175 } } }];

// supplier ESG data at each SEDG level (suppliers.mjs): what each supplier answered
const SUP = {
  basic: (c) => ({ e21el: 180000, e21di: 26000, e21pe: 3000, e31: 2400000, e31p: 2400000, e31g: 0, e41g: 38, e41d: 9, e41x: 29, e51: 'Steel sheet, 140 tonnes\nPaint and coatings, 6 tonnes', s11: 0, s21: 8, s31w: 22, s31a: '30 / 55 / 15', s41f: 0, s41i: 4, s51: 5000, g11: 3, g21: ['Code of Conduct', 'Health and safety'], g31: 2024, g41: 0, revenue: 12000000, sales: 2400000 }),
  intermediate: (c) => ({ e11: 410, e12: 650, e13: 25, e14: 40, e21el: 1100000, e21re: 120000, e21di: 140000, e22: 90000, e31: 9800000, e31p: 9800000, e41g: 210, e41d: 120, e41x: 90, e42h: 6, e42n: 204, e51: 'Cement, 4,200 tonnes\nAggregates, 18,000 tonnes', e52: 18, s11: 0, s12: 'None identified', s21: 16, s22: 320, s22t: 14, s31w: 18, s31a: '28 / 52 / 20', s32w: 20, s32a: '0 / 40 / 60', s41f: 0, s41i: 7, s42: 300, s42p: 94, s51: 40000, g11: 5, g12: 'Board of five; audit and risk committee', g21: ['Code of Conduct', 'Anti-corruption and anti-bribery', 'Whistleblowing', 'Health and safety', 'Environment'], g31: 2025, g32: 'Fuel price swings; permits for the quarry', g41: 0, g42: 210, g42p: 66, g51: 0, revenue: 85000000, sales: 21000000 }),
  advanced: (c) => ({ e11: 1250, e12: 2100, e13: 140, e14: 310, e15: 5400, e16: 260, e21el: 3500000, e21re: 900000, e21di: 420000, e21ng: 2600, e22: 410000, e31: 26000000, e31p: 21000000, e31g: 5000000, e41g: 610, e41d: 470, e41x: 140, e42h: 12, e42n: 598, e43r: 60, e43c: 380, e43o: 30, e44e: 20, e44i: 0, e44l: 110, e44o: 10, e51: 'Steel, 2,100 tonnes\nAluminium, 180 tonnes\nPackaging board, 90 tonnes', e52: 34, s11: 0, s12: 'Two labour-hire contractors in Johor reviewed: no findings', s21: 28, s22: 760, s22t: 9, s31w: 31, s31a: '24 / 56 / 20', s32w: 38, s32a: '0 / 50 / 50', s41f: 0, s41i: 3, s42: 760, s42p: 100, s51: 180000, s52: 'Truck noise near the Klang depot: night deliveries stopped', g11: 8, g12: 'Board of eight with audit, risk and sustainability committees', g21: ['Code of Conduct', 'Anti-corruption and anti-bribery', 'Whistleblowing', 'Health and safety', 'Environment', 'Human rights and labour', 'Data privacy', 'Supplier code of conduct'], g31: 2025, g32: 'Energy prices; customer concentration', g33: 'Flooding at the Klang depot; carbon tax from 2026', g41: 0, g42: 740, g42p: 97, g43: 'Customs and permits: controls in place', g51: 0, revenue: 240000000, sales: 36000000 }) };
const SUPPLIERS = {
  'Lion City Marine Logistics Pte Ltd': [['Pasir Panjang Ship Repair Pte Ltd', 'Singapore', 'basic', true], ['Straits Bunker Supply Pte Ltd', 'Singapore', 'intermediate', false], ['Selat Steel Containers Sdn Bhd', 'Malaysia', 'advanced', true]],
  'Al Rimal Towers Development LLC': [['Gulf Scaffold Hire LLC', 'United Arab Emirates', 'basic', true], ['Emirates Ready Mix LLC', 'United Arab Emirates', 'intermediate', false], ['Desert Glass Facades LLC', 'United Arab Emirates', 'advanced', true]],
  'Najd Cement Company': [['Qassim Haulage Est.', 'Saudi Arabia', 'basic', true], ['Riyadh Refractories Co.', 'Saudi Arabia', 'intermediate', false], ['Arabian Gypsum & Additives Co.', 'Saudi Arabia', 'advanced', true]] };

function monthly(C) {   // the vault's months: a base each month, a seasonal swing, and the year-on-year trend (poor: up; average: a little down)
  const out = [], V = C.vault;
  YRS.forEach((y, yi) => { for (let m = 1; m <= 12; m++) { if (y === '2026' && m > 10) break;
    const p = y + '-' + String(m).padStart(2, '0'), g = Math.pow(1 + V.growth, yi + (m - 1) / 12) ;
    Object.entries(V.m).forEach(([k, base]) => {
      const people = /^workforce\.(fte|hours)|org\.revenue/.test(k), count = /injuries|hires|leavers/.test(k);
      let v = base * (people ? Math.pow(1 + (V.people != null ? V.people : Math.max(V.growth, 0) * 0.3), yi) : g) * (people || count ? 1 : sea(m, V.amp));
      if (count) v = Math.max(0, Math.round(base * (V.growth > 0 ? 1 + V.growth * 2 * yi : 1 - 0.1 * yi) + ((m * 7 + yi * 3) % 3) - 1));
      out.push({ period: p, metric: k, value: Math.round(v * 100) / 100, source: m % 4 === 0 ? 'Bill' : 'Import' });
    }); } });
  return out;
}

export async function seed2(by) {
  const E = await import('./esg.mjs'), SV = await import('./esg-vault.mjs'), SP = await import('./suppliers.mjs');
  const made = { companies: [], vaults: [], suppliers: [], skipped: [] }, ents = await E.list();
  for (const C of COMPANIES2) {
    const old = ents.find((x) => String(x.name || '').toLowerCase() === C.name.toLowerCase()), oe = old ? await E.get(old.id) : null;
    if (!(oe && (oe.org || {}).revenue)) {
      const r = oe ? { entity: oe } : await E.create({ name: C.name, year: C.year, industry: C.industry, country: C.country, currency: C.currency }, by); if (r.error) throw new Error(r.error);
      // the report's year (2025) is the same model as the vault's months, so the year from the report and the years from the vault line up
      const P = JSON.parse(JSON.stringify(C.patch)), yr = monthly(C).filter((x) => x.period.startsWith('2025')), M = {};
      yr.forEach((x) => { (M[x.metric] = M[x.metric] || []).push(x.value); });
      Object.entries(M).forEach(([k, L]) => { const [a, b] = k.split('.'), v = b === 'fte' ? L.reduce((x, y) => x + y, 0) / L.length : L.reduce((x, y) => x + y, 0), tgt = a === 'org' ? 'org' : a;
        if (P[tgt]) P[tgt][b] = Math.round(v * (b === 'revenue' ? 10 : 1)) / (b === 'revenue' ? 10 : 1); });
      if (P.workforce) delete P.workforce.ltifr;   // worked out from the injuries and the hours
      const patch = { ...P, org: { ...r.entity.org, ...P.org, name: C.name, year: C.year, industry: C.industry, country: C.country, currency: C.currency } };
      const s = await E.save(r.entity.id, { patch, rev: r.entity.rev }, by); if (s.error) throw new Error(s.error);
      made.companies.push({ id: r.entity.id, name: C.name });
    } else made.skipped.push(C.name);
    // 🗄 the vault: its months (only when it has none yet), its target, then the suppliers
    const key = SV.keyOf(C.name), o = await SV.open(key, C.name, by); if (o.error) throw new Error(o.error);
    const v = await SV.get(key);
    if (!(v.records || []).length) {
      const L = monthly(C), target = C.grade === 'average' ? { baseYear: 2024, tgtPct: 20, tgtYear: 2030, nzYear: 2060, scope: '1+2' } : undefined;
      for (let i = 0; i < L.length; i += 500) { const r = await SV.saveData(key, { set: L.slice(i, i + 500), ...(i === 0 && target ? { target, fyStart: 1 } : { fyStart: 1 }) }, by); if (r.error) throw new Error(r.error); }
      made.vaults.push({ key, months: new Set(L.map((x) => x.period)).size, values: L.length });
    }
    const have = ((await SP.list(key)).requests || []).map((r) => r.supplier);
    for (const [sup, country, level, accept] of SUPPLIERS[C.name] || []) {
      if (have.includes(sup)) continue;
      const c = await SP.create(key, { supplier: sup, country, from: '2025-01', to: '2025-12', level, currency: C.currency, email: '', note: 'Sample request: figures for calendar 2025.' }, by); if (c.error) throw new Error(c.error);
      const f = await SP.formSave(c.token, { submit: true, confirm: true, answers: SUP[level](C), currency: C.currency, contact: { name: 'Sample contact', role: 'Sustainability lead', email: 'sample@example.com' } }); if (f.error) throw new Error(f.error);
      if (accept) { const a = await SP.accept(key, c.request.id, by); if (a.error) throw new Error(a.error); }
      made.suppliers.push({ vault: key, supplier: sup, level, accepted: accept });
    }
  }
  return made;
}
