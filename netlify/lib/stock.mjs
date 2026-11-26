// 🖼 Free stock photos for the report styles (ESG documents): one photo per call, found from the report's context.
//   Pexels when PEXELS_API_KEY is set (free licence, no credit needed); otherwise Openverse, keeping only CC0 and
//   public-domain photos (no credit needed either). The credit is still returned and shown, as a courtesy.
//   The server only ever downloads from the search results it fetched itself (never a URL sent by the browser).
const OV = () => process.env.OPENVERSE_BASE_URL || 'https://api.openverse.org';
const PX = () => process.env.PEXELS_BASE_URL || 'https://api.pexels.com';
const MAX = 2.2 * 1024 * 1024;
const str = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, n);
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dns from 'node:dns';
// the search APIs: fixed hosts; the timer runs until the body is read
async function getJson(url, opt = {}, ms = 9000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opt, signal: c.signal }); return { ok: r.ok, status: r.status, j: r.ok ? await r.json() : null }; } finally { clearTimeout(t); }
}
// 🛡 the photos themselves come from hosts the search results name: every connection (and every redirect) must reach a public
//   address. The check runs inside the connection's own DNS lookup, so a name cannot change its answer between check and connect.
export const privateIp = (ip) => { if (net.isIPv4(ip)) { const [a, b] = ip.split('.').map(Number); return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224; }
  const x = ip.toLowerCase(); if (x.startsWith('::ffff:')) return privateIp(x.slice(7)); return x === '::' || x === '::1' || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith('ff'); };
const localOk = () => process.env.STOCK_ALLOW_LOCAL === '1';   // the quick test's own photo server only (never set on a real site)
function safeLookup(host, o, cb) { dns.lookup(host, { all: true }, (err, L) => { if (err) return cb(err); const bad = !localOk() && L.some((a) => privateIp(a.address)); if (bad || !L.length) return cb(new Error('That photo is on a private address')); if (o && o.all) return cb(null, L); cb(null, L[0].address, L[0].family); }); }
function download(url, ms = 10000, hops = 3) {
  return new Promise((ok, no) => {
    let u; try { u = new URL(url); } catch { return no(new Error('bad url')); }
    if (!/^https?:$/.test(u.protocol) || (u.protocol === 'http:' && !localOk())) return no(new Error('only https'));
    const h = u.hostname.replace(/^\[|\]$/g, ''); if (net.isIP(h) && !localOk() && privateIp(h)) return no(new Error('private address'));
    const req = (u.protocol === 'https:' ? https : http).get(u, { lookup: safeLookup, timeout: ms, headers: { 'User-Agent': 'GKH-Project-Champ/1.0 (report photos)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); clearTimeout(t); if (!hops) return no(new Error('too many redirects')); return download(new URL(res.headers.location, u).href, ms, hops - 1).then(ok, no); }
      const ty = String(res.headers['content-type'] || '').split(';')[0];
      if (res.statusCode !== 200 || !/^image\/(jpeg|png|webp)$/.test(ty)) { res.resume(); clearTimeout(t); return no(new Error('not an image')); }
      const parts = []; let n = 0;
      res.on('data', (d) => { n += d.length; if (n > MAX) { req.destroy(new Error('too big')); return; } parts.push(d); });
      res.on('end', () => { clearTimeout(t); ok({ ty, b: Buffer.concat(parts) }); }); res.on('error', (e) => { clearTimeout(t); no(e); });
    });
    const t = setTimeout(() => req.destroy(new Error('timeout')), ms);   // the whole download, body included
    req.on('error', (e) => { clearTimeout(t); no(e); });
  });
}

async function search(q, tall) {
  const key = process.env.PEXELS_API_KEY;
  if (key) {
    try {
      const r = await getJson(PX() + '/v1/search?per_page=15&query=' + encodeURIComponent(q) + '&orientation=' + (tall ? 'portrait' : 'landscape'), { headers: { Authorization: key } });
      if (r.ok) { const j = r.j; const L = (j.photos || []).map((p) => ({ src: (p.src && (p.src.large2x || p.src.large)) || '', credit: 'Photo: ' + str(p.photographer, 60) + ' on Pexels', link: str(p.url, 300) })).filter((p) => p.src); if (L.length) return L; }
    } catch { /* falls back to Openverse */ }
  }
  const r = await getJson(OV() + '/v1/images/?license=cc0,pdm&mature=false&page_size=20&q=' + encodeURIComponent(q) + '&aspect_ratio=' + (tall ? 'tall' : 'wide'));
  if (!r.ok) throw new Error('The photo library did not answer (' + r.status + '). Try again in a minute.');
  const j = r.j;
  return (j.results || []).filter((p) => p.url && (!p.width || p.width >= 900) && !/\.(gif|svg|tiff?)(\?|$)/i.test(p.url))
    .map((p) => ({ src: p.url, credit: (p.title ? '“' + str(p.title, 60) + '”' : 'Photo') + (p.creator ? ' by ' + str(p.creator, 50) : '') + ' (' + String(p.license || '').toUpperCase() + ', via Openverse)', link: str(p.foreign_landing_url, 300) }));
}

// body: { q: search words, i: which photo (0 = cover, 1 = part pages, 2 = bands), skip: how many to pass over (for "other photos") }
export async function photo(body) {
  const q = str(body.q, 80); if (q.length < 2) return { error: 'Type a few words to search for, for example "airline sky" or "palm oil plantation".', code: 400 };
  const i = Math.max(0, Math.min(2, Number(body.i) || 0)), skip = Math.max(0, Math.min(100000, Math.floor(Number(body.skip) || 0)));   // any offset: it wraps round the results
  let L; try { L = await search(q, i < 2); } catch (e) { return { error: e.name === 'AbortError' ? 'The photo library took too long. Try again.' : e.message, code: 502 }; }
  if (!L.length) return { error: 'No free photos found for "' + q + '". Try other words.', code: 404 };
  // spread the three photos over the results, and try the next one when a download fails or is too big
  for (let k = 0; k < 5; k++) {
    const p = L[(skip + i * 3 + k) % L.length];
    try {
      const { ty, b } = await download(p.src); if (b.length < 200) continue;
      return { url: 'data:' + ty + ';base64,' + b.toString('base64'), credit: p.credit, link: p.link };
    } catch { /* the next result */ }
  }
  return { error: 'Those photos could not be downloaded just now. Try again or try other words.', code: 502 };
}
