// 📍 Where a project is worked: its weekend and its public holidays, and the place search behind "Location".
// - Weekends: Saturday–Sunday by default; by country from the runtime's locale data (Intl week info), corrected where
//   that is out of date, and by state where a state differs (Kedah, Kelantan, Terengganu: Friday–Saturday).
// - Public holidays: the date-holidays library (207 countries, their states and regions), worked out here, no outside service.
// - Places: countries and states from the same library (offline), towns from OpenStreetMap's Photon search (no key).
// Days are JavaScript days: 0 Sunday … 6 Saturday.
import Holidays from 'date-holidays';

const HD = new Holidays();
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// where the locale data is behind, or a state differs from its country (checked Nov 2026)
const COUNTRY_WE = { IR: [4, 5] };   // Iran: Thursday–Friday (the 2025 law); the locale data still says Friday only
const STATE_WE = { 'MY-02': [5, 6], 'MY-03': [5, 6], 'MY-11': [5, 6] };   // Kedah, Kelantan, Terengganu (Johor went back to Sat–Sun in 2025)

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();   // any script: تهران, 東京
export const dayNames = (wk) => (wk || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY[d]).join('–');

export function weekendOf(cc, st) {
  cc = String(cc || '').toUpperCase(); st = String(st || '').toUpperCase();
  if (STATE_WE[cc + '-' + st]) return STATE_WE[cc + '-' + st].slice();
  if (COUNTRY_WE[cc]) return COUNTRY_WE[cc].slice();
  try {
    const L = new Intl.Locale('und-' + cc), w = (L.getWeekInfo ? L.getWeekInfo() : L.weekInfo) || {};
    if (Array.isArray(w.weekend) && w.weekend.length) return w.weekend.map((d) => d % 7);
  } catch { /* unknown region */ }
  return [6, 0];
}

export const countryName = (cc) => (HD.getCountries('en') || {})[String(cc || '').toUpperCase()] || '';
export const stateName = (cc, st) => (cc && st && (HD.getStates(String(cc).toUpperCase(), 'en') || {})[String(st).toUpperCase()]) || '';

// public holidays, from one year to another (inclusive): [{ d: 'YYYY-MM-DD', n: name }], one per day
export function holidays(cc, st, from, to) {
  cc = String(cc || '').toUpperCase(); st = String(st || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc) || !countryName(cc)) return [];
  const y0 = Math.max(2000, Math.min(2100, +from || new Date().getUTCFullYear())), y1 = Math.max(y0, Math.min(y0 + 12, +to || y0));
  let hd; try { hd = st && stateName(cc, st) ? new Holidays(cc, st) : new Holidays(cc); } catch { return []; }
  const out = new Map();
  for (let y = y0; y <= y1; y++) {
    for (const h of hd.getHolidays(y, 'en') || []) {
      if (h.type !== 'public') continue;
      // a holiday can span days (e.g. a two-day Eid): each of its days, in the place's own calendar date
      const d0 = String(h.date).slice(0, 10), span = Math.max(1, Math.min(7, Math.round((h.end - h.start) / 864e5) || 1));
      for (let n = 0; n < span; n++) { const d = addDays(d0, n); if (!out.has(d)) out.set(d, String(h.name || 'Public holiday').slice(0, 80)); }
    }
  }
  return [...out].sort((a, b) => a[0].localeCompare(b[0])).map(([d, n]) => ({ d, n }));
}
const addDays = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

// what one place means for a project: its name, country, state, weekend
export function placeOf(cc, st, label) {
  cc = String(cc || '').toUpperCase(); st = String(st || '').toUpperCase();
  const wk = weekendOf(cc, st), sn = stateName(cc, st), cn = countryName(cc);
  return { place: String(label || [sn, cn].filter(Boolean).join(', ')).slice(0, 120), cc, st: sn ? st : '', wk, wkName: dayNames(wk) };
}

// the state code for a state name from a map service ("Kedah" → 02)
function stateCode(cc, name) {
  const n = norm(name).replace(/^(state of|wilayah persekutuan|federal territory of) /, ''); if (!n) return '';
  const S = [HD.getStates(cc, 'en') || {}, HD.getStates(cc) || {}];   // English and local names (Bavaria / Bayern)
  for (const T of S) for (const [k, v] of Object.entries(T)) if (norm(v) === n) return k;   // exact first: West Virginia is not Virginia
  for (const T of S) for (const [k, v] of Object.entries(T)) { const m = norm(v); if (m.includes(n) || n.includes(m)) return k; }
  return '';
}

// "Kua" → Kuala Lumpur, Malaysia …; countries and states first (offline), then towns (Photon), up to 8
export async function places(q, fetcher = fetch) {
  const s = norm(q); if (s.length < 2) return [];
  const out = [], seen = new Set(), push = (o) => { const k = o.place.toLowerCase(); if (!seen.has(k) && out.length < 8) { seen.add(k); out.push(o); } };
  const C = HD.getCountries('en') || {};
  for (const [cc, cn] of Object.entries(C)) {
    if (norm(cn).startsWith(s)) push({ ...placeOf(cc, '', cn), kind: 'Country' });
    for (const [st, sn] of Object.entries(HD.getStates(cc, 'en') || {})) if (norm(sn).startsWith(s)) push({ ...placeOf(cc, st, sn + ', ' + cn), kind: 'State' });
  }
  if (s.length >= 3) {
    try {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 3000);
      try {
      const r = await fetcher('https://photon.komoot.io/api/?limit=8&lang=en&osm_tag=place&q=' + encodeURIComponent(String(q).slice(0, 60)), { signal: ctl.signal, headers: { 'User-Agent': 'GKH Project Champ (gkhpmo.com)' } });
      if (r.ok) {
        const j = await r.json();
        for (const f of (j.features || [])) {
          const p = f.properties || {}, cc = String(p.countrycode || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(cc) || !C[cc] || !p.name) continue;
          if (!/^(city|town|village|suburb|municipality|hamlet|quarter|neighbourhood|borough|state|province|region|county|district)$/.test(String(p.osm_value || p.type || 'city'))) continue;
          const st = stateCode(cc, p.state), label = [p.name, p.state && norm(p.state) !== norm(p.name) ? p.state : '', C[cc]].filter(Boolean).join(', ');
          push({ ...placeOf(cc, st, label), kind: 'Town' });
        }
      }
      } finally { clearTimeout(tm); }   // the 3-second limit covers reading the answer too
    } catch { /* offline, or the map service is slow: countries and states still work */ }
  }
  return out;
}
