// MBS Console v86: Users & access (a small "Active Directory").
// Only people in the People register (employees and contractors) can be given a login. Each user has a role, and for every
// module of the console an access level: none, view or edit. The server checks it on every request; the menu hides what a
// user can't open. The Netlify login (ADMIN_USERNAME / ADMIN_PASSWORD) is the Owner: it always works and can do everything,
// so nobody can be locked out.
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { store, ADMIN } from './admin-lib.mjs';
// accounts live in the private admin store (not the job store), so the Data explorer can never list them or their password hashes
const kv = {
  async get(k) { const s = await store(ADMIN); return s.get(k, { type: 'json' }); },
  async set(k, v) { const s = await store(ADMIN); await s.setJSON(k, v); },
  async del(k) { const s = await store(ADMIN); await s.delete(k); },
  async update(k, fn, fallback) { const cur = (await this.get(k)) || (fallback ? fallback() : null); const next = fn(cur); await this.set(k, next); return next; } };

const str = (s, max = 300) => String(s ?? '').replace(/[\u0000-\u001F]/g, '').trim().slice(0, max);
const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });

// ---------- modules and access levels ----------
export const MODS = [
  ['crm', 'Jobs & customers', 'Dashboard, jobs, customers, new jobs and reminders'],
  ['projects', 'Projects', 'Plans, Gantt chart, Board, scope, stakeholders, risks, comms, reports, SWMS, change control, Ask AI'],
  ['accounts', 'Accounts', 'Quotes, invoices, expenses, accounting and BAS'],
  ['subbies', 'Sub-contractors', 'Subbies, their licences and insurance'],
  ['people', 'People', 'Employees and contractors, tickets, rates and workload'],
  ['data', 'Data & AI', 'Ask AI, SQL wizard and reports, data explorer, activity log'],
  ['users', 'Users & access', 'Logins, roles and what each person can use']];
export const MOD_KEYS = MODS.map((m) => m[0]);
export const LEVELS = ['none', 'view', 'edit'];
const LV = { none: 0, view: 1, edit: 2 };
const all = (lv) => Object.fromEntries(MOD_KEYS.map((k) => [k, lv]));
// GKH Project Champ: the super user (the Netlify login) makes every login by email and sets its password; four kinds of people:
//   Project manager (admin: everything, all projects), Contractor and Project personnel (limited: their projects),
//   and Google sign-ins (view only). The older roles below stay only so logins made before keep working.
export const ROLES = {
  // GKH Project Champ: a project director or manager runs projects: Projects, People, Ask AI & reports and Users & access
  // (they add contractors and project personnel); no customers (enquiries, visitors), and only the super user sees the activity log and builds
  // 👔 the CEO (one per company): sees every project and the money, read-only; no people's personal detail, no admin screens
  CEO: { ...all('none'), projects: 'view', accounts: 'view', data: 'view' },
  // 💵 the CFO (one per company): billing, invoices and payments (edit), every project read-only, Ask AI
  CFO: { ...all('none'), projects: 'view', accounts: 'edit', data: 'view' },
  // 🗄 the site administrator (to be defined further): sees every project, and can archive projects (with the super user and the CEO)
  'Site administrator': { ...all('none'), projects: 'view', data: 'view' },
  // 💵 finance personnel (any number): billing, invoices and payments on every project, like the CFO; projects read-only
  'Finance personnel': { ...all('none'), projects: 'view', accounts: 'edit', data: 'view' },
  // 🧭 the PMO Director (one per company, third in charge after the CEO and the CFO): runs delivery across every program and project;
  //    the project directors, managers, consultants and contractors report in. Projects, people, sub-contractors, Ask AI and reports, and the logins (edit);
  //    billing read-only (the CFO raises invoices); no customers
  'PMO Director': { ...all('edit'), crm: 'none', accounts: 'view' },
  // 🗺 the Program manager: runs one or more programs (given to them in People or Users & access) and sees only those programs, their projects and the people on them.
  //    Makes programs and projects; Ask AI over their own projects; no money, no customers, no logins
  'Program manager': { ...all('none'), projects: 'edit', people: 'view', data: 'view' },
  'Project manager': { ...all('edit'), crm: 'none', accounts: 'none' },
  // 🏃 the Scrum Master and the Product Owner lead delivery like a Project manager: only the projects given to them (or naming them), their billing (raise invoices), no customers
  'Scrum Master': { ...all('edit'), crm: 'none', accounts: 'none' },
  'Product Owner': { ...all('edit'), crm: 'none', accounts: 'none' },
  Contractor: { ...all('none'), projects: 'edit' },
  'Project personnel': { ...all('none'), projects: 'edit' },   // 🔒 no Reports & data: it holds the costs
  Administrator: { ...all('edit') },
  'Site supervisor': { crm: 'view', projects: 'edit', accounts: 'none', stock: 'view', subbies: 'view', people: 'view', data: 'none', users: 'none' },
  Accounts: { crm: 'view', projects: 'view', accounts: 'edit', stock: 'view', subbies: 'view', people: 'view', data: 'view', users: 'none' },
  'Read only': { ...all('view'), users: 'none' },
  Guest: { ...all('none'), crm: 'view', projects: 'view' },   // v88: for trying the console out
  'Sub-contractor': { ...all('none'), projects: 'edit' },   // v91: a subbie: only their own project(s), nothing else
  Custom: null };
export const ROLE_KEYS = Object.keys(ROLES);
export const PICK_ROLES = ['CEO', 'CFO', 'PMO Director', 'Program manager', 'Finance personnel', 'Site administrator', 'Project manager', 'Scrum Master', 'Product Owner', 'Contractor', 'Project personnel', 'Custom'];
// 📁 the delivery leads: project-level only (the projects given to them, and any naming them as manager); billing and invoices for those projects
export const DELIVERY = ['Project manager', 'Scrum Master', 'Product Owner'];
export const isLead = (ctx) => !!ctx && DELIVERY.includes(ctx.role) && !!ctx.pgm && ctx.pgm.kind === 'project';
export const TEAM_ROLES = ['Contractor', 'Project personnel'];
export const PMO_TEAM = ['Program manager', 'Project manager', 'Scrum Master', 'Product Owner', 'Contractor', 'Project personnel'];   // 🧭 the PMO Director makes and looks after these logins (the people who report in)
const ONE_ROLE = ['CEO', 'CFO'];   // one each per company (there can be several PMO Directors)   // what a project director or manager may make and look after   // the project manager is the super user   // what the super user picks from
// 📁 every project: the CEO, the CFO, PMO Directors, finance and site administrators. A Project manager sees only the projects given to them (and those they are named manager of)
const ALL_PROJECTS = (u) => u.role === 'PMO Director' || u.role === 'Site administrator' || u.role === 'Finance personnel' || u.role === 'CEO' || u.role === 'CFO' || (u.projAll === true && !['Project manager', 'Scrum Master', 'Product Owner', 'Program manager'].includes(u.role));
// 🔁 Project director is now PMO Director (several allowed): older logins are read as PMO Director
export const normRole = (r) => (r === 'Project director' ? 'PMO Director' : r);
// 👔 a company has one CEO: giving the role to someone else is refused until the current CEO has another role
async function ceoTaken(exceptId, role = 'CEO') { const c = (await list()).find((x) => x.role === role && x.id !== exceptId && x.active !== false); return c ? (c.name || c.username) + ' is already the ' + role + '. A company has one ' + role + ': give ' + (c.name || c.username) + ' another role first.' : ''; }   // the CEO and the CFO: one each
export const OWNER_MODS = all('edit');

// which module (and level) an action needs. null = any signed-in user (me, logout, own password).
const READ = /^(dashboard|jobs|job|reminders|report|stores|dataList|dataGet|log|pipelineBoard|aiPing|sqlUsage|sqlAsk|sqlAnswer|sqlData|sqlNarrative|sqlPdf|docForJob|docGet)$|(List|Lists|Get|Log|Status|Setup|Analysis|Info|Jobs|Insights|For|Usage|Analyse|Report|Export|Assign)$/;
export function need(action) {
  const a = String(action || '');
  if (/^vault[A-Z]/.test(a)) return null;
  if (a === 'planArchiveList' || a === 'planProjectArchive' || a === 'planProjectRestore') return null;   // 🗄 the project archive: admin.mjs checks (super user, CEO, site administrator)
  if (a === 'acctFinanceGet' || a === 'acctBillGet' || a === 'acctBillAlerts' || a === 'acctVoRaise' || a === 'acctVoDecide' || a === 'acctBillRaise') return null;   // 💵 billing: billing.mjs checks (CEO, CFO, the program's director, the project's manager)   // 🔒 the Finance vault checks who may open and file itself (vault.mjs)
  if (['me', 'logout', 'login', 'userPassword', 'pplMe', 'pplMeSave', 'pplMeCv', 'pplMeCvGet', 'pplMeCvParse', 'guideAsk'].includes(a)) return null;
  if (/^esg[A-Z]/.test(a)) return null;   // 🌿 ESG & Sustainability: open to every signed-in staff login (scopeCheck keeps contractor and program logins out)   // My profile: anyone signed in, their own record
  let mod;
  if (a === 'quoteStart' || a === 'planQuote') mod = 'accounts';
  else if (/^(dashboard|jobs|job|stage|note|create|reminders|remind|unremind|report|pipelineBoard)$/.test(a) || /^(cust|promo)[A-Z]/.test(a)) mod = 'crm';
  else if (/^(plan|comms|intel|swms|board)[A-Z]/.test(a) || /^report[A-Z]/.test(a)) mod = 'projects';
  else if (/^(acct|doc|exp|pay)[A-Z]/.test(a)) mod = 'accounts';
  else if (/^(inv|sup)[A-Z]/.test(a)) mod = 'stock';
  else if (/^sub[A-Z]/.test(a)) mod = 'subbies';
  else if (/^ppl[A-Z]/.test(a)) mod = 'people';
  else if (/^prl[A-Z]/.test(a)) return { mod: 'people', level: 'edit' };
  else if (/^lv(Mine|Request|Cancel)$/.test(a)) return null;   // v108: anyone signed in asks for their own leave
  else if (/^lv[A-Z]/.test(a)) return { mod: 'people', level: 'edit' };   // managers approve and see everyone's   // v107: payroll is people's pay: edit access only, even to look
  else if (/^user[A-Z]/.test(a)) mod = 'users';
  else if (/^(sql[A-Z]|data[A-Z]|stores$|rebuildIndex$|log$|aiPing$)/.test(a)) mod = 'data';
  else mod = 'users';   // anything not listed: administrators only
  if (a === 'planQuoteInfo') mod = 'projects';
  if (a === 'planMyDaySeen') return { mod: 'projects', level: 'view' };   // 👁 marking something you were sent as viewed: looking, not changing the plan
  return { mod, level: READ.test(a) && !/^(planQuote|quoteStart)$/.test(a) ? 'view' : 'edit' };
}
// reads other modules need to work (the plan page shows subbies, stock, people and the job's quote / invoice)
const SUPPORT = { subList: ['projects', 'people', 'users'], invList: ['projects'], invGet: ['projects'], pplList: ['projects', 'subbies', 'crm'], docForJob: ['projects', 'crm'], job: ['projects'],
  custFor: ['projects', 'accounts'], custGet: ['accounts'], custList: ['accounts'], planList: ['people', 'users'], pplAssign: ['projects'], dashboard: [] };
export function allows(ctx, action) {
  if (!ctx) return { ok: false };
  if (ctx.owner) return { ok: true };
  const n = need(action); if (!n) return { ok: true };
  const have = LV[(ctx.mods || {})[n.mod]] || 0;
  if (have >= LV[n.level]) return { ok: true };
  if (n.level === 'view' && (SUPPORT[action] || []).some((m) => LV[(ctx.mods || {})[m]] >= 1)) return { ok: true };
  const name = (MODS.find((m) => m[0] === n.mod) || [])[1] || n.mod;
  return { ok: false, mod: n.mod, error: have ? `You have view-only access to ${name}. Ask an administrator for edit access.` : `You don't have access to ${name}. Ask an administrator.` };
}
// the AI background jobs: Ask AI questions need view, everything else (plans, costs, charter ...) edit
// 💰 who sees money (costs, rates, budget, BOM prices, invoices): the super user, the CEO, the CFO, finance personnel, project directors and managers.
//    Contractors, project personnel, the site administrator and view-only sign-ins see the work, not the money.
export const MONEY_ROLES = ['CEO', 'CFO', 'PMO Director', 'Finance personnel', 'Project manager', 'Scrum Master', 'Product Owner', 'Administrator', 'Accounts'];
export function seesMoney(ctx) { return !!ctx && (!ctx.scope || !!(ctx.pgm && ctx.pgm.kind === 'project')) && (!!ctx.owner || MONEY_ROLES.includes(ctx.role)); }   // a Project manager keeps money on their own projects
export function allowsBg(ctx, mode) {
  if (!ctx) return false; if (ctx.owner) return true;
  if (mode === 'esgDoc' || mode === 'esgInsight' || mode === 'esgBill' || mode === 'esgMap' || mode === 'svBill') return true;   // 🌿 ESG: anyone signed in
  const lv = LV[(ctx.mods || {}).projects] || 0;
  return mode === 'vaultRedact' || mode === 'ceoBrief' || mode === 'ceoAsk' || mode === 'intel' || mode === 'watch' || mode === 'docAnalyse' || mode === 'docReview' || mode === 'lessonsReport' ? lv >= 1 : lv >= 2;
}

// ---------- passwords ----------
export function hashPw(pw) { const salt = randomBytes(16).toString('hex'); return { salt, hash: scryptSync(String(pw), salt, 32).toString('hex') }; }
function checkPw(u, pw) {
  if (!u || !u.salt || !u.hash) return false;
  const a = scryptSync(String(pw || ''), u.salt, 32), b = Buffer.from(u.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
export function pwProblem(pw) {
  pw = String(pw || '');
  if (pw.length < 10) return 'Use at least 10 characters';
  if (!/[a-z]/i.test(pw) || !/\d/.test(pw)) return 'Use letters and at least one number';
  return '';
}
export function tempPassword() {   // easy to read out: no 0/O, 1/l
  const A = 'abcdefghjkmnpqrstuvwxyz', D = '23456789', b = randomBytes(12); let s = '';
  for (let i = 0; i < 12; i++) s += i === 4 || i === 9 ? D[b[i] % D.length] : A[b[i] % A.length];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}

// ---------- users ----------
const cleanMods = (m, role) => { const base = ROLES[role] || null, o = {}; for (const k of MOD_KEYS) { const v = (m || {})[k]; o[k] = LEVELS.includes(v) ? v : base ? base[k] : 'none'; } return o; };
const summary = (u) => ({ id: u.id, personId: u.personId, name: u.name, username: u.username, email: u.email, role: u.role, programs: u.role === 'Program manager' ? (u.programs || []) : undefined, mods: u.mods, active: u.active, mustChange: !!u.mustChange, lastLogin: u.lastLogin || 0, created: u.created,
  kind: u.kind || 'person', subId: u.subId || '', projects: u.projects || [], projAll: !!u.projAll, mustChange2: !!u.mustChange, upgraded: !!u.upgraded, by: u.by || '' });
// v91: a sub-contractor login: Projects only (view or edit), and only the projects it was given
const subMods = (lv) => ({ ...all('none'), projects: lv === 'view' ? 'view' : 'edit' });
// v97: "Sign in with Google" (test site): anyone with a verified Google account gets View on every module, nothing in Users & access
export const GOOGLE_MODS = { ...all('view'), users: 'none' };
export async function googleUser(email, name, by) {
  email = str(email, 160).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  const hit = (await list()).find((x) => x.kind === 'google' && x.username === email);
  if (hit) { const u = await get(hit.id); if (!u || !u.active) return u ? { disabled: true } : null; u.lastLogin = Date.now(); if (name) u.name = str(name, 100); await put(u); return u; }
  if ((await list()).some((x) => x.username === email)) return { clash: true };   // a staff login already uses this email: they sign in with their password
  const n = await kv.update('user-seq', (x) => ({ n: ((x && x.n) || 0) + 1 }), () => ({ n: 0 }));
  const u = { id: 'U-' + String(n.n).padStart(3, '0'), kind: 'google', personId: '', name: str(name, 100) || email, email, username: email, role: 'Read only', mods: { ...GOOGLE_MODS }, active: true, mustChange: false,
    ver: 1, created: Date.now(), lastLogin: Date.now(), by: str(by, 60) || 'Google sign-in' };
  await put(u); return u;
}
// what a sub-contractor signed in to one project may do. Every request naming a project must be theirs; other requests only
// from this list (the plan page's own lookups). Money, people and other subbies' details stay out.
const SCOPE_FREE = new Set(['planEsgPortfolioGet', 'esgAiStatus', 'esgSchema', 'esgCso', 'esgFactors', 'esgVaultOrgs', 'esgVaultOpen', 'esgVaultGet', 'esgVaultSave', 'esgVaultBills', 'esgVaultAddBill', 'esgVaultUrl', 'esgVaultAdd', 'esgVaultFile', 'esgVaultDelete', 'esgList', 'esgGet', 'esgCreate', 'esgSample', 'esgSave', 'esgDelete', 'me', 'planRaidList', 'planMyDayGet', 'planPlacesGet', 'planHolidaysGet', 'logout', 'userPassword', 'planList', 'planPipelineList', 'pplMe', 'pplMeSave', 'pplMeCv', 'pplMeCvGet', 'pplMeCvParse', 'guideAsk', 'planAiStatus', 'commsSetup', 'planBomTplList', 'planBomTplGet', 'invList', 'invGet']);
// 🗺 a Program manager, beyond the project pages: their programs and links, new programs and projects, the people on their projects, and Ask AI over their own data
//    (each of these is filtered or checked in admin.mjs: programs and projects to theirs, people to those on their projects, no money)
const PGM_OK = new Set(['planPlacesGet', 'planProgramList', 'planProgramSave', 'planProgramDefaults', 'planProgramSet', 'planProgramMove', 'planDepSave', 'planDepDelete', 'planNewProject', 'planPipelineList', 'planPgmGet', 'pplList', 'pplGet', 'pplAssign',
  'sqlData', 'sqlAsk', 'sqlAnswer', 'sqlNarrative', 'sqlPdf', 'sqlUsage', 'aiPing', 'docStage', 'planDocStage',
  // 📁 a Project manager: their contractors' and personnel's logins (their projects only), Finance and the vault for their projects (the server decides per project)
  'userList', 'userCreate', 'userSave', 'userSetPw', 'userReset', 'userDelete', 'acctBillAlerts', 'acctFinanceGet', 'acctBillGet', 'acctVoRaise', 'vaultSearch', 'vaultUrl', 'vaultAdd', 'vaultFile', 'vaultDelete', 'vaultMoveIn']);
const SCOPE_DENY = new Set(['planDelete', 'planJobs', 'planQuote', 'planQuoteInfo', 'quoteStart', 'docToInvoice', 'docForJob', 'pipelineBoard', 'planBomTplSave', 'planBomTplDelete', 'pplList', 'pplAssign', 'subList', 'custFor', 'job']);
export function scopeCheck(ctx, action, body) {
  if (!ctx || !ctx.scope) return { ok: true };
  const a = String(action || ''), no = { ok: false, error: ctx.pgm && ctx.pgm.kind === 'program' ? 'This login can only work on the programs it was given.' : 'This login can only work on the projects it was given.' };
  if (ctx.pgm && PGM_OK.has(a)) { const core = body && (body.core || (body.plan && body.plan.core)); return !core || ctx.scope.includes(String(core)) ? { ok: true } : no; }
  if (SCOPE_DENY.has(a)) return no;
  if (/^esg[A-Z]/.test(a)) return { ok: false, error: 'ESG & Sustainability is for staff logins: this login can only work on the projects it was given.' };   // 🌿 contractor and program logins do not reach the ESG reports or the Sustainability vault
  const core = body && (body.core || (body.plan && body.plan.core));
  if (core) return ctx.scope.includes(String(core)) ? { ok: true } : no;
  return SCOPE_FREE.has(a) ? { ok: true } : no;
}
// 🗺 a Program manager's reach: their programs (by id) and every project in them (cached a few seconds)
let PGC = { at: 0, progs: null, jobs: null };
export async function pgmScope(ids) {
  if (!PGC.progs || Date.now() - PGC.at > 8000) { const PG = await import('./programs.mjs'), J = await import('./jobs.mjs'); const [progs, jobs] = await Promise.all([PG.list(), J.all()]); PGC = { at: Date.now(), progs, jobs }; }
  const want = new Set(Array.isArray(ids) ? ids : []), mine = PGC.progs.filter((p) => want.has(p.id)), names = mine.map((p) => p.name), low = new Set(names.map((n) => n.toLowerCase()));
  return { kind: 'program', ids: mine.map((p) => p.id), names, cores: PGC.jobs.filter((j) => low.has(String(j.program || '').toLowerCase())).map((j) => j.core) };
}
// 📁 a Project manager's reach: the projects given to them, plus any project naming them as its manager; their programs are those projects' programs (to read)
const nrm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
export async function pmScope(u) {
  await pgmScope([]);
  if (!PGC.mgr || Date.now() - (PGC.mgrAt || 0) > 8000) { const P = await import('./plan.mjs'); const plans = await P.list().catch(() => []); PGC.mgr = Object.fromEntries(plans.map((p) => [p.core, (p.charter || {}).manager || ''])); PGC.mgrAt = Date.now(); }
  const given = new Set(u.projects || []), me = nrm(u.name), cores = PGC.jobs.filter((j) => given.has(j.core) || (me && (nrm(j.manager) === me || nrm(PGC.mgr[j.core]) === me))).map((j) => j.core);
  const progLow = new Set(PGC.jobs.filter((j) => cores.includes(j.core)).map((j) => String(j.program || '').toLowerCase())), mine = PGC.progs.filter((p) => progLow.has(p.name.toLowerCase()));
  return { kind: 'project', ids: mine.map((p) => p.id), names: mine.map((p) => p.name), cores };
}
export async function addProject(uid, core) { const u = await get(uid); if (!u || !core) return; u.projects = [...new Set([...(u.projects || []), core])]; await put(u); pgmFlush(); }
export const pgmFlush = () => { PGC.at = 0; PGC.mgrAt = 0; };
export async function addProgram(uid, pid) { const u = await get(uid); if (!u || !pid) return; u.programs = [...new Set([...(u.programs || []), pid])]; await put(u); pgmFlush(); }
async function index() { return (await kv.get('user-index')) || { users: {} }; }
export async function list() { const i = await index(); return Object.values(i.users || {}).map((u) => ({ ...u, role: normRole(u.role) })).sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)); }
export async function get(id) { const u = /^U-\d{3,5}$/.test(id || '') ? await kv.get('user:' + id) : null; if (u) u.role = normRole(u.role); return u; }
async function put(u) { await kv.set('user:' + u.id, u); await kv.update('user-index', (x) => { x.users = x.users || {}; x.users[u.id] = summary(u); return x; }, () => ({ users: {} })); return u; }

// the signed-in user's access (or null when the login no longer works: disabled, password reset, removed from People)
// 🔒 money is the CFO's: project managers and directors no longer see quotes, invoices or payments, whatever an older login says
const finLock = (c) => (c && DELIVERY.includes(c.role) && c.mods ? { ...c, mods: { ...c.mods, accounts: 'none' } } : c);
export async function context(session, ownerName, personOk) { return finLock(await context0(session, ownerName, personOk)); }
async function context0(session, ownerName, personOk) {
  if (!session) return null;
  if (!session.uid) return { owner: true, who: session.u, uid: '', role: 'Super user', mods: OWNER_MODS, name: process.env.OWNER_NAME || 'Sashi Sivam', email: String(process.env.OWNER_EMAIL || '').trim().toLowerCase() };   // OWNER_EMAIL (Netlify): the super user's email, so the plans know them by it
  const u = await get(session.uid);
  if (!u || !u.active || (u.ver || 0) !== (session.v || 0)) return null;
  if (personOk && !(await personOk(u.personId, u))) return null;
  if (u.kind === 'google' && u.upgraded && DELIVERY.includes(u.role)) { const g = await pmScope(u); return { owner: false, who: u.username, uid: u.id, role: u.role, mods: cleanMods(u.mods, u.role), name: u.name, mustChange: false, personId: '', kind: 'google', scope: g.cores, pgm: g }; }   // 📁 a Google delivery lead: their own projects, like any delivery lead
  if (u.kind === 'google' && u.upgraded && ROLES[u.role]) return { owner: false, who: u.username, uid: u.id, role: u.role, mods: cleanMods(u.mods, u.role), name: u.name, mustChange: false, personId: '', kind: 'google', scope: ALL_PROJECTS(u) ? null : (u.projects || []).slice() };   // ⬆ upgraded by the super user: signs in with Google, works with the role
  if (u.kind === 'google') return { owner: false, who: u.username, uid: u.id, role: 'Google (view only)', mods: { ...GOOGLE_MODS }, name: u.name, mustChange: false, personId: '', kind: 'google' };   // v97
  if (u.kind === 'subbie') {   // v91: signed in to one of their projects; nothing else
    if (!session.pc || !(u.projects || []).includes(session.pc)) return null;
    return { owner: false, who: u.username, uid: u.id, role: 'Sub-contractor', mods: subMods((u.mods || {}).projects), name: u.name, mustChange: !!u.mustChange, personId: '', subId: u.subId, kind: 'subbie', scope: [session.pc] };
  }
  const staff = u.kind === 'email' || !u.kind || u.kind === 'person';   // 🔒 logins made from People may have no stored kind: they are scoped just the same
  if (staff && DELIVERY.includes(u.role)) { const g = await pmScope(u); return { owner: false, who: u.username, uid: u.id, role: u.role, mods: cleanMods(u.mods, u.role), name: u.name, mustChange: !!u.mustChange, personId: u.kind === 'email' ? '' : u.personId, kind: u.kind || 'email', scope: g.cores, pgm: g }; }
  if (staff && u.role === 'Program manager') { const g = await pgmScope(u.programs); return { owner: false, who: u.username, uid: u.id, role: u.role, mods: cleanMods(u.mods, u.role), name: u.name, mustChange: !!u.mustChange, personId: u.kind === 'email' ? '' : u.personId, kind: u.kind || 'email', scope: g.cores, pgm: g }; }
  if (u.kind === 'email') return { owner: false, who: u.username, uid: u.id, role: u.role, mods: cleanMods(u.mods, u.role), name: u.name, mustChange: !!u.mustChange, personId: '', kind: 'email', scope: ALL_PROJECTS(u) ? null : (u.projects || []).slice() };
  return { owner: false, who: u.username, uid: u.id, role: u.role, mods: cleanMods(u.mods, u.role), name: u.name, mustChange: !!u.mustChange, personId: u.personId };
}
// v90: a person deleted from People: their login goes too
export async function removeForPerson(personId) {
  const gone = (await list()).filter((u) => u.personId === personId).map((u) => u.id);
  for (const id of gone) await kv.del('user:' + id);
  if (gone.length) await kv.update('user-index', (x) => { gone.forEach((id) => { if (x.users) delete x.users[id]; }); return x; }, () => ({ users: {} }));
  return gone;
}
export async function login(username, password, personOk) {
  const name = str(username, 160).toLowerCase(); if (!name) return null;
  const s = (await list()).find((x) => x.username === name || (x.email && x.email.toLowerCase() === name));
  if (!s || !s.active) return null;
  const u = await get(s.id); if (!u || !checkPw(u, password)) return null;
  if (personOk && !(await personOk(u.personId, u))) return null;
  u.lastLogin = Date.now(); await put(u);
  return u;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
async function projectList(arr, project) { const projects = []; for (const c of (Array.isArray(arr) ? arr : []).slice(0, 60)) { const pj = project ? await project(str(c, 30)) : null; if (pj && !projects.includes(pj.core)) projects.push(pj.core); } return projects; }
export async function userPost(action, body, { ctx, audit, person, sub, project, addPerson }) {
  const log = (t) => (audit ? audit(ctx.who, t) : null);
  // 📁 a Project manager gives contractors and project personnel only their own projects, and sees only those logins
  if (ctx.scope) { const okP = new Set(ctx.scope), p0 = project; project = async (c) => (okP.has(String(c)) && p0 ? p0(c) : null); }
  // the super user makes any login, sets roles and upgrades people; a project director or manager with Users & access (edit) makes and looks after
  // contractor and project personnel logins only (never their own, another manager's, a Google sign-in's, and never a role above those)
  const team = !ctx.owner && (ctx.mods || {}).users === 'edit' && [...DELIVERY, 'PMO Director'].includes(ctx.role), MY = ctx.role === 'PMO Director' ? PMO_TEAM : TEAM_ROLES;
  const inReach = (u) => !ctx.scope || (!u.projAll && (u.projects || []).length > 0 && (u.projects || []).every((c) => ctx.scope.includes(c)));   // 🔒 a project manager: only logins wholly on their own projects (a login shared with other projects stays with the super user and PMO Directors)
  const teamOk = async (id) => { const u = await get(str(id, 10)); return u && u.id !== ctx.uid && u.kind === 'email' && MY.includes(u.role) && inReach(u) ? u : null; };
  if (!['userList', 'userPassword'].includes(action) && !ctx.owner) {
    if (!team || !['userCreate', 'userSave', 'userSetPw', 'userReset', 'userDelete', 'userPrograms'].includes(action)) return out(403, { error: 'Only the super user can change this.' });
    if (action === 'userCreate' && !MY.includes((body.user || {}).role)) return out(403, { error: MY === PMO_TEAM ? 'You can add program managers, project managers, contractors and project personnel.' : 'You can add contractors and project personnel. Only the super user makes project managers and directors.' });
    if (action !== 'userCreate' && !(await teamOk(action === 'userSave' ? (body.user || {}).id : body.id))) return out(403, { error: MY === PMO_TEAM ? 'You can look after the logins of the program managers, project managers, contractors and project personnel only.' : 'You can look after the contractor and project personnel logins only. Ask the super user.' });
    if (action === 'userSave' && !MY.includes((body.user || {}).role)) return out(403, { error: 'Only the super user can upgrade someone to project manager or director.' });
  }
  switch (action) {
    case 'userList': return out(200, { users: ctx.scope ? (await list()).filter((u) => u.id === ctx.uid || (TEAM_ROLES.includes(u.role) && (u.projects || []).some((c) => ctx.scope.includes(c)))) : await list(), mods: MODS.map((m) => ({ key: m[0], name: m[1], about: m[2] })), roles: ROLE_KEYS.map((r) => ({ name: r, mods: ROLES[r] })), pick: ctx.owner ? PICK_ROLES : team ? MY : [], levels: LEVELS, super: ctx.owner ? ctx.who : '', superName: process.env.OWNER_NAME || 'Sashi Sivam', team });
    case 'userPrograms': {   // 🗺 the programs a Program manager runs (from People or Users & access): they see those programs and nothing else
      const u = await get(str(body.id, 10)); if (!u || u.role !== 'Program manager') return out(404, { error: 'That login is not a Program manager.' });
      const PG = await import('./programs.mjs'), known = new Set((await PG.list()).map((p) => p.id));
      u.programs = [...new Set((Array.isArray(body.programs) ? body.programs : []).map((x) => str(x, 20)).filter((x) => known.has(x)))].slice(0, 40);
      await put(u); pgmFlush(); await log(`Programs for ${u.name || u.username}: ${u.programs.length ? u.programs.join(', ') : 'none'}`);
      return out(200, { ok: true, user: summary(u) });
    }
    case 'userUpgrade': {   // ⬆ the super user: give a Google sign-in a role (it keeps signing in with Google), or take it back to view only
      if (!ctx.owner) return out(403, { error: 'Only the super user can upgrade a user.' });
      const u = await get(str(body.id, 10)); if (!u || u.kind !== 'google') return out(404, { error: 'Google sign-in not found' });
      const role = str(body.role, 40);
      if (role === 'view') { Object.assign(u, { upgraded: false, role: 'Read only', mods: { ...GOOGLE_MODS }, projAll: false, projects: [] }); }
      else {
        if (!['CEO', 'CFO', 'PMO Director', 'Program manager', 'Site administrator', ...DELIVERY, 'Contractor', 'Project personnel'].includes(role)) return out(400, { error: 'Pick a role' });
        if (ONE_ROLE.includes(role)) { const t = await ceoTaken(u.id, role); if (t) return out(400, { error: t }); }
        const projAll = ctx.scope ? false : role === 'PMO Director' || role === 'CEO' || role === 'CFO' ? true : [...DELIVERY, 'Program manager'].includes(role) ? false : body.projAll === true;
        Object.assign(u, { upgraded: true, role, mods: cleanMods(ROLES[role], role), projAll, projects: projAll ? [] : await projectList(body.projects, project) });
      }
      u.ver = (u.ver || 0) + 1; u.updated = Date.now(); u.upgradedBy = ctx.who; await put(u);
      await log(role === 'view' ? `Google sign-in back to view only: ${u.username}` : `Upgraded ${u.username} (Google) to ${role}`);
      return out(200, { user: summary(u) });
    }
    case 'userCreate': {   // the super user: email, name, a password they choose, the role; permissions come next (userSave)
      const f = body.user || {}, email = str(f.email, 160).toLowerCase(), name = str(f.name, 100) || email;
      if (!EMAIL.test(email)) return out(400, { error: 'Type their email address (it is their username).' });
      if ((await list()).some((x) => x.username === email || (x.email || '').toLowerCase() === email)) return out(400, { error: email + ' already has a login.' });
      const bad = pwProblem(f.password); if (bad) return out(400, { error: bad });
      const role = (ctx.owner ? PICK_ROLES : MY).includes(f.role) && f.role !== 'Custom' ? f.role : 'Project personnel';
      if (ONE_ROLE.includes(role)) { const t = await ceoTaken('', role); if (t) return out(400, { error: t }); }
      if (ctx.scope && !(await projectList(f.projects, project)).length) return out(400, { error: 'Tick at least one of your projects for this login.' });
      const n = await kv.update('user-seq', (x) => ({ n: ((x && x.n) || 0) + 1 }), () => ({ n: 0 }));
      const u = { id: 'U-' + String(n.n).padStart(3, '0'), kind: 'email', personId: '', name, email, username: email, role, mods: cleanMods(ROLES[role], role), projects: ctx.scope ? await projectList(f.projects, project) : [], projAll: !ctx.scope && (role === 'Project personnel' || role === 'PMO Director' || role === 'CEO' || role === 'CFO'),
        active: true, mustChange: f.mustChange === true, ver: 1, created: Date.now(), by: ctx.who, ...hashPw(f.password) };
      await put(u); await log(`Login made: ${email} (${name}), ${role}`);
      if (addPerson) { try { await addPerson(u); } catch (e) { console.error('People record for the new login failed:', e.message); } }
      return out(200, { user: summary(u) });
    }
    case 'userSetPw': {   // the super user sets someone's password
      const u = await get(str(body.id, 10)); if (!u) return out(404, { error: 'User not found' });
      if (u.kind === 'google') return out(400, { error: 'Google sign-ins have no password here.' });
      const bad = pwProblem(body.password); if (bad) return out(400, { error: bad });
      Object.assign(u, hashPw(body.password)); u.mustChange = body.mustChange === true; u.ver = (u.ver || 0) + 1; await put(u);
      await log(`Password set for ${u.username}`); return out(200, { user: summary(u) });
    }
    case 'userDelete': {
      const u = await get(str(body.id, 10)); if (!u) return out(404, { error: 'User not found' });
      await kv.del('user:' + u.id); await kv.update('user-index', (x) => { if (x.users) delete x.users[u.id]; return x; }, () => ({ users: {} }));
      await log(`Login deleted: ${u.username}`); return out(200, { ok: true });
    }
    case 'userSave': {
      const f = body.user || {}, id = /^U-\d{3,5}$/.test(f.id || '') ? f.id : '';
      const old = id ? await get(id) : null; if (id && !old) return out(404, { error: 'User not found' });
      if (old && old.kind === 'google') {   // v97: Google sign-ins are always view only: they can only be switched on or off
        const u = { ...old, active: f.active !== false, by: ctx.who, updated: Date.now() };
        if (old.active !== u.active) u.ver = (old.ver || 0) + 1;
        await put(u); await log(`Google sign-in ${u.active ? 'enabled' : 'disabled'}: ${u.username}`);
        return out(200, { user: summary(u), temp: '' });
      }
      if (old && old.kind !== 'google') {   // permissions: role, modules, projects, on/off
        const role = PICK_ROLES.includes(f.role) ? f.role : old.role;
        const mods = cleanMods(role === 'Custom' || (ctx.owner && f.mods && typeof f.mods === 'object') ? f.mods : ROLES[role], role);   // the super user may change a module and keep the role (a delivery lead keeps their projects and billing)
        if (ONE_ROLE.includes(role) && old.role !== role) { const t = await ceoTaken(old.id, role); if (t) return out(400, { error: t }); }
        const projAll = ctx.scope ? false : role === 'PMO Director' || role === 'CEO' || role === 'CFO' ? true : [...DELIVERY, 'Program manager'].includes(role) ? false : f.projAll === true;
        const projects = projAll ? [] : await projectList(f.projects, project);
        const u = { ...old, kind: 'email', subId: '', name: str(f.name, 100) || old.name, role, mods, projAll, projects, active: f.active !== false, by: ctx.who, updated: Date.now() };
        if (old.active !== u.active || old.role !== u.role || JSON.stringify(old.mods) !== JSON.stringify(u.mods) || !!old.projAll !== projAll || JSON.stringify(old.projects || []) !== JSON.stringify(projects) || old.kind !== 'email') u.ver = (old.ver || 0) + 1;   // signs them out so it takes effect now
        await put(u);
        await log(`Permissions set: ${u.username}, ${role}, ${projAll ? 'all projects' : projects.length + ' project(s)'}${u.active ? '' : ', disabled'}`);
        return out(200, { user: summary(u), temp: '' });
      }
      if (!old && f.kind === 'subbie') {   // v91: a sub-contractor: Projects only, their projects only
        const sc = sub ? await sub(str(f.subId || (old && old.subId), 12)) : null;
        if (!sc) return out(400, { error: 'Pick a sub-contractor from Subbies.' });
        if (sc.archived || sc.status === 'Do not use') return out(400, { error: sc.business + ' is archived or marked "Do not use" in Subbies.' });
        const projects = [];
        for (const c of (Array.isArray(f.projects) ? f.projects : []).slice(0, 30)) { const pj = project ? await project(str(c, 30)) : null; if (pj && !projects.includes(pj.core)) projects.push(pj.core); }
        if (!projects.length) return out(400, { error: 'Give them at least one project.' });
        const username = str(f.username || sc.email || (old && old.username), 160).toLowerCase();
        if (!/^[a-z0-9._@+-]{3,160}$/.test(username)) return out(400, { error: 'The username can use letters, numbers and . _ @ + - (at least 3). Add an email to the subbie, or type a username.' });
        const clash = (await list()).find((x) => x.id !== id && (x.username === username || (x.subId && x.subId === sc.id)));
        if (clash) return out(400, { error: clash.subId === sc.id ? sc.business + ' already has a login (' + clash.username + ').' : 'That username is taken.' });
        const mods = subMods(f.level || (old && old.mods && old.mods.projects));
        const u = { ...(old || {}), kind: 'subbie', subId: sc.id, personId: '', name: sc.contact ? sc.contact + ' (' + sc.business + ')' : sc.business, email: sc.email || '', username, role: 'Sub-contractor', mods, projects, active: f.active !== false, by: ctx.who, updated: Date.now() };
        let temp = '';
        if (!old) {
          const n = await kv.update('user-seq', (x) => ({ n: ((x && x.n) || 0) + 1 }), () => ({ n: 0 }));
          u.id = 'U-' + String(n.n).padStart(3, '0'); u.created = Date.now(); u.ver = 1;
          temp = tempPassword(); Object.assign(u, hashPw(temp)); u.mustChange = true;
        }
        if (old && (old.active !== u.active || JSON.stringify(old.mods) !== JSON.stringify(u.mods) || JSON.stringify(old.projects || []) !== JSON.stringify(projects))) u.ver = (old.ver || 0) + 1;
        await put(u);
        await log(`${old ? 'Sub-contractor login changed' : 'Sub-contractor login added'}: ${u.username} (${sc.business}), Projects ${mods.projects}, ${projects.length} project(s)${u.active ? '' : ', disabled'}`);
        return out(200, { user: summary(u), temp });
      }
      const p = await person(str(f.personId || (old && old.personId), 12));
      if (!p) return out(400, { error: 'Pick someone from People: only people in the register can have a login.' });
      if (p.archived || p.status === 'Inactive') return out(400, { error: p.name + ' is not active in People.' });
      const username = str(f.username || p.email || (old && old.username), 160).toLowerCase();
      if (!/^[a-z0-9._@+-]{3,160}$/.test(username)) return out(400, { error: 'The username can use letters, numbers and . _ @ + - (at least 3)' });
      const clash = (await list()).find((x) => x.id !== id && (x.username === username || x.personId === p.id));
      if (clash) return out(400, { error: clash.personId === p.id ? p.name + ' already has a login (' + clash.username + ').' : 'That username is taken.' });
      const role = ROLE_KEYS.includes(f.role) && f.role !== 'Sub-contractor' ? f.role : 'Read only';
      const mods = cleanMods(role === 'Custom' ? f.mods : ROLES[role], role);
      if (ctx.uid && id === ctx.uid && (mods.users !== 'edit' || f.active === false)) return out(400, { error: 'You can\'t take away your own access to Users & access.' });
      const u = { ...(old || {}), personId: p.id, name: p.name, email: p.email || '', username, role, mods, active: f.active !== false, by: ctx.who, updated: Date.now() };
      let temp = '';
      if (!old) {
        const n = await kv.update('user-seq', (x) => ({ n: ((x && x.n) || 0) + 1 }), () => ({ n: 0 }));
        u.id = 'U-' + String(n.n).padStart(3, '0'); u.created = Date.now(); u.ver = 1;
        temp = tempPassword(); Object.assign(u, hashPw(temp)); u.mustChange = true;
      }
      if (old && (old.active !== u.active || JSON.stringify(old.mods) !== JSON.stringify(u.mods))) u.ver = (old.ver || 0) + 1;   // signs them out, so the change takes effect now
      await put(u);
      await log(`${old ? 'User changed' : 'User added'}: ${u.username} (${u.name}), ${u.role}${u.active ? '' : ', disabled'}`);
      return out(200, { user: summary(u), temp });
    }
    case 'userReset': {
      const u = await get(str(body.id, 10)); if (!u) return out(404, { error: 'User not found' });
      if (u.kind === 'google') return out(400, { error: 'Google sign-ins have no password here: they sign in with their Google account.' });
      const temp = tempPassword(); Object.assign(u, hashPw(temp)); u.mustChange = true; u.ver = (u.ver || 0) + 1; await put(u);
      await log(`Password reset for ${u.username}`);
      return out(200, { user: summary(u), temp });
    }
    case 'userGuestLoad': {   // v88: test site only: a Guest login for each sample person, all with one test password
      if (!body.test) return out(403, { error: 'Guest logins can only be made on the test site.' });
      const pw = 'GuestTest2026', made = [], have = await list();
      for (const pid of (Array.isArray(body.personIds) ? body.personIds : []).slice(0, 20)) {
        const p = await person(str(pid, 12)); if (!p || !p.email || p.archived || have.some((x) => x.personId === p.id)) continue;
        const n = await kv.update('user-seq', (x) => ({ n: ((x && x.n) || 0) + 1 }), () => ({ n: 0 }));
        const u = { id: 'U-' + String(n.n).padStart(3, '0'), personId: p.id, name: p.name, email: p.email, username: p.email.toLowerCase(), role: 'Guest', mods: cleanMods(ROLES.Guest, 'Guest'), active: true,
          mustChange: false, ver: 1, created: Date.now(), by: ctx.who, guest: true, ...hashPw(pw) };
        await put(u); made.push(u.username);
      }
      await log(`Guest logins made for ${made.length} sample people`);
      return out(200, { made, password: made.length ? pw : '' });
    }
    case 'userPassword': {   // your own password
      if (!ctx.uid) return out(400, { error: 'The Owner login is set in Netlify (ADMIN_PASSWORD). Change it there.' });
      const u = await get(ctx.uid); if (!u) return out(404, { error: 'User not found' });
      if (!checkPw(u, body.old)) return out(400, { error: 'Your current password is not right.' });
      const bad = pwProblem(body.password); if (bad) return out(400, { error: bad });
      if (String(body.password) === String(body.old)) return out(400, { error: 'Pick a new password, not the current one.' });
      Object.assign(u, hashPw(body.password)); u.mustChange = false; u.ver = (u.ver || 0) + 1; await put(u);
      await log('Changed their password');
      return out(200, { ok: true, v: u.ver, uid: u.id, name: u.username });
    }
    default: return null;
  }
}
