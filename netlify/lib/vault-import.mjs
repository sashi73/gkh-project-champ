// 📥 Bringing figures into the Sustainability vault from other systems: a CSV or Excel sheet (any layout: long or wide, months,
//   quarters or years, with or without units and sites), an export from an ESG platform such as Diligent, or another system
//   sending them through the vault's API (netlify/functions/vault-api.mjs, with a key made in the vault).
//   Everything goes through normalise(): names are matched to the vault's measures (their id, their name, common names used
//   by other platforms and frameworks, or a mapping the user chose, kept with the vault), units are converted, a quarter or a
//   year is spread over its months, and rows for the same month (sites, meters) are added up.
import * as kv from './kv.mjs';
import * as SV from './esg-vault.mjs';
import { createHash, randomBytes } from 'node:crypto';

const str = (s, n = 300) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const MK = new Map(SV.METRICS.map((m) => [m[0], m]));
export const norm = (t) => String(t == null ? '' : t).toLowerCase().replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const MAX_ROWS = 20000;

// common names for each measure (other platforms, GRI wording, bills): the user's own mapping comes first
const SYN = {
  'carbon.elec': ['electricity', 'electricity consumption', 'electricity consumed', 'purchased electricity', 'grid electricity', 'electricity usage', 'electricity use', 'power consumption', 'energy electricity', 'electricity purchased'],
  'carbon.green': ['renewable electricity', 'green electricity', 'renewable energy electricity', 'green power', 'solar electricity', 'renewable electricity consumed', 'rec', 'recs'],
  'resources.energyMWh': ['total energy', 'total energy consumption', 'energy consumption', 'energy consumed', 'energy use', 'total energy use', 'energy consumption within the organization', 'gri 302 1'],
  'carbon.diesel': ['diesel', 'diesel fuel', 'diesel consumption', 'gas oil', 'automotive diesel'],
  'carbon.petrol': ['petrol', 'gasoline', 'unleaded petrol', 'motor gasoline'],
  'carbon.jet': ['jet fuel', 'jet a 1', 'jet a1', 'aviation fuel', 'kerosene'],
  'carbon.lpg': ['lpg', 'liquefied petroleum gas', 'propane'],
  'carbon.gas': ['natural gas', 'gas', 'pipeline gas', 'natural gas consumption'],
  'carbon.refrig': ['refrigerant', 'refrigerants', 'refrigerant top up', 'refrigerant leakage', 'refrigerant losses'],
  'resources.waterWd': ['water', 'water withdrawal', 'water withdrawn', 'water consumption', 'water use', 'total water withdrawal', 'gri 303 3'],
  'resources.wasteT': ['waste', 'total waste', 'waste generated', 'total waste generated', 'gri 306 3'],
  'scope3.landfill': ['landfill', 'waste to landfill', 'landfilled waste', 'waste disposed to landfill'],
  'scope3.recycled': ['recycled waste', 'waste recycled', 'recycling', 'waste diverted', 'waste diverted from disposal', 'gri 306 4'],
  'scope3.freight': ['freight', 'freight tonne km', 'tonne km', 'upstream transportation', 'logistics'],
  'scope3.air': ['flights', 'air travel', 'business air travel', 'air passenger km', 'flight distance'],
  'scope3.car': ['car travel', 'business car travel', 'vehicle km', 'mileage', 'car km'],
  'scope3.hotel': ['hotel', 'hotel nights', 'hotel stays', 'accommodation nights'],
  'scope3.purch': ['purchased goods and services', 'procurement spend', 'spend', 'purchases', 'supplier spend'],
  'scope3.supplierT': ['supplier emissions', 'supplier specific emissions'],
  'workforce.fte': ['fte', 'employees', 'headcount', 'number of employees', 'total employees', 'workforce', 'full time equivalents'],
  'workforce.hours': ['hours worked', 'total hours worked', 'man hours', 'labour hours', 'work hours'],
  'workforce.injuries': ['injuries', 'recordable injuries', 'recordable work related injuries', 'lost time injuries', 'lti', 'trir injuries'],
  'workforce.deaths': ['fatalities', 'deaths', 'work related fatalities'],
  'workforce.hires': ['new hires', 'hires', 'new employees', 'new employee hires'],
  'workforce.leavers': ['leavers', 'turnover', 'employee turnover', 'departures', 'terminations'],
  'community.invest': ['community investment', 'donations', 'social investment', 'charitable donations'],
  'org.revenue': ['revenue', 'turnover revenue', 'net revenue', 'total revenue', 'sales']
};
const BYNAME = new Map(); SV.METRICS.forEach((m) => { [m[0], m[0].split('.')[1], m[1], ...(SYN[m[0]] || [])].forEach((n) => { const k = norm(n); if (k && !BYNAME.has(k)) BYNAME.set(k, m[0]); }); });
export const SUGGEST = Object.fromEntries(Object.entries(SYN).map(([k, v]) => [k, v.slice(0, 4)]));

// 📏 units: the factor that takes a value in the given unit to the measure's unit (null: unknown, so the row is held back)
const U = { kwh: ['MWh', 0.001], mwh: ['MWh', 1], gwh: ['MWh', 1000], wh: ['MWh', 1e-6], gj: ['GJ', 1], mj: ['GJ', 0.001], tj: ['GJ', 1000],
  l: ['L', 1], litre: ['L', 1], litres: ['L', 1], liter: ['L', 1], liters: ['L', 1], kl: ['L', 1000], ml: ['L', 1e6], megalitre: ['L', 1e6], megalitres: ['L', 1e6], gal: ['L', 3.78541], gallon: ['L', 3.78541], gallons: ['L', 3.78541],
  m3: ['m3', 1], 'cubic metres': ['m3', 1], 'cubic meters': ['m3', 1],
  t: ['t', 1], tonne: ['t', 1], tonnes: ['t', 1], ton: ['t', 1], tons: ['t', 1], mt: ['t', 1], kg: ['t', 0.001], kgs: ['t', 0.001], g: ['t', 1e-6], lb: ['t', 0.000453592], lbs: ['t', 0.000453592],
  km: ['km', 1], mi: ['km', 1.609344], miles: ['km', 1.609344], 'passenger km': ['passenger-km', 1], pkm: ['passenger-km', 1], 'tonne km': ['tonne-km', 1], tkm: ['tonne-km', 1],
  h: ['hours', 1], hr: ['hours', 1], hrs: ['hours', 1], hours: ['hours', 1], nights: ['nights', 1], fte: ['FTE', 1], headcount: ['FTE', 1] };
// water: the vault keeps m3 (a litre is 0.001 m3; a megalitre is 1,000 m3); kg of refrigerant stays kg; money: k$ or M
function convert(v, unit, m) {
  const want = m[2], u = norm(String(unit || '').replace(/³/g, '3').replace(/\$/g, ' usd '));
  if (!u || u === norm(want)) return v;
  if (want === 'm3') { if (['l', 'litre', 'litres', 'liter', 'liters'].includes(u)) return v * 0.001; if (['kl'].includes(u)) return v; if (['ml', 'megalitre', 'megalitres'].includes(u)) return v * 1000; }
  if (want === 'kg') { if (['kg', 'kgs'].includes(u)) return v; if (['t', 'tonne', 'tonnes'].includes(u)) return v * 1000; if (u === 'g') return v / 1000; }
  if (want === 'k$') { if (/^(k|thousand)/.test(u)) return v; if (/^(m|million)/.test(u)) return v * 1000; if (/^(usd|aud|sgd|myr|aed|sar|eur|gbp|dollars?)$/.test(u)) return v / 1000; }
  if (want === 'M') { if (/^(m|million)/.test(u)) return v; if (/^(k|thousand)/.test(u)) return v / 1000; if (/^(usd|aud|sgd|myr|aed|sar|eur|gbp|dollars?)$/.test(u)) return v / 1e6; }
  if (want === '$' && /^(usd|aud|sgd|myr|aed|sar|eur|gbp|dollars?)$/.test(u)) return v;
  if (want === '' && /^(count|number|no|cases|people|persons|employees|incidents)$/.test(u)) return v;
  const c = U[u]; return c && c[0] === want ? v * c[1] : null;
}
// 🗓 a period: a month, a quarter or a year (a financial year from the vault's first month), as the months it covers
function months(p, fyStart) {
  const s = String(p == null ? '' : p).trim(); if (!s) return null;
  const ym = (y, m) => y + '-' + String(m).padStart(2, '0'), span = (y, m, n) => { const L = []; for (let i = 0; i < n; i++) { const mm = ((m - 1 + i) % 12) + 1, yy = y + Math.floor((m - 1 + i) / 12); L.push(ym(yy, mm)); } return L; };
  let x;
  if ((x = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:[T ].*)?$/)) && +x[2] >= 1 && +x[2] <= 12) return [ym(+x[1], +x[2])];
  if ((x = s.match(/^(\d{1,2})[-/.](\d{4})$/)) && +x[1] >= 1 && +x[1] <= 12) return [ym(+x[2], +x[1])];
  if ((x = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) { const m = +x[2] <= 12 ? +x[2] : +x[1]; return [ym(+x[3], m)]; }   // dd/mm/yyyy (mm/dd if the middle cannot be a month)
  if ((x = s.match(/^(\d{4})\s*[-/ ]?\s*Q([1-4])$/i)) || (x = s.match(/^Q([1-4])\s*[-/ ]?\s*(\d{4})$/i))) { const y = +(x[1].length === 4 ? x[1] : x[2]), q = +(x[1].length === 4 ? x[2] : x[1]); return span(y, (q - 1) * 3 + 1, 3); }
  if ((x = s.match(/^FY\s*(\d{4}|\d{2})$/i))) { const y = x[1].length === 2 ? 2000 + +x[1] : +x[1]; return fyStart === 1 ? span(y, 1, 12) : span(y - 1, fyStart, 12); }   // FY2026 ends in 2026
  if ((x = s.match(/^(\d{4})$/))) return span(+x[1], 1, 12);
  if ((x = s.match(/^(\d{4})\s*[-/]\s*(\d{2}|\d{4})$/)) && fyStart > 1) return span(+x[1], fyStart, 12);   // 2025-26
  // a month written out (Mar 2026, March-2026, 1 March 2026, March 1, 2026): nothing else goes to the date parser
  if (!/^(\d{1,2}\s+)?[A-Za-z]{3,9}\.?[\s-]+(\d{1,2},?\s+)?\d{4}$/.test(s)) return null;
  const d = new Date(/^[A-Za-z]{3,9}\.?[\s-]+\d{4}$/.test(s) ? '1 ' + s.replace(/[.-]/g, ' ') : s); if (!isNaN(d) && d.getFullYear() > 1990) return [ym(d.getFullYear(), d.getMonth() + 1)];
  return null;
}

// rows: [{ period, name (or metric), value, unit?, site? }]; map: { normalised name: measure id or '' to ignore }
export function normalise(rows, { map = {}, fyStart = 1 } = {}) {
  const out = new Map(), unmatched = new Map(), held = [];
  (Array.isArray(rows) ? rows : []).slice(0, MAX_ROWS).forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const nm = str(r.metric || r.name || r.measure, 160), k = norm(nm), mid = MK.has(r.metric) ? r.metric : map[k] !== undefined ? map[k] : BYNAME.get(k);
    if (mid === '') return;   // the user chose to leave it out
    if (!mid || !MK.has(mid)) { if (nm) unmatched.set(k, { name: nm, n: (unmatched.get(k) || { n: 0 }).n + 1, unit: str(r.unit, 20) }); return; }
    const m = MK.get(mid), raw = typeof r.value === 'number' ? r.value : Number(String(r.value ?? '').replace(/[,\s$€£%]/g, ''));
    if (r.value === '' || r.value == null || !Number.isFinite(raw)) { held.push({ row: r.row || i + 1, name: nm, why: 'no number' }); return; }
    const v = convert(raw, str(r.unit, 30), m); if (v == null) { held.push({ row: r.row || i + 1, name: nm, why: 'unit "' + str(r.unit, 20) + '" cannot become ' + (m[2] || 'a count') }); return; }
    const ms = months(r.period, fyStart); if (!ms) { held.push({ row: r.row || i + 1, name: nm, why: 'period "' + str(r.period, 20) + '" not understood' }); return; }
    const each = m[3] === 'sum' ? v / ms.length : v;   // a quarter's or a year's total spread evenly; an average (FTE) is the same in every month
    ms.forEach((p) => { const key = p + '|' + mid, o = out.get(key); if (o) { o.value += each; o.n++; } else out.set(key, { period: p, metric: mid, label: m[1], unit: m[2], value: each, n: 1 }); });
  });
  const set = [...out.values()].map((x) => ({ ...x, value: Math.round(x.value * 10000) / 10000 })).sort((a, b) => (a.period + a.metric).localeCompare(b.period + b.metric));
  return { set, unmatched: [...unmatched.entries()].map(([k, x]) => ({ key: k, ...x })).sort((a, b) => b.n - a.n).slice(0, 200), held: held.slice(0, 200), heldN: held.length };
}

// ✅ into the vault: "replace" puts each month's value in place of what is there; "add" adds onto it (another site, another system)
export async function apply(key, rows, { map, mode = 'replace', file = '', source = 'Import', dry = false, saveMap = false } = {}, by) {
  key = SV.keyOf(key); const v0 = await SV.get(key); if (!v0) return { error: 'Open the vault first', code: 404 };
  if (!Array.isArray(rows) || !rows.length) return { error: 'There are no rows to import.', code: 400 };
  const keep = { ...(v0.importMap || {}) }, clean = {}; Object.entries(map && typeof map === 'object' ? map : {}).slice(0, 300).forEach(([k, val]) => { const kk = norm(k); if (kk && (val === '' || MK.has(val))) clean[kk] = val; });
  const N = normalise(rows, { map: { ...keep, ...clean }, fyStart: v0.fyStart || 1 });
  if (dry || !N.set.length) return { ...N, dry: true, metrics: SV.METRICS, saved: v0.importMap || {} };
  let err = null;
  const v = await kv.update('svault:' + key, (x) => {
    if (!x) { err = { error: 'Open the vault first', code: 404 }; return x; }
    x.records = x.records || [];
    N.set.forEach((s) => { const i = x.records.findIndex((r) => r.period === s.period && r.metric === s.metric), old = i >= 0 ? Number(x.records[i].value) || 0 : 0;
      const rec = { id: i >= 0 ? x.records[i].id : 'R' + Date.now().toString(36).toUpperCase() + randomBytes(2).toString('hex').toUpperCase(), period: s.period, metric: s.metric, value: Math.round((mode === 'add' ? old + s.value : s.value) * 10000) / 10000, source: ['Import', 'Meter'].includes(source) ? source : 'Import', note: '', file: str(file, 120), by: str(by, 80), at: Date.now() };
      if (i >= 0) x.records[i] = rec; else x.records.push(rec); });
    if (saveMap && Object.keys(clean).length) { x.importMap = { ...(x.importMap || {}), ...clean }; const ks = Object.keys(x.importMap); if (ks.length > 500) ks.slice(0, ks.length - 500).forEach((k) => delete x.importMap[k]); }
    x.rev = (x.rev || 0) + 1; x.updated = Date.now(); return x;
  }, () => null);
  if (err) return err;
  await SV.touchIndex(v).catch(() => {});
  return { ...N, saved: N.set.length, months: new Set(N.set.map((s) => s.period)).size };
}

// 🔑 API keys for a vault: shown once, kept only as a hash. svapi:<sha256> = { key: vault, id }
const hash = (t) => createHash('sha256').update(String(t)).digest('hex');
export async function keys(key) { const v = await SV.get(SV.keyOf(key)); return v ? { keys: (v.apiKeys || []).map(({ h, ...k }) => k) } : { error: 'Open the vault first', code: 404 }; }
export async function keyCreate(key, label, by) {
  key = SV.keyOf(key); const v = await SV.get(key); if (!v) return { error: 'Open the vault first', code: 404 };
  if ((v.apiKeys || []).length >= 10) return { error: 'A vault can have 10 keys: remove one first.', code: 400 };
  const id = 'K' + randomBytes(3).toString('hex').toUpperCase(), secret = 'cvk_' + randomBytes(24).toString('base64url'), h = hash(secret);
  await kv.set('svapi:' + h, { key, id });
  await kv.update('svault:' + key, (x) => { if (!x) return x; x.apiKeys = [...(x.apiKeys || []), { id, h, label: str(label, 60) || 'API key', by: str(by, 80), created: Date.now(), last: null, hint: secret.slice(-4) }]; return x; }, () => null);
  return { id, secret };
}
export async function keyRevoke(key, id) {
  key = SV.keyOf(key); let h = null;
  await kv.update('svault:' + key, (x) => { if (!x) return x; const k = (x.apiKeys || []).find((y) => y.id === id); if (k) { h = k.h; x.apiKeys = x.apiKeys.filter((y) => y.id !== id); } return x; }, () => null);
  if (h) await kv.del('svapi:' + h).catch(() => {});
  return h ? { ok: true } : { error: 'That key is no longer there.', code: 404 };
}
export async function byKey(secret) {
  if (!/^cvk_[A-Za-z0-9_-]{30,40}$/.test(String(secret || ''))) return null;
  const h = hash(secret), ix = await kv.get('svapi:' + h); if (!ix) return null;
  const v = await SV.get(ix.key); const k = v && (v.apiKeys || []).find((y) => y.id === ix.id && y.h === h); if (!k) return null;
  if (!k.last || Date.now() - k.last > 15 * 60e3) await kv.update('svault:' + ix.key, (x) => { if (!x) return x; const y = (x.apiKeys || []).find((z) => z.id === ix.id); if (y) y.last = Date.now(); return x; }, () => null).catch(() => {});   // "last used" to the quarter hour: not a write on every call
  return { key: ix.key, id: ix.id, label: k.label, name: v.name };
}
