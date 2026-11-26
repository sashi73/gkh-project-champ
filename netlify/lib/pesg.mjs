/* GKH Project Champ: 🌿 ESG & Sustainability for projects and programs.
   - each project keeps its own ESG data in plan.esg: activity data (fuel, electricity, travel, freight, waste, water and the main
     construction materials), a carbon budget and a business-as-usual baseline, the PMI® GPM® P5™ impact analysis and the
     frameworks the project reports into
   - GHG (mostly CO2e) by scope, with the same emission factor sets as the organisation's ESG report; with no activity data yet,
     a spend-based estimate from the project's costs, marked as an estimate
   - the other factors come from what the project already holds: risks (climate-related ones for TCFD / IFRS S2), SWMS (safety),
     stakeholders, charter, baseline and change control (governance)
   - rolled up by program and for the whole portfolio, for the CEO, the CSO and the CFO (carbon cost at an internal carbon price) */
import * as kv from './kv.mjs';
import { FACTOR_SETS, S3_DEFAULTS } from './esg.mjs';

const num = (v, max = 1e12) => { if (v == null || String(v).trim() === '') return undefined; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : undefined; };
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const r2 = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);

// [key, label, unit, group]
export const ACT = [
  ['diesel', 'Diesel (plant, generators, vehicles)', 'L', 'Scope 1'], ['petrol', 'Petrol', 'L', 'Scope 1'], ['lpg', 'LPG', 'L', 'Scope 1'], ['gas', 'Natural gas', 'GJ', 'Scope 1'],
  ['elec', 'Electricity from the grid', 'kWh', 'Scope 2'], ['greenPct', 'Renewable share of that electricity', '%', 'Scope 2'],
  ['air', 'Flights', 'passenger-km', 'Scope 3'], ['car', 'Car travel (hire, taxis, private cars)', 'km', 'Scope 3'], ['hotel', 'Hotel nights', 'nights', 'Scope 3'], ['freight', 'Road freight of materials', 'tonne-km', 'Scope 3'],
  ['landfill', 'Waste to landfill', 't', 'Scope 3'], ['recycled', 'Waste recycled or reused', 't', 'Scope 3'], ['water', 'Water used', 'm3', 'Scope 3'],
  ['concrete', 'Concrete', 'm3', 'Materials'], ['steel', 'Steel (structural and reinforcing)', 't', 'Materials'], ['cement', 'Cement and mortar', 't', 'Materials'], ['asphalt', 'Asphalt', 't', 'Materials'],
  ['aluminium', 'Aluminium', 't', 'Materials'], ['timber', 'Timber', 't', 'Materials'], ['glass', 'Glass', 't', 'Materials'], ['bricks', 'Bricks and blocks', 't', 'Materials'], ['plastics', 'Plastics and PVC', 't', 'Materials']
];
// indicative cradle-to-gate (A1-A3) factors, tCO2e per unit: averages for a first estimate; replace them with the supplier's EPD
export const MAT_EF = { concrete: 0.32, steel: 1.9, cement: 0.9, asphalt: 0.06, aluminium: 13, timber: 0.45, glass: 1.4, bricks: 0.24, plastics: 3.0 };
export const MAT_NOTE = 'Indicative cradle-to-gate (A1-A3) averages for a first estimate. Replace each one with the figure in your supplier\'s Environmental Product Declaration (EPD).';
export const SETS = () => Object.entries(FACTOR_SETS).map(([k, v]) => [k, v.label]);
export const SPEND_F = S3_DEFAULTS.fPurch;   // kg CO2e per dollar spent, when there is no activity data yet

// PMI® GPM® P5™: people, planet, prosperity, and the project's process and product. Each element is scored for impact, 1 to 5.
export const P5 = [
  ['people.labour', 'People', 'Labour practices and decent work', 'Employment, health and safety, training, diversity and equal opportunity'],
  ['people.society', 'People', 'Society and customers', 'Community support, compliance, customer health and safety, privacy'],
  ['people.rights', 'People', 'Human rights', 'Non-discrimination, freedom of association, no child or forced labour'],
  ['people.ethics', 'People', 'Ethical behaviour', 'Fair procurement and anti-corruption'],
  ['planet.transport', 'Planet', 'Transport', 'Local procurement, travel, logistics and digital meetings'],
  ['planet.energy', 'Planet', 'Energy and emissions', 'Energy used, its emissions, and clean energy'],
  ['planet.land', 'Planet', 'Land, air and water', 'Biodiversity, water quality and use, air quality'],
  ['planet.consumption', 'Planet', 'Consumption and waste', 'Materials, embodied carbon, reuse, recycling and disposal'],
  ['prosperity.agility', 'Prosperity', 'Business agility', 'Flexibility and options the project keeps open'],
  ['prosperity.economic', 'Prosperity', 'Economic stimulation', 'Local jobs, local suppliers and indirect benefits'],
  ['prosperity.roi', 'Prosperity', 'Return on investment', 'Direct financial benefits and value delivered'],
  ['process.maturity', 'Process', 'Process maturity and governance', 'How sustainability is planned, decided and escalated in the project'],
  ['process.efficiency', 'Process', 'Process efficiency', 'Doing the work with fewer resources and less rework'],
  ['product.lifespan', 'Product', 'Product lifespan and resilience', 'How long the result lasts, and how it copes with a changing climate'],
  ['product.servicing', 'Product', 'Servicing and end of life', 'Maintenance, reuse and recovery at the end of its life']
];
export const P5_SCALE = ['', 'High negative impact', 'Negative impact', 'Neutral', 'Positive impact', 'High positive impact'];
export const P5_PILLARS = ['People', 'Planet', 'Prosperity', 'Process', 'Product'];

// the frameworks a project's numbers feed, and what each one needs from the project
export const PFW = [
  ['IFRS_S2', 'IFRS S2 / AASB S2', 'The organisation\'s climate disclosures: the project\'s Scope 1, 2 and 3 emissions, its climate-related risks, and its part in the targets'],
  ['TCFD', 'TCFD', 'Climate-related risks and opportunities, and how they are managed'],
  ['SBTI', 'SBTi', 'The project\'s contribution to the organisation\'s science-based target (reduction against business as usual)'],
  ['GHGP', 'GHG Protocol', 'How the project\'s emissions are counted (operational control, Scopes 1, 2 and 3)'],
  ['ISO14064_2', 'ISO 14064-2', 'Quantified reductions against the project\'s baseline'],
  ['PAS2080', 'PAS 2080', 'Whole-life carbon management for buildings and infrastructure'],
  ['P5', 'PMI GPM P5', 'The P5 impact analysis: people, planet, prosperity, process and product'],
  ['ISC_IS', 'IS Rating', 'Infrastructure sustainability rating'],
  ['GREENSTAR', 'Green Star', 'Building rating'],
  ['IFC_PS', 'IFC Performance Standards', 'Environmental and social risk management, where the lender requires it']
];
const PFW_IDS = new Set(PFW.map((x) => x[0]));
const CLIMATE_RISK = /climat|weather|flood|heat|storm|fire|bushfire|cyclone|rain|drought|sea.?level|carbon|emission|net.?zero|transition/i;

// what may be stored in plan.esg
export function clean(x) {
  if (!x || typeof x !== 'object') return undefined;
  const act = {}; ACT.forEach(([k, , u]) => { const v = num((x.act || {})[k], u === '%' ? 100 : 1e12); if (v != null) act[k] = v; });
  const ef = {}; Object.keys(MAT_EF).forEach((k) => { const v = num((x.ef || {})[k], 1000); if (v != null) ef[k] = v; });
  const p5 = {}; P5.forEach(([k]) => { const s = (x.p5 || {})[k]; if (!s || typeof s !== 'object') return; const sc = Math.round(Number(s.s)); const o = { s: sc >= 1 && sc <= 5 ? sc : 0, note: str(s.note, 600), action: str(s.action, 400) }; if (o.s || o.note || o.action) p5[k] = o; });
  const soc = {}; ['workers', 'localPct', 'apprentices', 'hours', 'injuries', 'lti', 'invest', 'localSpendPct'].forEach((k) => { const v = num((x.soc || {})[k], /Pct$/.test(k) ? 100 : 1e10); if (v != null) soc[k] = v; });
  const out = { fset: FACTOR_SETS[x.fset] ? x.fset : undefined, act, ef, p5, soc, fw: Array.isArray(x.fw) ? x.fw.map(String).filter((f) => PFW_IDS.has(f)).slice(0, 20) : undefined,   // unset = the usual three; [] = none chosen
    baseT: num(x.baseT, 1e9), capT: num(x.capT, 1e9), note: str(x.note, 1500), at: Number(x.at) || undefined };
  return Object.keys(act).length || Object.keys(ef).length || Object.keys(p5).length || Object.keys(soc).length || Array.isArray(out.fw) || out.baseT != null || out.capT != null || out.fset || out.note ? out : undefined;
}

// the project's ESG figures. money: { BAC, AC } from the project's costing
export function calc(plan, money = {}, extra = {}) {
  const e = clean((plan || {}).esg) || { act: {}, ef: {}, p5: {}, soc: {} }, a = e.act, fset = e.fset || 'NGA_AU', F = FACTOR_SETS[fset] || FACTOR_SETS.NGA_AU, S3 = S3_DEFAULTS;
  const t = (v, f) => (v || 0) * f / 1000;   // kg to tonnes
  const s1 = { diesel: t(a.diesel, F.diesel), petrol: t(a.petrol, F.petrol), lpg: t(a.lpg, F.lpg), gas: t(a.gas, F.gas) };
  const s2loc = t(a.elec, F.elec), s2mkt = s2loc * (1 - (a.greenPct || 0) / 100);
  const s3 = { travel: t(a.air, S3.fAir) + t(a.car, S3.fCar) + t(a.hotel, S3.fHotel), freight: t(a.freight, S3.fFreight), waste: (a.landfill || 0) * S3.fLandfill + (a.recycled || 0) * S3.fRecycled, water: t(a.water, S3.fWater), materials: 0 };
  const mats = Object.keys(MAT_EF).map((k) => { const f = e.ef[k] != null ? e.ef[k] : MAT_EF[k]; return { key: k, qty: a[k] || 0, f, epd: e.ef[k] != null, t: (a[k] || 0) * f }; }).filter((m) => m.qty);
  s3.materials = mats.reduce((x, m) => x + m.t, 0);
  const S1 = Object.values(s1).reduce((x, v) => x + v, 0), S3t = Object.values(s3).reduce((x, v) => x + v, 0), measured = ACT.some(([k, , u]) => u !== '%' && a[k] != null);   // a recorded zero is data too: only a project with no activity values gets the spend estimate
  const BAC = Number(money.BAC) || 0, AC = Number(money.AC) || 0;
  // no activity data yet: a spend-based estimate from the costs (the actual cost so far, and the whole budget), shown as Scope 3 purchased goods and services
  const est = !measured && (BAC || AC) ? { toDate: r2(AC * SPEND_F / 1000, 1), whole: r2(BAC * SPEND_F / 1000, 1), f: SPEND_F } : null;
  const total = measured ? S1 + s2loc + S3t : est ? est.whole : null;
  const base = e.baseT, red = base > 0 && total != null ? (1 - total / base) * 100 : null;
  // P5: an average per pillar (1 to 5), and the elements scored 1 or 2 (to escalate)
  const sc = P5.map(([k, pil, label]) => ({ k, pil, label, s: (e.p5[k] || {}).s || 0, note: (e.p5[k] || {}).note || '', action: (e.p5[k] || {}).action || '' }));
  const pill = Object.fromEntries(P5_PILLARS.map((p) => { const L = sc.filter((x) => x.pil === p && x.s); return [p, L.length ? r2(L.reduce((x, y) => x + y.s, 0) / L.length, 1) : null]; }));
  const scored = sc.filter((x) => x.s), p5avg = scored.length ? r2(scored.reduce((x, y) => x + y.s, 0) / scored.length, 1) : null;
  // other factors from what the project already holds
  const risks = (plan.risks || []).filter((k) => k.status !== 'Closed'), climRisks = risks.filter((k) => CLIMATE_RISK.test([k.title, k.category, k.cause, k.desc].join(' ')));
  const ch = plan.charter || {};
  const gov = { charter: ch.docStatus === 'Approved', baseline: !!plan.baseline, risksOwnedPct: risks.length ? Math.round(risks.filter((k) => k.owner).length / risks.length * 100) : null, changes: (plan.changes || []).length, stakeholders: (plan.stakeholders || []).length, lessons: (plan.lessons || []).length };
  const soc = { ...e.soc, swms: extra.swms ? 1 : 0, ltifr: e.soc.lti != null && e.soc.hours > 0 ? r2(e.soc.lti / e.soc.hours * 1e6, 2) : null };
  // how ready the project's data is for each framework it reports into
  const has = { ghg: measured, s3: S3t > 0, risk: climRisks.length > 0, target: base > 0 || e.capT > 0, p5: scored.length >= 8, mat: mats.length > 0, epd: mats.some((m) => m.epd), soc: e.soc.workers != null || e.soc.hours != null, gov: gov.charter && gov.baseline };
  const need = { IFRS_S2: ['ghg', 's3', 'risk', 'target'], TCFD: ['risk', 'target'], SBTI: ['ghg', 'target'], GHGP: ['ghg', 's3'], ISO14064_2: ['ghg', 'target'], PAS2080: ['mat', 'epd', 'target'], P5: ['p5', 'soc', 'gov'], ISC_IS: ['ghg', 'mat', 'soc', 'p5'], GREENSTAR: ['ghg', 'mat'], IFC_PS: ['risk', 'soc', 'gov'] };
  const fw = (Array.isArray(e.fw) ? e.fw : ['IFRS_S2', 'GHGP', 'P5']).map((id) => { const L = need[id] || [], ok = L.filter((k) => has[k]); return { id, name: (PFW.find((x) => x[0] === id) || [])[1] || id, pct: L.length ? Math.round(ok.length / L.length * 100) : 0, missing: L.filter((k) => !has[k]) }; });
  return { fset, factorSet: F.label, measured, method: measured ? 'Measured activity data' : est ? 'Spend-based estimate (indicative)' : 'No data yet',
    s1: Object.fromEntries(Object.entries(s1).map(([k, v]) => [k, r2(v, 2)])), s1t: r2(S1, 2), s2loc: r2(s2loc, 2), s2mkt: r2(s2mkt, 2), s3: Object.fromEntries(Object.entries(s3).map(([k, v]) => [k, r2(v, 2)])), s3t: r2(S3t, 2),
    mats: mats.map((m) => ({ ...m, t: r2(m.t, 2) })), est, total: r2(total, 1), s12Share: measured && total ? r2((S1 + s2loc) / total * 100, 0) : null,
    baseT: base ?? null, capT: e.capT ?? null, reductionPct: r2(red, 1), overBudget: e.capT > 0 && total != null ? total > e.capT : null,
    intensity: BAC > 0 && total != null ? r2(total / (BAC / 1e6), 1) : null,
    p5: sc, p5pillars: pill, p5avg, p5scored: scored.length, p5flags: sc.filter((x) => x.s && x.s <= 2).map((x) => x.label),
    climateRisks: climRisks.slice(0, 20).map((k) => ({ title: str(k.title, 160), score: (k.p || 0) * (k.i || 0), owner: str(k.owner, 80) })), gov, soc, fw };
}

// 🗂 the whole portfolio (or the projects a login may see), by program, for the CEO, the CSO and the CFO
export async function portfolio(day, cores, money) {
  const P = await import('./plan.mjs'), PG = await import('./programs.mjs');
  const [cards, plans, reg, cfg] = await Promise.all([P.portfolio(day), P.list(), PG.keyed().catch(() => []), settings()]);
  PG.tagCards(cards, reg);
  const byCore = Object.fromEntries(plans.map((p) => [p.core, p])), mine = cards.filter((c) => (!cores || cores.has(c.core)) && byCore[c.core]);
  const sw = new Set((await Promise.all(mine.map((c) => kv.get('swms:' + c.core).then((d) => (d ? c.core : null), () => null)))).filter(Boolean));   // a saved SWMS document
  const rows = mine.map((c) => { const x = calc(byCore[c.core], { BAC: c.BAC, AC: c.AC }, { swms: sw.has(c.core) });
    return { core: c.core, ref: c.ref || '', name: c.name, program: c.program || 'General program', pct: c.pct || 0, BAC: c.BAC || 0, method: x.method, measured: x.measured, total: x.total, s1: x.s1t, s2: x.s2loc, s3: x.measured ? x.s3t : x.est ? x.est.whole : 0,   // a spend-based estimate counts as Scope 3 (purchased goods and services), so the scopes add up to the total
     
      materials: x.s3.materials, intensity: x.intensity, capT: x.capT, overBudget: x.overBudget, reductionPct: x.reductionPct, p5avg: x.p5avg, p5flags: x.p5flags.length, climateRisks: x.climateRisks.length, fw: x.fw.map((f) => ({ id: f.id, pct: f.pct })) }; });
  // a login that does not see money does not get the spend-based estimates either (they are the budget times a published factor)
  if (!money) rows.forEach((r) => { if (!r.measured) { r.total = null; r.s3 = 0; r.overBudget = null; r.reductionPct = null; } });
  const sum = (L, k) => r2(L.reduce((a, r) => a + (r[k] || 0), 0), 1);
  const progs = {}; rows.forEach((r) => { (progs[r.program] = progs[r.program] || []).push(r); });
  const programs = Object.entries(progs).map(([name, L]) => { const p5 = L.filter((r) => r.p5avg != null);
    return { name, projects: L.length, measured: L.filter((r) => r.measured).length, total: sum(L, 'total'), s1: sum(L, 's1'), s2: sum(L, 's2'), s3: sum(L, 's3'), BAC: sum(L, 'BAC'), climateRisks: L.reduce((a, r) => a + r.climateRisks, 0),
      p5avg: p5.length ? r2(p5.reduce((a, r) => a + r.p5avg, 0) / p5.length, 1) : null, overBudget: L.filter((r) => r.overBudget).length }; }).sort((a, b) => (b.total || 0) - (a.total || 0));
  const T = { projects: rows.length, measured: rows.filter((r) => r.measured).length, total: sum(rows, 'total'), s1: sum(rows, 's1'), s2: sum(rows, 's2'), s3: sum(rows, 's3'), materials: sum(rows, 'materials'), BAC: sum(rows, 'BAC'),
    climateRisks: rows.reduce((a, r) => a + r.climateRisks, 0), p5flags: rows.reduce((a, r) => a + r.p5flags, 0), overBudget: rows.filter((r) => r.overBudget).length };
  T.intensity = T.BAC > 0 ? r2(T.total / (T.BAC / 1e6), 1) : null;
  const p5r = rows.filter((r) => r.p5avg != null); T.p5avg = p5r.length ? r2(p5r.reduce((a, r) => a + r.p5avg, 0) / p5r.length, 1) : null;
  // 💵 for the CFO: the carbon cost at the internal carbon price (only for logins that see money)
  const price = money ? cfg.price : null;
  if (price != null) { T.carbonCost = r2(T.total * price, 0); programs.forEach((p) => { p.carbonCost = r2(p.total * price, 0); }); rows.forEach((r) => { r.carbonCost = r.total != null ? r2(r.total * price, 0) : null; }); }
  if (!money) rows.forEach((r) => { delete r.BAC; delete r.intensity; }), programs.forEach((p) => { delete p.BAC; }), delete T.BAC, delete T.intensity;
  rows.sort((a, b) => (b.total || 0) - (a.total || 0));
  return { day, totals: T, programs, projects: rows, price: money ? cfg.price ?? null : undefined, cur: money ? cfg.cur || 'AUD' : undefined, priceNote: money ? cfg.note || '' : undefined, rev: money ? cfg.rev || 0 : undefined,
    note: money ? 'Measured projects use their activity data and the emission factor set chosen on the project; the rest are spend-based estimates from the project costs (' + SPEND_F + ' kg CO2e per dollar), to be replaced by measured data.' : 'Totals cover the projects with measured activity data; projects without it show no figure yet.' };
}

// the internal carbon price used for the CFO's carbon cost
export async function settings() { return (await kv.get('pesg-settings').catch(() => null)) || {}; }
export async function saveSettings(b, by) {   // compare-and-set: a save made on an older copy is refused, so one person cannot undo another's price
  const price = b.price === '' || b.price == null ? null : num(b.price, 100000), rev = Number(b.rev) || 0; let stale = false;
  const v = await kv.update('pesg-settings', (cur) => { cur = cur || {}; if ((cur.rev || 0) !== rev) { stale = true; return cur; }
    return { price: price ?? null, cur: /^[A-Z]{3}$/.test(b.cur || '') ? b.cur : 'AUD', note: str(b.note, 300), by: str(by, 80), at: Date.now(), rev: rev + 1 }; }, () => null);
  return stale ? { error: 'Someone else changed the carbon price (' + ((v && v.by) || 'another user') + '). Reload the page and try again.' } : v;
}

// ✨ the P5 impact analysis: the AI writes "why this score" and "what we will do" from the project's own data, for the blanks only
// (an element not scored yet also gets a suggested score). Nothing is saved here: the browser puts the answers in and the user edits them.
export async function p5Fill(core, esgIn, lang) {
  const P = await import('./plan.mjs'), { llmJson } = await import('./ai.mjs');
  const plan = await P.get(core); if (!plan) return { error: 'Project not found' };
  const e = clean(esgIn !== undefined ? esgIn : plan.esg) || { act: {}, ef: {}, p5: {}, soc: {} }, x = calc({ ...plan, esg: e });
  const todo = P5.filter(([k]) => { const v = e.p5[k] || {}; return !v.note || !v.action || !v.s; }).map(([k, pil, label, hint]) => { const v = e.p5[k] || {}; return { key: k, pillar: pil, element: label, covers: hint, score: v.s || null, why_now: v.note || '', action_now: v.action || '' }; });
  if (!todo.length) return { fill: {}, note: 'Every element already has a score, a reason and an action.' };
  const ch = plan.charter || {}, R = P.rollup(plan, new Date().toISOString().slice(0, 10));
  const facts = { project: plan.name || core, objective: ch.objective || '', in_scope: ch.inScope || '', client: ch.customer || '', percent_complete: R.pct,
    phases: (plan.phases || []).map((p) => p.name), tasks: (plan.tasks || []).slice(0, 40).map((t) => t.name),
    open_risks: (plan.risks || []).filter((r) => r.status !== 'Closed').slice(0, 10).map((r) => r.title), climate_risks: x.climateRisks.map((r) => r.title),
    emissions_tCO2e: { method: x.method, total: x.total, scope1: x.s1t, scope2: x.s2loc, scope3: x.s3t, materials: x.s3.materials, reduction_vs_business_as_usual_pct: x.reductionPct, carbon_budget: x.capT, over_budget: x.overBudget },
    activity: e.act, social: { ...x.soc, invest: undefined }, governance: x.gov, project_notes: e.note || '' };
  const sys = 'You are a project sustainability adviser using the PMI GPM P5 Standard (People, Planet, Prosperity, Process, Product). Impact scores run 1 (high negative) to 5 (high positive), 3 is neutral. ' +
    'For each element listed, write "why" (the reason for the score, 12 to 25 words, grounded in this project\'s facts) and "action" (what the project will do next: concrete, 10 to 22 words, with who or when where it helps). ' +
    'Where an element has no score, also give "score" (1 to 5) that fits the facts; when the facts say little, score 3 and say what to measure. Use only the facts given: never invent figures, suppliers or certifications. Plain English, no jargon, no marketing. ' +
    'Answer only with JSON: {"elements":{"<key>":{"why":"…","action":"…","score":n}}}.' + (lang && lang !== 'en' ? ' Write the text in the language with code ' + lang + '.' : '');
  const r = await llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ project_facts: facts, elements: todo }) }], { maxTokens: 2600, temperature: 0.3 });
  const got = (r.data && r.data.elements) || {}, fill = {};
  todo.forEach((t) => { const a = got[t.key]; if (!a || typeof a !== 'object') return; const o = {};
    if (!t.why_now && a.why) o.note = str(a.why, 600); if (!t.action_now && a.action) o.action = str(a.action, 400); const sc = Math.round(Number(a.score)); if (!t.score && sc >= 1 && sc <= 5) o.s = sc;
    if (Object.keys(o).length) fill[t.key] = o; });
  return { fill, tokens: r.used || 0 };
}
