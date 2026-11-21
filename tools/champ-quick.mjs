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
  const sys = ((j.messages || []).find((m) => m.role === 'system') || {}).content || '';
  const ans = /briefing the CEO/.test(sys) ? { headline: 'Steady the portfolio.', faring: 'Quick check faring.', concerns: [{ title: 'Harbour bridge overspend', detail: 'Over budget.' }], positives: [{ title: 'Clinic fit-out under budget', detail: 'By $93k.' }], strategy: [{ title: 'Focus', detail: 'Back the winners.' }], focus: [{ title: 'Bill the done milestone', detail: 'Raise it.' }], cash_view: 'Cash dips then recovers.', conclusion: 'Steady and bill on time.', plan: [{ when: 'Next 2 weeks', what: 'Stabilise.' }], say: 'Quick check briefing.' }
    : /talking with the CEO on the CEO view/.test(sys) ? (/who is/i.test(JSON.stringify(j.messages.slice(-1))) ? '__FACT__' : { answer: 'Focus on the few programs that earn.', options: [{ option: 'Focus', upside: 'Margin', downside: 'Less growth' }], decision: 'Focus, as Drucker would.', measures: ['Margin by program'], say: 'Focus.' })
    : { tour: '', how: false, answer: 'Quick check answer.', help: '' };
  const pd = /projects_detail/.test(JSON.stringify(j.messages || [])) && /plan_items/.test(JSON.stringify(j.messages || [])) && /customer\\?":\\?"Northside Health/.test(JSON.stringify(j.messages || [])) && /project_manager/.test(JSON.stringify(j.messages || []));
  const followUp = /Our conversation so far/.test(JSON.stringify(j.messages || [])) && /which of those/i.test(JSON.stringify(j.messages || []));
  const content = followUp ? 'Of those, Thu Duc Logistics Hub and Penang Medical Centre Extension are doing worst.' : ans === '__FACT__' ? 'Here is the answer: ' + JSON.stringify({ answer: pd ? 'The customer is Northside Health.' : 'I do not have that.', options: [], decision: '', measures: [], say: 'Northside Health.' }) + ' Hope that helps.' : json ? JSON.stringify(ans) : 'Quick check answer.';
  s.end(JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 50 } })); }); }).listen(0);
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
  { const r = await fetch(`${BASE}/.netlify/functions/admin?action=ics&start=20261123T220000Z&title=${encodeURIComponent('⏰ Task: Design, review; sign')}&desc=Quick%20check&link=${encodeURIComponent('/admin/#plan/' + core + '/schedule')}`, { headers: { cookie } }), tx = await r.text();
    const r2 = await fetch(`${BASE}/.netlify/functions/admin?action=ics&start=20261123T220000Z`);
    ok('Today', '⏰ Remind me: a calendar file with the time, an alert, the escaped title and a link back (signed in only)', r.status === 200 && /text\/calendar/.test(r.headers.get('content-type')) && tx.includes('DTSTART:20261123T220000Z') && tx.includes('BEGIN:VALARM') && tx.includes('Design\\, review\\; sign') && tx.includes('#plan/') && r2.status === 401, r.status + ' ' + tx.slice(0, 300)); }
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
  // ---------- 👔 the CEO view ----------
  { const qd = await api('docCreate', { type: 'quote', core, fields: { items: [{ desc: 'Works', qty: 1, price: 50000, gst: true }] } });
    await api('docStatus', { id: qd.j.doc.id, status: 'accepted' });
    const iv = await api('docCreate', { type: 'invoice', core, fields: { items: [{ desc: 'Stage 1', qty: 1, price: 20000, gst: true }] } });
    await api('docStatus', { id: iv.j.doc.id, status: 'sent' }); await api('payAdd', { id: iv.j.doc.id, amount: 11000 });
    const cv = await api('planCeoGet', {}), r = cv.j.rows && cv.j.rows.find((x) => x.core === core);
    ok('CEO', 'the CEO view: every project with health, and the money: contract from the accepted quote, invoiced, received and still owed (before tax), profit = contract − forecast cost',
      cv.status === 200 && r && ['red', 'amber', 'green', 'grey'].includes(r.health) && r.contract === 50000 && r.invoiced === 20000 && r.received === 10000 && r.owed === 10000 && r.profit === Math.round((50000 - r.eac) * 100) / 100 && cv.j.all.n >= 1 && cv.j.flow.length === 13 && Array.isArray(cv.j.byProgram),
      JSON.stringify(r && [r.health, r.contract, r.invoiced, r.received, r.owed, r.profit, r.eac]) + ' ' + cv.status);
    const c1 = await api('userCreate', { user: { email: 'ceo1@example.com', name: 'Chief One', password: 'Ceopass2026x', role: 'CEO' } });
    const c2 = await api('userCreate', { user: { email: 'ceo2@example.com', name: 'Chief Two', password: 'Ceopass2026x', role: 'CEO' } });
    ok('CEO', 'a company has one CEO: a second one is refused, naming the first', c1.status === 200 && c1.j.user.role === 'CEO' && c2.status === 400 && /Chief One is already the CEO/.test(c2.j.error || ''), c1.status + ' ' + c2.status + ' ' + (c2.j.error || ''));
    const keep = cookie; cookie = '';
    const lc = await api('login', { username: 'ceo1@example.com', password: 'Ceopass2026x' }), me = await api('me'), cg = await api('planCeoGet', {}), sv = await api('planSave', { core, plan: { name: 'x', tasks: [] } }), pp = await api('pplList');
    cookie = keep;
    ok('CEO', 'the CEO signs in: sees the CEO view, cannot change a plan, and sees people\'s names and roles only (no phone, email or rates)', lc.status === 200 && me.j.role === 'CEO' && cg.status === 200 && sv.status === 403 && pp.status === 200 && (pp.j.people || []).every((x) => !('phone' in x) && !('email' in x) && !('rate' in x)), [lc.status, me.j.role, cg.status, sv.status, pp.status, JSON.stringify((pp.j.people || [])[0])].join(' '));
  }
    // ---------- 💵 milestone billing, Finance and the CFO ----------
  { const np = await api('planNewProject', { name: 'Billing test', client: 'Northside Health', program: 'Digital health' }), bc = np.j.core;
    await api('planSave', { core: bc, plan: { name: 'Billing test', start: '2026-10-01', phases: [{ id: 'ph1', name: 'Work' }], tasks: [
      { id: 'k1', phase: 'ph1', name: 'Design', dur: 5, pred: [], res: [], pct: 100, status: 'done' }, { id: 'm1', phase: 'ph1', name: 'Design signed off', dur: 0, pred: ['k1'], res: [], pct: 100, status: 'done' },
      { id: 'k2', phase: 'ph1', name: 'Build', dur: 10, pred: ['m1'], res: [], pct: 0, status: 'todo' }, { id: 'm2', phase: 'ph1', name: 'Handover', dur: 0, pred: ['k2'], res: [], pct: 0, status: 'todo' }] } });
    const over = await api('acctBillSave', { core: bc, contract: 100000, ms: { m1: 70, m2: 60 } }), sv = await api('acctBillSave', { core: bc, contract: 100000, ms: { m1: 40, m2: 60 } });
    const f1 = await api('acctFinanceGet', {}), rd = (f1.j.ready || []).find((r) => r.core === bc);
    const r1 = await api('acctBillRaise', { core: bc, tid: 'm1' }), r2 = await api('acctBillRaise', { core: bc, tid: 'm1' }), r3 = await api('acctBillRaise', { core: bc, tid: 'm2' });
    await api('payAdd', { id: r1.j.id, amount: 22000 });
    const f2 = await api('acctFinanceGet', {}), iv = (f2.j.invoices || []).find((i) => i.id === r1.j.id), pr = (f2.j.projects || []).find((x) => x.core === bc), cv = await api('planCeoGet', {}), cr = cv.j.rows.find((x) => x.core === bc);
    ok('Finance', '💵 milestone billing: shares over 100% refused; a done milestone is ready to invoice; raising it bills its share once (not twice, not before it is done); a payment shows as received and owed; the CEO view picks it up',
      over.status === 400 && sv.status === 200 && rd && rd.tid === 'm1' && rd.amount === 40000 && r1.status === 200 && r2.status === 400 && r3.status === 400 && iv && iv.inc === 44000 && iv.paid === 22000 && iv.balance === 22000 && !(f2.j.ready || []).some((r) => r.core === bc) && pr && pr.invoiced === 40000 && pr.received === 20000 && cr && cr.contract === 100000 && cr.invoiced === 40000,
      JSON.stringify([over.status, sv.status, rd, r1.status, r2.status, r3.status, iv, pr, cr && [cr.contract, cr.invoiced]]));
    const ne = await api('planNewProject', { name: 'Estimate test', client: 'Northside Health', program: 'Digital health' }), ec = ne.j.core;
    await api('planSave', { core: ec, plan: { name: 'Estimate test', start: '2026-10-01', phases: [{ id: 'ph1', name: 'Work' }], tasks: [
      { id: 'k1', phase: 'ph1', name: 'Design', dur: 5, pred: [], res: [], qty: 10, rate: 1000, pct: 100, status: 'done' }, { id: 'm1', phase: 'ph1', name: 'Design signed off', dur: 0, pred: ['k1'], res: [], pct: 100, status: 'done' },
      { id: 'k2', phase: 'ph1', name: 'Build', dur: 10, pred: ['m1'], res: [], qty: 10, rate: 1000, pct: 0, status: 'todo' }, { id: 'm2', phase: 'ph1', name: 'Handover', dur: 0, pred: ['k2'], res: [], pct: 0, status: 'todo' }] } });
    const eg = await api('acctBillGet', { core: ec }), EB = eg.j.bill || {}, em1 = (EB.milestones || []).find((m) => m.tid === 'm1') || {}, eRaise = await api('acctBillRaise', { core: ec, tid: 'm1' });
    const ef = await api('acctFinanceGet', {}), ep = (ef.j.projects || []).find((x) => x.core === ec) || {};
    await api('acctBillSave', { core: ec, contract: EB.contract, ms: { m1: 50, m2: 50 } }); const eRaise2 = await api('acctBillRaise', { core: ec, tid: 'm1' });
    ok('Finance', '📐 no contract yet: estimated from Costing and split evenly across milestones, shown as "done, not billed"; it cannot be invoiced until the CFO saves (confirms) it',
      EB.contractFrom === 'estimate' && EB.contract > 0 && em1.pct === 50 && em1.ready && em1.confirm && eRaise.status === 400 && ep.stand && ep.stand.status.tone === 'red' && ep.stand.workPct === 50 && ep.stand.unbilled > 0 && ef.j.totals.estimatedN >= 1 && eRaise2.status === 200,
      JSON.stringify([EB.contractFrom, EB.contract, em1, eRaise.status, ep.stand, ef.j.totals && ef.j.totals.estimatedN, eRaise2.status, eRaise2.j.error]));
    const lock = await api('acctBillSave', { core: ec, contract: 1, ms: { m1: 50, m2: 50 } }), vo0 = await api('acctVoRaise', { core: ec, amount: 0, title: 'x' }), vo = await api('acctVoRaise', { core: ec, amount: 1500.5, title: 'Extra guests', reason: 'Client asked for 10 more' });
    const vb = (await api('acctBillGet', { core: ec })).j, vpl = (await api('planGet', { core: ec })).j, vn = JSON.stringify(vpl).includes('Variation order VO-001'), vw = (vb.bill.vos || [])[0] || {};
    const dec = await api('acctVoDecide', { core: ec, id: vw.id, outcome: 'Approved', note: 'agreed' }), dec2 = await api('acctVoDecide', { core: ec, id: vw.id, outcome: 'Approved' }), va = (await api('acctBillGet', { core: ec })).j.bill;
    const inv1 = ((await api('acctFinanceGet', {})).j.invoices || []).find((i) => i.id === eRaise2.j.id) || {};
    ok('Finance', '📝 variation orders: the contract value is locked once confirmed; a VO goes to the PM and program director (a note in Today, the Change control register) and adds to the contract only when approved; milestone amounts carry GST',
      lock.status === 200 && vb.bill.contract === EB.contract && vo0.status === 400 && vo.status === 200 && vo.j.voNum === 'VO-001' && vw.status === 'Proposed' && vb.bill.money.variationsWaiting === 1500.5 && vn && dec.status === 200 && dec2.status === 400 && va.contract === Math.round((EB.contract + 1500.5) * 100) / 100 && va.money.variations === 1500.5 && em1.gst === Math.round(em1.amount * 10) / 100 && inv1.inc === Math.round(em1.amount * 110) / 100 && vb.bill.money.profit1 != null && Math.abs(va.milestones.reduce((x, m) => x + m.amount, 0) - va.contract) < 0.02 && va.milestones[0].amount === EB.contract / 2,
      JSON.stringify([va.milestones.map((m) => m.amount), lock.status, vb.bill.contract, EB.contract, vo0.status, vo.status, vo.j, vw, vn, dec.status, dec2.status, va.contract, em1.gst, em1.amount, inv1.inc]));
    const c1 = await api('userCreate', { user: { email: 'cfo1@example.com', name: 'Money One', password: 'Cfopass2026x', role: 'CFO' } }), c2 = await api('userCreate', { user: { email: 'cfo2@example.com', name: 'Money Two', password: 'Cfopass2026x', role: 'CFO' } });
    const keep = cookie; cookie = '';
    const lc = await api('login', { username: 'cfo1@example.com', password: 'Cfopass2026x' }), fg = await api('acctFinanceGet', {}), ps = await api('planSave', { core: bc, plan: { name: 'x', tasks: [] } });
    cookie = keep;
    ok('Finance', 'one CFO per company; the CFO sees Finance and cannot change a plan', c1.status === 200 && c2.status === 400 && /Money One is already the CFO/.test(c2.j.error || '') && lc.status === 200 && fg.status === 200 && ps.status === 403, [c1.status, c2.status, c2.j.error, lc.status, fg.status, ps.status].join(' '));
  }
    // ---------- 🎙 Champ's CEO briefing, 💧 the cash crystal ball, 🧭 the strategy adviser ----------
  { const bg = async (body) => { const id = 'qc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); body.id = id;
      await fetch(`${BASE}/.netlify/functions/planai-background`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', cookie }, body: JSON.stringify(body) });
      for (let i = 0; i < 40; i++) { const r = await api('planAiStatus', { id }); if (r.j.status === 'done' || r.j.status === 'error') return r.j; await sleep(250); } return {}; };
    const cv = await api('planCeoGet', {}), C = cv.j.cash;
    ok('CEO', '💧 the cash crystal ball: 19 months (6 back, 12 ahead) and the quarters, money in and cost out, the running position, a health word, the low point and where it ends',
      C && C.months.length === 19 && C.quarters.length >= 6 && ['red', 'amber', 'green'].includes(C.health) && C.low && C.end && C.months.every((m) => typeof m.in === 'number' && typeof m.out === 'number') && C.months[18].position === C.end.position, JSON.stringify(C && { h: C.health, low: C.low, end: C.end, q: C.quarters.length }));
    const b = await bg({ mode: 'ceoBrief' }), cv2 = await api('planCeoGet', {});
    ok('CEO', '🎙 Champ\'s briefing: how we are faring, concerns and positives, the recommended strategy, focus, cash flow going forward and a conclusion, with a fixed verdict and a script to read out; kept for the CEO view',
      b.status === 'done' && b.brief && ['turnaround', 'steady', 'keep'].includes(b.brief.verdict) && b.brief.faring && b.brief.concerns.length && b.brief.positives.length && b.brief.strategy.length && b.brief.focus.length && b.brief.cash_view && b.brief.conclusion && b.brief.say && /strategy/i.test(b.brief.strategy_name) && cv2.j.brief && cv2.j.brief.at === b.brief.at, JSON.stringify(b).slice(0, 300));
    const pdf = await api('planCeoBriefPdfGet', {}), pb = pdf.j.file ? Buffer.from(pdf.j.file, 'base64') : Buffer.alloc(0);
    ok('CEO', '📄 the briefing downloads as a PDF note (one page for a normal briefing)', pdf.status === 200 && pb.slice(0, 5).toString() === '%PDF-' && pdf.j.pages === 1 && /\.pdf$/.test(pdf.j.name), JSON.stringify([pdf.status, pdf.j.pages, pdf.j.name, pdf.j.error]));
    const a = await bg({ mode: 'ceoAsk', q: 'Where should we focus next quarter?', history: [] });
    const fq = await bg({ mode: 'ceoAsk', q: 'Who is the customer for billing test?', history: [] });
    ok('CEO', '🧭 a project question on the CEO view gets a straight answer from the project facts (customer, project manager...), even with words around the AI\'s JSON', fq.status === 'done' && fq.answer && /Northside Health/.test(fq.answer.answer), JSON.stringify(fq).slice(0, 300));
    const fu = await bg({ mode: 'ceoAsk', q: 'Which of those are doing worst?', history: [{ q: 'Overview of Lotus Asia Pacific?', a: 'Three projects: Thu Duc, Penang, Parramatta.' }] });
    ok('CEO', '🧭 a follow-up question ("which of those") works, even when the AI answers in plain words instead of JSON', fu.status === 'done' && fu.answer && /Thu Duc/.test(fu.answer.answer), JSON.stringify(fu).slice(0, 300));
    ok('CEO', '🧭 Ask Champ on the CEO view: a strategy decision report (answer, options, decision, measures)', a.status === 'done' && a.answer && a.answer.answer && a.answer.decision && a.answer.options.length, JSON.stringify(a).slice(0, 300)); }
    // ---------- 🔒 the Finance vault ----------
  { const as = async (u, pw, fn) => { const keep = cookie; cookie = ''; await api('login', { username: u, password: pw }); try { return await fn(); } finally { cookie = keep; } };
    for (const [e, n, r] of [['pm1@example.com', 'Pat Manager', 'Project manager'], ['dir1@example.com', 'Dana Director', 'Project director'], ['dir2@example.com', 'Dev Director', 'Project director']]) await api('userCreate', { user: { email: e, name: n, password: 'Vaultpass2026x', role: r } });
    const ul = await api('userList'), id1 = (ul.j.users || []).find((u) => u.username === 'dir1@example.com').id;
    const pl = await api('planProgramList', {}), dh = (pl.j.programs || []).find((g) => g.name === 'Digital health'), bcard = (pl.j.cards || []).find((c) => c.name === 'Billing test'), vc = bcard.core;
    const sv = await api('planProgramSave', { id: dh.id, name: dh.name, director: id1, manager: dh.manager || '', sponsor: dh.sponsor || '', status: dh.status || 'active' });
    const b64 = (t) => Buffer.from(t).toString('base64'), secret = 'Contract sum $250,000 plus GST. Pay to BSB 062-000 Account no 12345678. Contact pat@client.com or 0412 345 678. Scope: build the clinic.';
    const cfoAdd = await as('cfo1@example.com', 'Cfopass2026x', () => api('vaultAdd', { core: vc, folder: 'billing', name: 'billing-schedule.txt', type: 'text/plain', size: 40, file: b64('Billing schedule $100,000'), text: 'Billing schedule $100,000' }));
    const pmBill = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultAdd', { core: vc, folder: 'billing', name: 'x.txt', file: b64('x'), text: 'x' }));
    const pmAdd = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultAdd', { core: vc, folder: 'contracts', name: 'contract.txt', type: 'text/plain', size: secret.length, file: b64(secret), text: secret }));
    const pmList = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultList', { core: vc })), pmFin = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctFinanceGet', {}));
    const d1 = await as('dir1@example.com', 'Vaultpass2026x', () => api('vaultList', { core: vc })), d2 = await as('dir2@example.com', 'Vaultpass2026x', () => api('vaultList', { core: vc }));
    const ceo = await as('ceo1@example.com', 'Ceopass2026x', () => api('vaultList', { core: vc })), own = await api('vaultList', { core: vc });
    ok('Vault', '🔒 who opens it: the super user, the CEO, the CFO and the named program director; not another director, not a project manager (who also loses Finance)',
      sv.status === 200 && own.status === 200 && ceo.status === 200 && d1.status === 200 && d2.status === 403 && pmList.status === 403 && pmFin.status === 403 && (own.j.files || []).some((f) => f.folder === 'billing') && (own.j.files || []).some((f) => f.champ === 'invoice'),
      [sv.status, own.status, ceo.status, d1.status, d2.status, pmList.status, pmFin.status].join(' '));
    const ig = await api('intelGet', { core: vc }), cp = (ig.j.docs || []).find((d) => pmAdd.j.copy && d.id === pmAdd.j.copy.id);
    const V = await import(pathToFileURL(path.join(SITE, 'netlify/lib/vault.mjs')).href), R = V.redact(secret);
    ok('Vault', '🖍 filing: the CFO files anywhere; a project manager only into Contracts and Documents, and the team gets a redacted copy (amounts, bank, email and phone blacked out, the scope kept)',
      cfoAdd.status === 200 && pmBill.status === 403 && pmAdd.status === 200 && cp && /^REDACTED /.test(cp.name) && (cp.tags || []).includes('redacted') && !/250,000|12345678|pat@client|0412 345 678|062-000/.test(R.text) && /build the clinic/.test(R.text),
      [cfoAdd.status, pmBill.status, pmAdd.status, cp && cp.name, R.text].join(' | '));
    const up = await api('intelUpload', { core: vc, name: 'old-contract.txt', type: 'text/plain', text: 'Old contract worth $90,000 for the fit-out.', file: b64('Old contract worth $90,000 for the fit-out.'), folder: 'contracts', kind: 'Contract' });
    const mv = await api('vaultMoveIn', {}), ig2 = await api('intelGet', { core: vc }), od = (ig2.j.docs || []).find((d) => d.id === up.j.doc.id), own2 = await api('vaultList', { core: vc });
    const sr = await api('vaultSearch', { q: 'Old contract' }), sr2 = await api('vaultSearch', { q: 'fit-out', folder: 'contracts' }), sr3 = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultSearch', { q: 'contract' }));
    ok('Vault', '🔎 the library: searching finds a document by name and by the words inside, with a snippet; folder filters work; a project manager finds nothing to open but can file',
      sr.status === 200 && (sr.j.rows || []).some((r) => r.name === 'old-contract.txt') && (sr2.j.rows || []).some((r) => r.name === 'old-contract.txt' && /fit-out/.test(r.snippet || '')) && (sr2.j.rows || []).every((r) => r.folder === 'contracts') && sr3.status === 200 && !(sr3.j.rows || []).length && (sr3.j.fileable || []).length > 0,
      JSON.stringify([sr.status, (sr.j.rows || []).map((r) => r.name), (sr2.j.rows || []).map((r) => r.snippet), sr3.j.rows && sr3.j.rows.length, (sr3.j.fileable || []).length]).slice(0, 400));
    ok('Vault', '📦 contracts already in the project folders move into the vault; the project keeps a redacted copy', mv.status === 200 && mv.j.moved >= 1 && od && /^REDACTED /.test(od.name) && (own2.j.files || []).some((f) => f.name === 'old-contract.txt'), JSON.stringify([mv.j, od && od.name])); }
    // ---------- 💵 billing: the money panel, how close milestones are, and who sees which project's billing ----------
  { const as = async (u, pw, fn) => { const keep = cookie; cookie = ''; await api('login', { username: u, password: pw }); try { return await fn(); } finally { cookie = keep; } };
    const np = await api('planNewProject', { name: 'Garden party', client: 'Pat Family', program: 'Events', manager: 'Pat Manager' }), gc = np.j.core;
    const d0 = new Date(), ymd = (n) => new Date(d0.getTime() + n * 864e5).toISOString().slice(0, 10);
    await api('planSave', { core: gc, plan: { name: 'Garden party', start: ymd(-5), charter: { manager: 'Pat Manager' }, budgetCfg: { cont: 10, res: 5, margin: 20, gst: 10 }, phases: [{ id: 'ph1', name: 'Work' }], tasks: [
      { id: 'k1', phase: 'ph1', name: 'Book venue', dur: 6, pred: [], res: [], qty: 1, rate: 1000, unit: 'lot', pct: 50, status: 'doing' }, { id: 'm1', phase: 'ph1', name: 'Venue booked', dur: 0, pred: ['k1'], res: [], pct: 0, status: 'todo' },
      { id: 'k2', phase: 'ph1', name: 'Party', dur: 12, pred: ['m1'], res: [], qty: 1, rate: 2000, unit: 'lot', pct: 0, status: 'todo' }, { id: 'm2', phase: 'ph1', name: 'Party done', dur: 0, pred: ['k2'], res: [], pct: 0, status: 'todo' }] } });
    await api('acctBillSave', { core: gc, contract: 5000, ms: { m1: 50, m2: 50 } });
    const bg = await api('acctBillGet', { core: gc }), B = bg.j.bill, m1 = B && B.milestones.find((m) => m.tid === 'm1'), m2 = B && B.milestones.find((m) => m.tid === 'm2');
    ok('Billing', '💰 one money panel: contract, GST, budget = cost + contingency + reserve, forecast cost, margin and profit; a short event scales the due windows (red within its own short window, later ones green or amber)',
      bg.status === 200 && B.money.contract === 5000 && B.money.gst === 500 && B.money.base === 3000 && B.money.budget === 3450 && B.money.margin === 1550 && B.money.profit != null && B.windows.red < 7 && m1 && m1.alert && m2 && ['green', 'amber', 'red'].includes(m2.alert),
      JSON.stringify([bg.status, B && B.money, B && B.windows, m1 && [m1.due, m1.days, m1.alert], m2 && [m2.due, m2.days, m2.alert]]).slice(0, 500));
    const pmB = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctBillGet', { core: gc })), pmF = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctFinanceGet', {})), pmA = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctBillAlerts', {}));
    const d2B = await as('dir2@example.com', 'Vaultpass2026x', () => api('acctBillGet', { core: gc })), pmSave = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctBillSave', { core: gc, contract: 1, ms: {} }));
    ok('Billing', '🔐 the project\'s own manager sees its billing and Finance (only their projects) and the red count, but cannot change it; another director cannot see it',
      pmB.status === 200 && pmF.status === 200 && (pmF.j.projects || []).every((p) => p.core === gc) && pmA.status === 200 && pmA.j.projects === 1 && d2B.status === 403 && pmSave.status === 403,
      [pmB.status, pmF.status, JSON.stringify((pmF.j.projects || []).map((p) => p.name)), JSON.stringify(pmA.j), d2B.status, pmSave.status].join(' '));
  }
    // ---------- 🏁 deliverables: final / interim, Draft / Final, versions with notes, and a log of uploads and downloads ----------
  { const b64 = (t) => Buffer.from(t).toString('base64'), tx = 'Selangor transport masterplan. Chapter 1 vision and objectives for the corridor plan.';
    const u1 = await api('intelUpload', { core, name: 'Selangor Masterplan.txt', type: 'text/plain', text: tx, file: b64(tx) });
    const u2 = await api('intelUpload', { core, name: 'Selangor Masterplan v2.txt', type: 'text/plain', text: tx + ' Revised.', file: b64(tx + ' Revised.'), replaces: u1.j.doc.id, vnote: 'Client comments from the workshop', dtype: 'final' });
    const st = await api('intelDmsUpdate', { core, id: u2.j.doc.id, set: { status: 'Final' } }), dl = await api('intelDocFile', { core, id: u2.j.doc.id });
    const L = await api('intelDmsList', { core }), cur = (L.j.docs || []).find((d) => d.id === u2.j.doc.id), h = await api('intelDmsHistoryGet', { core, id: u2.j.doc.id });
    ok('Docs', '🏁 a masterplan files itself under Deliverables; a new version keeps who uploaded it and what changed, is a final deliverable marked Final; downloads and uploads are logged',
      u1.status === 200 && u1.j.doc.folder === 'deliverables' && cur && cur.folder === 'deliverables' && cur.dtype === 'final' && cur.status === 'Final' && cur.version === 2 && st.status === 200 && dl.status === 200 &&
      h.status === 200 && h.j.versions.length === 2 && h.j.versions[0].note === 'Client comments from the workshop' && h.j.versions[0].by && h.j.log.some((e) => e.act === 'download' && e.version === 2) && h.j.log.filter((e) => e.act === 'upload').length === 2 && (L.j.folders || []).some((f) => f.key === 'deliverables'),
      JSON.stringify([u1.j.doc && u1.j.doc.folder, cur && [cur.folder, cur.dtype, cur.status, cur.version], h.j]).slice(0, 500)); }
  { const as = async (u, pw, fn) => { const keep = cookie; cookie = ''; await api('login', { username: u, password: pw }); try { return await fn(); } finally { cookie = keep; } };
    const a = await api('planNewProject', { name: 'Archive test', client: 'Acme', program: 'Digital health' }), ac = a.j.core;
    await api('planSave', { core: ac, plan: { name: 'Archive test', start: '2026-10-01', phases: [{ id: 'ph1', name: 'Work' }], tasks: [{ id: 'k1', phase: 'ph1', name: 'Design', dur: 5, pred: [], res: [], qty: 2, rate: 500, pct: 40, status: 'doing' }] } });
    const ar0 = await api('planProjectArchive', { core: ac, sig: 'Sashi', reason: '' }), pmA = await as('pm1@example.com', 'Vaultpass2026x', () => api('planProjectArchive', { core: ac, sig: 'Pat', reason: 'Not needed any more' }));
    const sa = await api('userCreate', { user: { email: 'site1@example.com', name: 'Sam Site', password: 'Sitepass2026x', role: 'Site administrator' } });
    const ceoA = await as('ceo1@example.com', 'Ceopass2026x', () => api('planProjectArchive', { core: ac, by: 'Chief One', sig: 'Chief One', reason: 'Cancelled by the client' }));
    const inList = async () => ((await api('planList', { today: '2026-11-21' })).j.plans || []).some((x) => x.core === ac);
    const gone = !(await inList()), arl = await as('site1@example.com', 'Sitepass2026x', () => api('planArchiveList', {})), hit = (arl.j.list || []).find((x) => x.core === ac) || {}, pmL = await as('pm1@example.com', 'Vaultpass2026x', () => api('planArchiveList', {}));
    const back0 = await api('planProjectRestore', { core: ac, sig: 'x', reason: '' }); const back = await as('site1@example.com', 'Sitepass2026x', () => api('planProjectRestore', { core: ac, by: 'Sam Site', reason: 'Client restarted the work', sig: 'Sam Site' })), again = await inList();
    const fresh = await api('planNewProject', { name: 'Fresh delete', client: 'Acme', program: 'Digital health' }), pmDel = await as('pm1@example.com', 'Vaultpass2026x', () => api('planProjectDelete', { core: fresh.j.core }));
    const vd = await api('planNewProject', { name: 'Vault delete', client: 'Acme', program: 'Digital health' }), vdc = vd.j.core;
    await api('planSave', { core: vdc, plan: { name: 'Vault delete', start: '2026-10-01', phases: [{ id: 'ph1', name: 'Work' }], tasks: [{ id: 'k1', phase: 'ph1', name: 'Design', dur: 5, pred: [], res: [], qty: 1, rate: 100, pct: 0, status: 'todo' }] } });
    await api('planProjectArchive', { core: vdc, by: 'Sashi', sig: 'Sashi', reason: 'Duplicate project' });
    const vdCeo = await as('ceo1@example.com', 'Ceopass2026x', () => api('planProjectDelete', { core: vdc })), vdOwn = await api('planProjectDelete', { core: vdc }), vdReg = ((await api('planArchiveList', {})).j.register || []).some((e) => e.core === vdc && e.what === 'Deleted for good');
    ok('Projects', '🗄 a project in the Archived projects vault can only be deleted by the super user, and the delete stays in the audit register', vdCeo.status === 403 && vdOwn.status === 200 && vdReg, JSON.stringify([vdCeo.status, vdOwn.status, vdOwn.j.error, vdReg]));
    ok('Projects', '🗄 archive: needs a reason and a signature; only the super user, CEO or site administrator; leaves every list, is kept in the Project archive and comes back whole; a planned project in its first week can still be deleted',
      ar0.status === 400 && pmA.status === 403 && sa.status === 200 && ceoA.status === 200 && gone && arl.status === 200 && hit.archived && hit.archived.reason === 'Cancelled by the client' && hit.planned && pmL.status === 403 && back0.status === 400 && back.status === 200 && again && pmDel.status === 200 && ((await api('planArchiveList', {})).j.register || []).filter((e) => e.core === ac).map((e) => e.what).sort().join() === 'Archived,Brought back',
      JSON.stringify([ar0.status, pmA.status, sa.status, sa.j.error, ceoA.status, ceoA.j.error, gone, arl.status, hit, pmL.status, back.status, again, pmDel.status, pmDel.j.error]));
  }
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
