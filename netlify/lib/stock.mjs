// 🖼 Free stock photos for the report styles (ESG documents): one photo per call, found from the report's context.
//   Pexels when PEXELS_API_KEY is set (free licence, no credit needed); otherwise Openverse, keeping only CC0 and
//   public-domain photos (no credit needed either). The credit is still returned and shown, as a courtesy.
//   The server only ever downloads from the search results it fetched itself (never a URL sent by the browser).
const OV = () => process.env.OPENVERSE_BASE_URL || 'https://api.openverse.org';
const PX = () => process.env.PEXELS_BASE_URL || 'https://api.pexels.com';
const MAX = 2.2 * 1024 * 1024;
const str = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001F]/g, ' ').trim().slice(0, n);
const get = (url, opt = {}, ms = 9000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(url, { ...opt, signal: c.signal }).finally(() => clearTimeout(t)); };

async function search(q, tall) {
  const key = process.env.PEXELS_API_KEY;
  if (key) {
    try {
      const r = await get(PX() + '/v1/search?per_page=15&query=' + encodeURIComponent(q) + '&orientation=' + (tall ? 'portrait' : 'landscape'), { headers: { Authorization: key } });
      if (r.ok) { const j = await r.json(); const L = (j.photos || []).map((p) => ({ src: (p.src && (p.src.large2x || p.src.large)) || '', credit: 'Photo: ' + str(p.photographer, 60) + ' on Pexels', link: str(p.url, 300) })).filter((p) => p.src); if (L.length) return L; }
    } catch { /* falls back to Openverse */ }
  }
  const r = await get(OV() + '/v1/images/?license=cc0,pdm&mature=false&page_size=20&q=' + encodeURIComponent(q) + '&aspect_ratio=' + (tall ? 'tall' : 'wide'));
  if (!r.ok) throw new Error('The photo library did not answer (' + r.status + '). Try again in a minute.');
  const j = await r.json();
  return (j.results || []).filter((p) => p.url && (!p.width || p.width >= 900) && !/\.(gif|svg|tiff?)(\?|$)/i.test(p.url))
    .map((p) => ({ src: p.url, credit: (p.title ? '“' + str(p.title, 60) + '”' : 'Photo') + (p.creator ? ' by ' + str(p.creator, 50) : '') + ' (' + String(p.license || '').toUpperCase() + ', via Openverse)', link: str(p.foreign_landing_url, 300) }));
}

// body: { q: search words, i: which photo (0 = cover, 1 = part pages, 2 = bands), skip: how many to pass over (for "other photos") }
export async function photo(body) {
  const q = str(body.q, 80); if (q.length < 2) return { error: 'Type a few words to search for, for example "airline sky" or "palm oil plantation".', code: 400 };
  const i = Math.max(0, Math.min(2, Number(body.i) || 0)), skip = Math.max(0, Math.min(30, Number(body.skip) || 0));
  let L; try { L = await search(q, i < 2); } catch (e) { return { error: e.name === 'AbortError' ? 'The photo library took too long. Try again.' : e.message, code: 502 }; }
  if (!L.length) return { error: 'No free photos found for "' + q + '". Try other words.', code: 404 };
  // spread the three photos over the results, and try the next one when a download fails or is too big
  for (let k = 0; k < 5; k++) {
    const p = L[(skip + i * 3 + k) % L.length];
    try {
      const r = await get(p.src, {}, 10000), ty = (r.headers.get('content-type') || '').split(';')[0];
      if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(ty)) continue;
      const b = Buffer.from(await r.arrayBuffer()); if (b.length > MAX || b.length < 200) continue;
      return { url: 'data:' + ty + ';base64,' + b.toString('base64'), credit: p.credit, link: p.link };
    } catch { /* the next result */ }
  }
  return { error: 'Those photos could not be downloaded just now. Try again or try other words.', code: 502 };
}
