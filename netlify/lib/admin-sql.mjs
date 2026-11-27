import { langLine } from './ai.mjs';
// SQL wizard support: read-only tables for the browser (queries run in the browser, nothing can be changed),
// an AI-written narrative (DeepSeek) and a PDF report.
import { env, stripThinking } from './shared.mjs';
import * as kv from './kv.mjs';
import * as J from './jobs.mjs';
import * as ACC from './accounts.mjs';
import { parts } from './calendar.mjs';
import LOGO from './logo-png.mjs';
import { business, pdfLib } from './pdf.mjs';
import * as PLAN from './plan.mjs';
import * as PGM from './programs.mjs';
import * as RAID from './raid.mjs';
import { crRecords } from './plan-intel.mjs';
import * as INV from './inventory.mjs';
import * as SUB from './subbies.mjs';
import { regionOf } from './sydney-regions.mjs';
import * as CU from './customers.mjs';
import { statsFor } from './admin-cust.mjs';
import { llmSetup, llmJson, usage, usageToday, tokCap, checkLimit, ping } from './ai.mjs';
import { seesMoney } from './users.mjs';
export { usageToday };

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const out = (status, body) => new Response(JSON.stringify(body), { status, headers: H });
const bad = (msg, status = 400) => out(status, { error: msg });
const d10 = (ms) => { if (!ms) return ''; const p = parts(ms); return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ---------- v51: keys ----------
// Every table starts with its own key (primary key: one value per row), named after the table: customer_id, job_id,
// quote_id, invoice_id, stock_id, supplier_id, subcontractor_id ... A column pointing at another table (foreign key) has
// that table's key name, so joins and unions line up: inventory.supplier_id = suppliers.supplier_id, stock_moves.stock_id
// = inventory.stock_id, plan_tasks.job_id = jobs.job_id. The older columns (id, core, item_id, job, sub_id) stay for saved reports.
const cnt = () => { const m = {}; return (k) => (m[k] = (m[k] || 0) + 1); };
export const KEYS = {
  customers: { pk: 'customer_id', cols: { customer_id: (r) => r.id } },
  jobs: { pk: 'job_id', cols: { job_id: (r) => r.core, customer_id: (r) => r.customer }, fk: { customer_id: 'customers' } },
  projects: { pk: 'project_id', cols: { project_id: (r) => r.job, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  programs: { pk: 'program_id', cols: { program_id: (r) => r.program } },
  dependencies: { pk: 'dependency_id', cols: { dependency_id: (r) => r.id } },
  change_records: { pk: 'record_id', cols: { record_id: (r) => r.record_id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  quotes: { pk: 'quote_id', cols: { quote_id: (r) => r.id, job_id: (r) => r.job, customer_id: (r, x) => x.custOfJob[r.job] || '' }, fk: { job_id: 'jobs', customer_id: 'customers', invoice_id: 'invoices' } },
  invoices: { pk: 'invoice_id', cols: { invoice_id: (r) => r.id, job_id: (r) => r.job, customer_id: (r, x) => x.custOfJob[r.job] || '', quote_id: (r) => r.from_quote || '' }, fk: { job_id: 'jobs', customer_id: 'customers', quote_id: 'quotes' } },
  items: { pk: 'line_id', cols: { line_id: (r) => r.doc_id + '/' + r.line, quote_id: (r) => (/^q/i.test(r.doc_type) ? r.doc_id : ''), invoice_id: (r) => (/^i/i.test(r.doc_type) ? r.doc_id : '') }, fk: { quote_id: 'quotes', invoice_id: 'invoices' } },
  payments: { pk: 'payment_id', cols: { payment_id: (r, x) => r.invoice_id + '/' + x.n(r.invoice_id) }, fk: { invoice_id: 'invoices' } },
  expenses: { pk: 'expense_id', cols: { expense_id: (r) => r.id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  reminders: { pk: 'reminder_id', cols: { reminder_id: (r) => r.id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  visits: { pk: 'date', cols: {} },
  plan_tasks: { pk: 'task_id', cols: { task_id: (r) => r._id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  plan_subtasks: { pk: 'subtask_id', cols: { subtask_id: (r) => r._id, task_id: (r) => r._parent, job_id: (r) => r.job }, fk: { task_id: 'plan_tasks', job_id: 'jobs' } },
  plan_risks: { pk: 'risk_id', cols: { risk_id: (r) => r._id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  plan_issues: { pk: 'issue_id', cols: { issue_id: (r) => r._id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  raid_log: { pk: 'raid_id', cols: { raid_id: (r) => r._id, job_id: (r) => r.job }, fk: { job_id: 'jobs' } },
  plan_contracts: { pk: 'contract_id', cols: { contract_id: (r) => r._id, job_id: (r) => r.job, subcontractor_id: (r) => r.sub_id }, fk: { job_id: 'jobs', subcontractor_id: 'subcontractors' } },
  plan_stakeholders: { pk: 'stakeholder_id', cols: { stakeholder_id: (r) => r._id, job_id: (r) => r.job, subcontractor_id: (r) => r.sub_id }, fk: { job_id: 'jobs', subcontractor_id: 'subcontractors' } },
  inventory: { pk: 'stock_id', cols: { stock_id: (r) => r.id }, fk: { supplier_id: 'suppliers' } },
  suppliers: { pk: 'supplier_id', cols: { supplier_id: (r) => r.id } },
  supplier_prices: { pk: 'price_id', cols: { price_id: (r, x) => r.item_id + '/' + r.supplier_id + '/' + x.n(r.item_id + '/' + r.supplier_id), stock_id: (r) => r.item_id }, fk: { stock_id: 'inventory', supplier_id: 'suppliers' } },
  stock_moves: { pk: 'move_id', cols: { move_id: (r, x) => r.item_id + '/' + x.n(r.item_id), stock_id: (r) => r.item_id, job_id: (r) => r.job }, fk: { stock_id: 'inventory', job_id: 'jobs' } },
  subcontractors: { pk: 'subcontractor_id', cols: { subcontractor_id: (r) => r.id } },
  sub_trades: { pk: 'trade', cols: {} }
};
function withKeys(all, ctx) {
  for (const [t, K] of Object.entries(KEYS)) {
    const x = { ...ctx, n: cnt() };
    all[t] = (all[t] || []).map((r) => {
      const k = {}; for (const [c, f] of Object.entries(K.cols)) k[c] = f(r, x) ?? '';
      const o = { ...k, ...r }; delete o._id; delete o._parent; return o;
    });
  }
  return all;
}

// ---------- the tables (one row per record, plain columns) ----------
export const SCHEMA = {
  customers: ['id', 'name', 'phone', 'email', 'suburb', 'enquiries', 'confirmed_jobs', 'lost_jobs', 'open_quotes', 'open_jobs', 'quoted_value', 'total_value', 'paid_total', 'owed',
    'first_contact', 'first_month', 'last_contact', 'days_since_contact', 'repeat_customer', 'main_source', 'last_stage', 'tags'],
  projects: ['job', 'project_ref', 'project_name', 'client', 'program', 'project_manager', 'project_sponsor', 'location', 'city', 'state', 'country', 'country_code', 'postcode', 'phase', 'health', 'pct_complete', 'tasks_done', 'tasks_total', 'late_tasks', 'budget', 'planned_value', 'earned_value', 'actual_cost',
    'approved_budget', 'cost_vs_budget', 'contract_type', 'contract_value', 'contract_from', 'forecast_profit', 'profit_margin_pct', 'baseline_finish', 'days_late', 'forecast_days_late', 'delayed_days',
    'billed', 'invoices_count', 'invoiced', 'billed_pct', 'received', 'owed', 'milestones_done_not_billed', 'not_billed_value', 'billing_status',
    'milestones_past_billing_date', 'billing_overdue_days', 'unbilled_past_due_value', 'invoices_overdue_count', 'invoices_overdue_amount', 'oldest_invoice_overdue_days',
    'spi', 'cpi', 'forecast_cost', 'start', 'finish', 'forecast_finish', 'open_risks', 'high_risks', 'open_issues', 'has_plan', 'created'],
  programs: ['program', 'status', 'manager', 'sponsor', 'objective', 'projects', 'at_risk', 'watch', 'on_track', 'pct_complete', 'budget', 'planned_value', 'earned_value', 'actual_cost', 'spi', 'cpi', 'start', 'forecast_finish', 'target_finish', 'dependencies', 'dependency_problems'],
  change_records: ['record_id', 'job', 'project', 'program', 'cr', 'title', 'decision', 'approved_by', 'role', 'signed', 'decided', 'finish_before', 'finish_after', 'budget_before', 'budget_after', 'days', 'cost', 'applied_directly', 'status', 'note', 'pdf_kept', 'recorded_by'],
  dependencies: ['id', 'from_project', 'from_program', 'to_project', 'to_program', 'type', 'lag_days', 'status', 'buffer_days', 'cross_program', 'explanation', 'note'],
  jobs: ['ref', 'core', 'customer', 'stage', 'name', 'phone', 'email', 'suburb', 'service', 'program', 'trade', 'source', 'best_time', 'created', 'created_month', 'quote_inc', 'invoice_inc',
    'called_date', 'quoted_date', 'won_date', 'completed_date', 'invoiced_date', 'paid_date', 'lost_date', 'lost_reason', 'photos', 'notes'],
  quotes: ['id', 'job', 'customer', 'status', 'issued', 'issued_month', 'valid_until', 'ex', 'gst', 'inc', 'invoice_id'],
  invoices: ['id', 'job', 'customer', 'status', 'issued', 'issued_month', 'due', 'ex', 'gst', 'inc', 'paid', 'balance', 'days_overdue', 'from_quote'],
  items: ['doc_id', 'doc_type', 'line', 'description', 'qty', 'price', 'gst_free', 'ex', 'gst', 'inc'],
  payments: ['invoice_id', 'customer', 'date', 'month', 'amount', 'gst', 'method', 'reference'],
  expenses: ['id', 'date', 'month', 'supplier', 'description', 'category', 'job', 'ex', 'gst', 'inc', 'has_receipt'],
  reminders: ['id', 'due', 'date', 'text', 'job'],
  visits: ['date', 'month', 'visits'],
  plan_tasks: ['job', 'plan_name', 'task', 'resource', 'lead', 'status', 'start', 'finish', 'days', 'qty', 'unit', 'unit_cost', 'planned_cost', 'actual_cost', 'pct_complete', 'done', 'late'],
  plan_subtasks: ['job', 'plan_name', 'task', 'subtask', 'owner', 'start', 'finish', 'days', 'status', 'done', 'late'],
  plan_risks: ['job', 'plan_name', 'risk', 'probability', 'impact', 'score', 'response', 'owner', 'status', 'review'],
  plan_issues: ['job', 'plan_name', 'issue', 'priority', 'owner', 'raised', 'due', 'status'],
  raid_log: ['job', 'plan_name', 'type', 'ref', 'title', 'owner', 'date', 'status', 'is_open', 'rag', 'score', 'priority', 'impact', 'depends_on', 'dependency_kind'],
  plan_stakeholders: ['job', 'plan_name', 'person', 'role', 'raci', 'raci_meaning', 'sub_id', 'phone', 'email'],
  plan_contracts: ['job', 'plan_name', 'type', 'party', 'document', 'uploaded'],
  inventory: ['id', 'item', 'sku', 'category', 'unit', 'location', 'on_hand', 'allocated', 'available', 'on_order', 'reorder_level', 'reorder_qty', 'low', 'unit_price', 'price_supplier', 'stock_value',
    'supplier_id', 'supplier_contact', 'supplier_phone', 'supplier_email', 'supplier_terms', 'reorder_needed'],
  suppliers: ['id', 'supplier', 'contact', 'phone', 'email', 'categories', 'terms', 'items_quoted'],
  supplier_prices: ['item_id', 'item', 'supplier_id', 'supplier', 'price_ex', 'pack_size', 'quote_ref', 'quoted', 'valid_until', 'expired', 'preferred'],
  stock_moves: ['item_id', 'item', 'date', 'month', 'kind', 'qty', 'reason', 'job'],
  subcontractors: ['id', 'business', 'contact', 'trade', 'other_trades', 'phone', 'email', 'suburb', 'postcode', 'region', 'western_sydney', 'areas_covered', 'status', 'preference_rank', 'rating',
    'hourly_rate', 'callout_fee', 'after_hours_rate', 'payment_terms', 'availability', 'licence_no', 'licence_class', 'licence_expiry', 'licence_state', 'insurer', 'pl_policy', 'pl_cover', 'pl_expiry', 'pl_state',
    'wc_policy', 'wc_expiry', 'wc_state', 'sole_trader', 'white_card', 'swms', 'compliance', 'problems', 'any_expired', 'last_used', 'days_since_used', 'archived'],
  // 🌿 ESG & Sustainability: one row per reporting entity (company), and its credits, avoided emissions, CBAM goods and sticky notes
  esg_reports: ['report_id', 'company', 'industry', 'country', 'reporting_year', 'standards', 'esg_score', 'environment_score', 'social_score', 'governance_score', 'report_readiness_pct', 'scope1_t', 'scope2_location_t', 'scope2_market_t', 'scope3_t', 'total_t',
    'renewable_pct', 'women_pct', 'ltifr', 'independent_directors_pct', 'sbti_target', 'reduction_target_pct', 'target_year', 'net_zero_year', 'iso14001', 'iso45001', 'iso27001', 'iso9001', 'avoided_t', 'credits_retired_t', 'high_quality_credits_pct', 'cbam_goods', 'open_notes', 'urgent_notes', 'updated'],
  esg_credits: ['report_id', 'company', 'project', 'credit_type', 'standard', 'registry', 'vintage', 'tonnes', 'use_of_credit', 'ccp_label', 'corresponding_adjustment', 'quality_pct', 'integrity_flags', 'cost'],
  esg_avoided: ['report_id', 'company', 'solution', 'category', 'baseline', 'tonnes', 'attribution_pct', 'status', 'verification'],
  esg_cbam: ['report_id', 'company', 'market', 'goods', 'cn_code', 'destination', 'tonnes', 'embedded_t', 'liable_t', 'cbam_cost', 'currency'],
  esg_notes: ['report_id', 'company', 'section', 'urgency', 'note', 'written_by', 'written', 'due', 'done', 'done_by'],
  sub_trades: ['trade', 'licence_needed', 'subbies', 'preferred', 'approved', 'all_papers_ok', 'with_expired', 'avg_rating', 'avg_hourly_rate', 'cheapest_hourly_rate']
};
for (const [tb, K] of Object.entries(KEYS)) {   // key columns first: own key, then keys of other tables
  const ks = [K.pk, ...Object.keys(K.cols).filter((c) => c !== K.pk), ...Object.keys(K.fk || {}).filter((c) => c !== K.pk && !(c in K.cols))];
  SCHEMA[tb] = [...new Set([...ks, ...SCHEMA[tb]])];
}
export const DESCRIBE = {
  esg_reports: 'ESG & Sustainability: one row per company report with its E, S and G scores, readiness, Scope 1, 2 and 3 emissions, targets and certifications',
  esg_credits: 'Carbon credits retired or held, per ESG report, with their integrity checks', esg_avoided: 'Avoided emissions (solutions that cut other people\'s emissions), per ESG report',
  esg_cbam: 'Goods exported into the EU or UK CBAM, per ESG report', esg_notes: 'Sticky notes left on ESG report sections',
  projects: 'Start here. One row per project with its program, PMBOK phase, health (RAG), % complete, budget, earned value, SPI/CPI, dates, late tasks, risks and issues',
  customers: 'One row per customer (same phone + email = same customer) with their job counts and values', jobs: 'Every enquiry and job (pipeline stage, customer, suburb, trade, values)', quotes: 'Quotes (status, totals ex/inc GST)', invoices: 'Tax invoices (paid, balance, days overdue)',
  items: 'Line items of quotes and invoices', plan_tasks: 'Project plan tasks (dates, costs, % complete)', plan_risks: 'Risk registers of all plans', plan_issues: 'Issue logs of all plans', raid_log: 'The RAID log of every project: risks, assumptions, issues and dependencies (outside ones and links to other projects) in one table, each with a RAG status (red, amber, green, grey = closed). date is the review, check, due or needed-by date', plan_subtasks: 'Sub-tasks inside plan tasks (no costs; costs stay on the task)', plan_stakeholders: 'Stakeholders (RACI) on each project plan, including the subbies working on it', plan_contracts: 'Contracts uploaded on each project: customer, sub-contractor, supply, consultant', sub_trades: 'Every trade category (also ones with no subbies yet) with how many subbies, preferred, compliant, average rating and rates', subcontractors: 'Sub-contractors (subbies): trade, where they are, status, rating, rates, licence and insurance with expiry and whether expired', inventory: 'Stock items (on hand, set aside for jobs, re-order level)', suppliers: 'Suppliers', supplier_prices: 'Supplier quotes per stock item', stock_moves: 'Stock in and out', payments: 'Payments received', expenses: 'Expenses and receipts', reminders: 'Call-backs and follow-ups', visits: 'Website visitors per day'
};

export async function tables() {
  const now = Date.now();
  const jobs = [];
  const [jobRecs, data, remList, visitRec, planList, stock, alloc] = await Promise.all([
    kv.values('job:'), ACC.allDocs(), J.reminders(),
    import('./storage.mjs').then(({ getStore }) => getStore({ name: 'mbs-visits' })).then((st) => st.get('count', { type: 'json' })).catch(() => null),
    PLAN.list(), INV.full().catch(() => ({ items: [], suppliers: [] })), INV.allocations().catch(() => ({}))]);
  const subRecs = await kv.values('sub:').catch(() => []);
  for (const j of jobRecs) {
    if (!j) continue;
    jobs.push({ ref: J.refFor(j), core: j.core, customer: '', stage: j.stage, name: j.name || '', phone: j.phone || '', email: j.email || '', suburb: j.suburb || '', service: j.service || '', program: j.program || '',
      trade: j.trade || (j.core || '')[0] || '', source: j.source || '', best_time: j.best_time || '', created: d10(j.created), created_month: d10(j.created).slice(0, 7),
      quote_inc: j.quote ? r2(j.quote.amount) : null, invoice_inc: j.invoice ? r2(j.invoice.amount) : null,
      called_date: d10(j.called_at), quoted_date: d10(j.quoted_at), won_date: d10(j.won_at), completed_date: d10(j.completed_at), invoiced_date: d10(j.invoiced_at),
      paid_date: d10(j.paid_at), lost_date: d10(j.lost_at), lost_reason: j.lost_reason || '', photos: (j.photos || []).length, notes: (j.notes || []).length });
  }
  // customers (linked automatically from enquiries)
  let cd = await CU.get().catch(() => null);
  if (cd && !cd.built) cd = await CU.rebuild(jobRecs.filter(Boolean)).catch(() => cd);
  const byCore = Object.fromEntries(jobRecs.filter(Boolean).map((j) => [j.core, j])), custOf = {};
  const customers = Object.values((cd && cd.list) || {}).map((c) => {
    c.jobs.forEach((k) => { custOf[k] = c.id; });
    const st = statsFor(c, byCore), src = Object.entries(st.sources).sort((a, b) => b[1] - a[1])[0];
    return { id: c.id, name: c.name || '', phone: c.phone || '', email: c.email || '', suburb: c.suburb || '', enquiries: st.enquiries, confirmed_jobs: st.confirmed, lost_jobs: st.lost,
      open_quotes: st.openQuotes, open_jobs: st.open, quoted_value: st.quotedValue, total_value: st.value, paid_total: st.paid, owed: st.owed, first_contact: d10(st.first), first_month: d10(st.first).slice(0, 7),
      last_contact: d10(st.last), days_since_contact: st.last ? Math.floor((now - st.last) / 86400000) : null, repeat_customer: st.enquiries > 1, main_source: src ? src[0] : '', last_stage: st.lastStage, tags: (c.tags || []).join(', ') };
  }).filter((c) => c.enquiries > 0);
  for (const r of jobs) r.customer = custOf[r.core] || '';
  const quotes = data.quotes.map((q) => ({ id: q.id, job: q.core || '', customer: q.customer.name, status: ACC.effectiveStatus(q, now), issued: q.issued, issued_month: (q.issued || '').slice(0, 7),
    valid_until: q.validUntil || '', ex: q.totals.ex, gst: q.totals.gst, inc: q.totals.inc, invoice_id: q.invoiceId || '' }));
  const invoices = data.invoices.map((i) => {
    const bal = r2(i.totals.inc - (i.paid || 0)), late = i.due && ['sent', 'part-paid'].includes(i.status) ? Math.max(0, Math.floor((now - ACC.ymdToMs(i.due, true)) / 86400000)) : 0;
    return { id: i.id, job: i.core || '', customer: i.customer.name, status: ACC.effectiveStatus(i, now), issued: i.issued, issued_month: (i.issued || '').slice(0, 7), due: i.due || '',
      ex: i.totals.ex, gst: i.totals.gst, inc: i.totals.inc, paid: r2(i.paid || 0), balance: i.status === 'void' ? 0 : bal, days_overdue: late, from_quote: i.fromQuote || '' };
  });
  const items = [];
  for (const d of [...data.quotes, ...data.invoices]) ACC.calc(d.items || [], d.pricesInc).lines.forEach((l, n) => items.push({ doc_id: d.id, doc_type: d.type, line: n + 1,
    description: l.desc, qty: l.qty, price: l.price, gst_free: !l.gst, ex: l.ex, gst: l.gstAmt, inc: l.inc }));
  const payments = [];
  for (const i of data.invoices) for (const p of i.payments || []) payments.push({ invoice_id: i.id, customer: i.customer.name, date: p.date, month: (p.date || '').slice(0, 7), amount: p.amount,
    gst: i.totals.inc ? r2(p.amount * i.totals.gst / i.totals.inc) : 0, method: p.method, reference: p.ref || '' });
  const expenses = data.expenses.map((e) => ({ id: e.id, date: e.date, month: (e.date || '').slice(0, 7), supplier: e.supplier, description: e.desc, category: e.category, job: e.core || '',
    ex: e.ex, gst: e.gst, inc: e.inc, has_receipt: !!e.receipt }));
  const reminders = remList.map((r) => ({ id: r.id, due: new Date(r.at).toISOString(), date: d10(r.at), text: r.text, job: r.core || '' }));
  let visits = [];
  try {
    const v = visitRec;
    visits = Object.entries((v && v.days) || {}).map(([date, n]) => ({ date, month: date.slice(0, 7), visits: n })).sort((a, b) => (a.date > b.date ? 1 : -1));
  } catch {}
  const raid_log = [], plan_tasks = [], plan_risks = [], plan_issues = [], plan_subtasks = [], plan_stakeholders = [], plan_contracts = [];
  const todayS = d10(now);
  for (const p of planList) {
    PLAN.schedule(p);
    const STN = { todo: 'To do', doing: 'In progress', review: 'In review / QA', done: 'Done' };
    for (const t of p.tasks) plan_tasks.push({ _id: p.core + '/' + t.id, job: p.core, plan_name: p.name, task: t.name, resource: t.resource || '', lead: t.lead || '', status: STN[t.status] || (t.pct >= 100 ? 'Done' : t.pct > 0 ? 'In progress' : 'To do'), start: t.es, finish: t.ef, days: t.dur, qty: t.qty, unit: t.unit,
      unit_cost: t.rate, planned_cost: PLAN.taskCost(t), actual_cost: t.actual, pct_complete: t.pct, done: t.pct >= 100, late: t.pct < 100 && t.ef < todayS });
    for (const t of p.tasks) for (const x of t.subs || []) {
      const A = PLAN.allDays(p), es = t.es ? (x.off ? PLAN.addWork(t.es, x.off, A) : t.es) : '', ef = es ? (x.dur > 1 ? PLAN.addWork(es, x.dur - 1, A) : es) : '';
      plan_subtasks.push({ _id: p.core + '/' + t.id + '/' + (x.id || t.subs.indexOf(x) + 1), _parent: p.core + '/' + t.id, job: p.core, plan_name: p.name, task: t.name, subtask: x.name, owner: x.owner || '', start: es, finish: ef, days: x.dur, status: STN[x.status] || 'To do', done: x.status === 'done', late: x.status !== 'done' && !!ef && ef < todayS });
    }
    for (const r of p.risks || []) plan_risks.push({ _id: p.core + '/' + r.id, job: p.core, plan_name: p.name, risk: r.title, probability: r.p, impact: r.i, score: r.p * r.i, response: r.response, owner: r.owner, status: r.status, review: r.review });
    for (const x of p.stakeholders || []) plan_stakeholders.push({ _id: p.core + '/' + x.id, job: p.core, plan_name: p.name, person: x.name, role: x.role, raci: x.raci, raci_meaning: { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' }[x.raci] || '', sub_id: x.sub || '', phone: x.phone || '', email: x.email || '' });
    const dn = (p.contracts || []).length ? Object.fromEntries((((await kv.get('pdocs:' + p.core)) || {}).docs || []).map((d) => [d.id, d.name])) : {};
    for (const c of p.contracts || []) plan_contracts.push({ _id: p.core + '/' + c.id, job: p.core, plan_name: p.name, type: c.type, party: c.party, sub_id: c.type === 'Sub-contractor' ? c.partyRef : '',
      document: dn[(c.docs || [])[0]] || '', uploaded: d10(c.at) });   // v53
    for (const x of RAID.items(p, todayS)) raid_log.push({ _id: p.core + '/' + x.id, job: p.core, plan_name: p.name, type: RAID.TYPES[x.type], ref: x.ref, title: x.title, owner: x.owner || '', date: x.date || '', status: x.status, is_open: !!x.open, rag: x.rag, score: x.score || null, priority: x.priority || '', impact: x.impact || '', depends_on: x.party || '', dependency_kind: x.kind || '' });
    for (const x of p.issues || []) plan_issues.push({ _id: p.core + '/' + x.id, job: p.core, plan_name: p.name, issue: x.title, priority: x.priority, owner: x.owner, raised: x.raised, due: x.due, status: x.status });
  }
  const supName = Object.fromEntries(stock.suppliers.map((x) => [x.id, x.name])), supRec = Object.fromEntries(stock.suppliers.map((x) => [x.id, x]));
  const inventory = [], supplier_prices = [], stock_moves = [];
  for (const it of stock.items) {
    if (it.archived) continue;
    const b = INV.bestPrice(it), al = (alloc[it.id] || {}).qty || 0, av = Math.round(((it.onHand || 0) - al) * 1000) / 1000, oo = it.onOrder && it.onOrder.qty > 0 ? it.onOrder.qty : 0;
    inventory.push({ id: it.id, item: it.name, sku: it.sku || '', category: it.category || '', unit: it.unit, location: it.location || '', on_hand: it.onHand || 0, allocated: al, available: av, on_order: oo,
      reorder_level: it.reorderLevel || 0, reorder_qty: it.reorderQty || 0, low: (it.reorderLevel || 0) > 0 && av + oo <= it.reorderLevel, unit_price: b.price, price_supplier: supName[b.supplier] || '', stock_value: r2((it.onHand || 0) * b.price),
      // v51: who to order from, right on the item (no join needed): the preferred supplier, or the one with the best current price
      supplier_id: b.supplier || '', supplier_contact: (supRec[b.supplier] || {}).contact || '', supplier_phone: (supRec[b.supplier] || {}).phone || '', supplier_email: (supRec[b.supplier] || {}).email || '',
      supplier_terms: (supRec[b.supplier] || {}).terms || '', reorder_needed: Math.max(0, r2((it.reorderLevel || 0) + (it.reorderQty || 0) - av - oo)) });
    for (const p of it.prices || []) supplier_prices.push({ item_id: it.id, item: it.name, supplier_id: p.supplier, supplier: supName[p.supplier] || '', price_ex: p.price, pack_size: p.packSize || 0, quote_ref: p.ref || '',
      quoted: p.quoted || '', valid_until: p.validUntil || '', expired: !!(p.validUntil && p.validUntil < d10(now)), preferred: p.supplier === it.preferred });
    for (const m of it.moves || []) if (m.qty) stock_moves.push({ item_id: it.id, item: it.name, date: d10(m.at), month: d10(m.at).slice(0, 7), kind: m.kind, qty: m.qty, reason: m.reason || '', job: m.job || '' });
  }
  const suppliers = stock.suppliers.filter((x) => !x.archived).map((x) => ({ id: x.id, supplier: x.name, contact: x.contact || '', phone: x.phone || '', email: x.email || '', categories: x.categories || '', terms: x.terms || '',
    items_quoted: stock.items.filter((i) => (i.prices || []).some((p) => p.supplier === x.id)).length }));
  // v49: sub-contractors, with their region and the state of each licence / insurance (ok, due = within 30 days, expired, missing, n/a)
  const TN = Object.fromEntries(SUB.TRADES.map((t) => [t[0], t[1]])), RANK = { Preferred: 1, Approved: 2, 'On trial': 3, 'On hold': 4, 'Do not use': 5 };
  const subcontractors = subRecs.filter(Boolean).map((s) => {
    const c = SUB.compliance(s, d10(now)), g = regionOf(s.suburb || s.address), L = s.licence || {}, I = s.insurance || {}, W = s.workersComp || {};
    return { id: s.id, business: s.business || '', contact: s.contact || '', trade: TN[s.trade] || s.trade || '', other_trades: (s.trades || []).map((t) => TN[t] || t).join(', '),
      phone: s.phone || '', email: s.email || '', suburb: s.suburb || '', postcode: g.postcode, region: g.region, western_sydney: g.western, areas_covered: s.areas || '',
      status: s.status || '', preference_rank: RANK[s.status] || 3, rating: s.rating || 0, hourly_rate: s.rate || 0, callout_fee: s.callout || 0, after_hours_rate: s.afterHours || 0,
      payment_terms: s.terms || '', availability: s.availability || '', licence_no: L.number || '', licence_class: L.class || '', licence_expiry: L.expiry || '', licence_state: c.lic,
      insurer: I.insurer || '', pl_policy: I.policy || '', pl_cover: I.cover || 0, pl_expiry: I.expiry || '', pl_state: c.pl, wc_policy: W.policy || '', wc_expiry: W.expiry || '', wc_state: c.wc,
      sole_trader: !!W.soleTrader, white_card: !!s.whiteCard, swms: !!s.swms, compliance: c.worst, problems: c.problems.join('; '), any_expired: c.worst === 'expired', last_used: s.lastUsed || '',
      days_since_used: s.lastUsed ? Math.round((Date.parse(d10(now)) - Date.parse(s.lastUsed)) / 864e5) : null, archived: !!s.archived, _keys: [s.trade].concat(s.trades || []) };
  }).sort((a, b) => a.preference_rank - b.preference_rank || b.rating - a.rating || a.business.localeCompare(b.business));
  // every trade, with or without subbies (counts include subbies who list it as another trade)
  const sub_trades = SUB.TRADES.map(([k, nm, lic]) => {
    const L = subcontractors.filter((s) => !s.archived && s.status !== 'Do not use' && s._keys.includes(k)), rated = L.filter((s) => s.rating), rates = L.map((s) => s.hourly_rate).filter((x) => x > 0);
    return { trade: nm, licence_needed: lic, subbies: L.length, preferred: L.filter((s) => s.status === 'Preferred').length, approved: L.filter((s) => s.status === 'Approved').length,
      all_papers_ok: L.filter((s) => s.compliance === 'ok').length, with_expired: L.filter((s) => s.any_expired).length,
      avg_rating: rated.length ? r2(rated.reduce((a, s) => a + s.rating, 0) / rated.length) : null, avg_hourly_rate: rates.length ? r2(rates.reduce((a, x) => a + x, 0) / rates.length) : null, cheapest_hourly_rate: rates.length ? Math.min(...rates) : null };
  });
  subcontractors.forEach((s) => { delete s._keys; });
  const HN = { red: 'At risk', amber: 'Watch', green: 'On track', grey: 'Not planned' };
  // 💹 money as the CEO view and Finance show it (one calculation): approved budget, cost vs budget, contract value (confirmed, quoted or estimated from the Costing) and profit by contract type
  const CEOV = await (await import('./ceo.mjs')).ceoView(d10(now)).catch(() => null), ceoBy = Object.fromEntries((((CEOV && (CEOV.view || CEOV)) || {}).rows || []).map((r) => [r.core, r]));
  const dd = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : null);
  // 💵 billing as Finance shows it: what has been invoiced (ex GST), how much of the contract, paid, owed, and the milestones done but not billed yet
  const FIN = await (await import('./billing.mjs')).finance(d10(now), null).catch((e) => { console.error('AI query billing: ' + e.message); return null; }), finBy = Object.fromEntries(((FIN && FIN.projects) || []).map((x) => [x.core, x]));
  const invN = {}, invOver = {}; for (const iv of ((FIN && FIN.invoices) || [])) if (iv && iv.core && iv.status !== 'draft') { invN[iv.core] = (invN[iv.core] || 0) + 1;
    if (iv.late > 0 && iv.balance > 0.005) { const o = invOver[iv.core] = invOver[iv.core] || { n: 0, amt: 0, days: 0 }; o.n++; o.amt += iv.balance; o.days = Math.max(o.days, iv.late); } }
  // ⏰ billing dates passed: milestones whose agreed (baseline) billing date has gone by without an invoice, done or not
  const msPast = {}; for (const x of ((FIN && FIN.projects) || [])) if (x.past && x.past.n) msPast[x.core] = { n: x.past.n, days: x.past.days, amt: x.past.amount };
  const bill2 = (c) => { const f = finBy[c.core]; if (!f) return { billed: false, invoices_count: 0, invoiced: 0, billed_pct: 0, received: 0, owed: 0, milestones_done_not_billed: 0, not_billed_value: 0, billing_status: 'no billing (internal or no plan)', milestones_past_billing_date: 0, billing_overdue_days: 0, unbilled_past_due_value: 0, invoices_overdue_count: 0, invoices_overdue_amount: 0, oldest_invoice_overdue_days: 0 };
    return { billed: (f.invoiced || 0) > 0.004, invoices_count: invN[c.core] || 0, invoiced: r2(f.invoiced || 0), billed_pct: (f.stand && f.stand.billedPct) || 0, received: r2(f.received || 0), owed: r2(f.owed || 0),
      milestones_done_not_billed: f.readyN || 0, not_billed_value: r2((f.stand && f.stand.unbilled) || 0), billing_status: (f.stand && f.stand.status && f.stand.status.text) || '',
      milestones_past_billing_date: (msPast[c.core] || {}).n || 0, billing_overdue_days: (msPast[c.core] || {}).days || 0, unbilled_past_due_value: r2((msPast[c.core] || {}).amt || 0),
      invoices_overdue_count: (invOver[c.core] || {}).n || 0, invoices_overdue_amount: r2((invOver[c.core] || {}).amt || 0), oldest_invoice_overdue_days: (invOver[c.core] || {}).days || 0 }; };
  const money2 = (c) => { const r = ceoBy[c.core]; if (!r) return { approved_budget: null, cost_vs_budget: null, contract_type: '', contract_value: null, contract_from: '', forecast_profit: null, profit_margin_pct: null, baseline_finish: '', days_late: null, forecast_days_late: null, delayed_days: null };
    // ⏱ delay as the CEO view shows it: days the finish is past the baseline (days_late); where there is no baseline, how far the forecast finish (at today's pace) is past the planned finish
    const late = r.baseline ? (r.slip || 0) : null, fl = dd(r.finish, r.forecast), delayed = late != null ? late : fl;
    return { approved_budget: r.budget == null ? null : r2(r.budget), cost_vs_budget: r.vac == null ? null : r2(r.vac), contract_type: r.internal ? 'internal' : r.ctype || 'fixed', contract_value: r.internal ? 0 : r2(r.contract || r.quoted || r.estimate || 0) || null,
      contract_from: r.internal ? 'internal (no contract)' : r.contract ? 'confirmed' : r.quoted ? 'quoted' : r.estimate ? 'estimate' : '', forecast_profit: r.internal || r.profit == null ? null : r2(r.profit), profit_margin_pct: r.margin == null ? null : r.margin,
      baseline_finish: r.baseline || '', days_late: late, forecast_days_late: fl, delayed_days: delayed == null ? null : Math.max(0, delayed) }; };
  // 👤 the project manager and sponsor, as on the CEO view: the plan's charter first, else the project record
  const planBy = Object.fromEntries((planList || []).map((p) => [p.core, p])), jobBy = Object.fromEntries((jobRecs || []).filter(Boolean).map((j) => [j.core, j]));
  // 📍 where each project is: the place set with "Set the location" (country, state, city), else read from the site address
  const WC = await import('./workcal.mjs'), AU = { NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia', SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory' };
  const CN = WC.countries(), cnBy = Object.fromEntries(Object.entries(CN).map(([k, v]) => [v.toLowerCase(), k]));
  const locOf = (core) => {
    const cal = (planBy[core] || {}).cal, site = String((jobBy[core] || {}).suburb || '').trim();
    const jl = (jobBy[core] || {}).loc;   // 📍 the place picked from the list when the project was made (until the plan has its own location)
    if ((!cal || !cal.cc) && jl && jl.cc) { const country = WC.countryName(jl.cc), state = WC.stateName(jl.cc, jl.st) || ''; return { location: jl.place || [jl.town, state, country].filter(Boolean).join(', '), city: jl.town || '', state, country, country_code: jl.cc, postcode: jl.postcode || '' }; }
    if (cal && cal.cc) { const parts = String(cal.place || '').split(',').map((x) => x.trim()).filter(Boolean), country = WC.countryName(cal.cc), state = WC.stateName(cal.cc, cal.st) || '';
      const city = parts.length && parts[0] !== country && parts[0] !== state ? parts[0] : ''; return { location: cal.place || [city, state, country].filter(Boolean).join(', '), city, state, country, country_code: cal.cc, postcode: ((jobBy[core] || {}).loc || {}).postcode || '' }; }
    if (!site) return { location: '', city: '', state: '', country: '', country_code: '', postcode: '' };
    const parts = site.split(',').map((x) => x.trim()).filter(Boolean);
    let cc = '', k = -1; parts.forEach((x, i) => { if (cnBy[x.toLowerCase()]) { cc = cnBy[x.toLowerCase()]; k = i; } });
    const abbr = /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/, auAt = parts.findIndex((x) => abbr.test(x));
    if (!cc && auAt >= 0) cc = 'AU';
    let state = '', city = '';
    if (cc === 'AU' && auAt >= 0) { state = AU[parts[auAt].match(abbr)[1]]; const own = parts[auAt].replace(abbr, '').replace(/\d{4}/, '').trim(); city = own || parts.slice(0, auAt).filter((x) => !/\d/.test(x)).pop() || ''; }
    else { const before = k > 0 ? parts.slice(0, k) : parts; const words = before.filter((x) => !/\d/.test(x)); city = words[0] || ''; state = k >= 2 && words.length >= 2 ? words[words.length - 1] : ''; }
    return { location: site, city, state, country: cc ? CN[cc] || '' : '', country_code: cc, postcode: (site.match(/\b\d{4,6}\b/) || [''])[0] };
  };
  const pmOf = (core) => String(((planBy[core] || {}).charter || {}).manager || (jobBy[core] || {}).manager || ''), spOf = (core) => String((jobBy[core] || {}).sponsor || '');
  const projects = (await PLAN.portfolio(d10(now)).catch(() => [])).map((c) => ({ ...money2(c), ...bill2(c), job: c.core, project_ref: c.ref, project_name: c.name, client: c.client || '', program: c.program || '', project_manager: pmOf(c.core), project_sponsor: spOf(c.core), ...locOf(c.core),
    phase: PLAN.PHASES[c.phase] || c.phase, health: HN[PLAN.healthOf(c)], pct_complete: c.pct || 0, tasks_done: c.done || 0, tasks_total: c.total || 0, late_tasks: c.late || 0,
    budget: r2(c.BAC || 0), planned_value: r2(c.PV || 0), earned_value: r2(c.EV || 0), actual_cost: r2(c.AC || 0), spi: c.SPI == null ? null : c.SPI, cpi: c.CPI == null ? null : c.CPI,
    forecast_cost: c.EAC == null ? null : r2(c.EAC), start: c.start || '', finish: c.finish || '', open_risks: c.openRisks || 0, high_risks: c.highRisks || 0, open_issues: c.openIssues || 0,
    forecast_finish: PGM.forecastFinish(c) || '', has_plan: !!c.hasPlan, created: d10(c.since) }));
  // programs (the top level) and the links between projects
  const cardsAll = await PLAN.portfolio(d10(now)).catch(() => []);
  cardsAll.forEach((c) => { c.health = PLAN.healthOf(c); });
  const cardBy = Object.fromEntries(cardsAll.map((c) => [c.core, c]));
  const TY = { FS: 'finish to start', SS: 'start to start', FF: 'finish to finish' }, DSN = { conflict: 'Clash', risk: 'At risk', unknown: 'No dates', ok: 'OK', done: 'Done' };
  const dependencies = (await PGM.deps().catch(() => [])).filter((d) => cardBy[d.from] && cardBy[d.to]).map((d) => {
    const A = cardBy[d.from], B = cardBy[d.to], st = PGM.depStatus(d, A, B);
    return { id: d.id, from_job: d.from, to_job: d.to, from_project: A.name, from_program: A.program || '', to_project: B.name, to_program: B.program || '', type: TY[d.type] || d.type, lag_days: d.lag || 0,
      status: DSN[st.status] || st.status, buffer_days: st.slack == null ? null : st.slack, cross_program: (A.program || '') !== (B.program || ''), explanation: st.why || '', note: d.note || '' };
  });
  // 🧩 the RAID log also lists each Dependency board link once, on the project that waits (other_job: the project it waits for)
  for (const d of (await PGM.deps().catch(() => [])).filter((x) => cardBy[x.from] && cardBy[x.to])) { const A = cardBy[d.from], B = cardBy[d.to], st = PGM.depStatus(d, A, B);
    raid_log.push({ _id: d.to + '/link/' + d.id, job: d.to, other_job: d.from, plan_name: B.name, type: 'Dependency', ref: 'P' + String(d.id).slice(-3).toUpperCase(), title: `Waits for ${A.name} to ${d.type === 'SS' ? 'start' : 'finish'}`, owner: '', date: '', status: DSN[st.status] || st.status, is_open: st.status !== 'done', rag: RAID.rag('D', { link: st.status }, todayS), score: null, priority: '', impact: '', depends_on: A.name, dependency_kind: 'Project' }); }
  const programs = (await PGM.list().catch(() => [])).map((p) => {
    const L = cardsAll.filter((c) => c.program === p.name), sum = (k) => L.reduce((t, c) => t + (c[k] || 0), 0), BAC = sum('BAC'), EV = sum('EV'), AC = sum('AC'), PV = sum('PV');
    const fin = L.map((c) => PGM.forecastFinish(c)).filter(Boolean).sort(), st = L.map((c) => c.start).filter(Boolean).sort();
    const dl = dependencies.filter((d) => d.from_program === p.name || d.to_program === p.name);
    return { program: p.name, status: PGM.STATUS[p.status] || p.status, manager: p.manager || '', sponsor: p.sponsor || '', objective: p.objective || '', projects: L.length,
      at_risk: L.filter((c) => c.health === 'red').length, watch: L.filter((c) => c.health === 'amber').length, on_track: L.filter((c) => c.health === 'green').length,
      pct_complete: BAC > 0 ? Math.round(L.reduce((t, c) => t + (c.pct || 0) * (c.BAC || 0), 0) / BAC) : 0, budget: r2(BAC), planned_value: r2(PV), earned_value: r2(EV), actual_cost: r2(AC),
      spi: PV > 0 ? Math.round((EV / PV) * 100) / 100 : null, cpi: AC > 0 ? Math.round((EV / AC) * 100) / 100 : null, start: st[0] || '', forecast_finish: fin[fin.length - 1] || '', target_finish: p.finish || '',
      dependencies: dl.length, dependency_problems: dl.filter((d) => d.status === 'Clash' || d.status === 'At risk').length };
  });
  const change_records = (await crRecords().catch(() => [])).map((r) => ({ record_id: r.key, job: r.core, project: (cardBy[r.core] || {}).name || r.project, program: (cardBy[r.core] || {}).program || r.program || '', cr: r.cr, title: r.title,
    decision: r.outcome, approved_by: r.by, role: r.role, signed: !!r.sig, decided: d10(r.at), finish_before: r.f0, finish_after: r.f1, budget_before: r.b0, budget_after: r.b1, days: r.days, cost: r.cost,
    applied_directly: !!r.direct, status: r.status, note: r.note, pdf_kept: !!r.hasPdf, recorded_by: r.recordedBy }));
  const all = { projects, programs, dependencies, change_records, customers, jobs, quotes, invoices, items, payments, expenses, reminders, visits, plan_tasks, plan_subtasks, plan_risks, plan_issues, raid_log, inventory, suppliers, supplier_prices, stock_moves, subcontractors, sub_trades, plan_stakeholders, plan_contracts };
  return withKeys(all, { custOfJob: custOf });
}

// 🌿 the ESG & Sustainability tables: every report, worked out the same way as on its screen
async function esgTables() {
  const E = await import('./esg.mjs'), idx = (await kv.get('esg-index')) || { ents: {} }, ids = Object.keys(idx.ents || {});   // every report, read in batches of 200
  const ents = [], notesAll = [];
  for (let i = 0; i < ids.length; i += 200) { const b = ids.slice(i, i + 200); ents.push(...await kv.getMany(b.map((x) => 'esg:' + x))); notesAll.push(...await kv.getMany(b.map((x) => 'esgnotes:' + x)).catch(() => b.map(() => null))); }
  const SEC = (await import('./esg-notes.mjs')).SEC_NAME, U = { R: 'Urgent', A: 'Semi-urgent', G: 'Fine' }, n0 = (v) => (v == null || v === '' ? null : v);
  const esg_reports = [], esg_credits = [], esg_avoided = [], esg_cbam = [], esg_notes = [];
  ents.forEach((e, k) => {
    if (!e) return; let c; try { c = E.compute(e); } catch { return; }
    const o = e.org || {}, w = e.workforce || {}, b = e.board || {}, cl = e.climate || {}, ce = e.certs || {}, id = e.id, co = o.name || 'Untitled', N = ((notesAll[k] || {}).notes || []);
    esg_reports.push({ report_id: id, company: co, industry: o.industry || '', country: o.country || '', reporting_year: o.year || '', standards: (e.std || []).join(', '), esg_score: c.esg, environment_score: c.env.score, social_score: c.soc.score, governance_score: c.gov.score,
      report_readiness_pct: c.readiness, scope1_t: c.em.s1t, scope2_location_t: c.em.s2loc, scope2_market_t: c.em.s2mkt, scope3_t: c.em.s3t, total_t: c.em.total, renewable_pct: n0((e.resources || {}).renewPct),
      women_pct: n0(c.soc.womenPct), ltifr: n0(w.ltifr), independent_directors_pct: n0(b.indepPct), sbti_target: cl.sbti || '', reduction_target_pct: n0(cl.tgtPct), target_year: cl.tgtYear || '', net_zero_year: cl.netZero || '',
      iso14001: (e.resources || {}).iso14001 || '', iso45001: ce.iso45001 || '', iso27001: ce.iso27001 || '', iso9001: ce.iso9001 || '', avoided_t: c.avoid.total, credits_retired_t: c.avoid.credits, high_quality_credits_pct: n0(c.price.highQualityPct),
      cbam_goods: (c.price.cbam || []).length, open_notes: N.filter((n) => !n.done).length, urgent_notes: N.filter((n) => !n.done && n.c === 'R').length, updated: d10(e.updated) });
    (c.price.credits || []).forEach((x) => esg_credits.push({ report_id: id, company: co, project: x.project || '', credit_type: x.type || '', standard: x.std || '', registry: x.registry || '', vintage: x.vintage || '', tonnes: n0(x.t), use_of_credit: x.use || '', ccp_label: x.ccp || '',
      corresponding_adjustment: x.ca || '', quality_pct: x.quality, integrity_flags: (x.flags || []).join('; '), cost: n0(x.cost) }));
    (c.avoid.items || []).forEach((x) => esg_avoided.push({ report_id: id, company: co, solution: x.name || '', category: x.cat || '', baseline: x.baseline || '', tonnes: n0(x.t), attribution_pct: n0(x.attr), status: x.status || '', verification: x.verify || '' }));
    (c.price.cbam || []).forEach((x) => esg_cbam.push({ report_id: id, company: co, market: x.market, goods: x.good, cn_code: x.cn || '', destination: x.dest || '', tonnes: n0(x.tonnes), embedded_t: n0(x.emb), liable_t: n0(x.liable), cbam_cost: n0(x.cost), currency: x.cur }));
    N.forEach((n) => esg_notes.push({ report_id: id, company: co, section: SEC[n.sec] || n.sec, urgency: U[n.c] || 'Fine', note: n.text, written_by: n.by || '', written: d10(n.at), due: n.due || '', done: !!n.done, done_by: n.doneBy || '' }));
  });
  return { esg_reports, esg_credits, esg_avoided, esg_cbam, esg_notes };
}

// ---------- AI narrative (DeepSeek) ----------
// Contact details never leave MBS: phone, email, address and personal-name columns are removed before the AI sees anything.
const PRIVATE = /phone|email|address|^name$|^contact$|customer|reference/i;
function sample(columns, rows) {
  const keep = columns.filter((c) => !PRIVATE.test(c));
  return { columns: keep, rows: rows.slice(0, 60).map((r) => Object.fromEntries(keep.map((c) => [c, r[c]]))), removed: columns.filter((c) => PRIVATE.test(c)) };
}
function basicSummary(columns, rows) {
  const nums = columns.filter((c) => rows.some((r) => typeof r[c] === 'number'));
  const lines = nums.slice(0, 4).map((c) => { const t = r2(rows.reduce((a, r) => a + (Number(r[c]) || 0), 0)); return `Total ${c.replace(/_/g, ' ')}: ${t.toLocaleString('en-AU')}`; });
  return { summary: `${rows.length} row${rows.length === 1 ? '' : 's'} returned.`, insights: lines, recommendations: [] };
}
export async function narrative({ title, sql, columns, rows, focus }) {
  const key = env('LLM_API_KEY');
  const s = sample(columns, rows);
  if (!key) return { ...basicSummary(columns, rows), ai: false, note: 'AI is not set up (LLM_API_KEY), so this is a basic summary.' };
  const base = env('LLM_BASE_URL', 'https://api.deepseek.com').replace(/\/+$/, '');
  let model = env('LLM_MODEL', 'deepseek-chat'); if (/reasoner|thinking/i.test(model)) model = 'deepseek-chat';
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 9000);   // Netlify allows about 10 seconds
  try {
    const r = await fetch(`${base}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.3, stream: false, max_tokens: 600, response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: langLine() + ' You are a senior PMO analyst for GKH Project Champ (project, program and portfolio management, PMBOK). Explain schedule and cost health with earned value (SPI, CPI) where the data has it. ' +
            'Write a short, plain-English report on the data you are given. Australian spelling, amounts in dollars ($), no country-specific currency. Only state what the data shows; do not invent numbers. ' +
            'Reply as JSON: {"title": string (max 70 chars), "summary": string (2-3 sentences), "insights": [3-5 short bullet strings with specific figures], "recommendations": [1-3 short practical actions]}.' },
          { role: 'user', content: JSON.stringify({ report_title: title, question_or_focus: focus || '', sql, row_count: rows.length, columns: s.columns, rows: s.rows }) }
        ] })
    });
    if (!r.ok) throw new Error('DeepSeek error ' + r.status);
    const j = await r.json();
    const txt = stripThinking(j?.choices?.[0]?.message?.content ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '');
    const o = JSON.parse(txt);
    const list = (x, n) => (Array.isArray(x) ? x : []).map((t) => String(t).slice(0, 300)).filter(Boolean).slice(0, n);
    return { title: String(o.title || title).slice(0, 90), summary: String(o.summary || '').slice(0, 900), insights: list(o.insights, 6), recommendations: list(o.recommendations, 4), ai: true, removed: s.removed };
  } catch (e) {
    return { ...basicSummary(columns, rows), ai: false, note: /abort/i.test(e.message) ? 'The AI took too long, so this is a basic summary. Try again.' : 'The AI could not be reached (' + e.message + '), so this is a basic summary.' };
  } finally { clearTimeout(timer); }
}

// ---------- AI query: a plain-English question -> SQL (the AI writes it) -> run in the browser -> a plain-English answer ----------
// The AI never sees the data rows when writing SQL: only table and column names, the dates for "this month" etc.,
// and short lists of codes (stages, statuses, plan names, suburbs). Phone numbers, emails and names are never sent.
// short notes the AI needs (kept brief to save tokens)
// short notes per table (only the tables a question needs are sent, to keep each AI call small)
const NOTE = {
  esg_reports: 'ESG & Sustainability reports (NOT projects: an ESG project in projects is consulting work; this is the company\'s own ESG data). One row per company (report_id joins the other esg_ tables). Scores 0-100 (esg_score = average of environment, social, governance); report_readiness_pct = how much of the chosen standards the data covers; emissions in tCO2e (total_t = Scope 1 + 2 location + 3); sbti_target Validated|Committed|No; iso* Yes|No|Certified|Working towards it; open_notes = sticky notes not done, urgent_notes = red ones',
  esg_credits: 'one row per carbon credit line: report_id = esg_reports.report_id; credit_type (Avoidance or Removal…), use_of_credit, ccp_label Yes|No|Unknown, quality_pct 100 = no integrity flags, integrity_flags lists the problems', esg_avoided: 'one row per avoided-emissions solution: tonnes = tCO2e avoided a year; status Delivered|Under way|Planned', esg_cbam: 'one row per CBAM good: market EU|UK, embedded_t and liable_t in tCO2e, cbam_cost in currency', esg_notes: 'one row per sticky note on an ESG report; urgency Urgent|Semi-urgent|Fine; done true|false; dates YYYY-MM-DD',
  programs: 'one row per program (the top level; every project belongs to one): roll-up of its projects: health counts, % complete weighted by budget, $ budget/earned/spent, spi/cpi, forecast_finish vs target_finish, dependency_problems; join projects.program = programs.program',
  change_records: 'one row per change control decision kept on record (signed PDF kept): cr CR-001, decision Approved|Rejected|Deferred, approved_by and role (who decided), signed true when a signature was typed, decided date, finish_before/after, budget_before/after, days and cost effect, applied_directly true when applied with Fit to finish-by without a board review; job = jobs.core, join projects.job',
  dependencies: 'links between projects: from_project must happen before to_project (type finish to start|start to start|finish to finish, lag_days); status Clash (plans already clash)|At risk|OK|Done|No dates; buffer_days (negative = late); cross_program true when the two projects are in different programs; explanation in plain English',
  projects: 'start here for project, program and portfolio questions; job = jobs.core = plan_tasks.job; program = group of related projects (blank = none); phase Initiation|Planning|Execution|Monitoring & Evaluation|Closing (PMBOK); health On track|Watch|At risk|Not planned; budget/planned_value/earned_value/actual_cost $; spi/cpi earned value indexes (1 = on plan, under 0.9 = trouble); portfolio = all projects; MONEY: forecast_profit is the profit (or, negative, the loss) on each project = contract_value − forecast cost, worked out by contract_type exactly as on the CEO view and Finance: use it for every profit, loss or margin question and NEVER compute profit from earned_value or actual_cost; contract_from says if the contract value is confirmed, quoted or an estimate from the Costing (say so in the answer); profit_margin_pct = profit ÷ contract value; cost_vs_budget = approved_budget − forecast cost (negative = over budget, which is not the same as a loss); internal projects have no profit. RANKING: for which/highest/lowest/best/worst/top questions return the top 10 ranked (ORDER BY … LIMIT 10), never only one row, so the near candidates show too; DELAY: a project is delayed (late, behind, slipping) by delayed_days = how many days its finish is past its agreed baseline (days_late), or, with no baseline, how far the forecast finish at the current pace is past the planned finish (forecast_days_late); for questions like delayed more than N days use delayed_days > N and list the projects with their delayed_days, highest first; NEVER treat delay as finish < today (a project can be months late long before its finish date); BILLING (as on Finance): billed true when at least one invoice has been raised for the project (invoiced = ex GST total, invoices_count, billed_pct of the contract value); received = paid; owed = invoiced but not paid; milestones_done_not_billed and not_billed_value = work finished that has not been invoiced yet; billing_status in words; for questions on billed or invoiced projects use billed and invoiced from projects (not the jobs stages) and list the projects; PAST BILLING DATES: billing_overdue_days = days since the oldest milestone billing date that passed without an invoice (milestones_past_billing_date of them, worth unbilled_past_due_value); invoices_overdue_count / invoices_overdue_amount / oldest_invoice_overdue_days = invoices sent but not paid by their due date; for projects way past their billing dates rank by billing_overdue_days (and overdue invoices), highest first, and list them; PEOPLE: project_manager and project_sponsor are on projects (no join needed); the manager and sponsor of a program are on programs (JOIN programs g ON g.program = p.program); for who runs a project select project_manager; LOCATION: country, state and city are on projects (from the location set on the plan, else the site address); for questions like how many projects in Australia / Malaysia or in Sydney / Alor Setar use country, state or city with LIKE and group by them; NAMES: always select project_name (and program where useful) so people can read the result; do not select project_id, job or project_ref unless the question asks for the reference, and label any chart by project_name',
  jobs: 'one row per project record: core = id for joins, ref = project number, stage new (Pre-sales)|quoted (Proposal submitted)|won (Awarded)|invoiced (milestone payment invoiced)|paid (Signed off and closed)|lost, created = enquiry date, *_date = date it reached that stage, quote_inc/invoice_inc $ inc GST, name = customer',
  customers: 'id = jobs.customer; enquiries = all their jobs; confirmed_jobs = won or later; total_value = $ inc GST of confirmed jobs; owed = invoiced not paid; repeat_customer true when 2+ enquiries; dates YYYY-MM-DD',
  quotes: 'job = jobs.core; ex/gst/inc $', invoices: 'job = jobs.core; balance = $ owed; ex/gst/inc $', items: 'doc_id = quote or invoice id', payments: 'invoice_id = invoices.id',
  expenses: 'job = jobs.core (blank = overhead); ex/gst/inc $', reminders: 'job = jobs.core', visits: 'website visitors per day',
  plan_tasks: 'one plan per job, job = jobs.core, status To do|In progress|In review / QA|Done, days 0 = milestone, pct_complete 0-100, done/late true|false',
  plan_subtasks: 'steps inside a plan task (task = plan_tasks.task, same job), no costs', plan_risks: 'job = jobs.core', plan_issues: 'job = jobs.core', raid_log: 'job = jobs.core; type is Risk, Assumption, Issue or Dependency',
  inventory: 'one row per stock item; available = on_hand - allocated (set aside by open plan tasks); low = at or below reorder_level; unit_price = preferred or cheapest valid quote ex GST; price_supplier, supplier_contact, supplier_phone, supplier_email = who to order it from (no join needed). "Low", "short supply", "running out", "need to order" = low = true',
  subcontractors: 'one row per subbie (leave out archived = true unless asked). trade is the full name e.g. "Cleaner (builders clean)", "Electrician (sparkie)", "Plumber": match LOWER(trade) LIKE \'%clean%\' OR LOWER(other_trades) LIKE \'%clean%\'. ' +
    'Area: region is one of Hills District|Blacktown|Parramatta & Cumberland|Penrith|Hawkesbury|Fairfield & Liverpool|Campbelltown & Camden|Inner West|North Shore|Northern Beaches|Eastern Suburbs|Sydney CBD|Canterbury-Bankstown|St George & Sutherland|Central Coast|Blue Mountains; ' +
    '"Western Sydney" = (western_sydney = true OR LOWER(areas_covered) LIKE \'%western sydney%\' OR LOWER(areas_covered) LIKE \'%greater sydney%\'). ' +
    'By preference / best first = ORDER BY preference_rank, rating DESC (1 Preferred, 2 Approved, 3 On trial, 4 On hold, 5 Do not use). ' +
    'licence_state, pl_state (public liability insurance), wc_state (workers comp) and compliance are ok|due (expires within 30 days)|expired|missing|n/a; any_expired true when anything has expired. ' +
    'days_since_used = days since last used (null = never). Subbies on a project: JOIN plan_stakeholders ps ON ps.sub_id = subcontractors.id (ps.job = jobs.core). For trades with nobody, counts per trade, average rating or rates use sub_trades. ' +
    'To show licence and insurance and flag expired, list (in this order) business, compliance, problems, trade, suburb, status, rating, licence_no, licence_expiry, licence_state, pl_expiry, pl_state, wc_expiry, wc_state. Dates YYYY-MM-DD',
  sub_trades: 'one row per trade category (33), subbies = active subbies who do it (0 = nobody), licence_needed true when NSW needs a licence for it',
  plan_contracts: 'one row per contract uploaded to a project: type Customer|Sub-contractor|Supply|Consultant, party = who it is with, uploaded = date. What the contracts say is not in this table: ask 🧠 Project Intelligence on the project',
  plan_stakeholders: 'one row per stakeholder on a project plan: job = jobs.core, raci R|A|C|I, sub_id = subcontractors.id when the person is a subbie (blank otherwise)',
  suppliers: 'suppliers', supplier_prices: 'one row per supplier quote for a stock item', stock_moves: 'qty + in / - out; kind in|out|count|plan|order; job = jobs.core'
};
const WORDS = {
  esg_reports: /esg|sustainab|environment|social|governance|carbon|emission|scope|ghg|climate|net zero|sbti|readiness|issb|gri|ifrs|tcfd|csrd|brsr|bursa|iso ?14001|iso ?45001|green|renewable|company|companies|entit/i,
  esg_credits: /credit|offset|retire|verra|gold standard|ccp|vintage|removal/i, esg_avoided: /avoid|scope 4|solution|handprint/i, esg_cbam: /cbam|border|export|eu ets|carbon price|levy/i, esg_notes: /note|sticky|remark|comment/i,
  projects: /project|program|portfolio|phase|initiat|planning|execution|monitor|closing|health|on track|at risk|rag|spi|cpi|earned|budget|overrun|over budget|behind|status|pmo|overall|summary/i,
  programs: /program|portfolio|pmo|overall|sponsor|benefit|roll-?up/i,
  change_records: /change|variation|\bcr\b|cr-\d|approv|sign|decision|reject|defer|baseline|board|ccb/i,
  dependencies: /depend|link|block|wait|clash|conflict|critical|knock-?on|impact|before|after|predecessor|successor|slip|delay/i,
  customers: /customer|client|repeat|loyal|most (orders|jobs)|biggest|spend|lapsed|win back|regular/i,
  quotes: /quot/i, invoices: /invoic|owe|owing|unpaid|overdue|paid|debt|balance|bill/i, items: /line item|items? on (the|a|my) (quote|invoice)/i, payments: /pay|paid|received|income|revenue|cash/i,
  expenses: /expens|spend|spent|cost|receipt|purchase|bought/i, reminders: /remind|follow/i, visits: /visit|traffic|website/i,
  plan_tasks: /plan|project|task|complet|progress|late|schedule|gantt|milestone|lead|resource|finish|behind/i, plan_subtasks: /sub-?task|step/i, plan_risks: /risk/i, plan_issues: /issue|problem/i, raid_log: /raid|assumption|dependenc|depend|risk|issue|red|amber|rag/i,
  subcontractors: /sub-?contract|subb(ie|y|ies)|tradie|sparky|rating|rated|roof|drain|gutter|leak|liability|call-?out|hourly|rates?\b|sole trader|papers?\b|complian|on hold|do not use|(not|haven'?t|didn'?t)( we)? used|last used|who (can|does|do)|someone|anyone|nobody|no one|\bguy\b|person for|trades?(wo)?m[ae]n|licen[cs]|insur|workers'? comp|white card|swms|plumb|electric|sparkie|cleaner|tiler|painter|carpent|roofer|concret|plaster|waterproof|glazier|landscap|fenc|scaffold|demoli|asbestos|skip bin|pest|locksmith|handyman|gas ?fit|air ?con|certifier|engineer|surveyor|bricklay|joiner/i,
  inventory: /stock|inventor|material|re-?order|low on|on hand|short supply|short of|running (low|out)|run(ning)? out|\blow\b|\bitems?\b|\border(ing)?\b|restock|shortage|supplies|parts?\b|products?\b/i, suppliers: /supplier|vendor/i, supplier_prices: /price|cheap|compare|supplier quote/i, stock_moves: /stock (used|in|out)|used|movement|consum|took/i
};
export const ESG_TABLES = ['esg_reports', 'esg_credits', 'esg_avoided', 'esg_cbam', 'esg_notes'];
export function pickTables(question, extraSql = '', esg = false) {
  const q = String(question || '');
  if (esg) {   // 🌿 ESG query & reports: only the ESG tables; esg_reports always, the others when the question (or the last query) is about them
    const c = new Set(['esg_reports']); for (const t of ESG_TABLES) if ((WORDS[t] && WORDS[t].test(q)) || new RegExp('\\b' + t + '\\b', 'i').test(extraSql)) c.add(t);
    if (c.size === 1 && !/score|readiness|emission|scope|target|certif|women|ltifr|board|compan/i.test(q)) ESG_TABLES.forEach((t) => c.add(t));
    return ESG_TABLES.filter((t) => c.has(t));
  }
  const chosen = new Set(['jobs', 'projects']);
  for (const [t, re] of Object.entries(WORDS)) if (re.test(q)) chosen.add(t);
  for (const t of Object.keys(SCHEMA)) if (new RegExp('\\b' + t + '\\b', 'i').test(extraSql)) chosen.add(t);
  if (chosen.has('esg_credits') || chosen.has('esg_avoided') || chosen.has('esg_cbam') || chosen.has('esg_notes')) chosen.add('esg_reports');
  if (chosen.has('plan_subtasks')) chosen.add('plan_tasks');
  if (chosen.has('supplier_prices') || chosen.has('stock_moves') || chosen.has('suppliers')) chosen.add('inventory');
  if (chosen.has('inventory') && /supplier|order from|whom|who to|contact|phone|call|email|vendor/i.test(q)) chosen.add('suppliers');
  if (chosen.has('subcontractors')) { chosen.add('sub_trades'); if (/job|project|plan|working on|on site|stakeholder|raci/i.test(q)) chosen.add('plan_stakeholders'); }
  if (/contract/i.test(q)) { chosen.add('plan_contracts'); if (/sub|trade/i.test(q)) chosen.add('subcontractors'); }
  if (/stakeholder|raci|accountable|responsible|consulted|informed/i.test(q)) { chosen.add('plan_stakeholders'); chosen.add('plan_tasks'); }
  // nothing specific (and not about jobs): give the AI every table
  if (chosen.size === 2 && !/job|enquir|customer|lead|won|lost|suburb|trade|new|stage|called/i.test(q)) Object.keys(SCHEMA).forEach((t) => chosen.add(t));
  return Object.keys(SCHEMA).filter((t) => chosen.has(t) && CHAMP_TABLES.has(t) && !ESG_TABLES.includes(t));   // the ESG tables have their own page (ESG query & reports)
}
// GKH Project Champ: only the project tables (the MBS business tables, such as quotes and invoices, are always empty here)
export const CHAMP_TABLES = new Set(['projects', 'programs', 'dependencies', 'change_records', 'jobs', 'plan_tasks', 'plan_subtasks', 'plan_risks', 'plan_issues', 'raid_log', 'plan_stakeholders', 'plan_contracts', 'subcontractors', 'sub_trades']);
const champOnly = (o) => Object.fromEntries(Object.entries(o).filter(([t]) => CHAMP_TABLES.has(t)));

function sydneyDates(now = Date.now()) {
  const p = parts(now);
  const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const S = (dt) => dt.toISOString().slice(0, 10);
  const add = (dt, n) => new Date(dt.getTime() + n * 86400000);
  const today = D(p.y, p.mo, p.d), wd = (today.getUTCDay() + 6) % 7, monday = add(today, -wd);
  const monthStart = D(p.y, p.mo, 1), monthEnd = add(D(p.y, p.mo + 1, 1), -1);
  const fyY = p.mo >= 7 ? p.y : p.y - 1;
  return {
    today: S(today), this_week: [S(monday), S(add(monday, 6))], last_week: [S(add(monday, -7)), S(add(monday, -1))],
    this_month: [S(monthStart), S(monthEnd)], last_month: [S(D(p.y, p.mo - 1, 1)), S(add(monthStart, -1))],
    this_year: [`${p.y}-01-01`, `${p.y}-12-31`], this_financial_year: [`${fyY}-07-01`, `${fyY + 1}-06-30`], last_financial_year: [`${fyY - 1}-07-01`, `${fyY}-06-30`],
    last_30_days: [S(add(today, -29)), S(today)]
  };
}
const HINT_KEYS = { companies: 40, industries: 20, countries: 20, quote_status: 8, invoice_status: 8, expense_categories: 12, trades: 10, sources: 8, suburbs: 12, plans: 15, sub_trades: 35 };
const HINT_FOR = { companies: 'esg_reports', industries: 'esg_reports', countries: 'esg_reports', quote_status: 'quotes', invoice_status: 'invoices', expense_categories: 'expenses', plans: 'plan_tasks', sub_trades: 'subcontractors' };
function cleanHints(h, use) {
  const out = {};
  for (const [k, n] of Object.entries(HINT_KEYS)) {
    if (use && HINT_FOR[k] && !use.includes(HINT_FOR[k]) && !(k === 'plans' && use.some((t) => t.startsWith('plan_')))) continue; const v = h && h[k]; if (Array.isArray(v) && v.length) out[k] = v.slice(0, n).map((x) => String(x ?? '').slice(0, 60)).filter(Boolean); }
  return out;
}
export function readOnly(sql) {
  const s = String(sql || '').replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').trim().replace(/;\s*$/, '');
  if (!/^(select|with)\b/i.test(s) || /;/.test(s) || /\b(into|insert|update|delete|drop|create|alter|attach|detach|require|source|declare)\b/i.test(s) || /\b(json|csv|xlsx|xls|txt|tab|tsv|html|ods|file)\s*\(/i.test(s)) return '';
  return s;
}
const SYSTEM = 'Turn the question from a project, program or portfolio manager using GKH Project Champ into ONE read-only AlaSQL query over the tables given. For questions about projects, programs or the portfolio, use the projects table first (one row per project; a program is projects grouped by the program column; the portfolio is every project). Rules: ' +
  '1) One SELECT (or WITH), no semicolons, only the listed tables/columns. ' +
  '2) Dates are text YYYY-MM-DD: use BETWEEN with the exact dates given for today, this week, this month, financial year (1 Jul-30 Jun) etc. ' +
  '3) Never alias as total, value, count, sum, rows, index, plan, top, group, desc or asc; every alias must differ from column names (e.g. jobs_count, total_inc). Same aliases in every UNION part. ' +
  '4) Match words loosely: LOWER(col) LIKE \'%word%\'. "Project X" = plan_tasks.plan_name or the job (jobs.name, service, suburb, ref) joined on plan_tasks.job = jobs.core. ' +
  '5) Project % complete = ROUND(SUM(CASE WHEN days < 1 THEN 1 ELSE days END * pct_complete) / SUM(CASE WHEN days < 1 THEN 1 ELSE days END)). New jobs = by created. Owed = SUM(balance) of invoices not paid or void. ' +
  '6) Every table starts with its own key (primary key), named after the table: customer_id, job_id, quote_id, invoice_id, stock_id (inventory), supplier_id, subcontractor_id, task_id, line_id, payment_id, expense_id, move_id, price_id, stakeholder_id. ' +
  'A column with another table\'s key name points to that table (foreign key), so JOIN on the SAME name, never on names or text: inventory.supplier_id = suppliers.supplier_id; supplier_prices.stock_id = inventory.stock_id; supplier_prices.supplier_id = suppliers.supplier_id; ' +
  'stock_moves.stock_id = inventory.stock_id; stock_moves.job_id = jobs.job_id; quotes/invoices/expenses/reminders/plan_*.job_id = jobs.job_id; jobs.customer_id = customers.customer_id; invoices.quote_id = quotes.quote_id; ' +
  'items.quote_id / items.invoice_id; payments.invoice_id = invoices.invoice_id; plan_subtasks.task_id = plan_tasks.task_id; plan_stakeholders.subcontractor_id = subcontractors.subcontractor_id; plan_contracts.job_id = jobs.job_id, plan_contracts.subcontractor_id = subcontractors.subcontractor_id. ' +
  'For a UNION, select the same key and columns from each part (e.g. stock_id, supplier_id). Use LEFT JOIN when the other side may be missing. Prefer columns already on the table (e.g. inventory.supplier_phone) over a join. ' +
  '7) Lists: useful columns, newest first, LIMIT 200. Totals/counts: one row. If it cannot be answered from these tables, sql = "" and say why in note. ' +
  'Reply JSON only: {"sql":"","title":"max 60 chars","note":"one short sentence: how you read it","chart":null or {"type":"bar|hbar|line|pie|doughnut","x":"alias","y":["alias"]}}';

export async function askSql({ question, hints, previous, history, esg }) {
  const first = !(previous && previous.sql);
  if (first) await checkLimit();
  const use = pickTables(question, [(history || []).map((h) => h && h.sql).join(' '), previous && previous.sql].join(' '), !!esg);
  const tables = use.map((t) => `${t}(${SCHEMA[t].join(',')})`).join('\n');
  const notes = use.map((t) => `${t}: ${NOTE[t] || DESCRIBE[t] || ''}`).join('. ');
  const user = { q: String(question).slice(0, 300), dates: sydneyDates(), tables, notes, values: cleanHints(hints, use) };
  if (Array.isArray(history) && history.length) user.earlier = history.slice(-1).map((h) => ({ q: String(h.q || '').slice(0, 200), sql: String(h.sql || '').slice(0, 600) }));
  if (esg) user.about = 'ESG & Sustainability reporting: the tables hold each company\'s own ESG data (scores, emissions, targets, credits, CBAM, notes). A company is a row of esg_reports; join the other esg_ tables on report_id.';
  if (!first) user.fix = { sql: String(previous.sql).slice(0, 1500), error: String(previous.error || '').slice(0, 200) };
  const { data: o, used } = await llmJson([{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(user) }], { maxTokens: tokCap() });
  const today = await usage(first, used);
  const sql = String(o.sql || '').trim();
  let chart = null;
  if (o.chart && typeof o.chart === 'object' && o.chart.x && Array.isArray(o.chart.y) && ['bar', 'hbar', 'line', 'pie', 'doughnut'].includes(o.chart.type)) chart = { type: o.chart.type, x: String(o.chart.x), y: o.chart.y.map(String).slice(0, 4) };
  const base = { tokens: used, today };
  if (sql && !readOnly(sql)) return { ...base, sql: '', title: '', note: 'The AI suggested a query that is not allowed here (reports only read data). Try asking in a different way.', chart: null };
  return { ...base, sql: sql ? readOnly(sql) : '', title: String(o.title || 'AI query').slice(0, 80), note: String(o.note || '').slice(0, 300), chart };
}
export async function answerFromRows({ question, title, sql, columns, rows, rowCount }) {
  const s = sample(columns, rows);
  const basic = rows.length === 0 ? 'Nothing matched that question.' : `${rows.length} row${rows.length === 1 ? '' : 's'} found (see the table).`;
  if (!llmSetup() || !rows.length) return { answer: basic, ai: false, tokens: 0 };
  try {
    const { data: o, used } = await llmJson([
      { role: 'system', content: langLine() + ' Answer the business owner in 1-3 short plain sentences using ONLY these query results: direct answer and key figures first, Australian spelling, $1,234.56. Never guess removed private details. JSON: {"answer":""}' },
      { role: 'user', content: JSON.stringify({ q: String(question).slice(0, 300), title, row_count: rowCount || rows.length, columns: s.columns, rows: s.rows.slice(0, 20) }) }
    ], { maxTokens: 200, temperature: 0.2 });
    const today = await usage(false, used);
    return { answer: String(o.answer || basic).slice(0, 700), ai: true, tokens: used, today };
  } catch (e) { return { answer: basic, ai: false, note: e.message, tokens: 0 }; }
}

// ---------- the PDF ----------
const safe = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...')
  .replace(/[•·]/g, '-').replace(/ /g, ' ').replace(/[\r\t]/g, ' ').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');
export async function reportPdf({ title, summary, insights, recommendations, sql, columns, rows, chart, by, ai }) {
  const { PDFDocument, StandardFonts, rgb } = await pdfLib();
  const B = business();
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(title)); pdf.setAuthor(B.name); pdf.setCreator(B.name); pdf.setProducer(B.name);
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), mono = await pdf.embedFont(StandardFonts.Courier);
  const logo = await pdf.embedPng(Buffer.from(LOGO, 'base64'));
  const W = 595.28, Hh = 841.89, M = 40, INK = rgb(0.08, 0.08, 0.08), GREY = rgb(0.42, 0.41, 0.38), GOLD = rgb(0.79, 0.64, 0.15);
  const pages = []; let page, y;
  const add = () => { page = pdf.addPage([W, Hh]); pages.push(page); y = Hh - M; };
  const text = (s, x, yy, o = {}) => page.drawText(safe(s), { x, y: yy, size: o.size || 10, font: o.font || reg, color: o.color || INK });
  const wrap = (s, width, size = 10, f = reg) => { const outL = []; for (const para of safe(s).split('\n')) { let line = ''; for (const w of para.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (f.widthOfTextAtSize(t, size) <= width) line = t; else { if (line) outL.push(line); line = w; } } outL.push(line); } return outL; };
  const need = (h) => { if (y - h < 60) add(); };
  add();
  const lw = 120, lh = lw * logo.height / logo.width;
  page.drawImage(logo, { x: M - 3, y: Hh - M - lh + 4, width: lw, height: lh });
  const when = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  text('REPORT', W - M - bold.widthOfTextAtSize('REPORT', 20), Hh - M - 16, { font: bold, size: 20 });
  page.drawRectangle({ x: W - M - 90, y: Hh - M - 26, width: 90, height: 3, color: GOLD });
  text(safe(when), W - M - reg.widthOfTextAtSize(safe(when), 9), Hh - M - 42, { size: 9, color: GREY });
  if (by) text('Prepared by ' + by, W - M - reg.widthOfTextAtSize(safe('Prepared by ' + by), 9), Hh - M - 55, { size: 9, color: GREY });
  y = Hh - M - Math.max(lh, 70) - 18;
  for (const l of wrap(title, W - 2 * M, 18, bold)) { text(l, M, y, { font: bold, size: 18 }); y -= 22; }
  y -= 6;
  if (summary) { for (const l of wrap(summary, W - 2 * M, 11)) { need(16); text(l, M, y, { size: 11 }); y -= 15; } y -= 8; }
  const bullets = (head, list) => {
    if (!list || !list.length) return;
    need(30); text(head, M, y, { font: bold, size: 12 }); y -= 18;
    for (const it of list) { const ls = wrap(it, W - 2 * M - 16, 10.5); need(ls.length * 14 + 4); page.drawCircle({ x: M + 4, y: y + 3.5, size: 2.2, color: GOLD }); ls.forEach((l, i) => text(l, M + 14, y - i * 14, { size: 10.5 })); y -= ls.length * 14 + 4; }
    y -= 8;
  };
  bullets('Key findings', insights);
  bullets('Suggested actions', recommendations);
  if (chart) {
    try {
      const m = String(chart).match(/^data:image\/(png|jpeg);base64,(.+)$/);
      if (m) {
        const img = m[1] === 'png' ? await pdf.embedPng(Buffer.from(m[2], 'base64')) : await pdf.embedJpg(Buffer.from(m[2], 'base64'));
        const cw = W - 2 * M, ch = Math.min(300, cw * img.height / img.width);
        need(ch + 10); page.drawImage(img, { x: M + (cw - ch * img.width / img.height) / 2, y: y - ch, width: ch * img.width / img.height, height: ch }); y -= ch + 18;
      }
    } catch {}
  }
  // data table (first 40 rows)
  const cols = (columns || []).slice(0, 7);
  if (cols.length && rows && rows.length) {
    need(50); text(`Data (${Math.min(rows.length, 40)} of ${rows.length} rows${columns.length > 7 ? ', first 7 columns' : ''})`, M, y, { font: bold, size: 12 }); y -= 20;
    const cw = (W - 2 * M) / cols.length;
    const fit = (s, w, f, size) => { let t = safe(s); while (t && f.widthOfTextAtSize(t, size) > w - 6) t = t.slice(0, -2) + '…'.replace('…', '.'); return t; };
    const head = () => { page.drawRectangle({ x: M, y: y - 5, width: W - 2 * M, height: 18, color: INK }); cols.forEach((c, i) => text(fit(c.replace(/_/g, ' '), cw, bold, 8.5), M + i * cw + 4, y, { font: bold, size: 8.5, color: rgb(1, 1, 1) })); y -= 18; };
    head();
    rows.slice(0, 40).forEach((r, n) => {
      if (y < 70) { add(); head(); }
      if (n % 2) page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 15, color: rgb(0.97, 0.965, 0.95) });
      cols.forEach((c, i) => { const v = r[c]; const s = typeof v === 'number' ? v.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : v == null ? '' : String(v); text(fit(s, cw, reg, 8.5), M + i * cw + 4, y, { size: 8.5 }); });
      y -= 15;
    });
    y -= 10;
  }
  if (sql) { need(40); text('Query', M, y, { font: bold, size: 10, color: GREY }); y -= 13; for (const l of wrap(sql.replace(/\s+/g, ' '), W - 2 * M, 8, mono).slice(0, 12)) { need(12); text(l, M, y, { font: mono, size: 8, color: GREY }); y -= 11; } }
  pages.forEach((pg, i) => { page = pg; page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.6, color: rgb(0.88, 0.87, 0.84) });
    text(`${B.name} - ${B.web}${ai ? ' - Written with AI assistance (DeepSeek); check figures before relying on them' : ''}`, M, 28, { size: 7.5, color: GREY });
    const pn = `Page ${i + 1} of ${pages.length}`; text(pn, W - M - reg.widthOfTextAtSize(pn, 8), 28, { size: 8, color: GREY }); });
  return pdf.save();
}

// 🗺 a Program manager asks over their own programs only: rows of their projects and programs, no sub-contractor tables, no money columns
const MONEY_COL = /budget|cost|price|amount|value|_inc$|invoice|quote|paid|payment|rate|margin|revenue|profit|bill|owed|received|^bac$|^eac$|^vac$|^ac$|^ev$|^pv$|earned|planned_value|actual|contract|cpi/i;
function scoped(data, g) {
  const money = g.kind === 'project';   // 📁 a Project manager keeps the money columns of their own projects
  const cores = new Set(g.cores), names = new Set(g.names), out = {};
  const mine = new Set((data.projects || []).filter((r) => cores.has(r.job_id || r.job)).map((r) => r.project_name));   // their own projects, by name (for the links between projects)
  for (const [t, rows] of Object.entries(data)) {
    if (t === 'subcontractors' || t === 'sub_trades' || !Array.isArray(rows)) continue;
    let R = rows;
    // 🔒 a program's roll-up covers every project in it: a project manager (who sees only some of them) does not get it
    if (t === 'programs') { if (money) continue; R = rows.filter((r) => names.has(r.program_id || r.program)); }
    else if (t === 'dependencies') R = rows.filter((r) => cores.has(r.from_job) && cores.has(r.to_job));
    else if (t === 'raid_log') R = rows.filter((r) => cores.has(r.job) && (!r.other_job || cores.has(r.other_job)));   // 🔒 a link row needs both projects   // 🔒 both ends must be their own projects (checked by project code, never by name)
    else R = rows.filter((r) => cores.has(r.job_id || r.job || r.core));
    out[t] = money ? R : R.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !MONEY_COL.test(k))));
  }
  return out;
}
const noMoneyCols = (o) => Object.fromEntries(Object.entries(o).map(([t, c]) => [t, Array.isArray(c) ? c.filter((k) => !MONEY_COL.test(typeof k === 'string' ? k : (k && k.name) || '')) : c]));
export async function sqlPost(action, body, { who, ctx }) {
  // 🌿 ESG query & reports: the same tools on the ESG tables only (open to every staff login, like the rest of ESG)
  if (action === 'esgSqlData') {
    const all = await esgTables(), money = !!(ctx && (ctx.owner || seesMoney(ctx))), pick = (o) => Object.fromEntries(ESG_TABLES.map((t) => [t, o[t]]));
    const data = Object.fromEntries(ESG_TABLES.map((t) => [t, (all[t] || []).map((r) => (money ? r : Object.fromEntries(Object.entries(r).filter(([k]) => !MONEY_COL.test(k)))))]));
    return out(200, { schema: money ? pick(SCHEMA) : noMoneyCols(pick(SCHEMA)), describe: pick(DESCRIBE), keys: Object.fromEntries(ESG_TABLES.map((t) => [t, { pk: t === 'esg_reports' ? 'report_id' : '', fk: t === 'esg_reports' ? {} : { report_id: 'esg_reports' } }])), data });
  }
  if (action === 'esgSqlAsk') { body = { ...body, esg: true }; action = 'sqlAsk'; }
  else if (action === 'esgSqlAnswer' || action === 'esgSqlPdf' || action === 'esgSqlNarrative') action = 'sql' + action.slice(6);
  else if (action === 'esgSqlUsage') action = 'sqlUsage';
  if (action === 'sqlData' && ctx && ctx.pgm) { const data = scoped(champOnly(await tables()), ctx.pgm), keep = (o) => Object.fromEntries(Object.entries(champOnly(o)).filter(([t]) => data[t]));
    return out(200, { schema: ctx.pgm.kind === 'project' ? keep(SCHEMA) : noMoneyCols(keep(SCHEMA)), describe: keep(DESCRIBE), keys: keep(Object.fromEntries(Object.entries(KEYS).map(([t, K]) => [t, { pk: K.pk, fk: K.fk || {} }]))), data, scoped: true }); }
  if (action === 'sqlData' && ctx && !ctx.owner && !seesMoney(ctx)) {   // 🔒 a login without money access (site administrator, view only): the money columns are removed
    const data = Object.fromEntries(Object.entries(champOnly(await tables())).map(([t, R]) => [t, Array.isArray(R) ? R.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !MONEY_COL.test(k)))) : R]));
    return out(200, { schema: noMoneyCols(champOnly(SCHEMA)), describe: champOnly(DESCRIBE), keys: champOnly(Object.fromEntries(Object.entries(KEYS).map(([t, K]) => [t, { pk: K.pk, fk: K.fk || {} }]))), data });
  }
  if (action === 'sqlData') return out(200, { schema: champOnly(SCHEMA), describe: champOnly(DESCRIBE), keys: champOnly(Object.fromEntries(Object.entries(KEYS).map(([t, K]) => [t, { pk: K.pk, fk: K.fk || {} }]))), data: champOnly(await tables()) });
  if (action === 'sqlNarrative') {
    const columns = (Array.isArray(body.columns) ? body.columns : []).map(String).slice(0, 40), rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
    return out(200, await narrative({ title: String(body.title || 'Report').slice(0, 120), sql: String(body.sql || '').slice(0, 3000), columns, rows, focus: String(body.focus || '').slice(0, 400) }));
  }
  if (action === 'sqlAsk') {
    const question = String(body.question || '').trim();
    if (!question) return bad('Type a question first');
    try { return out(200, await askSql({ question, hints: body.hints || {}, previous: body.previous || null, history: body.history || [], esg: !!body.esg })); }
    catch (e) { const st = Number.isInteger(e.code) && e.code >= 400 && e.code < 600 ? e.code : 502; return out(st, { error: e.message, retry: st === 504 }); }
  }
  if (action === 'aiPing') return out(200, await ping());
  if (action === 'sqlUsage') return out(200, await usageToday());
  if (action === 'sqlAnswer') {
    const columns = (Array.isArray(body.columns) ? body.columns : []).map(String).slice(0, 40), rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
    return out(200, await answerFromRows({ question: String(body.question || '').slice(0, 500), title: String(body.title || '').slice(0, 120), sql: String(body.sql || '').slice(0, 3000), columns, rows, rowCount: Math.max(rows.length, Number(body.row_count) || 0) }));
  }
  if (action === 'sqlPdf') {
    const columns = (Array.isArray(body.columns) ? body.columns : []).map(String).slice(0, 40), rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
    if (body.chart && String(body.chart).length > 4_000_000) return bad('The chart image is too big');
    const bytes = await reportPdf({ title: String(body.title || 'Report').slice(0, 120), summary: String(body.summary || '').slice(0, 1500), insights: (body.insights || []).slice(0, 8).map(String),
      recommendations: (body.recommendations || []).slice(0, 5).map(String), sql: String(body.sql || '').slice(0, 3000), columns, rows, chart: body.chart || '', by: who, ai: !!body.ai });
    return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Project-Champ-report-${new Date().toISOString().slice(0, 10)}.pdf"`, 'Cache-Control': 'no-store' } });
  }
  return null;
}
