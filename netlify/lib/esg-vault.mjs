// 🗄 The Sustainability vault: one per organisation, across every reporting year.
//   It keeps (1) the data as it is gathered, month by month (electricity, fuels, water, waste, safety, people…),
//   (2) the evidence behind it (bills, invoices, meter reads, certificates), filed by year and month, and
//   (3) the target, so the organisation can see year on year whether it is getting better and whether it is on track.
//   The analysis joins the vault's months with the ESG reports of the same organisation (a report is the authority for its year).
//   Storage: svault:<key> = { key, name, fyStart, target, records[], docs[], rev }; files in R2 under svault/<key>/ or kept here up to 3.5 MB.
//   Method: docs/ESG-REGISTRY.md §7c (the GKH ESG Progress Index).
import * as kv from './kv.mjs';
import * as E from './esg.mjs';

const str = (s, n = 300) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const num = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const r2 = (n, d = 1) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);
const uid = () => Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
const MAX_FILE = 3.5 * 1024 * 1024;
export const keyOf = (name) => String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// the data gathered month by month: [field, label, unit, how a year adds up]
export const METRICS = [
  ['carbon.elec', 'Electricity bought', 'MWh', 'sum', 'Energy'], ['carbon.green', 'Renewable electricity', 'MWh', 'sum', 'Energy'], ['resources.energyMWh', 'Total energy used', 'MWh', 'sum', 'Energy'],
  ['carbon.diesel', 'Diesel', 'L', 'sum', 'Fuels'], ['carbon.petrol', 'Petrol', 'L', 'sum', 'Fuels'], ['carbon.jet', 'Jet fuel', 'L', 'sum', 'Fuels'], ['carbon.lpg', 'LPG', 'L', 'sum', 'Fuels'], ['carbon.gas', 'Natural gas', 'GJ', 'sum', 'Fuels'], ['carbon.refrig', 'Refrigerant top-up', 'kg', 'sum', 'Fuels'],
  ['resources.waterWd', 'Water withdrawn', 'm3', 'sum', 'Water and waste'], ['resources.wasteT', 'Waste generated', 't', 'sum', 'Water and waste'], ['scope3.landfill', 'Waste to landfill', 't', 'sum', 'Water and waste'], ['scope3.recycled', 'Waste recycled', 't', 'sum', 'Water and waste'],
  ['scope3.freight', 'Freight', 'tonne-km', 'sum', 'Value chain'], ['scope3.air', 'Flights', 'passenger-km', 'sum', 'Value chain'], ['scope3.car', 'Business car travel', 'km', 'sum', 'Value chain'], ['scope3.hotel', 'Hotel nights', 'nights', 'sum', 'Value chain'], ['scope3.purch', 'Purchased goods and services', 'k$', 'sum', 'Value chain'], ['scope3.supplierT', 'Supplier emissions (your share)', 'tCO2e', 'sum', 'Value chain'],
  ['workforce.fte', 'Workforce', 'FTE', 'avg', 'People and safety'], ['workforce.hours', 'Hours worked', 'hours', 'sum', 'People and safety'], ['workforce.injuries', 'Recordable injuries', '', 'sum', 'People and safety'], ['workforce.deaths', 'Fatalities', '', 'sum', 'People and safety'],
  ['workforce.hires', 'New hires', '', 'sum', 'People and safety'], ['workforce.leavers', 'Leavers', '', 'sum', 'People and safety'], ['community.invest', 'Community investment', '$', 'sum', 'People and safety'], ['org.revenue', 'Revenue', 'M', 'sum', 'Business']];
const MK = new Map(METRICS.map((m) => [m[0], m]));
export const FOLDERS = [['reports', '📘 Published reports'], ['energy', '⚡ Energy bills'], ['fuel', '⛽ Fuel'], ['water', '💧 Water and waste'], ['travel', '✈ Travel and freight'], ['people', '👥 People and safety'], ['governance', '⚖ Governance'], ['certs', '🏅 Certificates'], ['other', '🗂 Other']];
const FK = new Set(FOLDERS.map((f) => f[0]));

// ---------- the vault document ----------
const blank = (key, name) => ({ key, name, fyStart: 1, target: {}, records: [], docs: [], rev: 0 });
export async function get(key) { key = keyOf(key); return key ? (await kv.get('svault:' + key)) || null : null; }
function cleanTarget(t) {
  t = t && typeof t === 'object' ? t : {};
  return { baseYear: num(t.baseYear), baseT: num(t.baseT), tgtPct: num(t.tgtPct) == null ? null : Math.max(0, Math.min(100, num(t.tgtPct))), tgtYear: num(t.tgtYear), nzYear: num(t.nzYear), scope: ['1+2', '1+2+3'].includes(t.scope) ? t.scope : '1+2' };
}

// every organisation with an ESG report or a vault, with its reports by year
export async function orgs() {
  const idx = ((await kv.get('esg-index')) || { ents: {} }).ents || {}, vi = ((await kv.get('svault-index')) || { v: {} }).v || {}, out = {};
  Object.values(idx).forEach((x) => { const k = keyOf(x.name); if (!k) return; const o = out[k] = out[k] || { key: k, name: x.name, reports: [], vault: false }; o.reports.push({ id: x.id, year: x.year || '' }); });
  Object.values(vi).forEach((v) => { const o = out[v.key] = out[v.key] || { key: v.key, name: v.name, reports: [] }; o.vault = true; o.records = v.records; o.docs = v.docs; o.updated = v.updated; });
  return Object.values(out).sort((a, b) => a.name.localeCompare(b.name));
}
export async function touchIndex(v) { await kv.update('svault-index', (x) => { x.v = x.v || {}; x.v[v.key] = { key: v.key, name: v.name, records: v.records.length, docs: v.docs.length, updated: Date.now() }; return x; }, () => ({ v: {} })); }
async function reportsOf(key) {
  const idx = ((await kv.get('esg-index')) || { ents: {} }).ents || {}, L = [];
  for (const x of Object.values(idx)) if (keyOf(x.name) === key) { const e = await E.get(x.id); if (e) L.push(e); }
  return L;
}
const fyOf = (period, start) => { const [y, m] = period.split('-').map(Number); return start <= 1 ? y : m >= start ? y + 1 : y; };   // a financial year is named after the year it ends in
const yearOfReport = (e) => { const o = e.org || {}, m = String(o.year || '').match(/(\d{4})(?:\s*[-/]\s*(\d{2,4}))?/); if (m) return m[2] ? Number(m[2].length === 2 ? m[1].slice(0, 2) + m[2] : m[2]) : Number(m[1]); return o.to ? Number(o.to.slice(0, 4)) : null; };

export async function open(key, name, by) {
  key = keyOf(key || name); if (!key) return { error: 'Name the organisation', code: 400 };
  let v = await get(key);
  if (!v) {
    const reps = await reportsOf(key), last = reps.sort((a, b) => (yearOfReport(b) || 0) - (yearOfReport(a) || 0))[0], o = (last && last.org) || {}, c = (last && last.climate) || {}, cb = (last && last.carbon) || {};
    v = blank(key, str(name || o.name || key, 120)); v.fyStart = o.from ? Number(o.from.slice(5, 7)) || 1 : 1;
    v.target = cleanTarget({ baseYear: cb.baseYear, baseT: cb.baseT, tgtPct: c.tgtPct, tgtYear: c.tgtYear, nzYear: num(String(c.netZero || '').match(/\d{4}/)), scope: '1+2' });
    v.created = Date.now(); v.by = str(by, 80);
    const fresh = v; v = await kv.update('svault:' + key, (x) => x || fresh, () => null);   // created once: a vault another person opened at the same moment is kept
    await touchIndex(v);
  }
  return { vault: v };
}

// ---------- 📅 the months: one value per metric per month (adding the same month again replaces it) ----------
export async function saveData(key, body, by) {
  key = keyOf(key); if (Array.isArray(body.set) && body.set.length > 600) return { error: 'Send at most 600 values at a time (this file has ' + body.set.length + '): the console sends them in batches.', code: 400 };
  const set = Array.isArray(body.set) ? body.set : [], del = new Set((Array.isArray(body.del) ? body.del : []).map(String));
  let err = null;
  const v = await kv.update('svault:' + key, (x) => {
    if (!x) { err = { error: 'Open the vault first', code: 404 }; return x; }
    x.records = (x.records || []).filter((r) => !del.has(r.id));
    set.forEach((s) => {
      const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s.period || '')) ? s.period : null, m = MK.get(String(s.metric || '')), val = num(s.value);
      if (!period || !m) return;
      const i = x.records.findIndex((r) => r.period === period && r.metric === m[0]);
      if (val == null) { if (i >= 0) x.records.splice(i, 1); return; }
      const rec = { id: i >= 0 ? x.records[i].id : 'R' + uid(), period, metric: m[0], value: val, source: ['Manual', 'Bill', 'Import', 'Meter'].includes(s.source) ? s.source : 'Manual', note: str(s.note, 200), file: str(s.file, 120), by: str(by, 80), at: Date.now() };
      if (i >= 0) x.records[i] = rec; else x.records.push(rec);
    });
    if (body.target) x.target = cleanTarget(body.target);
    if (body.fyStart != null) x.fyStart = Math.max(1, Math.min(12, Number(body.fyStart) || 1));
    x.rev = (x.rev || 0) + 1; x.updated = Date.now(); return x;
  }, () => null);
  if (err) return err;
  await touchIndex(v);
  return { vault: v };
}

// the electricity bills already read into the ESG reports, spread over the months they cover (by days)
export async function billsToMonths(key, by) {
  key = keyOf(key); const reps = await reportsOf(key), acc = {}; let n = 0;
  reps.forEach((e) => (e.bills || []).forEach((b) => {
    if (!b.from || !b.to || b.kwh == null) return; const a = Date.parse(b.from), z = Date.parse(b.to) + 864e5, days = (z - a) / 864e5; if (!(days > 0)) return; n++;
    for (let t = a; t < z; t += 864e5) { const d = new Date(t), p = d.toISOString().slice(0, 7); acc[p] = acc[p] || { kwh: 0, green: 0 }; acc[p].kwh += b.kwh / days; acc[p].green += (b.green || 0) / days; }
  }));
  const set = []; Object.keys(acc).forEach((p) => { set.push({ period: p, metric: 'carbon.elec', value: r2(acc[p].kwh / 1000, 3), source: 'Bill', note: 'From the electricity bills in the ESG reports' }); set.push({ period: p, metric: 'carbon.green', value: r2(acc[p].green / 1000, 3), source: 'Bill', note: 'From the electricity bills' }); });   // a month with no renewable kWh is 0, replacing any earlier value
  if (!set.length) return { error: 'No electricity bills with a billing period were found in this organisation\'s ESG reports.', code: 400 };
  const r = await saveData(key, { set }, by); return { ...r, bills: n, months: Object.keys(acc).length };
}

// ---------- 📎 evidence: files by year, month and folder ----------
export async function addDoc(ctx, body, by) {
  const key = keyOf(body.key), v = await get(key); if (!v) return { error: 'Open the vault first', code: 404 };
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(body.period || '')) ? body.period : new Date().toISOString().slice(0, 7), folder = FK.has(body.folder) ? body.folder : 'other';
  const id = 'D' + uid(), name = str(body.name, 160).replace(/[\\/]/g, '-') || 'document';
  let r2k = '', hasFile = false;
  if (body.r2Key) { const R2 = await import('./r2.mjs'); if (R2.ready() && R2.keyOk(String(body.r2Key), `svault/${key}/`)) { r2k = String(body.r2Key); hasFile = true; } }
  if (!hasFile && body.file) { const buf = Buffer.from(String(body.file), 'base64'); if (buf.length && buf.length <= MAX_FILE) { await kv.putFile(`svfile:${key}:${id}`, buf, { name, type: str(body.type, 100) }); hasFile = true; } }
  if (!hasFile) return { error: 'The file could not be kept (over 3.5 MB needs file storage set up). Try a smaller file.', code: 400 };
  const tags = (Array.isArray(body.tags) ? body.tags : []).slice(0, 8).map((t) => str(t, 60)).filter(Boolean);
  const d = { id, period, folder, name, type: str(body.type, 100), size: Math.max(0, Number(body.size) || 0), r2: r2k || undefined, at: Date.now(), by: str(by, 80), uid: str(ctx && ctx.uid, 40), note: str(body.note, 300), tags, auto: !!body.auto, reportId: str(body.reportId, 24) };
  // a document filed again under the same name in the same folder (a report written again) replaces the earlier copy
  let old = [];
  const nv = await kv.update('svault:' + key, (x) => { old = body.replace ? (x.docs || []).filter((y) => y.folder === folder && y.name === name) : []; x.docs = (x.docs || []).filter((y) => !old.includes(y)).concat([d]); x.rev = (x.rev || 0) + 1; x.updated = Date.now(); return x; }, () => null);
  for (const o of old) { if (o.r2 && o.r2 !== r2k) { const R2 = await import('./r2.mjs'); await R2.del(o.r2).catch(() => {}); } await kv.del(`svfile:${key}:${o.id}`).catch(() => {}); }
  await touchIndex(nv);
  return { doc: d, vault: nv, replaced: old.length };
}
export async function uploadUrl(body) {
  const key = keyOf(body.key); if (!(await get(key))) return { error: 'Open the vault first', code: 404 };
  const R2 = await import('./r2.mjs'); if (!R2.ready()) return { r2: false };
  const k = `svault/${key}/${Date.now().toString(36)}-${str(body.name, 100).replace(/[^\w.-]+/g, '_')}`;
  return { r2: true, key: k, url: R2.presign('PUT', k, { expires: 900 }) };
}
export async function file(key, id) {
  key = keyOf(key); const v = await get(key), d = v && (v.docs || []).find((x) => x.id === id); if (!d) return { error: 'File not found', code: 404 };
  if (d.r2) { const R2 = await import('./r2.mjs'); const url = R2.presign('GET', d.r2, { expires: 300, download: d.name }); if (url) return { name: d.name, url }; }
  const b = await kv.getFile(`svfile:${key}:${id}`); if (b) return { name: d.name, type: d.type || 'application/octet-stream', file: b.buf.toString('base64') };
  return { error: 'The file is not there any more.', code: 404 };
}
export async function removeDoc(ctx, key, id) {
  key = keyOf(key); const v = await get(key), d = v && (v.docs || []).find((x) => x.id === id); if (!d) return { error: 'File not found', code: 404 };
  if (!(ctx.owner || ['CEO', 'PMO Director'].includes(ctx.role) || (ctx.uid && d.uid === ctx.uid))) return { error: 'Only the person who filed it, the CEO, the PMO Director or the super user can delete it.', code: 403 };
  if (d.r2) { const R2 = await import('./r2.mjs'); await R2.del(d.r2).catch(() => {}); }
  await kv.del(`svfile:${key}:${id}`).catch(() => {});
  const nv = await kv.update('svault:' + key, (x) => { x.docs = (x.docs || []).filter((y) => y.id !== id); x.rev = (x.rev || 0) + 1; return x; }, () => null);
  await touchIndex(nv);
  return { vault: nv };
}

/* ---------- 📈 the analysis: year by year, the GKH ESG Progress Index, and the path to the target ----------
   A year comes from its ESG report when there is one; otherwise from the months in the vault, calculated with the factors of the
   organisation's latest report. Index: base year = 100. Each part compares this year with the base year ("lower is better" parts
   use base ÷ now, "higher is better" use now ÷ base, each ratio held between 0.25 and 4); the index is their weighted average × 100,
   over the parts measured in both years. */
export const INDEX_PARTS = [
  ['ghg', 'Scope 1 and 2 emissions intensity', 'lower', 30, 0], ['s3', 'Scope 3 emissions intensity', 'lower', 10, 0], ['renew', 'Renewable electricity share', 'higher', 10, 5], ['energy', 'Energy intensity', 'lower', 5, 0],
  ['water', 'Water intensity', 'lower', 5, 0], ['divert', 'Waste diverted from landfill', 'higher', 5, 5], ['ltifr', 'Lost time injury frequency (LTIFR)', 'lower', 10, 0.5], ['womenMgmt', 'Women in management', 'higher', 7.5, 5],
  ['training', 'Training hours per employee', 'higher', 7.5, 1], ['gov', 'Governance score', 'higher', 10, 5]];
export const INDEX_METHOD = 'GKH ESG Progress Index v1 (2026-11)';
function measures(e, c) {
  const em = c.em, o = e.org || {}, rev = o.revenue > 0 ? o.revenue : null, per = (v) => (v == null ? null : rev ? v / rev : v), cb = e.carbon || {}, rs = e.resources || {}, w = e.workforce || {};
  const s12 = em.s1t == null && em.s2loc == null ? null : (em.s1t || 0) + (em.s2loc || 0);
  return { rev, cur: o.currency || '', s1: em.s1t, s2: em.s2loc, s3: em.s3t, s12, total: em.total, perRev: !!rev, ghg: per(s12), s3i: per(em.s3t), renew: rs.renewPct != null ? rs.renewPct : cb.elec > 0 && cb.green != null ? (cb.green / cb.elec) * 100 : null,
    energy: per(em.energy), water: per(rs.waterWd), divert: rs.divertPct != null ? rs.divertPct : rs.wasteT > 0 && e.scope3 && e.scope3.recycled != null ? (e.scope3.recycled / rs.wasteT) * 100 : null,
    ltifr: w.ltifr != null ? w.ltifr : w.hours > 0 && w.injuries != null ? (w.injuries * 1e6) / w.hours : null, womenMgmt: c.soc.womenMgmtPct, training: w.trainHrs, gov: c.gov.score, esg: c.esg, env: c.env.score, soc: c.soc.score };
}
export async function analyse(key) {
  key = keyOf(key); const v = await get(key), reps = await reportsOf(key);
  if (!v && !reps.length) return { error: 'Nothing for this organisation yet', code: 404 };
  const fyStart = (v && v.fyStart) || 1, recs = (v && v.records) || [], latest = reps.slice().sort((a, b) => (yearOfReport(b) || 0) - (yearOfReport(a) || 0))[0] || null;
  // months gathered, by financial year
  const byFy = {}; recs.forEach((r) => { const fy = fyOf(r.period, fyStart); (byFy[fy] = byFy[fy] || []).push(r); });
  const years = new Set(Object.keys(byFy).map(Number)); reps.forEach((e) => { const y = yearOfReport(e); if (y) years.add(y); });
  const rows = [...years].sort((a, b) => a - b).map((fy) => {
    const rep = reps.find((e) => yearOfReport(e) === fy), R = byFy[fy] || [], months = [...new Set(R.map((r) => r.period))].length;
    let e = rep, from = 'report';
    if (!rep) {   // a year with no report: the vault's months, with the latest report's factors and settings
      e = structuredClone(latest || { org: {} }); from = 'months'; ['carbon', 'scope3', 'resources', 'workforce', 'community', 'org'].forEach((s) => { e[s] = { ...(e[s] || {}) }; });
      // keep the latest report's factors and settings (factor fields start with f + a capital, plus the factor set, GWP and base year); clear every other number, then fill what the months supply
      const KEEP = /^(f[A-Z]|fset$|refGwp$|baseYear$|baseT$)/;
      ['carbon', 'scope3', 'resources', 'workforce', 'community'].forEach((sec) => Object.keys(e[sec]).forEach((k) => { if (!KEEP.test(k) && typeof e[sec][k] === 'number') delete e[sec][k]; }));
      METRICS.forEach(([f, , , how]) => { const [s, k] = f.split('.'), L = R.filter((r) => r.metric === f); if (s === 'org') delete e[s][k]; if (!L.length) return; const t = L.reduce((a, r) => a + r.value, 0); e[s][k] = how === 'avg' ? t / L.length : t; });
      ['renewPct', 'divertPct'].forEach((k) => delete e.resources[k]); ['ltifr', 'trainHrs'].forEach((k) => delete e.workforce[k]); e.bills = []; e.avoid = []; e.credits = [];
    }
    const c = E.compute(E.clean(e)), m = measures(e, c);
    // what the months add up to, beside the report, so a gap shows
    const sums = {}; METRICS.forEach(([f, , , how]) => { const L = R.filter((r) => r.metric === f); if (L.length) sums[f] = r2(how === 'avg' ? L.reduce((a, r) => a + r.value, 0) / L.length : L.reduce((a, r) => a + r.value, 0), 2); });
    return { fy, label: (fyStart > 1 ? 'FY' : '') + fy, from, reportId: rep ? rep.id : '', months, partial: !rep && months < 12, m, sums, coverage: Object.fromEntries(METRICS.map(([f]) => [f, R.filter((r) => r.metric === f).map((r) => r.period)]).filter((x) => x[1].length)) };
  });
  // 📈 the index
  const full = rows.filter((r) => !r.partial), base = full[0] || rows[0], idx = [];
  rows.forEach((r) => {
    let sw = 0, sv = 0; const parts = [];
    INDEX_PARTS.forEach(([k, label, dir, w, eps]) => {
      const key2 = k === 's3' ? 's3i' : k, b = base && base.m[key2], n = r.m[key2];
      if (b == null || n == null || (base.m.perRev !== r.m.perRev && ['ghg', 's3i', 'energy', 'water'].includes(key2))) { parts.push({ k, label, dir, w, base: b, now: n, ratio: null }); return; }
      const num0 = dir === 'lower' ? b + eps : n + eps, den = dir === 'lower' ? n + eps : b + eps;   // 0 ÷ 0 is no change; something ÷ 0 is the most improvement (or the most decline) the index allows
      let ratio = den === 0 ? (num0 === 0 ? 1 : 4) : num0 / den; if (!Number.isFinite(ratio)) ratio = 1; ratio = Math.max(0.25, Math.min(4, ratio));
      sw += w; sv += w * ratio; parts.push({ k, label, dir, w, base: r2(b, 3), now: r2(n, 3), ratio: r2(ratio, 3) });
    });
    idx.push({ fy: r.fy, label: r.label, value: sw && !r.partial ? r2((sv / sw) * 100, 1) : null, weight: sw, parts, partial: r.partial, months: r.months });   // a year still being gathered gets no index until its 12 months are in
  });
  idx.forEach((x, i) => { const p = idx.slice(0, i).reverse().find((y) => y.value != null); x.yoy = p && x.value != null ? r2((x.value / p.value - 1) * 100, 1) : null; });
  // 🎯 the target path (straight line from the base year to the target, then to net zero)
  const T = (v && v.target) || {}, sc = T.scope || '1+2', actual = (r) => (sc === '1+2+3' ? r.m.total : r.m.s12);
  const baseYear = T.baseYear || (base && base.fy) || null, baseRow = rows.find((r) => r.fy === baseYear), baseT = T.baseT != null ? T.baseT : baseRow ? actual(baseRow) : null;
  const tgtT = baseT != null && T.tgtPct != null ? baseT * (1 - T.tgtPct / 100) : null;
  const path = (y) => { if (baseT == null || !baseYear) return null; if (T.tgtYear && tgtT != null && y <= T.tgtYear) return y <= baseYear ? baseT : baseT + ((tgtT - baseT) * (y - baseYear)) / (T.tgtYear - baseYear);
    if (T.nzYear && T.tgtYear && tgtT != null && y > T.tgtYear) return y >= T.nzYear ? 0 : tgtT - (tgtT * (y - T.tgtYear)) / (T.nzYear - T.tgtYear); if (T.nzYear && !T.tgtYear) return y >= T.nzYear ? 0 : baseT - (baseT * (y - baseYear)) / (T.nzYear - baseYear); return null; };
  // a year still being gathered is compared at its annual rate (the months so far × 12 ÷ months), and marked as such
  const track = rows.map((r) => { const a0 = actual(r), a = a0 != null && r.partial && r.months ? (a0 * 12) / r.months : a0, p = path(r.fy), gap = a == null || p == null ? null : p === 0 ? (a <= 0 ? 0 : 100) : r2((a / p - 1) * 100, 1);   // a path at zero: on track only at zero
    return { fy: r.fy, label: r.label, actual: r2(a, 1), toDate: r.partial ? r2(a0, 1) : null, annualised: !!(r.partial && r.months), months: r.months, path: r2(p, 1), gap, partial: r.partial, status: gap == null ? '' : gap <= 0 ? 'On track' : gap <= 5 ? 'Close' : 'Off track' }; });
  const lastFull = [...track].reverse().find((t) => t.actual != null && !t.partial);
  const need = lastFull && tgtT != null && T.tgtYear > lastFull.fy && lastFull.actual > 0 ? r2((1 - Math.pow(tgtT / lastFull.actual, 1 / (T.tgtYear - lastFull.fy))) * 100, 1) : null;
  const done = lastFull && baseT && tgtT != null && baseT !== tgtT ? r2(((baseT - lastFull.actual) / (baseT - tgtT)) * 100, 0) : null;
  const sofar = lastFull && baseT && lastFull.fy > baseYear ? r2((1 - Math.pow(lastFull.actual / baseT, 1 / (lastFull.fy - baseYear))) * 100, 1) : null;
  return { key, name: (v && v.name) || (latest && latest.org.name) || key, fyStart, method: INDEX_METHOD, metrics: METRICS, folders: FOLDERS, vault: v, reports: reps.map((e) => ({ id: e.id, year: e.org.year, fy: yearOfReport(e) })),
    rows: rows.map((r) => ({ ...r, m: Object.fromEntries(Object.entries(r.m).map(([k, x]) => [k, typeof x === 'number' ? r2(x, 3) : x])) })), base: base ? base.fy : null, index: idx,
    target: { ...T, scope: sc, baseYear, baseT: r2(baseT, 1), tgtT: r2(tgtT, 1), track, needPct: need, achievedPct: done, ratePct: sofar, latest: lastFull ? lastFull.fy : null } };
}

// for Ask Champ: the trend in a few lines
export async function champFacts(key) {
  const a = await analyse(key).catch(() => null); if (!a || a.error) return null;
  return { organisation: a.name, index_method: a.method, progress_index: a.index.map((x) => ({ year: x.label, index: x.value, yoy_pct: x.yoy, partial_year: x.partial })), emissions_vs_target: a.target.track, target: { base_year: a.target.baseYear, base_tCO2e: a.target.baseT, cut_pct: a.target.tgtPct, by: a.target.tgtYear, net_zero: a.target.nzYear, annual_cut_needed_pct: a.target.needPct, achieved_pct_of_cut: a.target.achievedPct } };
}

/* ---------- 📄 any utility or fuel bill, read (text from the PDF, or OCR in the browser), spread over the months it covers ---------- */
// each line → a vault measure, converted to the measure's unit
const BILL_KINDS = { electricity: ['carbon.elec', { kwh: 0.001, mwh: 1, gwh: 1000 }], 'renewable electricity': ['carbon.green', { kwh: 0.001, mwh: 1 }], 'natural gas': ['carbon.gas', { gj: 1, mj: 0.001, kwh: 0.0036, mwh: 3.6, therm: 0.105506, m3: 0.0386 }],
  water: ['resources.waterWd', { m3: 1, kl: 1, ml: 1000, l: 0.001 }], diesel: ['carbon.diesel', { l: 1, kl: 1000 }], petrol: ['carbon.petrol', { l: 1, kl: 1000 }], lpg: ['carbon.lpg', { l: 1, kl: 1000 }], 'jet fuel': ['carbon.jet', { l: 1, kl: 1000 }],
  'waste to landfill': ['scope3.landfill', { t: 1, kg: 0.001 }], 'waste recycled': ['scope3.recycled', { t: 1, kg: 0.001 }] };
const BILL_SYS2 = 'You read utility and fuel bills (electricity, gas, water, diesel, petrol, LPG, jet fuel, waste collection) for sustainability reporting. The text may come from OCR and contain errors: read carefully and never guess. Return JSON only. ' +
  'For each quantity actually used or delivered in the billing period (not demand kW, not meter readings on their own, not previous bills), give one line. Leave a value null when the bill does not show it.';
// a real calendar day (2026-02-31 is refused, not read as 3 March)
const realDay = (x) => { const s = String(x || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const t = Date.parse(s + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? s : null; };
export async function readAnyBill(text, file) {
  const { llmJson, llmSetup, checkLimit, usage } = await import('./ai.mjs');
  if (!llmSetup()) return { error: 'AI is not set up yet: add LLM_API_KEY (DeepSeek) in Netlify.' };
  try { await checkLimit(); } catch (e) { return { error: e.message }; }
  text = String(text || '').slice(0, 24000); if (text.replace(/\s/g, '').length < 40) return { error: '“' + str(file, 120) + '” has no readable text, even after OCR. Try a clearer scan or a photo in good light.' };
  const r = await llmJson([{ role: 'system', content: BILL_SYS2 }, { role: 'user', content: JSON.stringify({ task: 'Keys: "supplier":"", "kind_of_bill":"", "lines":[{"kind":"one of: ' + Object.keys(BILL_KINDS).join(', ') + '","qty":number,"unit":"kWh, MWh, GJ, MJ, m3, kL, L, t or kg as printed","from":"YYYY-MM-DD","to":"YYYY-MM-DD","site":"site or supply address","account":"account, NMI or meter number","cost":number or null,"currency":"AUD…"}], "warnings":["anything unclear, under 20 words each"]', file: str(file, 120), bill_text: text }) }],
    { maxTokens: 1800, timeoutMs: 120000, temperature: 0 }).catch((e) => ({ error: e.message }));
  if (r.error) return { error: r.error };
  await usage(1, r.used || 0).catch(() => {});
  const d = r.data || {}, ymd = realDay, warnings = (Array.isArray(d.warnings) ? d.warnings : []).slice(0, 6).map((x) => str(x, 200)).filter(Boolean);
  const lines = (Array.isArray(d.lines) ? d.lines : []).slice(0, 20).map((x) => { x = x && typeof x === 'object' ? x : {}; const k = BILL_KINDS[String(x.kind || '').toLowerCase()], u = String(x.unit || '').toLowerCase().replace(/[^a-z0-9]/g, ''), q = num(x.qty), from = ymd(x.from), to = ymd(x.to);
    if (!k) { if (x.kind) warnings.push('Skipped "' + str(x.kind, 40) + '": not a measure the vault keeps.'); return null; }
    const f = k[1][u]; if (q == null || f == null) { warnings.push('Skipped ' + x.kind + ': ' + (q == null ? 'no quantity' : 'unit "' + str(x.unit, 12) + '" not understood') + '.'); return null; }
    if (!from || !to || to < from) { warnings.push('Skipped ' + x.kind + ': the billing period is not clear.'); return null; }
    const m = MK.get(k[0]); return { kind: String(x.kind).toLowerCase(), metric: k[0], label: m[1], unit: m[2], qty: q, qtyUnit: str(x.unit, 12), value: Math.round(q * f * 10000) / 10000, from, to, site: str(x.site, 120), account: str(x.account, 60), cost: num(x.cost), currency: str(x.currency, 3) }; }).filter(Boolean);
  // spread each line over the months of its billing period, by days
  const months = {}; lines.forEach((l) => { const a = Date.parse(l.from + 'T00:00:00Z'), b = Date.parse(l.to + 'T00:00:00Z'), days = Math.max(1, Math.round((b - a) / 864e5) + 1); if (days > 400) { warnings.push('Skipped spreading ' + l.kind + ': a billing period over 400 days.'); return; }
    for (let t = a; t <= b; t += 864e5) { const p = new Date(t).toISOString().slice(0, 7), k = p + '|' + l.metric; months[k] = (months[k] || 0) + l.value / days; } });
  const alloc = Object.entries(months).map(([k, v]) => { const [period, metric] = k.split('|'); return { period, metric, value: Math.round(v * 10000) / 10000 }; }).sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : a.metric.localeCompare(b.metric)));
  const last = lines.reduce((a, l) => (l.to > a ? l.to : a), '').slice(0, 7);
  return { supplier: str(d.supplier, 120), kind: str(d.kind_of_bill, 60), lines, months: alloc, period: last || null, folder: lines.some((l) => /water|waste/.test(l.kind)) ? 'water' : lines.some((l) => /diesel|petrol|lpg|jet/.test(l.kind)) ? 'fuel' : 'energy', warnings, tokens: r.used || 0 };
}

// ➕ a bill's lines added into the vault: each line spread over its months (by days) and ADDED to what is there (two meters, two sites),
// never twice: a line already added (same measure, account and period) is skipped
const BILL_METRICS = new Set(Object.values(BILL_KINDS).map((k) => k[0]));
export async function addBill(key, body, by) {
  key = keyOf(key); const ymd = realDay, file = str(body.file, 120);
  const lines = (Array.isArray(body.lines) ? body.lines : []).slice(0, 20).map((l) => ({ metric: String(l.metric || ''), value: num(l.value), from: ymd(l.from), to: ymd(l.to), account: str(l.account, 60), site: str(l.site, 120) }))
    .filter((l) => BILL_METRICS.has(l.metric) && l.value != null && l.value >= 0 && l.from && l.to && l.to >= l.from && (Date.parse(l.to) - Date.parse(l.from)) / 864e5 <= 400);
  if (!lines.length) return { error: 'No usable lines on this bill: each needs a measure, a quantity and a billing period.', code: 400 };
  // lines for the same measure, account and period (peak and off-peak, two tariffs) are one quantity: added together first
  const byS = new Map(); lines.forEach((l) => { const sig = [l.metric, l.account.toLowerCase(), l.from, l.to].join('|'), o = byS.get(sig); if (o) o.value += l.value; else byS.set(sig, { ...l, sig }); });
  const merged = [...byS.values()];
  let err = null, added = 0, skipped = 0, months = new Set();
  const v = await kv.update('svault:' + key, (x) => {
    if (!x) { err = { error: 'Open the vault first', code: 404 }; return x; }
    added = 0; skipped = 0; months = new Set();   // counted again on each attempt: only the save that lands is reported
    x.billSigs = x.billSigs || []; x.records = x.records || [];
    if (x.billSigs.length + merged.length > 20000) { err = { error: 'This vault has 20,000 bill lines on record: ask GKH to archive older years before adding more.', code: 400 }; return x; }   // signatures are never dropped, so a bill can never count twice
    merged.forEach((l) => { const sig = l.sig; if (x.billSigs.includes(sig)) { skipped++; return; } x.billSigs.push(sig); added++;
      const a = Date.parse(l.from + 'T00:00:00Z'), b = Date.parse(l.to + 'T00:00:00Z'), days = Math.round((b - a) / 864e5) + 1, part = {};
      for (let t = a; t <= b; t += 864e5) { const p = new Date(t).toISOString().slice(0, 7); part[p] = (part[p] || 0) + l.value / days; }
      Object.entries(part).forEach(([p, val]) => { months.add(p); const i = x.records.findIndex((r) => r.period === p && r.metric === l.metric), old = i >= 0 ? Number(x.records[i].value) || 0 : 0;
        const rec = { id: i >= 0 ? x.records[i].id : 'R' + uid(), period: p, metric: l.metric, value: Math.round((old + val) * 10000) / 10000, source: 'Bill', note: str(((i >= 0 && x.records[i].note) ? x.records[i].note + ' + ' : '') + (file || 'bill') + (l.site ? ' (' + l.site + ')' : ''), 200), file, by: str(by, 80), at: Date.now() };
        if (i >= 0) x.records[i] = rec; else x.records.push(rec); }); });
    x.rev = (x.rev || 0) + 1; x.updated = Date.now(); return x;
  }, () => null);
  if (err) return err;
  await touchIndex(v).catch(() => {});   // the figures are saved: a slow index update does not undo them
  return { vault: v, added, skipped, months: months.size };
}
