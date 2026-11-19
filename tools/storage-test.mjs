// GKH Project Champ: storage test. The Postgres store must behave exactly like the Blobs store the code was written for.
// Runs the same steps on Blobs (a local Blobs server) and on Postgres, and compares every answer. Also: many saves to one
// record at the same moment lose nothing, the move tool (tools/pg-move.mjs) copies everything and back, and timings.
// Needs a Postgres to test against:  CHAMP_TEST_DATABASE_URL=postgres://user@host:port/db node tools/storage-test.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BlobsServer } from '@netlify/blobs/server';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = process.env.CHAMP_TEST_DATABASE_URL;
if (!URL_) { console.log('SKIP  set CHAMP_TEST_DATABASE_URL to a Postgres you can wipe'); process.exit(0); }
const results = [], ok = (area, name, pass, detail = '') => { results.push({ pass: !!pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  [${area}] ${name}${!pass && detail ? '  ' + detail : ''}`); };

const dir = path.join(os.tmpdir(), 'champ-storage-test'); fs.rmSync(dir, { recursive: true, force: true });
const server = new BlobsServer({ directory: dir, token: 'tok', port: 0 }); const { port } = await server.start();
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ siteID: 'champ', token: 'tok', edgeURL: `http://localhost:${port}`, uncachedEdgeURL: `http://localhost:${port}`, apiURL: `http://localhost:${port}` })).toString('base64');
process.env.CHAMP_DATABASE_URL = URL_;
const S = await import('../netlify/lib/storage.mjs');
await S.setupDatabase();
await S.q('TRUNCATE champ_kv, champ_files');

// ---------- 1. the same steps on Blobs and on Postgres ----------
async function steps(st) {
  const r = [], t = (x) => r.push(JSON.parse(JSON.stringify(x ?? null)));
  t(await st.get('a', { type: 'json' }));                                   // missing
  t((await st.setJSON('a', { n: 1, z: 'last', b: [1, 2] })).modified !== false);
  t(await st.get('a', { type: 'json' }));                                   // key order kept
  const w = await st.getWithMetadata('a', { type: 'json' }); t(w.data);
  // the local Blobs test server leaves the version tag off reads (kv.mjs handles that the same way): take it from the listing
  if (!w.etag) w.etag = (await st.list({ prefix: 'a' })).blobs.find((b) => b.key === 'a').etag;
  t(!!w.etag);
  t((await st.setJSON('a', { n: 2 }, { onlyIfMatch: w.etag })).modified);   // right version: saved
  t((await st.setJSON('a', { n: 3 }, { onlyIfMatch: w.etag })).modified);   // old version: refused
  t(await st.get('a', { type: 'json' }));
  t((await st.setJSON('a', { n: 9 }, { onlyIfNew: true })).modified);       // exists: refused
  t((await st.setJSON('new', [1], { onlyIfNew: true })).modified);           // new: saved
  for (const k of ['plan:1', 'plan:2', 'plan:10', 'planx', 'job:1']) await st.setJSON(k, { k });
  t((await st.list({ prefix: 'plan:' })).blobs.map((b) => b.key).sort());
  t((await st.list()).blobs.map((b) => b.key).sort());
  t(await st.get('a', { type: 'text' }) !== null);
  await st.set('photo:1:a', Buffer.from([1, 2, 3, 250]), { metadata: { type: 'image/jpeg', by: 'x' } });
  const f = await st.getWithMetadata('photo:1:a', { type: 'arrayBuffer' }); t([...new Uint8Array(f.data)]); t(f.metadata);
  t([...new Uint8Array(await st.get('photo:1:a', { type: 'arrayBuffer' }))]);
  t((await st.list({ prefix: 'photo:' })).blobs.map((b) => b.key));
  await st.delete('photo:1:a'); t(await st.getWithMetadata('photo:1:a', { type: 'arrayBuffer' })); t((await st.list({ prefix: 'photo:' })).blobs.length);
  await st.delete('plan:2'); t(await st.get('plan:2', { type: 'json' })); await st.delete('never-there');
  t((await st.list({ prefix: 'plan:' })).blobs.map((b) => b.key).sort());
  await st.setJSON('nul', null); t(await st.get('nul', { type: 'json' }));
  await st.setJSON('uni', { name: 'தமிழ் ✓ Kinyarwanda 😀', q: "it's \"quoted\"" }); t(await st.get('uni', { type: 'json' }));
  return r;
}
const fromBlobs = await steps(await S.blobStore('t-blobs'));
process.env.CHAMP_FILES = 'postgres';   // as off Netlify: file bytes in Postgres
const fromPg = await steps(S.pgStore('t-pg'));
process.env.CHAMP_FILES = 'blobs';
const fromPgFilesInBlobs = await steps(S.pgStore('t-pg2'));
delete process.env.CHAMP_FILES;
for (let i = 0; i < fromBlobs.length; i++) {
  ok('Same answers', `step ${i + 1}: Postgres = Blobs`, JSON.stringify(fromPg[i]) === JSON.stringify(fromBlobs[i]), `blobs ${JSON.stringify(fromBlobs[i])} pg ${JSON.stringify(fromPg[i])}`);
  if (JSON.stringify(fromPgFilesInBlobs[i]) !== JSON.stringify(fromBlobs[i])) ok('Same answers', `step ${i + 1}: Postgres with files in Blobs = Blobs`, false, JSON.stringify(fromPgFilesInBlobs[i]));
}
ok('Same answers', 'Postgres with files in Blobs gives the same answers too', fromPgFilesInBlobs.every((x, i) => JSON.stringify(x) === JSON.stringify(fromBlobs[i])));
const inBlobs = await (await S.blobStore('t-pg2')).list();
ok('Files', 'with files in Blobs, the records are not in Blobs (only in Postgres)', !inBlobs.blobs.some((b) => b.key.startsWith('plan:')));
const st = S.pgStore('t-pg');
ok('Extras', 'getMany: one query, in the order asked, null for missing', JSON.stringify(await st.getMany(['plan:10', 'zzz', 'plan:1'])) === JSON.stringify([{ k: 'plan:10' }, null, { k: 'plan:1' }]));
ok('Extras', 'values(prefix): only that prefix, records only', JSON.stringify(await st.values('plan:')) === JSON.stringify([{ k: 'plan:1' }, { k: 'plan:10' }]));
// the local Blobs test server's prefix listing is loose ("pla" comes back for "plan:"); Postgres must be exact
await st.setJSON('pla', 1);
ok('Extras', 'a prefix listing is exact ("pla" is not under "plan:")', !(await st.list({ prefix: 'plan:' })).blobs.some((b) => b.key === 'pla'));
// with a few rows Postgres just reads the whole table, so fill it like a busy year of Champ and ask how it finds a prefix
await S.q("INSERT INTO champ_kv (store, key, val) SELECT 'big', 'k:' || g, '{}' FROM generate_series(1, 20000) g");
await S.q('ANALYZE champ_kv');
const planRows = await S.q("EXPLAIN SELECT key FROM champ_kv WHERE store = 'big' AND key >= 'k:19' AND key < 'k:19' || chr(1114111)");
await S.q("DELETE FROM champ_kv WHERE store = 'big'");
ok('Speed', 'a prefix listing is an index range (no full scan)', JSON.stringify(planRows).includes('Index'), JSON.stringify(planRows).slice(0, 300));

// ---------- 2. Champ's own code on Postgres: kv.mjs ----------
process.env.CHAMP_DB = 'postgres';
const kv = await import('../netlify/lib/kv.mjs');
await kv.set('count', { n: 0 });
await Promise.all(Array.from({ length: 40 }, () => kv.update('count', (c) => ({ n: c.n + 1 }), { n: 0 })));
ok('Saves at the same moment', '40 changes to one record at once: all 40 kept', (await kv.get('count')).n === 40, JSON.stringify(await kv.get('count')));
await Promise.all(Array.from({ length: 20 }, (_, i) => kv.update('fresh', (c) => ({ list: [...c.list, i] }), () => ({ list: [] }))));
ok('Saves at the same moment', '20 first saves of a new record at once: all 20 kept', (await kv.get('fresh')).list.length === 20);
for (let i = 0; i < 30; i++) await kv.set(`plan:P-${String(i).padStart(3, '0')}`, { core: i, rows: Array.from({ length: 60 }, (_, j) => ({ id: j, name: 'Task ' + j, pct: j % 100 })) });
ok('kv', 'kv.values gives every plan', (await kv.values('plan:')).length === 30);
ok('kv', 'kv.keys and kv.getMany agree with kv.values', JSON.stringify(await kv.getMany(await kv.keys('plan:'))) === JSON.stringify(await kv.values('plan:')));
await kv.putFile('pdocfile:P-1:d1', Buffer.from('%PDF-1.4 test'), { name: 'a.pdf', type: 'application/pdf' });
const gf = await kv.getFile('pdocfile:P-1:d1');
ok('kv', 'a PDF saved and read back (bytes and name)', gf && gf.buf.toString() === '%PDF-1.4 test' && gf.metadata.name === 'a.pdf');

// ---------- 3. timings: the same work on both ----------
async function time(label, fn, n = 1) { const t0 = performance.now(); for (let i = 0; i < n; i++) await fn(); return (performance.now() - t0) / n; }
process.env.CHAMP_DB = 'blobs';
for (let i = 0; i < 30; i++) await kv.set(`plan:P-${String(i).padStart(3, '0')}`, { core: i, rows: Array.from({ length: 60 }, (_, j) => ({ id: j, name: 'Task ' + j, pct: j % 100 })) });
const tb = { one: await time('', () => kv.get('plan:P-001'), 50), all: await time('', () => kv.values('plan:'), 10), upd: await time('', () => kv.update('plan:P-002', (p) => ({ ...p, touched: Date.now() })), 30) };
process.env.CHAMP_DB = 'postgres';
const tp = { one: await time('', () => kv.get('plan:P-001'), 50), all: await time('', () => kv.values('plan:'), 10), upd: await time('', () => kv.update('plan:P-002', (p) => ({ ...p, touched: Date.now() })), 30) };
console.log(`\nTimings on this machine (local Blobs server vs local Postgres; on Netlify every Blobs request also crosses the network):`);
console.log(`  read one plan       Blobs ${tb.one.toFixed(1)} ms   Postgres ${tp.one.toFixed(1)} ms`);
console.log(`  read all 30 plans   Blobs ${tb.all.toFixed(1)} ms (31 requests)   Postgres ${tp.all.toFixed(1)} ms (1 query)`);
console.log(`  save a change       Blobs ${tb.upd.toFixed(1)} ms   Postgres ${tp.upd.toFixed(1)} ms\n`);

// ---------- 4. the move tool: Blobs -> Postgres -> compare -> back ----------
process.env.CHAMP_DB = 'blobs';
const jobs = await S.blobStore('mbs-jobs');
await jobs.setJSON('index', { jobs: { b: 1, a: 2 } });
await jobs.set('receipt:9', Buffer.from('receipt bytes'), { metadata: { type: 'image/png' } });
await (await S.blobStore('mbs-admin')).setJSON('log', [{ at: 1, text: 'hello' }]);
await S.q('TRUNCATE champ_kv, champ_files');
await S.closeDatabase();
// async on purpose: the local Blobs server runs in this process and must keep answering while the tool works
const tool = (...a) => new Promise((res) => {
  const p = spawn('node', [path.join(ROOT, 'tools/pg-move.mjs'), ...a], { cwd: ROOT, env: { ...process.env, CHAMP_DB: '' } });
  let stdout = '', stderr = ''; p.stdout.on('data', (d) => (stdout += d)); p.stderr.on('data', (d) => (stderr += d));
  const t = setTimeout(() => p.kill(), 60000); p.on('close', (status) => { clearTimeout(t); res({ status, stdout, stderr }); });
});
const c1 = await tool('check'); ok('Move tool', 'check lists the stores and sizes', c1.status === 0 && /mbs-jobs/.test(c1.stdout) && /records/.test(c1.stdout), c1.stderr + c1.stdout);
const c2 = await tool('to-postgres'); ok('Move tool', 'to-postgres copies everything', c2.status === 0, c2.stderr + c2.stdout);
const c3 = await tool('compare'); ok('Move tool', 'compare: every key matches', c3.status === 0 && /All \d+ keys match/.test(c3.stdout), c3.stderr + c3.stdout);
ok('Move tool', 'a record keeps its key order in Postgres', JSON.stringify((await S.q("SELECT val FROM champ_kv WHERE store='mbs-jobs' AND key='index'"))[0].val) === '{"jobs":{"b":1,"a":2}}');
ok('Move tool', 'files stay in Blobs, Postgres keeps a row', (await S.q("SELECT data IS NULL AS n FROM champ_files WHERE key='receipt:9'"))[0]?.n === true);
process.env.CHAMP_DB = 'postgres';
process.env.CHAMP_FILES = 'blobs';   // as on Netlify: file bytes in Blobs
ok('Move tool', 'after the move Champ (Postgres mode) still opens the file kept in Blobs', (await kv.getFile('receipt:9'))?.buf.toString() === 'receipt bytes');
delete process.env.CHAMP_FILES;
await S.q(`UPDATE champ_kv SET val = '{"jobs":{"c":3}}' WHERE store='mbs-jobs' AND key='index'`);
await S.closeDatabase();
const c4 = await tool('to-blobs'); ok('Move tool', 'to-blobs copies the newest data back', c4.status === 0 && JSON.stringify(await jobs.get('index', { type: 'json' })) === '{"jobs":{"c":3}}', c4.stderr + c4.stdout);
await S.q(`DELETE FROM champ_kv WHERE store='mbs-jobs' AND key='index'`); await S.q(`UPDATE champ_kv SET val='[]' WHERE key='log'`);
await S.closeDatabase();
await tool('to-postgres', '--only-missing');
ok('Move tool', '--only-missing adds what is missing and leaves the rest', JSON.stringify((await S.q("SELECT val FROM champ_kv WHERE key='log'"))[0].val) === '[]' && (await S.q("SELECT 1 FROM champ_kv WHERE store='mbs-jobs' AND key='index'")).length === 1);

// ---------- 5. the move as it runs on Netlify: the owner-only background job ----------
process.env.CHAMP_DB = '';
await S.q('TRUNCATE champ_kv, champ_files');
const A = await import('../netlify/lib/admin-lib.mjs');
const { default: job } = await import('../netlify/functions/db-move-background.mjs');
await A.ensureSecret();
const call = (mode, cookie) => job(new Request('http://x/.netlify/functions/db-move-background', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ mode }) }));
const owner = 'mbs_admin=' + A.makeSession(A.ownerName()), staff = 'mbs_admin=' + A.makeSession('someone', Date.now(), { uid: 'u1' });
ok('Move on Netlify', 'refused without signing in', (await call('copy')).status === 403);
ok('Move on Netlify', 'refused for a user who is not the super user', (await call('copy', staff)).status === 403);
const rj = await call('copy', owner), rep = await (await S.blobStore(A.ADMIN)).get('db-move', { type: 'json' });
ok('Move on Netlify', 'the super user runs the copy: report saved, records in Postgres', rj.status === 202 && rep && rep.status === 'done' && rep.records > 0 && (await S.q("SELECT 1 FROM champ_kv WHERE store='mbs-jobs' AND key='index'")).length === 1, JSON.stringify(rep).slice(0, 300));
await call('compare', owner);
const rep2 = await (await S.blobStore(A.ADMIN)).get('db-move', { type: 'json' });
ok('Move on Netlify', 'compare after the copy: no problems', rep2 && rep2.status === 'done' && rep2.ok === true, JSON.stringify(rep2 && rep2.problems));

await S.closeDatabase(); await server.stop();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
