// 🎯 Today: the start screen after sign-in. Lean flow: only the work linked to you, what is due first, and the blockers (andon) to clear.
//  1. Things to do: tasks, sub-tasks and steps you are on (resource, lead or owner), not done, due date and urgency, worst first.
//  2. Needs my attention: open sticky notes that @mention you, or sit on a task you are on (not your own notes).
// "You" is your login's name, and your name in a project's Stakeholder register when its email is your login's.
import * as kv from './kv.mjs';
import * as P from './plan.mjs';
import { sydToday } from './ai.mjs';
import { TAGS, tagsIn } from '../../assets/note-tags.js';

const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const LV = { High: 3, Medium: 2, Low: 1 };
const NOTE = { R: 'Urgent', A: 'Semi-urgent', G: 'Fine' };

function namesFor(ctx, plan) {
  const n = new Set([norm(ctx.name)].filter(Boolean)), ems = [ctx.who, ctx.email].map((x) => String(x || '').trim().toLowerCase()).filter((x) => x.includes('@'));   // the login's email, and the super user's OWNER_EMAIL
  (plan.stakeholders || []).forEach((s) => { if (ems.includes(String(s.email || '').trim().toLowerCase()) && norm(s.name)) n.add(norm(s.name)); });
  return n;
}
// the same person: the whole name, or the same first and last name with middle names left out ("Sashi Kumar Sivam" is "Sashi Sivam"). Alex is not Alex Chen.
const ends = (n) => { const w = n.split(' '); return w.length > 1 ? w[0] + ' ' + w[w.length - 1] : ''; };
const isMe = (names, who) => { const w = norm(who); if (!w) return false; if (names.has(w)) return true; const e = ends(w); return !!e && [...names].some((n) => ends(n) === e); };
// @Name in a note: the words after each @ (up to four), as a whole name or first and last name
const mentions = (names, text) => { const t = String(text || ''); let i = t.indexOf('@');
  while (i >= 0) { const w = t.slice(i + 1).split(/[\s,.;:!?]+/).filter(Boolean).slice(0, 4); for (let k = w.length; k >= 1; k--) if (isMe(names, w.slice(0, k).join(' '))) return true; i = t.indexOf('@', i + 1); }
  return false; };

// the board's owner of a task: a stakeholder id or a name
const ownerName = (plan, t) => { const sh = (plan.stakeholders || []).find((x) => x.id === t.owner); return sh ? sh.name || '' : t.owner || ''; };

// 📞 who to call: the person's number on the project's Stakeholder register, otherwise in People (never your own)
const sameName = (a, b) => { const x = norm(a), y = norm(b); if (!x || !y) return false; if (x === y) return true; const e = ends(x); return !!e && e === ends(y); };
function phoneOf(plan, ppl, who) {
  if (!norm(who)) return '';
  const sh = (plan.stakeholders || []).find((x) => sameName(x.name, who) && String(x.phone || '').replace(/[^\d]/g, '').length >= 6);
  if (sh) return sh.phone;
  const pp = ppl.find((x) => !x.archived && sameName(x.name, who) && String(x.phone || '').replace(/[^\d]/g, '').length >= 6);
  return pp ? pp.phone : '';
}
const callFor = (plan, ppl, names, who) => (!who || isMe(names, who) ? null : ((ph) => (ph ? { name: who, tel: String(ph).replace(/[^\d+]/g, ''), show: ph } : null))(phoneOf(plan, ppl, who)));
// 👁 "viewed on phone": kept apart from the plan (seen:<core>), so a tap on a phone never clashes with someone editing the plan
export const seenKey = (x) => (x.nid ? 'n:' + x.t + ':' + x.nid : 't:' + x.t + (x.s ? ':' + x.s : '') + (x.q ? ':' + x.q : ''));
export async function seenGet(ctx, core) {
  if (!core || (ctx.scope && !ctx.scope.includes(core))) return { seen: {} };
  return { seen: (await kv.get('seen:' + core)) || {} };
}
export async function seenMark(ctx, body) {
  const core = String(body.core || ''), plan = core && (await P.get(core));
  if (!plan) return { error: 'That project is not there any more.', code: 404 };
  if (ctx.scope && !ctx.scope.includes(core)) return { error: 'This login can only see the projects it was given.', code: 403 };
  const k = seenKey({ t: String(body.t || ''), s: body.s ? String(body.s) : '', q: body.q ? String(body.q) : '', nid: body.nid ? String(body.nid) : '' }).slice(0, 120), who = String(ctx.name || 'Someone').slice(0, 80), at = Date.now();
  await kv.update('seen:' + core, (m) => { m[k] = Object.assign({}, m[k] || {}, { [who]: { at, via: body.via === 'phone' ? 'phone' : 'web' } }); const ks = Object.keys(m); if (ks.length > 2000) delete m[ks[0]]; return m; }, () => ({}));
  return { ok: true, at };
}

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
  const ppl = Object.values(((await kv.get('ppl-index').catch(() => null)) || {}).people || {}), seenAll = await kv.getMany(plans.map((p) => 'seen:' + ((p && p.core) || '-'))).catch(() => []), me = String(ctx.name || '');
  let later = 0, laterNotes = 0;   // the work week: what is due in the next 5 working days (or late); the rest is counted, not listed
  for (const plan of plans) {
    if (!plan || !Array.isArray(plan.tasks)) continue;
    try { P.schedule(plan); } catch { continue; }
    const core = plan.core || '', proj = plan.name || 'Project', names = namesFor(ctx, plan), all = !!(plan.emergency || plan.weekends);
    if (!names.size) continue;
    const seen = seenAll[plans.indexOf(plan)] || {}, pmCall = callFor(plan, ppl, names, (plan.charter || {}).manager), mark = (x) => { const v = seen[seenKey(x)] || {}; x.viewed = v[me] ? v[me].at : 0; x.seenBy = Object.entries(v).filter((e) => e[0] !== me).map((e) => ({ name: e[0], at: e[1].at, via: e[1].via })); return x; };
    const soon = P.addWork(today, 1, all), ahead = P.addWork(P.nextWork(today, false), 4, false), link = '#plan/' + encodeURIComponent(core) + '/schedule';   // one work week for everyone (Mon–Fri), the same as the date shown
    const add = (row) => { if (row.due && row.due > ahead) { later++; return; }const g = urgency(row.priority, row.due, today, soon); todo.push(mark({ ...row, core, project: proj, link, urgency: g.u, lv: g.lv, rag: rag(row.due, today, soon), call: pmCall, callWhy: 'Project manager' })); };   // due in the next week, or overdue
    for (const t of plan.tasks) {
      const tname = String(t.name || '').replace(/^[✓◆\s]+/, ''), onTask = (t.res || []).some((r) => isMe(names, r)) || isMe(names, t.lead) || isMe(names, ownerName(plan, t));
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
        if (n.done || (isMe(names, n.by) && !mentions(names, n.text))) return;   // my own notes only when they @mention me
        if (!(mentions(names, n.text) || mine)) return;
        const due = n.due || t.ef || '';
        if (due && due > ahead) { laterNotes++; return; }
        att.push({ core, project: proj, link, t: t.id, nid: n.id, task: tname, text: n.text, tags: tagsIn(n.text), by: n.by || '', at: n.at || 0, due, c: n.c, urgency: NOTE[n.c] || 'Fine', mention: mentions(names, n.text),
          rag: due && due < today ? 'red' : n.c === 'R' ? 'red' : n.c === 'A' ? 'amber' : 'green', late: !!(due && due < today) });
        { const z = att[att.length - 1]; mark(z); z.call = callFor(plan, ppl, names, n.by); z.callWhy = 'Raised the note'; if (z.tags.includes('blocker')) { z.rag = 'red'; z.urgency = 'Blocker'; } }   // a #blocker is the andon: always red
      });
    }
  }
  todo.sort((a, b) => b.lv - a.lv || (a.due || '9') .localeCompare(b.due || '9'));
  const cv = { R: 3, A: 2, G: 1 };
  // #blocker first (the andon), then late, then by due date, then by colour; the other tags in their list order when the rest is equal
  const tr = (x) => { const i = TAGS.findIndex((g) => (x.tags || []).includes(g.id)); return i < 0 ? 99 : i; };
  att.sort((a, b) => ((b.tags || []).includes('blocker') - (a.tags || []).includes('blocker')) || (b.late - a.late) || (a.due || '9').localeCompare(b.due || '9') || (cv[b.c] - cv[a.c]) || (tr(a) - tr(b)));
  // the counts take tasks and notes together: overdue, due today, due today or tomorrow (the next working day)
  const both = todo.concat(att), soon1 = P.addWork(today, 1, false), tom = new Date(Date.parse(today + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
  const nextDue = tom > soon1 ? tom : soon1;
  both.forEach((x) => { x.when = !x.due ? '' : x.due < today ? 'overdue' : x.due === today ? 'today' : x.due <= nextDue ? 'tomorrow' : ''; });
  return { today, name: ctx.name || '', todo: todo.slice(0, 100), attention: att.slice(0, 100), later, laterNotes, weekEnd: P.addWork(P.nextWork(today, false), 4, false),
    counts: { overdue: both.filter((x) => x.when === 'overdue').length, dueToday: both.filter((x) => x.when === 'today').length, dueSoon: both.filter((x) => x.when === 'today' || x.when === 'tomorrow').length,
      now: both.filter((x) => x.when === 'overdue' || x.when === 'today' || (x.tags || []).includes('blocker')).length,
      blockers: att.filter((x) => (x.tags || []).includes('blocker')).length, notes: att.length, lateBlockers: att.filter((x) => x.late).length,
      tags: Object.fromEntries(TAGS.map((g) => [g.id, att.filter((x) => (x.tags || []).includes(g.id)).length]).filter((e) => e[1])) } };
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
    if (!ctx.owner && !((t.res || []).some((r) => isMe(names, r)) || isMe(names, t.lead) || isMe(names, ownerName(plan, t)))) return { error: 'Only someone on this task (or the project manager) can tick it done.', code: 403 };
    t.pct = 100; t.status = 'done';   // a task with sub-tasks takes its % from them: they are done too
    (t.subs || []).forEach((sb) => { sb.status = 'done'; sb.pct = 100; (sb.steps || []).forEach((q) => { q.done = true; }); });
  }
  const r = await P.save(core, plan, plan.rev, by);
  if (r.conflict) return { error: 'Someone changed this plan at the same moment. Try again.', code: 409 };
  return { ok: true };
}
