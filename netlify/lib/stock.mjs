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
  try { const r = await fetch(url, { ...opt, headers: { 'User-Agent': 'GKH-Project-Champ/1.0 (report photos)', Accept: 'application/json', ...(opt.headers || {}) }, signal: c.signal }); return { ok: r.ok, status: r.status, j: r.ok ? await r.json() : null }; } finally { clearTimeout(t); }
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
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); clearTimeout(t); if (!hops) return no(new Error('too many redirects')); let nx; try { nx = new URL(res.headers.location, u).href; } catch { return no(new Error('bad redirect')); } return download(nx, ms, hops - 1).then(ok, no); }
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
  // no shape filter (it left too few photos: the page crops them to fit); a photo's own file first, then Openverse's copy of it (smaller, on its own https host)
  const r = await getJson(OV() + '/v1/images/?license=cc0,pdm&mature=false&page_size=20&q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('The photo library did not answer (' + r.status + '). Try again in a minute.');
  const j = r.j, up = (u) => (localOk() ? String(u || '') : String(u || '').replace(/^http:\/\//i, 'https://'));
  return (j.results || []).filter((p) => p.url && (!p.width || p.width >= 640) && !/\.(gif|svg|tiff?)(\?|$)/i.test(p.url))
    .map((p) => ({ src: up(p.url), alt: p.id && /^[\w-]{8,64}$/.test(p.id) ? OV() + '/v1/images/' + p.id + '/thumb/' : (p.thumbnail ? up(p.thumbnail) : ''), credit: (p.title ? '“' + str(p.title, 60) + '”' : 'Photo') + (p.creator ? ' by ' + str(p.creator, 50) : '') + ' (' + String(p.license || '').toUpperCase() + ', via Openverse)', link: str(p.foreign_landing_url, 300) }));
}

// body: { q: search words, i: which photo (0 = cover, 1 = part pages, 2 = bands), skip: how many to pass over (for "other photos") }
export async function photo(body) {
  const q = str(body.q, 80); if (q.length < 2) return { error: 'Type a few words to search for, for example "airline sky" or "palm oil plantation".', code: 400 };
  const i = Math.max(0, Math.min(2, Number(body.i) || 0)), skip = Math.max(0, Math.min(100000, Math.floor(Number(body.skip) || 0)));   // any offset: it wraps round the results
  let L; try { L = await search(q, i < 2); } catch (e) { return { error: e.name === 'AbortError' ? 'The photo library took too long. Try again.' : e.message, code: 502 }; }
  if (!L.length) return { error: 'No free photos found for "' + q + '". Try other words.', code: 404 };
  // spread the three photos over the results, and try the next one when a download fails or is too big
  const why = [];
  for (let k = 0; k < Math.min(6, L.length); k++) {
    const p = L[(skip + i * 3 + k) % L.length];
    for (const src of [p.src, p.alt].filter(Boolean)) {   // the original, then the library's smaller copy
      try {
        const { ty, b } = await download(src); if (b.length < 200) { why.push('empty file'); continue; }
        return { url: 'data:' + ty + ';base64,' + b.toString('base64'), credit: p.credit, link: p.link };
      } catch (e) { why.push(String(e.message || e).slice(0, 40)); }
    }
  }
  return { error: 'Those photos could not be downloaded just now (' + [...new Set(why)].slice(0, 3).join(', ') + '). Try again or try other words.', code: 502 };
}

// 📰 the photo plan for a magazine-style report: the AI decides how many photos the report needs (none to 20) and what each shows,
//   from the organisation's industry and country and the chapters' titles; without AI (or if it fails) a plan is made from keywords.
const KW = [[/climate|carbon|emission|ghg|scope|net.?zero|decarbon/i, 'wind turbines renewable energy'], [/energy|electric|power|solar/i, 'solar panels'], [/water/i, 'water river'], [/waste|circular|recycl/i, 'recycling'],
  [/nature|biodivers|land|forest/i, 'forest canopy'], [/people|workforce|employee|talent|divers|inclusion|culture/i, 'team workers diverse'], [/safety|health/i, 'worker safety helmet'], [/community|social/i, 'community volunteers'],
  [/governance|board|ethic|risk|compliance/i, 'boardroom meeting'], [/supply|supplier|procure/i, 'supply chain logistics'], [/roadmap|target|plan|future|strategy/i, 'road through landscape'], [/ai|digital|data|technology/i, 'digital technology'],
  [/message|chair|ceo|leadership/i, 'business leader'], [/about|introduction|overview|organisation|company/i, 'modern office building']];
export function fallbackPlan(b) {
  const ind = str(b.industry, 60), chs = (Array.isArray(b.chapters) ? b.chapters : []).slice(0, 40);
  const picks = chs.map((c, i) => { const t = str(c.title, 120), k = KW.find(([re]) => re.test(t)); return { i, q: k ? k[1] : '', major: !!c.divider }; }).filter((x) => x.q && (x.major || x.i % 2 === 0)).slice(0, 14);
  return { cover: (ind ? ind + ' ' : '') + 'sustainability', chapters: picks.map((x) => ({ i: x.i, q: x.q })), source: 'keywords' };
}
export async function photoPlan(b) {
  const { llmJson, checkLimit, usage, llmSetup } = await import('./ai.mjs');
  const chs = (Array.isArray(b.chapters) ? b.chapters : []).slice(0, 40).map((c, i) => ({ i, title: str(c.title, 120), part: str(c.part, 60), opens_a_part: !!c.divider }));
  if (!chs.length) return { error: 'There are no chapters to plan photos for.', code: 400 };
  if (!llmSetup()) return fallbackPlan(b);
  try { await checkLimit(); } catch { return fallbackPlan(b); }
  const sys = 'You are the art director of a corporate sustainability report. Decide which pages get a photograph and what each photo shows. Return JSON: {"cover": "search words", "chapters": [{"i": chapter index, "q": "search words"}]}. ' +
    'Use as many photos as make the report look professional and varied: always one for each chapter that opens a part, and for other chapters only where a photo helps (a short or very technical chapter can go without). Between 3 and 20 photos in all, including the cover. ' +
    'Search words: 2 to 4 plain English words a free stock library will match (for example "container ship port", "cement plant", "solar farm desert", "construction workers safety"), fitted to the organisation\'s industry and country and to the chapter. Never people\'s names, brands or logos. No two photos with the same words.';
  try {
    const r = await llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ organisation: str(b.org, 120), industry: str(b.industry, 80), country: str(b.country, 60), report: str(b.title, 160), chapters: chs }) }], { maxTokens: 1200, temperature: 0.4 });
    await usage(true, r.used || 0).catch(() => {});
    const d = r.data || {}, seen = new Set(), L = (Array.isArray(d.chapters) ? d.chapters : []).map((x) => ({ i: Math.round(Number(x && x.i)), q: str(x && x.q, 60) })).filter((x) => x.q && x.i >= 0 && x.i < chs.length && !seen.has(x.q.toLowerCase()) && seen.add(x.q.toLowerCase())).slice(0, 19);
    if (!L.length && !d.cover) return fallbackPlan(b);
    return { cover: str(d.cover, 60) || fallbackPlan(b).cover, chapters: L, source: 'ai' };
  } catch { return fallbackPlan(b); }
}
