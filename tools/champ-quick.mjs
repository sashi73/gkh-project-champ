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
const LLMSEEN = {};
const llm = http.createServer((q, s) => { let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => {
  const j = JSON.parse(b || '{}'), json = j.response_format && j.response_format.type === 'json_object';
  { const sy0 = ((j.messages || []).find((m) => m.role === 'system') || {}).content || ''; if (/estimator/.test(sy0)) LLMSEEN.bom = j.messages; if (/project document analyst/.test(sy0)) LLMSEEN.ingest = j.messages; if (/DOES NOT SEE MONEY/.test(sy0)) LLMSEEN.nomoney = j.messages; }
  s.setHeader('Content-Type', 'application/json');
  const sys = ((j.messages || []).find((m) => m.role === 'system') || {}).content || '';
  const ans = /briefing the CEO/.test(sys) ? { headline: 'Steady the portfolio.', faring: 'Quick check faring.', concerns: [{ title: 'Harbour bridge overspend', detail: 'Over budget.' }], positives: [{ title: 'Clinic fit-out under budget', detail: 'By $93k.' }], strategy: [{ title: 'Focus', detail: 'Back the winners.' }], focus: [{ title: 'Bill the done milestone', detail: 'Raise it.' }], cash_view: 'Cash dips then recovers.', conclusion: 'Steady and bill on time.', plan: [{ when: 'Next 2 weeks', what: 'Stabilise.' }], say: 'Quick check briefing.' }
    : /talking with the CEO on the CEO view/.test(sys) ? (/who is/i.test(JSON.stringify(j.messages.slice(-1))) ? '__FACT__' : { answer: 'Focus on the few programs that earn.', options: [{ option: 'Focus', upside: 'Margin', downside: 'Less growth' }], decision: 'Focus, as Drucker would.', measures: ['Margin by program'], say: 'Focus.' })
    : /exactly THREE POSSIBLE SOLUTIONS/.test(sys) ? (/AI-SHORT/.test(JSON.stringify(j.messages)) ? { options: [{ title: 'Only one', response: 'Mitigate', steps: ['a'], effort: 'Low' }, { title: 'No steps', effort: 'Low' }, { title: 'No effort', steps: ['b'] }], best: 0 }
      : { options: [{ title: '', response: 'Avoid', steps: ['dropped'] }, { title: 'Check early', response: (sys.match(/"response":"([^|"]+)/) || [])[1], steps: ['Ask the owner'], effort: 'Low' }, { title: 'Plan B', steps: ['Line up a fallback'], effort: 'Medium' }, { title: 'Escalate it', steps: ['Raise at the steering group'], effort: 'Low' }], best: 2, watch: 'The date.' })
    : /senior ESG and sustainability reporting adviser/.test(sys) ? { leadership_message: 'ESG-MOCK leadership message.', environment: 'ESG-MOCK environment.', ceo_message: 'ESG-MOCK CEO message.', targets: [{ pillar: 'E', target: 'Cut Scope 1 and 2 by 30%', baseline: 'FY2024', target_year: '2030', status: 'On track' }],
        climate_risks: [{ risk: 'Extreme heat at depots', type: 'Physical (acute)', horizon: 'Long', likelihood: 'High', impact: 'Medium', response: 'Cooling and shifts' }], headline: 'ESG-MOCK headline.', strengths: ['Measured Scope 1 and 2'], recommendations: [{ title: 'Set a science-based target', why: 'Investors ask.', how: 'Use SBTi.', standard: 'IFRS S2 §33' }] }
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
  const pages = ['/', '/index.html', '/about.html', '/features.html', '/agile.html', '/industries.html', '/contact.html', '/login.html', '/privacy.html', '/promo.html', '/admin/'];
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
    { const cv = (await api('planCeoGet', {})).j, row = ((cv.view || cv).rows || []).find((r) => r.core === ec) || {}, fm = EB.money || {};
      ok('Finance', '📐 the CEO view shows the same profit as Finance on the estimated contract value (one figure, marked as an estimate)', row.estimate > 0 && Math.abs((row.profit || 0) - (fm.profit != null ? fm.profit : NaN)) < 0.01, JSON.stringify([row.estimate, row.profit, fm.profit, Object.keys(cv).slice(0, 8)])); }
    await api('acctBillSave', { core: ec, contract: EB.contract, ms: { m1: 50, m2: 50 } }); const eRaise2 = await api('acctBillRaise', { core: ec, tid: 'm1' });
    ok('Finance', '📐 no contract yet: estimated from Costing and split evenly across milestones, shown as "done, not billed" (the milestones done, not invoiced); work done is the plan\'s % complete (35%), value earned 50% beside it; it cannot be invoiced until the CFO saves (confirms) it',
      EB.contractFrom === 'estimate' && EB.contract > 0 && em1.pct === 50 && em1.ready && em1.confirm && eRaise.status === 400 && ep.stand && ep.stand.status.tone === 'red' && ep.stand.workPct === 35 && ep.stand.valuePct === 50 && ep.stand.unbilled === em1.amount && ef.j.totals.estimatedN >= 1 && eRaise2.status === 200,
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
    for (const [e, n, r] of [['pm1@example.com', 'Pat Manager', 'Project manager'], ['dir1@example.com', 'Dana Director', 'PMO Director'], ['dir2@example.com', 'Dev Director', 'PMO Director']]) await api('userCreate', { user: { email: e, name: n, password: 'Vaultpass2026x', role: r } });
    const ul = await api('userList'), id1 = (ul.j.users || []).find((u) => u.username === 'dir1@example.com').id;
    const pl = await api('planProgramList', {}), dh = (pl.j.programs || []).find((g) => g.name === 'Digital health'), bcard = (pl.j.cards || []).find((c) => c.name === 'Billing test'), vc = bcard.core;
    { const pmU = (ul.j.users || []).find((u) => u.username === 'pm1@example.com'); await api('userSave', { user: { id: pmU.id, name: pmU.name, role: 'Project manager', projAll: false, projects: [vc], active: true } }); }   // 📁 a project manager sees only the projects given to them
    const sv = await api('planProgramSave', { id: dh.id, name: dh.name, director: id1, manager: dh.manager || '', sponsor: dh.sponsor || '', status: dh.status || 'active' });
    const b64 = (t) => Buffer.from(t).toString('base64'), secret = 'Contract sum $250,000 plus GST. Pay to BSB 062-000 Account no 12345678. Contact pat@client.com or 0412 345 678. Scope: build the clinic.';
    const cfoAdd = await as('cfo1@example.com', 'Cfopass2026x', () => api('vaultAdd', { core: vc, folder: 'billing', name: 'billing-schedule.txt', type: 'text/plain', size: 40, file: b64('Billing schedule $100,000'), text: 'Billing schedule $100,000' }));
    const pmBill = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultAdd', { core: vc, folder: 'billing', name: 'x.txt', file: b64('x'), text: 'x' }));
    const pmAdd = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultAdd', { core: vc, folder: 'contracts', name: 'contract.txt', type: 'text/plain', size: secret.length, file: b64(secret), text: secret }));
    const pmList = await as('pm1@example.com', 'Vaultpass2026x', () => api('vaultList', { core: vc })), pmFin = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctFinanceGet', {}));
    const d1 = await as('dir1@example.com', 'Vaultpass2026x', () => api('vaultList', { core: vc })), d2 = await as('dir2@example.com', 'Vaultpass2026x', () => api('vaultList', { core: vc }));
    const ceo = await as('ceo1@example.com', 'Ceopass2026x', () => api('vaultList', { core: vc })), own = await api('vaultList', { core: vc });
    ok('Vault', '🔒 who opens it: the super user, the CEO, the CFO and PMO Directors; not a project manager (who sees Finance for their own projects only)',
      sv.status === 200 && own.status === 200 && ceo.status === 200 && d1.status === 200 && d2.status === 200 && pmList.status === 403 && pmFin.status === 200 && (own.j.files || []).some((f) => f.folder === 'billing') && (own.j.files || []).some((f) => f.champ === 'invoice'),
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
    const btc = ((await api('planProgramList', {})).j.cards || []).find((c) => c.name === 'Billing test').core;
    const d2B = await as('dir2@example.com', 'Vaultpass2026x', () => api('acctBillGet', { core: btc })), d2E = await as('dir2@example.com', 'Vaultpass2026x', () => api('acctBillGet', { core: gc })), pmSave = await as('pm1@example.com', 'Vaultpass2026x', () => api('acctBillSave', { core: gc, contract: 1, ms: {} }));
    ok('Billing', '🔐 the project\'s own manager sees its billing and Finance (only their projects) and the red count, but cannot change it; PMO Directors see every program\'s billing (the milestone bill on the Gantt)',
      pmB.status === 200 && pmF.status === 200 && (pmF.j.projects || []).every((p) => p.core === gc || p.core === btc) && pmA.status === 200 && pmA.j.projects === 2 && d2B.status === 200 && d2E.status === 200 && pmSave.status === 403,
      [pmB.status, pmF.status, JSON.stringify((pmF.j.projects || []).map((p) => p.name)), JSON.stringify(pmA.j), d2B.status, d2E.status, pmSave.status].join(' '));
    // 🧭 the PMO Director: one per company; the PMO view; sees every project's billing (read-only); makes the project managers' and directors' logins
    { const mk = await api('userCreate', { user: { email: 'pmo1@example.com', name: 'Priya Ops', password: 'Vaultpass2026x', role: 'PMO Director' } }), two = await api('userCreate', { user: { email: 'pmo2@example.com', name: 'Second Pmo', password: 'Vaultpass2026x', role: 'PMO Director' } });
      const r = await as('pmo1@example.com', 'Vaultpass2026x', async () => { const me = await api('me'), v = await api('planPmoGet', {}), b = await api('acctBillGet', { core: gc }), bs = await api('acctBillSave', { core: gc, contract: 1, ms: {} }), u1 = await api('userCreate', { user: { email: 'pm9@example.com', name: 'New Manager', password: 'Vaultpass2026x', role: 'Project manager' } }), u2 = await api('userCreate', { user: { email: 'ceo9@example.com', name: 'Not Ceo', password: 'Vaultpass2026x', role: 'CEO' } }); return { me: me.j, v, b: b.status, bs: bs.status, u1: u1.status, u1r: u1.j.user && u1.j.user.role, u2: u2.status }; });
      const pmV = await as('pm1@example.com', 'Vaultpass2026x', () => api('planPmoGet', {})), ownV = await api('planPmoGet', {}), V = r.v.j;
      ok('PMO', '🧭 the PMO Director (several allowed); lands with every project and the money; the PMO view (programs, decisions, milestones, escalations, team, gaps); every project\'s billing read-only; makes a project manager but not a CEO; a project manager has no PMO view',
        mk.status === 200 && two.status === 200 && r.me.role === 'PMO Director' && r.me.money === true && !r.me.scope && r.v.status === 200 && Array.isArray(V.programs) && V.programs.length > 0 && V.all && V.all.n > 0 && V.team && Array.isArray(V.team.pms) && V.milestones && Array.isArray(V.gaps) && Array.isArray(V.decisions)
        && r.b === 200 && r.bs === 403 && r.u1 === 200 && r.u1r === 'Project manager' && r.u2 === 403 && pmV.status === 403 && ownV.status === 200,
        JSON.stringify([mk.status, two.status, r.me.role, r.me.money, r.v.status, V && V.error, r.b, r.bs, r.u1, r.u1r, r.u2, pmV.status, ownV.status]).slice(0, 600)); }
    // 🗺 the Program manager: only their programs, the projects in them and the people on them; makes programs and projects (which become theirs); no money
    { const pl = await api('planList'), dh = (pl.j.programs || []).find((p) => p.name === 'Digital health'), ev = (pl.j.programs || []).find((p) => p.name === 'Events');
      const mk = await api('userCreate', { user: { email: 'pgm1@example.com', name: 'Grace Program', password: 'Vaultpass2026x', role: 'Program manager' } }), uid = mk.j.user && mk.j.user.id;
      const give = await api('userPrograms', { id: uid, programs: [dh.id] });
      const r = await as('pgm1@example.com', 'Vaultpass2026x', async () => {
        const me = await api('me'), L = await api('planList'), PL = await api('planProgramList', {}), V = await api('planPgmGet', {}), oth = await api('planGet', { core: gc }), mineP = await api('planGet', { core: btc });
        const bill = await api('acctBillGet', { core: btc }), newOther = await api('planNewProject', { name: 'Sneaky', client: 'X', program: 'Events' }), newMine = await api('planNewProject', { name: 'Clinic fit-out', client: 'Northside Health', program: 'Digital health' });
        const newProg = await api('planNewProject', { name: 'Outreach', client: 'Northside Health', program: 'Community outreach' }), after = await api('planProgramList', {});
        const ppl = await api('pplList'), sq = await api('sqlData'), ul = await api('userList'), cu = await api('custList'), pmo = await api('planPmoGet', {}), gaveOwn = await api('userPrograms', { id: uid, programs: [ev.id] });
        return { me: me.j, L: (L.j.plans || []).map((p) => p.program), PLp: (PL.j.programs || []).map((p) => p.name), PLc: (PL.j.cards || []).map((c) => c.program), V: V.status, Vp: (V.j.programs || []).map((g) => g.name), Vbud: V.j.all && V.j.all.budget,
          oth: oth.status, mine: mineP.status, bill: bill.status, nO: newOther.status, nM: newMine.status, nP: newProg.status, afterP: (after.j.programs || []).map((p) => p.name).sort(), ppl: ppl.status, pplScoped: !!ppl.j.scoped,
          sq: sq.status, sqP: [...new Set(((sq.j.data || {}).projects || []).map((x) => x.program))], sqMoney: Object.keys(((sq.j.data || {}).projects || [])[0] || {}).filter((k) => /budget|contract_value|profit/.test(k)), ul: ul.status, cu: cu.status, pmo: pmo.status, gaveOwn: gaveOwn.status };
      });
      ok('PGM', '🗺 a Program manager: sees only their program (projects, Program view, Ask AI data, people), no money; cannot open another program\'s project or add to it; a new program they make becomes theirs; no logins, customers or PMO view',
        mk.status === 200 && give.status === 200 && r.me.role === 'Program manager' && !r.me.money && r.L.length > 0 && r.L.every((p) => p === 'Digital health') && r.PLp.join() === 'Digital health' && r.PLc.every((p) => p === 'Digital health')
        && r.V === 200 && r.Vp.join() === 'Digital health' && r.Vbud == null && r.oth === 403 && r.mine === 200 && r.bill === 403 && r.nO === 403 && r.nM === 200 && r.nP === 200 && r.afterP.join() === 'Community outreach,Digital health'
        && r.ppl === 200 && r.pplScoped && r.sq === 200 && r.sqP.length > 0 && r.sqP.every((p) => p === 'Digital health' || p === 'Community outreach') && !r.sqMoney.length && r.ul === 403 && r.cu === 403 && r.pmo === 403 && r.gaveOwn === 403,
        JSON.stringify(r).slice(0, 900)); }
    // 📁 a Project manager sees only their projects; 🔗 a person's Role follows their login, and Job title is their own
    { const cards = (await api('planProgramList', {})).j.cards || [], notMine = cards.find((c) => c.name === 'Estimate test').core;
      const r = await as('pm1@example.com', 'Vaultpass2026x', async () => { const a = await api('planGet', { core: notMine }), l = await api('planList'), me = await api('me'); return { a: a.status, cores: (l.j.plans || []).map((p) => p.core), me: me.j }; });
      const pp = await api('pplList'), per = (pp.j.people || []).find((p) => String(p.email || '').toLowerCase() === 'pgm1@example.com');
      const full = per ? (await api('pplGet', { id: per.id })).j.person : null;
      const sv = full ? await api('pplSave', { person: { ...full, role: 'Contractor', jobTitle: 'Head of health programs' } }) : { status: 0, j: {} };
      const after = per ? (await api('pplGet', { id: per.id })).j.person : null, bad = await api('userCreate', { user: { email: 'old1@example.com', name: 'Old Director', password: 'Vaultpass2026x', role: 'Project director' } });
      ok('Roles', '📁 a project manager sees only their projects (not another project); 🔗 People shows each person\'s login and its role, the role cannot be changed in People, and Job title is saved; Project director is no longer offered (it is PMO Director)',
        r.a === 403 && !r.cores.includes(notMine) && r.cores.length >= 1 && r.me.role === 'Project manager' && r.me.money === true && !r.me.scope && per && per.role === 'Program manager' && per.login && per.login.role === 'Program manager'
        && sv.status === 200 && after && after.role === 'Program manager' && after.jobTitle === 'Head of health programs' && (bad.status >= 400 || (bad.j.user && bad.j.user.role !== 'Project director')),
        JSON.stringify([r.a, r.cores.length, r.me.role, r.me.money, per && per.role, per && per.login, sv.status, sv.j.error, after && [after.role, after.jobTitle], bad.status]).slice(0, 700)); }

    // 🏃 Scrum Master and 🎯 Product Owner: project-level only; billing and raising invoices on their own client projects; an internal project has no billing at all
    { const mkp = async (name, ctype, done) => { const r = await api('planNewProject', { name, client: 'Acme', program: 'Digital health' }); await api('planSave', { core: r.j.core, plan: { name, start: '2026-10-01', budgetCfg: { cont: 10, res: 5, margin: 20, gst: 10, ctype }, phases: [{ id: 'p1', name: 'Work' }],
        tasks: [{ id: 't0', name: 'Design', phase: 'p1', dur: 5, pred: [], res: [], qty: 10, unit: 'h', rate: 100, pct: done ? 100 : 0, status: done ? 'done' : 'todo' }, { id: 't1', name: 'Design signed off', phase: 'p1', dur: 0, pred: ['t0'], res: [], pct: done ? 100 : 0, status: done ? 'done' : 'todo' }] } }); return r.j.core; };
      const cli = await mkp('Sprint client project', 'fixed', true), inn = await mkp('Sprint internal project', 'internal', true), other = await mkp('Someone else\'s project', 'fixed', true);
      const mk = await api('userCreate', { user: { email: 'sm1@example.com', name: 'Sam Scrum', password: 'Vaultpass2026x', role: 'Scrum Master', projAll: false, projects: [cli, inn] } });
      const mk2 = await api('userCreate', { user: { email: 'po1@example.com', name: 'Paula Owner', password: 'Vaultpass2026x', role: 'Product Owner', projAll: false, projects: [cli] } });
      const conf = await api('acctBillSave', { core: cli, contract: 50000, ms: { t1: 40 } });   // the CFO (here the super user) confirms the contract value and the milestone's share
      { const ul = (await api('userList')).j.users || [], give = (em, role, projects) => { const u = ul.find((x) => x.username === em); return u ? api('userSave', { user: { id: u.id, name: u.name, role, projAll: false, projects } }) : null; };
        await give('sm1@example.com', 'Scrum Master', [cli, inn]); await give('po1@example.com', 'Product Owner', [cli]); }
      { const u = ((await api('userList')).j.users || []).find((x) => x.username === 'sm1@example.com'); await api('userSave', { user: { id: u.id, name: u.name, role: 'Scrum Master', projAll: false, projects: [cli, inn], mods: { ...u.mods, people: 'view' } } }); }   // a module changed: still a Scrum Master, still billing
      const KEEP = cookie;
      const r = await as('sm1@example.com', 'Vaultpass2026x', async () => { const me = await api('me'), l = await api('planList'), o = await api('planGet', { core: other }), f = await api('acctFinanceGet'), bc = await api('acctBillGet', { core: cli }), bi = await api('acctBillGet', { core: inn }), bo = await api('acctBillGet', { core: other }),
        ro = await api('acctBillRaise', { core: other, tid: 't1' }), ri = await api('acctBillRaise', { core: inn, tid: 't1' }), rc = await api('acctBillRaise', { core: cli, tid: 't1' }), sv = await api('acctBillSave', { core: cli, contract: 1 }), cu = await api('custList');
        const f2 = await api('acctFinanceGet'), pdfGet = (id) => fetch(BASE + '/.netlify/functions/admin?action=pdf&id=' + encodeURIComponent(id || 'INV-0'), { headers: { cookie } }).then((x) => x.status);
        const others = (await (async () => { const keep = cookie; cookie = KEEP; try { return ((await api('acctFinanceGet')).j.invoices || []).filter((i) => i.core && i.core !== cli).map((i) => i.id); } finally { cookie = keep; } })());
        return { me: me.j, cores: (l.j.plans || []).map((p) => p.core), o: o.status, f: f.status, fp: (f.j.projects || []).map((p) => p.core), bc: bc.status, can: bc.j.canRaise, bi: bi.status, bo: bo.status, ro: ro.status, ri: ri.status, rc: rc.status, rcE: rc.j.error || '', rcId: rc.j.id || '', inF2: (f2.j.invoices || []).some((i) => i.id === rc.j.id), pdf: await pdfGet(rc.j.id), pdfO: others.length ? await pdfGet(others[0]) : 403, sv: sv.status, cu: cu.status }; });
      const p2 = await as('po1@example.com', 'Vaultpass2026x', async () => { const me = await api('me'), l = await api('planList'); return { role: me.j.role, cores: (l.j.plans || []).map((p) => p.core) }; });
      ok('Leads', '🏃 a Scrum Master and 🎯 a Product Owner see only their own projects; they see and raise invoices on their own client projects (not on someone else\'s); an internal project has no billing; contract values stay with the CFO; no customers',
        mk.status === 200 && mk2.status === 200 && r.me.role === 'Scrum Master' && r.me.mods.people === 'view' && r.me.money === true && !r.me.scope && r.me.pgm && r.me.pgm.kind === 'project' && r.cores.includes(cli) && r.cores.includes(inn) && !r.cores.includes(other) && r.o === 403
        && r.f === 200 && r.fp.includes(cli) && !r.fp.includes(inn) && !r.fp.includes(other) && r.bc === 200 && r.can === true && r.bi === 403 && r.bo === 403 && r.ro === 403 && r.ri === 403 && conf.status === 200 && r.rc === 200 && /^INV-/.test(r.rcId) && r.inF2 && r.pdf === 200 && r.pdfO === 403 && r.sv === 403 && r.cu === 403
        && p2.role === 'Product Owner' && p2.cores.includes(cli) && !p2.cores.includes(other) && !p2.cores.includes(inn),
        JSON.stringify([mk.status, mk.j.error, mk2.status, r, p2]).slice(0, 900)); }
    // 🧩 the RAID log: assumptions and outside dependencies saved with the plan; RAG by the same rules; project links from the Dependency board; scoped; in Ask AI as raid_log
    { const td = new Date(Date.now() + 11 * 3600000).toISOString().slice(0, 10), back = (n) => new Date(Date.parse(td) - n * 864e5).toISOString().slice(0, 10);
      const mk = async (name) => (await api('planNewProject', { name, client: 'Acme', program: 'Digital health' })).j.core, ra = await mk('RAID test'), rb = await mk('RAID upstream');
      await api('planSave', { core: rb, plan: { name: 'RAID upstream', start: '2026-10-01', phases: [{ id: 'p1', name: 'Work' }], tasks: [{ id: 't1', name: 'Build', phase: 'p1', dur: 20, pred: [], res: [], pct: 0 }] } });
      const sv = await api('planSave', { core: ra, plan: { name: 'RAID test', start: '2026-10-01', phases: [{ id: 'p1', name: 'Work' }], tasks: [{ id: 't1', name: 'Fit-out', phase: 'p1', dur: 10, pred: [], res: [], pct: 0 }],
        risks: [{ id: 'r1', title: 'Wet weather', p: 5, i: 4, status: 'Open' }], issues: [{ id: 'i1', title: 'Crane booked late', priority: 'Low', due: back(3), status: 'Open' }],
        assumptions: [{ id: 'a1', title: 'Council approves in six weeks', impact: 'High', check: back(2), status: 'Unchecked' }, { id: 'a2', title: 'Client signs the scope', status: 'Holds' }, { id: 'a3', title: 'Bad', status: 'Nope' }],
        extDeps: [{ id: 'd1', title: 'Switchboard from the supplier', kind: 'Supplier', party: 'Volt Co', need: back(1), status: 'Waiting', task: 't1' }, { id: 'd2', title: 'Fire engineer sign-off', kind: 'Approval', status: 'Delivered' }] } });
      const dep = await api('planDepSave', { from: rb, to: ra, type: 'FS' });
      const g = (await api('planGet', { core: ra })).j.plan || {}, one = await api('planRaidList', { core: ra }), L = one.j.items || [], by = (id) => L.find((x) => x.id === id) || {};
      const link = L.find((x) => x.link && x.core === ra) || {}, port = await api('planRaidList', {}), sq = await api('sqlData'), rl = ((sq.j.data || {}).raid_log || []).filter((x) => x.job === ra);
      const pm = await as('pm1@example.com', 'Vaultpass2026x', async () => { const r = await api('planRaidList', {}), o = await api('planRaidList', { core: ra }); return { cores: [...new Set((r.j.items || []).map((x) => x.core))], st: r.status, o: o.status }; });
      const adv = { a: await api('planAdvise', { core: ra, kind: 'assumption', id: 'a1' }), d: await api('planAdvise', { core: ra, kind: 'dependency', id: 'd1' }), i: await api('planAdvise', { core: ra, kind: 'issue', id: 'i1' }), r: await api('planAdvise', { core: ra, kind: 'risk', id: 'r1' }), x: await api('planAdvise', { core: ra, kind: 'assumption', id: 'nope' }), sh: await api('planAdvise', { core: ra, kind: 'risk', id: 'r1', ask: 'AI-SHORT' }) };
      const gfr = (await api('planGet', { core: ra })).j, gf = gfr.plan;
      const sv2 = await api('planSave', { core: ra, rev: gf.rev, plan: { ...gf, assumptions: [{ ...g.assumptions[0], response: 'Contingency', action: 'Book a second council slot' }, ...gf.assumptions.slice(1)], extDeps: [{ ...g.extDeps[0], response: 'Bogus', action: 'Chase weekly' }, g.extDeps[1]] } });
      const g2 = (await api('planGet', { core: ra })).j.plan || {};
      ok('RAID AI', '✨ Ask AI works for all four RAID kinds (finds the assumption, dependency and issue; here offline it stops at "AI is not set up"); assumptions and dependencies keep a response and an action',
        [adv.a, adv.d, adv.i, adv.r].every((r) => r.status === 200 && r.j.options.length === 3 && r.j.options[r.j.best].title === 'Plan B' && r.j.options.every((o) => o.title && o.steps.length)) && adv.a.j.options[0].response === 'Validate' && adv.d.j.options[0].response === 'Expedite' && adv.i.j.options[0].response === 'Fix now' && adv.r.j.options[0].response === 'Avoid'
        && adv.sh.status === 502 && /fewer than three/.test(adv.sh.j.error || '') && adv.x.status === 400 && g2.assumptions[0].response === 'Contingency' && g2.assumptions[0].action === 'Book a second council slot' && g2.extDeps[0].response === 'Expedite' && g2.extDeps[0].action === 'Chase weekly',
        JSON.stringify([adv.a.j, adv.sh.status, adv.sh.j.error, sv2.status, sv2.j.error, adv.a.status, adv.a.j.error, adv.d.status, adv.i.status, adv.x.status, adv.x.j.error, (g2.assumptions || [])[0], (g2.extDeps || [])[0]]).slice(0, 700));
      ok('RAID', '🧩 RAID log: assumptions and outside dependencies are saved with the plan (bad values tidied); red for a high-impact assumption past its check date, a late issue, a dependency past its needed-by date and a 5×4 risk; grey when delivered; the Dependency board link shows on the waiting project; Portfolio › RAID log covers every project; a project manager sees only their projects; Ask AI has raid_log',
        sv.status === 200 && (g.assumptions || []).length === 3 && g.assumptions[2].status === 'Unchecked' && (g.extDeps || []).length === 2 && g.extDeps[0].task === 't1'
        && by('a1').rag === 'red' && by('a2').rag === 'green' && by('i1').rag === 'red' && by('d1').rag === 'red' && by('d2').rag === 'grey' && by('r1').rag === 'red' && by('r1').score === 20
        && one.j.summary && one.j.summary.A.total === 3 && one.j.summary.D.total >= 3 && dep.status === 200 && /RAID upstream/.test(link.title || '') && L.every((x) => x.core === ra)
        && port.status === 200 && (port.j.projects || []).some((x) => x.core === rb) && (port.j.items || []).filter((x) => x.link && (x.core === ra || x.core === rb)).length === 1 && rl.length >= 6 && rl.some((x) => x.type === 'Assumption' && x.rag === 'red') && rl.filter((x) => x.dependency_kind === 'Project' && /RAID upstream/.test(x.title)).length === 1
        && pm.st === 200 && !pm.cores.includes(ra) && pm.o === 403,
        JSON.stringify([sv.status, (g.assumptions || []).map((a) => a.status), L.map((x) => x.id + ':' + x.rag), one.j.summary, dep.status, dep.j.error, link.title, rl.length, pm]).slice(0, 900)); }
    // 📍 the site picked from the list: town, state, country and postcode go with the project (Ask AI's location columns)
    { const pl = await api('planPlacesGet', { q: 'New South' }), st = (pl.j.places || []).find((x) => x.cc === 'AU');
      const np = await api('planNewProject', { name: 'Located project', client: 'Acme', program: 'Digital health', site: 'Parramatta NSW 2150, Australia', loc: { cc: 'AU', st: 'NSW', place: 'Parramatta, New South Wales, Australia', town: 'Parramatta', postcode: '2150' } });
      const row = (((await api('sqlData')).j.data || {}).projects || []).find((x) => x.job === np.j.core || x.job_id === np.j.core) || {};
      ok('Location', '📍 typing in Site or location offers places (a state here, offline); the picked town, state, country and postcode are kept with the project and appear in Ask AI\'s location columns',
        !!st && np.status === 200 && row.city === 'Parramatta' && row.state === 'New South Wales' && row.country === 'Australia' && row.postcode === '2150', JSON.stringify([st, np.status, row.city, row.state, row.country, row.postcode])); }

    // 🔒 CodeRabbit's findings: a project manager reaches only the logins on their own projects and never gives a login every project; Ask AI data has no money for a login without money access, and no program roll-up for a project manager
    { const cards = (await api('planProgramList', {})).j.cards || [], notMine = cards.find((c) => c.name === 'Estimate test').core, mineC = cards.find((c) => c.name === 'Billing test').core;
      const other = await api('userCreate', { user: { email: 'otherc@example.com', name: 'Other Contractor', password: 'Vaultpass2026x', role: 'Contractor' } });
      await api('userSave', { user: { id: other.j.user.id, name: 'Other Contractor', role: 'Contractor', projAll: false, projects: [notMine], active: true } });
      const shared = await api('userCreate', { user: { email: 'sharedc@example.com', name: 'Shared Contractor', password: 'Vaultpass2026x', role: 'Contractor' } }); await api('userSave', { user: { id: shared.j.user.id, name: 'Shared Contractor', role: 'Contractor', projAll: false, projects: [mineC, notMine], active: true } });
      const sa = await api('userCreate', { user: { email: 'siteq@example.com', name: 'Site Admin Q', password: 'Vaultpass2026x', role: 'Site administrator' } });
      const r = await as('pm1@example.com', 'Vaultpass2026x', async () => {
        const pw = await api('userSetPw', { id: other.j.user.id, password: 'Hijack2026xx!' }), rs = await api('userReset', { id: other.j.user.id }), sh = await api('userSetPw', { id: shared.j.user.id, password: 'Hijack2026xx!' });
        const nc = await api('userCreate', { user: { email: 'mine1@example.com', name: 'Mine One', password: 'Vaultpass2026x', role: 'Project personnel', projects: [mineC] } });
        const all = nc.status === 200 ? await api('userSave', { user: { id: nc.j.user.id, name: 'Mine One', role: 'Project personnel', projAll: true, projects: [mineC], active: true } }) : { status: 0, j: {} };
        const none = await api('userCreate', { user: { email: 'mine2@example.com', name: 'Mine Two', password: 'Vaultpass2026x', role: 'Contractor' } });
        const sq = await api('sqlData'); return { sq: sq.status, sqN: ((sq.j.data || {}).projects || []).length, pw: pw.status, rs: rs.status, sh: sh.status, nc: nc.status, ncAll: nc.j.user && nc.j.user.projAll, all: all.status, allAll: all.j.user && all.j.user.projAll, none: none.status, progs: !!(sq.j.data || {}).programs };
      });
      const s2 = await as('siteq@example.com', 'Vaultpass2026x', async () => { const q = await api('sqlData'), P = (q.j.data || {}).projects || []; return { st: q.status, n: P.length, seeded: P.some((x) => x.project_name === 'Billing test'), cols: [...new Set(P.flatMap((x) => Object.keys(x).filter((k) => /contract_value|forecast_profit|approved_budget|invoiced|budget|cost|profit/.test(k))))] }; });   // every project checked
      ok('Security', '🔒 a project manager cannot set or reset the password of a login on another project (or shared with one), cannot give a login every project, and must give a new login one of their projects; a project manager gets no program roll-up in Ask AI; a login without money access gets Ask AI data without money columns',
        sa.status === 200 && r.pw === 403 && r.rs === 403 && r.sh === 403 && r.nc === 200 && r.ncAll === false && r.all === 200 && r.allAll === false && r.none === 400 && r.sq === 200 && r.sqN > 0 && r.progs === false && s2.st === 200 && s2.n > 3 && s2.seeded && !s2.cols.length,
        JSON.stringify([sa.status, r, s2])); }
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
    const fresh = await as('pm1@example.com', 'Vaultpass2026x', () => api('planNewProject', { name: 'Fresh delete', client: 'Acme', program: 'Digital health' })), pmDel = await as('pm1@example.com', 'Vaultpass2026x', () => api('planProjectDelete', { core: fresh.j.core }));   // a project they made is theirs
    const vd = await api('planNewProject', { name: 'Vault delete', client: 'Acme', program: 'Digital health' }), vdc = vd.j.core;
    await api('planSave', { core: vdc, plan: { name: 'Vault delete', start: '2026-10-01', phases: [{ id: 'ph1', name: 'Work' }], tasks: [{ id: 'k1', phase: 'ph1', name: 'Design', dur: 5, pred: [], res: [], qty: 1, rate: 100, pct: 0, status: 'todo' }] } });
    await api('planProjectArchive', { core: vdc, by: 'Sashi', sig: 'Sashi', reason: 'Duplicate project' });
    const vdCeo = await as('ceo1@example.com', 'Ceopass2026x', () => api('planProjectDelete', { core: vdc })), vdOwn = await api('planProjectDelete', { core: vdc }), vdReg = ((await api('planArchiveList', {})).j.register || []).some((e) => e.core === vdc && e.what === 'Deleted for good');
    const od = await api('planNewProject', { name: 'Old project', client: 'Acme', program: 'Digital health' }), odc = od.j.core;
    await api('planSave', { core: odc, plan: { name: 'Old project', start: '2025-04-07', phases: [{ id: 'ph1', name: 'Work' }], tasks: [{ id: 'k1', phase: 'ph1', name: 'Design', dur: 5, pred: [], res: [], qty: 1, rate: 100, pct: 100, status: 'done' }] } });
    const odOwn = await api('planProjectDelete', { core: odc }), odPm = await as('pm1@example.com', 'Vaultpass2026x', () => api('planProjectDelete', { core: odc }));
    // 💹 money checks with hand-worked figures (the same numbers everywhere: Finance, the CEO view)
    const mk = async (name, tasks, charter) => { const r = await api('planNewProject', { name, client: 'Acme', program: 'Digital health' }); await api('planSave', { core: r.j.core, plan: { name, start: '2026-10-01', budgetCfg: { cont: 10, res: 5, margin: 0, gst: 10 }, ...(charter ? { charter } : {}), phases: [{ id: 'ph1', name: 'Work' }], tasks } }); return r.j.core; };
    const t1 = (id, cost, pct, actual) => ({ id, phase: 'ph1', name: 'Work ' + id, dur: 10, pred: [], res: [], qty: 1, rate: cost, pct, status: pct >= 100 ? 'done' : pct ? 'doing' : 'todo', ...(actual ? { actual } : {}) });
    const cDone = await mk('Money done', [t1('k1', 2602995, 100, 2902473)]), cHalf = await mk('Money half', [t1('k1', 10000, 100, 11111), t1('k2', 10000, 0)]), cAppr = await mk('Money approved', [t1('k1', 2602995, 100, 2902473)], { budget: 2831648 });
    const KD = (await api('acctBillGet', { core: cDone })).j.bill.money, KH = (await api('acctBillGet', { core: cHalf })).j.bill.money;
    ok('Finance', '💹 a finished project: forecast cost = what was spent, exactly (no rounded CPI); contract $2,993,444.25 → Profit $90,971.25; the cost is final, so both scenarios are $90,971.25 too',
      KD.eac === 2902473 && KD.contract === 2993444.25 && KD.profit === 90971.25 && KD.profit1 === 90971.25 && KD.profit2 === 90971.25 && KD.complete === true, JSON.stringify(KD));
    ok('Finance', '💹 half done at CPI 0.90: forecast = spent $11,111 + work left $10,000 ÷ 0.90 = $22,222; Profit $778; scenarios $0 and $778 (the reserves absorb the overrun, no double counting)',
      KH.eac === 22222 && KH.budget === 23000 && KH.profit === 778 && KH.profit1 === 0 && KH.profit2 === 778 && KH.CPI === 0.9, JSON.stringify(KH));
    const CV = (await api('planCeoGet', { today: '2026-11-21' })).j, row = (c) => (CV.rows || CV.view && CV.view.rows || []).find((r) => r.core === c) || {}, rD = row(cDone), rA = row(cAppr);
    ok('CEO', '💹 the CEO view uses the same money: budget = approved, or else base + contingency + reserve; forecast = what was spent when done; under/over budget agrees with Finance',
      rD.budget === 2993444.25 && rD.eac === 2902473 && rD.vac === 90971.25 && rA.budget === 2831648 && rA.vac === -70825, JSON.stringify([rD.budget, rD.eac, rD.vac, rA.budget, rA.eac, rA.vac, Object.keys(CV).slice(0, 8)]));
    // 📜 contract types, hand-worked: base $20,000, contingency 10%, reserve 5%, margin 20% → contract $27,600, target $23,000
    const ctp = async (name, ctype, each) => { const r = await api('planNewProject', { name, client: 'Acme', program: 'Digital health' }); await api('planSave', { core: r.j.core, plan: { name, start: '2026-10-01', budgetCfg: { cont: 10, res: 5, margin: 20, gst: 10, ctype, gain: 50, pain: 50 }, phases: [{ id: 'ph1', name: 'Work' }],
      tasks: [t1('k1', 10000, 100, each), t1('k2', 10000, 100, each)] } }); return r.j.core; };
    const CT = {}; for (const [ty, ea] of [['fixed', 10000], ['cost', 10000], ['target', 10000], ['gmp', 10000], ['fixed', 13000], ['cost', 13000], ['target', 13000], ['gmp', 13000]]) { const c = await ctp('CT ' + ty + ' ' + ea, ty, ea); CT[ty + ea] = { core: c, K: (await api('acctBillGet', { core: c })).j.bill.money }; }
    const pr = (k) => CT[k].K.profit;
    ok('Finance', '📜 contract types (hand-worked): under budget fixed $7,600, cost-plus $4,000 (client keeps $3,600), target $6,100, GMP $6,100; over budget fixed $1,600, cost-plus $5,200, target $3,100, GMP $1,600',
      CT.fixed10000.K.contract === 27600 && pr('fixed10000') === 7600 && pr('cost10000') === 4000 && CT.cost10000.K.clientSaves === 3600 && pr('target10000') === 6100 && pr('gmp10000') === 6100 &&
      pr('fixed13000') === 1600 && pr('cost13000') === 5200 && pr('target13000') === 3100 && pr('gmp13000') === 1600 && CT.cost10000.K.ctype === 'cost',
      JSON.stringify(Object.fromEntries(Object.entries(CT).map(([k, v]) => [k, [v.K.contract, v.K.profit, v.K.profit1, v.K.profit2, v.K.clientSaves, v.K.ctype]]))));
    await api('acctBillSave', { core: CT.target13000.core, contract: 27600, ms: {} });
    const CV2 = (await api('planCeoGet', { today: '2026-11-21' })).j, rT = (CV2.rows || []).find((r) => r.core === CT.target13000.core) || {};
    ok('CEO', '📜 the CEO view works profit out by the contract type, the same as Finance (target cost, overrun shared: $3,100)', rT.profit === 3100 && rT.ctype === 'target', JSON.stringify([rT.profit, rT.ctype, rT.eac, rT.contract]));
    // 🏢 internal projects (e.g. the company retreat): no contract, invoices or profit; judged on the budget
    const iOver = await ctp('Company retreat', 'internal', 13000), iUnder = await ctp('Team offsite', 'internal', 10000);
    const IO = (await api('acctBillGet', { core: iOver })).j.bill, IU = (await api('acctBillGet', { core: iUnder })).j.bill, IK = IO.money;
    const iInv = await api('acctBillRaise', { core: iOver, tid: 'k1' }), iVo = await api('acctVoRaise', { core: iOver, amount: 100, title: 'x' }), FI = (await api('acctFinanceGet', {})).j;
    const CVi = (await api('planCeoGet', { today: '2026-11-21' })).j, ri = (CVi.rows || []).find((r) => r.core === iOver) || {};
    ok('Finance', '🏢 an internal project: no contract, GST, invoices, variation orders or profit; over budget by $3,000 (by $4,000 with the reserve held back, $6,000 against base); under budget by $3,000; the CEO view does not count it as unpriced',
      IK.internal && IK.contract === 0 && IK.profit === null && IK.gst === 0 && IK.eac === 26000 && IK.vsBudget === -3000 && IK.vsNoReserve === -4000 && IK.vsBase === -6000 && IU.money.vsBudget === 3000 &&
      IO.stand.internal && IO.stand.status.tone === 'grey' && iInv.status === 400 && iVo.status === 400 && FI.totals.internalN >= 2 && !FI.ready.some((r) => r.core === iOver) &&
      ri.internal === true && ri.profit === null && ri.contract === 0 && ri.vac === -3000,
      JSON.stringify([IK, IO.stand.status, iInv.status, iVo.status, FI.totals.internalN, ri.internal, ri.profit, ri.vac]).slice(0, 900));
    // 👷🧱 labour and materials apart (hand-worked)
    const lm = async (name, tasks) => { const r = await api('planNewProject', { name, client: 'Acme', program: 'Digital health' }); await api('planSave', { core: r.j.core, plan: { name, start: '2026-10-01', budgetCfg: { cont: 10, res: 5, margin: 0, gst: 10 }, phases: [{ id: 'ph1', name: 'Work' }], tasks } }); return (await api('acctBillGet', { core: r.j.core })).j.bill.money; };
    const tk = (id, o) => ({ id, phase: 'ph1', name: 'Task ' + id, dur: 5, pred: [], res: [], ...o });
    const L1 = await lm('Split separate', [tk('m', { unit: 'each', qty: 1, rate: 3000, pct: 100, status: 'done', actual: 3000 }), tk('l', { unit: 'days', qty: 10, rate: 100, pct: 50, status: 'doing', actual: 800 })]);
    const lmB = async (name, t) => { const r = await api('planNewProject', { name, client: 'Acme', program: 'Digital health' }); await api('planSave', { core: r.j.core, plan: { name, start: '2026-10-01', budgetCfg: { cont: 10, res: 5, margin: 0, gst: 10 }, phases: [{ id: 'ph1', name: 'Work' }], tasks: [t],
      bom: { status: 'Signed off', signedBy: 'Sam', sig: 'Sam', lines: [{ id: 'b1', task: 'x', name: 'Panels', qty: 1, unit: 'each', price: 2000, checked: true }] } } }); return (await api('acctBillGet', { core: r.j.core })).j.bill.money; };
    const L2 = await lmB('Split mixed', tk('x', { unit: 'days', qty: 10, rate: 100, pct: 100, status: 'done', actual: 3600 }));
    const L3 = await lm('BOM over price', [tk('m', { unit: 'each', qty: 1, rate: 3000, pct: 100, status: 'done', actual: 3500 }), tk('l', { unit: 'days', qty: 10, rate: 100, pct: 100, status: 'done', actual: 1000 })]);
    ok('Finance', '👷🧱 labour and materials apart: forecast $3,800 + $500 labour left ÷ 0.625 = $4,600; CPI = ($500 + $3,000) ÷ ($800 + $3,000) = 0.92 (labour 0.63); a mixed task done for $3,600 = BOM $2,000 + labour $1,600: CPI ($1,000 + $2,000) ÷ $3,600 = 0.83; a materials task $500 over its BOM price is flagged as an unrecorded BOM change and counts in CPI: ($1,000 + $3,000) ÷ ($1,000 + $3,000 + $500) = 0.89',
      L1.eac === 4600 && L1.CPI === 0.92 && L1.split.lab.CPI === 0.63 && L1.SPI === 0.5 && L2.split.lab.acIn === 1600 && L2.CPI === 0.83 && L3.CPI === 0.89 && L3.split.bomDiff === 500 && L3.split.bomDiff === 500 && L3.split.bomDiffTasks === 1 && L3.split.lab.cover === 100 && (L2.overruns || []).length === 1,
      JSON.stringify([L1.eac, L1.CPI, L1.SPI, L1.split, L2.CPI, L2.split, L3.CPI, L3.split]).slice(0, 900));
    { const r = await api('planNewProject', { name: 'BOM actual', client: 'Acme', program: 'Digital health' }), core = r.j.core;
      await api('planSave', { core, plan: { name: 'BOM actual', start: '2026-10-01', phases: [{ id: 'ph1', name: 'W' }], tasks: [{ id: 'm', phase: 'ph1', name: '🧱 Bill of Materials', dur: 0, pred: [], res: [], pct: 100, status: 'done', actual: 5000 }, tk('h', { pct: 50, status: 'doing', actual: 50 })],
        bom: { status: 'Signed off', signedBy: 'S', sig: 'S', milestone: 'm', lines: [{ id: 'b1', task: 'm', name: 'Steel', qty: 10, unit: 't', price: 300, checked: true }, { id: 'b2', task: 'm', name: 'Concrete', qty: 5, unit: 'm3', price: 200, checked: true }] } } });
      const P = (await api('planGet', { core })).j.plan, mm = P.tasks.find((x) => x.id === 'm');
      ok('Finance', '🧱 a BOM-only task takes its actual cost from the BOM / BOQ ($4,000 × 100% done), not the $5,000 typed on it', mm.actual === 4000 && P.tasks.find((x) => x.id === 'h').actual === 50, JSON.stringify(P.tasks.map((x) => [x.id, x.actual, x.bomx]))); }
    { const r = await api('planNewProject', { name: 'PV from baseline', client: 'Acme', program: 'Digital health' }), core = r.j.core;
      const T = [tk('a', { unit: 'days', qty: 10, rate: 100, pct: 100, status: 'done', actual: 1000 }), tk('b', { unit: 'days', qty: 10, rate: 100, pred: ['a'], pct: 50, status: 'doing', actual: 500 })];
      await api('planSave', { core, plan: { name: 'PV from baseline', start: '2026-10-05', phases: [{ id: 'ph1', name: 'W' }], tasks: T } });
      const g = (await api('planGet', { core })).j.plan, base = { at: Date.now(), finish: '2026-10-16', BAC: 2000, tasks: { a: { es: '2026-10-05', ef: '2026-10-09', cost: 1000 }, b: { es: '2026-10-12', ef: '2026-10-16', cost: 1000 } } };
      await api('planSave', { core, plan: Object.assign(g, { baseline: base }), rev: g.rev }); const S0 = (await api('acctBillGet', { core })).j.bill.money.SPI;
      const g2 = (await api('planGet', { core })).j.plan; g2.tasks[0].snet = '2027-03-01'; await api('planSave', { core, plan: g2, rev: g2.rev }); const S1 = (await api('acctBillGet', { core })).j.bill.money.SPI;
      ok('Finance', '📌 SPI follows the baseline: moving tasks (here a done task pushed to March) does not move SPI; only an approved re-baseline does', S0 === 0.75 && S0 === S1, JSON.stringify([S0, S1])); }
    { const r = await api('planNewProject', { name: 'Baseline versions', client: 'Acme', program: 'Digital health' }), core = r.j.core;
      const T = [tk('a', { unit: 'days', qty: 10, rate: 100 }), tk('b', { unit: 'days', qty: 10, rate: 100, pred: ['a'] })];
      const b0 = { at: Date.now() - 60000, finish: '2026-12-11', BAC: 2000, by: 'Sam', why: 'The first baseline', tasks: { a: { es: '2026-11-30', ef: '2026-12-04', cost: 1000 }, b: { es: '2026-12-07', ef: '2026-12-11', cost: 1000 } } };
      const s0 = await api('planSave', { core, plan: { name: 'Baseline versions', start: '2026-11-30', phases: [{ id: 'ph1', name: 'W' }], tasks: T, baseline: b0 } });
      const g = (await api('planGet', { core })).j.plan, b1 = { at: Date.now(), finish: '2026-12-18', BAC: 2500, by: 'Pat', why: 'Scope change: extra dock', cr: 'CR-004', tasks: { a: { es: '2026-11-30', ef: '2026-12-04', cost: 1000 }, b: { es: '2026-12-07', ef: '2026-12-18', cost: 1500 } } };
      const s1 = await api('planSave', { core, plan: Object.assign(g, { baseline: b1, baseRevs: [] }), rev: g.rev }), f1 = await api('planBaseFiles', { core }), f2 = await api('planBaseFiles', { core }), P = (await api('planGet', { core })).j.plan;
      const D = ((await api('intelGet', { core })).j.docs || []).filter((d) => /^Project Baseline v\d+\./.test(d.name)), sn = (await api('planBaseGet', { core, v: 0 })).j.snap || {};
      ok('Projects', '📌 every baseline is kept: v0 then v1 (why, approval, finish +7 days, budget +$500), each filed as its own Project Baseline vN PDF and spreadsheet (all versions listed) in Project documents; any version can be fetched to roll back to; the browser cannot rewrite the list',
        s0.j.baseRev && s0.j.baseRev.v === 0 && s1.j.baseRev && s1.j.baseRev.v === 1 && (P.baseRevs || []).length === 2 && P.baseRevs[1].dFinish === 7 && P.baseRevs[1].dBAC === 500 && P.baseRevs[1].cr === 'CR-004' && f1.j.done === 2 && f1.j.results.every((x) => x.ok) && f2.j.done === 0 && P.baseRevs.every((x) => x.files === 'ok') &&
        ['Project Baseline v0.pdf', 'Project Baseline v1.pdf', 'Project Baseline v0.csv', 'Project Baseline v1.csv'].every((nm) => D.some((d) => d.name === nm && !d.superseded)) && D.find((d) => d.name === 'Project Baseline v1.pdf').version === 1 && D.find((d) => d.name === 'Project Baseline v1.pdf').size > 2000 && sn.finish === '2026-12-11' && sn.tasks && sn.tasks.b.ef === '2026-12-11',
        JSON.stringify([s0.j.baseRev, s1.j.baseRev, f1.j, f2.j, P.baseRevs, D.map((d) => [d.name, d.version, d.size, !!d.superseded]), sn.finish])); }
    // 🧱 BOM versions (hand-worked): a mixed task, 10 days at $100 + BOM panels 4 × $500 = $2,000, half done for $1,500 actual.
    //   v0 baseline: materials EV $1,000 = AC $1,000, labour $500 earned for $500 → CPI 1.00. The panels go up to $625 (v1, +$500, +25%):
    //   materials still earned at the baseline $1,000, now cost $1,250; labour = $1,500 − $1,250 = $250 for $500 earned (labour CPI 2.00) →
    //   CPI = ($500 + $1,000) ÷ ($250 + $1,250) = 1.00, materials CPI 0.80; forecast $1,500 + $500 labour left ÷ 2 + $1,250 materials left = $3,000; a v2 with nothing changed is not a new version.
    { const r = await api('planNewProject', { name: 'BOM versions', client: 'Acme', program: 'Digital health' }), core = r.j.core;
      const pl = (price) => ({ name: 'BOM versions', start: '2026-10-01', budgetCfg: { cont: 10, res: 5, margin: 0, gst: 10 }, phases: [{ id: 'ph1', name: 'Work' }], tasks: [tk('x', { unit: 'days', qty: 10, rate: 100, pct: 50, status: 'doing', actual: 1500 })],
        bom: { status: 'Signed off', signedBy: 'Sam', sig: 'Sam', lines: [{ id: 'b1', task: 'x', name: 'Panels', qty: 4, unit: 'each', price, checked: true }] } });
      const sP = await api('planSave', { core, plan: Object.assign(pl(500), { bom: Object.assign(pl(500).bom, { ccPending: 'crwait1' }) }) }), MP = (await api('acctBillGet', { core })).j.bill.money, gP = (await api('planGet', { core })).j.plan;
      ok('Finance', '🔁 a signed-off BOM / BOQ waiting in change control is not in the costing and gets no version yet', !sP.j.bomRev && !gP.bomBase && MP.split.mat.bac === 0 && gP.bom.ccPending === 'crwait1', JSON.stringify([sP.j.bomRev, MP.split.mat, gP.bom.ccPending]));
      const s0 = await api('planSave', { core, plan: Object.assign(pl(500), { rev: gP.rev }), rev: gP.rev }), M0 = (await api('acctBillGet', { core })).j.bill.money;
      const g1 = (await api('planGet', { core })).j.plan, s1 = await api('planSave', { core, plan: Object.assign(pl(625), { rev: g1.rev }), rev: g1.rev }), M1 = (await api('acctBillGet', { core })).j.bill.money;
      const g2 = (await api('planGet', { core })).j.plan, les = (g2.lessons || []).filter((l) => /BOM revision v1/.test(l.title)), notes = (g2.tasks[0].stickies || []).filter((n) => /^bom:v/.test(n.linked || '')), s2 = await api('planSave', { core, plan: Object.assign(pl(625), { rev: g2.rev, bomBase: null, bomRevs: [] }), rev: g2.rev });
      const P2 = (await api('planGet', { core })).j.plan, DA = (await api('intelGet', { core })).j.docs, D = DA.filter((d) => d.name === 'BOM-BOQ.csv'), DP = DA.filter((d) => d.name === 'BOM-BOQ.pdf');
      const cur = D.find((d) => !d.superseded) || {};
      ok('Finance', '🧱 BOM versions: v0 at sign-off (the $2,000 baseline), v1 when the panels go to $625 (+$500, +25%), each a version of BOM.csv in Project documents; materials earned at the baseline and costed at v1: materials CPI 0.80, CPI 1.00, labour CPI 2.00; forecast $3,000; a lesson and a note for the PM, CFO and CEO; the browser cannot drop the baseline; an unchanged BOM is not a new version',
        s0.j.bomRev && s0.j.bomRev.v === 0 && s1.j.bomRev && s1.j.bomRev.v === 1 && s1.j.bomRev.delta === 500 && !s2.j.bomRev && M0.CPI === 1 && M1.split.mat.CPI === 0.8 && M1.split.mat.base === 2000 && M1.split.mat.ac === 1250 && M1.CPI === 1 && M1.split.lab.CPI === 2 && M1.eac === 3000 &&
        P2.bomBase && P2.bomBase.total === 2000 && (P2.bomRevs || []).length === 2 && D.length === 2 && DP.length === 2 && DP.some((d) => d.version === 1 && !d.superseded) && cur.version === 1 && D.some((d) => d.version === 0 && d.superseded) && les.length === 1 && les[0].impact === 'negative' && notes.length >= 1 && /@Money One/.test(notes[notes.length - 1].text) && /@Chief One/.test(notes[notes.length - 1].text) && /\+25%/.test(notes[notes.length - 1].text),
        JSON.stringify([s0.j.bomRev, s1.j.bomRev, s2.j.bomRev, M0.CPI, M1.CPI, M1.eac, M1.split, P2.bomBase, (P2.bomRevs || []).length, DA.map((d) => [d.name, d.version, !!d.superseded]), les.length, notes.map((n) => n.text)]).slice(0, 1400)); }
    { const CV3 = (await api('planCeoGet', { today: '2026-11-21' })).j, rT3 = (CV3.rows || []).find((r) => r.core === CT.target13000.core) || {}, FT = (await api('acctBillGet', { core: CT.target13000.core })).j.bill.money, KD2 = (await api('acctBillGet', { core: cDone })).j.bill.money;
      ok('CEO', 'ⓘ every profit or loss carries its basis, the same sentence on Finance and the CEO view (target over by $3,000: your 50% share $1,500, profit = fee − $1,500 = $3,100; the $2.99M project within budget: margin + unused reserves = $90,971.25)',
        rT3.pfWhy && rT3.pfWhy === FT.why && /over the target/.test(rT3.pfWhy) && /\$3,100\.00/.test(rT3.pfWhy) && rT3.why !== rT3.pfWhy && /within the project budget/.test(KD2.why) && /\$90,971\.25/.test(KD2.why), JSON.stringify([rT3.pfWhy, rT3.why, FT.why, KD2.why])); }
    // ⏱ earned schedule (hand-worked): two 10-day $1,000 labour tasks back to back from Mon 2 Nov 2026; on Fri 20 Nov the first is done and the second not started:
    //   the work done was planned to be done by Fri 13 Nov, so 5 working days behind (SPI 0.67)
    { const r = await api('planNewProject', { name: 'Lag check', client: 'Acme', program: 'Digital health' }); await api('planSave', { core: r.j.core, plan: { name: 'Lag check', start: '2026-11-02', phases: [{ id: 'ph1', name: 'Work' }],
        tasks: [{ id: 'a', phase: 'ph1', name: 'A', dur: 10, pred: [], res: [], unit: 'days', qty: 10, rate: 100, pct: 100, status: 'done', actual: 1000 }, { id: 'b', phase: 'ph1', name: 'B', dur: 10, pred: ['a'], res: [], unit: 'days', qty: 10, rate: 100, pct: 0, status: 'todo' }] } });
      const KL = (await api('acctBillGet', { core: r.j.core, today: '2026-11-20' })).j.bill.money;
      ok('Finance', '⏱ SPI in days (earned schedule): the work done was planned to be done by a date; the working days since then are how far behind', KL.lag && typeof KL.lag.days === 'number' && KL.lag.date && (KL.lag.ahead === false ? KL.lag.days >= 0 : true), JSON.stringify([KL.SPI, KL.lag])); }
    ok('Projects', '🔒 a planned project that started more than a week ago (even with a new record) cannot be deleted, not even by the super user', odOwn.status === 403 && odPm.status === 403, JSON.stringify([odOwn.status, odOwn.j.error, odPm.status]));
    ok('Projects', '🗄 a project in the Archived projects vault can only be deleted by the super user, and the delete stays in the audit register', vdCeo.status === 403 && vdOwn.status === 200 && vdReg, JSON.stringify([vdCeo.status, vdOwn.status, vdOwn.j.error, vdReg]));
    ok('Projects', '🗄 archive: needs a reason and a signature; only the super user, CEO or site administrator; leaves every list, is kept in the Project archive and comes back whole; a planned project in its first week can still be deleted',
      ar0.status === 400 && pmA.status === 403 && sa.status === 200 && ceoA.status === 200 && gone && arl.status === 200 && hit.archived && hit.archived.reason === 'Cancelled by the client' && hit.planned && pmL.status === 403 && back0.status === 400 && back.status === 200 && again && pmDel.status === 200 && ((await api('planArchiveList', {})).j.register || []).filter((e) => e.core === ac).map((e) => e.what).sort().join() === 'Archived,Brought back',
      JSON.stringify([ar0.status, pmA.status, sa.status, sa.j.error, ceoA.status, ceoA.j.error, gone, arl.status, hit, pmL.status, back.status, again, pmDel.status, pmDel.j.error]));
  }
    { const sd = (await api('sqlData', {})).j, P = ((sd.data || {}).projects || []), cv = (await api('planCeoGet', {})).j, rows = ((cv.view || cv).rows || []), bad = [];
      for (const r of rows) { const q = P.find((x) => x.job === r.core); if (!q) continue; const want = r.internal ? null : r.profit == null ? null : r.profit; if (!((want == null && q.forecast_profit == null) || Math.abs((q.forecast_profit || 0) - want) < 0.011)) bad.push(r.name + ' ' + q.forecast_profit + ' vs ' + want); }
      const fin = (await api('acctFinanceGet', {})).j.projects || [], billedF = fin.filter((x) => x.invoiced > 0.004).map((x) => x.core).sort(), billedQ = P.filter((x) => x.billed).map((x) => x.job).sort();
      ok('Reports', '💵 the AI query data says which projects are billed (invoices raised), as Finance shows, so "how many projects are billed" is answered from it', billedF.length >= 1 && JSON.stringify(billedF) === JSON.stringify(billedQ) && P.filter((x) => x.billed).every((x) => x.invoiced > 0 && x.invoices_count >= 1), JSON.stringify([billedF, billedQ, P.filter((x) => x.billed).map((x) => [x.project_name, x.invoiced, x.invoices_count, x.billed_pct, x.billing_status])]));
      const finAll = (await api('acctFinanceGet', {})).j, pastF = (finAll.projects || []).filter((x) => x.past && x.past.n > 0).map((x) => x.core).sort(), pastQ = P.filter((x) => x.billing_overdue_days > 0).map((x) => x.job).sort();
      ok('Reports', '⏰ the AI query data has the projects past their billing dates (milestones not invoiced after their date, overdue invoices), as Finance shows', pastF.length >= 1 && JSON.stringify(pastF) === JSON.stringify(pastQ), JSON.stringify([pastF, pastQ, P.filter((x) => x.billing_overdue_days > 0).map((x) => [x.project_name, x.milestones_past_billing_date, x.billing_overdue_days, x.unbilled_past_due_value])]));
      { const qk = P.find((x) => x.project_name === 'Quick check') || {}; ok('Reports', '📍 projects carry where they are (country, state, city from the location set on the plan), so "how many projects in Malaysia" can be answered', qk.country === 'Malaysia' && qk.state === 'Kedah' && /Alor Setar/.test(qk.city) && qk.country_code === 'MY', JSON.stringify([qk.location, qk.city, qk.state, qk.country, qk.country_code])); }
      { const pmX = P.filter((x) => x.project_manager); ok('Reports', '👤 projects carry the project manager (from the charter, else the project record), so "lowest CPI and its PM" needs no join', P.length > 0 && 'project_manager' in P[0] && 'project_sponsor' in P[0] && pmX.length >= 1, JSON.stringify(P.slice(0, 4).map((x) => [x.project_name, x.project_manager]))); }
      const lateBad = rows.filter((r) => { const q = P.find((x) => x.job === r.core); return q && r.baseline && q.days_late !== (r.slip || 0); }).map((r) => r.name);
      ok('Reports', '⏱ the AI query data has each project\'s delay as the CEO view shows it (days past the baseline, or the forecast past the planned finish), so "delayed more than N days" is answered from it', P.some((x) => x.delayed_days != null) && P.some((x) => x.delayed_days > 10) && !lateBad.length, JSON.stringify([lateBad, P.filter((x) => x.delayed_days != null).slice(0, 4).map((x) => [x.project_name, x.baseline_finish, x.days_late, x.forecast_days_late, x.delayed_days])]));
      ok('Reports', '💹 the AI query data has the same profit per project as the CEO view (forecast_profit, contract value and where it came from), so a profit question is answered from it', P.length > 3 && P.some((x) => x.forecast_profit != null && x.contract_from) && !bad.length, JSON.stringify([bad.slice(0, 5), P.slice(0, 2).map((x) => [x.project_name, x.forecast_profit, x.contract_from, x.contract_value])])); }
    // 🔎 one set of figures: for EVERY project, the plan, the CEO view and Finance (billing and the finance list) agree on
    //    % complete, budget, forecast cost, CPI, SPI and profit
    { const cv = (await api('planCeoGet', {})).j, rows = ((cv.view || cv).rows || []).filter((r) => !r.closed), fl = (await api('acctFinanceGet', {})).j.projects || [], bad = [];
      for (const r of rows) {
        const B = (await api('acctBillGet', { core: r.core })).j.bill, f = fl.find((x) => x.core === r.core);
        if (!B || !B.money) { const pg = await api('planGet', { core: r.core }); if (pg.status !== 200 || !pg.j || !('plan' in pg.j)) { bad.push(r.name + ': plan lookup failed (' + pg.status + ')'); continue; } if (!((pg.j.plan || {}).tasks || []).length) continue; bad.push(r.name + ': no billing record'); continue; }   // a project with no plan yet has nothing to bill
        if (!f) { bad.push(r.name + ': not in the Finance list'); continue; }   // a missing record fails the check (it is never compared with itself)
        const m = B.money;
        const want = [['% complete', r.pct, B.stand && B.stand.workPct], ['budget', r.budget, m.approved || m.budget], ['forecast', r.eac, m.eac], ['CPI', r.CPI, m.CPI], ['SPI', r.SPI, m.SPI],
          ['profit', r.internal ? null : r.profit, r.internal ? null : m.profit], ['finance list % complete', f.stand.workPct, B.stand.workPct], ['finance list not billed', f.stand.unbilled, B.stand.unbilled]];
        for (const [k, a, b] of want) if (!(a == null && b == null) && !(typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.011)) bad.push(r.name + ': ' + k + ' CEO ' + a + ' / Finance ' + b);
      }
      ok('Consistency', '🔎 every project (' + rows.length + '): the plan, the CEO view and Finance show the same % complete, budget, forecast cost, CPI, SPI and profit', rows.length > 5 && !bad.length, bad.slice(0, 12).join(' | ')); }
  // ---------- 🏗 BIM and construction files: an IFC model read into the take-off, the project started from it, the BOM drafted from the model ----------
  { const vm = await import('node:vm'), ctxB = { window: {} }; vm.createContext(ctxB); vm.runInContext(fs.readFileSync(path.join(SITE, 'admin/champ-bim.js'), 'utf8'), ctxB); const CB = ctxB.window.ChampBIM;
    const IFC = ["ISO-10303-21;", "HEADER;", "FILE_NAME('Tower.ifc','2026-11-01T10:00:00',('Arch'),('GKH'),'x','Autodesk Revit 2024 (ENU)','');", "FILE_SCHEMA(('IFC4'));", "ENDSEC;", "DATA;",
      "#1=IFCPROJECT('0a',$,'Harbour Tower',$,$,'Harbour Tower Stage 1','Construction',(#5),#6);", "#7=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);", "#8=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);",
      "#10=IFCSITE('0b',$,'Default',$,$,$,$,'Lot 12',.ELEMENT.,$,$,0.,$,#11);", "#11=IFCPOSTALADDRESS($,$,$,$,('1 Harbour St'),$,'Sydney','NSW','2000','Australia');", "#12=IFCBUILDING('0c',$,'Tower A',$,$,$,$,$,.ELEMENT.,$,$,$);",
      "#20=IFCBUILDINGSTOREY('0d',$,'Level 1',$,$,$,$,$,.ELEMENT.,3500.);", "#21=IFCBUILDINGSTOREY('0e',$,'Ground',$,$,$,$,$,.ELEMENT.,0.);",
      "#30=IFCWALL('w1',$,'Basic Wall:Generic - 200mm:1001',$,'Basic Wall:Generic - 200mm',$,$,'1001',.STANDARD.);", "#31=IFCWALL('w2',$,'Basic Wall:Generic - 200mm:1002',$,'Basic Wall:Generic - 200mm',$,$,'1002',.STANDARD.);",
      "#32=IFCDOOR('d1',$,'Single-Flush:900x2100:2001',$,$,$,$,'2001',2100.,900.,.DOOR.,$,$);", "#33=IFCSLAB('s1',$,'Floor:Concrete 200:3001',$,$,$,$,'3001',.FLOOR.);",
      "#40=IFCRELCONTAINEDINSPATIALSTRUCTURE('r1',$,$,$,(#30,#32),#21);", "#41=IFCRELCONTAINEDINSPATIALSTRUCTURE('r2',$,$,$,(#31,#33),#20);",
      "#50=IFCELEMENTQUANTITY('q1',$,'Qto_WallBaseQuantities',$,$,(#51,#52,#53));", "#51=IFCQUANTITYAREA('NetSideArea',$,$,10.5,$);", "#52=IFCQUANTITYVOLUME('NetVolume',$,$,2.1,$);", "#53=IFCQUANTITYLENGTH('Length',$,$,5000.,$);",
      "#54=IFCRELDEFINESBYPROPERTIES('r4',$,$,$,(#30,#31),#50);", "#58=IFCPROPERTYSET('p2',$,'Dimensions',$,(#59,#60));", "#59=IFCPROPERTYSINGLEVALUE('Area',$,IFCAREAMEASURE(120.),$);", "#60=IFCPROPERTYSINGLEVALUE('Volume',$,IFCVOLUMEMEASURE(24.),$);", "#61=IFCRELDEFINESBYPROPERTIES('r6',$,$,$,(#33),#58);",
      "#70=IFCMATERIAL('Concrete - Cast-in-Place',$,$);", "#77=IFCRELASSOCIATESMATERIAL('r9',$,$,$,(#33),#70);", "#80=IFCWALLTYPE('t1',$,'Basic Wall:Generic - 200mm',$,$,$,$,$,$,.STANDARD.);", "#81=IFCRELDEFINESBYTYPE('r10',$,$,$,(#30,#31),#80);",
      "#90=IFCCARTESIANPOINT((0.,0.,0.));", "ENDSEC;", "END-ISO-10303-21;"].join('\n');
    const R = CB._ifc('Tower.ifc', IFC), G = R.S.groups, wall = G.find((g) => g.cls === 'IFCWALL'), slab = G.find((g) => g.cls === 'IFCSLAB');
    ok('BIM', '🏗 an IFC model is read into levels, elements by type with their quantities (base quantities and Revit dimensions, millimetres converted) and materials', R.S.storeys.map((x) => x.name).join() === 'Ground,Level 1' && R.S.elements === 4 && wall && wall.n === 2 && wall.area === 21 && wall.len === 10 && slab && slab.area === 120 && slab.vol === 24 && slab.mats[0] === 'Concrete - Cast-in-Place' && /Sydney/.test(R.text) && /MODEL QUANTITY TAKE-OFF/.test(R.text) && /Work breakdown structure by level and trade/.test(R.text), JSON.stringify(G).slice(0, 400));
    const tl = CB._timeliner('tl.csv', 'Name,Planned Start,Planned End,Task Type\nExcavation,01/12/2026,15/12/2026,Construct');
    ok('BIM', '🗓 a Navisworks TimeLiner export is read as the schedule (tasks with their planned dates)', /CONSTRUCTION SCHEDULE/.test(tl || '') && /Excavation: planned 2026-12-01 to 2026-12-15/.test(tl || ''), String(tl).slice(0, 200));
    ok('BIM', '📦 Revit, Navisworks and AutoCAD files are kept as originals with a tip on what to export', CB.keepOnly('A.rvt') && CB.keepOnly('b.NWD') && CB.keepOnly('c.dwg') && !CB.keepOnly('d.ifc') && /IFC/.test(CB.tip('A.rvt')) && /TimeLiner/.test(CB.tip('b.nwd')) && /PDF/.test(CB.tip('c.dwg')));
    const st = await api('planDocStage', { name: 'Tower.ifc', pages: 0, text: R.text, kind: 'ifc' });
    const nb = await api('planNewProject', { name: 'BIM tower', client: 'Harbour Co', program: 'Digital health', docSid: st.j.sid, bom: true }), bcore = nb.j.core;
    await api('planSave', { core: bcore, plan: { name: 'BIM tower', start: d0(5), tasks: [{ id: 't1', name: 'Structure', dur: 10 }, { id: 't2', name: 'Walls', dur: 10, after: ['t1'] }] } });
    const dl = await api('intelDmsList', { core: bcore }), bdoc = ((dl.j && dl.j.docs) || []).find((d) => d.name === 'Tower.ifc');
    const bb = await (async () => { const id = 'qbom' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); await fetch(`${BASE}/.netlify/functions/planai-background`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', cookie }, body: JSON.stringify({ id, mode: 'bom', core: bcore }) });
      for (let i = 0; i < 40; i++) { const r = await api('planAiStatus', { id }); if (r.j.status === 'done' || r.j.status === 'error') return r.j; await sleep(250); } return {}; })();
    const sentB = JSON.stringify(LLMSEEN.bom || []);
    ok('BIM', '🧱 a project started from the model keeps it in Documents (Design) and the AI drafts the BOM / BOQ from the model take-off', st.status === 200 && nb.status === 200 && bdoc && bdoc.folder === 'design' && /model_quantities/.test(sentB) && /Basic Wall:Generic - 200mm/.test(sentB) && /from the model/.test(sentB), JSON.stringify([st.status, st.j.error, nb.status, bdoc && bdoc.folder, sentB.length, bb.status, bb.error]));
  }

  // ---------- 💰 money: contractors and project personnel see the work, not the money; their edits keep it ----------
  { const as = async (u, pw, fn) => { const keep = cookie; cookie = ''; await api('login', { username: u, password: pw }); try { return await fn(); } finally { cookie = keep; } };
    const L = (await api('planList', {})).j; const arr = L.plans || L.list || L, bt = arr.find((x) => x.name === 'Quick check') || {}, bcx = bt.core, bill0 = (arr.find((x) => x.name === 'Billing test') || {}).core;
    { const o = (await api('planGet', { core: bcx })).j.plan; o.tasks[0].rate = 123; o.tasks[0].qty = o.tasks[0].qty || 4; await api('planSave', { core: bcx, plan: o, rev: o.rev }); }
    const own0 = (await api('planGet', { core: bcx })).j.plan, paidRate = (own0.tasks || []).map((t) => t.rate || 0).reduce((a, b) => a + b, 0);
    const uc = (await api('userCreate', { user: { email: 'sub9@example.com', name: 'Con Tractor', password: 'Subpass2026x', role: 'Contractor' } })).j.user, us = await api('userSave', { user: { id: uc.id, name: 'Con Tractor', role: 'Contractor', projects: [bcx], active: true } });
    ok('Money', '👷 a contractor is given their project (the projects picked in Users and access are kept)', us.status === 200 && (us.j.user.projects || []).includes(bcx), JSON.stringify(us.j).slice(0, 300));
    const seen = await as('sub9@example.com', 'Subpass2026x', async () => { const me = (await api('me')).j, g = (await api('planGet', { core: bcx })).j, pl = g.plan;
      pl.tasks[0].name = pl.tasks[0].name + ' (site note)'; const sv = await api('planSave', { core: bcx, plan: pl, rev: pl.rev }); const bill = await api('acctBillGet', { core: bcx });
      return { money: me.money, rates: (pl.tasks || []).reduce((a, t) => a + (t.rate || 0), 0), cfg: !!pl.budgetCfg, hidden: pl.moneyHidden, saved: sv.status, savedRates: ((sv.j.plan || {}).tasks || []).reduce((a, t) => a + (t.rate || 0), 0), bill: bill.status }; });
    const own1 = (await api('planGet', { core: bcx })).j.plan, after = (own1.tasks || []).map((t) => t.rate || 0).reduce((a, b) => a + b, 0), me0 = (await api('me')).j;
    ok('Money', '💰 a contractor gets the plan without money (rates, budget settings), cannot open billing, and a save by them keeps the money as it was', bcx && paidRate > 0 && seen.money === false && seen.rates === 0 && !seen.cfg && seen.hidden === true && seen.saved === 200 && seen.savedRates === 0 && seen.bill === 403 && after === paidRate && /\(site note\)$/.test(own1.tasks[0].name) && me0.money === true, JSON.stringify([bcx, paidRate, after, seen]));
    const sub2 = await as('sub9@example.com', 'Subpass2026x', async () => {
      const bgRun = async (b) => { const id = 'qmon' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); const r = await fetch(`${BASE}/.netlify/functions/planai-background`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', cookie }, body: JSON.stringify({ id, ...b }) });
        if (r.status === 403) return { status: 403 }; for (let i = 0; i < 40; i++) { const x = await api('planAiStatus', { id }); if (x.j.status === 'done' || x.j.status === 'error') return x.j; await sleep(250); } return {}; };
      const bom = await bgRun({ mode: 'bom', core: bcx }), ask = await bgRun({ mode: 'intel', core: bcx, question: 'What does this project cost?' });
      const lst = (await api('planList', {})).j, ig = (await api('intelGet', { core: bcx })).j;
      return { bom: bom.status, ask: ask.status, listMoney: /"(BAC|CPI|EAC)"/.test(JSON.stringify(lst)), logMoney: (ig.log || []).some((e) => e.m !== 0) };
    });
    const seenAi = JSON.stringify(LLMSEEN.nomoney || []);
    ok('Money', '🧠 a contractor\'s Ask AI gets no costs (no budget, cost or earned value sent, told not to discuss money), money AI work is refused, lists carry no money', sub2.bom === 'error' && sub2.ask === 'done' && seenAi.length > 50 && !/budget_BAC|actual_cost|earned_value|forecast_EAC|\\"cost\\":/.test(seenAi) && !sub2.listMoney && !sub2.logMoney, JSON.stringify([sub2, seenAi.length, (seenAi.match(/budget_BAC|actual_cost|earned_value|forecast_EAC|\\"cost\\":/) || [])[0]]));
    const bg = (await api('acctBillGet', { core: bill0 })).j, inv = ((bg.bill || {}).milestones || []).find((m) => m.invoice);
    ok('Money', '🧾 each milestone carries its invoice with the issue and due dates (for the bill on the Gantt)', inv && 'due' in inv.invoice && 'issued' in inv.invoice, JSON.stringify(inv && inv.invoice));
  }

  // ---------- 🔏 the project audit trail ----------
  { const L = (await api('planList', {})).j.plans, qc = L.find((x) => x.name === 'Quick check').core;
    const o = (await api('planGet', { core: qc })).j.plan; o.tasks[0].pct = 50; o.risks = (o.risks || []).concat([{ id: 'raud1', title: 'Audit test risk', p: 2, i: 3, status: 'Open' }]); await api('planSave', { core: qc, plan: o, rev: o.rev });
    await api('intelDmsUpdate', { core: qc, id: 'none', set: { status: 'Draft' } });
    const g = (await api('planAuditGet', { core: qc })).j, pdf = (await api('planAuditPdf', { core: qc })).j, csv = (await api('planAuditCsv', { core: qc })).j, ct = Buffer.from(csv.file || '', 'base64').toString('utf8');
    const sub = await (async () => { const keep = cookie; cookie = ''; await api('login', { username: 'sub9@example.com', password: 'Subpass2026x' }); try { return (await api('planAuditGet', { core: qc })).status; } finally { cookie = keep; } })();
    ok('Audit', '🔏 every change to a project is in its audit trail (who, role, what, before and after), sealed in a hash chain, as PDF and CSV; not for contractors', g.n >= 1 && g.check && g.check.ok && g.recent.some((e) => (e.lines || []).some((l) => /% complete 0 -> 50|% complete \(blank\) -> 50/.test(l)) && e.role) && g.recent.some((e) => (e.lines || []).some((l) => /Risk added: "Audit test risk"/.test(l))) &&
      Buffer.from(pdf.file || '', 'base64').slice(0, 5).toString() === '%PDF-' && /Seq,When \(Sydney\)/.test(ct) && /Hash chain intact/.test(ct) && sub === 403, JSON.stringify([g.n, g.check, (g.recent || []).slice(0, 2), sub]).slice(0, 600));
  }

    // 🌳 the circuit tree: on the Features page, in Help (full screen, closes), and when you ask Champ for it. Browser checks: skipped (and said so) where Playwright is not installed
    const PW = await import('playwright').catch(() => import('/home/claude/.npm-global/lib/node_modules/playwright/index.mjs')).catch(() => null);
    if (!PW) console.log('SKIP  [Tree] [Inventory] browser checks: Playwright is not installed here');
    else { const { chromium } = PW; const br = await chromium.launch(); const u = new URL(BASE); try {
      const cx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const [k, v] = cookie.split(';')[0].split('='); await cx.addCookies([{ name: k, value: v, domain: u.hostname, path: '/' }]);
      const pg = await cx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); await pg.addInitScript(() => { try { sessionStorage.setItem('champIntroSeen', '1'); sessionStorage.setItem('champToday', '1'); } catch (e) {} });
      await pg.goto(BASE + '/champ-tree.html?embed=1'); await pg.waitForTimeout(1500);
      const tr = await pg.evaluate(() => ({ leaves: document.querySelectorAll('text.lbl.leaf').length, h1: getComputedStyle(document.querySelector('.head h1')).display }));
      await pg.goto(BASE + '/features.html'); await pg.waitForTimeout(800); const fe = await pg.evaluate(() => !!document.querySelector('.fx-treeapp iframe[src^="champ-tree.html"]'));
      await pg.goto(BASE + '/admin/#help'); await pg.waitForTimeout(5000); await pg.evaluate(() => { ['champIntro', 'tdy', 'champFitPop'].forEach((i) => { const x = document.getElementById(i); if (x) x.remove(); }); });
      const card = await pg.$('[data-tree]'); if (card) await card.click(); await pg.waitForTimeout(800);
      const opened = await pg.evaluate(() => !!document.querySelector('#treeFS iframe')); await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
      const closed = await pg.evaluate(() => !document.getElementById('treeFS'));
      await pg.evaluate(() => window.MBS.guide && window.MBS.guide.ask('open the circuit tree')); await pg.waitForTimeout(1200);
      const viaChamp = await pg.evaluate(() => !!document.querySelector('#treeFS')); await pg.click('#treeFS .tree-x'); await pg.waitForTimeout(200);
      const closed2 = await pg.evaluate(() => !document.getElementById('treeFS'));
      await pg.goto(BASE + '/admin/#help/features'); await pg.waitForTimeout(2500); const inv = await pg.evaluate(() => ({ big: (document.querySelector('.hc-big') || {}).textContent || '', rows: document.querySelectorAll('.hc-inv tbody tr').length, links: document.querySelectorAll('.hc-inv tbody a[href^="#help/"]').length }));
      await pg.goto(BASE + '/admin/#help'); await pg.waitForTimeout(1500); const invCard = await pg.evaluate(() => !!document.querySelector('a[href="#help/features"]'));
      ok('Inventory', '📋 Help › feature inventory: every Help article and its sections, plus the newer features, counted (107 key and 295 sub on 24 Nov 2026), each documented one linked to its article; a card on the Help home opens it',
        inv.rows >= 107 && new RegExp('\\b' + inv.rows + ' key features').test(inv.big) && Number((inv.big.match(/(\d+) sub-features/) || [])[1]) >= 295 && inv.links >= 85 && invCard, JSON.stringify([inv, invCard]));
      ok('Tree', '🌳 the circuit tree: on the Features page (its own heading there), a Help card opens it full screen, Esc and ✕ close it, and asking Champ "open the circuit tree" opens it',
        tr.leaves > 40 && tr.h1 === 'none' && fe && !!card && opened && closed && viaChamp && closed2 && !errs.length, JSON.stringify([tr, fe, !!card, opened, closed, viaChamp, closed2, errs]));
      // 🌿 Tree view and 📈 PERT chart on a project: left of WBS on the Gantt toolbar
      { const np = await api('planNewProject', { name: 'Tree view test', client: 'Northside Health', program: 'Digital health' }), tc = np.j.core, g0 = (await api('planGet', { core: tc })).j.plan || {}, ph = ((g0.phases || [])[0] || { id: 'p1' }).id;
        const st = (id, name, off, dur, done) => ({ id, name, off, dur, owner: 'Lee', done: !!done });
        const tasks = [{ id: 'tA', name: 'Kick-off', phase: ph, dur: 5, pred: [], res: [], owner: 'Sashi', pct: 100, status: 'done', subs: [{ id: 'sA1', name: 'Meeting', off: 0, dur: 2, owner: 'Ana', status: 'done', steps: [st('qA1', 'Book the room', 0, 1, 1), st('qA2', 'Send invites', 1, 1, 1)] }] },
          { id: 'tB', name: 'Design', phase: ph, dur: 10, pred: ['tA'], res: [], owner: 'Kim', pct: 20, status: 'doing', subs: [{ id: 'sB1', name: 'High level design', off: 0, dur: 6, owner: 'Kim', status: 'doing', steps: [st('qB1', 'Draft', 0, 3, 1), st('qB2', 'Review', 3, 3)] }] },
          { id: 'tC', name: 'Training', phase: ph, dur: 3, pred: ['tA'], res: [], owner: 'Ana', pct: 0, status: 'todo', subs: [] }, { id: 'tD', name: 'Go live', phase: ph, dur: 2, pred: ['tB', 'tC'], res: [], owner: 'Sashi', pct: 0, status: 'todo', subs: [] }];
        const sv = await api('planSave', { core: tc, rev: g0.rev, plan: { ...g0, start: '2027-01-04', tasks } });
        await pg.goto(BASE + '/admin/#plan/' + tc + '/schedule'); await pg.waitForTimeout(5000); await pg.evaluate(() => { ['champIntro', 'tdy', 'champFitPop'].forEach((i) => { const x = document.getElementById(i); if (x) x.remove(); }); });
        const order = await pg.evaluate(() => [...document.querySelectorAll('.pv-wbs .tab')].map((b) => b.textContent.trim()));
        await pg.click('.pv-wbs [data-treev]'); await pg.waitForTimeout(1200);
        const tv = await pg.evaluate(() => ({ fs: !!document.getElementById('pvFS') && Math.round(document.querySelector('#pvFS .tvx-svg').getBoundingClientRect().width / innerWidth * 100) >= 90, svg: !!document.querySelector('.tvx-svg'), keys: document.querySelectorAll('.tvx-key [data-k]').length, badges: document.querySelectorAll('.tvx .badge').length, crit: document.querySelectorAll('.tvx .cpl').length, water: document.querySelectorAll('.tvx .wat').length }));
        await pg.$eval('.tvx-key [data-k="t1"]', (b) => b.dispatchEvent(new MouseEvent('mouseenter'))); await pg.waitForTimeout(3200);
        const shown = await pg.evaluate(() => [...document.querySelectorAll('.tvx .badge.show text')].map((t) => t.textContent));
        await pg.$eval('[data-pvclose]', (b) => b.click()); await pg.waitForTimeout(600); await pg.click('.pv-wbs [data-pertv]'); await pg.waitForTimeout(1500);
        const pt = await pg.evaluate(() => ({ fs: !!document.getElementById('pvFS'), nodes: document.querySelectorAll('.ptx .node').length, crit: document.querySelectorAll('.ptx .node.crit').length, stats: document.querySelectorAll('.ptx-st').length, note: (document.querySelector('.ptx-note') || {}).textContent || '' }));
        await pg.$eval('.ptx .node[data-i="2"]', (g) => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await pg.waitForTimeout(300); await pg.fill('.ptx-ed [data-o]', '2'); await pg.fill('.ptx-ed [data-p]', '6'); await pg.click('.ptx-ed [data-sv]'); await pg.waitForTimeout(2500);
        const saved = ((await api('planGet', { core: tc })).j.plan.tasks || []).filter((t) => t.id === 'tC')[0] || {};
        const odds = await pg.evaluate(() => [...document.querySelectorAll('.ptx-st b')].map((b) => b.textContent));
        ok('TreeView', '🌿 Tree view and 📈 PERT on every project, left of WBS (PERT · Tree view · WBS), opening over the whole window and filling it: the tree has a limb per level 1 task, the critical path, water for work done, and on hover a status (Done · 100%, Under way · 50%); PERT shows early and late dates, float and the critical path, and saves optimistic and pessimistic estimates for the odds',
          sv.status === 200 && order.join('|') === '📈 PERT|🌿 Tree view|🌳 WBS' && tv.fs && tv.svg && tv.keys === 4 && tv.badges >= 5 && tv.crit > 0 && tv.water > 0 && shown.some((x) => /Under way · \d+%/.test(x)) &&
          pt.fs && pt.nodes === 4 && pt.crit === 3 && pt.stats === 5 && /estimates/.test(pt.note) && saved.estO === 2 && saved.estP === 6 && /%$/.test(odds[2] || '') && !errs.length, JSON.stringify([sv.status, order, tv, shown, pt, saved.estO, saved.estP, odds, errs]));
      }
      // 🌿 ESG & Sustainability and the 🌱 CSO view
      { const sm = await api('esgSample', {}), eid = sm.j.entity && sm.j.entity.id, g1 = (await api('esgGet', { id: eid })).j;
        const sv1 = await api('esgSave', { id: eid, rev: g1.entity.rev, patch: { carbon: { ...g1.entity.carbon, diesel: 600000 } } }), stale = await api('esgSave', { id: eid, rev: g1.entity.rev, patch: { carbon: { diesel: 1 } } });
        const bgE = async (b) => { const id = 'qesg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); await fetch(`${BASE}/.netlify/functions/planai-background`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', cookie }, body: JSON.stringify({ id, ...b }) });
          for (let i = 0; i < 60; i++) { const x = await api('esgAiStatus', { id }); if (x.j.status === 'done' || x.j.status === 'error') return x.j; await sleep(250); } return {}; };
        const ins = await bgE({ mode: 'esgInsight', esg: eid, pillar: 'env' }), stD = await bgE({ mode: 'esgDoc', esg: eid, kind: 'statement', lang: 'en' }), rpD = await bgE({ mode: 'esgDoc', esg: eid, kind: 'report', lang: 'en' });
        const g2 = (await api('esgGet', { id: eid })).j, cso = (await api('esgCso', {})).j;
        await pg.goto(BASE + '/admin/#esg/' + eid + '/overview'); await pg.waitForTimeout(4000); await pg.evaluate(() => { ['champIntro', 'tdy', 'champFitPop'].forEach((i) => { const x = document.getElementById(i); if (x) x.remove(); }); });
        const ov = await pg.evaluate(() => ({ menu: !!document.querySelector('.side-nav a[data-nav="esg"]') && !!document.querySelector('.side-nav a[data-nav="cso"]'), tiles: document.querySelectorAll('#esgTiles .kpi').length, groups: [...document.querySelectorAll('#planTabs .ptg-h')].map((x) => x.textContent), mx: document.querySelectorAll('.esg-mx .md').length }));
        await pg.goto(BASE + '/admin/#esg/' + eid + '/carbon'); await pg.waitForTimeout(1500); await pg.fill('#ef-carbon-petrol', '50000'); await pg.waitForTimeout(2500);
        const typed = (await api('esgGet', { id: eid })).j.entity.carbon.petrol;
        await pg.goto(BASE + '/admin/#esg/' + eid + '/avoid'); await pg.waitForTimeout(1200); const av = await pg.evaluate(() => document.querySelectorAll('.esg-av').length);
        await pg.goto(BASE + '/admin/#esg/' + eid + '/statement'); await pg.waitForTimeout(1500);
        const pdf = await pg.evaluate(async () => { const S = window.MBS.esg.state(), st = window.MBS.esg.statementDoc(S.docs.statement, 'en', 0), rp = window.MBS.esg.reportDoc(S.docs.report, 'en'); st.theme = rp.theme = 'forest';
          const a = await window.MBS.studio.pdf(st), b = await window.MBS.studio.pdf(rp), w = await window.MBS.studio.docx(rp); return { st: a.pages, rp: b.pages, w: w.blob.size, mock: JSON.stringify(st).includes('ESG-MOCK') }; });
        await pg.goto(BASE + '/admin/#cso'); await pg.waitForTimeout(2500); const cv = await pg.evaluate(() => ({ tiles: document.querySelectorAll('.pkpis .kpi').length, rows: document.querySelectorAll('.cso-tbl tbody tr').length, cal: document.querySelectorAll('.cso-cal li').length }));
        ok('ESG', '🌿 ESG & Sustainability (one menu item) and the 🌱 CSO view: a sample report scores and saves (a stale save is refused), the tabs run Setup · Environment · Social · Governance · Carbon avoidance · Reporting, typing saves by itself, Champ writes recommendations, a Sustainability Statement under 10 pages and a long ESG report as PDF and Word, and the CSO view rolls every report up with the reporting calendar',
          sm.status === 200 && g1.calc.em.total > 0 && g1.calc.avoid.total > 0 && sv1.status === 200 && stale.status === 409 && ins.esg && ins.esg.insight && ins.esg.insight.recs.length === 1 && stD.esg && stD.esg.ver === 1 && rpD.esg && rpD.esg.parts === 7 &&
          g2.entity.docs.length === 2 && g2.entity.insights.env && ov.menu && ov.tiles === 4 && ov.groups.join('|') === 'Setup|Environment|Social|Governance|Carbon avoidance|Reporting' && ov.mx > 5 && Number(typed) === 50000 && av === 4 &&
          pdf.st <= 10 && pdf.rp >= 25 && pdf.w > 20000 && pdf.mock && cso.rows.length >= 1 && cso.totals.total > 0 && cso.calendar.length > 0 && cv.tiles === 4 && cv.rows >= 1 && cv.cal > 0 && !errs.length,
          JSON.stringify([sm.status, g1.calc && g1.calc.em.total, sv1.status, stale.status, ins, stD.esg && stD.esg.ver, rpD.esg && rpD.esg.parts, ov, typed, av, pdf, cso.totals, cv, errs]).slice(0, 2500));
      }
    } finally { await br.close(); } }

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
