import { langCtx } from '../lib/ai.mjs';
// MBS admin console API.  POST /.netlify/functions/admin  { action, ... }   (JSON in, JSON out)
//                          GET  /.netlify/functions/admin?action=photo|export|backup ...
// Every action except "login" needs a valid session cookie. POSTs must carry the X-MBS-Admin header,
// which other websites cannot send, so nobody can trigger admin actions from another site.
import { env, clean } from '../lib/shared.mjs';
import * as J from '../lib/jobs.mjs';
import * as kv from '../lib/kv.mjs';
import * as VIS from '../lib/visitors.mjs';
import * as PGM from '../lib/programs.mjs';
import BUILD from '../lib/build-info.mjs';
import * as A from '../lib/admin-lib.mjs';
import { period } from '../lib/bot.mjs';
import { parseWhen, whenText } from '../lib/calendar.mjs';
import { tradeCode } from '../lib/store.mjs';
import { acctGet, acctPost } from '../lib/admin-acct.mjs';
import { sqlPost } from '../lib/admin-sql.mjs';
import { planPost, get as getPlan, setModule, forgetModules } from '../lib/plan.mjs';
import { myDay, myDayDone, seenGet, seenMark } from '../lib/myday.mjs';
import * as WCAL from '../lib/workcal.mjs';
import { invPost } from '../lib/inventory.mjs';
import { custPost } from '../lib/admin-cust.mjs';
import { planQuotePost } from '../lib/plan-quote.mjs';
import { subPost } from '../lib/subbies.mjs';
import { intelPost, upload as intelUpload } from '../lib/plan-intel.mjs';
import * as DOCI from '../lib/docingest.mjs';
import * as KB from '../lib/kb.mjs';
import * as R2 from '../lib/r2.mjs';
import { swmsPost } from '../lib/swms.mjs';
import { commsPost } from '../lib/comms.mjs';
import { reportPost } from '../lib/reports.mjs';
import * as U from '../lib/users.mjs';
import * as PPL from '../lib/people.mjs';
import * as SUB from '../lib/subbies.mjs';
// v91: who may sign in: a person in People, or a sub-contractor in Subbies
// a real Google OAuth client ID ends in .apps.googleusercontent.com; anything else (e.g. the site URL pasted by mistake) switches the button off
const gcid = () => { const v = env('GOOGLE_CLIENT_ID').trim().replace(/^["']|["']$/g, ''); if (v && !/\.apps\.googleusercontent\.com$/.test(v)) console.error('GOOGLE_CLIENT_ID is not an OAuth client ID (it should end in .apps.googleusercontent.com): Sign in with Google is off'); return /\.apps\.googleusercontent\.com$/.test(v) ? v : ''; };
const canIn = (pid, u) => (u && u.kind === 'email' ? true : u && u.kind === 'google' ? !!gcid() : u && u.kind === 'subbie' ? SUB.canLogin(u.subId) : PPL.canLogin(pid));   // v97: Google sign-ins only while the test site has it on
// v97: "Sign in with Google" on the test site. The Google ID token is checked with Google (tokeninfo): our client ID, a verified
// email, not expired. GOOGLE_ALLOWED (optional) limits it to some emails or @domains.
async function googleVerify(cred) {
  const id = gcid(); if (!id) return { error: 'Sign in with Google is not available here.', code: 403 };
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(String(cred || ''))) return { error: 'Google sign-in failed. Try again.' };
  let t;
  try { const r = await fetch((env('GOOGLE_TOKENINFO_URL').trim() || 'https://oauth2.googleapis.com/tokeninfo') + '?id_token=' + encodeURIComponent(cred), { signal: AbortSignal.timeout(8000) }); if (!r.ok) return { error: 'Google did not accept that sign-in. Try again.' }; t = await r.json(); }
  catch { return { error: 'Could not reach Google to check the sign-in. Try again.' }; }
  if (t.aud !== id || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || !(t.email_verified === true || t.email_verified === 'true') || Number(t.exp) * 1000 < Date.now()) return { error: 'Google sign-in failed. Try again.' };
  const email = String(t.email || '').toLowerCase(), allow = env('GOOGLE_ALLOWED').split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.some((a) => (a.startsWith('@') ? email.endsWith(a) : email === a))) return { error: 'This Google account is not allowed on this site. Ask GKH for access.', code: 403 };
  return { email, name: String(t.name || '').slice(0, 100) };
}
// 🧾 the archived-projects audit register: every archive, bring-back and permanent delete, kept for good (even when the project is gone)
const logArchive = (ev) => kv.update('archive-register', (x) => ({ list: [...((x && x.list) || []), ev].slice(-5000) }), () => ({ list: [] }));
const projectOf = async (code) => { const j = await J.find(code); return j && (await getPlan(j.core)) ? { core: j.core, ref: J.refFor(j), name: j.name } : null; };
import { bomPost } from '../lib/bom.mjs';
import { prlPost } from '../lib/payroll.mjs';
import { lvPost } from '../lib/leave.mjs';
import * as ACC from '../lib/accounts.mjs';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
// 🔏 a change to a project, in words, for its audit trail
const AUDIT_SKIP = /(Get|List|Status|Search|File|Pdf|Csv|Preview|Ping|Stage|Usage|Check|Board|Tree|Url|Alerts|Seen|Info|Defaults)$|^(planR2Upload|kbR2Upload|planR2Put)$/;
const AUDIT_LABEL = { intelUpload: ['Documents', 'Document uploaded'], intelDocDelete: ['Documents', 'Document deleted'], intelDmsUpdate: ['Documents', 'Document details changed'], intelDocPutFile: ['Documents', 'Original file stored'],
  intelCrRecord: ['Change control', 'Change request decision recorded'], intelClear: ['Ask AI', 'Ask AI history cleared'], acctBillSave: ['Billing', 'Billing (contract value, milestone shares) saved'], acctBillRaise: ['Billing', 'Invoice raised from a milestone'],
  acctVoRaise: ['Billing', 'Variation order raised'], acctVoDecide: ['Billing', 'Variation order decided'], planR2Put: ['Documents', 'File stored'], planDelete: ['Project', 'Plan deleted'], planArchive: ['Project', 'Project archived'], planUnarchive: ['Project', 'Project brought back'],
  planModules: ['Project', 'Modules switched'], planNewProject: ['Project', 'Project created'], planBaseFiles: ['Baseline', 'Baseline files made'], planBomSign: ['BOM / BOQ', 'BOM / BOQ signed off'] };
async function auditAction(action, body, ctx, by, res0) {
  if (!ctx || action === 'planSave' || action === 'planGet' || AUDIT_SKIP.test(action) || !/^(plan|intel|acct|swms|lesson|vault)/.test(action)) return;
  const core = String((body && (body.core || (body.plan && body.plan.core))) || (res0 && res0.core) || '').slice(0, 40); if (!core) return;
  const lab = AUDIT_LABEL[action] || ['Project', action.replace(/^(plan|intel|acct)/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())];
  const det = []; for (const k of ['name', 'title', 'id', 'docId', 'tid', 'outcome', 'status', 'amount', 'reason', 'note', 'vnote']) { const v = body[k]; if (v != null && v !== '' && typeof v !== 'object') det.push(k + ': ' + String(v).slice(0, 200)); }
  if (body.set && typeof body.set === 'object') det.push('set: ' + JSON.stringify(body.set).slice(0, 300));
  await (await import('../lib/paudit.mjs')).record(core, { who: ctx.who || by, name: ctx.name, role: ctx.owner ? 'Super user' : ctx.role, ip: ctx.ip, kind: lab[0], what: lab[1], lines: det });
}
const MONEY_KEYS = new Set(['extra', 'extra_cost', 'forecast_cost_EAC', 'approved_budget', 'budget_BAC', 'spent_AC', 'spent', 'BAC', 'PV', 'EV', 'AC', 'ACin', 'EVin', 'ACest', 'CPI', 'CPIx', 'EAC', 'ETC', 'VAC', 'TCPI', 'split', 'budget', 'cost', 'costs', 'rate', 'price', 'amount', 'money', 'profit', 'margin', 'contract', 'contractValue', 'invoiced', 'received', 'owed', 'bomx', 'bomLoose', 'budgetCfg', 'bom', 'bomBase', 'bomRevs', 'forecastCost', 'forecast_cost', 'actual', 'actualCost', 'basis', 'b0', 'b1', 'BACbase']);
function scrubMoney(v, d = 0) { if (d > 30 || v == null || typeof v !== 'object') return v; if (Array.isArray(v)) return v.map((x) => scrubMoney(x, d + 1)); const o = {}; for (const [k, x] of Object.entries(v)) if (!MONEY_KEYS.has(k)) o[k] = scrubMoney(x, d + 1); return o; }
const out = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...H, ...extra } });
const bad = (msg, status = 400) => out(status, { error: msg });
const num = (x) => { const n = Number(String(x ?? '').replace(/[$,\s]/g, '').replace(/k$/i, '000')); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const storeOk = (s) => A.BROWSABLE.includes(s);

async function jobFull(input) {
  const job = await J.find(input);
  if (!job) return null;
  job.ref = J.refFor(job);
  return job;
}

// timing headers: how long the server itself took, and whether this was a fresh ("cold") copy of the function
let served = 0;
// GKH Project Champ: remember every build that goes live (build number, commit, deploy id), newest first
let buildSeen = false;
async function registerBuild() {
  if (buildSeen) return; buildSeen = true;
  const id = BUILD.deployId || BUILD.commit || 'local-' + BUILD.build;
  try {
    await kv.update('champ-builds', (cur) => {
      const list = ((cur && cur.list) || []).filter((x) => x.id !== id);
      const old = ((cur && cur.list) || []).find((x) => x.id === id);
      list.unshift({ id, build: BUILD.build, version: BUILD.version, label: `${BUILD.version}.${BUILD.build}`, commit: BUILD.commit || '', subject: BUILD.subject || '', branch: BUILD.branch || '',
        deployId: BUILD.deployId || '', context: BUILD.context || '', site: BUILD.site || '', builtAt: BUILD.builtAt || '', liveSince: (old && old.liveSince) || Date.now() });
      return { list: list.slice(0, 500) };
    }, () => ({ list: [] }));
  } catch (e) { buildSeen = false; console.log('build registry: ' + e.message); }
}

// 🔐 the sign-in log (Visitors > Sign-ins): who, how, from which address and place, on what device
function signLog(req, context, e) {
  const g = VIS.geoOf(context, req);
  const p = VIS.logSignIn({ ...e, ip: A.clientIp(req), ...g, device: VIS.device(req.headers.get('user-agent')) }).catch((x) => console.log('sign-in log failed: ' + x.message));
  return p;   // awaited: a write left running after the answer can be cut off
}
export default async (req, context) => {
  const t0 = Date.now(), first = served++ === 0;
  const lg = String(req.headers.get('x-champ-lang') || '').slice(0, 5).toLowerCase();   // 🌐 the console language: the AI writes in it
  const res = await langCtx.run(/^[a-z]{2}$/.test(lg) ? lg : 'en', () => handle(req, context));
  try { res.headers.set('Server-Timing', `app;dur=${Date.now() - t0}`); res.headers.set('X-MBS-Start', first ? 'cold' : 'warm'); } catch {}
  return res;
};

async function handle(req, context) {
  A.setDefer(context && typeof context.waitUntil === 'function' ? (p) => context.waitUntil(p) : null);
  try {
    await A.ensureSecret();   // Project Champ: the key that signs sessions
    await registerBuild();    // Project Champ: the build registry (once per server start)
    const url = new URL(req.url);

    // ---------- downloads (GET, cookie only) ----------
    if (req.method === 'GET') {
      const who = A.readSession(req);
      if (!who) return bad('Please log in', 401);
      const action = url.searchParams.get('action');
      const gctx = await U.context(who, '', canIn);   // v86: Users & access
      if (!gctx) return bad('Please log in', 401);
      if (action === 'ics') {   // 📱 ⏰ Remind me: a calendar file the phone opens in Apple Calendar / its calendar app, with an alert at the time
        const T = (k, n) => String(url.searchParams.get(k) || '').replace(/[\r\n]+/g, ' ').slice(0, n), st = T('start', 16);
        if (!/^\d{8}T\d{6}Z$/.test(st)) return bad('Pick a time for the reminder.', 400);
        const e = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,'), d0 = new Date(Date.UTC(+st.slice(0, 4), +st.slice(4, 6) - 1, +st.slice(6, 8), +st.slice(9, 11), +st.slice(11, 13)));
        const z = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), link = T('link', 160), href = new URL(/^\/admin\/[\w#%/.-]*$/.test(link) ? link : '/admin/', url.origin).href;
        const fold = (l) => l.match(/.{1,70}/g).join('\r\n ');
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GKH//Project Champ//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:champ-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '@gkhpmo.com',
          'DTSTAMP:' + z(new Date()), 'DTSTART:' + z(d0), 'DTEND:' + z(new Date(d0.getTime() + 15 * 60000)), 'SUMMARY:' + e(T('title', 140) || 'Project Champ reminder'), 'DESCRIPTION:' + e(T('desc', 400) + ' Open: ' + href), 'URL:' + href,
          'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(T('title', 140) || 'Project Champ reminder'), 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
        return new Response(ics, { status: 200, headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="champ-reminder.ics"', 'Cache-Control': 'no-store' } });
      }
      if (action === 'pdf' && U.isLead(gctx)) {   // 🧾 a delivery lead: the PDF of an invoice on one of their own client projects (checked per invoice)
        const id = String(url.searchParams.get('id') || ''), d = ACC.kindFromId(id) === 'invoice' ? await ACC.get(id).catch(() => null) : null, BL = await import('../lib/billing.mjs');
        if (!d || !d.core || !(await BL.canSee(gctx, d.core))) return bad('Only invoices on your own client projects.', 403);
        const g = await acctGet(action, url); return g || bad('Not found', 404);
      }
      if (gctx.scope) return bad('Not available to sub-contractor logins.', 403);   // v91
      const gmod = action === 'photo' || action === 'export' ? 'job' : action === 'backup' ? 'dataDelete' : action === 'voucherPdf' ? 'promoList' : action === 'payslipPdf' ? 'prlRuns' : 'acctReport';
      const gok = U.allows(gctx, gmod); if (!gok.ok) return bad(gok.error, 403);
      if (action === 'photo') {
        const st = url.searchParams.get('store') || A.LIVE, k = url.searchParams.get('key') || '';
        if (!storeOk(st) || !/^(photo|receipt):/.test(k)) return bad('Not found', 404);
        const p = await A.getPhoto(st, k);
        return p ? new Response(p.buf, { status: 200, headers: { 'Content-Type': p.type, 'Cache-Control': 'private, max-age=3600' } }) : bad('Not found', 404);
      }
      if (action === 'export') {
        const jobs = await J.all();
        const full = await Promise.all(jobs.map((j) => J.find(j.core)));
        return new Response(J.csv(full.filter(Boolean).map((j) => ({ ...j, ref: J.refFor(j) }))), { status: 200, headers: {
          'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="mbs-jobs-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
      }
      if (action === 'backup') {
        const st = url.searchParams.get('store') || A.LIVE;
        if (!storeOk(st)) return bad('Not found', 404);
        const rows = await A.listKeys(st), data = {};
        for (const r of rows) data[r.key] = await A.getValue(st, r.key);
        return new Response(JSON.stringify({ store: st, at: new Date().toISOString(), data }, null, 1), { status: 200, headers: {
          'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${st}-backup-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' } });
      }
      if (action === 'payslipPdf') {   // v107: a payslip as a PDF
        const PR = await import('../lib/payroll.mjs'), PS = await import('../lib/payslip-pdf.mjs');
        const run = await PR.getRun(url.searchParams.get('run') || ''), l = run && run.lines.find((x) => x.pid === url.searchParams.get('pid'));
        if (!l) return bad('Payslip not found', 404);
        const buf = await PS.payslipPdf(run, l);
        return new Response(buf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${url.searchParams.get('view') ? 'inline' : 'attachment'}; filename="Payslip-${run.id}-${l.name.replace(/[^A-Za-z0-9]+/g, '-')}.pdf"`, 'Cache-Control': 'no-store' } });
      }
      const g = await acctGet(action, url);
      return g || bad('Unknown request', 404);
    }

    if (req.method !== 'POST') return bad('Method not allowed', 405);
    if (req.headers.get('x-mbs-admin') !== '1') return bad('Forbidden', 403);
    let body = {};
    try { body = await req.json(); } catch { return bad('Bad request'); }
    const action = String(body.action || '');

    // ---------- login / logout ----------
    if (action === 'login') {
      if (!A.adminReady()) return bad('The admin console is not set up yet: the session key could not be made.', 503);
      const ip = A.clientIp(req);
      const { wait, had } = await A.loginCheck(ip);
      if (wait) return bad(`Too many wrong attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.`, 429);
      const owner = A.checkPassword(body.username, body.password);
      const usr = owner ? null : await U.login(body.username, body.password, canIn);   // v86: a user from Users & access
      if (!owner && !usr) {
        const left = await A.noteFailure(ip);
        await signLog(req, context, { ok: false, method: 'Password', user: body.username, email: /@/.test(String(body.username || '')) ? body.username : '', note: 'Wrong username or password' });
        return bad(left ? `Wrong username or password (${left} tr${left > 1 ? 'ies' : 'y'} left).` : 'Too many wrong attempts. Locked for 15 minutes.', 401);
      }
      if (had) await A.later(A.clearFailures(ip));
      let pc = '';
      if (usr && usr.kind === 'subbie') {   // v91: a sub-contractor signs in to one of their projects, by its project code
        const code = String(body.project || '').trim();
        if (!code) return out(200, { needProject: true });
        const j = await J.find(code);
        if (!j || !(usr.projects || []).includes(j.core)) {
          const left = await A.noteFailure(ip);
          return bad(left ? 'That project code is not one of your projects. Check it with MBS.' : 'Too many wrong attempts. Locked for 15 minutes.', 401);
        }
        pc = j.core;
      }
      if (usr) {
        await A.audit(usr.username, 'Logged in (' + usr.role + (pc ? ', project ' + pc : '') + ')');
        await signLog(req, context, { ok: true, method: 'Password', user: usr.username, email: usr.email || (/@/.test(usr.username) ? usr.username : ''), name: usr.name, role: usr.role + (pc ? ', project ' + pc : '') });
        return out(200, { ok: true, user: usr.username, name: usr.name, mustChange: !!usr.mustChange, project: pc }, { 'Set-Cookie': A.sessionCookie(req, A.makeSession(usr.username, Date.now(), { uid: usr.id, v: usr.ver || 0, pc })) });
      }
      const user = A.ownerName();
      await A.audit(user, 'Logged in');
      await signLog(req, context, { ok: true, method: 'Password', user, email: env('OWNER_EMAIL', 'ceo@gkhconsultancy.com'), name: env('OWNER_NAME', 'Sashi Kumar Sivam'), role: 'Super user' });
      return out(200, { ok: true, user }, { 'Set-Cookie': A.sessionCookie(req, A.makeSession(user)) });
    }
    if (action === 'logout') return out(200, { ok: true }, { 'Set-Cookie': A.clearCookie(req) });
    if (action === 'loginOptions') return out(200, { google: gcid() });   // v97: the sign-in page asks
    if (action === 'loginGoogle') {   // v97
      if (!A.adminReady()) return bad('The admin console is not set up yet.', 503);
      const ip = A.clientIp(req), { wait } = await A.loginCheck(ip);
      if (wait) return bad(`Too many attempts. Try again in ${wait} minute${wait > 1 ? 's' : ''}.`, 429);
      const g = await googleVerify(body.credential);
      if (g.error) { await A.noteFailure(ip); await signLog(req, context, { ok: false, method: 'Google', note: g.error }); return bad(g.error, g.code || 401); }
      const u = await U.googleUser(g.email, g.name, 'Google sign-in');
      if (!u) return bad('Google sign-in failed. Try again.', 401);
      if (u.clash) return bad('This email already has a staff login: sign in with your username and password.', 409);
      if (u.disabled) return bad('Your Google sign-in has been switched off. Ask GKH.', 403);
      await A.audit(u.username, 'Signed in with Google (view only)');
      await signLog(req, context, { ok: true, method: 'Google', user: u.username, email: g.email, name: u.name || g.name, role: 'Google (view only)' });
      return out(200, { ok: true, user: u.username, name: u.name }, { 'Set-Cookie': A.sessionCookie(req, A.makeSession(u.username, Date.now(), { uid: u.id, v: u.ver || 0 })) });
    }

    const session = A.readSession(req);
    if (!session) return bad('Please log in', 401);
    const ctx = await U.context(session, '', canIn);   // v86: Users & access: who this is and what they can use
    if (ctx) ctx.ip = A.clientIp(req);   // 🔏 for the project audit trail
    if (!ctx) return out(401, { error: 'Your access has changed or ended. Please sign in again.' }, { 'Set-Cookie': A.clearCookie(req) });
    const who = session.u, by = `Admin (${who})`;
    if (ctx.mustChange && !['me', 'userPassword'].includes(action)) return bad('Set your own password first.', 403);
    const ok = U.allows(ctx, action);
    if (!ok.ok) return bad(ok.error, 403);
    const sc = U.scopeCheck(ctx, action, body);   // v91: a sub-contractor: their own project only
    if (!sc.ok) return bad(sc.error, 403);
    if (ctx.scope) body.onlyCores = ctx.scope; else delete body.onlyCores;
    // 🗺 a Program manager: their programs only. Checks before the action; new programs they make become theirs; people filtered after
    let pgmBefore = null;
    if (ctx.pgm) {
      const g = ctx.pgm, low = g.names.map((n) => n.toLowerCase()), mine = (v) => g.ids.includes(String(v || '')) || low.includes(String(v || '').trim().toLowerCase());
      body.onlyProgs = g.names;
      const all = await PGM.list(), known = (v) => all.some((p) => p.id === String(v || '') || p.name.toLowerCase() === String(v || '').trim().toLowerCase());
      if (g.kind === 'project' && ['planProgramSave', 'planProgramDelete'].includes(action)) return bad('Programs are looked after by program managers and PMO Directors.', 403);
      if (action === 'planProgramSave' && body.id && !mine(body.id)) return bad('That program is not one of yours.', 403);
      if (action === 'planProgramSave' && !body.id && !String(body.manager || '').trim()) body.manager = ctx.name;   // a program they make: they manage it
      if (action === 'planProgramDefaults' && known(body.name) && !mine(body.name)) return bad('That program is not one of yours.', 403);
      if ((action === 'planProgramMove' || action === 'planProgramSet') && known(body.id || body.program) && !mine(body.id || body.program)) return bad('You can move a project only into one of your programs.', 403);
      if (action === 'planNewProject' && known(body.program) && !mine(body.program)) return bad('Choose one of your programs (or type a new program name).', 403);
      if (action === 'planDepSave' && !(ctx.scope.includes(String(body.from || '')) && ctx.scope.includes(String(body.to || '')))) return bad('Both projects must be in your programs.', 403);
      if (action === 'planDepDelete') { const ids = [].concat(body.ids || body.id || []).map(String), D = await PGM.deps(); if (D.some((d) => ids.includes(String(d.id)) && !(ctx.scope.includes(d.from) && ctx.scope.includes(d.to)))) return bad('That link is not between your projects.', 403); }
      if (g.kind === 'program' && ['planProgramSave', 'planProgramSet', 'planNewProject'].includes(action)) pgmBefore = new Set(all.map((p) => p.id));
    }
    if (action === 'userPassword') {
      const r = await U.userPost(action, body, { ctx, audit: A.audit, person: PPL.get, project: (c) => J.find(c).catch(() => null) });   // the projects a contractor or project personnel login is given
      if (r.status !== 200) return r;
      const j = await r.json();
      return out(200, { ok: true }, { 'Set-Cookie': A.sessionCookie(req, A.makeSession(j.name, Date.now(), { uid: j.uid, v: j.v, pc: session.pc })) });
    }

    // 🔗 a person's Role is their login's role: saving People keeps it
    const loginOf = (L, p) => p && L.find((u) => u.kind !== 'google' && u.kind !== 'subbie' && (u.personId === p.id || (p.email && String(u.email || u.username || '').toLowerCase() === String(p.email).toLowerCase())));
    if (action === 'pplSave' && body.person) { const lu = loginOf(await U.list(), body.person); if (lu) body.person.role = lu.role; }
    let res = await (async () => { switch (action) {
      case 'me': return out(200, { sampleDue: ctx.owner && !ctx.scope ? !(await kv.get('sample-portfolio').catch(() => true)) : false, build: { label: `${BUILD.version}.${BUILD.build}`, build: BUILD.build, commit: (BUILD.commit || '').slice(0, 7) }, test: PPL.isTest(), user: who, name: ctx.name, expires: session.exp, owner: ctx.owner, r2: R2.ready(), role: ctx.role, money: U.seesMoney(ctx), mods: ctx.mods, mustChange: !!ctx.mustChange, personId: ctx.personId || '', kind: ctx.kind || '', scope: ctx.pgm ? null : ctx.scope || null, pgm: ctx.pgm ? { kind: ctx.pgm.kind, programs: ctx.pgm.names, projects: ctx.pgm.cores.length } : null, subId: ctx.subId || '', modules: U.MODS.map((m) => ({ key: m[0], name: m[1] })) });

      // 📍 Location: search a place (countries and states offline, towns from OpenStreetMap), and its weekend and public holidays
      case 'planPlacesGet': return out(200, { places: await WCAL.places(clean(body.q, 60)) });
      case 'planHolidaysGet': { const cc = clean(body.cc, 2).toUpperCase(), st = clean(body.st, 24), pl = WCAL.placeOf(cc, st, clean(body.place, 120));
        if (!WCAL.countryName(cc)) return bad('Pick a place from the list.');
        const y0 = Math.max(2000, Math.min(2100, +body.from || new Date().getUTCFullYear())), y1 = Math.max(y0, Math.min(y0 + 12, +body.to || y0));
        return out(200, { ...pl, hols: WCAL.holidays(cc, pl.st, y0, y1), from: y0, to: y1 }); }   // the years actually loaded
      // 🎯 Today: the start screen (only what is linked to you), and ✓ done / resolve from it
      case 'planMyDayGet': return out(200, await myDay(ctx, body));
      // 🔒 the Finance vault: Program → Project → Contracts / Billing / Invoices / Documents (netlify/lib/vault.mjs checks who may open and file)
      case 'vaultTree': case 'vaultSearch': case 'vaultList': case 'vaultUrl': case 'vaultAdd': case 'vaultFile': case 'vaultDelete': case 'vaultMoveIn': {
        if ((ctx.scope && !(ctx.pgm && ctx.pgm.kind === 'project')) || ctx.kind === 'google' && !['CEO', 'CFO', 'PMO Director', ...U.DELIVERY].includes(ctx.role)) return bad('The Finance vault is not open to this login.', 403);
        const V = await import('../lib/vault.mjs'), core = String(body.core || '').slice(0, 40);
        const r = action === 'vaultTree' ? await V.tree(ctx) : action === 'vaultSearch' ? await V.search(ctx, body) : action === 'vaultList' ? await V.list(ctx, core) : action === 'vaultUrl' ? await V.uploadUrl(ctx, body) : action === 'vaultAdd' ? await V.add(ctx, body, by)
          : action === 'vaultFile' ? await V.file(ctx, core, String(body.id || '').slice(0, 24)) : action === 'vaultDelete' ? await V.remove(ctx, core, String(body.id || '').slice(0, 24)) : await V.moveIn(ctx, by);
        if (r.error) return bad(r.error, r.code || 400);
        if (action === 'vaultAdd') await A.audit(who, `Finance vault: ${r.file.name} filed in ${r.file.folder} on ${core}${r.copy && r.copy.id ? ' (redacted copy for the team)' : ''}`);
        if (action === 'vaultDelete') await A.audit(who, `Finance vault: a file deleted on ${core}`);
        if (action === 'vaultMoveIn') await A.audit(who, `Finance vault: ${r.moved} contract(s) moved in from the project documents`);
        if (action === 'vaultFile') await A.audit(who, `Finance vault: opened a file on ${core}`);
        return out(200, r);
      }
      // 💵 milestone billing and the Finance screen (the CFO's; accounts access: view to look, edit to raise and record)
      case 'acctFinanceGet': { const B = await import('../lib/billing.mjs'), cores = await B.billCores(ctx); if (cores && !cores.size) return bad('Finance is for the CEO, the CFO, program directors and project managers on their own projects.', 403); return out(200, await B.finance(new Date().toISOString().slice(0, 10), cores)); }
      case 'acctBillGet': { const B = await import('../lib/billing.mjs'), core = String(body.core || '').slice(0, 40), canVo = await B.canDecideVO(ctx, core); if (!(await B.canSee(ctx, core))) return bad('Only the CEO, the CFO, the program director and this project\'s manager can see its billing.', 403); const r = await B.billFor(core, new Date().toISOString().slice(0, 10)); return r.error ? bad(r.error, r.code || 400) : out(200, { ...r, canDecideVO: canVo, canRaiseVO: !ctx.scope || U.isLead(ctx), canRaise: (!ctx.scope && (ctx.owner || ctx.role === 'CFO')) || (U.isLead(ctx) && ctx.scope.includes(core)) }); }
      case 'acctVoRaise': { const B = await import('../lib/billing.mjs'), core = String(body.core || '').slice(0, 40); if ((ctx.scope && !(ctx.pgm && ctx.pgm.kind === 'project')) || !(await B.canSee(ctx, core))) return bad('Only the CEO, the CFO, the program director or the project manager can raise a variation order.', 403); const r = await B.raiseVO(core, body, ctx, new Date().toISOString().slice(0, 10)); return r.error ? bad(r.error, r.code) : out(200, r); }
      case 'acctVoDecide': { const B = await import('../lib/billing.mjs'), core = String(body.core || '').slice(0, 40); if (!(await B.canSee(ctx, core))) return bad('Finance is for the CEO, the CFO, the program director and the project manager.', 403); const r = await B.decideVO(core, String(body.id || ''), body.outcome, body.note, ctx); return r.error ? bad(r.error, r.code) : out(200, r); }
      case 'acctBillAlerts': { const B = await import('../lib/billing.mjs'); return out(200, await B.alerts(ctx, new Date().toISOString().slice(0, 10))); }
      case 'acctBillSave': { if (ctx.scope || !(ctx.owner || ctx.role === 'CFO')) return bad('Finance is for the CFO and the CEO.', 403); const B = await import('../lib/billing.mjs'); const r = await B.saveBill(String(body.core || '').slice(0, 40), body, by); if (r.error) return bad(r.error, r.code || 400); await A.audit(who, `Billing set for ${body.core}: contract ${r.bill.contract}, ${Object.keys(r.bill.ms).length} milestone(s)`); return out(200, r); }
      case 'acctBillRaise': { const B = await import('../lib/billing.mjs'), rc = String(body.core || '').slice(0, 40);   // 🧾 the CFO, or a delivery lead (Project manager, Scrum Master, Product Owner) on a client project of their own
        if (!((!ctx.scope && (ctx.owner || ctx.role === 'CFO')) || (U.isLead(ctx) && ctx.scope.includes(rc) && (await B.canSee(ctx, rc))))) return bad('Invoices are raised by the CFO, or by the project manager, Scrum Master or Product Owner of this project.', 403); const r = await B.raise(String(body.core || '').slice(0, 40), String(body.tid || '').slice(0, 24), by, new Date().toISOString().slice(0, 10)); if (r.error) return bad(r.error, r.code || 400); await A.audit(who, `${r.id} raised for a milestone on ${body.core}`); return out(200, r); }
      case 'planCeoBriefPdfGet': {   // 📄 Champ's briefing as a PDF note
        if (ctx.scope || !(ctx.owner || ['CEO', 'CFO', 'PMO Director', 'Project manager'].includes(ctx.role))) return bad('The CEO view is for the CEO, the CFO and PMO Directors.', 403);
        const CEO = await import('../lib/ceo.mjs'), r = await CEO.briefPdf(); return r.error ? bad(r.error, 404) : out(200, r);
      }
      // 🌿 ESG & Sustainability: reporting entities (an organisation and its reporting year), their E, S and G data, scores, standards and the AI-written documents (netlify/lib/esg.mjs). Open to every signed-in user.
      case 'esgSchema': { const E = await import('../lib/esg.mjs'); return out(200, { sections: E.SECTIONS, industryGroups: E.INDUSTRY_GROUPS, countries: (await import('../lib/countries.mjs')).COUNTRIES, countryStd: (await import('../lib/countries.mjs')).COUNTRY_STD, globalStd: (await import('../lib/countries.mjs')).GLOBAL_STD, ownIssb: (await import('../lib/countries.mjs')).OWN_ISSB_CODES, countryFset: Object.fromEntries((await import('../lib/countries.mjs')).COUNTRIES.map((c) => [c[0], E.fsetFor(c[0])])), achAreas: E.ACH_AREAS, achStatus: E.ACH_STATUS, achPillars: E.ACH_PILLARS, stdGroups: E.STD_GROUPS, standards: E.STANDARDS, topics: E.TOPICS, factorSets: E.FACTOR_SETS, s3: E.S3_DEFAULTS, disclosures: E.DISCLOSURES, method: E.METHOD, avoidCats: E.AVOID_CATS, avoidStatus: E.AVOID_STATUS, avoidVerify: E.AVOID_VERIFY, creditTypes: E.CREDIT_TYPES, avoidTemplates: E.AVOID_TEMPLATES, schemes: E.CARBON_SCHEMES, cbamGoods: E.CBAM_GOODS, cbamFactor: E.CBAM_FACTOR, creditStds: E.CREDIT_STANDARDS, creditUses: E.CREDIT_USES, fields: E.fieldList(), sdgs: E.SDGS, topicsFull: E.TOPICS_FULL, iroKinds: E.IRO_KINDS, horizons: E.HORIZONS, sectorTopics: E.SECTOR_TOPICS }); }
      case 'esgAiStatus': { const id = String(body.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 40), r = id.length >= 12 ? await kv.get('aiplan:' + id) : null; return out(200, r && (r.esg || r.status !== 'done') ? r : { status: 'waiting' }); }   // the ESG AI job's progress (not other AI results)
        // 🗄 the Sustainability vault: data month by month, evidence by year and month, year-on-year progress and the target path (netlify/lib/esg-vault.mjs)
      case 'esgVaultOrgs': case 'esgVaultOpen': case 'esgVaultGet': case 'esgVaultSave': case 'esgVaultBills': case 'esgVaultAddBill': case 'esgVaultUrl': case 'esgVaultAdd': case 'esgVaultFile': case 'esgVaultDelete': {
        const SV = await import('../lib/esg-vault.mjs'), key = String(body.key || '').slice(0, 80);
        const r = action === 'esgVaultOrgs' ? { orgs: await SV.orgs() } : action === 'esgVaultOpen' ? await SV.open(key, clean(body.name, 120), by) : action === 'esgVaultGet' ? await SV.analyse(key)
          : action === 'esgVaultSave' ? await SV.saveData(key, body, by) : action === 'esgVaultBills' ? await SV.billsToMonths(key, by) : action === 'esgVaultAddBill' ? await SV.addBill(key, body, by) : action === 'esgVaultUrl' ? await SV.uploadUrl(body)
          : action === 'esgVaultAdd' ? await SV.addDoc(ctx, body, by) : action === 'esgVaultFile' ? await SV.file(key, String(body.id || '').slice(0, 30)) : await SV.removeDoc(ctx, key, String(body.id || '').slice(0, 30));
        if (r.error) return out(r.code || 400, { error: r.error });
        if (action === 'esgVaultAdd') await A.audit(who, `Sustainability vault: ${r.doc.name} filed for ${r.doc.period} (${key})`);
        if (action === 'esgVaultDelete') await A.audit(who, `Sustainability vault: a file deleted (${key})`);
        if (action === 'esgVaultSave' && (body.set || []).length) await A.audit(who, `Sustainability vault: ${(body.set || []).length} monthly value(s) saved (${key})`);
        return out(200, r);
      }
      case 'esgCso': { const E = await import('../lib/esg.mjs'); return out(200, await E.cso(clean(body.year, 20))); }
      case 'sampleSeed': {   // 🧪 sample programs, projects and ESG companies: the super user only
        if (!ctx.owner) return bad('Only the super user loads the sample data.', 403);
        if (body.auto) { const O = await import('../lib/sample-once.mjs'), m = await O.runOnce(by); return out(200, { made: m || { programs: [], projects: [], companies: [], skipped: [] } }); }   // the automatic run happens once, even with two windows open
        const SP = await import('../lib/sample-portfolio.mjs'); const made = await SP.seed(by, String(body.today || ''));
        await A.audit(who, 'Sample data loaded: ' + made.programs.length + ' programs, ' + made.projects.length + ' projects, ' + made.companies.length + ' ESG companies'); return out(200, { made });
      }
      case 'esgProgress': {   // 🏁 this report against the organisation's previous full year, and the measures its sector usually reports
        const E = await import('../lib/esg.mjs'), e = await E.get(body.id); if (!e) return bad('This reporting entity was not found', 404);
        return out(200, { progress: await E.progress(e).catch(() => null), kpis: E.sectorKpis((e.org || {}).industry) });
      }
      case 'esgFactors': { const F = await import('../lib/esg-factors.mjs'); return out(200, { factors: F.EF_LIBRARY }); }
      case 'esgList': { const E = await import('../lib/esg.mjs'); return out(200, { ents: await E.list() }); }
      case 'esgGet': { const E = await import('../lib/esg.mjs'), e = await E.get(body.id); if (!e) return bad('This reporting entity was not found', 404);
        const [st, rp] = await Promise.all([E.lastDoc(e.id, 'statement'), E.lastDoc(e.id, 'report')]);
        return out(200, { entity: e, calc: E.compute(e), cover: E.coverage(e).by, docs: { statement: st, report: rp } }); }
      case 'esgCreate': case 'esgSample': { const E = await import('../lib/esg.mjs'), r = action === 'esgSample' ? await E.sample(by) : await E.create(body, by); if (r.error) return bad(r.error, r.code || 400);
        await A.audit(who, `ESG: reporting entity ${action === 'esgSample' ? 'sample ' : ''}created: ${(r.entity.org || {}).name}`); return out(200, r); }
      case 'esgSave': { const E = await import('../lib/esg.mjs'), r = await E.save(body.id, { rev: body.rev, patch: body.patch, source: clean(body.source, 80) }, by); if (r.error) return out(r.code || 400, { error: r.error, entity: r.entity }); return out(200, r); }
      case 'esgDelete': { const E = await import('../lib/esg.mjs'), e = await E.get(body.id); if (!e) return bad('Not found', 404);
        if (!(ctx.owner || e.by === by || ['CEO', 'PMO Director'].includes(ctx.role))) return bad('Only the person who created this report, the CEO or the super user can delete it.', 403);
        const r = await E.remove(e.id, by); await A.audit(who, `ESG: reporting entity deleted: ${r.name}`); return out(200, r); }
      case 'planRaidList': {   // 🧩 the RAID log: every project this login can see (Portfolio › RAID log), or one project (its RAID log tab)
        const RD = await import('../lib/raid.mjs'), only = String(body.core || '').slice(0, 40);
        return out(200, await RD.portfolio(ctx.scope ? new Set(ctx.scope) : null, /^\d{4}-\d{2}-\d{2}$/.test(body.today || '') ? body.today : new Date(Date.now() + 11 * 3600000).toISOString().slice(0, 10), only));
      }
      case 'planPgmGet': {   // 🗺 the Program view: a Program manager's programs (the PMO view, cut to their projects, without money)
        if (!ctx.pgm || ctx.pgm.kind !== 'program') return bad('The Program view is for program managers.', 403);
        const PMO = await import('../lib/pmo.mjs'); return out(200, await PMO.pmoView(String(body.today || '').match(/^\d{4}-\d{2}-\d{2}$/) ? body.today : new Date().toISOString().slice(0, 10), { pgm: ctx.pgm }));
      }
      // 🌿 ESG & Sustainability for projects and programs (pesg.mjs)
      case 'planEsgAnalyse': {   // one project's ESG figures, from its saved plan with the ESG data being edited
        const core = String(body.core || '').slice(0, 40); if (ctx.scope && !ctx.scope.includes(core)) return bad('Not your project.', 403);
        const P = await import('../lib/plan.mjs'), PE = await import('../lib/pesg.mjs'), plan = await P.get(core).catch(() => null); if (!plan) return bad('Project not found', 404);
        const K = await import('../lib/kv.mjs'), sw = await K.get('swms:' + core).catch(() => null);
        const x = PE.calc({ ...plan, esg: body.esg !== undefined ? body.esg : plan.esg }, { BAC: Number(body.BAC) || 0, AC: Number(body.AC) || 0 }, { swms: !!sw });
        if (!U.seesMoney(ctx)) { delete x.intensity; delete x.soc.invest; if (!x.measured) { x.est = null; x.total = null; x.overBudget = null; x.reductionPct = null; x.method = 'No activity data yet'; } }   // no money: no budget-based estimate either
        return out(200, { esg: x, schema: { act: PE.ACT, matEf: PE.MAT_EF, matNote: PE.MAT_NOTE, p5: PE.P5, scale: PE.P5_SCALE, pillars: PE.P5_PILLARS, fw: PE.PFW, spendF: PE.SPEND_F, factorSets: PE.SETS() } });
      }
      case 'planEsgPortfolioGet': {   // every project this login can see, by program (CEO, CSO, CFO, PMO and program views)
        const PE = await import('../lib/pesg.mjs'); return out(200, await PE.portfolio(/^\d{4}-\d{2}-\d{2}$/.test(body.today || '') ? body.today : new Date().toISOString().slice(0, 10), ctx.scope ? new Set(ctx.scope) : null, U.seesMoney(ctx)));
      }
      case 'planEsgSettingsSave': {   // the internal carbon price for the carbon cost: the CEO, the CFO and the super user
        if (ctx.scope || !(ctx.owner || ['CEO', 'CFO'].includes(ctx.role))) return bad('The internal carbon price is set by the CEO or the CFO.', 403);
        const PE = await import('../lib/pesg.mjs'), v = await PE.saveSettings(body, by); if (v.error) return bad(v.error, 409); await A.audit(who, 'ESG: internal carbon price for projects set to ' + (v.price == null ? 'none' : v.cur + ' ' + v.price + ' per tCO2e')); return out(200, { settings: v });
      }
      case 'planPmoGet': {   // 🧭 the PMO view: the PMO Director, the CEO and the super user
        if (ctx.scope || !(ctx.owner || ['CEO', 'PMO Director'].includes(ctx.role))) return bad('The PMO view is for the PMO Director and the CEO.', 403);
        const PMO = await import('../lib/pmo.mjs'); return out(200, await PMO.pmoView(String(body.today || '').match(/^\d{4}-\d{2}-\d{2}$/) ? body.today : new Date().toISOString().slice(0, 10)));
      }
      case 'planCeoGet': {   // 👔 the CEO view: the CEO, the super user, project directors and managers
        if (ctx.scope || !(ctx.owner || ['CEO', 'CFO', 'PMO Director', 'Project manager'].includes(ctx.role))) return bad('The CEO view is for the CEO, the CFO and PMO Directors.', 403);
        const CEO = await import('../lib/ceo.mjs'), last = await kv.get('ceo-brief').catch(() => null); return out(200, { ...(await CEO.ceoView(String(body.today || '').match(/^\d{4}-\d{2}-\d{2}$/) ? body.today : new Date().toISOString().slice(0, 10))), brief: last || null });
      }
      case 'planSeenGet': return out(200, await seenGet(ctx, String(body.core || '')));
      case 'planMyDaySeen': { const r = await seenMark(ctx, body); if (r.error) return bad(r.error, r.code || 400); return out(200, r); }
      case 'planMyDayDone': { const r = await myDayDone(ctx, body, by); if (r.error) return bad(r.error, r.code || 400); await A.audit(who, `Today: ${body.nid ? 'note resolved' : 'done'} on ${String(body.core || '').slice(0, 40)}`).catch(() => {}); return out(200, r); }
      // ---------- CRM ----------
      case 'dashboard': {
        const now = Date.now();
        const [all, remsAll] = await Promise.all([J.all(), J.reminders()]);
        const per = period(body.period || 'month', now);
        const rems = remsAll.filter((r) => r.at >= now - 86400000).slice(0, 8);
        return out(200, {
          period: per.name, report: J.report(all, per.from, per.to),
          total: all.length, open: all.filter((j) => J.OPEN.includes(j.stage)).length,
          recent: all.slice(-8).reverse(),
          reminders: rems.map((r) => ({ ...r, when: whenText(r.at) }))
        });
      }
      case 'jobs': {
        let list = body.q ? await J.search(body.q) : await J.all();
        const st = String(body.stage || 'open');
        if (st === 'open') list = list.filter((j) => J.OPEN.includes(j.stage));
        else if (st !== 'all') list = list.filter((j) => j.stage === st);
        return out(200, { jobs: list.sort((a, b) => b.created - a.created) });
      }
      case 'job': {
        const [job, remsAll] = await Promise.all([jobFull(body.ref), J.reminders()]);
        if (!job) return bad('Job not found', 404);
        const rems = remsAll.filter((r) => r.core === job.core).map((r) => ({ ...r, when: whenText(r.at) }));
        return out(200, { job, reminders: rems });
      }
      case 'stage': {
        const stage = String(body.stage || '');
        if (!J.STAGES.includes(stage)) return bad('Unknown stage');
        const extra = {};
        // Project Champ: the proposal value is optional; an invoice is a milestone payment (1 to 12), its amount optional
        if (stage === 'quoted' || stage === 'invoiced') extra.amount = num(body.amount) || 0;
        if (stage === 'invoiced') { extra.milestone = Math.round(Number(body.milestone) || 0); if (extra.milestone < 1 || extra.milestone > 12) return bad('Choose the milestone payment (1 to 12)'); }
        if (stage === 'lost') extra.reason = clean(body.reason, 200);
        const r = await J.setStage(body.ref, stage, by, extra);
        if (r.error) return bad(r.error === 'not found' ? 'Job not found' : r.error, 404);
        await A.audit(who, `${r.after}: ${J.LABEL[stage]}${extra.milestone ? ' (milestone payment ' + extra.milestone + ')' : ''}${extra.amount ? ' ' + J.money(extra.amount) : ''}`);
        return out(200, { job: { ...r.job, ref: J.refFor(r.job) }, before: r.before, after: r.after });
      }
      case 'note': {
        const text = clean(body.text, 1000);
        if (!text) return bad('Write a note first');
        const job = await J.addNote(body.ref, text, by);
        if (!job) return bad('Job not found', 404);
        await A.audit(who, `${J.refFor(job)}: note added`);
        return out(200, { job: { ...job, ref: J.refFor(job) } });
      }
      case 'create': {
        const name = clean(body.name, 120), phone = clean(body.phone, 40);
        if (!name || !phone) return bad('Name and phone are needed');
        const service = clean(body.service, 120), summary = clean(body.summary, 1500);
        const core = await J.nextCore(/^[A-Z]$/.test(body.trade || '') ? body.trade : tradeCode(service, summary));
        const job = await J.create({ core, name, phone, email: clean(body.email, 160), suburb: clean(body.suburb, 80), service,
          best_time: clean(body.best_time, 80), summary, source: clean(body.source, 60) || `added by ${by}` }, by);
        await A.audit(who, `${J.refFor(job)}: job added (${name})`);
        return out(200, { job: { ...job, ref: J.refFor(job) } });
      }
      case 'reminders': {
        const list = await J.reminders();
        return out(200, { reminders: list.map((r) => ({ ...r, when: whenText(r.at) })) });
      }
      case 'remind': {
        const at = Number(body.at) || parseWhen(body.when);
        if (!at || at < Date.now() - 60000) return bad('Pick a time in the future, e.g. "tomorrow 9am" or "in 2h"');
        let core = '';
        if (body.ref) { const job = await J.find(body.ref); if (!job) return bad('Job not found', 404); core = job.core; }
        const text = clean(body.text, 300) || 'Follow up';
        const r = await J.addReminder({ at, text, core, chat: 'alerts', by });
        await A.audit(who, `Reminder #${r.id} set for ${whenText(at)}`);
        return out(200, { reminder: { ...r, when: whenText(at) } });
      }
      case 'unremind': {
        const gone = await J.removeReminder(Number(body.id));
        if (!gone) return bad('Reminder not found', 404);
        await A.audit(who, `Reminder #${gone.id} deleted`);
        return out(200, { ok: true });
      }
      case 'report': {
        const per = period(body.period || 'month');
        return out(200, { period: per.name, from: per.from, report: J.report(await J.all(), per.from, per.to) });
      }

      // ---------- GKH Project Champ: the build registry (Admin > Builds), owner only ----------
      case 'buildList': {
        if (!ctx.owner) return bad('Only the owner can see the build registry.', 403);
        const reg = (await kv.get('champ-builds').catch(() => null)) || { list: [] };
        return out(200, { current: BUILD, list: reg.list, repo: 'https://github.com/sashi73/mbs-website' });
      }

      // ---------- GKH Project Champ: visitors / potential customers who introduced themselves to Champ ----------
      case 'visitorList': {
        if (ctx.scope) return bad('Sub-contractor logins cannot see visitors.', 403);
        if (!ctx.owner && !(ctx.mods && ['view', 'edit'].includes(ctx.mods.crm))) return bad('You need access to Customers to see visitors.', 403);
        return out(200, { list: await VIS.list(), email: !!env('RESEND_API_KEY'), counter: VIS.counterSummary(await VIS.counter()), signins: ctx.owner ? await VIS.signIns() : null });
      }
      case 'signInClear': {   // only the super user sees and clears the sign-in log
        if (!ctx.owner) return bad('Only the super user can see the sign-in log.', 403);
        const ids = (Array.isArray(body.ids) ? body.ids : []).map((x) => clean(String(x || ''), 40)).slice(0, 2000);
        if (!ids.length) return bad('Pick the sign-ins to delete.');
        return out(200, { ok: true, removed: await VIS.signInsClear(ids) });
      }
      case 'visitorDelete': {
        if (ctx.scope) return bad('Sub-contractor logins cannot delete visitors.', 403);
        if (!ctx.owner && !(ctx.mods && ctx.mods.crm === 'edit')) return bad('You need edit access to Jobs & customers to delete visitors.', 403);
        const ids = (Array.isArray(body.ids) ? body.ids : [body.id]).map((x) => clean(String(x || ''), 60)).filter(VIS.validId).slice(0, 500);
        if (!ids.length) return bad('Pick a visitor to delete.');
        return out(200, { ok: true, removed: await VIS.remove(ids) });
      }

      // ---------- GKH Project Champ: enquiries from the contact page ----------
      case 'enquiryList': {
        if (ctx.scope) return bad('Sub-contractor logins cannot see enquiries.', 403);
        if (!ctx.owner && !(ctx.mods && ['view', 'edit'].includes(ctx.mods.crm))) return bad('You need access to Customers to see enquiries.', 403);
        return out(200, { list: ((await kv.get('champ-enquiries').catch(() => null)) || { list: [] }).list, email: !!env('RESEND_API_KEY') });
      }
      case 'enquirySet': {
        if (ctx.scope || (!ctx.owner && !(ctx.mods && ctx.mods.crm === 'edit'))) return bad('You need edit access to Jobs & customers to update enquiries.', 403);
        const ref = clean(String(body.ref || ''), 40), status = ['new', 'progress', 'done'].includes(body.status) ? body.status : null;
        let hit = null;
        await kv.update('champ-enquiries', (cur) => {
          const e = cur.list.find((x) => x.ref === ref); if (!e) return cur;
          if (status) { e.status = status; if (status === 'done') e.doneAt = new Date().toISOString(); }
          if (body.notes != null) e.notes = clean(String(body.notes), 2000);
          e.updatedBy = ctx.name || ctx.user || 'owner'; e.updated = new Date().toISOString(); hit = { ...e }; return cur;
        }, { list: [] });
        return hit ? out(200, { ok: true, enquiry: hit }) : bad('That enquiry is no longer there.', 404);
      }
      case 'enquiryDelete': {
        if (ctx.scope || (!ctx.owner && !(ctx.mods && ctx.mods.crm === 'edit'))) return bad('You need edit access to Jobs & customers to delete enquiries.', 403);
        const refs = new Set((Array.isArray(body.refs) ? body.refs : [body.ref]).map((x) => clean(String(x || ''), 40)));
        let n = 0;
        await kv.update('champ-enquiries', (cur) => { const before = cur.list.length; cur.list = cur.list.filter((x) => !refs.has(x.ref)); n = before - cur.list.length; return cur; }, { list: [] });
        return out(200, { ok: true, removed: n });
      }

      // ---------- GKH Project Champ: delete a project completely (plan, record, phase pin, BOM setting) ----------
      // 🗄 the project archive: a project is taken out of every list (signed), kept whole, and can be brought back
      case 'planArchiveList': case 'planProjectArchive': case 'planProjectRestore': {
        const canArch = !ctx.scope && (ctx.owner || ['CEO', 'PMO Director', 'Site administrator'].includes(ctx.role));
        if (!canArch) return bad('Only the super user, the CEO and the site administrator can use the project archive.', 403);
        if (action === 'planArchiveList') {
          // 🧾 the audit register: every archive and bring-back ever signed, also for projects since brought back
          const register = (((await kv.get('archive-register')) || {}).list || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
          const jobs = (await J.all(true)).filter((j) => j.archived), plans = await kv.getMany(jobs.map((j) => 'archive-plan:' + j.core)).catch(() => []), full = await kv.getMany(jobs.map((j) => 'job:' + j.core)).catch(() => []);
          return out(200, { canDelete: !!ctx.owner, register, list: jobs.map((j, i) => { const p = plans[i] || null, f = full[i] || j, a = f.archived || {}, ts = (p && p.tasks) || [];
            return { core: j.core, ref: J.refFor(j), name: (p && p.name) || j.service || j.core, client: j.name || '', program: j.program || '', created: j.created, archived: { at: a.at, by: a.by, role: a.role, sig: a.sig, reason: a.reason },
              planned: !!p, tasks: ts.length, pct: ts.length ? Math.round(ts.reduce((x, t) => x + (Number(t.pct) || 0), 0) / ts.length) : 0, budget: ((p && p.charter) || {}).budget || 0 }; }).sort((a, b) => (b.archived.at || 0) - (a.archived.at || 0)) });
        }
        const core = clean(body.core, 40), job = await J.find(core);
        if (!job) return out(404, { error: 'Project not found' });
        if (action === 'planProjectArchive') {
          if (job.archived) return bad('That project is archived already.');
          const sig = clean(body.sig, 80), reason = clean(body.reason, 600), nm = clean(body.by, 80) || by;
          if (reason.length < 5) return bad('Say why the project is being archived.');
          if (!sig) return bad('Sign it: type your full name.');
          const p = await kv.get('plan:' + job.core);
          if (p) { await kv.set('archive-plan:' + job.core, p); await kv.del('plan:' + job.core); }
          const ev = { what: 'Archived', at: Date.now(), by: nm, role: ctx.owner ? 'Super user' : ctx.role, sig, reason, user: who, project: (p && p.name) || job.service || job.core, pct: p && (p.tasks || []).length ? Math.round(p.tasks.reduce((x, t) => x + (Number(t.pct) || 0), 0) / p.tasks.length) : null };
          await J.update(job.core, { archived: { at: ev.at, by: nm, role: ev.role, sig, reason, user: who } });
          await logArchive({ ...ev, core: job.core, ref: J.refFor(job), client: job.name || '', program: job.program || '' });
          await A.audit(who, `${J.refFor(job)}: project archived by ${nm} ("${(p && p.name) || job.service || job.core}")${reason ? ': ' + reason : ''}`);
          return out(200, { ok: true });
        }
        if (!job.archived) return bad('That project is not archived.');
        const rsig = clean(body.sig, 80), rwhy = clean(body.reason, 600), rnm = clean(body.by, 80) || by;
        if (rwhy.length < 5) return bad('Say why the project is being brought back.');
        if (!rsig) return bad('Sign it: type your full name.');
        if (await kv.get('plan:' + job.core)) return bad('A plan for that project exists already: it cannot be brought back over it.', 409);
        const p = await kv.get('archive-plan:' + job.core); if (p) { await kv.set('plan:' + job.core, p); await kv.del('archive-plan:' + job.core); }
        await J.update(job.core, { archived: null });
        await logArchive({ what: 'Brought back', at: Date.now(), by: rnm, role: ctx.owner ? 'Super user' : ctx.role, sig: rsig, reason: rwhy, user: who, project: (p && p.name) || job.service || job.core, core: job.core, ref: J.refFor(job), client: job.name || '', program: job.program || '' });
        await A.audit(who, `${J.refFor(job)}: project brought back from the archive by ${rnm}: ${rwhy}`);
        return out(200, { ok: true });
      }
      case 'planProjectDelete': {
        if (ctx.scope && !(ctx.pgm && ctx.pgm.kind === 'project' && ctx.scope.includes(String(body.core || '')))) return bad('This login cannot delete projects.', 403);   // 📁 a Project manager: their own projects (the first-week rule still applies)
        if (!ctx.owner && !(ctx.mods && ctx.mods.projects === 'edit')) return bad('You need edit access to Projects to delete one.', 403);
        const pcore = clean(body.core, 40), job = await J.find(pcore);
        if (!job) return out(404, { error: 'Project not found' });
        const plan = await getPlan(job.core).catch(() => null), arch = job.archived ? await kv.get('archive-plan:' + job.core).catch(() => null) : null;
        // 🔒 a planned project more than a week old is never deleted, by anyone (the super user too): it is archived instead.
        //    For now the super user can still delete a project from the Archived projects vault.
        if (job.archived) { if (!ctx.owner) return bad('Only the super user can delete a project from the Archived projects vault.', 403); }
        // how old: the earlier of when the record was made and when the project started (a project started in April is old, even if its record is new)
        else if (plan && Date.now() - Math.min(job.created || Date.now(), /^\d{4}-\d\d-\d\d$/.test(plan.start || '') ? Date.parse(plan.start + 'T00:00:00Z') : Date.now()) > 7 * 864e5) return bad('This project was planned more than a week ago, so it can\'t be deleted, not even by the super user. Archive it instead (the super user, the CEO or the site administrator can).', 403);
        if (arch) { await kv.del('archive-plan:' + job.core).catch(() => {}); await logArchive({ what: 'Deleted for good', at: Date.now(), by, role: 'Super user', sig: '', reason: clean(body.reason, 600), user: who, project: arch.name || job.service || job.core, core: job.core, ref: J.refFor(job), client: job.name || '', program: job.program || '' }); }
        if (plan) await planPost('planDelete', { core: job.core }, { who, by, audit: null }).catch(() => {});
        await J.removeJob(job.core);
        for (const k of ['champ-phases']) await kv.update(k, (cur) => { const m = { ...((cur && cur.map) || {}) }; delete m[job.core]; return { map: m }; }, () => ({ map: {} })).catch(() => {});
        await forgetModules(job.core).catch(() => {});
        await PGM.forgetProject(job.core).catch(() => {});   // its dependency links go too
        const label = (plan && plan.name) || job.service || job.core;
        await A.audit(who, `${J.refFor(job)}: project deleted ("${label}")`);
        return out(200, { ok: true, name: label });
      }

      // ---------- GKH Project Champ: a new project without the CRM ----------
      case 'watchBoard': {   // 🩺 Champ's watch across every project: red / amber / green, what changed since yesterday, the alerts
        if (!(ctx.owner || ['view', 'edit'].includes((ctx.mods || {}).projects))) return bad('Projects access is needed.', 403);
        const W = await import('../lib/watch.mjs'), b = await W.board({ refresh: !!body.refresh, lang: clean(body.lang, 5) || 'en' }), al = await W.alertsList(), run = await kv.get('watch:run').catch(() => null);
        const mine = (x) => !ctx.scope || ctx.scope.includes(x.core), items = (b.items || []).filter(mine), counts = { red: 0, amber: 0, green: 0, grey: 0 }; items.forEach((x) => counts[x.rag]++);
        const voice = await W.voiceCheck(new URL(req.url).origin, { force: !!body.refresh && !!body.voice }).catch(() => null);
        return out(200, { day: b.day, at: b.at, prevDay: b.prevDay || '', counts, items, done: (b.done || []).filter(mine), alerts: al.filter(mine).slice(0, 20), lastRun: run || null, voice: voice && !voice.ok ? { why: voice.why, since: voice.since, at: voice.at } : null });
      }
      case 'planWatchGet': {   // 🩺 Champ's health check of one project (rules) and its brief (AI, kept until the numbers change)
        const core = clean(body.core, 40), pl = core ? await getPlan(core) : null; if (!pl) return bad('Project not found', 404);
        const W = await import('../lib/watch.mjs'), j = await J.find(core);
        const noM = !U.seesMoney(ctx), mReason = (x) => !/cost|budget|cpi|\$|spend|spent|price|invoice|bill/i.test((x && x.text) || String(x || ''));
        if (body.quick || noM) { const h = W.check(pl); return out(200, { rag: h.rag, word: h.word, reasons: noM ? h.reasons.filter(mReason) : h.reasons, n: noM ? scrubMoney(h.n) : h.n, brief: noM ? '' : undefined }); }   // 💰 no money, no AI brief
        const r = await W.brief(core, pl, { refresh: !!body.refresh, name: pl.name || (j && j.service) || '', lang: clean(body.lang, 5) || 'en' });
        return out(200, { rag: r.rag, word: r.word, reasons: r.reasons, n: r.n, brief: r.brief, at: r.at, cached: !!r.cached, stale: !!r.stale, name: pl.name || '' });
      }
      case 'guideAsk': {   // 🎙 Ask Champ (dashboard): which on-screen guide answers the question, and a short answer in the console's language
        const q = clean(body.q, 300), tours = (Array.isArray(body.tours) ? body.tours : []).slice(0, 40).map((t) => ({ id: clean(t.id, 20), t: clean(t.t, 80) })).filter((t) => t.id);
        if (!q) return bad('Ask a question');
        const { llmJson } = await import('../lib/ai.mjs'), { SKILL } = await import('../lib/champ-skill.mjs');   // the Champ skill: the console as it is now
        // the left menu's data, so "what are the dependencies for this project?", "which programs are late?", "who is on the team?" get real answers
        let portfolio = null;
        try {
          const can = (m) => ctx.owner || ['view', 'edit'].includes((ctx.mods || {})[m]);
          if (can('projects')) {
            const rr = await planPost('planProgramList', { today: new Date(Date.now() + 11 * 3600000).toISOString().slice(0, 10) }, { who, by, audit: null }); const d = rr && typeof rr.json === 'function' ? await rr.json() : JSON.parse((rr && rr.body) || '{}');
            const inScope = (c) => !ctx.scope || ctx.scope.includes(c), nm = {}; (d.cards || []).forEach((c) => { nm[c.core] = c.name; });
            portfolio = {
              programs: (d.programs || []).map((g) => ({ name: g.name, manager: g.manager || '', sponsor: g.sponsor || '', status: g.status || '', client: g.client || '' })).slice(0, 40),
              projects: (d.cards || []).filter((c) => inScope(c.core)).slice(0, 80).map((c) => ({ core: c.core, ref: c.ref, name: c.name, program: c.program, client: c.client || '', health: c.health, phase: c.phase, pct: c.pct, start: c.start, finish: c.finish, finish_by: c.finishBy || '', forecast: c.forecast, SPI: c.SPI, CPI: c.CPI, budget: c.BAC, spent: c.AC, late_tasks: c.late, high_risks: c.highRisks })),
              dependencies: (d.deps || []).filter((x) => inScope(x.from) || inScope(x.to)).slice(0, 120).map((x) => ({ from: nm[x.from] || x.from, from_core: x.from, to: nm[x.to] || x.to, to_core: x.to, type: x.type, lag_days: x.lag || 0, status: x.status || '', why: x.why || '', note: x.note || '', cross_program: !!x.cross })),
            };
          }
          let pplOk = null; if (ctx.scope) { const as0 = await PPL.assignments().catch(() => ({})); pplOk = (id) => Object.keys((as0[id] || {}).by || {}).some((c) => ctx.scope.includes(c)); }   // 🔒 their team, chosen before the 80-person cap
          if (can('people')) { const L = await PPL.list(); portfolio = portfolio || {}; portfolio.people = (L.people || []).filter((x) => !x.archived && (!ctx.scope || (pplOk && pplOk(x.id)))).slice(0, 80).map((x) => ({ name: x.name, group: x.group, role: x.role, rate: x.costRate || 0, status: x.status, problems: (x.comp || {}).problems || [] })); }
        } catch (e) { console.error('Ask Champ portfolio context: ' + e.message); }
        let project = null;   // asked from inside a project: its facts, so "my project is running late" gets an answer about this project
        const core = clean(body.core, 40);
        if (core && (!ctx.scope || ctx.scope.includes(core))) { try { const PL = await import('../lib/plan.mjs'); const pl = await getPlan(core);
          if (pl && Array.isArray(pl.tasks)) { const today = new Date(Date.now() + 11 * 3600000).toISOString().slice(0, 10), R = PL.rollup(pl, today);
            const jb = await J.find(core).catch(() => null), ch = pl.charter || {}, ph = Object.fromEntries((pl.phases || []).map((f) => [f.id, f.name]));
            const W = await import('../lib/watch.mjs'), hc = W.check(pl, today), cut = (v, n) => String(v || '').slice(0, n);
            // everything about the open project, so "who is the project manager?", "who is on the team?", "what is late?" get a straight answer
            project = { name: pl.name, ref: jb ? J.refFor(jb) : core, client: (jb && jb.name) || ch.customer || '', program: (jb && jb.program) || '', project_manager: ch.manager || (jb && jb.manager) || '', sponsor: (jb && jb.sponsor) || '', site: (jb && jb.suburb) || '',
              summary: cut((jb && jb.summary) || ch.background, 700), objective: cut(ch.objective, 400), in_scope: cut(ch.inScope, 500), out_of_scope: cut(ch.outScope, 300), deliverables: cut(ch.deliverables, 400), acceptance: cut(ch.acceptance, 200), assumptions: cut(ch.assumptions, 300),
              approved_budget: Number(ch.budget) || 0, charter_status: ch.docStatus || '', health: hc.rag, health_reasons: hc.reasons.filter((x) => U.seesMoney(ctx) || !/cost|budget|cpi|\$|spend|spent|price|invoice|bill/i.test((x && x.text) || '')).map((x) => x.text), forecast_cost_EAC: hc.n.EAC, baseline_finish: hc.n.baseline_finish, days_past_baseline: hc.n.slip_days,
              start: R.start, finish: R.finish, finish_by: pl.finishBy || '', today, pct_complete: R.pct, tasks_total: R.total, tasks_done: R.done, late_tasks_count: R.late, SPI: R.SPI, CPI: R.CPI, budget_BAC: R.BAC, spent_AC: R.AC,
              stakeholders: (pl.stakeholders || []).filter((x) => x.name || x.role).slice(0, 40).map((x) => ({ name: x.name, role: x.role, raci: x.raci, email: x.email || undefined, phone: x.phone || undefined })),
              phases: (pl.phases || []).map((f) => f.name),
              tasks: pl.tasks.slice(0, 90).map((t) => ({ n: cut(t.name, 90), phase: ph[t.phase] || '', start: t.es, finish: t.ef, days: t.dur, pct: t.pct || 0, status: t.status, people: (t.res || []).join(', ') || undefined, owner: t.owner || undefined, cost: Math.round(PL.taskCost(t)), actual: Number(t.actual) || undefined, milestone: t.dur === 0 || undefined })),
              risks: (pl.risks || []).filter((x) => x.title).slice(0, 25).map((x) => ({ title: x.title, score: (x.p || 0) * (x.i || 0), response: x.response, action: cut(x.action, 160), owner: x.owner, status: x.status })),
              issues: (pl.issues || []).filter((x) => x.title).slice(0, 25).map((x) => ({ title: x.title, priority: x.priority, owner: x.owner, due: x.due, status: x.status })),
              lessons_logged: (pl.lessons || []).slice(0, 20).map((l) => ({ title: l.title, impact: l.impact, recommendation: cut(l.rec, 200) })),
              lessons_from_past_projects: ((await (await import('../lib/lessons.mjs')).library({ forCore: core, limit: 4 }).catch(() => ({ lessons: [] }))).lessons || []).map((l) => ({ lesson: l.title, from: l.project, recommendation: cut(l.rec, 200) })) }; } } catch (e) { console.error('Ask Champ project facts: ' + e.message); project = null; } }
        // 🔒 only what this login may see: their programs, their projects, the people on them, and no money without money access
        if (ctx.scope && portfolio) {
          const okP = new Set((portfolio.projects || []).map((p) => p.program)), mine = (c) => ctx.scope.includes(c);
          if (portfolio.programs) portfolio.programs = portfolio.programs.filter((g) => okP.has(g.name) || (ctx.pgm && ctx.pgm.names.includes(g.name)));
          if (portfolio.dependencies) portfolio.dependencies = portfolio.dependencies.map((x) => ({ ...x, from: mine(x.from_core) ? x.from : 'another project', from_core: mine(x.from_core) ? x.from_core : '', to: mine(x.to_core) ? x.to : 'another project', to_core: mine(x.to_core) ? x.to_core : '' }));
          if (portfolio.people) { const as = await PPL.assignments().catch(() => ({})), L2 = (await PPL.list()).people || [], ok = new Set(L2.filter((p) => Object.keys((as[p.id] || {}).by || {}).some((c) => mine(c))).map((p) => p.name)); portfolio.people = portfolio.people.filter((p) => ok.has(p.name)); }
        }
        if (!U.seesMoney(ctx)) { if (portfolio) portfolio = scrubMoney(portfolio); if (project) project = scrubMoney(project); }
        // 🌿 ESG and sustainability questions (or asked from the ESG page): the ESG reports' facts, so Champ answers with the organisation's own numbers
        let esg = null; const pg0 = clean(body.page, 60);
        if (ctx.scope) { /* contractor and program logins get no ESG facts */ }
        else if (/^svault\//.test(pg0)) { try { const SV = await import('../lib/esg-vault.mjs'); esg = { vault: await SV.champFacts(pg0.split('/')[1]) }; } catch (e) { console.error('Ask Champ vault facts: ' + e.message); } }
        else if (/^(esg|cso|svault)/.test(pg0) || /\b(esg|sustainab\w*|carbon|emission\w*|scope [123]|ghg|greenhouse|net[ -]zero|ifrs s[12]|aasb s[12]|issb|esrs|csrd|gri|tcfd|sasb|cdp|bursa|nsrf|nger|materiality|climate|avoided|decarboni\w*|offsets?|credits?|cbam|ets|safeguard|accus?|carbon tax|icvcm|vcmi|article 6|corsia|j-credits?)\b/i.test(q)) {
          try { const E = await import('../lib/esg.mjs'), m = pg0.match(/^esg\/([A-Z0-9]+)/i); esg = await E.champFacts(m ? m[1] : ''); } catch (e) { console.error('Ask Champ ESG facts: ' + e.message); }
        }
        const kbHits = await KB.search(q, 2500).catch(() => []), course_notes = kbHits.length ? KB.forPrompt(kbHits) : undefined;
        // ❓ the help centre (assets/help/articles.js): the official how-to, so Champ's steps match the help word for word
        const HC = await import('../../assets/help/articles.js'), hHits = HC.search(q, 4), hSeen = {};
        const help_articles = hHits.filter((h) => !hSeen[h.id + h.sub] && (hSeen[h.id + h.sub] = 1)).map((h) => ({ id: h.id + '#' + h.sub, text: HC.asText(HC.byId(h.id), h.sub) }));
        const help_index = HC.ARTICLES.map((a) => a.id + ': ' + a.t + ' [' + a.subs.map((x) => x.id).join(',') + ']').join('\n');
        const r0 = await llmJson([{ role: 'system', content: 'You are Champ, the guide inside the GKH Project Champ project-management console. People ask how to do things in the console. ' +
          'If they ask HOW TO DO something in the console, pick the ONE guide from the list that shows them (its id), set how true, and say in 1-2 friendly sentences what you will show them. ' +
          'If they ask about THE OPEN PROJECT ("this project": who is the project manager, the sponsor, the client, who is on the team or a stakeholder, a task, a date, the budget, a risk or issue, what is late, its health), answer straight from the project facts given, with the names, dates and numbers; set how false; do not send them to a tab for something the facts already answer (only say where to look, or that it is not recorded yet, when it is not in the facts). ' +
          'If they ask about what is in the console (their programs, projects, the dependencies between projects, the portfolio summary, the pipeline, the team), answer from the portfolio data given (and the open project, "this project" = the project facts): name the projects, the links (from → to, type, lag, status) and the numbers; set how false; say where to see it (e.g. Portfolio > Dependency board). If something is not in the data, say it is not recorded yet. ' +
          'If they ask a project question (e.g. "my project is running late, what can I do?", over budget, too many risks, a stakeholder problem), set how false and answer it like a seasoned PMP: ' +
          'name the right techniques (late: crashing with more crew or overtime at extra cost, fast-tracking critical tasks in parallel with more risk, re-sequencing, cutting or deferring scope with the sponsor, a change request, re-baselining; ' +
          'over budget: EVM, CPI and EAC, value engineering, scope trade-offs, contingency), use the project facts given (finish vs finish_by, SPI, CPI, late tasks) when there are any, and you may add the guide id that helps act on it (e.g. critical). ' +
          'If they ask about ESG or sustainability reporting (emissions, Scope 1, 2 and 3, factors, net zero, avoided emissions, carbon credits, materiality, IFRS S1 and S2, AASB S1 and S2, ESRS and CSRD, GRI, TCFD, SASB, CDP, Bursa Malaysia and the NSRF, NGER, assurance), set how false and answer like a senior ESG reporting adviser: precise about what each standard requires and who it applies to, using the esg facts given (the open report in esg.open: its emissions, scores, coverage, gaps, avoided emissions; and esg.entities) with the real numbers when there are any, and say where in the console to do it (menu: ESG & Sustainability; tabs Setup, Environment, Social, Governance, Carbon avoidance, Reporting with the Sustainability Statement and the ESG report). Avoided emissions are never netted against Scope 1-3. For carbon pricing, the EU CBAM (definitive since 1 Jan 2026, 50 t threshold, certificate sales from 1 Feb 2027, first surrender 30 Sep 2027), the UK CBAM (from 1 Jan 2027), carbon taxes and ETSs (Australia Safeguard with ACCUs and SMCs, Singapore S$45 with up to 5% eligible international credits, Japan GX-ETS with up to 10% J-Credits and JCM, Malaysia carbon tax deferred) and credit quality and claims (ICVCM CCP, corresponding adjustments, Article 6.2 and 6.4, VCMI, SBTi Net-Zero V2, ISO 14068-1), use esg.open.carbon_pricing and the Pricing & CBAM tab; give estimates as estimates. ' +
          'If no guide fits, tour is "" and you answer the question yourself: project management questions (PMBOK, PRINCE2, Agile, Scrum, risks, critical path, EVM, stakeholders, change control, budgets, charters, lessons learned ...) ' +
          'get a clear, practical answer in up to 5 short sentences, like an experienced project manager would give. Warm, plain words, no markdown. Do not invent screens or buttons of the console: the console map below is the truth. If they use an old name (see RENAMED), tell them the new name and where it is. ' +
          (course_notes ? KB.RULE + ' (In Ask Champ keep it to one short line, e.g. "Sashi also covers this in his training class: ...".) ' : '') + 'HELP CENTRE: help_articles are the official how-to articles that match the question, and help_index lists every article (id: title [sections]). For any question about how to do something or where something is, give the steps from the matching article in your own short words, with the button names exactly as written there, and set "help" to the best article and section as "article#section" (or just "article"), from help_index; otherwise "help" is "". The help centre is also in the menu (❓ Help) and on each screen (the ? next to the title). ' + 'JSON only: {"tour":"id or empty","how":true|false,"answer":"...","help":"article#section or empty"}' }, { role: 'user', content: JSON.stringify({ question: q, on_page: clean(body.page, 60), project, open_project_core: core || '', portfolio, esg, guides: tours, course_notes, help_articles, help_index }) }].map((m, i) => (i === 0 ? { ...m, content: m.content + '\n\n' + SKILL } : m)), { maxTokens: 1200 }).catch(() => null), r = r0 && r0.data;
        const tour = r && tours.some((t) => t.id === r.tour) ? r.tour : '';
        const hp = String((r && r.help) || '').split('#'), hA = HC.byId(clean(hp[0], 40)), hS = hA && (hA.subs || []).some((x) => x.id === hp[1]) ? hp[1] : '';
        const help = hA ? { id: hA.id, sub: hS } : hHits[0] && !(r && r.answer) ? { id: hHits[0].id, sub: hHits[0].sub } : null;
        return out(200, { tour, how: !!(r && r.how), help, answer: clean(r && r.answer, 1500), notes: kbHits.length && !(r && r.how) && /Sashi/i.test(String((r && r.answer) || '')) ? KB.sourcesOf(kbHits) : [] });
      }
      case 'planNewProject': {
        const pname = clean(body.name, 120), client = clean(body.client, 120);
        if (!pname || !client) return bad('A project name and a client are needed');
        // every project belongs to a program: an existing one, or a new name typed in (made here)
        let prog = clean(body.program, 80).trim();
        if (!prog) return bad('Choose the program this project belongs to.');
        const known = (await PGM.list()).find((p) => p.name.toLowerCase() === prog.toLowerCase());
        if (known) prog = known.name; else prog = (await PGM.save({ name: prog }, who)).program.name;
        const core = await J.nextCore('P');
        await J.create({ core, name: client, phone: clean(body.phone, 40), email: clean(body.email, 160), suburb: clean(body.site, 80), service: pname,
          summary: clean(body.summary, 4000), program: prog, manager: clean(body.manager, 80), sponsor: clean(body.sponsor, 80), source: 'Project Champ',
          brief: clean(body.brief, 16000), docStart: /^\d{4}-\d{2}-\d{2}$/.test(String(body.docStart || '')) ? body.docStart : '', docFinish: /^\d{4}-\d{2}-\d{2}$/.test(String(body.docFinish || '')) ? body.docFinish : '' }, by);
        let job = await J.find(core);   // a new project starts in Pre-sales
        // 📄 started from a document: it becomes the project's first Ask AI document, and the plan builder reads it
        let docId = '';
        if (body.docSid) {
          const d0 = await DOCI.staged(body.docSid), d = d0 && (!d0.by || d0.by === who) ? d0 : null;   // 🔒 only the person who uploaded it
          if (d) { const r = await intelUpload(core, { name: d.name, text: d.text, pages: d.pages, kind: 'Project document' }, by); if (r.doc) { docId = r.doc.id; await J.update(core, { docId, docName: d.name }); job = await J.find(core); } }
        }
        // 📍 the place chosen from the list: country, state, town and postcode, kept with the project (Ask AI answers "projects in Sydney / NSW / Australia" from it)
        if (body.loc && typeof body.loc === 'object') { const L0 = body.loc, cc = clean(L0.cc, 2).toUpperCase(); if (/^[A-Z]{2}$/.test(cc)) { const pl = WCAL.placeOf(cc, clean(L0.st, 24), clean(L0.place, 120)); job = await J.update(core, { loc: { cc: pl.cc, st: pl.st, place: pl.place, town: clean(L0.town, 80), postcode: clean(L0.postcode, 12) } }) || job; } }
        if (body.bom === false) await setModule(core, 'bom', false);     // optional modules chosen on the form
        if (body.swms === false) await setModule(core, 'swms', false);
        await A.audit(who, `${J.refFor(job)}: project created (${pname})`);
        return out(200, { core, ref: J.refFor(job), docId });
      }
      // ---------- ☁️ R2: signed links so the browser sends files straight to Cloudflare R2 (the keys stay here) ----------
      case 'kbR2Upload': case 'planR2Upload': {
        if (!R2.ready()) return out(200, { r2: false });
        const kb = action === 'kbR2Upload'; if (kb && !ctx.owner) return bad('Only the super user manages the knowledge base.', 403);
        const core = clean(body.core, 40); if (!kb && !(await J.find(core))) return bad('Project not found', 404);
        const size = Math.max(0, Number(body.size) || 0); if (size > R2.MAX_UPLOAD) return bad('That file is over 300 MB.');
        const key = R2.newKey(kb ? 'kb' : 'project', core, clean(body.name, 160));
        return out(200, { r2: true, key, url: R2.presign('PUT', key, { expires: 900 }) });
      }
      case 'kbR2Put': case 'planR2Put': {   // the same, through the server (small files), when the browser cannot reach R2 (no CORS rule yet)
        if (!R2.ready()) return bad('R2 is not set up', 400);
        const kb = action === 'kbR2Put'; if (kb && !ctx.owner) return bad('Only the super user manages the knowledge base.', 403);
        const core = clean(body.core, 40), key = String(body.key || '');
        if (!R2.keyOk(key, kb ? 'kb/' : `projects/${core}/`)) return bad('Not a storage key for this', 400);
        const buf = Buffer.from(String(body.file || ''), 'base64'); if (!buf.length || buf.length > 4.5 * 1024 * 1024) return bad('Too big to send this way: add the CORS rule to the R2 bucket.');
        await R2.put(key, buf, clean(body.type, 100)); return out(200, { ok: true, key });
      }
      case 'kbFile': {
        if (!ctx.owner) return bad('Only the super user manages the knowledge base.', 403);
        const d = (await KB.list()).find((x) => x.id === clean(body.id, 30)); if (!d || !d.r2) return bad('The original file is not kept for this one.', 404);
        return out(200, { url: R2.presign('GET', d.r2, { expires: 600, download: d.name }), name: d.name });
      }
      case 'r2Status': {
        if (!ctx.owner) return bad('Only the super user sees storage.', 403);
        if (!R2.ready()) return out(200, { ready: false });
        try { const [all, kbu] = await Promise.all([R2.usage(''), R2.usage('kb/')]); return out(200, { ready: true, bucket: R2.cfg().bucket, ...all, kb: kbu }); }
        catch (e) { return out(200, { ready: true, error: e.message }); }
      }
      case 'kbList': { if (!ctx.owner) return bad('Only the super user manages the knowledge base.', 403); return out(200, { docs: await KB.list(), credit: KB.DEFAULT_CREDIT }); }
      case 'kbAdd': {
        if (!ctx.owner) return bad('Only the super user manages the knowledge base.', 403);
        const r = await KB.add({ name: body.name, title: body.title, credit: body.credit, pages: body.pages, text: body.text, r2Key: body.r2Key, size: body.size, type: body.type }, who); if (r.error) return bad(r.error);
        await A.audit(who, `Knowledge base: added "${r.doc.title}" (${r.doc.pages} pages/slides, ${r.doc.chunks} chunks)`);
        return out(200, r);
      }
      case 'kbChange': { if (!ctx.owner) return bad('Only the super user manages the knowledge base.', 403); const r = await KB.change(clean(body.id, 30), { on: body.on, title: body.title, credit: body.credit }); return r.error ? bad(r.error, 404) : out(200, r); }
      case 'kbDelete': { if (!ctx.owner) return bad('Only the super user manages the knowledge base.', 403); const r = await KB.remove(clean(body.id, 30)); await A.audit(who, 'Knowledge base: removed a document'); return out(200, r); }
      case 'kbTry': { if (!ctx.owner) return bad('Only the super user manages the knowledge base.', 403); return out(200, { hits: await KB.search(clean(body.q, 300), 6000) }); }
      case 'planDocStage': {   // 📄 a document for a new project: its text, staged for the AI to read (RAG)
        const r = await DOCI.stage({ name: body.name, pages: body.pages, text: body.text, kind: body.kind }, who);
        if (r.error) return bad(r.error);
        return out(200, { ...r, budget: DOCI.budget() });
      }

      // ---------- where the data lives: Blobs or Postgres (README-POSTGRES.txt), super user only ----------
      case 'dbMoveStatus': {
        if (!ctx.owner) return bad('Only the super user can move the data.', 403);
        const { blobStore, usingPostgres } = await import('../lib/storage.mjs');
        const r = await (await blobStore(A.ADMIN)).get('db-move', { type: 'json' }).catch(() => null);
        return out(200, { using: usingPostgres() ? 'postgres' : 'blobs', database: !!env('CHAMP_DATABASE_URL'), report: r });
      }

      // ---------- data explorer ----------
      case 'stores': {
        const res = [];
        for (const s of A.BROWSABLE) { try { res.push({ store: s, count: (await A.listKeys(s)).length }); } catch (e) { res.push({ store: s, count: 0, error: e.message }); } }
        return out(200, { stores: res });
      }
      case 'dataList': {
        if (!storeOk(body.store)) return bad('Unknown store');
        return out(200, { store: body.store, rows: await A.listKeys(body.store) });
      }
      case 'dataGet': {
        if (!storeOk(body.store)) return bad('Unknown store');
        if (/^ppl/.test(String(body.key || '')) && !U.allows(ctx, 'pplGet').ok) return bad('People records need access to People.', 403);   // v86
        return out(200, { key: body.key, value: await A.getValue(body.store, String(body.key || '')) });
      }
      case 'dataDelete': {
        if (!storeOk(body.store)) return bad('Unknown store');
        const keys = (Array.isArray(body.keys) ? body.keys : []).map(String).slice(0, 500);
        if (!keys.length) return bad('Nothing selected');
        if (keys.some((k) => /^ppl/.test(k)) && !U.allows(ctx, 'pplSave').ok) return bad('People records need edit access to People.', 403);   // v86
        const done = await A.deleteKeys(body.store, keys);
        await A.audit(who, `Deleted ${done.length} item(s) from ${body.store}: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '…' : ''}`);
        return out(200, { deleted: done });
      }
      case 'dataMove': {
        const from = body.from, to = body.to;
        if (!([A.LIVE, A.TEST].includes(from) && [A.LIVE, A.TEST].includes(to)) || from === to) return bad('Jobs can only move between the live and test databases');
        const keys = (Array.isArray(body.keys) ? body.keys : []).map(String).slice(0, 500);
        if (!keys.length) return bad('Nothing selected');
        const moved = await A.moveKeys(from, to, keys);
        await A.audit(who, `Moved ${moved.length} item(s) ${from} → ${to}`);
        return out(200, { moved });
      }
      case 'rebuildIndex': {
        if (![A.LIVE, A.TEST].includes(body.store)) return bad('Unknown store');
        const n = await A.rebuildIndex(body.store);
        await A.audit(who, `Rebuilt the job list of ${body.store} (${n} jobs)`);
        return out(200, { jobs: n });
      }
      case 'log': if (!ctx.owner) return bad('Only the super user sees the activity log.', 403); return out(200, { log: await A.auditLog() });
      default: {
        const a = (await acctPost(action, body, { who, by })) || (await sqlPost(action, body, { who, by, ctx })) || (await planPost(action, body, { who, by, audit: A.audit, ctx })) || (await invPost(action, body, { who, by, audit: A.audit })) || (await custPost(action, body, { who, by, audit: A.audit })) || (await planQuotePost(action, body, { who, by, audit: A.audit })) || (await subPost(action, body, { who, by, audit: A.audit })) || (await intelPost(action, body, { who, by, audit: A.audit, ctx })) || (await swmsPost(action, body, { who, by, audit: A.audit })) || (await commsPost(action, body, { who, by, audit: A.audit, money: U.seesMoney(ctx) })) || (await reportPost(action, body, { who, by, audit: A.audit })) || (await PPL.pplPost(action, body, { who, by, audit: A.audit, unlogin: U.removeForPerson, ctx })) || (await bomPost(action, body, { who, by, audit: A.audit })) || (await prlPost(action, body, { who, by, audit: A.audit, A: ACC, SUB })) || (await lvPost(action, body, { who, by, audit: A.audit, ctx })) || (await U.userPost(action, action === 'userGuestLoad' ? { ...body, test: PPL.isTest() } : body, { ctx, audit: A.audit, person: PPL.get, sub: SUB.getSub, project: projectOf, addPerson: (u) => PPL.selfMake(u, by) }));
        // 💰 a login without money (contractors, project personnel ...): the money taken out of every project answer (lists, programs, boards, reports);
        //    planGet and planSave do it themselves (and keep the money when such a login saves)
        if (a && !U.seesMoney(ctx) && /^(plan|pipeline|intel|comms)/.test(action) && !['planGet', 'planSave'].includes(action) && a.headers.get('content-type') && /json/.test(a.headers.get('content-type'))) {
          const j = await a.clone().json().catch(() => null); if (j) return out(a.status, scrubMoney(j));
        }
        return a || bad('Unknown action');
      }
    } })();
    if (res && res.status === 200 && /^(planSave|planNewProject|planProgram|planDelete|planArchive|planRestore|userSave|userCreate|userPrograms)/.test(action)) U.pgmFlush();   // who reaches which project may have changed
    if (res && res.status === 200 && ['pplList', 'pplGet'].includes(action)) {   // 🔗 each person shows their login and its role
      const L = await U.list(), j = await res.clone().json();
      const tag = (p) => { const u = loginOf(L, p); return u ? { ...p, role: u.role, login: { id: u.id, role: u.role, active: u.active !== false, username: u.username } } : p; };
      res = out(200, action === 'pplList' ? { ...j, people: (j.people || []).map(tag) } : { ...j, person: tag(j.person) });
    }
    if (res && res.status === 200 && ['userCreate', 'userSave'].includes(action)) {   // the login's role changed: the person's Role follows
      const j = await res.clone().json().catch(() => ({})); if (j.user && j.user.role) await PPL.followRole(j.user.personId, j.user.email || j.user.username, j.user.role, by).catch(() => null);
    }
    if (ctx.pgm && res && res.status === 200) {
      // a program they just made is theirs from now on
      if (pgmBefore) { for (const p of await PGM.list()) if (!pgmBefore.has(p.id)) await U.addProgram(ctx.uid, p.id); U.pgmFlush(); }
      if (ctx.pgm.kind === 'project' && action === 'planNewProject') { const j0 = await res.clone().json().catch(() => ({})); if (j0.core) await U.addProject(ctx.uid, j0.core); }   // 📁 a project a Project manager makes is theirs
      // 👥 people: only those on their projects (from the plans), and no rates or pay
      if (['pplList', 'pplGet', 'pplAssign'].includes(action)) {
        const as = await PPL.assignments(), inMine = (id) => Object.keys((as[id] || {}).by || {}).some((c) => ctx.scope.includes(c));
        const clean = (p) => Object.fromEntries(Object.entries(p || {}).filter(([k]) => !(ctx.pgm.kind === 'project' ? /pay|salary|bank|tfn|super|abn/i : /rate|pay|salary|cost|bank|tfn|super|abn/i).test(k)));
        const trimA = (a) => { if (!a) return a; const by = Object.fromEntries(Object.entries(a.by || {}).filter(([c]) => ctx.scope.includes(c))), sum = (k) => Object.values(by).reduce((t, n) => t + (n[k] || 0), 0);
          return { ...a, list: (a.list || []).filter((x) => ctx.scope.includes(x.core)), by, projects: Object.keys(by).length, now: sum('now'), next: sum('next'), late: sum('late') }; };   // 🔒 only their projects, and the counts from those
        const j = await res.clone().json();
        if (action === 'pplList') return out(200, { ...j, people: (j.people || []).filter((p) => inMine(p.id)).map(clean), scoped: true });
        if (action === 'pplGet') return j.person && inMine(j.person.id) ? out(200, { ...j, person: clean(j.person), assign: trimA(j.assign) }) : bad('That person is not on your projects.', 403);
        if (action === 'pplAssign') return out(200, { assign: Object.fromEntries(Object.entries(j.assign || {}).filter(([id]) => inMine(id)).map(([id, a]) => [id, trimA(a)])) });
      }
    }
    // 🔏 the project audit trail: every change made to a project (plan saves record their own field-by-field detail)
    if (res && res.status === 200 && ctx) await auditAction(action, body, ctx, by, action === 'planNewProject' ? await res.clone().json().catch(() => null) : null).catch((e) => console.error('Audit trail: ' + e.message));
    return res;
  } catch (e) {
    console.error('Admin error:', e);
    return bad('Something went wrong: ' + e.message, 500);
  }
}
