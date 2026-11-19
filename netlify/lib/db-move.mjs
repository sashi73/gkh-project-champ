// GKH Project Champ: move the data between Netlify Blobs and Postgres (README-POSTGRES.txt).
// Used by the owner-only background job (netlify/functions/db-move-background.mjs, no tokens needed on Netlify)
// and by tools/pg-move.mjs on a computer. "check", "copy" and "compare" only READ Blobs: Blobs is never changed by them,
// so it stays a full copy of the data from the moment of the move.
//   check         what is in Blobs: stores, records, files, sizes, biggest keys
//   copy          every record into Postgres (overwrites what is there)
//   only-missing  only keys Postgres doesn't have yet (records made in the minutes before the switch)
//   compare       every record in Blobs against Postgres: missing or different
//   back          going back with the newest data: Postgres records (and file bytes kept in Postgres) into Blobs
import { q, setupDatabase } from './storage.mjs';

// records were saved with setJSON, files (photos, receipts, PDFs, resumes) with set + metadata
const FILE_PREFIX = /^(photo|receipt|crpdf|pdocfile|ppl-cv):/;
export function classify(key, buf, metadata) {
  if (FILE_PREFIX.test(key)) return { file: true };
  if (metadata && Object.keys(metadata).length) return { file: true };
  try { return { file: false, json: JSON.parse(Buffer.from(buf).toString('utf8')) }; } catch { return { file: true }; }
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

// blobs(name) -> a Blobs store, listStores() -> { stores }, filesIntoDb: also copy file bytes (only off Netlify)
export async function run(mode, { blobs, listStores, filesIntoDb = false, log = () => {} }) {
  const rep = { mode, started: Date.now(), stores: [], problems: [], records: 0, files: 0, recordBytes: 0, fileBytes: 0, biggest: [] };
  const names = mode === 'back' ? null : ((await listStores()).stores || []).filter((s) => !s.startsWith('deploy:'));
  if (mode !== 'check') await setupDatabase();

  async function readAll(name) {
    const st = await blobs(name), out = [];
    // the move's own report (mbs-admin / db-move) is not data: it is left where it is
    const list = (await st.list()).blobs.filter((b) => !(name === 'mbs-admin' && b.key === 'db-move'));
    await pool(list, 12, async (b) => {
      const r = await st.getWithMetadata(b.key, { type: 'arrayBuffer' });
      if (r) out.push({ key: b.key, buf: Buffer.from(r.data), metadata: r.metadata || {} });
    });
    return out.sort((a, b) => (a.key < b.key ? -1 : 1));
  }

  if (mode === 'back') {
    const stores = (await q('SELECT DISTINCT store FROM champ_kv UNION SELECT DISTINCT store FROM champ_files')).map((r) => r.store);
    for (const name of stores) {
      const st = await blobs(name);
      const rows = await q('SELECT key, val FROM champ_kv WHERE store = $1', [name]);
      await pool(rows, 12, async (r) => { await st.setJSON(r.key, r.val); });
      const files = await q('SELECT key, data, meta FROM champ_files WHERE store = $1 AND data IS NOT NULL', [name]);
      await pool(files, 6, async (f) => { await st.set(f.key, new Blob([f.data]), { metadata: f.meta || {} }); });
      rep.stores.push({ store: name, records: rows.length, files: files.length }); rep.records += rows.length; rep.files += files.length;
      log(`${name}: ${rows.length} records${files.length ? `, ${files.length} files` : ''} back in Blobs`);
    }
    rep.finished = Date.now(); rep.ok = true;
    return rep;
  }

  for (const name of names) {
    const all = await readAll(name);
    const recs = [], files = [];
    let rb = 0, fb = 0;
    for (const x of all) {
      const c = classify(x.key, x.buf, x.metadata);
      if (c.file) { files.push(x); fb += x.buf.length; } else { recs.push({ key: x.key, val: JSON.stringify(c.json) }); rb += x.buf.length; }
      rep.biggest.push({ store: name, key: x.key, bytes: x.buf.length, file: c.file });
    }
    const s = { store: name, records: recs.length, files: files.length, recordBytes: rb, fileBytes: fb };
    rep.records += recs.length; rep.files += files.length; rep.recordBytes += rb; rep.fileBytes += fb;

    if (mode === 'copy' || mode === 'only-missing') {
      const conflict = (t, cols) => (mode === 'only-missing' ? 'DO NOTHING' : `DO UPDATE SET ${cols}, ver = ${t}.ver + 1, updated_at = now()`);
      for (let i = 0; i < recs.length; i += 200) {
        const part = recs.slice(i, i + 200);
        await q(`INSERT INTO champ_kv (store, key, val) SELECT $1, k, v::json FROM unnest($2::text[], $3::text[]) AS t(k, v)
          ON CONFLICT (store, key) ${conflict('champ_kv', 'val = EXCLUDED.val')}`, [name, part.map((r) => r.key), part.map((r) => r.val)]);
      }
      for (const f of files) {
        await q(`INSERT INTO champ_files (store, key, data, meta) VALUES ($1, $2, $3, $4::json)
          ON CONFLICT (store, key) ${conflict('champ_files', 'data = EXCLUDED.data, meta = EXCLUDED.meta')}`, [name, f.key, filesIntoDb ? f.buf : null, JSON.stringify(f.metadata)]);
      }
    }
    if (mode === 'compare') {
      const m = new Map((await q('SELECT key, val FROM champ_kv WHERE store = $1', [name])).map((r) => [r.key, JSON.stringify(r.val)]));
      const fileRows = new Set((await q('SELECT key FROM champ_files WHERE store = $1', [name])).map((r) => r.key));
      for (const x of all) {
        const c = classify(x.key, x.buf, x.metadata);
        if (c.file) { if (!fileRows.has(x.key)) rep.problems.push(`missing file  ${name}  ${x.key}`); continue; }
        if (!m.has(x.key)) rep.problems.push(`missing       ${name}  ${x.key}`);
        else if (m.get(x.key) !== JSON.stringify(c.json)) rep.problems.push(`different     ${name}  ${x.key}`);
      }
    }
    rep.stores.push(s);
    log(`${name}: ${recs.length} records, ${files.length} files`);
  }
  if (mode === 'copy' || mode === 'only-missing') { await q('ANALYZE champ_kv'); await q('ANALYZE champ_files'); }
  rep.biggest = rep.biggest.sort((a, b) => b.bytes - a.bytes).slice(0, 15);
  rep.problems = rep.problems.slice(0, 200);
  rep.finished = Date.now(); rep.ok = !rep.problems.length;
  return rep;
}
