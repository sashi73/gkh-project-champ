// 👔 The CEO view (Persona): manage by exception. Every project's health and the money across all of them, in one call.
//   Health: Champ's watch (red / amber / green with the first reason), % done, SPI, CPI, forecast finish vs baseline, trend vs a week ago.
//   Money: cost (budget, spent, earned, forecast at completion, over / under) and revenue (contract value from the accepted quote,
//   invoiced, received, still owed) and profit (contract value minus forecast cost). Totals, by program, top overspends, cash flow by month.
//   Read-only: it changes nothing except a small daily snapshot (ceo-snap) used for the "since last week" arrows.
import * as kv from './kv.mjs';
import * as P from './plan.mjs';
import * as PG from './programs.mjs';
import * as ACC from './accounts.mjs';
import * as W from './watch.mjs';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const RANK = { red: 3, amber: 2, green: 1, grey: 0 };
const ym = (s) => String(s || '').slice(0, 7);
function months(day) {   // six months back to six months ahead
  const [y, m] = day.split('-').map(Number), out = [];
  for (let i = -6; i <= 6; i++) { const d = new Date(Date.UTC(y, m - 1 + i, 1)); out.push(d.toISOString().slice(0, 7)); }
  return out;
}
function spread(t, cost, add) {   // a task's cost, spread over its calendar days, into months
  if (!t.es || !t.ef || !(cost > 0)) return;
  const a = Date.parse(t.es + 'T00:00:00Z'), b = Date.parse(t.ef + 'T00:00:00Z'), days = Math.max(1, Math.round((b - a) / 864e5) + 1), per = cost / days;
  for (let i = 0; i < days; i++) add(new Date(a + i * 864e5).toISOString().slice(0, 7), per);
}

export async function ceoView(day) {
  const [cards, plans, docs, snap] = await Promise.all([P.portfolio(day), P.list(), ACC.allDocs().catch(() => ({ quotes: [], invoices: [], expenses: [] })), kv.get('ceo-snap').catch(() => null)]);
  const reg = await PG.keyed().catch(() => []); PG.tagCards(cards, reg);
  const byCore = Object.fromEntries(plans.map((p) => [p.core, p]));
  const M = months(day), flow = Object.fromEntries(M.map((k) => [k, { planned: 0, invoiced: 0, received: 0 }]));
  const addF = (k, f, v) => { if (flow[k]) flow[k][f] += v; };

  // revenue by project: the accepted quote (or the latest one still open, marked "quoted"), invoices and payments
  const rev = {};
  const R = (core) => (rev[core] = rev[core] || { contract: 0, quoted: 0, invoiced: 0, received: 0, owed: 0, overdue: 0 });
  for (const q of docs.quotes) {
    if (!q.core || q.status === 'void' || q.status === 'declined') continue;
    const x = R(q.core), ex = (q.totals && q.totals.ex) || 0;
    if (q.status === 'accepted' || q.invoiceId) x.contract += ex; else x.quoted = Math.max(x.quoted, ex);
  }
  for (const inv of docs.invoices) {
    if (inv.status === 'void' || inv.status === 'draft') continue;
    const ex = (inv.totals && inv.totals.ex) || 0, inc = (inv.totals && inv.totals.inc) || 0, exOf = (v) => (inc ? v * ex / inc : 0);
    addF(ym(inv.issued), 'invoiced', ex);
    for (const p of inv.payments || []) addF(ym(p.date), 'received', exOf(p.amount));
    if (!inv.core) continue;
    const x = R(inv.core), paid = Math.min(inc, inv.paid || 0);
    x.invoiced += ex; x.received += exOf(paid); x.owed += exOf(inc - paid);
    if (inc - paid > 0.5 && inv.due && inv.due < day) x.overdue += exOf(inc - paid);
  }

  const rows = [], old = (() => {   // the snapshot from about a week ago: the newest one at least 7 days old
    const ds = Object.keys((snap && snap.days) || {}).sort(), cut = new Date(Date.parse(day + 'T00:00:00Z') - 7 * 864e5).toISOString().slice(0, 10);
    const k = ds.filter((d) => d <= cut).pop(); return k ? { day: k, map: snap.days[k] } : null;
  })();
  for (const c of cards) {
    const p = byCore[c.core], h = p ? (() => { try { return W.check(p, day); } catch (e) { return null; } })() : null, n = (h && h.n) || {};
    const health = P.healthOf(c), why = h && (h.reasons || []).find((r) => r.lvl === health) || (h && (h.reasons || [])[0]) || null;
    const budget = r2(n.budget || c.BAC), eac = r2(n.EAC || c.BAC), x = rev[c.core] || { contract: 0, quoted: 0, invoiced: 0, received: 0, owed: 0, overdue: 0 };
    const price = x.contract || x.quoted, profit = price ? r2(price - eac) : null;
    if (p) for (const t of p.tasks || []) spread(t, P.taskCost(t), (k, v) => addF(k, 'planned', v));
    const was = old && old.map[c.core], trend = !was ? '' : RANK[health] < RANK[was[0]] ? 'up' : RANK[health] > RANK[was[0]] ? 'down'
      : c.SPI != null && was[1] != null && c.SPI - was[1] >= 0.03 ? 'up' : c.SPI != null && was[1] != null && was[1] - c.SPI >= 0.03 ? 'down' : 'flat';
    rows.push({ core: c.core, ref: c.ref, name: c.name, program: c.program || '', programKey: c.programKey || '', client: c.client || '', phase: P.PHASES[c.phase] || c.phase, health, why: why ? why.text : '',
      pct: c.pct || 0, SPI: c.SPI, CPI: c.CPI, finish: c.finish || '', forecast: PG.forecastFinish(c) || c.finish || '', baseline: n.baseline_finish || '', slip: n.slip_days || 0, late: c.late || 0,
      highRisks: c.highRisks || 0, openIssues: c.openIssues || 0, budget, spent: r2(c.AC), earned: r2(c.EV), eac, vac: r2(budget - eac), over: n.over_pct || 0,
      contract: r2(x.contract), quoted: x.contract ? 0 : r2(x.quoted), invoiced: r2(x.invoiced), received: r2(x.received), owed: r2(x.owed), overdue: r2(x.overdue),
      profit, margin: price && profit != null ? Math.round(profit / price * 1000) / 10 : null, trend, closed: c.phase === 'close' });
  }
  rows.sort((a, b) => RANK[b.health] - RANK[a.health] || (a.SPI == null) - (b.SPI == null) || (a.SPI || 9) - (b.SPI || 9) || a.name.localeCompare(b.name));

  const live = rows.filter((r) => !r.closed), sum = (L, f) => r2(L.reduce((a, r) => a + (Number(r[f]) || 0), 0));
  const totals = (L) => { const budget = sum(L, 'budget'), eac = sum(L, 'eac'), price = r2(L.reduce((a, r) => a + (r.contract || r.quoted), 0)), priced = L.filter((r) => r.contract || r.quoted), pp = r2(priced.reduce((a, r) => a + (r.profit || 0), 0)), pr = r2(priced.reduce((a, r) => a + (r.contract || r.quoted), 0));
    const ev = sum(L, 'earned'), ac = sum(L, 'spent'), pvL = L.filter((r) => r.SPI != null);
    return { n: L.length, red: L.filter((r) => r.health === 'red').length, amber: L.filter((r) => r.health === 'amber').length, green: L.filter((r) => r.health === 'green').length, grey: L.filter((r) => r.health === 'grey').length,
      budget, spent: ac, earned: ev, eac, vac: r2(budget - eac), CPI: ac > 0 ? r2(ev / ac) : null, SPI: pvL.length ? r2(pvL.reduce((a, r) => a + r.SPI * r.budget, 0) / Math.max(1, pvL.reduce((a, r) => a + r.budget, 0))) : null,
      contract: sum(L, 'contract'), quoted: sum(L, 'quoted'), price, invoiced: sum(L, 'invoiced'), received: sum(L, 'received'), owed: sum(L, 'owed'), overdue: sum(L, 'overdue'),
      profit: pr ? pp : null, margin: pr ? Math.round(pp / pr * 1000) / 10 : null, unpriced: L.filter((r) => !(r.contract || r.quoted) && r.budget > 0).length }; };
  const progs = {}; for (const r of live) (progs[r.program || 'No program'] = progs[r.program || 'No program'] || []).push(r);
  const byProgram = Object.entries(progs).map(([name, L]) => ({ name, key: L[0].programKey, ...totals(L) })).sort((a, b) => (b.red * 10 + b.amber) - (a.red * 10 + a.amber) || b.budget - a.budget);

  // the daily snapshot (one per day, 60 days kept) for next week's arrows
  if (!(snap && snap.days && snap.days[day])) await kv.update('ceo-snap', (s) => { const d = { ...((s && s.days) || {}) }; d[day] = Object.fromEntries(rows.map((r) => [r.core, [r.health, r.SPI, r.CPI]]));
    const ks = Object.keys(d).sort(); while (ks.length > 60) delete d[ks.shift()]; return { days: d }; }, () => ({ days: {} })).catch(() => {});

  return { today: day, since: old ? old.day : '', all: totals(live), closed: rows.filter((r) => r.closed).length, rows, byProgram,
    overspends: live.filter((r) => r.vac < -0.5).sort((a, b) => a.vac - b.vac).slice(0, 5).map((r) => ({ core: r.core, name: r.name, program: r.program, vac: r.vac, over: r.over })),
    flow: M.map((k) => ({ month: k, planned: r2(flow[k].planned), invoiced: r2(flow[k].invoiced), received: r2(flow[k].received) })), at: Date.now() };
}
