// 💵 Milestone billing and the Finance screen (the CFO's).
//   Each project: a contract value (before tax; the accepted quote's if there is one) and a share of it on each milestone (%).
//   When a milestone is done (100%), it is "ready to invoice": raising it makes a tax invoice (marked sent) for that share,
//   with the milestone on the invoice line (tid), so it is never billed twice. Payments go on the invoice (payAdd).
//   Kept apart from the plan (billing:<core>), so finance never clashes with someone editing the schedule.
import * as kv from './kv.mjs';
import * as P from './plan.mjs';
import * as J from './jobs.mjs';
import * as ACC from './accounts.mjs';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ms = (plan) => (plan.tasks || []).filter((t) => t.dur === 0);   // milestones: tasks with no duration
export async function getBill(core) { return (await kv.get('billing:' + core)) || { contract: 0, ms: {} }; }

// the contract: the accepted quote (before tax) wins; otherwise the one typed in on the Finance screen
function contractOf(core, bill, quotes) {
  const acc = quotes.filter((q) => q.core === core && q.status !== 'void' && (q.status === 'accepted' || q.invoiceId)).reduce((a, q) => a + ((q.totals && q.totals.ex) || q.ex || 0), 0);
  return acc > 0 ? { value: r2(acc), from: 'quote' } : { value: r2(bill.contract), from: bill.contract ? 'typed' : '' };
}

export async function saveBill(core, body, by) {
  const plan = await P.get(core); if (!plan) return { error: 'That project is not there any more.', code: 404 };
  const ids = new Set(ms(plan).map((t) => t.id)), m = {};
  let tot = 0;
  for (const [k, v] of Object.entries((body && body.ms) || {})) { const pc = Math.max(0, Math.min(100, Math.round((Number(v) || 0) * 10) / 10)); if (ids.has(k) && pc > 0) { m[k] = pc; tot += pc; } }
  if (tot > 100.05) return { error: 'The milestones add up to ' + Math.round(tot * 10) / 10 + '% of the contract: keep it to 100% or less.', code: 400 };
  const typed = Math.max(0, r2(body && body.contract));
  // 🔒 once confirmed, the contract value is not changed here: a change goes through a variation order (raiseVO)
  const b = await kv.update('billing:' + core, (x) => ({ ...(x || {}), contract: x && x.contract > 0 ? x.contract : typed, confirmedAt: (x && x.confirmedAt) || Date.now(), confirmedBy: (x && x.confirmedBy) || by, ms: m, by, at: Date.now() }), () => ({ contract: 0, ms: {} }));
  return { ok: true, bill: b };
}

// one project's billing: the contract, each milestone with its share, done or not, and its invoice
function projectBill(plan, bill, docs, today) {
  const core = plan.core, C0 = contractOf(core, bill, docs.quotes), invs = docs.invoices.filter((i) => i.core === core && i.status !== 'void');
  const lineOf = {}; for (const i of invs) for (const l of i.items || []) if (l.tid) lineOf[l.tid] = i;
  P.schedule(plan);
  // 💰 the money, in one place: contract, GST, budget (cost + reserves), forecast cost, margin and profit (Costing settings: contingency, reserve, margin, GST)
  // 💰 the shared money function (plan.mjs moneyOf): the same base, budget and forecast cost as the Costing tab and the CEO view
  const R = P.rollup(JSON.parse(JSON.stringify(plan)), today), MO = P.moneyOf(plan, R), cont = MO.cont, res = MO.res, mg = MO.margin, gstp = MO.gst;
  const base = MO.base, contA = MO.contA, resA = MO.resA, budget = MO.budget, eac = MO.eac, complete = MO.complete;
  const suggested = MO.price;
  // 📐 no accepted quote and nothing typed in: estimate the contract from Costing (budget + margin), clearly marked, until the CFO confirms it
  const C1 = C0.value > 0 ? C0 : suggested > 0 ? { value: suggested, from: 'estimate' } : C0;
  // 📝 variation orders: change requests that carry a change to the contract value; approved ones add to it
  const vos = (plan.changes || []).filter((c) => c.vo).map((c) => ({ id: c.id, num: c.voNum || ('VO-' + c.num), title: String(c.title || '').replace(/^Variation order:\s*/i, ''), reason: c.reason || c.desc || '', amount: c.vo, status: c.status, by: c.raisedBy, at: c.raisedAt, decision: c.decision || null }));
  const voOk = r2(vos.filter((v) => v.status === 'Approved' || v.status === 'Implemented').reduce((a, v) => a + v.amount, 0)), voWait = r2(vos.filter((v) => ['Proposed', 'Under review', 'CCB meeting'].includes(v.status)).reduce((a, v) => a + v.amount, 0));
  const C = { ...C1, base: C1.value || 0, value: r2((C1.value || 0) + voOk) };
  const price = C.value || 0, gst = r2(price * gstp / 100);
  const money = { contract: price, contractFrom: C.from, contractBase: C.base, variations: voOk, variationsWaiting: voWait, suggested, marginCfg: mg, gstPct: gstp, gst, withGst: r2(price + gst), base, contPct: cont, contingency: contA, resPct: res, reserve: resA, budget, approved: MO.approved,
    spent: r2(R.AC), earned: r2(R.EV || 0), toDo: r2(Math.max(0, R.BAC - R.EV)), loose: MO.loose, eac, CPI: R.CPI, SPI: R.SPI, margin: price ? r2(price - budget) : null, marginPct: price ? Math.round((price - budget) / price * 1000) / 10 : null, profit: price ? r2(price - eac) : null, profitPct: price ? Math.round((price - eac) / price * 1000) / 10 : null,
    // 📈 forecast profit, two scenarios. The reserves pay for overruns, so a scenario's cost is the forecast cost or the budget that scenario allows, whichever is higher (no double counting)
    //   1) contingency and management reserve both used: cost up to the whole project budget; 2) the management reserve not used: up to base + contingency
    profit1: price ? r2(price - Math.max(eac, budget)) : null, profit2: price ? r2(price - Math.max(eac, base + contA)) : null, complete };
  for (const k of ['profit1', 'profit2']) money[k + 'Pct'] = price ? Math.round(money[k] / price * 1000) / 10 : null;
  // 📅 how close each milestone is: red and flashing within a week, amber within a month, green after; a short project (an event) scales the windows down
  const span = Math.max(1, Math.round((Date.parse((R.finish || today) + 'T00:00:00Z') - Date.parse((R.start || plan.start || today) + 'T00:00:00Z')) / 864e5));
  const redW = span >= 70 ? 7 : Math.max(1, Math.round(span / 10)), ambW = span >= 90 ? 30 : Math.max(redW + 2, Math.round(span / 3));
  const near = (due, billed) => { if (!due || billed) return { alert: '', days: null }; const d = Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5); return { alert: d <= redW ? 'red' : d <= ambW ? 'amber' : 'green', days: d }; };
  // 📐 no milestone shares set yet: split the contract evenly across the milestones (marked "suggested") until the CFO saves them
  const M0 = ms(plan), typedMs = Object.keys(bill.ms || {}).length > 0, auto = !typedMs && M0.length > 0, even = {};
  if (auto) { const n = M0.length, e = Math.floor(1000 / n) / 10; M0.forEach((t, i) => { even[t.id] = i === n - 1 ? r2(100 - e * (n - 1)) : e; }); }
  // 🧾 invoiced milestones keep what they were billed; what is left of the contract (approved variations included) is spread over the rest by their shares
  const shareOf = (t) => (auto ? even[t.id] : (bill.ms || {})[t.id] || 0), billedEx = r2(M0.filter((t) => lineOf[t.id]).reduce((a, t) => a + ((lineOf[t.id].items || []).filter((l) => l.tid === t.id).reduce((b, l) => b + (Number(l.qty) || 1) * (Number(l.price) || 0), 0)), 0));
  const restPct = M0.filter((t) => !lineOf[t.id]).reduce((a, t) => a + shareOf(t), 0), allPct = M0.reduce((a, t) => a + shareOf(t), 0);
  const restPool = billedEx > 0 && restPct > 0 ? Math.max(0, C.value * Math.min(100, allPct) / 100 - billedEx) : null;
  const amtOf = (t, pc) => { const inv = lineOf[t.id]; if (inv) return r2((inv.items || []).filter((l) => l.tid === t.id).reduce((b, l) => b + (Number(l.qty) || 1) * (Number(l.price) || 0), 0)); return restPool != null ? r2(restPool * pc / restPct) : r2(C.value * pc / 100); };
  const rows = M0.map((t) => { const pc = shareOf(t), inv = lineOf[t.id];
    return { tid: t.id, name: String(t.name || 'Milestone').replace(/^[✓◆\s]+/, ''), due: t.ef || t.es || '', done: (t.pct || 0) >= 100, pct: pc, amount: amtOf(t, pc), gstPct: gstp, gst: inv ? r2(inv.totals.gst) : r2(amtOf(t, pc) * gstp / 100), inc: inv ? r2(inv.totals.inc) : r2(amtOf(t, pc) * (1 + gstp / 100)),
      invoice: inv ? { id: inv.id, status: inv.status, inc: inv.totals.inc, paid: inv.paid || 0 } : null, ready: (t.pct || 0) >= 100 && pc > 0 && !inv && C.value > 0, confirm: C.from === 'estimate' || auto, ...near(t.ef || t.es || '', !!inv) }; });
  const inc = (i) => i.totals.inc, ex = (i) => i.totals.ex, live = invs.filter((i) => i.status !== 'draft');
  const invoiced = r2(live.reduce((a, i) => a + ex(i), 0)), received = r2(live.reduce((a, i) => a + (inc(i) ? Math.min(inc(i), i.paid || 0) * ex(i) / inc(i) : 0), 0));
  // 📊 where the project stands: work done (earned value ÷ budget) against what has been billed
  const done = R.BAC > 0 ? Math.min(1, (R.EV || 0) / R.BAC) : Math.min(1, (Number(R.pct) || 0) / 100), overdue = invs.filter((i) => i.status !== 'draft' && i.due && i.due < today && (i.totals.inc - (i.paid || 0)) > 0.005);
  const stand = { workPct: Math.round(done * 100), billedPct: price ? Math.round(Math.min(1, invoiced / price) * 100) : 0, unbilled: r2(Math.max(0, price * done - invoiced)),
    overdueN: overdue.length, overdue: r2(overdue.reduce((a, i) => a + i.totals.inc - (i.paid || 0), 0)), estimate: C.from === 'estimate', auto };
  const rdy = rows.filter((r) => r.ready), rdyAmt = r2(rdy.reduce((a, r) => a + r.amount, 0));
  stand.status = stand.overdueN ? { tone: 'red', text: stand.overdueN + ' invoice' + (stand.overdueN === 1 ? '' : 's') + ' overdue' }
    : rdy.length ? { tone: 'red', text: rdy.length + ' milestone' + (rdy.length === 1 ? '' : 's') + ' done, not billed (' + rdyAmt.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }) + ')' }
    : !price ? { tone: 'amber', text: 'No contract value or budget yet' }
    : stand.estimate ? { tone: 'amber', text: 'Contract value not confirmed (estimate)' }
    : auto ? { tone: 'amber', text: 'Milestone shares not set' }
    : !rows.length ? { tone: 'amber', text: 'No milestones to bill against' }
    : stand.unbilled > price * 0.05 ? { tone: 'amber', text: 'Work is ahead of billing' }
    : { tone: 'green', text: 'Billing up to date' };
  return { core, name: plan.name, money, stand, vos, gstPct: gstp, billedEx, restPct, spread: restPool != null, windows: { red: redW, amber: ambW, span }, contract: C.value, contractFrom: C.from, typed: r2(bill.contract), milestones: rows, planned: r2(rows.reduce((a, r) => a + r.pct, 0)),
    invoiced, received, owed: r2(invoiced - received), ready: rows.filter((r) => r.ready) };
}

export async function billFor(core, today) {
  const [plan, bill, docs] = await Promise.all([P.get(core), getBill(core), ACC.allDocs()]);
  if (!plan) return { error: 'That project is not there any more.', code: 404 };
  return { bill: projectBill(plan, bill, docs, today) };
}

export async function raise(core, tid, by, today) {
  const [plan, bill, docs] = await Promise.all([P.get(core), getBill(core), ACC.allDocs()]);
  if (!plan) return { error: 'That project is not there any more.', code: 404 };
  const B = projectBill(plan, bill, docs, today), m = B.milestones.find((x) => x.tid === tid);
  if (!m) return { error: 'That milestone is not in the plan any more.', code: 404 };
  if (m.invoice) return { error: m.name + ' is already on invoice ' + m.invoice.id + '.', code: 400 };
  if (!m.done) return { error: m.name + ' is not done yet: it can be invoiced once it reaches 100%.', code: 400 };
  if (!(m.amount > 0)) return { error: 'Set the contract value and this milestone\'s share first.', code: 400 };
  if (m.confirm) return { error: 'This project\'s billing is still an estimate: check the contract value and each milestone\'s share, then press Save billing to confirm before invoicing.', code: 400 };
  const job = await J.find(core).catch(() => null);
  const d = await ACC.createDoc('invoice', { core, customer: job ? { name: job.name, email: job.email, phone: job.phone, address: job.suburb } : { name: plan.name }, title: plan.name + ': ' + m.name,
    items: [{ desc: 'Milestone: ' + m.name + ' (' + m.pct + '% of the contract value ' + ACC.money(B.contract) + ')', qty: 1, price: m.amount, gst: m.gstPct > 0, gstRate: m.gstPct, tid: m.tid }] }, by);
  await ACC.setStatus(d.id, 'sent', by, 'Raised from milestone ' + m.name);
  return { ok: true, id: d.id, amount: m.amount };
}

// the Finance screen: every project's billing, every invoice with its age, cash in by month
export async function finance(today, cores) {
  const [plans0, docs0, keys, jobs0] = await Promise.all([P.list(), ACC.allDocs(), kv.keys('billing:').catch(() => []), J.all().catch(() => [])]);
  const jobOf = Object.fromEntries(jobs0.map((j) => [j.core, j]));   // 🔎 each project's program, client and reference, for searching on Finance
  const plans = cores ? plans0.filter((p) => cores.has(p.core)) : plans0, inP = (c) => !cores || cores.has(c);
  const docs = cores ? { ...docs0, quotes: docs0.quotes.filter((q) => inP(q.core)), invoices: docs0.invoices.filter((i) => inP(i.core)), expenses: [] } : docs0;
  const bills = Object.fromEntries((await Promise.all(keys.map(async (k) => [k.slice(8), await kv.get(k)]))).filter((x) => x[1]));
  const projects = plans.map((p) => projectBill(p, bills[p.core] || { contract: 0, ms: {} }, docs, today));
  const name = Object.fromEntries(plans.map((p) => [p.core, p.name])), age = (d) => (d && d < today ? Math.round((Date.parse(today) - Date.parse(d)) / 864e5) : 0);
  const invoices = docs.invoices.filter((i) => i.status !== 'void').map((i) => { const bal = r2(i.totals.inc - (i.paid || 0)), late = bal > 0.005 && i.status !== 'draft' ? age(i.due) : 0;
    return { id: i.id, core: i.core || '', project: name[i.core] || (i.customer && i.customer.name) || '', title: i.title || '', issued: i.issued, due: i.due, status: i.status, inc: i.totals.inc, ex: i.totals.ex, paid: r2(i.paid || 0), balance: bal, late,
      milestone: ((i.items || []).find((l) => l.tid) || {}).desc || '' }; }).sort((a, b) => (b.issued || '').localeCompare(a.issued || '') || b.id.localeCompare(a.id));
  const live = invoices.filter((i) => i.status !== 'draft'), sum = (L, f) => r2(L.reduce((a, x) => a + (Number(x[f]) || 0), 0));
  const aging = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
  for (const i of live) if (i.balance > 0.005) aging[i.late <= 0 ? 'current' : i.late <= 30 ? 'd1_30' : i.late <= 60 ? 'd31_60' : i.late <= 90 ? 'd61_90' : 'd90'] += i.balance;
  for (const k of Object.keys(aging)) aging[k] = r2(aging[k]);
  const [y, m] = today.split('-').map(Number), months = []; for (let k = -11; k <= 0; k++) months.push(new Date(Date.UTC(y, m - 1 + k, 1)).toISOString().slice(0, 7));
  const cash = Object.fromEntries(months.map((k) => [k, { invoiced: 0, received: 0 }]));
  for (const i of docs.invoices) { if (i.status === 'void' || i.status === 'draft') continue; const k = (i.issued || '').slice(0, 7); if (cash[k]) cash[k].invoiced += i.totals.inc; for (const p of i.payments || []) { const q = (p.date || '').slice(0, 7); if (cash[q]) cash[q].received += p.amount; } }
  const ready = projects.flatMap((p) => p.ready.map((r) => ({ core: p.core, project: p.name, ...r })));
  const coming = projects.flatMap((p) => p.milestones.filter((m) => !m.invoice && m.alert && m.pct > 0).map((m) => ({ core: p.core, project: p.name, tid: m.tid, name: m.name, due: m.due, days: m.days, alert: m.alert, amount: m.amount, done: m.done, ready: m.ready }))).sort((a, b) => (a.days ?? 9e9) - (b.days ?? 9e9));
  // 💧 cash still to come in (before tax): unpaid invoices on their due date (late ones: next month), and milestones not yet billed, 30 days after they fall due
  const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10), nextMonth = plus(today.slice(0, 8) + '01', 32).slice(0, 7);
  const expected = [];
  for (const i of docs.invoices) { if (i.status === 'void' || i.status === 'draft') continue; const inc = i.totals.inc, bal = inc - Math.min(inc, i.paid || 0); if (bal < 0.5) continue;
    const m = i.due && i.due >= today ? i.due.slice(0, 7) : nextMonth; expected.push({ month: m, amount: r2(inc ? bal * i.totals.ex / inc : 0), what: 'invoice ' + i.id, core: i.core || '', late: !!(i.due && i.due < today) }); }
  for (const p of projects) for (const m of p.milestones) if (!m.invoice && m.amount > 0) expected.push({ month: plus(m.due && m.due > today ? m.due : today, 30).slice(0, 7), amount: m.amount, what: 'milestone ' + m.name, core: p.core, late: false });
  const unscheduled = r2(projects.reduce((a, p) => a + Math.max(0, p.contract * (100 - p.planned) / 100 - (p.planned ? 0 : p.invoiced)), 0));
  const est = projects.filter((p) => p.stand.estimate), sg = projects.filter((p) => p.contract && !p.stand.estimate);
  const tone = { red: 0, amber: 1, green: 2 };
  return { today, totals: { contract: sum(projects, 'contract'), signed: sum(sg, 'contract'), signedN: sg.length, estimated: sum(est, 'contract'), estimatedN: est.length, noValueN: projects.filter((p) => !p.contract).length,
    unbilled: r2(projects.reduce((a, p) => a + p.stand.unbilled, 0)), projectsN: projects.length, invoicedInc: sum(live, 'inc'), received: sum(live, 'paid'), owed: sum(live, 'balance'), overdue: r2(live.filter((i) => i.late > 0).reduce((a, i) => a + i.balance, 0)),
    overdueN: live.filter((i) => i.late > 0).length, ready: r2(ready.reduce((a, r) => a + r.amount, 0)), readyN: ready.length, drafts: invoices.filter((i) => i.status === 'draft').length },
    coming, scoped: !!cores, expected, unscheduled, aging, cash: months.map((k) => ({ month: k, invoiced: r2(cash[k].invoiced), received: r2(cash[k].received) })), ready, invoices,
    projects: projects.slice().sort((a, b) => tone[a.stand.status.tone] - tone[b.stand.status.tone] || b.stand.unbilled - a.stand.unbilled).map((p) => ({ core: p.core, stand: p.stand, name: p.name, program: (jobOf[p.core] || {}).program || '', client: (jobOf[p.core] || {}).name || '', ref: jobOf[p.core] ? J.refFor(jobOf[p.core]) : '', contract: p.contract, contractFrom: p.contractFrom, planned: p.planned, invoiced: p.invoiced, received: p.received, owed: p.owed, ms: p.milestones.length, readyN: p.ready.length,
      next: (p.milestones.find((x) => !x.invoice && x.pct > 0) || {}).name || '' })), methods: ACC.PAY_METHODS };
}


// 🔐 who sees a project's billing: the super user, the CEO, the CFO, the program director named on its program, and its project manager
const nrm = (x) => String(x || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const sameP = (a, b) => { const x = nrm(a), y = nrm(b); if (!x || !y) return false; if (x === y) return true; const e = (v) => { const w = v.split(' '); return w.length > 1 ? w[0] + ' ' + w[w.length - 1] : ''; }; return !!e(x) && e(x) === e(y); };
export const allFinance = (ctx) => !!ctx && !ctx.scope && (ctx.owner || ctx.role === 'CEO' || ctx.role === 'CFO');
export async function billCores(ctx) {   // null = every project
  if (allFinance(ctx)) return null;
  if (!ctx || ctx.scope) return new Set();
  const PG = await import('./programs.mjs'), [plans, jobs, progs] = await Promise.all([P.list(), J.all(), PG.list()]), jb = Object.fromEntries(jobs.map((j) => [j.core, j]));
  const mine = new Set(progs.filter((g) => ctx.uid && g.director === ctx.uid).map((g) => g.name)), out = new Set();
  for (const p of plans) { const j = jb[p.core] || {}, mgr = (p.charter || {}).manager || j.manager || '';
    if (mine.has(j.program || '') || (ctx.name && sameP(mgr, ctx.name))) out.add(p.core); }
  return out;
}
export async function canSee(ctx, core) { const c = await billCores(ctx); return c === null || c.has(core); }
// 🔴 what needs attention, for the red count on the Finance menu: milestones due within their red window and not billed, milestones ready to invoice, overdue invoices
export async function alerts(ctx, today) {
  const cores = await billCores(ctx); if (cores && !cores.size) return { projects: 0, count: 0, red: 0, amber: 0, ready: 0, overdue: 0 };
  const F = await finance(today, cores);
  let red = 0, amber = 0; for (const x of F.coming || []) { if (x.alert === 'red') red++; else if (x.alert === 'amber') amber++; }
  return { projects: cores ? cores.size : F.projects.length, count: red + F.totals.readyN + F.totals.overdueN, red, amber, ready: F.totals.readyN, overdue: F.totals.overdueN };
}

// 📝 a variation order: a change to the contract value, raised on the Finance screen as a change request (Change control register),
//   flagged to the project manager and the program director with a sticky note (it shows in their Today), and approved by the
//   program director (or the CEO / super user). Once approved, it adds to the contract value.
async function people(core) {
  const PG = await import('./programs.mjs'), U = await import('./users.mjs');
  const [plan, job, progs] = await Promise.all([P.get(core), J.find(core).catch(() => null), PG.list()]);
  const g = progs.find((x) => x.name && x.name === ((job || {}).program || '')), dir = g && g.director ? await U.get(g.director).catch(() => null) : null;
  return { plan, job, program: g || null, pm: ((plan || {}).charter || {}).manager || (job || {}).manager || '', director: dir ? dir.name : '', directorId: g ? g.director : '' };
}
export async function canDecideVO(ctx, core) {
  if (!ctx || ctx.scope) return false; if (ctx.owner || ctx.role === 'CEO') return true;
  const W = await people(core); return !!(ctx.uid && W.directorId === ctx.uid);
}
export async function raiseVO(core, body, ctx, today) {
  const amount = r2(body && body.amount), title = String((body && body.title) || '').trim().slice(0, 160), reason = String((body && body.reason) || '').trim().slice(0, 2000);
  if (!amount) return { error: 'Type the change to the contract value (use a minus for a reduction).', code: 400 };
  if (!title) return { error: 'Say what the variation is for.', code: 400 };
  const W = await people(core); if (!W.plan) return { error: 'That project is not there any more.', code: 404 };
  const by = ctx.name || ctx.user || 'owner';
  for (let tries = 0; tries < 3; tries++) {
    const plan = await P.get(core), ch = plan.changes || [], num = ch.reduce((a, c) => Math.max(a, c.num || 0), 0) + 1, voNum = 'VO-' + String(ch.filter((c) => c.vo).length + 1).padStart(3, '0');
    const sign = (amount > 0 ? '+' : '−') + ACC.money(Math.abs(amount));
    ch.push({ id: 'cr' + Date.now().toString(36), num, title: 'Variation order: ' + title, desc: reason, reason, source: 'manual', raisedBy: by, raisedAt: Date.now(), priority: 'High', status: 'Proposed', estCost: amount, vo: amount, voNum,
      log: [{ at: Date.now(), what: voNum + ' raised from Finance by ' + by + ': ' + sign + ' to the contract value' }] });
    plan.changes = ch;
    // 📌 a sticky note on the next milestone (or the first task): it @mentions the project manager and the program director, so it is in their Today
    const at = (plan.tasks || []).find((t) => t.dur === 0 && (t.pct || 0) < 100) || (plan.tasks || [])[0];
    const who = [W.pm, W.director].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((n) => '@' + n).join(' ');
    if (at) { at.stickies = at.stickies || []; at.stickies.push({ id: 'n' + Date.now().toString(36), c: 'A', text: (who ? who + ' ' : '') + 'Variation order ' + voNum + ' raised by ' + by + ': ' + sign + ' to the contract value (' + title + '). Please review and approve it on the Finance screen (project billing). #waiting', by, at: Date.now(), due: today || '', linked: 'vo:' + voNum }); }
    const r = await P.save(core, plan, plan.rev, by);
    if (!r.conflict) return { ok: true, voNum, num, told: [W.pm, W.director].filter(Boolean) };
  }
  return { error: 'Someone was saving the plan at the same moment: try again.', code: 409 };
}
export async function decideVO(core, id, outcome, note, ctx) {
  if (!['Approved', 'Rejected'].includes(outcome)) return { error: 'Approve or reject.', code: 400 };
  if (!(await canDecideVO(ctx, core))) return { error: 'Only the program director for this project (or the CEO) can approve a variation order.', code: 403 };
  const by = ctx.name || ctx.user || 'owner';
  for (let tries = 0; tries < 3; tries++) {
    const plan = await P.get(core); if (!plan) return { error: 'That project is not there any more.', code: 404 };
    const c = (plan.changes || []).find((x) => x.id === id && x.vo); if (!c) return { error: 'That variation order is not there any more.', code: 404 };
    if (!['Proposed', 'Under review', 'CCB meeting'].includes(c.status)) return { error: (c.voNum || 'It') + ' is already ' + c.status.toLowerCase() + '.', code: 400 };
    c.status = outcome; c.decision = { by, role: ctx.owner ? 'Super user' : ctx.role || '', at: Date.now(), note: String(note || '').slice(0, 1000), outcome };
    c.log = (c.log || []).concat([{ at: Date.now(), what: (c.voNum || 'Variation') + ' ' + outcome.toLowerCase() + ' by ' + by + (note ? ': ' + String(note).slice(0, 200) : '') }]);
    for (const t of plan.tasks || []) for (const n of t.stickies || []) if (n.linked === 'vo:' + c.voNum && !n.done) { n.done = true; n.doneBy = by; }
    const r = await P.save(core, plan, plan.rev, by);
    if (!r.conflict) return { ok: true };
  }
  return { error: 'Someone was saving the plan at the same moment: try again.', code: 409 };
}
