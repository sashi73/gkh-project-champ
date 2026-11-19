// Job tracker storage (store "mbs-jobs"): Netlify Blobs, or Postgres when CHAMP_DB = postgres (see storage.mjs).
// update() is safe when two changes arrive at the same moment: it retries instead of overwriting.
// A fresh store handle for every call: Netlify gives each request its own short-lived access token,
// so a handle kept from an earlier request fails with "Token expired" once the function stays warm.
import { getStore } from './storage.mjs';
function store() { return getStore({ name: 'mbs-jobs' }); }

export async function get(key) {
  const s = await store();
  return (await s.get(key, { type: 'json' })) ?? null;
}

export async function set(key, val) {
  const s = await store();
  await s.setJSON(key, val);
}

// update(key, fn, fallback): reads the value, fn(value) returns the new value, saved safely. Returns the new value.
export async function update(key, fn, fallback = null) {
  const s = await store();
  const start = () => (typeof fallback === 'function' ? fallback() : structuredClone(fallback));
  for (let i = 0; i < 30; i++) {
    const cur = await s.getWithMetadata(key, { type: 'json' });
    let etag = cur && cur.etag;
    if (cur && !etag) {   // some Blobs servers don't send the version tag with a read: get it from the listing
      const { blobs } = await s.list({ prefix: key });
      const b = blobs.find((x) => x.key === key);
      etag = b && b.etag;
    }
    const v = fn(cur && cur.data != null ? cur.data : start());
    const opts = !cur ? { onlyIfNew: true } : etag ? { onlyIfMatch: etag } : {};
    const r = await s.setJSON(key, v, opts);
    if (!r || r.modified !== false) return v;
    // someone else saved first: wait a little (longer each time, randomised so busy writers spread out), then read again
    await new Promise((res) => setTimeout(res, Math.min(1500, 25 * 2 ** Math.min(i, 6)) * (0.5 + Math.random())));
  }
  throw new Error('Could not save ' + key + ' (too many changes at once, please try again)');
}

// read many keys at once: one query on Postgres; on Blobs up to `limit` requests at a time instead of one after another
export async function getMany(keyList, limit = 16) {
  if (!keyList.length) return [];
  const s = await store();
  if (s.getMany) return s.getMany(keyList);
  const out = new Array(keyList.length);
  let next = 0;
  const worker = async () => { while (next < keyList.length) { const i = next++; out[i] = await get(keyList[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, keyList.length) }, worker));
  return out;
}

// every record whose key starts with prefix (one query on Postgres)
export async function values(prefix, limit = 16) {
  const s = await store();
  if (s.values) return s.values(prefix);
  return getMany(await keys(prefix), limit);
}

export async function del(key) {
  const s = await store();
  await s.delete(key);
}

export async function keys(prefix = '') {
  const s = await store();
  const { blobs } = await s.list({ prefix });
  return blobs.map((b) => b.key);
}

// files (photos): stored as bytes with a little metadata
export async function putFile(key, buf, metadata = {}) {
  const s = await store();
  await s.set(key, buf, { metadata });
}
export async function getFile(key) {
  const s = await store();
  const r = await s.getWithMetadata(key, { type: 'arrayBuffer' });
  return r ? { buf: Buffer.from(r.data), metadata: r.metadata || {} } : null;
}
