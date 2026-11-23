// GKH Project Champ: 🧩 the RAID log (Risks, Assumptions, Issues, Dependencies).
// One view over a project's risk register, its assumptions, its issue log and its dependencies (outside ones kept in the plan,
// project-to-project links from the Dependency board). Each item gets a RAG status by the same rules everywhere:
// the project tab, Portfolio › RAID log and Ask AI's raid_log table. ✨ the AI reads the project (charter, plan, documents,
// meetings) and suggests items the project manager reviews before they go in.
import * as P from './plan.mjs';
import * as J from './jobs.mjs';
import * as PGM from './programs.mjs';
import { llmJson, usage, checkLimit, llmSetup } from './ai.mjs';

const str = (s, n = 300) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const DAY = 864e5, days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
export const TYPES = { R: 'Risk', A: 'Assumption', I: 'Issue', D: 'Dependency' };
export const D_KINDS = ['Supplier', 'Approval', 'Another team', 'Client', 'Other'];

// 🚦 red: act now · amber: watch · green: in hand · grey: closed
export function rag(type, x, today) {
  if (type === 'R') { if (x.status === 'Closed') return 'grey'; const s = (x.p || 3) * (x.i || 3); return s >= 15 ? 'red' : s >= 8 || (x.review && x.review < today) ? 'amber' : 'green'; }
  if (type === 'A') { if (x.status === 'Does not hold') return 'red'; if (x.status === 'Holds') return 'green'; return x.check && x.check < today ? (x.impact === 'High' ? 'red' : 'amber') : x.impact === 'High' ? 'amber' : 'green'; }
  if (type === 'I') { if (x.status === 'Resolved') return 'grey'; if (x.due && x.due < today) return 'red'; return x.priority === 'Critical' || x.priority === 'High' ? 'red' : x.priority === 'Medium' ? 'amber' : 'green'; }
  if (type === 'D') {
    if (x.link) return { conflict: 'red', risk: 'amber', ok: 'green', done: 'grey' }[x.link] || 'grey';
    if (x.status === 'Delivered') return 'grey'; if (x.status === 'At risk') return 'red';
    if (x.need && x.need < today) return 'red'; return x.need && days(today, x.need) <= 14 ? 'amber' : 'green';
  }
  return 'grey';
}
const ORDER = { red: 0, amber: 1, green: 2, grey: 3 };
// the plan's own RAID items (no project links)
export function items(plan, today) {
  const out = [], n = { R: 0, A: 0, I: 0, D: 0 };
  for (const r of plan.risks || []) out.push({ type: 'R', id: r.id, ref: 'R' + ++n.R, title: r.title, detail: r.cause, owner: r.owner, date: r.review, status: r.status, open: r.status !== 'Closed', score: (r.p || 3) * (r.i || 3), p: r.p, i: r.i, rag: rag('R', r, today) });
  for (const a of plan.assumptions || []) out.push({ type: 'A', id: a.id, ref: 'A' + ++n.A, title: a.title, detail: a.detail, owner: a.owner, date: a.check, status: a.status, open: a.status === 'Unchecked', impact: a.impact, rag: rag('A', a, today) });
  for (const x of plan.issues || []) out.push({ type: 'I', id: x.id, ref: 'I' + ++n.I, title: x.title, detail: x.detail, owner: x.owner, date: x.due, status: x.status, open: x.status !== 'Resolved', priority: x.priority, rag: rag('I', x, today) });
  for (const d of plan.extDeps || []) out.push({ type: 'D', id: d.id, ref: 'D' + ++n.D, title: d.title, detail: d.note, owner: d.owner, date: d.need, status: d.status, open: d.status !== 'Delivered', kind: d.kind, party: d.party, rag: rag('D', d, today) });
  return out;
}
const sum = (L) => Object.fromEntries(Object.keys(TYPES).map((t) => { const M = L.filter((x) => x.type === t); return [t, { total: M.length, open: M.filter((x) => x.open).length, red: M.filter((x) => x.rag === 'red').length, amber: M.filter((x) => x.rag === 'amber').length }]; }));

// 📋 the RAID log of every project the login can see (scope: a Set of project codes, or null for every project); only: one project
export async function portfolio(scope, today, only) {
  const [plans, jobs, deps, cards] = await Promise.all([P.list(), J.all(), PGM.deps().catch(() => []), P.portfolio(today).catch(() => [])]);
  const jb = Object.fromEntries(jobs.map((j) => [j.core, j])), cb = Object.fromEntries(cards.map((c) => { c.health = P.healthOf(c); return [c.core, c]; }));
  const mine = (c) => (!scope || scope.has(c)) && (!only || c === only);
  const L = [], projects = [];
  for (const p of plans) {
    if (!mine(p.core) || !jb[p.core]) continue;   // an archived project (not in the job list) is left out
    const name = p.name || (jb[p.core] || {}).name || p.core, program = (jb[p.core] || {}).program || '';
    projects.push({ core: p.core, name, program });
    for (const x of items(p, today)) L.push({ ...x, core: p.core, project: name, program });
  }
  // 🔗 project-to-project links (the Dependency board): both ends must be projects this login can see
  const nm = (c) => (cb[c] || {}).name || (jb[c] || {}).name || c, TY = { FS: 'finish', SS: 'start', FF: 'finish' };
  for (const d of deps) {
    if (scope && !(scope.has(d.from) && scope.has(d.to))) continue;
    const st = PGM.depStatus(d, cb[d.from], cb[d.to]);
    for (const [core, other, dir] of [[d.to, d.from, 'in'], [d.from, d.to, 'out']]) {
      if (!mine(core) || !cb[core] || (dir === 'out' && !only)) continue;   // the portfolio lists each link once, on the project that waits
      const title = dir === 'in' ? `Waits for ${nm(other)} to ${TY[d.type || 'FS']}` : `${nm(other)} waits for this project`;
      const x = { type: 'D', id: d.id + ':' + dir, ref: 'P' + d.id.slice(-3).toUpperCase(), title, detail: st.why || '', owner: '', date: '', status: { conflict: 'Plans clash', risk: 'At risk', ok: 'On track', done: 'Done', unknown: 'No dates yet' }[st.status] || 'No dates yet', open: st.status !== 'done', link: st.status, other, kind: 'Project', party: nm(other) };
      x.rag = rag('D', x, today); L.push({ ...x, core, project: nm(core), program: (jb[core] || {}).program || '' });
    }
  }
  L.sort((a, b) => ORDER[a.rag] - ORDER[b.rag] || (b.score || 0) - (a.score || 0) || String(a.project).localeCompare(String(b.project)));
  return { today, items: L, summary: sum(L), projects };
}

// ✨ RAID items for one project, from its charter, plan, documents and meetings; the project manager picks which go in
export async function find(core, { money = true } = {}) {
  const job = await J.find(core), plan = job ? await P.get(job.core) : null; if (!job || !plan) return { error: 'Project not found' };
  if (!llmSetup()) return { error: 'AI is not set up yet: add LLM_API_KEY (DeepSeek) in Netlify.' };
  try { await checkLimit(); } catch (e) { return { error: e.message }; }
  const INTEL = await import('./plan-intel.mjs');
  const { ctx, stakeholders } = await INTEL.context(job, plan, 'risks assumptions issues dependencies constraints suppliers approvals delays blocked waiting', { money });
  const sc = (t, n) => INTEL.scrub(str(t, n), job, stakeholders);
  const have = items(plan, ctx.today || '').map((x) => TYPES[x.type] + ': ' + sc(x.title, 160));
  const meetings = (plan.meetings || []).slice(-12).map((m) => ({ title: sc(m.title, 160), date: m.date, notes: sc(m.notes || m.agenda || '', 600) }));
  const sys = 'You are a senior PMO lead building a RAID log (Risks, Assumptions, Issues, Dependencies) for a project in GKH Project Champ. Australian English, no markdown. ' +
    'Read the project (charter, plan, documents, meetings) and list what is MISSING from its RAID log. Risk: something that might happen (probability and impact 1 to 5). Assumption: something the plan takes as true but nobody has confirmed (how and by when to check it). ' +
    'Issue: a problem that has already happened. Dependency: something the project needs from outside it (a supplier, an approval, another team, the client) with the date it is needed. ' +
    'Every item must come from the evidence: say where in "why" (a task, a document, a meeting, the charter). Do not repeat items already logged. ' + (money ? '' : 'THIS PERSON DOES NOT SEE MONEY: never mention costs, prices, budgets or amounts. ') +
    'JSON only: {"items":[{"type":"R|A|I|D","title":"under 14 words","detail":"one or two sentences","why":"the evidence","p":1,"i":1,"priority":"Low|Medium|High|Critical","impact":"Low|Medium|High","kind":"' + D_KINDS.join('|') + '","party":"who it depends on","date":"YYYY-MM-DD or empty (review, check, due or needed-by date)"}]} with 6 to 14 items across the four types.';
  let o, used;
  try { ({ data: o, used } = await llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ project: ctx, meetings, already_logged: have }) }], { maxTokens: 3000, timeoutMs: 170000, temperature: 0.3 })); }
  catch (e) { return { error: e.message || 'The AI did not answer. Try again.' }; }
  await usage(true, used || 0).catch(() => {});
  const int = (v, d) => { const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : d; }, ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : '');
  const L = (o && Array.isArray(o.items) ? o.items : []).filter((x) => x && TYPES[x.type] && str(x.title)).slice(0, 16).map((x) => ({ type: x.type, title: str(x.title, 200), detail: str(x.detail, 600), why: str(x.why, 300),
    p: int(x.p, 3), i: int(x.i, 3), priority: ['Low', 'Medium', 'High', 'Critical'].includes(x.priority) ? x.priority : 'Medium', impact: ['Low', 'Medium', 'High'].includes(x.impact) ? x.impact : 'Medium',
    kind: D_KINDS.includes(x.kind) ? x.kind : 'Other', party: str(x.party, 120), date: ymd(x.date) }));
  if (!L.length) return { error: 'The AI did not find anything new. Add more detail to the charter or upload documents, then try again.' };
  return { items: L, tokens: used || 0 };
}
