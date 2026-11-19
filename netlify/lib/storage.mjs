// GKH Project Champ: where the data lives. One switch, CHAMP_DB (a Netlify environment variable):
//   not set, or "blobs" -> Netlify Blobs, exactly as before.
//   "postgres"          -> records (everything saved as JSON) in Postgres, table champ_kv.
//                          Files (photos, receipts, PDFs, resumes) stay in Netlify Blobs on Netlify, which is what Blobs is
//                          made for; only a small row per file is kept in Postgres (table champ_files) so listing and
//                          deleting never have to ask Blobs. Off Netlify the file bytes go into champ_files too, so Champ can
//                          run on any Postgres (a Malaysian cloud, a laptop) with no Netlify at all.
// Which database: CHAMP_DATABASE_URL if set (any Postgres: Neon, Supabase ...), otherwise the site's own Netlify Database.
// Going back: remove CHAMP_DB (or set it to "blobs") and redeploy. Blobs is never changed by the move (see tools/pg-move.mjs).
//
// getStore({ name }) gives an object with the same methods the code already calls on a Blobs store
// (get, getWithMetadata, setJSON, set, delete, list), so the rest of Champ does not change. Extras that make pages load faster:
//   getMany(keys)     one query for many records (Blobs needs one request each)
//   values(prefix)    every record whose key starts with prefix, in one query (Blobs: a listing, then one request each)
import { env } from './shared.mjs';

export const usingPostgres = () => env('CHAMP_DB').trim().toLowerCase() === 'postgres';
const ownDatabase = () => env('CHAMP_DATABASE_URL').trim();
// where file bytes go in Postgres mode: Blobs wherever Blobs is there (Netlify), the database elsewhere
// (CHAMP_FILES = blobs | postgres decides it outright)
const filesInBlobs = () => { const f = env('CHAMP_FILES').trim().toLowerCase(); return f ? f === 'blobs' : !!(globalThis.Netlify || env('NETLIFY_BLOBS_CONTEXT')); };

// ---------- Netlify Blobs (a fresh handle for every call: each Netlify request has its own short-lived Blobs token) ----------
let blobsLib = null;
export async function blobStore(name) {
  if (!blobsLib) blobsLib = import('@netlify/blobs').catch((e) => { blobsLib = null; throw e; });
  const { getStore } = await blobsLib;
  return getStore({ name, consistency: 'strong' });
}

export async function getStore({ name }) {
  return usingPostgres() ? pgStore(name) : blobStore(name);
}

// ---------- the Postgres connection: made once per warm function and reused (the main speed win over a fresh connect) ----------
let dbP = null;
function db() {
  if (!dbP) dbP = connect().catch((e) => { dbP = null; throw e; });
  return dbP;
}
async function connect() {
  const url = ownDatabase();
  if (url) {
    const { default: pg } = await import('pg');
    // TLS comes from the connection string (Neon and Supabase add sslmode=require; the driver then checks the certificate in full)
    const pool = new pg.Pool({ connectionString: url, max: Number(env('CHAMP_DB_POOL')) || 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    pool.on('error', (e) => console.error('Postgres connection dropped:', e.message));
    return { run: async (text, params) => (await pool.query(text, params)).rows, end: () => pool.end() };
  }
  // Netlify Database: inside Netlify Functions every single query goes over HTTP (no connection to open), elsewhere a normal pool
  const { getDatabase } = await import('@netlify/database');
  const d = getDatabase();
  if (d.httpClient) return { run: (text, params) => d.httpClient.query(text, params), end: async () => {} };
  return { run: async (text, params) => (await d.pool.query(text, params)).rows, end: () => d.pool.end() };
}

// The tables are made the first time they are missing (no extra query on every cold start).
export const SCHEMA = [
  // Records. key COLLATE "C": plain byte order, so "every key starting with plan:" is a fast index range.
  // json (not jsonb): kept exactly as saved, key order included (lists keep their order), and no conversion when read.
  // fillfactor 85: room on each page so the frequent rewrites of busy records (index, log, plans) stay quick (HOT updates).
  `CREATE TABLE IF NOT EXISTS champ_kv (
     store text COLLATE "C" NOT NULL,
     key text COLLATE "C" NOT NULL,
     val json NOT NULL,
     ver bigint NOT NULL DEFAULT 1,
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (store, key)
   ) WITH (fillfactor = 85, autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05)`,
  // Files: bytes here only off Netlify (data is NULL when the file is in Blobs). STORAGE EXTERNAL: PDFs and photos are
  // already compressed, so Postgres doesn't waste time trying again.
  `CREATE TABLE IF NOT EXISTS champ_files (
     store text COLLATE "C" NOT NULL,
     key text COLLATE "C" NOT NULL,
     data bytea,
     meta json NOT NULL DEFAULT '{}',
     ver bigint NOT NULL DEFAULT 1,
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (store, key)
   )`,
  `ALTER TABLE champ_files ALTER COLUMN data SET STORAGE EXTERNAL`,
  // lz4 squeezes and unpacks big records (plans, AI drafts, document text) faster than the default (Postgres 14+; skipped if not there)
  `DO $$ BEGIN ALTER TABLE champ_kv ALTER COLUMN val SET COMPRESSION lz4; EXCEPTION WHEN OTHERS THEN NULL; END $$`,
];
let schemaP = null;
async function ensureSchema(conn) {
  if (!schemaP) schemaP = (async () => { for (const s of SCHEMA) await conn.run(s, []); })().catch((e) => { schemaP = null; throw e; });
  return schemaP;
}
export async function q(text, params = []) {
  const conn = await db();
  try { return await conn.run(text, params); } catch (e) {
    if (e && e.code === '42P01') { await ensureSchema(conn); return conn.run(text, params); }   // table missing: make it, try again
    throw e;
  }
}
export async function setupDatabase() { await ensureSchema(await db()); }
export async function closeDatabase() { if (dbP) { const c = await dbP.catch(() => null); dbP = null; schemaP = null; if (c) await c.end(); } }

// ---------- a Blobs-shaped store backed by Postgres ----------
// prefix range: every key that starts with p is >= p and < p + U+10FFFF (the highest character)
const TOP = String.fromCodePoint(0x10ffff);
const toBuf = (data) => (Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : Buffer.from(String(data)));
const toArrayBuffer = (b) => { const u = Buffer.isBuffer(b) ? b : Buffer.from(b); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };
const isFileType = (type) => type === 'arrayBuffer' || type === 'blob' || type === 'stream';
const asJson = (v) => { const s = JSON.stringify(v); return s === undefined ? 'null' : s; };

export function pgStore(name) {
  async function fileRow(key) {
    const rows = await q('SELECT data, meta, ver FROM champ_files WHERE store = $1 AND key = $2', [name, key]);
    return rows[0] || null;
  }
  async function readFile(key) {
    if (filesInBlobs()) {
      const r = await (await blobStore(name)).getWithMetadata(key, { type: 'arrayBuffer' });
      return r ? { data: r.data, metadata: r.metadata || {}, etag: r.etag } : null;
    }
    const row = await fileRow(key);
    return row && row.data ? { data: toArrayBuffer(row.data), metadata: row.meta || {}, etag: String(row.ver) } : null;
  }
  const shape = (f, type) => (type === 'blob' ? new Blob([f.data]) : f.data);

  return {
    name,
    async get(key, opts = {}) {
      if (isFileType(opts.type)) { const f = await readFile(key); return f ? shape(f, opts.type) : null; }
      const rows = await q('SELECT val FROM champ_kv WHERE store = $1 AND key = $2', [name, key]);
      if (!rows.length) return null;
      return opts.type === 'json' ? rows[0].val : asJson(rows[0].val);
    },
    async getWithMetadata(key, opts = {}) {
      if (isFileType(opts.type)) { const f = await readFile(key); return f ? { data: shape(f, opts.type), etag: f.etag, metadata: f.metadata } : null; }
      const rows = await q('SELECT val, ver FROM champ_kv WHERE store = $1 AND key = $2', [name, key]);
      if (!rows.length) return null;
      return { data: opts.type === 'json' ? rows[0].val : asJson(rows[0].val), etag: String(rows[0].ver), metadata: {} };
    },
    // onlyIfNew / onlyIfMatch work as in Blobs: { modified: false } when someone else saved first
    async setJSON(key, value, opts = {}) {
      const v = asJson(value);
      let rows;
      if (opts.onlyIfNew) rows = await q('INSERT INTO champ_kv (store, key, val) VALUES ($1, $2, $3::json) ON CONFLICT (store, key) DO NOTHING RETURNING ver', [name, key, v]);
      else if (opts.onlyIfMatch) rows = await q('UPDATE champ_kv SET val = $3::json, ver = ver + 1, updated_at = now() WHERE store = $1 AND key = $2 AND ver = $4::bigint RETURNING ver', [name, key, v, /^\d+$/.test(String(opts.onlyIfMatch)) ? String(opts.onlyIfMatch) : '-1']);
      else rows = await q(`INSERT INTO champ_kv (store, key, val) VALUES ($1, $2, $3::json)
        ON CONFLICT (store, key) DO UPDATE SET val = EXCLUDED.val, ver = champ_kv.ver + 1, updated_at = now() RETURNING ver`, [name, key, v]);
      return rows.length ? { modified: true, etag: String(rows[0].ver) } : { modified: false };
    },
    // set() is only used for files (photos, PDFs, resumes, receipts)
    async set(key, data, opts = {}) {
      const meta = asJson(opts.metadata || {}), buf = toBuf(data);
      if (filesInBlobs()) {
        const r = await (await blobStore(name)).set(key, buf, opts);
        if (r && r.modified === false) return r;
        await q(`INSERT INTO champ_files (store, key, data, meta) VALUES ($1, $2, NULL, $3::json)
          ON CONFLICT (store, key) DO UPDATE SET data = NULL, meta = EXCLUDED.meta, ver = champ_files.ver + 1, updated_at = now()`, [name, key, meta]);
        return r || { modified: true };
      }
      const rows = opts.onlyIfNew
        ? await q('INSERT INTO champ_files (store, key, data, meta) VALUES ($1, $2, $3, $4::json) ON CONFLICT (store, key) DO NOTHING RETURNING ver', [name, key, buf, meta])
        : await q(`INSERT INTO champ_files (store, key, data, meta) VALUES ($1, $2, $3, $4::json)
          ON CONFLICT (store, key) DO UPDATE SET data = EXCLUDED.data, meta = EXCLUDED.meta, ver = champ_files.ver + 1, updated_at = now() RETURNING ver`, [name, key, buf, meta]);
      return rows.length ? { modified: true, etag: String(rows[0].ver) } : { modified: false };
    },
    async delete(key) {
      const gone = await q('DELETE FROM champ_kv WHERE store = $1 AND key = $2 RETURNING 1', [name, key]);
      if (gone.length) return;
      const f = await q('DELETE FROM champ_files WHERE store = $1 AND key = $2 RETURNING data IS NULL AS in_blobs', [name, key]);
      if (f.length && f[0].in_blobs) await (await blobStore(name)).delete(key);
    },
    // records and files together, like a Blobs listing (one query, files included, even when their bytes are in Blobs)
    async list(opts = {}) {
      const p = String(opts.prefix || '');
      const rows = p
        ? await q(`SELECT key, ver FROM champ_kv WHERE store = $1 AND key >= $2 AND key < $2 || $3
                   UNION ALL SELECT key, ver FROM champ_files WHERE store = $1 AND key >= $2 AND key < $2 || $3 ORDER BY key`, [name, p, TOP])
        : await q('SELECT key, ver FROM champ_kv WHERE store = $1 UNION ALL SELECT key, ver FROM champ_files WHERE store = $1 ORDER BY key', [name]);
      return { blobs: rows.map((r) => ({ key: r.key, etag: String(r.ver) })), directories: [] };
    },
    async getMany(keys) {
      if (!keys.length) return [];
      const rows = await q('SELECT key, val FROM champ_kv WHERE store = $1 AND key = ANY($2::text[])', [name, keys]);
      const m = new Map(rows.map((r) => [r.key, r.val]));
      return keys.map((k) => (m.has(k) ? m.get(k) : null));
    },
    async values(prefix) {
      const rows = await q('SELECT val FROM champ_kv WHERE store = $1 AND key >= $2 AND key < $2 || $3 ORDER BY key', [name, String(prefix || ''), TOP]);
      return rows.map((r) => r.val);
    },
  };
}
