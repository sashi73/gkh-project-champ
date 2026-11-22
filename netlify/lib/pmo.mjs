// 🧭 The PMO view (Persona: the PMO Director, third in charge after the CEO and the CFO).
//   The PMO Director runs delivery: every program and project, and the project directors, managers, consultants and contractors report in.
//   Where the CEO view asks "are we making money?", this one asks "is delivery under control, and what needs me today?":
//     1. Needs a decision: change requests and variation orders waiting, oldest first
//     2. Programs: health, schedule and cost index, risks and issues, and who directs each one
//     3. Projects in trouble or at risk, with the reason and the project manager
//     4. Milestones: overdue and due in the next 30 days
//     5. Escalations: the high risks and the high or critical issues across the portfolio
//     6. The team: project managers and their load, consultants and contractors (busy, overloaded, late work, compliance)
//     7. Governance gaps: no program director, no project manager, no baseline, charter not approved, plan not touched in 14 days
//   Read-only. Data: the CEO view (ceo.mjs) for project health, plus the plans, the programs, the logins and the People register.
import * as P from './plan.mjs';
import * as PG from './programs.mjs';
import * as J from './jobs.mjs';
import * as U from './users.mjs';
import * as PPL from './people.mjs';

const OPEN_CR = ['Proposed', 'Under review', 'CCB meeting'];
const RANK = { red: 3, amber: 2, green: 1, grey: 0 };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const same = (a, b) => { const n = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); return !!n(a) && (n(a) === n(b) || n(a).startsWith(n(b) + ' ') || n(b).startsWith(n(a) + ' ')); };

export async function pmoView(day, opt = {}) {
  const G = opt.pgm || null, GC = G ? new Set(G.cores) : null, GN = G ? new Set(G.names.map((n) => n.toLowerCase())) : null;   // 🗺 a Program manager: their programs and projects only, no money
  const CEO = await import('./ceo.mjs');
  const [V, plans, progs, jobs, users, reg, asg] = await Promise.all([CEO.ceoView(day), P.list(), PG.keyed().catch(() => []), J.all().catch(() => []), U.list().catch(() => []), PPL.list().catch(() => ({ people: [] })), PPL.assignments().catch(() => ({}))]);
  const byCore = Object.fromEntries(plans.map((p) => [p.core, p])), jb = Object.fromEntries(jobs.map((j) => [j.core, j])), uById = Object.fromEntries(users.map((u) => [u.id, u]));
  const live = V.rows.filter((r) => !r.closed && (!GC || GC.has(r.core))), soon = plus(day, 30);
  const pmOf = (core) => { const p = byCore[core] || {}, j = jb[core] || {}; return (p.charter || {}).manager || j.manager || ''; };

  // 1. ⚖ decisions waiting: change requests (variation orders, re-baselines and BOM changes go through change control too)
  const decisions = [], milestones = [], escal = [], gaps = [];
  for (const r of live) {
    const p = byCore[r.core]; if (!p) continue;
    try { P.schedule(p); } catch (e) {}
    for (const c of p.changes || []) if (OPEN_CR.includes(c.status)) {
      const at = c.raisedAt ? new Date(c.raisedAt).toISOString().slice(0, 10) : '';
      decisions.push({ core: r.core, project: r.name, program: r.program, num: c.voNum || ('CR-' + (c.num || '')), title: String(c.title || 'Change request').slice(0, 160), status: c.status, by: c.raisedBy || '', at, age: at ? Math.max(0, daysBetween(at, day)) : null,
        kind: c.vo ? 'Variation order' : c.kind === 'baseline' ? 'Re-baseline' : /bom/i.test(c.source || '') ? 'BOM change' : 'Change', vo: Number(c.vo) || 0, priority: c.priority || '' });
    }
    // 4. ◆ milestones: overdue or due within 30 days, not done
    for (const t of p.tasks || []) if (t.dur === 0 && (t.pct || 0) < 100) { const d = t.ef || t.es || ''; if (d && d <= soon) milestones.push({ core: r.core, project: r.name, program: r.program, name: String(t.name || 'Milestone').replace(/^[✓◆\s]+/, ''), due: d, days: daysBetween(day, d), pm: pmOf(r.core) }); }
    // 5. 🚨 escalations: risks scoring 12 or more (of 25), issues High or Critical
    for (const k of p.risks || []) if (k.status !== 'Closed' && k.p * k.i >= 12) escal.push({ core: r.core, project: r.name, kind: 'risk', title: k.title, score: k.p * k.i, owner: k.owner || '', review: k.review || '', late: !!(k.review && k.review < day) });
    for (const x of p.issues || []) if (x.status !== 'Resolved' && (x.priority === 'High' || x.priority === 'Critical')) escal.push({ core: r.core, project: r.name, kind: 'issue', title: x.title, score: x.priority === 'Critical' ? 25 : 16, priority: x.priority, owner: x.owner || '', due: x.due || '', late: !!(x.due && x.due < day) });
    // 7. 🧾 governance gaps, project by project
    const why = [];
    if (!pmOf(r.core)) why.push('no project manager');
    if ((p.tasks || []).length && !p.baseline) why.push('no baseline');
    if ((p.charter || {}).docStatus !== 'Approved') why.push('charter not approved');
    const upd = Number(p.updated) || 0; if (upd && (Date.now() - upd) > 14 * 864e5) why.push('plan not updated for ' + Math.round((Date.now() - upd) / 864e5) + ' days');
    if ((p.risks || []).some((k) => k.status !== 'Closed' && k.p * k.i >= 12 && !k.owner)) why.push('a high risk with no owner');
    if (why.length) gaps.push({ core: r.core, project: r.name, program: r.program, pm: pmOf(r.core), why });
  }
  decisions.sort((a, b) => (b.age || 0) - (a.age || 0));
  milestones.sort((a, b) => a.due < b.due ? -1 : 1);
  escal.sort((a, b) => b.late - a.late || b.score - a.score);

  // 2. 🗂 programs: health and who directs each one
  const progRows = [], inProg = {};
  for (const r of live) (inProg[r.program || ''] = inProg[r.program || ''] || []).push(r);
  for (const g of progs.filter((g) => g.status !== 'closed' && (!GN || GN.has(g.name.toLowerCase())))) {
    const L = inProg[g.name] || [], d = g.director ? uById[g.director] : null;
    progRows.push(progRow(g.name, g.key, g.color, g.status, d ? d.name || d.username : '', L, day));
  }
  if ((inProg[''] || []).length) progRows.push(progRow('Not in a program', '', '', '', '', inProg[''], day));
  for (const g of progRows) if (!g.director && g.name !== 'Not in a program' && g.n) gaps.unshift({ program: g.name, why: ['no program director: nobody is accountable for its ' + g.n + ' project' + (g.n === 1 ? '' : 's')] });
  progRows.sort((a, b) => (b.red * 10 + b.amber) - (a.red * 10 + a.amber) || b.n - a.n);

  // 3. 🔴 projects in trouble or at risk
  const watch = live.filter((r) => r.health === 'red' || r.health === 'amber').sort((a, b) => RANK[b.health] - RANK[a.health] || (a.SPI || 9) - (b.SPI || 9))
    .map((r) => ({ core: r.core, name: r.name, program: r.program, health: r.health, why: r.why, pct: r.pct, SPI: r.SPI, CPI: r.CPI, slip: r.slip, forecast: r.forecast, pm: pmOf(r.core), trend: r.trend }));

  // 6. 👥 the team: project managers (from the plans), and the consultants and contractors (the People register, with their work on the plans)
  const pms = {};
  for (const r of live) { const n = pmOf(r.core); if (!n) continue; const k = n.toLowerCase(); const x = (pms[k] = pms[k] || { name: n, projects: 0, red: 0, amber: 0, late: 0 }); x.projects++; if (r.health === 'red') x.red++; if (r.health === 'amber') x.amber++; x.late += r.late || 0; }
  const onMine = (id) => !GC || ((asg[id] || {}).list || []).some((x) => GC.has(x.core));
  const people = (reg.people || []).filter((p) => !p.archived && p.status !== 'Inactive' && onMine(p.id)).map((p) => {
    const a = asg[p.id] || { projects: 0, now: 0, next: 0, late: 0 }, bad = ((p.comp && p.comp.items) || []).filter((c) => ['missing', 'expired'].includes(c[1])).length;
    return { id: p.id, name: p.name, role: p.role || '', type: p.type || 'Employee', status: p.status || 'Active', projects: a.projects, now: a.now, next: a.next, late: a.late, comp: bad, load: a.now >= 5 ? 'over' : a.now >= 3 ? 'busy' : a.now ? 'ok' : 'free' };
  }).sort((a, b) => b.late - a.late || b.now - a.now || a.name.localeCompare(b.name));
  const logins = {}; for (const u of users) if (u.active !== false) logins[u.role] = (logins[u.role] || 0) + 1;
  const team = { pms: Object.values(pms).sort((a, b) => b.red * 10 + b.amber - (a.red * 10 + a.amber) || b.projects - a.projects),
    consultants: people.filter((p) => p.type !== 'Contractor'), contractors: people.filter((p) => p.type === 'Contractor'),
    logins: { directors: logins['Project director'] || 0, managers: logins['Project manager'] || 0, contractors: logins.Contractor || 0, personnel: logins['Project personnel'] || 0 },
    over: people.filter((p) => p.load === 'over').length, lateWork: people.filter((p) => p.late > 0).length, free: people.filter((p) => p.load === 'free').length, compIssues: people.filter((p) => p.comp > 0).length };

  const A = G ? { n: live.length, red: live.filter((r) => r.health === 'red').length, amber: live.filter((r) => r.health === 'amber').length, green: live.filter((r) => r.health === 'green').length, grey: live.filter((r) => r.health === 'grey').length,
    SPI: avgOf(live, 'SPI'), CPI: avgOf(live, 'CPI') } : V.all;
  if (G) { decisions.forEach((d) => { d.vo = 0; }); team.logins = null; }
  return { today: day, scope: G ? { programs: G.names } : null, all: { n: A.n, red: A.red, amber: A.amber, green: A.green, grey: A.grey, SPI: A.SPI, CPI: A.CPI, budget: G ? null : A.budget, eac: G ? null : A.eac, vac: G ? null : A.vac },
    programs: progRows, decisions: decisions.slice(0, 40), decisionsN: decisions.length, watch: watch.slice(0, 30),
    milestones: { overdue: milestones.filter((m) => m.days < 0).slice(0, 30), soon: milestones.filter((m) => m.days >= 0).slice(0, 30), overdueN: milestones.filter((m) => m.days < 0).length, soonN: milestones.filter((m) => m.days >= 0).length },
    escalations: escal.slice(0, 30), escalN: escal.length, team, gaps: gaps.slice(0, 40), gapsN: gaps.length, at: Date.now() };
}

const avgOf = (L, f) => { const X = L.filter((r) => r[f] != null); return X.length ? Math.round(X.reduce((a, r) => a + r[f], 0) / X.length * 100) / 100 : null; };
function progRow(name, key, color, status, director, L, day) {
  const w = L.filter((r) => r.SPI != null), c = L.filter((r) => r.CPI != null), avg = (X, f) => X.length ? Math.round(X.reduce((a, r) => a + r[f], 0) / X.length * 100) / 100 : null;
  const fin = L.map((r) => r.forecast).filter(Boolean).sort().pop() || '';
  return { name, key: key || '', color: color || '', status: status || '', director, n: L.length, red: L.filter((r) => r.health === 'red').length, amber: L.filter((r) => r.health === 'amber').length, green: L.filter((r) => r.health === 'green').length, grey: L.filter((r) => r.health === 'grey').length,
    SPI: avg(w, 'SPI'), CPI: avg(c, 'CPI'), slip: L.reduce((a, r) => Math.max(a, r.slip || 0), 0), highRisks: L.reduce((a, r) => a + (r.highRisks || 0), 0), openIssues: L.reduce((a, r) => a + (r.openIssues || 0), 0), finish: fin, pct: L.length ? Math.round(L.reduce((a, r) => a + (r.pct || 0), 0) / L.length) : 0 };
}
