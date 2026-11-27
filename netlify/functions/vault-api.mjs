// /.netlify/functions/vault-api  (GKH Project Champ: send figures into a Sustainability vault from another system)
//   Authorization: Bearer <a key made in the vault: 📥 Import › API access>
//   GET  → the vault's name and its measures (id, name, unit), so the other system knows what to send
//   POST { records: [{ period: "2026-03" | "2026-Q1" | "FY2026", metric: "carbon.elec" or a name such as "Electricity consumption",
//          value: 1234, unit?: "kWh" }], mode?: "replace" | "add", dry?: true }
//   → what was saved, the names it did not recognise and the rows it held back (with why). At most 5,000 records a call.
import { json } from '../lib/shared.mjs';

const hits = new Map();
const limited = (who) => { const now = Date.now(), L = (hits.get(who) || []).filter((t) => now - t < 60e3); L.push(now); if (L.length > 61) L.splice(0, L.length - 61); hits.set(who, L); if (hits.size > 5000) hits.clear(); return L.length > 60; };   // 60 calls a minute

export default async (req, context) => {
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'local';
  if (limited('ip:' + ip)) return json(429, { error: 'Too many calls: at most 60 a minute.' });
  const secret = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const VI = await import('../lib/vault-import.mjs'), SV = await import('../lib/esg-vault.mjs');
  let k; try { k = await VI.byKey(secret); } catch (e) { console.log('vault-api key check: ' + e.message); return json(503, { error: 'The vault could not be reached just now. Try again in a minute.' }); }
  if (!k) return json(401, { error: 'Send a valid key: Authorization: Bearer <key from the vault, 📥 Import › API access>.' });
  if (req.method === 'GET') return json(200, { vault: k.name, measures: SV.METRICS.map((m) => ({ id: m[0], name: m[1], unit: m[2], adds_up: m[3] === 'sum' ? 'total for the month' : 'average for the month' })), periods: ['2026-03', '2026-Q1 (spread over 3 months)', 'FY2026 (spread over the financial year)'], modes: ['replace', 'add'] });
  if (req.method !== 'POST') return json(405, { error: 'Use GET or POST.' });
  const len = Number(req.headers.get('content-length') || 0); if (len > 3e6) return json(413, { error: 'At most 3 MB a call.' });
  let txt; try { txt = await req.text(); } catch { return json(400, { error: 'The body could not be read.' }); }
  if (txt.length > 3e6) return json(413, { error: 'At most 3 MB a call.' });
  let b; try { b = JSON.parse(txt); } catch { return json(400, { error: 'The body must be JSON: { "records": [ … ] }' }); }
  const rows = Array.isArray(b) ? b : b && Array.isArray(b.records) ? b.records : null;
  if (!rows || !rows.length) return json(400, { error: 'Send { "records": [ { "period": "2026-03", "metric": "carbon.elec", "value": 12.5, "unit": "MWh" } ] }' });
  if (rows.length > 5000) return json(413, { error: 'At most 5,000 records a call.' });
  try {
    const r = await VI.apply(k.key, rows, { mode: b.mode === 'add' ? 'add' : 'replace', file: 'API: ' + k.label, source: 'Import', dry: !!b.dry }, 'API key ' + k.id);
    if (r.error) return json(r.code || 400, { error: r.error });
    if (!r.dry && r.saved) { try { const A = await import('../lib/admin-lib.mjs'); await Promise.resolve(A.audit('API key ' + k.id + ' (' + k.label + ')', `Sustainability vault: ${r.saved} monthly value(s) sent by API (${k.key})`)); } catch (e) { console.log('vault-api audit: ' + e.message); } }
    return json(200, { vault: k.name, dry: !!r.dry, saved: r.dry ? 0 : r.saved || 0, months: r.months || 0, values: r.set.length, unrecognised: r.unmatched.map((u) => u.name), held_back: r.held, held_back_count: r.heldN });
  } catch (e) { console.log('vault-api: ' + e.message); return json(500, { error: 'That did not save. Try again in a minute.' }); }
};
