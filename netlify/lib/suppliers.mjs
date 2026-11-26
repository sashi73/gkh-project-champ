// 🤝 Supplier ESG data (Scope 3): a short form each supplier fills in through a private link, no account needed.
//   The questions follow Malaysia's Simplified ESG Disclosure Guide for SMEs in supply chains (SEDG v1, Capital Markets Malaysia:
//   35 disclosures, Basic, Intermediate and Advanced) and each answer is mapped to GRI, IFRS S1/S2 (and AASB S2, the same
//   paragraphs), the EU VSME standard for SMEs, the GHG Protocol, CDP Supply Chain and Bursa Malaysia's common indicators,
//   so one answer serves every framework the buyer reports under.
//   The supplier's Scope 1 and 2 (given, or worked out from its fuel and electricity with its country's factors) are shared
//   out by the buyer's part of the supplier's sales: that is the buyer's Scope 3 Category 1 (purchased goods and services),
//   the GHG Protocol's supplier-specific method. Accepted results go into the buyer's Sustainability vault month by month.
//   Storage: supreq:<vault key> = { list: [request] }; suptok:<sha256 of the link token> = { key, id } (the token itself is never kept).
import * as kv from './kv.mjs';
import * as SV from './esg-vault.mjs';
import * as E from './esg.mjs';
import { COUNTRIES } from './countries.mjs';
import { createHash, randomBytes } from 'node:crypto';

const str = (s, n = 300) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const num = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const r2 = (n, d = 2) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const uid = () => 'SR' + Date.now().toString(36).toUpperCase() + randomBytes(2).toString('hex').toUpperCase();
const hash = (t) => createHash('sha256').update(String(t)).digest('hex');
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const LEVELS = [['basic', 'Basic'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
const LV = { basic: 1, intermediate: 2, advanced: 3 };
export const FRAMEWORKS = [['SEDG', 'Malaysia SEDG v1'], ['GRI', 'GRI Standards'], ['ISSB', 'IFRS S1 and S2 (also AASB S2)'], ['VSME', 'EU VSME (SMEs)'], ['GHG', 'GHG Protocol'], ['CDP', 'CDP Supply Chain'], ['BURSA', 'Bursa Malaysia common indicators']];
export const POLICIES = ['Code of Conduct', 'Anti-corruption and anti-bribery', 'Whistleblowing', 'Health and safety', 'Environment', 'Human rights and labour', 'Data privacy', 'Supplier code of conduct'];

// [id, SEDG code, level, section, question, type, unit, other frameworks]
// types: n number, pct percent, t short text, l list or description, yr year, multi (POLICIES)
export const QUESTIONS = [
  // Environment: emissions
  ['e11', 'E1.1', 'basic', 'Emissions', 'Scope 1 (direct) greenhouse gas emissions. Leave blank and we work it out from your fuels below.', 'n', 'tCO2e', 'GRI 305-1|IFRS S2 29(a)|VSME B3|GHG Scope 1|CDP|Bursa C11(a)'],
  ['e12', 'E1.2', 'basic', 'Emissions', 'Scope 2 (purchased electricity, heat and steam) emissions. Leave blank and we work it out from your electricity below.', 'n', 'tCO2e', 'GRI 305-2|IFRS S2 29(a)|VSME B3|GHG Scope 2|CDP|Bursa C11(b)'],
  ['e13', 'E1.3', 'intermediate', 'Emissions', 'Scope 1 emissions reduced by your reduction initiatives', 'n', 'tCO2e', 'GRI 305-5|IFRS S2 33-36|CDP'],
  ['e14', 'E1.4', 'intermediate', 'Emissions', 'Scope 2 emissions reduced by your reduction initiatives', 'n', 'tCO2e', 'GRI 305-5|IFRS S2 33-36|CDP'],
  ['e15', 'E1.5', 'advanced', 'Emissions', 'Scope 3 (other indirect) emissions', 'n', 'tCO2e', 'GRI 305-3|IFRS S2 29(a)(vi)|GHG Scope 3|CDP|Bursa C11(c)'],
  ['e16', 'E1.6', 'advanced', 'Emissions', 'Scope 3 emissions reduced by your reduction initiatives', 'n', 'tCO2e', 'GRI 305-5|CDP'],
  // energy (SEDG E2.1 asks for energy by source: one line each)
  ['e21el', 'E2.1', 'basic', 'Energy', 'Electricity used (all of it, including renewable)', 'n', 'kWh', 'GRI 302-1|VSME B3|IFRS S2 29(a)|Bursa C4(a)'],
  ['e21re', 'E2.1', 'basic', 'Energy', 'of which renewable electricity (solar, green tariff, certificates)', 'n', 'kWh', 'GRI 302-1|VSME B3|GHG Scope 2 market-based'],
  ['e21di', 'E2.1', 'basic', 'Energy', 'Diesel used (vehicles, generators, machinery)', 'n', 'litres', 'GRI 302-1|VSME B3|GHG Scope 1'],
  ['e21pe', 'E2.1', 'basic', 'Energy', 'Petrol used', 'n', 'litres', 'GRI 302-1|VSME B3|GHG Scope 1'],
  ['e21lp', 'E2.1', 'basic', 'Energy', 'LPG used', 'n', 'litres', 'GRI 302-1|VSME B3|GHG Scope 1'],
  ['e21ng', 'E2.1', 'basic', 'Energy', 'Natural gas used', 'n', 'GJ', 'GRI 302-1|VSME B3|GHG Scope 1'],
  ['e21ot', 'E2.1', 'basic', 'Energy', 'Other energy (heating, cooling, steam, biomass): what and how much', 't', '', 'GRI 302-1|VSME B3'],
  ['e22', 'E2.2', 'intermediate', 'Energy', 'Energy saved by conservation and efficiency', 'n', 'kWh', 'GRI 302-4'],
  // water
  ['e31', 'E3.1', 'basic', 'Water', 'Total water withdrawn', 'n', 'litres', 'GRI 303-3|VSME B6|CDP Water|Bursa C9(a)'],
  ['e31p', 'E3.1', 'basic', 'Water', 'of which purchased (mains or third-party water)', 'n', 'litres', 'GRI 303-3|VSME B6'],
  ['e31g', 'E3.1', 'basic', 'Water', 'of which groundwater, surface water, seawater or produced water', 'n', 'litres', 'GRI 303-3|VSME B6'],
  // waste
  ['e41g', 'E4.1', 'basic', 'Waste', 'Total waste generated', 'n', 'tonnes', 'GRI 306-3|VSME B7|Bursa C10(a)'],
  ['e41d', 'E4.1', 'basic', 'Waste', 'Waste diverted from disposal (reused, recycled, recovered)', 'n', 'tonnes', 'GRI 306-4|VSME B7|Bursa C10(a)(i)'],
  ['e41x', 'E4.1', 'basic', 'Waste', 'Waste directed to disposal', 'n', 'tonnes', 'GRI 306-5|VSME B7|Bursa C10(a)(ii)'],
  ['e42h', 'E4.2', 'intermediate', 'Waste', 'Hazardous waste generated', 'n', 'tonnes', 'GRI 306-3|VSME B7'],
  ['e42n', 'E4.2', 'intermediate', 'Waste', 'Non-hazardous waste generated', 'n', 'tonnes', 'GRI 306-3|VSME B7'],
  ['e43r', 'E4.3', 'advanced', 'Waste', 'Diverted: prepared for reuse', 'n', 'tonnes', 'GRI 306-4'],
  ['e43c', 'E4.3', 'advanced', 'Waste', 'Diverted: recycled', 'n', 'tonnes', 'GRI 306-4|VSME B7'],
  ['e43o', 'E4.3', 'advanced', 'Waste', 'Diverted: other recovery', 'n', 'tonnes', 'GRI 306-4'],
  ['e44e', 'E4.4', 'advanced', 'Waste', 'Disposed: incinerated with energy recovery', 'n', 'tonnes', 'GRI 306-5'],
  ['e44i', 'E4.4', 'advanced', 'Waste', 'Disposed: incinerated without energy recovery', 'n', 'tonnes', 'GRI 306-5'],
  ['e44l', 'E4.4', 'advanced', 'Waste', 'Disposed: landfill', 'n', 'tonnes', 'GRI 306-5|GHG Scope 3 Cat 5'],
  ['e44o', 'E4.4', 'advanced', 'Waste', 'Disposed: other', 'n', 'tonnes', 'GRI 306-5'],
  // materials
  ['e51', 'E5.1', 'basic', 'Materials', 'The main materials used to make and pack your products or services, with their weight (one per line, for example "Steel, 120 tonnes")', 'l', '', 'GRI 301-1|VSME B7'],
  ['e52', 'E5.2', 'intermediate', 'Materials', 'Recycled input materials, as a share of all materials', 'pct', '%', 'GRI 301-2|VSME B7'],
  // Social
  ['s11', 'S1.1', 'basic', 'Human rights and labour', 'Incidents of child labour or forced labour (0 if none)', 'n', 'incidents', 'GRI 408-1|GRI 409-1|IFRS S1|Bursa C6(d)'],
  ['s11d', 'S1.1', 'basic', 'Human rights and labour', 'What happened, if there were any', 'l', '', 'GRI 408-1|GRI 409-1'],
  ['s12', 'S1.2', 'intermediate', 'Human rights and labour', 'Operations and suppliers with a significant risk of child or forced labour: type and location', 'l', '', 'GRI 408-1|GRI 409-1'],
  ['s21', 'S2.1', 'basic', 'Employees', 'Average hours of training per employee', 'n', 'hours', 'GRI 404-1|VSME B10|Bursa C6(a)'],
  ['s22', 'S2.2', 'intermediate', 'Employees', 'Number of employees at the end of the period', 'n', 'people', 'GRI 2-7|VSME B8'],
  ['s22t', 'S2.2', 'intermediate', 'Employees', 'Employee turnover rate', 'pct', '%', 'GRI 401-1|VSME B8|Bursa C6(c)'],
  ['s31w', 'S3.1', 'basic', 'Diversity, equity and inclusion', 'Employees who are women', 'pct', '%', 'GRI 405-1|VSME B8|Bursa C3(a)'],
  ['s31a', 'S3.1', 'basic', 'Diversity, equity and inclusion', 'Employees by age: under 30 / 30 to 50 / over 50 (for example "25 / 55 / 20")', 't', '%', 'GRI 405-1|Bursa C3(a)'],
  ['s32w', 'S3.2', 'intermediate', 'Diversity, equity and inclusion', 'Directors who are women', 'pct', '%', 'GRI 405-1|Bursa C3(b)'],
  ['s32a', 'S3.2', 'intermediate', 'Diversity, equity and inclusion', 'Directors by age: under 30 / 30 to 50 / over 50', 't', '%', 'GRI 405-1|Bursa C3(b)'],
  ['s41f', 'S4.1', 'basic', 'Health and safety', 'Work-related fatalities (0 if none)', 'n', 'people', 'GRI 403-9|VSME B9|Bursa C5(a)'],
  ['s41i', 'S4.1', 'basic', 'Health and safety', 'Recordable work-related injuries (0 if none)', 'n', 'injuries', 'GRI 403-9|VSME B9|Bursa C5(b)'],
  ['s42', 'S4.2', 'intermediate', 'Health and safety', 'Employees trained on health and safety standards', 'n', 'people', 'GRI 403-5|Bursa C5(c)'],
  ['s42p', 'S4.2', 'intermediate', 'Health and safety', 'as a share of all employees', 'pct', '%', 'GRI 403-5'],
  ['s51', 'S5.1', 'basic', 'Community', 'Community investment and donations', 'n', 'money', 'GRI 201-1|Bursa C2(a)'],
  ['s52', 'S5.2', 'advanced', 'Community', 'Operations with negative impacts on local communities, and what they are', 'l', '', 'GRI 413-2'],
  // Governance
  ['g11', 'G1.1', 'basic', 'Governance structure', 'Number of directors', 'n', 'people', 'GRI 2-9|IFRS S1 27'],
  ['g12', 'G1.2', 'intermediate', 'Governance structure', 'Board structure, including board and management committees', 'l', '', 'GRI 2-9|IFRS S1 27'],
  ['g21', 'G2.1', 'basic', 'Policies', 'Which of these policies do you have in writing?', 'multi', '', 'GRI 2-23|VSME B2'],
  ['g31', 'G3.1', 'basic', 'Risk management and reporting', 'Year of your last audited financial statements', 'yr', '', 'SEDG only'],
  ['g32', 'G3.2', 'intermediate', 'Risk management and reporting', 'Your main operational risks (for example regulatory compliance, business continuity)', 'l', '', 'GRI 2-12|IFRS S1 44'],
  ['g33', 'G3.3', 'advanced', 'Risk management and reporting', 'Your main sustainability risks, including climate (floods, heat, carbon prices, changing demand)', 'l', '', 'IFRS S2 10-22|VSME C4|CDP'],
  ['g41', 'G4.1', 'basic', 'Anti-corruption', 'Confirmed incidents of corruption (0 if none)', 'n', 'incidents', 'GRI 205-3|VSME B11|Bursa C1(c)'],
  ['g41d', 'G4.1', 'basic', 'Anti-corruption', 'What happened, if there were any', 'l', '', 'GRI 205-3'],
  ['g42', 'G4.2', 'intermediate', 'Anti-corruption', 'Employees trained on anti-bribery and anti-corruption', 'n', 'people', 'GRI 205-2|Bursa C1(a)'],
  ['g42p', 'G4.2', 'intermediate', 'Anti-corruption', 'as a share of all employees', 'pct', '%', 'GRI 205-2|Bursa C1(a)'],
  ['g43', 'G4.3', 'advanced', 'Anti-corruption', 'Your significant corruption risks', 'l', '', 'GRI 205-1|Bursa C1(b)'],
  ['g51', 'G5.1', 'intermediate', 'Customer privacy', 'Substantiated complaints about customer privacy or lost customer data (0 if none)', 'n', 'complaints', 'GRI 418-1|Bursa C8(a)']
].map(([id, code, level, section, q, type, unit, fw]) => ({ id, code: 'SEDG-' + code, level, section, q, type, unit, fw: fw.split('|') }));
const QK = new Map(QUESTIONS.map((x) => [x.id, x]));
// the questions every level needs to share emissions out (asked of every supplier, whatever the level)
export const SHARE_Q = [
  { id: 'revenue', q: 'Your total revenue for the period', type: 'n', unit: 'money' },
  { id: 'sales', q: 'What you sold to the buyer in the period (the value of the goods and services)', type: 'n', unit: 'money' }];

const levelOk = (q, level) => LV[q.level] <= (LV[level] || 1);
export const questionsFor = (level) => QUESTIONS.filter((q) => levelOk(q, level));

// ---------- cleaning the answers (only questions of the request's level; numbers at or above zero) ----------
function cleanAnswers(a, level) {
  const out = {}; a = a && typeof a === 'object' ? a : {};
  questionsFor(level).forEach((q) => {
    const v = a[q.id]; if (v == null || v === '') return;
    if (q.type === 'n' || q.type === 'pct') { const n = num(v); if (n != null && n >= 0 && (q.type !== 'pct' || n <= 100)) out[q.id] = n; }
    else if (q.type === 'yr') { const n = num(v); if (n != null && n >= 1950 && n <= 2100) out[q.id] = Math.round(n); }
    else if (q.type === 'multi') { const L = (Array.isArray(v) ? v : []).map(String).filter((p) => POLICIES.includes(p)); if (L.length) out[q.id] = L; }
    else out[q.id] = str(v, q.type === 'l' ? 1500 : 200);
  });
  SHARE_Q.forEach((q) => { const n = num(a[q.id]); if (n != null && n >= 0) out[q.id] = n; });
  return out;
}

// ---------- 🧮 the supplier's emissions, and the buyer's share of them ----------
export function calc(r) {
  const a = r.answers || {}, set = E.FACTOR_SETS[E.fsetFor(r.country)] || E.FACTOR_SETS.IPCC, notes = [];
  const fuels = [['e21di', 'diesel', 'L'], ['e21pe', 'petrol', 'L'], ['e21lp', 'lpg', 'L'], ['e21ng', 'gas', 'GJ']].filter(([k]) => a[k] != null);
  const s1calc = fuels.length ? fuels.reduce((t, [k, f]) => t + (a[k] * set[f]) / 1000, 0) : null;
  const s2calc = a.e21el != null ? (a.e21el * set.elec) / 1000 : null;
  const s1 = a.e11 != null ? a.e11 : s1calc, s2 = a.e12 != null ? a.e12 : s2calc;
  if (a.e11 == null && s1calc != null) notes.push('Scope 1 worked out from the fuels given, with ' + set.label + ' factors.');
  if (a.e12 == null && s2calc != null) notes.push('Scope 2 worked out from the electricity given (location-based), with ' + set.label + ' (' + set.elec + ' kgCO2e/kWh).');
  if (a.e11 == null && s1calc == null) notes.push('No Scope 1 and no fuels given.');
  if (a.e12 == null && s2calc == null) notes.push('No Scope 2 and no electricity given.');
  const share = a.revenue > 0 && a.sales != null ? Math.min(1, a.sales / a.revenue) : null;
  if (share == null) notes.push('The share needs the supplier\'s revenue and its sales to you.');
  else if (a.sales > a.revenue) notes.push('Sales to you are more than the revenue given: the share is taken as 100%.');
  const s12 = s1 == null && s2 == null ? null : (s1 || 0) + (s2 || 0), alloc = s12 != null && share != null ? s12 * share : null;
  const asked = questionsFor(r.level), done = asked.filter((q) => a[q.id] != null).length;
  const fw = {}; FRAMEWORKS.forEach(([k]) => { const qs = asked.filter((q) => q.fw.some((f) => (k === 'SEDG' ? true : k === 'ISSB' ? /^IFRS/.test(f) : k === 'BURSA' ? /^Bursa/.test(f) : f.startsWith(k)))); if (qs.length) fw[k] = { asked: qs.length, answered: qs.filter((q) => a[q.id] != null).length }; });
  return { s1: r2(s1, 3), s2: r2(s2, 3), s1calc: r2(s1calc, 3), s2calc: r2(s2calc, 3), s3: r2(a.e15, 3), share: share == null ? null : r2(share * 100, 2), alloc: r2(alloc, 3), upstreamS3: a.e15 != null && share != null ? r2(a.e15 * share, 3) : null,
    intensity: s12 != null && a.revenue > 0 ? r2(s12 / (a.revenue / 1e6), 3) : null, factors: set.label, notes, asked: asked.length, answered: done, fw };
}

// ---------- the buyer's side (the console) ----------
const listOf = async (key) => (await kv.get('supreq:' + key)) || { list: [] };
const pub = (r) => { const { tok, claimed, ...o } = r; return { ...o, result: r.answers ? calc(r) : null }; };   // never the token's hash
export async function list(key) {
  key = SV.keyOf(key); const v = await SV.get(key); if (!v) return { error: 'Open the vault first', code: 404 };
  return { requests: (await listOf(key)).list.map(pub), questions: QUESTIONS, shareQ: SHARE_Q, levels: LEVELS, frameworks: FRAMEWORKS, policies: POLICIES, countries: COUNTRIES.map((c) => c[0]) };
}
async function newToken(key, id) { const t = randomBytes(24).toString('base64url'), h = hash(t); await kv.set('suptok:' + h, { key, id }); return { t, h }; }
export async function create(key, body, by) {
  key = SV.keyOf(key); const v = await SV.get(key); if (!v) return { error: 'Open the vault first', code: 404 };
  const supplier = str(body.supplier, 120), from = MONTH.test(body.from) ? body.from : null, to = MONTH.test(body.to) ? body.to : null, level = LV[body.level] ? body.level : 'basic';
  if (!supplier) return { error: 'Type the supplier\'s name.', code: 400 };
  if (!from || !to || to < from) return { error: 'Choose the period: the first and last month (the last on or after the first).', code: 400 };
  if ((Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5)) - Number(from.slice(5)) >= 24) return { error: 'A period can be at most 24 months.', code: 400 };
  const country = COUNTRIES.some((c) => c[0] === body.country) ? body.country : 'Malaysia', id = uid(), { t, h } = await newToken(key, id);
  const r = { id, supplier, email: str(body.email, 120), country, from, to, level, note: str(body.note, 600), currency: str(body.currency || '', 8).toUpperCase(), status: 'sent', created: Date.now(), by: str(by, 80), tok: h };
  let err = null;
  await kv.update('supreq:' + key, (x) => { x = x || { list: [] }; if (x.list.length >= 500) { err = { error: 'This vault has 500 supplier requests: delete old ones first.', code: 400 }; return x; } x.list.unshift(r); return x; }, { list: [] });
  if (err) { await kv.del('suptok:' + h).catch(() => {}); return err; }
  return { request: pub(r), token: t };
}
export async function relink(key, id) {   // a new link; the old one stops working
  key = SV.keyOf(key); let old = null, found = false; const { t, h } = await newToken(key, id);
  await kv.update('supreq:' + key, (x) => { x = x || { list: [] }; const r = x.list.find((y) => y.id === id); found = !!r; if (r) { old = r.tok; r.tok = h; } return x; }, { list: [] });
  if (!found) { await kv.del('suptok:' + h).catch(() => {}); return { error: 'That request is no longer there.', code: 404 }; }
  if (old) await kv.del('suptok:' + old).catch(() => {});
  return { token: t };
}
export async function remove(key, id) {
  key = SV.keyOf(key); let tok = null, err = null;
  await kv.update('supreq:' + key, (x) => { x = x || { list: [] }; const r = x.list.find((y) => y.id === id); if (r && r.status === 'accepted') { err = { error: 'This supplier\'s figures are in the vault: they stay with the request. Remove the figures in Data by month first if you need to.', code: 409 }; return x; } if (r && r.status === 'accepting') { err = { error: 'This reply is being accepted, or an earlier attempt did not finish: open it and finish accepting first (its figures may already be in the vault).', code: 409 }; return x; } if (r) tok = r.tok; x.list = x.list.filter((y) => y.id !== id); return x; }, { list: [] });
  if (err) return err; if (tok) await kv.del('suptok:' + tok).catch(() => {});
  return { ok: true };
}
export async function sendBack(key, id, msg, by) {
  key = SV.keyOf(key); let err = null, out = null;
  await kv.update('supreq:' + key, (x) => { x = x || { list: [] }; const r = x.list.find((y) => y.id === id); err = null;
    if (!r) err = { error: 'That request is no longer there.', code: 404 }; else if (r.status !== 'submitted') err = { error: 'Only a submitted form can be sent back.', code: 409 };
    else { r.status = 'returned'; r.returnMsg = str(msg, 600) || 'Please check your answers.'; r.returnedBy = str(by, 80); r.returnedAt = Date.now(); out = r; } return x; }, { list: [] });
  return err || { request: pub(out) };
}
// ✅ accepted: the buyer's share of the supplier's Scope 1 and 2 goes into the vault, spread evenly over the months of the period (never twice).
//   The submission is claimed first ("accepting", with a copy of its answers): while claimed it cannot be sent back or changed,
//   so the vault and the accepted answers are always the same figures. A claim left by a failed attempt can be taken again after 2 minutes.
export async function accept(key, id, by) {
  key = SV.keyOf(key); let err = null, snap = null;
  await kv.update('supreq:' + key, (x) => { x = x || { list: [] }; const r = x.list.find((y) => y.id === id); err = null; snap = null;
    if (!r) err = { error: 'That request is no longer there.', code: 404 };
    else if (r.status === 'accepted') err = { error: 'Already accepted: the figures are in the vault.', code: 409 };
    else if (r.status === 'accepting' && Date.now() - (r.claimAt || 0) < 120e3) err = { error: 'This reply is being accepted right now. Wait a moment and look again.', code: 409 };
    else if (r.status !== 'submitted' && r.status !== 'accepting') err = { error: 'The supplier has not submitted the form yet.', code: 409 };
    else { if (r.status === 'submitted') r.claimed = JSON.parse(JSON.stringify(r.answers || {})); r.status = 'accepting'; r.claimAt = Date.now(); snap = { ...r, answers: r.claimed }; }
    return x; }, { list: [] });
  if (err) return err;
  const release = () => kv.update('supreq:' + key, (x) => { x = x || { list: [] }; const r = x.list.find((y) => y.id === id); if (r && r.status === 'accepting') { r.status = 'submitted'; delete r.claimAt; delete r.claimed; } return x; }, { list: [] }).catch(() => {});
  const c = calc(snap); if (c.alloc == null) { await release(); return { error: 'There is nothing to add yet: ' + c.notes.join(' '), code: 400 }; }
  const months = []; for (let y = Number(snap.from.slice(0, 4)), m = Number(snap.from.slice(5)); ; m++) { if (m > 12) { m = 1; y++; } const p = y + '-' + String(m).padStart(2, '0'); months.push(p); if (p >= snap.to) break; }
  const each = c.alloc / months.length, sig = 'supplier|' + id; let added = false; err = null;
  try {
    await kv.update('svault:' + key, (x) => {
      if (!x) { err = { error: 'Open the vault first', code: 404 }; return x; }
      added = false; x.billSigs = x.billSigs || []; x.records = x.records || [];
      if (x.billSigs.includes(sig)) return x; x.billSigs.push(sig); added = true;
      months.forEach((p) => { const i = x.records.findIndex((q) => q.period === p && q.metric === 'scope3.supplierT'), old = i >= 0 ? Number(x.records[i].value) || 0 : 0;
        const rec = { id: i >= 0 ? x.records[i].id : 'R' + uid(), period: p, metric: 'scope3.supplierT', value: Math.round((old + each) * 10000) / 10000, source: 'Import', note: str(((i >= 0 && x.records[i].note) ? x.records[i].note + ' + ' : '') + snap.supplier, 200), file: '', by: str(by, 80), at: Date.now() };
        if (i >= 0) x.records[i] = rec; else x.records.push(rec); });
      x.rev = (x.rev || 0) + 1; x.updated = Date.now(); return x;
    }, () => null);
  } catch (e) { await release(); throw e; }
  if (err) { await release(); return err; }
  let out = null;
  await kv.update('supreq:' + key, (x) => { x = x || { list: [] }; const q = x.list.find((y) => y.id === id); out = null;
    if (q && q.status === 'accepting') { q.answers = q.claimed || q.answers; delete q.claimed; delete q.claimAt; q.status = 'accepted'; q.accepted = Date.now(); q.acceptedBy = str(by, 80); q.addedT = c.alloc; q.months = months.length; out = q; } return x; }, { list: [] });
  if (!out) return { error: 'The figures were added to the vault, but the request was changed or deleted meanwhile. Check Data by month.', code: 409 };
  return { request: pub(out), added, tCO2e: c.alloc, months: months.length };
}

// ---------- the supplier's side (the public form, through the private link) ----------
async function byToken(t) {
  t = String(t || ''); if (!/^[A-Za-z0-9_-]{30,40}$/.test(t)) return null;
  const h = hash(t), ix = await kv.get('suptok:' + h); if (!ix) return null;
  const L = await listOf(ix.key), r = L.list.find((y) => y.id === ix.id && y.tok === h); return r ? { key: ix.key, r } : null;
}
const formView = async (key, r) => { const v = await SV.get(key);
  return { buyer: (v && v.name) || 'Your customer', supplier: r.supplier, country: r.country, from: r.from, to: r.to, level: r.level, levelName: (LEVELS.find((l) => l[0] === r.level) || [])[1], note: r.note || '', currency: r.currency || '', status: r.status, returnMsg: r.status === 'returned' ? r.returnMsg : '',
    answers: r.answers || {}, contact: r.contact || {}, submitted: r.submitted || null, questions: questionsFor(r.level), shareQ: SHARE_Q, frameworks: FRAMEWORKS, policies: POLICIES, countries: COUNTRIES.map((c) => c[0]), result: r.answers ? calc(r) : null }; };
export async function formGet(t) { const f = await byToken(t); if (!f) return { error: 'This link is not valid any more. Ask your customer for a new one.', code: 404 }; return formView(f.key, f.r); }
export async function formSave(t, body) {
  const f = await byToken(t); if (!f) return { error: 'This link is not valid any more. Ask your customer for a new one.', code: 404 };
  const submit = body.submit === true, contact = { name: str((body.contact || {}).name, 80), role: str((body.contact || {}).role, 80), email: str((body.contact || {}).email, 120) };
  if (submit && (!contact.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email))) return { error: 'Please give your name and email so your customer can reach you about these figures.', code: 422 };
  if (submit && body.confirm !== true) return { error: 'Please tick the box to confirm the figures.', code: 422 };
  let err = null, out = null;
  await kv.update('supreq:' + f.key, (x) => { x = x || { list: [] }; const r = x.list.find((y) => y.id === f.r.id); err = null;
    if (!r) { err = { error: 'This request was withdrawn by your customer.', code: 404 }; return x; }
    if (r.status === 'accepted') { err = { error: 'Your customer has already accepted these figures, so they can no longer be changed. Contact them if something is wrong.', code: 409 }; return x; }
    if (r.status === 'submitted' || r.status === 'accepting') { err = { error: 'These figures are submitted. Your customer can send them back to you if something needs changing.', code: 409 }; return x; }
    r.answers = cleanAnswers(body.answers, r.level); r.contact = contact; if (COUNTRIES.some((c) => c[0] === body.country)) r.country = body.country; if (body.currency) r.currency = str(body.currency, 8).toUpperCase();
    r.saved = Date.now(); if (submit) { r.status = 'submitted'; r.submitted = Date.now(); r.returnMsg = ''; } else if (r.status === 'sent') r.status = 'draft';
    out = r; return x; }, { list: [] });
  if (err) return err;
  return formView(f.key, out);
}
