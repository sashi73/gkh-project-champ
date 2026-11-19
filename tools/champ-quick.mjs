// GKH Project Champ: the quick check (about a minute, no browser). Runs on every pull request.
// The full end-to-end suite (tools/champ-test.cjs, ~470 browser checks) runs every night at 12 am Sydney time, and on demand.
// What this checks: the server starts; every page and the files it loads are served; signing in; the main console actions
// (projects, plans, Today, help, Ask Champ) answer correctly; the website chat answers. A fake AI stands in for DeepSeek.
// Run: node tools/champ-quick.mjs .
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';

const SITE = path.resolve(process.argv[2] || '.'), PORT = 8913, BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [], ok = (area, name, pass, detail = '') => { results.push({ area, name, pass: !!pass, detail }); };
const require = createRequire(path.join(SITE, 'package.json'));

const { BlobsServer } = await import(require.resolve('@netlify/blobs/server'));
const dir = path.join(os.tmpdir(), 'champ-quick-blobs'); fs.rmSync(dir, { recursive: true, force: true });
const blobs = new BlobsServer({ directory: dir, token: 'tok', port: 0 }); const { port: bport } = await blobs.start();
const ctxB64 = Buffer.from(JSON.stringify({ siteID: 'champ', token: 'tok', edgeURL: `http://localhost:${bport}`, uncachedEdgeURL: `http://localhost:${bport}`, apiURL: `http://localhost:${bport}` })).toString('base64');
// a fake AI: always a short, valid answer
const llm = http.createServer((q, s) => { let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => {
  const j = JSON.parse(b || '{}'), json = j.response_format && j.response_format.type === 'json_object';
  s.setHeader('Content-Type', 'application/json');
  s.end(JSON.stringify({ choices: [{ message: { content: json ? JSON.stringify({ tour: '', how: false, answer: 'Quick check answer.', help: '' }) : 'Quick check answer.' } }], usage: { total_tokens: 50 } })); }); }).listen(0);
await sleep(50);
const env = { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', NETLIFY_BLOBS_CONTEXT: ctxB64, ADMIN_USERNAME: '', ADMIN_PASSWORD: '', ADMIN_SESSION_SECRET: '',
  LLM_API_KEY: 'test-key', LLM_BASE_URL: `http://127.0.0.1:${llm.address().port}`, LLM_MODEL: 'deepseek-chat', LIMIT_ADMIN: '5000/10', CHAMP_I18N_LIMIT: '400' };
const srv = spawn('node', ['local-server.mjs'], { cwd: SITE, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; srv.stdout.on('data', (d) => (log += d)); srv.stderr.on('data', (d) => (log += d));
for (let i = 0; i < 80 && !/running/i.test(log); i++) await sleep(150);

let cookie = '';
const get = (p) => fetch(BASE + p, { headers: cookie ? { cookie } : {} });
const api = async (action, data = {}) => { const r = await fetch(`${BASE}/.netlify/functions/admin`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ action, ...data }) });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; let j = {}; try { j = await r.json(); } catch {} return { status: r.status, j }; };

try {
  // 1. every page, and every local file it loads
  const pages = ['/', '/index.html', '/about.html', '/features.html', '/agile.html', '/industries.html', '/contact.html', '/help.html', '/login.html', '/privacy.html', '/promo.html', '/admin/'];
  const missing = [];
  for (const p of pages) {
    const r = await get(p), html = await r.text();
    ok('Pages', `${p} is served`, r.status === 200 && /<html/i.test(html), String(r.status));
    const refs = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css|json|webp|png|jpg|svg|m4a)(?:\?[^"]*)?)"/g)].map((m) => m[1]);
    for (const f of new Set(refs)) { const u = new URL(f, BASE + p).pathname; const rr = await get(u); if (rr.status !== 200) missing.push(p + ' → ' + u + ' ' + rr.status); }
  }
  ok('Pages', 'every file the pages load is there', !missing.length, missing.slice(0, 8).join(' | '));
  const h = await (await get('/assets/help/articles.js')).text();
  ok('Help', 'the help articles are served (80+ articles)', (h.match(/\{ id: '/g) || []).length >= 80);

  // 2. signing in, and the main console actions
  const bad = await api('login', { username: 'sashi73', password: 'wrong' });
  ok('Sign-in', 'a wrong password is refused', bad.status >= 400);
  const li = await api('login', { username: 'sashi73', password: 'sashi98' });
  ok('Sign-in', 'the owner signs in', li.status === 200 && !!cookie, String(li.status));
  const me = await api('me');
  ok('Sign-in', 'me: who is signed in, and the build', me.status === 200 && me.j.owner && me.j.build, JSON.stringify(me.j).slice(0, 120));
  const np = await api('planNewProject', { name: 'Quick check', client: 'Northside Health', program: 'Digital health' }), core = np.j.core;
  ok('Projects', 'a new project', np.status === 200 && !!core, JSON.stringify(np.j).slice(0, 160));
  const d0 = (n) => new Date(Date.now() + 11 * 3600000 + n * 864e5).toISOString().slice(0, 10), myN = me.j.name || 'Sashi Sivam';
  const sv = await api('planSave', { core, plan: { name: 'Quick check', start: d0(-10), phases: [{ id: 'ph1', name: 'Work' }], tasks: [
    { id: 't1', phase: 'ph1', name: 'Design', dur: 2, pred: [], res: [myN], pct: 0, status: 'todo' },
    { id: 't2', phase: 'ph1', name: 'Build', dur: 20, pred: ['t1'], res: ['Someone Else'], pct: 0, status: 'todo', stickies: [{ id: 'n1', c: 'R', text: 'Blocked: @' + myN + ' please call', by: 'Bob Builder', at: Date.now(), done: false }] }] } });
  ok('Projects', 'a plan is saved', sv.status === 200 && sv.j.plan && sv.j.plan.rev >= 1, JSON.stringify(sv.j).slice(0, 160));
  const pg = await api('planGet', { core });
  ok('Projects', 'the plan reads back, with the sticky note', pg.status === 200 && pg.j.plan && pg.j.plan.tasks.length === 2 && pg.j.plan.tasks[1].stickies.length === 1);
  const pl = await api('planList');
  ok('Projects', 'the project list', pl.status === 200, String(pl.status));
  const td = await api('planMyDayGet');
  ok('Today', 'Today: my overdue task and the note for me', td.status === 200 && (td.j.todo || []).some((x) => x.core === core && x.t === 't1' && x.rag === 'red') && (td.j.attention || []).some((x) => x.nid === 'n1'), JSON.stringify(td.j.counts || td.j));
  const dn = await api('planMyDayDone', { core, t: 't1' });
  ok('Today', 'Today: ✓ done', dn.status === 200 && dn.j.ok, JSON.stringify(dn.j));
  const ga = await api('guideAsk', { q: 'How do I make a task bold?', tours: [] });
  ok('Champ', 'Ask Champ answers', ga.status === 200 && typeof ga.j.answer === 'string', JSON.stringify(ga.j).slice(0, 160));
  const ppl = await api('pplMe');
  ok('People', 'My profile', ppl.status === 200, String(ppl.status));

  // 3. the website chat
  const ch = await fetch(`${BASE}/.netlify/functions/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'How do I add a sticky note?' }], lang: 'en', where: 'site' }) });
  ok('Chat', 'the website chat answers', ch.status === 200, String(ch.status));
} catch (e) {
  ok('Run', 'the quick check ran to the end', false, e.stack || String(e));
} finally {
  srv.kill(); llm.close(); await blobs.stop().catch(() => {});
}
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  [${r.area}] ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) { console.log('\nServer log (end):\n' + log.slice(-2000)); process.exit(1); }
process.exit(0);
