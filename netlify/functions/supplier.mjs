// POST /.netlify/functions/supplier  (GKH Project Champ: the supplier ESG data form, reached through a private link)
// Body: { t: the link's token, action: 'get' | 'save', answers?, contact?, country?, currency?, submit?, confirm?, website (hidden: bots fill it) }
// The token is the only key: no account, and the supplier sees only its own request. netlify/lib/suppliers.mjs does the work.
import { cors, json } from '../lib/shared.mjs';

const hits = new Map();
function limited(ip) {   // 120 calls an hour per address: plenty for a person filling in a form, and it stops guessing
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  list.push(now); if (list.length > 121) list.splice(0, list.length - 121); hits.set(ip, list); if (hits.size > 5000) hits.clear();
  return list.length > 120;
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'local';
  if (limited(ip)) return json(429, { error: 'Too many tries from this connection. Please wait an hour and try again.' });
  let b; try { b = await req.json(); } catch { return json(400, { error: 'Invalid request' }); }
  if (!b || typeof b !== 'object') return json(400, { error: 'Invalid request' });
  if (b.website) return json(200, { ok: true });   // a bot: keep nothing
  if (JSON.stringify(b).length > 120000) return json(413, { error: 'That is more than the form holds.' });
  const SP = await import('../lib/suppliers.mjs');
  try {
    const r = b.action === 'save' ? await SP.formSave(b.t, b) : await SP.formGet(b.t);
    return r.error ? json(r.code || 400, { error: r.error }) : json(200, r);
  } catch (e) {
    console.log('supplier form: ' + e.message);
    return json(500, { error: 'Sorry, that did not save. Please try again in a minute.' });
  }
};
