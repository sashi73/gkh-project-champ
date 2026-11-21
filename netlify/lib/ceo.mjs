// 👔 The CEO view (Persona): manage by exception. Every project's health and the money across all of them, in one call.
//   Health: Champ's watch (red / amber / green with the first reason), % done, SPI, CPI, forecast finish vs baseline, trend vs a week ago.
//   Money: cost (budget, spent, earned, forecast at completion, over / under) and revenue (contract value from the accepted quote,
//   invoiced, received, still owed) and profit (contract value minus forecast cost). Totals, by program, top overspends, cash flow by month.
//   Read-only: it changes nothing except a small daily snapshot (ceo-snap) used for the "since last week" arrows.
import * as kv from './kv.mjs';
import * as P from './plan.mjs';
import * as PG from './programs.mjs';
import * as J from './jobs.mjs';
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
  // 💵 no accepted quote: the contract value typed in on the Finance screen (billing:<core>)
  for (const k of await kv.keys('billing:').catch(() => [])) { const b = await kv.get(k).catch(() => null), core = k.slice(8); if (b && b.contract > 0 && !(rev[core] && rev[core].contract)) R(core).contract = Number(b.contract) || 0; }
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
    // 💰 the same money as Finance (plan.mjs moneyOf): budget = the approved (charter) budget, or else base + contingency + reserve; forecast cost = EAC
    const MO = p ? P.moneyOf(p, c) : null, budget = MO ? (MO.approved || MO.budget) : r2(c.BAC), eac = MO ? MO.eac : r2(c.BAC), x = rev[c.core] || { contract: 0, quoted: 0, invoiced: 0, received: 0, owed: 0, overdue: 0 };
    // 📝 approved variation orders add to a confirmed contract value (as on Finance)
    const vo = p ? r2((p.changes || []).filter((ch) => ch.vo && (ch.status === 'Approved' || ch.status === 'Implemented')).reduce((a, ch) => a + Number(ch.vo || 0), 0)) : 0;
    if (x.contract > 0 && vo) x.contract = r2(x.contract + vo);
    // 💹 profit by the contract type, the same calculation as Finance (plan.mjs profitAt)
    const price = x.contract || x.quoted, PF = price && MO ? P.profitAt(MO, price, eac) : null, profit = price ? (PF ? PF.profit : r2(price - eac)) : null;
    if (p) for (const t of p.tasks || []) spread(t, P.taskCost(t), (k, v) => addF(k, 'planned', v));
    const was = old && old.map[c.core], trend = !was ? '' : RANK[health] < RANK[was[0]] ? 'up' : RANK[health] > RANK[was[0]] ? 'down'
      : c.SPI != null && was[1] != null && c.SPI - was[1] >= 0.03 ? 'up' : c.SPI != null && was[1] != null && was[1] - c.SPI >= 0.03 ? 'down' : 'flat';
    rows.push({ core: c.core, ref: c.ref, name: c.name, program: c.program || '', programKey: c.programKey || '', client: c.client || '', phase: P.PHASES[c.phase] || c.phase, health, why: why ? why.text : '',
      pct: c.pct || 0, SPI: c.SPI, CPI: c.CPI, finish: c.finish || '', forecast: PG.forecastFinish(c) || c.finish || '', baseline: n.baseline_finish || '', slip: n.slip_days || 0, late: c.late || 0,
      highRisks: c.highRisks || 0, openIssues: c.openIssues || 0, budget, spent: r2(c.AC), earned: r2(c.EV), evIn: r2(c.EVin || 0), acIn: r2(c.ACin || 0), eac, vac: r2(budget - eac), over: n.over_pct || 0,
      contract: r2(x.contract), quoted: x.contract ? 0 : r2(x.quoted), invoiced: r2(x.invoiced), received: r2(x.received), owed: r2(x.owed), overdue: r2(x.overdue),
      profit, margin: price && profit != null ? Math.round(profit / price * 1000) / 10 : null, ctype: MO ? MO.ctype : 'fixed', clientSaves: PF ? PF.clientSaves : 0, trend, closed: c.phase === 'close' });
  }
  rows.sort((a, b) => RANK[b.health] - RANK[a.health] || (a.SPI == null) - (b.SPI == null) || (a.SPI || 9) - (b.SPI || 9) || a.name.localeCompare(b.name));

  const live = rows.filter((r) => !r.closed), sum = (L, f) => r2(L.reduce((a, r) => a + (Number(r[f]) || 0), 0));
  const totals = (L) => { const budget = sum(L, 'budget'), eac = sum(L, 'eac'), price = r2(L.reduce((a, r) => a + (r.contract || r.quoted), 0)), priced = L.filter((r) => r.contract || r.quoted), pp = r2(priced.reduce((a, r) => a + (r.profit || 0), 0)), pr = r2(priced.reduce((a, r) => a + (r.contract || r.quoted), 0));
    const ev = sum(L, 'earned'), ac = sum(L, 'spent'), evIn = sum(L, 'evIn'), acIn = sum(L, 'acIn'), pvL = L.filter((r) => r.SPI != null);
    return { n: L.length, red: L.filter((r) => r.health === 'red').length, amber: L.filter((r) => r.health === 'amber').length, green: L.filter((r) => r.health === 'green').length, grey: L.filter((r) => r.health === 'grey').length,
      budget, spent: ac, earned: ev, eac, vac: r2(budget - eac), CPI: acIn > 0 ? r2(evIn / acIn) : null,   // as each project's CPI: from the costs actually entered SPI: pvL.length ? r2(pvL.reduce((a, r) => a + r.SPI * r.budget, 0) / Math.max(1, pvL.reduce((a, r) => a + r.budget, 0))) : null,
      contract: sum(L, 'contract'), quoted: sum(L, 'quoted'), price, invoiced: sum(L, 'invoiced'), received: sum(L, 'received'), owed: sum(L, 'owed'), overdue: sum(L, 'overdue'),
      profit: pr ? pp : null, margin: pr ? Math.round(pp / pr * 1000) / 10 : null, priced: priced.length, unpriced: L.filter((r) => !(r.contract || r.quoted) && r.budget > 0).length }; };
  const progs = {}; for (const r of live) (progs[r.program || 'No program'] = progs[r.program || 'No program'] || []).push(r);
  const byProgram = Object.entries(progs).map(([name, L]) => ({ name, key: L[0].programKey, ...totals(L) })).sort((a, b) => (b.red * 10 + b.amber) - (a.red * 10 + a.amber) || b.budget - a.budget);

  // the daily snapshot (one per day, 60 days kept) for next week's arrows
  if (!(snap && snap.days && snap.days[day])) await kv.update('ceo-snap', (s) => { const d = { ...((s && s.days) || {}) }; d[day] = Object.fromEntries(rows.map((r) => [r.core, [r.health, r.SPI, r.CPI]]));
    const ks = Object.keys(d).sort(); while (ks.length > 60) delete d[ks.shift()]; return { days: d }; }, () => ({ days: {} })).catch(() => {});

  const cash = await cashFlow(day, plans, docs).catch((e) => { console.error('CEO cash flow: ' + e.message); return null; });
  return { today: day, since: old ? old.day : '', all: totals(live), closed: rows.filter((r) => r.closed).length, rows, byProgram, cash,
    overspends: live.filter((r) => r.vac < -0.5).sort((a, b) => a.vac - b.vac).slice(0, 5).map((r) => ({ core: r.core, name: r.name, program: r.program, vac: r.vac, over: r.over })),
    flow: M.map((k) => ({ month: k, planned: r2(flow[k].planned), invoiced: r2(flow[k].invoiced), received: r2(flow[k].received) })), at: Date.now() };
}

// 🎙 Champ's CEO briefing: the AI reads the CEO view and writes the overview, the concerns, quick wins, strategy and the road ahead.
// The verdict is fixed by rules (not the AI): a turnaround plan when it is bad, steady-and-strengthen in the middle, keep it up when it is good.
export function verdictOf(V) {
  const A = V.all, red = A.n ? A.red / A.n : 0, low = (x, t) => x != null && x < t, over = A.budget ? -A.vac / A.budget : 0;
  if (red >= 0.34 || low(A.SPI, 0.9) || low(A.CPI, 0.9) || over > 0.1) return 'turnaround';
  if (A.red > 0 || A.amber > 0 || low(A.SPI, 1) || low(A.CPI, 1) || over > 0.02 || (A.overdue || 0) > 0) return 'steady';
  return 'keep';
}
const PLAN_NAME = { turnaround: 'Turnaround plan', steady: 'Steady and strengthen', keep: 'Keep it up' };
async function factsOf(day) {
  const B = await import('./billing.mjs');
  const V = await ceoView(day), F = await B.finance(day).catch(() => null), verdict = verdictOf(V), A = V.all;
  const facts = { date: day, verdict, totals: { projects: A.n, in_trouble: A.red, at_risk: A.amber, on_track: A.green, no_plan: A.grey, SPI: A.SPI, CPI: A.CPI, budget: A.budget, spent: A.spent, earned_value: A.earned,
      forecast_cost_at_completion: A.eac, budget_minus_forecast: A.vac, contract_value: A.contract || A.price, invoiced_ex_tax: A.invoiced, received_ex_tax: A.received, owed_ex_tax: A.owed, overdue_ex_tax: A.overdue,
      forecast_profit_or_loss_on_priced_projects_only: A.profit, priced_projects: A.priced, margin_pct_on_priced_projects: A.margin, unpriced_projects: A.unpriced },
    // 📖 what the numbers mean, so the briefing never misreads them
    definitions: { budget: 'per project: the approved (charter) budget, or else base cost + contingency + management reserve; ex tax',
      forecast_cost_at_completion: 'EAC = spent so far + the work still to do at the current cost efficiency (CPI); for finished work it is what was spent',
      budget_minus_forecast: 'positive = forecast to finish under budget; negative = forecast to finish over budget by that amount',
      forecast_profit_or_loss: 'by each project\'s contract type, ONLY for projects that have a contract value or an open quote (it is not the whole portfolio); negative = a loss. Fixed price: contract value minus forecast cost (unused contingency and reserve are profit). Cost-plus: the fee (margin %) on the actual cost (the client keeps what is not spent). Target cost / GMP: the fee plus our share of any saving, less our share of any overrun (GMP: the client never pays above the contract value)',
      CPI: 'earned value / actual cost, from the costs actually entered; under 1 = over budget', SPI: 'earned value / planned value; under 1 = behind schedule' },
    finance: F ? { ready_to_invoice: F.totals.ready, ready_milestones: F.totals.readyN, overdue_invoices: F.totals.overdueN, owed_by_age: F.aging } : null,
    programs: V.byProgram.slice(0, 12).map((p) => ({ program: p.name, projects: p.n, red: p.red, amber: p.amber, green: p.green, budget: p.budget, forecast_cost: p.eac, budget_minus_forecast: p.vac, profit_or_loss_on_priced_projects: p.profit, margin_pct: p.margin })),
    worst_projects: V.rows.filter((r) => !r.closed && r.health !== 'green').slice(0, 12).map((r) => ({ project: r.name, program: r.program, health: r.health, why: r.why, done_pct: r.pct, SPI: r.SPI, CPI: r.CPI, days_late: r.slip, budget: r.budget, forecast_cost: r.eac, budget_minus_forecast: r.vac, contract_type: r.ctype, profit_or_loss: r.profit, trend: r.trend || 'n/a' })),
    healthy_projects: V.rows.filter((r) => !r.closed && r.health === 'green').slice(0, 8).map((r) => r.name), biggest_overspends: V.overspends,
    cash: V.cash ? { health: V.cash.word, next_6_months_in: V.cash.in6, next_6_months_out: V.cash.out6, cover_in_over_out: V.cash.cover6, lowest_point: V.cash.low, end_of_horizon: V.cash.end, late_money_expected: V.cash.lateIn, contract_not_yet_on_a_milestone: V.cash.unscheduled,
      quarters: V.cash.quarters.map((q) => ({ quarter: q.quarter, in: q.in, out: q.out, net: q.net, position_at_end: q.position, actual: q.actual })) } : null };
  return { facts, verdict, V };
}
export async function brief(day, by) {
  const AI = await import('./ai.mjs'), B = await import('./billing.mjs');
  await AI.checkLimit();
  const { facts, verdict } = await factsOf(day);
  const strat = verdict === 'turnaround' ? 'turnaround strategy' : verdict === 'keep' ? 'winning strategy' : 'strategy to steady and strengthen';
  const sys = 'You are Champ, briefing the CEO on the project portfolio. Be objective and specific: every point rests on the figures given (money in $, rounded, e.g. $1.2M; name the programs and projects). No generic advice, no management jargon and no names of authors or theories. Read every figure by its meaning in "definitions": profit or loss covers only the priced projects (say so), a negative profit is a loss (say "a loss of $X", never "negative profit"), and budget_minus_forecast below zero means over budget. ' +
    'Use sound strategic thinking (focus scarce resources on what earns, stop what no longer earns its keep, manage by exception, protect margin and cash, know where advantage comes from) but do not name it. ' +
    `The verdict is fixed: ${verdict.toUpperCase()}. turnaround = the portfolio is in trouble: recommend a firm, time-boxed turnaround strategy. steady = mixed: steady the weak spots and build on what works. keep = healthy: recommend the winning strategy to keep it so and grow. Do not soften or change the verdict. ` +
    'Write, in this order: ' +
    'faring: how we are faring, 3-4 sentences (delivery, money, cash, with the key figures). ' +
    'concerns: what I am concerned about, 2-5 points worst first, each {title (under 9 words), detail (1-2 sentences with figures and which program or project)}. ' +
    'positives: what I am happy about, 1-4 points, each {title, detail}; if nothing is going well, one honest point. ' +
    `strategy: the recommended ${strat}, 3-4 moves, each {title, detail}. ` +
    'focus: what we should focus on in the coming weeks, 3-5 points, each {title, detail}, the most important first. ' +
    'cash_view: how our cash flow looks going forward, 3-4 sentences: health, the lowest point and when, where it ends up, and the one or two moves that change it most. Costs are the plans spread over their dates; money in is payments, unpaid invoices and milestones still to bill, all before tax. ' +
    'conclusion: 2 sentences: the bottom line and the one thing that matters most now. ' +
    'plan: the strategy as 3-4 time-boxed steps, each {when ("Next 2 weeks", "30 days", "60 days", "90 days"), what (one sentence)}. ' +
    'headline: one sentence stating the verdict in plain words. ' +
    'say: the whole briefing as a spoken script for Champ to read aloud, 200-280 words, in this order: how we are faring, what concerns me and what I am happy about, the recommended strategy, what to focus on, the cash flow going forward, the conclusion. Plain sentences, no lists or symbols. No markdown anywhere. ' +
    'JSON only: {"headline":"","faring":"","concerns":[{"title":"","detail":""}],"positives":[{"title":"","detail":""}],"strategy":[{"title":"","detail":""}],"focus":[{"title":"","detail":""}],"cash_view":"","conclusion":"","plan":[{"when":"","what":""}],"say":""}';
  const r = await AI.llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(facts) }], { maxTokens: 2200, timeoutMs: 110000, temperature: 0.3 });
  const d = r && r.data; if (!d || !d.headline) return { error: 'Champ could not write the briefing just now. Try again in a minute.' };
  const S = (x, n) => String(x || '').slice(0, n), L = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map((x) => ({ title: S(x && x.title, 140), detail: S(x && x.detail, 500) })).filter((x) => x.title);
  const out = { verdict, plan_name: PLAN_NAME[verdict], strategy_name: verdict === 'turnaround' ? 'Recommended turnaround strategy' : verdict === 'keep' ? 'Recommended winning strategy' : 'Recommended strategy: steady and strengthen',
    headline: S(d.headline, 300), faring: S(d.faring || d.overview, 1400), concerns: L(d.concerns, 5), positives: L(d.positives, 4), strategy: L(d.strategy, 4), focus: L(d.focus || d.quick_wins, 5), cash_view: S(d.cash_view, 1000), conclusion: S(d.conclusion || d.road_ahead, 600),
    plan: (Array.isArray(d.plan) ? d.plan : []).slice(0, 4).map((x) => ({ when: S(x && x.when, 40), what: S(x && x.what, 400) })).filter((x) => x.what), say: S(d.say, 3200), at: Date.now(), day, by, lang: AI.reqLang(), tokens: r.used || 0 };
  await AI.usage(true, r.used || 0).catch(() => {});
  await kv.set('ceo-brief', out).catch(() => {});
  return { brief: out };
}


// 💧 the crystal ball: cash month by month (6 back, 12 ahead) and by quarter. In: payments received (actual), then unpaid invoices and
// milestones still to bill (forecast). Out: each plan's cost, spread over its tasks' dates. All before tax. Running position from the start of the window.
export async function cashFlow(day, plans, docs) {
  const B = await import('./billing.mjs'), F = await B.finance(day);
  const [y, m] = day.split('-').map(Number), cur = day.slice(0, 7), M = [];
  for (let i = -6; i <= 12; i++) M.push(new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7));
  const row = Object.fromEntries(M.map((k) => [k, { in: 0, out: 0 }]));
  // 💸 money out, consistent with each project's forecast cost (EAC): the work done is spread over the task's days up to today,
  //   at what it actually cost; the work still to do over its days from today (an overdue task's remaining work lands this month), at the
  //   project's own cost efficiency. Spent + still to do = the forecast cost (EAC).
  const yday = new Date(Date.parse(day + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  for (const p of plans) { let R = null; try { R = P.rollup(JSON.parse(JSON.stringify(p)), day); P.schedule(p); } catch (e) { continue; }
    const k = R && R.CPIx ? 1 / R.CPIx : 1;
    for (const t of p.tasks || []) { if (!t.es || !t.ef) continue; const c = P.taskCost(t), f = Math.min(100, Number(t.pct) || 0) / 100, done = c * f, left = c - done;
      const spent = Number(t.actual) > 0 ? Number(t.actual) : done;   // what the work done cost: the actual entered, else its cost (as the EVM)
      if (spent > 0.004) spread(t.es < day ? { ...t, ef: t.ef < day ? t.ef : yday } : { ...t, es: day, ef: day }, spent, (mo, v) => { if (row[mo]) row[mo].out += v; });
      if (left > 0.004) spread(t.ef >= day ? { ...t, es: t.es > day ? t.es : day } : { ...t, es: day, ef: day }, left * k, (mo, v) => { if (row[mo]) row[mo].out += v; }); } }
  for (const i of docs.invoices) { if (i.status === 'void' || i.status === 'draft') continue; const inc = i.totals.inc, ex = i.totals.ex;
    for (const pay of i.payments || []) { const k = (pay.date || '').slice(0, 7); if (row[k] && k <= cur) row[k].in += inc ? pay.amount * ex / inc : 0; } }
  for (const e of F.expected || []) if (row[e.month] && e.month >= cur) row[e.month].in += e.amount;
  let run = 0;
  const months = M.map((k) => { const r = row[k], net = r2(r.in - r.out); run = r2(run + net); return { month: k, in: r2(r.in), out: r2(r.out), net, position: run, actual: k < cur, now: k === cur }; });
  const qOf = (k) => { const [yy, mm] = k.split('-').map(Number); return yy + ' Q' + Math.ceil(mm / 3); }, Q = {};
  for (const x of months) { const q = (Q[qOf(x.month)] = Q[qOf(x.month)] || { quarter: qOf(x.month), in: 0, out: 0, net: 0, position: 0, actual: true }); q.in = r2(q.in + x.in); q.out = r2(q.out + x.out); q.net = r2(q.net + x.net); q.position = x.position; if (!x.actual) q.actual = false; }
  const ahead = months.filter((x) => x.month >= cur), six = ahead.slice(0, 6), inN = six.reduce((a, x) => a + x.in, 0), outN = six.reduce((a, x) => a + x.out, 0);
  const low = ahead.reduce((a, x) => (x.position < a.position ? x : a), ahead[0] || { position: 0, month: cur }), end = months[months.length - 1];
  const cover = outN > 0 ? Math.round(inN / outN * 100) / 100 : null;
  const health = (low.position < 0 && -low.position > 0.25 * Math.max(1, outN)) || (cover != null && cover < 0.7) ? 'red' : low.position < 0 || (cover != null && cover < 1) ? 'amber' : 'green';
  const word = { red: 'Cash under pressure', amber: 'Cash is tight', green: 'Cash is healthy' }[health];
  return { months, quarters: Object.values(Q), health, word, cover6: cover, in6: r2(inN), out6: r2(outN), low: { month: low.month, position: low.position }, end: { month: end.month, position: end.position },
    unscheduled: F.unscheduled || 0, lateIn: r2((F.expected || []).filter((e) => e.late).reduce((a, e) => a + e.amount, 0)) };
}

// 🧭 Ask Champ on the CEO view: Champ, in control of the whole project environment (RAG over the documents and plans), with an executive strategy layer
// every project's people and facts, so "who is the customer / project manager / owner of X?" gets a straight answer
async function projectFacts(day, V) {
  const [plans, jobs, programs, U] = await Promise.all([P.list(), J.all(), PG.list(), import('./users.mjs')]);
  const users = await U.list().catch(() => []), uname = Object.fromEntries(users.map((u) => [u.id, (u.name || u.username) + (u.role ? ' (' + u.role + ')' : '')]));
  const jb = Object.fromEntries(jobs.map((j) => [j.core, j])), row = Object.fromEntries(V.rows.map((r) => [r.core, r])), pg = Object.fromEntries(programs.map((g) => [g.name, g]));
  return plans.slice(0, 60).map((p) => { const j = jb[p.core] || {}, c = p.charter || {}, r = row[p.core] || {}, g = pg[j.program || ''] || {};
    return { project: p.name, ref: j.core ? J.refFor(j) : p.core, customer: j.name || c.customer || '', customer_email: j.email || undefined, customer_phone: j.phone || undefined, site: j.suburb || undefined,
      program: j.program || '', program_director: g.director ? uname[g.director] || '' : '', program_manager: g.manager || '', program_sponsor: g.sponsor || '',
      project_manager: c.manager || j.manager || '', project_sponsor_owner: j.sponsor || '', objective: String(c.objective || '').slice(0, 240),
      phase: r.phase || '', health: r.health || '', why: r.why || '', done_pct: r.pct, start: p.start || '', forecast_finish: r.forecast || '', baseline_finish: r.baseline || '', finish_by: p.finishBy || '',
      budget: r.budget, spent: r.spent, forecast_cost: r.eac, contract: r.contract || r.quoted || 0, invoiced: r.invoiced, received: r.received,
      stakeholders: (p.stakeholders || []).filter((x) => x.name).slice(0, 12).map((x) => ({ name: x.name, role: x.role || '', raci: x.raci || '', organisation: x.org || x.company || undefined })) }; });
}
// 🔎 RAG across the whole project environment: every project's documents (their readable text) and its plan (tasks, risks, issues,
// changes, stakeholders, charter), ranked by the question's words, so Champ answers from what is actually in Champ
async function rag(q) {
  const words = [...new Set(String(q || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])].filter((w) => !/^(the|and|for|who|what|when|where|which|how|with|our|are|is|this|that|from|about|project|projects|please|tell|show)$/.test(w)).slice(0, 12);
  if (!words.length) return { documents: [], plan_items: [] };
  const DMS = await import('./dms.mjs'), plans = await P.list(), docs = [], items = [];
  const score = (t) => { const low = String(t || '').toLowerCase(); let sc = 0; for (const w of words) { const k = low.split(w).length - 1; if (k) sc += 1 + Math.log(1 + k); } return sc; };
  await Promise.all(plans.slice(0, 80).map(async (p) => {
    try { const h = await DMS.search(p.core, q); for (const x of (h.hits || []).slice(0, 5)) docs.push({ project: p.name, document: x.name, folder: x.folder, page: x.page || undefined, score: x.score, text: x.text }); } catch (e) {}
    const add = (kind, text, extra) => { const sc = score(text); if (sc > 0) items.push({ project: p.name, kind, text: String(text).slice(0, 260), score: sc, ...extra }); };
    const c = p.charter || {}; add('charter', [c.objective, c.inScope, c.outScope, c.deliverables, c.acceptance, c.assumptions].filter(Boolean).join(' | '));
    for (const t of p.tasks || []) add('task', t.name, { start: t.es, finish: t.ef, pct: t.pct || 0, people: (t.res || []).join(', ') || undefined });
    for (const r of p.risks || []) add('risk', r.title + (r.action ? ' — ' + r.action : ''), { score_pxi: (r.p || 0) * (r.i || 0), owner: r.owner, status: r.status });
    for (const x of p.issues || []) add('issue', x.title + (x.resolution ? ' — ' + x.resolution : ''), { priority: x.priority, owner: x.owner, status: x.status, due: x.due });
    for (const x of p.changes || []) add('change request', x.title, { status: x.status });
    for (const x of p.stakeholders || []) add('stakeholder', [x.name, x.role, x.org].filter(Boolean).join(', '), { raci: x.raci });
    for (const t of p.tasks || []) for (const n of t.stickies || []) add('sticky note', n.text, { on: t.name, by: n.by, due: n.due || undefined, done: !!n.done });
  }));
  docs.sort((a, b) => b.score - a.score); items.sort((a, b) => b.score - a.score);
  return { documents: docs.slice(0, 14).map((d) => ({ ...d, score: undefined })), plan_items: items.slice(0, 30).map((d) => ({ ...d, score: undefined })) };
}
export async function ask(day, q, history) {
  const AI = await import('./ai.mjs');
  await AI.checkLimit();
  const { facts, verdict, V } = await factsOf(day);
  facts.projects_detail = await projectFacts(day, V).catch(() => []);
  facts.search = await rag(q).catch(() => ({ documents: [], plan_items: [] }));
  const sys = 'You are Champ, the AI inside GKH Project Champ, talking with the CEO on the CEO view. You are in control of the whole project environment: every program and project, its people, schedule, risks, issues, changes, sticky notes, documents and money. Read every money figure by its meaning in "definitions": profit or loss covers only priced projects, a negative profit is a loss (say "a loss of $X"), and budget_minus_forecast below zero means over budget. ' +
    'Answer anything about it from the data given: projects_detail (who is who and the key facts of each project), search (what Champ found in the documents and plans for this question: quote the document and page or the task, risk or note it came from), and the portfolio figures. ' +
    'Match projects and people by name even when the user spells them loosely. If the data does not hold the answer, say exactly what is missing in Champ and where to add it. Never invent names, numbers or dates. ' +
    'On top of that you think like a seasoned executive and strategist. Reason with these ideas when a question is about direction, priorities or money, but never name authors or theories: ' +
    'Drucker: what is our business and who is the customer; results come from opportunities, not problems; management by objectives and by exception; effectiveness (doing the right things) before efficiency; planned abandonment of what no longer earns its keep; concentrate scarce resources on the few things that matter; cash and knowledge workers as the real constraints. ' +
    'Porter: competitive advantage through a clear position (cost leadership, differentiation or focus) and avoiding being stuck in the middle; the five forces (clients\' bargaining power, suppliers and subcontractors, rivals, substitutes, new entrants); the value chain and where margin is made or lost; strategy is choosing what not to do (trade-offs) and fit between activities. ' +
    `The portfolio verdict is ${verdict} (fixed by rules). Be objective and specific; money in $ rounded; no jargon. ` +
    'For a FACT question (who, what, when, where, how much, status, what does a document say): answer directly in 1-4 sentences, citing the source; leave options, decision and measures empty. For an overview or "how are we doing" question: 5-8 sentences covering delivery, money, cash, the projects that matter most and the one thing to act on, then the options, decision and measures. ' +
    'For a STRATEGY question (what should we do, where to focus, how to fix, which to back or stop): answer (2-3 sentences, the direct answer and your recommendation), options (2-3, each {option, upside, downside}), decision (one sentence, in plain business terms), measures (2-3 things to track, each under 10 words). ' +
    'say: the answer in 1-3 spoken sentences, under 70 words. No markdown. ' +
    'JSON only: {"answer":"","options":[{"option":"","upside":"","downside":""}],"decision":"","measures":[""],"say":""}';
  // the conversation so far goes in as notes (not as earlier assistant turns, which made the AI answer in plain words and break the JSON)
  const H = (Array.isArray(history) ? history : []).slice(-4).filter((h) => h && h.q && h.a).map((h, i) => (i + 1) + '. Q: ' + String(h.q).slice(0, 300) + '\n   A: ' + String(h.a).slice(0, 700)).join('\n');
  const msgs = [{ role: 'system', content: sys }, { role: 'user', content: 'Champ data: ' + JSON.stringify(facts).slice(0, 60000) },
    { role: 'user', content: (H ? 'Our conversation so far (use it to understand follow-up questions such as "which of those", "the three you mentioned"):\n' + H + '\n\n' : '') + 'Question: ' + String(q).slice(0, 600) + '\n\nReply with the JSON object only.' }];
  const r = await AI.llmJson(msgs, { maxTokens: 1400, timeoutMs: 90000, temperature: 0.3, textOk: 'answer' });
  const d = r && r.data; if (!d || !d.answer) return { error: 'Champ could not answer just now. Ask again in a moment.' };
  const S = (x, n) => String(x || '').slice(0, n);
  await AI.usage(true, r.used || 0).catch(() => {});
  return { answer: { answer: S(d.answer, 1200), options: (Array.isArray(d.options) ? d.options : []).slice(0, 3).map((o) => ({ option: S(o && o.option, 200), upside: S(o && o.upside, 300), downside: S(o && o.downside, 300) })).filter((o) => o.option),
    decision: S(d.decision, 600), measures: (Array.isArray(d.measures) ? d.measures : []).slice(0, 3).map((x) => S(x, 120)).filter(Boolean), say: S(d.say, 600), tokens: r.used || 0 } };
}

// 📄 the briefing as a one-page PDF note (A4; a second page only if Champ wrote a lot)
export async function briefPdf() {
  const B = await kv.get('ceo-brief').catch(() => null); if (!B) return { error: 'There is no briefing yet: press Get Champ\'s briefing first.' };
  const { pdfLib } = await import('./pdf.mjs'), { PDFDocument, StandardFonts, rgb } = await pdfLib();
  const doc = await PDFDocument.create(), F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold);
  const safe = (t) => String(t || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');
  const W = 595, H = 842, M = 40, COLW = (W - 2 * M - 18) / 2, colX = [M, M + COLW + 18];
  const VC = { turnaround: rgb(0.86, 0.15, 0.15), steady: rgb(0.85, 0.47, 0.02), keep: rgb(0.09, 0.64, 0.29) }[B.verdict] || rgb(0.4, 0.4, 0.4);
  let page = doc.addPage([W, H]), y = H - M;
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: VC });
  page.drawText("Champ's CEO briefing", { x: M, y: y - 4, size: 16, font: FB }); y -= 22;
  page.drawText(safe(new Date(B.at).toLocaleString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })) + '  |  GKH Project Champ', { x: M, y, size: 8.5, font: F, color: rgb(0.4, 0.4, 0.4) });
  const pill = safe(B.plan_name || ''), pw = FB.widthOfTextAtSize(pill, 9) + 14; page.drawRectangle({ x: W - M - pw, y: y - 3, width: pw, height: 15, color: VC }); page.drawText(pill, { x: W - M - pw + 7, y: y + 1, size: 9, font: FB, color: rgb(1, 1, 1) }); y -= 18;
  const wrap = (t, f, size, w) => { const out = []; for (const para of safe(t).split('\n')) { let line = ''; for (const word of para.split(/\s+/)) { const tryL = line ? line + ' ' + word : word; if (f.widthOfTextAtSize(tryL, size) > w && line) { out.push(line); line = word; } else line = tryL; } out.push(line); } return out; };
  for (const l of wrap(B.headline, FB, 11, W - 2 * M)) { page.drawText(l, { x: M, y, size: 11, font: FB }); y -= 14; }
  y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.85, 0.82, 0.75) }); y -= 14;
  // two columns, filled left then right; a new page if both are full
  let col = 0, top = y, cy = y;
  const room = (h) => { if (cy - h >= M + 14) return; if (col === 0) { col = 1; cy = top; return; } page = doc.addPage([W, H]); col = 0; top = H - M; cy = top; };
  const head = (t) => { room(30); page.drawText(safe(t).toUpperCase(), { x: colX[col], y: cy, size: 8, font: FB, color: rgb(0.45, 0.35, 0.1) }); cy -= 12; };
  const para = (t, size = 8.6, f = F) => { for (const l of wrap(t, f, size, COLW)) { room(11); page.drawText(l, { x: colX[col], y: cy, size, font: f }); cy -= size + 2.6; } cy -= 4; };
  const items = (L) => { (L || []).forEach((x, i) => { para((i + 1) + '. ' + x.title, 8.8, FB); cy += 3; para(x.detail, 8.3); }); };
  head('How we are faring'); para(B.faring || B.overview);
  head('What I am concerned about'); items(B.concerns);
  if ((B.positives || []).length) { head('What I am happy about'); items(B.positives); }
  head(B.strategy_name || 'Recommended strategy'); items(B.strategy);
  head('What we should focus on next'); items(B.focus || B.quick_wins);
  if (B.cash_view) { head('Our cash flow going forward'); para(B.cash_view); }
  if ((B.plan || []).length) { head('Plan'); for (const x of B.plan) para(x.when + ': ' + x.what, 8.3); }
  if (B.conclusion || B.road_ahead) { head('Conclusion'); para(B.conclusion || B.road_ahead, 8.8, FB); }
  const pages = doc.getPages(); pages.forEach((p, i) => p.drawText('GKH Project Champ  |  confidential: for the CEO  |  page ' + (i + 1) + ' of ' + pages.length, { x: M, y: 20, size: 7, font: F, color: rgb(0.55, 0.55, 0.55) }));
  return { name: 'Champ CEO briefing ' + new Date(B.at).toISOString().slice(0, 10) + '.pdf', type: 'application/pdf', file: Buffer.from(await doc.save()).toString('base64'), pages: pages.length };
}
