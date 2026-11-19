// 🎯 Today: the start screen after sign-in. Lean flow: only the work linked to you, what is due first, and the blockers (andon) to clear.
//  1. Things to do: tasks, sub-tasks and steps you are on (resource, lead or owner), not done, due date and urgency, worst first.
//  2. Needs my attention: open sticky notes that @mention you, or sit on a task you are on (not your own notes).
// "You" is your login's name, and your name in a project's Stakeholder register when its email is your login's.
import * as kv from './kv.mjs';
import * as P from './plan.mjs';
import { sydToday } from './ai.mjs';

const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const LV = { High: 3, Medium: 2, Low: 1 };
const NOTE = { R: 'Urgent', A: 'Semi-urgent', G: 'Fine' };

function namesFor(ctx, plan) {
  const n = new Set([norm(ctx.name)].filter(Boolean)), em = String(ctx.who || '').toLowerCase();
  (plan.stakeholders || []).forEach((s) => { if (em && String(s.email || '').toLowerCase() === em && norm(s.name)) n.add(norm(s.name)); });
  return n;
}
const isMe = (names, who) => { const w = norm(who); return !!w && names.has(w); };   // the whole name: Alex is not Alex Chen
const mentions = (names, text) => { const t = ' ' + String(text || '').toLowerCase() + ' '; return [...names].some((n) => t.includes('@' + n)); };

// urgency: the priority set on the item, otherwise from how soon it is due
function urgency(priority, due, today, soon) {
  if (due && due < today) return { u: 'Overdue', lv: 4 };
  if (LV[priority]) return { u: priority, lv: LV[priority] };
  if (due && due <= soon) return { u: 'High', lv: 3 };
  return { u: 'Medium', lv: 2 };
}
const rag = (due, today, soon) => (due && due < today ? 'red' : due && due <= soon ? 'amber' : 'green');

export async function myDay(ctx, opts) {
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String((opts || {}).today || '')) ? opts.today : sydToday();
  const keys = (await kv.keys('plan:')).filter((k) => !ctx.scope || ctx.scope.includes(k.slice(5))).slice(0, 300);
  const plans = await kv.getMany(keys), todo = [], att = [];
  let later = 0;
  for (const plan of plans) {
    if (!plan || !Array.isArray(plan.tasks)) continue;
    try { P.schedule(plan); } catch { continue; }
    const core = plan.core || '', proj = plan.name || 'Project', names = namesFor(ctx, plan), all = !!(plan.emergency || plan.weekends);
    if (!names.size) continue;
    const soon = P.addWork(today, 1, all), ahead = P.addWork(today, 7, all), link = '#plan/' + encodeURIComponent(core) + '/schedule';
    const add = (row) => { if (row.due && row.due > ahead) { later++; return; }const g = urgency(row.priority, row.due, today, soon); todo.push({ ...row, core, project: proj, link, urgency: g.u, lv: g.lv, rag: rag(row.due, today, soon) }); };   // due in the next week, or overdue
    for (const t of plan.tasks) {
      const tname = String(t.name || '').replace(/^[✓◆\s]+/, ''), onTask = (t.res || []).some((r) => isMe(names, r)) || isMe(names, t.lead);
      let mine = onTask;
      if (onTask && (t.pct || 0) < 100) add({ kind: t.dur === 0 ? 'Milestone' : 'Task', name: tname, start: t.es, due: t.ef, pct: t.pct || 0, priority: t.priority, t: t.id });
      (t.subs || []).forEach((sb) => {
        const ses = sb.off ? P.addWork(t.es, sb.off, all) : t.es, sef = sb.dur > 1 ? P.addWork(ses, sb.dur - 1, all) : ses;
        if (isMe(names, sb.owner)) { mine = true; if (sb.status !== 'done') add({ kind: 'Sub-task', name: sb.name, parent: tname, start: ses, due: sef, pct: sb.pct || 0, priority: sb.priority, t: t.id, s: sb.id }); }
        (sb.steps || []).forEach((st) => {
          const es = st.off ? P.addWork(ses, st.off, all) : ses, ef = st.dur > 1 ? P.addWork(es, st.dur - 1, all) : es;
          if (!isMe(names, st.owner)) return; mine = true; if (st.done) return;
          add({ kind: 'Step', name: st.name, parent: tname + ' › ' + sb.name, start: es, due: ef, priority: st.priority, t: t.id, s: sb.id, q: st.id });
        });
      });
      (t.stickies || []).forEach((n) => {
        if (n.done || isMe(names, n.by)) return;
        if (!(mentions(names, n.text) || mine)) return;
        const due = n.due || t.ef || '';
        att.push({ core, project: proj, link, t: t.id, nid: n.id, task: tname, text: n.text, by: n.by || '', at: n.at || 0, due, c: n.c, urgency: NOTE[n.c] || 'Fine', mention: mentions(names, n.text),
          rag: due && due < today ? 'red' : n.c === 'R' ? 'red' : n.c === 'A' ? 'amber' : 'green', late: !!(due && due < today) });
      });
    }
  }
  todo.sort((a, b) => b.lv - a.lv || (a.due || '9') .localeCompare(b.due || '9'));
  const cv = { R: 3, A: 2, G: 1 };
  att.sort((a, b) => (b.late - a.late) || (cv[b.c] - cv[a.c]) || (a.due || '9').localeCompare(b.due || '9'));
  const wip = todo.filter((x) => x.start && x.start <= today).length;
  return { today, name: ctx.name || '', todo: todo.slice(0, 100), attention: att.slice(0, 100), later,
    counts: { overdue: todo.filter((x) => x.rag === 'red').length, dueSoon: todo.filter((x) => x.rag === 'amber').length, wip, blockers: att.length, lateBlockers: att.filter((x) => x.late).length } };
}

// ✓ from the start screen: tick an item done, or resolve a note (it then leaves the list)
export async function myDayDone(ctx, body, by) {
  const core = String(body.core || ''), plan = core && (await P.get(core));
  if (!plan || !Array.isArray(plan.tasks)) return { error: 'That project is not there any more.', code: 404 };
  if (ctx.scope && !ctx.scope.includes(core)) return { error: 'This login can only work on the projects it was given.', code: 403 };
  const names = namesFor(ctx, plan), t = plan.tasks.find((x) => x.id === body.t);
  if (!t) return { error: 'That task is not in the plan any more.', code: 404 };
  const who = ctx.name || 'Admin';
  if (body.nid) {
    const n = (t.stickies || []).find((x) => x.id === body.nid); if (!n) return { error: 'That note is not there any more.', code: 404 };
    n.done = true; n.doneBy = who;
  } else if (body.q) {
    const sb = (t.subs || []).find((x) => x.id === body.s), st = sb && (sb.steps || []).find((x) => x.id === body.q);
    if (!st) return { error: 'That step is not there any more.', code: 404 };
    if (!ctx.owner && !isMe(names, st.owner)) return { error: 'Only the person on this step (or the project manager) can tick it done.', code: 403 };
    st.done = true;
  } else if (body.s) {
    const sb = (t.subs || []).find((x) => x.id === body.s); if (!sb) return { error: 'That sub-task is not there any more.', code: 404 };
    if (!ctx.owner && !isMe(names, sb.owner)) return { error: 'Only the owner of this sub-task (or the project manager) can tick it done.', code: 403 };
    sb.status = 'done'; sb.pct = 100; (sb.steps || []).forEach((q) => { q.done = true; });
  } else {
    if (!ctx.owner && !((t.res || []).some((r) => isMe(names, r)) || isMe(names, t.lead))) return { error: 'Only someone on this task (or the project manager) can tick it done.', code: 403 };
    t.pct = 100; t.status = 'done';   // a task with sub-tasks takes its % from them: they are done too
    (t.subs || []).forEach((sb) => { sb.status = 'done'; sb.pct = 100; (sb.steps || []).forEach((q) => { q.done = true; }); });
  }
  const r = await P.save(core, plan, plan.rev, by);
  if (r.conflict) return { error: 'Someone changed this plan at the same moment. Try again.', code: 409 };
  return { ok: true };
}
