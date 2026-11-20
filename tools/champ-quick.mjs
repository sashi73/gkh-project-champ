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
import { pathToFileURL } from 'node:url';

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
  OWNER_EMAIL: 'owner@example.com', LLM_API_KEY: 'test-key', LLM_BASE_URL: `http://127.0.0.1:${llm.address().port}`, LLM_MODEL: 'deepseek-chat', LIMIT_ADMIN: '5000/10', CHAMP_I18N_LIMIT: '400' };
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
  const d0 = (n) => new Date(Date.now() + 11 * 3600000 + n * 864e5).toISOString().slice(0, 10), myN = me.j.name || 'Sashi Sivam', mw = myN.split(' '), mid = mw[0] + ' Kumar ' + mw[mw.length - 1].toUpperCase();
  const sv = await api('planSave', { core, plan: { name: 'Quick check', stakeholders: [{ name: 'The Boss', role: 'Sponsor', email: 'Owner@Example.com', raci: 'A' }, { name: 'Bob Builder', role: 'Site lead', phone: '+61 400 111 222', raci: 'R' }], charter: { manager: myN }, start: d0(-10), phases: [{ id: 'ph1', name: 'Work' }], tasks: [
    { id: 't1', phase: 'ph1', name: 'Design', dur: 2, pred: [], res: [myN], pct: 0, status: 'todo' },
    { id: 't4', phase: 'ph1', name: 'Sign off', dur: 1, pred: [], res: ['The Boss'], pct: 0, status: 'todo' },
    { id: 't5', phase: 'ph1', name: 'Board item', dur: 2, pred: [], res: ['Someone Else'], owner: myN, pct: 0, status: 'todo' },
    { id: 't2', phase: 'ph1', name: 'Build', dur: 20, pred: ['t1'], res: ['Someone Else'], pct: 0, status: 'todo', stickies: [{ id: 'n1', c: 'R', text: 'Blocked: @' + myN + ' please call', by: 'Bob Builder', at: Date.now(), done: false, due: d0(0) }] },
    // my name with a middle name, and my own note that @mentions me that way (as people write it in the register)
    { id: 't3', phase: 'ph1', name: 'Mobilise', dur: 3, pred: [], res: [mid], lead: mid, pct: 0, status: 'todo', stickies: [{ id: 'n2', c: 'R', text: '@' + mid + ' to look into this urgently', by: myN + ' (' + myN.split(' ')[0] + ')', at: Date.now(), done: false, due: d0(1) },
      { id: 'n3', c: 'G', text: 'My own reminder, no mention', by: myN, at: Date.now(), done: false },
      { id: 'n4', c: 'G', text: '#Blocker supplier has not confirmed @' + myN + ' #waiting', by: 'Bob Builder', at: Date.now(), done: false, due: d0(2), linked: 'risk:r1' },
      { id: 'n5', c: 'R', text: '@' + myN + ' review the contract #decision', by: 'Bob Builder', at: Date.now(), done: false, due: d0(21) }] }] } });
  ok('Projects', 'a plan is saved', sv.status === 200 && sv.j.plan && sv.j.plan.rev >= 1, JSON.stringify(sv.j).slice(0, 160));
  const pg = await api('planGet', { core });
  ok('Projects', 'the plan reads back, with the sticky note', pg.status === 200 && pg.j.plan && pg.j.plan.tasks.length === 5 && pg.j.plan.tasks.find((t) => t.id === 't2').stickies.length === 1);
  const pl = await api('planList');
  ok('Projects', 'the project list', pl.status === 200, String(pl.status));
  const td = await api('planMyDayGet');
  ok('Today', 'Today: my overdue task and the note for me', td.status === 200 && (td.j.todo || []).some((x) => x.core === core && x.t === 't1' && x.rag === 'red') && (td.j.attention || []).some((x) => x.nid === 'n1'), JSON.stringify(td.j.counts || td.j));
  ok('Today', 'Today knows me by a name with a middle name: the task I lead, and my own note that @mentions me (not my own note without one)', (td.j.todo || []).some((x) => x.core === core && x.t === 't3') && (td.j.attention || []).some((x) => x.nid === 'n2') && !(td.j.attention || []).some((x) => x.nid === 'n3'), JSON.stringify({ todo: (td.j.todo || []).filter((x) => x.core === core).map((x) => x.t), att: (td.j.attention || []).map((x) => x.nid) }));
  ok('Today', 'the super user is known by OWNER_EMAIL: a stakeholder with that email (under another name) is me', (td.j.todo || []).some((x) => x.core === core && x.t === 't4'), JSON.stringify((td.j.todo || []).filter((x) => x.core === core).map((x) => x.t)));
  const n1 = (td.j.attention || []).find((x) => x.nid === 'n1'), n2 = (td.j.attention || []).find((x) => x.nid === 'n2'), cc = td.j.counts || {};
  ok('Today', 'notes count too: a note due today is "today" (it flashes), one due tomorrow is "tomorrow", both in "due today or tomorrow"; no WIP count', n1 && n1.when === 'today' && n2 && n2.when === 'tomorrow' && cc.dueToday >= 1 && cc.dueSoon >= 2 && !('wip' in cc), JSON.stringify({ n1: n1 && n1.when, n2: n2 && n2.when, cc }));
  ok('Today', 'a task where I am the board owner (Kanban / Scrum) is mine too', (td.j.todo || []).some((x) => x.core === core && x.t === 't5'));
  const n4 = (td.j.attention || []).find((x) => x.nid === 'n4'), pn4 = pg.j.plan.tasks.find((t) => t.id === 't3').stickies.find((x) => x.id === 'n4');
  ok('Today', '#tags: a #blocker note (any case) comes first with its tags, the blockers count is the #blocker notes, the tag counts are given, and a copied-to-register link is kept', n4 && (td.j.attention || [])[0].nid === 'n4' && n4.tags.join() === 'blocker,waiting' && n4.rag === 'red' && n4.urgency === 'Blocker' && cc.blockers === 1 && cc.tags.blocker === 1 && cc.tags.waiting === 1 && cc.now >= 1 && pn4 && pn4.linked === 'risk:r1', JSON.stringify({ first: (td.j.attention || [])[0] && td.j.attention[0].nid, n4: n4 && n4.tags, cc, linked: pn4 && pn4.linked }));
  ok('Today', 'the work week only: a note due in three weeks is not listed but counted as later, and the week end is given', !(td.j.attention || []).some((x) => x.nid === 'n5') && td.j.laterNotes >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(td.j.weekEnd || '') && !(td.j.todo || []).some((x) => x.due > td.j.weekEnd && x.when !== 'overdue'), JSON.stringify({ laterNotes: td.j.laterNotes, weekEnd: td.j.weekEnd, later: td.j.later }));
  { const a1 = (td.j.attention || []).find((x) => x.nid === 'n1'), a2 = (td.j.attention || []).find((x) => x.nid === 'n2'), t1 = (td.j.todo || []).find((x) => x.core === core && x.t === 't1');
    ok('Today', '📞 a note raised by someone else carries their number from the stakeholders; my own note and a task I manage have none', a1 && a1.call && a1.call.tel === '+61400111222' && a2 && !a2.call && t1 && !t1.call, JSON.stringify([a1 && a1.call, a2 && a2.call, t1 && t1.call]));
    const sm = await api('planMyDaySeen', { core, t: 't2', nid: 'n1', via: 'phone' }), td2 = await api('planMyDayGet'), b1 = (td2.j.attention || []).find((x) => x.nid === 'n1'), sg = await api('planSeenGet', { core });
    ok('Today', '👁 marked as viewed on the phone: Today shows it viewed, and the project knows who viewed it on a phone', sm.status === 200 && b1 && b1.viewed > 0 && Object.values((sg.j.seen || {})['n:t2:n1'] || {}).some((v) => v.via === 'phone'), JSON.stringify([sm.j, b1 && b1.viewed, sg.j])); }
  const dn = await api('planMyDayDone', { core, t: 't1' });
  ok('Today', 'Today: ✓ done', dn.status === 200 && dn.j.ok, JSON.stringify(dn.j));
  const ga = await api('guideAsk', { q: 'How do I make a task bold?', tours: [] });
  ok('Champ', 'Ask Champ answers', ga.status === 200 && typeof ga.j.answer === 'string', JSON.stringify(ga.j).slice(0, 160));
  const ppl = await api('pplMe');
  ok('People', 'My profile', ppl.status === 200, String(ppl.status));

  // 4. 📍 Location: the weekend and public holidays of a place, and the schedule that follows them
  const ked = await api('planHolidaysGet', { cc: 'MY', st: '02', place: 'Alor Setar, Kedah, Malaysia', from: 2026, to: 2027 });
  ok('Calendar', 'Kedah: weekend Friday–Saturday and its 2026–27 public holidays', ked.status === 200 && ked.j.wk.join() === '5,6' && ked.j.hols.length >= 30 && ked.j.hols.some((h) => h.d === '2026-02-17'), JSON.stringify({ wk: ked.j.wk, n: (ked.j.hols || []).length }));
  const ir = await api('planHolidaysGet', { cc: 'IR', st: '', from: 2026, to: 2026 }), sa = await api('planHolidaysGet', { cc: 'SA', st: '', from: 2026, to: 2026 }), kl = await api('planHolidaysGet', { cc: 'MY', st: '14', from: 2026, to: 2026 });
  ok('Calendar', 'weekends by place: Tehran Thu–Fri, Jeddah Fri–Sat, Kuala Lumpur Sat–Sun', ir.j.wkName === 'Thu–Fri' && sa.j.wkName === 'Fri–Sat' && kl.j.wkName === 'Sat–Sun', [ir.j.wkName, sa.j.wkName, kl.j.wkName].join(' '));
  const pk = await api('planPlacesGet', { q: 'Ked' });
  ok('Calendar', 'place search: "Ked" finds Kedah, Malaysia (weekend Fri–Sat)', pk.status === 200 && (pk.j.places || []).some((x) => /Kedah, Malaysia/.test(x.place) && x.wkName === 'Fri–Sat'), JSON.stringify(pk.j.places || pk.j).slice(0, 200));
  const PL = await import(pathToFileURL(path.join(SITE, 'netlify/lib/plan.mjs')).href);
  const kp = { cal: { cc: 'MY', st: '02', wk: [5, 6], hols: [{ d: '2026-11-24', n: 'Test holiday' }, { d: '2026-11-25', n: 'Worked', work: true }] } }, A = PL.allDays(kp);
  // Thursday 19 Nov 2026 + 3 working days in Kedah: Sun 22, Mon 23, (Tue 24 holiday) Wed 25 → Wed 25
  ok('Calendar', 'the schedule follows the place: Kedah skips Fri–Sat and its holiday, works a holiday marked as worked; a plan without a location is Mon–Fri as before',
    PL.addWork('2026-11-19', 3, A) === '2026-11-25' && PL.addWork('2026-11-19', 3, false) === '2026-11-24' && PL.allDays({}) === false && PL.allDays({ weekends: true }) === true && PL.isWork('2026-11-25', A) && !PL.isWork('2026-11-24', A) && !PL.isWork('2026-11-20', A) && PL.isWork('2026-11-22', A),
    [PL.addWork('2026-11-19', 3, A), PL.addWork('2026-11-19', 3, false)].join(' '));
  const A2 = PL.allDays(Object.assign({ holidaysOk: true }, kp));
  ok('Calendar', '"Public holidays allowed": a holiday is a work day again, the weekend still off', PL.isWork('2026-11-24', A2) && !PL.isWork('2026-11-20', A2) && PL.addWork('2026-11-19', 3, A2) === '2026-11-24', PL.addWork('2026-11-19', 3, A2));
  const sv2 = await api('planSave', { core, plan: Object.assign(pg.j.plan, { cal: { place: 'Alor Setar, Kedah, Malaysia', cc: 'MY', st: '02', wk: [5, 6], hols: [{ d: '2026-12-01', n: 'Test' }], y0: 2026, y1: 2027 } }), rev: (await api('planGet', { core })).j.plan.rev });
  const back = (await api('planGet', { core })).j.plan.cal;
  ok('Calendar', 'the location is kept with the plan', sv2.status === 200 && back && back.place === 'Alor Setar, Kedah, Malaysia' && back.wk.join() === '5,6' && back.hols.length === 1, JSON.stringify(back).slice(0, 160));

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
