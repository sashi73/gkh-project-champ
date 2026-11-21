// 📌 Baseline versions: the first baseline is v0; every re-baseline (approved through the change control board, or committed straight
// when change control is off) is v1, v2 … Each version is kept for good: a snapshot here (so any version can be rolled back to), and
// in Project documents as a PDF and a spreadsheet (CSV), one version per baseline. The list is the audit trail, and Ask AI
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
// 📄 the version as a PDF (A4 landscape): the figures, the change from the previous version, a timeline and every task
const pdfSafe = (s) => String(s ?? '').replace(/²/g, '2').replace(/³/g, '3').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[•·]/g, '-').replace(/→/g, '->').replace(/[\r\t]/g, ' ').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');
export async function pdf(plan, job, v, s, prev, R) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib'), LOGO = (await import('./logo-png.mjs')).default;
  const doc = await PDFDocument.create(), W = 841.89, H = 595.28, M = 32, INK = rgb(0.08, 0.08, 0.08), GREY = rgb(0.42, 0.41, 0.38), GOLD = rgb(0.79, 0.64, 0.15), PALE = rgb(0.985, 0.97, 0.92), RED = rgb(0.7, 0.14, 0.1), GRN = rgb(0.02, 0.46, 0.28), AMB = rgb(0.85, 0.47, 0.02);
  doc.setTitle(pdfSafe('Project baseline v' + v + ' - ' + plan.name)); doc.setAuthor('GKH Project Champ'); doc.setCreator('GKH Project Champ');
  const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold), logo = await doc.embedPng(Buffer.from(LOGO, 'base64')), ref = job ? J.refFor(job) : plan.core;
  let page, y, pn = 0;
  const tx = (t, x, yy, o = {}) => { const f = o.bold ? bold : reg, z = o.size || 8.5; let q = pdfSafe(t); if (o.max) while (q.length > 1 && f.widthOfTextAtSize(q, z) > o.max) q = q.slice(0, -2) + '.'; const w = f.widthOfTextAtSize(q, z); page.drawText(q, { x: o.align === 'right' ? x - w : x, y: yy, size: z, font: f, color: o.color || INK }); };
  const newPage = () => { page = doc.addPage([W, H]); pn++; y = H - M;
    page.drawImage(logo, { x: M, y: y - 26, width: 26, height: 26 }); tx('Project baseline  v' + v + (v === 0 ? ' (the first baseline)' : ''), M + 34, y - 10, { bold: true, size: 14 });
    tx(plan.name + '  -  ' + ref + '  -  set ' + when(s.at) + ' (Sydney)', M + 34, y - 24, { size: 9, color: GREY }); tx('Page ' + pn, W - M, y - 10, { align: 'right', size: 8, color: GREY });
    page.drawLine({ start: { x: M, y: y - 32 }, end: { x: W - M, y: y - 32 }, thickness: 1.2, color: GOLD }); y -= 48; };
  newPage();
  const dF = prev ? days(prev.finish, s.finish) : 0, dB = prev ? s.BAC - prev.BAC : 0;
  const facts = [['Finish', dmy(s.finish)], ['Budget (BAC)', $(s.BAC)], ['Set', when(s.at)], ['By', s.by || '-'], ['Approval', s.cr ? 'through ' + s.cr : s.direct ? 'committed straight (change control off)' : v === 0 ? 'the first baseline' : '-'], ['Tasks', String(R.length)]]
    .concat(prev ? [['Finish moved from v' + prev.v, (dF >= 0 ? '+' : '') + dF + ' days (' + dmy(prev.finish) + ' -> ' + dmy(s.finish) + ')'], ['Budget changed from v' + prev.v, (dB >= 0 ? '+' : '') + $(dB) + ' (' + $(prev.BAC) + ' -> ' + $(s.BAC) + ')']] : [])
    .concat(s.rollback != null ? [['Roll back', 'to baseline v' + s.rollback]] : []);
  facts.forEach(([k, x], i) => { const col = i % 2, row = Math.floor(i / 2); tx(k, M + col * 390, y - row * 15, { size: 8.5, color: GREY }); tx(x, M + 125 + col * 390, y - row * 15, { size: 9.5, bold: true, max: 255 }); });
  y -= Math.ceil(facts.length / 2) * 15 + 4;
  if (s.why) { const words = pdfSafe('Why: ' + s.why).split(' '); let ln = ''; const out = []; for (const w of words) { const t2 = ln ? ln + ' ' + w : w; if (reg.widthOfTextAtSize(t2, 9) > W - 2 * M) { out.push(ln); ln = w; } else ln = t2; } out.push(ln); out.slice(0, 3).forEach((l) => { tx(l, M, y, { size: 9 }); y -= 12; }); }
  y -= 6;
  // the timeline (the bars of the baseline; amber where the finish moved from the previous version)
  const dated = R.filter((r) => r.es && r.ef), d0 = dated.reduce((m, r) => (!m || r.es < m ? r.es : m), ''), d1 = dated.reduce((m, r) => (r.ef > m ? r.ef : m), ''), span = Math.max(1, days(d0, d1));
  if (dated.length) {
    const rowH = Math.max(6, Math.min(11, (y - M - 40) / dated.length)), X0 = M + 200, TW = W - M - X0;
    if (dated.length * rowH > y - M - 30) { newPage(); }
    tx('Timeline: ' + dmy(d0) + ' to ' + dmy(d1), M, y, { bold: true, size: 10 }); y -= 14;
    for (const r of dated) { if (y < M + 20) newPage();
      tx('#' + r.n + ' ' + r.name, M, y - rowH + 2, { size: Math.min(7.5, rowH - 1), max: 192, color: GREY });
      const x = X0 + (days(d0, r.es) / span) * TW, w = Math.max(1.5, (Math.max(1, days(r.es, r.ef)) / span) * TW);
      page.drawRectangle({ x, y: y - rowH + 1.5, width: w, height: rowH - 3, color: r.moved > 0 ? AMB : GOLD }); y -= rowH; }
    y -= 22;
  }
  // every task
  const C = prev ? [['#', M, 'l'], ['Task', M + 22, 'l'], ['Start', 420, 'l'], ['Finish', 480, 'l'], ['Cost', 600, 'r'], ['Was finish', 615, 'l'], ['Moved', W - M, 'r']] : [['#', M, 'l'], ['Task', M + 22, 'l'], ['Start', 500, 'l'], ['Finish', 580, 'l'], ['Cost', W - M, 'r']];
  const A = (n) => C.find((c) => c[0] === n)[1], head = () => { page.drawRectangle({ x: M - 4, y: y - 5, width: W - 2 * M + 8, height: 18, color: INK }); C.forEach(([n, x, a]) => tx(n, x, y, { bold: true, size: 8, color: rgb(1, 1, 1), align: a === 'r' ? 'right' : 'left' })); y -= 20; };
  if (y < M + 60) newPage(); head();
  R.forEach((r, i) => { if (y < M + 20) { newPage(); head(); }
    if (i % 2) page.drawRectangle({ x: M - 4, y: y - 4, width: W - 2 * M + 8, height: 14, color: PALE });
    tx(String(r.n), A('#'), y, { color: GREY }); tx(r.name, A('Task'), y, { max: A('Start') - A('Task') - 8 }); tx(dmy(r.es), A('Start'), y); tx(dmy(r.ef), A('Finish'), y); tx($(r.cost), A('Cost'), y, { align: 'right' });
    if (prev) { tx(r.oef ? dmy(r.oef) : 'new', A('Was finish'), y, { color: GREY }); if (r.moved) tx((r.moved > 0 ? '+' : '') + r.moved + ' d', W - M, y, { align: 'right', bold: true, color: r.moved > 0 ? RED : GRN }); }
    y -= 14; });
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.8, color: GREY }); y -= 8; if (y < M) newPage();
  tx('Total (BAC)', A('Task'), y, { bold: true, size: 10 }); tx($(s.BAC), A('Cost'), y, { bold: true, size: 10, align: 'right' });
  tx('Every baseline version is kept in Project documents (Plans and schedules): the audit trail, and a version to roll back to.', M, 18, { size: 7, color: GREY });
  return Buffer.from(await doc.save());
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
// 📄 the files for every version that does not have them yet (a PDF and a spreadsheet in Project documents, one version each).
//    Safe to run again: a version is only marked done once both files are in; a failure is kept on the version so it shows.
export async function files(core, plan, by, setPlan) {
  const H = (await kv.get('baserev:' + core).catch(() => null)) || { list: [] }, todo = H.list.filter((x) => !x.files || !x.files.csv || !x.files.pdf);
  if (!todo.length) return { done: 0 };
  const job = await J.find(core).catch(() => null), I = await import('./plan-intel.mjs'), out = [];
  let lastCsv = H.csv || '', lastPdf = H.pdf || '';
  for (const snap of todo.slice(0, 2)) {   // two at a time, so a request stays quick; the rest on the next call
    const prev = H.list.find((x) => x.v === snap.v - 1) || null, R = rows(plan, snap, prev), f = { ...(snap.files || {}) }, errs = [];
    const note = 'Baseline v' + snap.v + ': finish ' + dmy(snap.finish) + ', budget ' + $(snap.BAC) + (prev ? ' (' + (days(prev.finish, snap.finish) >= 0 ? '+' : '') + days(prev.finish, snap.finish) + ' days, ' + (snap.BAC - prev.BAC >= 0 ? '+' : '') + $(snap.BAC - prev.BAC) + ' from v' + prev.v + ')' : '') + (snap.cr ? '. Approved through ' + snap.cr : snap.direct ? '. Committed straight (change control off)' : '') + (snap.why ? '. Why: ' + snap.why : '');
    const text = csv(plan, job, snap.v, snap, prev, R);
    if (!f.csv) try { const a = await I.upload(core, { name: 'Baseline.csv', title: 'Project baseline v' + snap.v + ' (spreadsheet)', type: 'text/csv', text, file: Buffer.from('\ufeff' + text).toString('base64'), size: text.length, folder: 'plans', status: 'Approved', replaces: lastCsv || undefined, vnote: note, version: snap.v, kind: 'Baseline', tags: ['Baseline', 'v' + snap.v, 'CSV'].concat(snap.cr ? [snap.cr] : []) }, by);
      if (a && a.doc) { f.csv = a.doc.id; lastCsv = a.doc.id; } else errs.push('spreadsheet: ' + ((a && a.error) || 'not saved')); } catch (e) { errs.push('spreadsheet: ' + e.message); }
    if (!f.pdf) try { const buf = await pdf(plan, job, snap.v, snap, prev, R);
      const b = await I.upload(core, { name: 'Baseline.pdf', title: 'Project baseline v' + snap.v + ' (PDF)', type: 'application/pdf', text: text.slice(0, 20000), file: buf.toString('base64'), size: buf.length, folder: 'plans', status: 'Approved', replaces: lastPdf || undefined, vnote: note, version: snap.v, kind: 'Baseline', tags: ['Baseline', 'v' + snap.v, 'PDF'].concat(snap.cr ? [snap.cr] : []) }, by);
      if (b && b.doc) { f.pdf = b.doc.id; lastPdf = b.doc.id; } else errs.push('PDF: ' + ((b && b.error) || 'not saved')); } catch (e) { errs.push('PDF: ' + e.message); }
    f.err = errs.join('; ') || undefined; f.at = Date.now();
    await kv.update('baserev:' + core, (x) => ({ ...(x || {}), csv: lastCsv, pdf: lastPdf, list: ((x && x.list) || []).map((y) => (y.v === snap.v ? { ...y, files: f } : y)) }), () => ({ list: [] }));
    out.push({ v: snap.v, ok: !!(f.csv && f.pdf), err: f.err || '' });
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
