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
  const contract = Math.max(0, r2(body && body.contract));
  const b = await kv.update('billing:' + core, (x) => ({ ...(x || {}), contract, ms: m, by, at: Date.now() }), () => ({ contract: 0, ms: {} }));
  return { ok: true, bill: b };
}

// one project's billing: the contract, each milestone with its share, done or not, and its invoice
function projectBill(plan, bill, docs, today) {
  const core = plan.core, C = contractOf(core, bill, docs.quotes), invs = docs.invoices.filter((i) => i.core === core && i.status !== 'void');
  const lineOf = {}; for (const i of invs) for (const l of i.items || []) if (l.tid) lineOf[l.tid] = i;
  P.schedule(plan);
  const rows = ms(plan).map((t) => { const pc = (bill.ms || {})[t.id] || 0, inv = lineOf[t.id];
    return { tid: t.id, name: String(t.name || 'Milestone').replace(/^[✓◆\s]+/, ''), due: t.ef || t.es || '', done: (t.pct || 0) >= 100, pct: pc, amount: r2(C.value * pc / 100),
      invoice: inv ? { id: inv.id, status: inv.status, inc: inv.totals.inc, paid: inv.paid || 0 } : null, ready: (t.pct || 0) >= 100 && pc > 0 && !inv && C.value > 0 }; });
  const inc = (i) => i.totals.inc, ex = (i) => i.totals.ex, live = invs.filter((i) => i.status !== 'draft');
  const invoiced = r2(live.reduce((a, i) => a + ex(i), 0)), received = r2(live.reduce((a, i) => a + (inc(i) ? Math.min(inc(i), i.paid || 0) * ex(i) / inc(i) : 0), 0));
  return { core, name: plan.name, contract: C.value, contractFrom: C.from, typed: r2(bill.contract), milestones: rows, planned: r2(rows.reduce((a, r) => a + r.pct, 0)),
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
  const job = await J.find(core).catch(() => null);
  const d = await ACC.createDoc('invoice', { core, customer: job ? { name: job.name, email: job.email, phone: job.phone, address: job.suburb } : { name: plan.name }, title: plan.name + ': ' + m.name,
    items: [{ desc: 'Milestone: ' + m.name + ' (' + m.pct + '% of the contract value ' + ACC.money(B.contract) + ')', qty: 1, price: m.amount, gst: true, tid: m.tid }] }, by);
  await ACC.setStatus(d.id, 'sent', by, 'Raised from milestone ' + m.name);
  return { ok: true, id: d.id, amount: m.amount };
}

// the Finance screen: every project's billing, every invoice with its age, cash in by month
export async function finance(today) {
  const [plans, docs, keys] = await Promise.all([P.list(), ACC.allDocs(), kv.keys('billing:').catch(() => [])]);
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
  return { today, totals: { contract: sum(projects, 'contract'), invoicedInc: sum(live, 'inc'), received: sum(live, 'paid'), owed: sum(live, 'balance'), overdue: r2(live.filter((i) => i.late > 0).reduce((a, i) => a + i.balance, 0)),
    overdueN: live.filter((i) => i.late > 0).length, ready: r2(ready.reduce((a, r) => a + r.amount, 0)), readyN: ready.length, drafts: invoices.filter((i) => i.status === 'draft').length },
    aging, cash: months.map((k) => ({ month: k, invoiced: r2(cash[k].invoiced), received: r2(cash[k].received) })), ready, invoices,
    projects: projects.filter((p) => p.contract || p.invoiced || p.milestones.length).map((p) => ({ core: p.core, name: p.name, contract: p.contract, contractFrom: p.contractFrom, planned: p.planned, invoiced: p.invoiced, received: p.received, owed: p.owed, ms: p.milestones.length, readyN: p.ready.length,
      next: (p.milestones.find((x) => !x.invoice && x.pct > 0) || {}).name || '' })), methods: ACC.PAY_METHODS };
}
