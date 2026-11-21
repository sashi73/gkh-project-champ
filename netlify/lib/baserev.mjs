// 📌 Baseline versions: the first baseline is v0; every re-baseline (approved through the change control board, or committed straight
// when change control is off) is v1, v2 … Each version is kept for good: a snapshot here (so any version can be rolled back to), and
// in Project documents as a spreadsheet (CSV) and a PowerPoint deck, one version per baseline. The list is the audit trail, and Ask AI
// can read it to see what re-baselining has done to the project.
import * as kv from './kv.mjs';
import * as J from './jobs.mjs';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const $ = (n) => (n < 0 ? '−$' : '$') + Math.abs(r2(n)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (at) => new Date(at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const dmy = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
const days = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : 0);
const csvQ = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const safe = (s) => String(s ?? '').replace(/[^\n\x20-\x7E\xA0-￿]/g, '');

export function rows(plan, base, prev) {
  return (plan.tasks || []).map((t, i) => { const b = (base.tasks || {})[t.id] || {}, o = prev ? (prev.tasks || {})[t.id] || null : null;
    return { n: i + 1, name: t.name, es: b.es || '', ef: b.ef || '', cost: r2(b.cost), oes: o ? o.es : '', oef: o ? o.ef : '', ocost: o ? r2(o.cost) : null, moved: o && o.ef && b.ef ? days(o.ef, b.ef) : null }; })
    .filter((r) => r.es || r.ef || r.cost);
}
function csv(plan, job, v, s, prev, R) {
  const head = [['Project baseline'], ['Project', plan.name], ['Reference', job ? J.refFor(job) : plan.core], ['Version', 'v' + v + (v === 0 ? ' (the first baseline)' : '')], ['Set', when(s.at) + ' (Sydney)'], ['By', s.by || ''],
    ['Why', s.why || ''], ['Change request', s.cr || (s.direct ? 'Committed straight (change control off)' : '')], ['Finish', dmy(s.finish)], ['Budget (BAC)', $(s.BAC)],
    ...(prev ? [['Change from v' + prev.v, 'finish ' + (days(prev.finish, s.finish) >= 0 ? '+' : '') + days(prev.finish, s.finish) + ' days, budget ' + (s.BAC - prev.BAC >= 0 ? '+' : '') + $(s.BAC - prev.BAC)]] : []), []];
  const body = [['#', 'Task', 'Baseline start', 'Baseline finish', 'Baseline cost', ...(prev ? ['Previous start', 'Previous finish', 'Previous cost', 'Finish moved (days)'] : [])]]
    .concat(R.map((r) => [r.n, r.name, dmy(r.es), dmy(r.ef), r.cost.toFixed(2), ...(prev ? [dmy(r.oes), dmy(r.oef), r.ocost == null ? 'new' : r.ocost.toFixed(2), r.moved == null ? '' : r.moved] : [])]));
  return head.concat(body).map((r) => r.map(csvQ).join(',')).join('\r\n');
}
export async function pptx(plan, job, v, s, prev, R) {
  const PG = (await import('pptxgenjs')).default, p = new PG(); p.layout = 'LAYOUT_WIDE'; p.author = 'GKH Project Champ'; p.title = 'Baseline v' + v + ' - ' + plan.name;
  const GOLD = 'C9A227', INK = '1C1A16', GREY = '6B6656', ref = job ? J.refFor(job) : plan.core;
  const top = (sl, t) => { sl.background = { color: 'FFFFFF' }; sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: GOLD } }); sl.addText(safe(t), { x: 0.5, y: 0.25, w: 12.3, h: 0.6, fontSize: 24, bold: true, color: INK, fontFace: 'Arial' });
    sl.addText(safe(plan.name + '  ·  ' + ref + '  ·  Baseline v' + v), { x: 0.5, y: 7.0, w: 12.3, h: 0.3, fontSize: 10, color: GREY, fontFace: 'Arial' }); };
  // 1 · the cover
  let sl = p.addSlide(); sl.background = { color: INK };
  sl.addText('Project baseline v' + v, { x: 0.6, y: 1.5, w: 12, h: 1, fontSize: 40, bold: true, color: 'F5D77A', fontFace: 'Arial' });
  sl.addText(safe(plan.name), { x: 0.6, y: 2.6, w: 12, h: 0.7, fontSize: 26, color: 'FFFFFF', fontFace: 'Arial' });
  sl.addText(safe(ref + '  ·  set ' + when(s.at) + ' (Sydney)' + (s.by ? '  ·  by ' + s.by : '')), { x: 0.6, y: 3.4, w: 12, h: 0.5, fontSize: 16, color: 'D8D2C2', fontFace: 'Arial' });
  sl.addText(safe(v === 0 ? 'The first baseline: the dates and costs the project is measured against.' : 'Re-baseline ' + (s.cr ? 'approved through ' + s.cr : s.direct ? 'committed straight (change control off)' : '') + (s.why ? ': ' + s.why : '')), { x: 0.6, y: 4.2, w: 12, h: 1.2, fontSize: 16, color: 'FFFFFF', fontFace: 'Arial', valign: 'top' });
  // 2 · the figures (and the change from the previous version)
  sl = p.addSlide(); top(sl, 'The baseline in figures');
  const fig = [['Finish', dmy(s.finish)], ['Budget (BAC)', $(s.BAC)], ['Tasks', String(R.length)], ['Set', when(s.at)], ['By', s.by || '—'], ['Approval', s.cr || (s.direct ? 'Change control off: committed straight' : v === 0 ? 'First baseline' : '—')]];
  if (prev) fig.push(['Finish moved from v' + prev.v, (days(prev.finish, s.finish) >= 0 ? '+' : '') + days(prev.finish, s.finish) + ' days (' + dmy(prev.finish) + ' → ' + dmy(s.finish) + ')'], ['Budget changed from v' + prev.v, (s.BAC - prev.BAC >= 0 ? '+' : '') + $(s.BAC - prev.BAC) + ' (' + $(prev.BAC) + ' → ' + $(s.BAC) + ')']);
  sl.addTable(fig.map(([k, x]) => [{ text: safe(k), options: { color: GREY, fontSize: 14 } }, { text: safe(x), options: { bold: true, color: INK, fontSize: 16 } }]), { x: 0.6, y: 1.2, w: 12, colW: [4, 8], fontFace: 'Arial', border: { type: 'solid', color: 'E5E2DA', pt: 0.75 }, rowH: 0.5 });
  if (s.why) sl.addText(safe('Why: ' + s.why), { x: 0.6, y: 1.3 + fig.length * 0.5 + 0.2, w: 12, h: 0.8, fontSize: 13, color: INK, italic: true, fontFace: 'Arial' });
  // 3 · a timeline of the baseline (up to 24 tasks per slide)
  const dated = R.filter((r) => r.es && r.ef), d0 = dated.reduce((m, r) => (!m || r.es < m ? r.es : m), ''), d1 = dated.reduce((m, r) => (r.ef > m ? r.ef : m), ''), span = Math.max(1, days(d0, d1));
  for (let k = 0; k < dated.length; k += 24) {
    sl = p.addSlide(); top(sl, 'Baseline timeline' + (dated.length > 24 ? ' (' + (k + 1) + '–' + Math.min(dated.length, k + 24) + ')' : '') + ':  ' + dmy(d0) + ' to ' + dmy(d1));
    const part = dated.slice(k, k + 24), X0 = 4.4, W = 8.4, H = Math.min(0.24, 5.6 / Math.max(1, part.length));
    part.forEach((r, i) => { const y = 1.1 + i * H, x = X0 + (days(d0, r.es) / span) * W, w = Math.max(0.05, (Math.max(1, days(r.es, r.ef)) / span) * W);
      sl.addText(safe('#' + r.n + ' ' + r.name).slice(0, 48), { x: 0.4, y, w: 3.9, h: H, fontSize: 9, color: INK, fontFace: 'Arial', valign: 'middle' });
      sl.addShape(p.ShapeType.rect, { x, y: y + H * 0.2, w, h: H * 0.6, fill: { color: r.moved > 0 ? 'D97706' : GOLD }, line: { color: r.moved > 0 ? 'D97706' : GOLD } }); });
  }
  // 4 · the task table (15 rows per slide)
  for (let k = 0; k < R.length; k += 15) {
    sl = p.addSlide(); top(sl, 'Baseline tasks' + (R.length > 15 ? ' (' + (k + 1) + '–' + Math.min(R.length, k + 15) + ')' : ''));
    const hd = ['#', 'Task', 'Start', 'Finish', 'Cost'].concat(prev ? ['Was finish', 'Moved'] : []);
    const tb = [hd.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: INK }, fontSize: 11 } }))].concat(R.slice(k, k + 15).map((r) => [String(r.n), safe(r.name).slice(0, 60), dmy(r.es), dmy(r.ef), $(r.cost)]
      .concat(prev ? [dmy(r.oef) || 'new', r.moved == null ? '' : (r.moved > 0 ? '+' : '') + r.moved + ' d'] : []).map((x) => ({ text: x, options: { fontSize: 10, color: INK } }))));
    sl.addTable(tb, { x: 0.4, y: 1.1, w: 12.5, colW: prev ? [0.5, 5.2, 1.3, 1.3, 1.7, 1.3, 1.2] : [0.6, 6.9, 1.6, 1.6, 1.8], fontFace: 'Arial', border: { type: 'solid', color: 'E5E2DA', pt: 0.5 }, rowH: 0.36 });
  }
  return Buffer.from(await p.write({ outputType: 'nodebuffer' }));
}

// after a plan is saved (or read): a baseline that is new (or replaced) becomes the next version. This part is quick (a snapshot and the
// list on the plan) so it can never be lost to a slow request; the files are made by files() below, which can be run again until done.
export async function check(core, plan, by, save) {
  const B = plan && plan.baseline; if (!B || !B.at) return null;
  const H = (await kv.get('baserev:' + core).catch(() => null)) || { list: [] }, last = H.list[H.list.length - 1] || null;
  if (last && last.at === B.at) return null;
  const v = last ? last.v + 1 : 0, prev = last;
  const snap = { v, at: B.at, by: B.by || by, why: B.why || (v === 0 ? 'The first baseline' : ''), cr: B.cr || '', direct: !!B.direct, rollback: B.rollback != null ? B.rollback : undefined, finish: B.finish, BAC: r2(B.BAC), tasks: B.tasks || {}, files: null };
  if (plan.baselineSuspect && Math.abs(plan.baselineSuspect - B.at) < 120000) snap.why = 'Replaced automatically by an order change (a fault, since fixed)';
  let added = false;
  await kv.update('baserev:' + core, (x) => { const L = (x && x.list) || []; if (L.some((y) => y.at === snap.at)) return x; added = true; return { ...(x || {}), list: [...L, snap].slice(-100) }; }, () => ({ list: [] }));
  if (!added) return null;
  const p = JSON.parse(JSON.stringify(plan));
  p.baseRevs = [...(p.baseRevs || []).filter((x) => x.v !== v), { v, at: snap.at, by: snap.by, why: snap.why, cr: snap.cr, direct: snap.direct, rollback: snap.rollback, finish: snap.finish, BAC: snap.BAC, dFinish: prev ? days(prev.finish, snap.finish) : 0, dBAC: prev ? r2(snap.BAC - prev.BAC) : 0, files: 'pending' }].slice(-100);
  const r = await save(core, p, plan.rev, by);
  return r && !r.conflict ? { plan: r.plan, info: { v, note: 'Baseline v' + v + ': finish ' + dmy(snap.finish) + ', budget ' + $(snap.BAC) } } : null;
}
// 📄 the files for every version that does not have them yet (a spreadsheet and a PowerPoint deck in Project documents, one version each).
//    Safe to run again: a version is only marked done once both files are in; a failure is kept on the version so it shows.
export async function files(core, plan, by, setPlan) {
  const H = (await kv.get('baserev:' + core).catch(() => null)) || { list: [] }, todo = H.list.filter((x) => !x.files || !x.files.csv || !x.files.ppt);
  if (!todo.length) return { done: 0 };
  const job = await J.find(core).catch(() => null), I = await import('./plan-intel.mjs'), out = [];
  let lastCsv = H.csv || '', lastPpt = H.ppt || '';
  for (const snap of todo.slice(0, 2)) {   // two at a time, so a request stays quick; the rest on the next call
    const prev = H.list.find((x) => x.v === snap.v - 1) || null, R = rows(plan, snap, prev), f = { ...(snap.files || {}) }, errs = [];
    const note = 'Baseline v' + snap.v + ': finish ' + dmy(snap.finish) + ', budget ' + $(snap.BAC) + (prev ? ' (' + (days(prev.finish, snap.finish) >= 0 ? '+' : '') + days(prev.finish, snap.finish) + ' days, ' + (snap.BAC - prev.BAC >= 0 ? '+' : '') + $(snap.BAC - prev.BAC) + ' from v' + prev.v + ')' : '') + (snap.cr ? '. Approved through ' + snap.cr : snap.direct ? '. Committed straight (change control off)' : '') + (snap.why ? '. Why: ' + snap.why : '');
    const text = csv(plan, job, snap.v, snap, prev, R);
    if (!f.csv) try { const a = await I.upload(core, { name: 'Baseline.csv', title: 'Project baseline v' + snap.v + ' (spreadsheet)', type: 'text/csv', text, file: Buffer.from('\ufeff' + text).toString('base64'), size: text.length, folder: 'plans', status: 'Approved', replaces: lastCsv || undefined, vnote: note, version: snap.v, kind: 'Baseline', tags: ['Baseline', 'v' + snap.v, 'CSV'].concat(snap.cr ? [snap.cr] : []) }, by);
      if (a && a.doc) { f.csv = a.doc.id; lastCsv = a.doc.id; } else errs.push('spreadsheet: ' + ((a && a.error) || 'not saved')); } catch (e) { errs.push('spreadsheet: ' + e.message); }
    if (!f.ppt) try { const buf = await pptx(plan, job, snap.v, snap, prev, R);
      const b = await I.upload(core, { name: 'Baseline.pptx', title: 'Project baseline v' + snap.v + ' (PowerPoint)', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', text: text.slice(0, 20000), file: buf.toString('base64'), size: buf.length, folder: 'plans', status: 'Approved', replaces: lastPpt || undefined, vnote: note, version: snap.v, kind: 'Baseline', tags: ['Baseline', 'v' + snap.v, 'PowerPoint'].concat(snap.cr ? [snap.cr] : []) }, by);
      if (b && b.doc) { f.ppt = b.doc.id; lastPpt = b.doc.id; } else errs.push('PowerPoint: ' + ((b && b.error) || 'not saved')); } catch (e) { errs.push('PowerPoint: ' + e.message); }
    f.err = errs.join('; ') || undefined; f.at = Date.now();
    await kv.update('baserev:' + core, (x) => ({ ...(x || {}), csv: lastCsv, ppt: lastPpt, list: ((x && x.list) || []).map((y) => (y.v === snap.v ? { ...y, files: f } : y)) }), () => ({ list: [] }));
    out.push({ v: snap.v, ok: !!(f.csv && f.ppt), err: f.err || '' });
    if (errs.length) console.error('Baseline v' + snap.v + ' files: ' + f.err);
  }
  if (setPlan) await setPlan((p) => { p.baseRevs = (p.baseRevs || []).map((x) => { const o = out.find((y) => y.v === x.v); return o ? { ...x, files: o.ok ? 'ok' : 'failed', filesErr: o.err || undefined } : x; }); return p; });
  return { done: out.length, left: Math.max(0, todo.length - out.length), results: out };
}
export async function snapshot(core, v) { const H = (await kv.get('baserev:' + core).catch(() => null)) || { list: [] }; return H.list.find((x) => x.v === Number(v)) || null; }

// ✨ what re-baselining has done to this project: the AI reads the versions (dates, budgets, reasons, approvals) and today's figures
export async function analyse(core, plan, R) {
  const AI = await import('./ai.mjs'); await AI.checkLimit();
  const H = (await kv.get('baserev:' + core).catch(() => null)) || { list: [] }, L = H.list.map((x) => ({ version: x.v, set: new Date(x.at).toISOString().slice(0, 10), by: x.by, why: x.why, approval: x.cr || (x.direct ? 'committed straight, change control off' : x.v === 0 ? 'first baseline' : ''), rollback_to: x.rollback, finish: x.finish, budget: x.BAC }));
  if (L.length < 1) return { analysis: { summary: 'There is no baseline yet.', patterns: [], risks: [], advice: [] } };
  const now = { today: AI.sydToday(), finish_now: R.finish, budget_now: R.BAC, forecast_cost: R.EAC, pct_complete: R.pct, SPI: R.SPI, CPI: R.CPI };
  const sys = 'You are a senior project controls analyst (PMI / PMBOK). You are given the full baseline history of ONE project (every re-baseline, with its date, reason and approval) and its figures today. Write an independent analysis of what re-baselining has done to this project: the pattern (how often, how far the finish and the budget moved each time and in total, whether re-baselines hide poor performance or reflect approved scope changes, any rubber-stamping or creep), and what it means for governance. Be factual: use only the numbers given, show the arithmetic for totals. Reply as JSON: {"summary": "3-5 sentences", "totals": {"rebaselines": n, "finish_moved_days": n, "budget_moved": n}, "patterns": ["..."], "risks": ["..."], "advice": ["..."]}.';
  const { data, used } = await AI.llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ project: plan.name, baselines: L, now }) }], { maxTokens: 1200, timeoutMs: Math.max(AI.aiTimeout(), 25000) });
  await AI.usage(true, used);
  return { analysis: data, versions: L.length };
}
