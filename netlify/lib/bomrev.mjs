// 🧱 BOM revisions: every signed-off Bill of Materials is kept as a version. The first sign-off is v0 (the materials baseline:
// the budget for materials); every later change to a signed-off BOM is v1, v2 … The current revision is the actual material price,
// so it flows into the actual cost (AC), the costing and CPI. Each version is filed in Project documents (BOM.csv, one version
// per revision), summarised for the project manager, the CFO and the CEO (a note in their Today), and recorded in Lessons learned.
import * as kv from './kv.mjs';
import * as J from './jobs.mjs';
import * as P from './plan.mjs';
import LOGO from './logo-png.mjs';
const when = (at) => new Date(at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const safe = (s) => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[•·]/g, '-').replace(/→/g, '->').replace(/[\r\t]/g, ' ').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');
// 📄 the version as a PDF: an A4 landscape schedule (who, when, the total, what changed, every line)
export async function pdfOf(plan, job, v, at, by, lines, prevById, changes, total, prevTotal, syn) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create(), W = 841.89, H = 595.28, M = 32, INK = rgb(0.08, 0.08, 0.08), GREY = rgb(0.42, 0.41, 0.38), GOLD = rgb(0.79, 0.64, 0.15), LINE = rgb(0.88, 0.87, 0.84), RED = rgb(0.7, 0.14, 0.1), GRN = rgb(0.02, 0.46, 0.28);
  pdf.setTitle(safe('BOM / BOQ v' + v + ' - ' + plan.name)); pdf.setAuthor('GKH Project Champ'); pdf.setCreator('GKH Project Champ');
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), logo = await pdf.embedPng(Buffer.from(LOGO, 'base64'));
  let page, y, pn = 0;
  const tx = (s, x, yy, o = {}) => { const f = o.bold ? bold : reg, z = o.size || 8.5; let t = safe(s); if (o.max) while (t.length > 1 && f.widthOfTextAtSize(t, z) > o.max) t = t.slice(0, -2) + '…'.replace('…', '.'); const w = f.widthOfTextAtSize(t, z); page.drawText(t, { x: o.align === 'right' ? x - w : x, y: yy, size: z, font: f, color: o.color || INK }); };
  const T = Object.fromEntries((plan.tasks || []).map((t, i) => [t.id, '#' + (i + 1) + ' ' + t.name]));
  const C = v ? [['#', M, 'l'], ['Item', M + 22, 'l'], ['Unit', 290, 'l'], ['Qty', 360, 'r'], ['Unit price', 435, 'r'], ['Amount', 520, 'r'], ['Task', 532, 'l'], ['Was', 735, 'r'], ['Change', W - M, 'r']] : [['#', M, 'l'], ['Item', M + 22, 'l'], ['Unit', 330, 'l'], ['Qty', 410, 'r'], ['Unit price', 500, 'r'], ['Amount', 600, 'r'], ['Task', 615, 'l']];
  const head = () => { page.drawRectangle({ x: M - 4, y: y - 5, width: W - 2 * M + 8, height: 18, color: INK }); C.forEach(([n, x, a]) => tx(n, x, y, { bold: true, size: 8, color: rgb(1, 1, 1), align: a === 'r' ? 'right' : 'left' })); y -= 20; };
  const newPage = () => { page = pdf.addPage([W, H]); pn++; y = H - M;
    page.drawImage(logo, { x: M, y: y - 26, width: 26, height: 26 }); tx('Bill of Materials and Quantities (BOM / BOQ)  v' + v + (v === 0 ? ' (baseline)' : ''), M + 34, y - 10, { bold: true, size: 14 });
    tx(plan.name + '  ·  ' + (job ? J.refFor(job) : plan.core) + '  ·  ' + when(at), M + 34, y - 24, { size: 9, color: GREY }); tx('Page ' + pn, W - M, y - 10, { align: 'right', size: 8, color: GREY });
    page.drawLine({ start: { x: M, y: y - 32 }, end: { x: W - M, y: y - 32 }, thickness: 1.2, color: GOLD }); y -= 48; if (pn > 1) head(); };
  newPage();
  const facts = [['Version', 'v' + v + (v === 0 ? ' (baseline: the materials budget)' : '')], ['Date and time', when(at) + ' (Sydney)'], ['Recorded by', by], ['Signed off by', ((plan.bom || {}).signedBy || '') + ((plan.bom || {}).signedRole ? ', ' + plan.bom.signedRole : '')], ['Lines', String(lines.length)], ['Total (ex GST)', $(total)]]
    .concat(v ? [['Change from v' + (v - 1), (total - prevTotal >= 0 ? '+' : '') + $(total - prevTotal) + (prevTotal ? ' (' + (Math.round((total - prevTotal) / prevTotal * 1000) / 10) + '%)' : '')]] : []);
  facts.forEach(([k, val], i) => { const col = i % 2, row = Math.floor(i / 2); tx(k, M + col * 390, y - row * 14, { size: 8.5, color: GREY }); tx(val, M + 110 + col * 390, y - row * 14, { size: 9, bold: true, max: 270 }); });
  y -= Math.ceil(facts.length / 2) * 14 + 6;
  if (v) { const words = safe(syn).split(' '); let ln = ''; const out = []; for (const w of words) { const t2 = ln ? ln + ' ' + w : w; if (reg.widthOfTextAtSize(t2, 8.5) > W - 2 * M) { out.push(ln); ln = w; } else ln = t2; } out.push(ln); out.slice(0, 4).forEach((l) => { tx(l, M, y, { size: 8.5, color: GREY }); y -= 11; }); y -= 4; }
  head();
  lines.forEach((l, i) => {
    if (y < M + 30) newPage();
    if (i % 2) page.drawRectangle({ x: M - 4, y: y - 4, width: W - 2 * M + 8, height: 15, color: rgb(0.985, 0.97, 0.92) });
    const o = prevById[l.id], d = o ? amt(l) - amt(o) : amt(l), A = (n) => C.find((c) => c[0] === n)[1];
    tx(String(i + 1), A('#'), y, { color: GREY }); tx(l.name, A('Item'), y, { max: A('Unit') - A('Item') - 8 }); tx(l.unit, A('Unit'), y, { max: 60 });
    tx(String(l.qty), A('Qty'), y, { align: 'right' }); tx($(l.price), A('Unit price'), y, { align: 'right' }); tx($(amt(l)), A('Amount'), y, { align: 'right', bold: true }); tx(T[l.task] || '', A('Task'), y, { max: v ? 150 : W - M - A('Task'), color: GREY });
    if (v) { tx(o ? $(o.price) : 'new', A('Was'), y, { align: 'right', color: GREY }); if (Math.abs(d) > 0.004) tx((d > 0 ? '+' : '') + $(d), W - M, y, { align: 'right', bold: true, color: d > 0 ? RED : GRN }); }
    y -= 15;
  });
  for (const c of changes.filter((x) => x.kind === 'removed')) { if (y < M + 30) newPage(); tx(c.name + ' (removed)', C[1][1], y, { color: GREY }); tx($(c.delta), W - M, y, { align: 'right', bold: true, color: GRN }); y -= 15; }
  if (y < M + 40) newPage();
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.8, color: LINE }); y -= 6;
  tx('Total (ex GST)', C[1][1], y, { bold: true, size: 10 }); tx($(total), C.find((c) => c[0] === 'Amount')[1], y, { bold: true, size: 10, align: 'right' });
  tx('Every version of this BOM / BOQ is kept in Project documents (Contracts and commercial). v0 is the materials baseline; later versions are the actual material prices used for the actual cost, the costing and CPI.', M, M - 8, { size: 7, color: GREY });
  return Buffer.from(await pdf.save());
}

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const $ = (n) => (n < 0 ? '−$' : '$') + Math.abs(r2(n)).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amt = (l) => r2((Number(l.qty) || 0) * (Number(l.price) || 0));
const pick = (l) => ({ id: l.id, name: l.name, unit: l.unit || 'each', qty: Number(l.qty) || 0, price: Number(l.price) || 0, task: l.task || '' });

// what changed between two versions, line by line (price, quantity, added, removed)
export function diff(prev, cur) {
  const A = Object.fromEntries(prev.map((l) => [l.id, l])), B = Object.fromEntries(cur.map((l) => [l.id, l])), out = [];
  for (const l of cur) { const o = A[l.id];
    if (!o) out.push({ id: l.id, name: l.name, kind: 'added', oldQty: 0, newQty: l.qty, oldPrice: 0, newPrice: l.price, delta: amt(l) });
    else if (o.qty !== l.qty || o.price !== l.price) out.push({ id: l.id, name: l.name, kind: o.price !== l.price ? (o.qty !== l.qty ? 'price and quantity' : 'price') : 'quantity', oldQty: o.qty, newQty: l.qty, oldPrice: o.price, newPrice: l.price, delta: r2(amt(l) - amt(o)) }); }
  for (const o of prev) if (!B[o.id]) out.push({ id: o.id, name: o.name, kind: 'removed', oldQty: o.qty, newQty: 0, oldPrice: o.price, newPrice: 0, delta: -amt(o) });
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
const csvQ = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function csv(plan, job, v, at, by, lines, prevById, changes, total, prevTotal) {
  const head = [['Bill of Materials and Quantities (BOM / BOQ)'], ['Project', plan.name], ['Reference', job ? J.refFor(job) : plan.core], ['Version', 'v' + v + (v === 0 ? ' (baseline)' : '')], ['Date and time', when(at) + ' (Sydney)'], ['Signed off by', (plan.bom && plan.bom.signedBy) || by],
    ['Total (before tax)', $(total)], ...(v ? [['Change from v' + (v - 1), (total - prevTotal >= 0 ? '+' : '') + $(total - prevTotal) + (prevTotal ? ' (' + (Math.round((total - prevTotal) / prevTotal * 1000) / 10) + '%)' : '')]] : []), []];
  const T = Object.fromEntries((plan.tasks || []).map((t, i) => [t.id, '#' + (i + 1) + ' ' + t.name]));
  const rows = [['Item', 'Unit', 'Quantity', 'Unit price', 'Amount', 'Task', ...(v ? ['Previous unit price', 'Previous quantity', 'Change'] : [])]].concat(lines.map((l) => { const o = prevById[l.id];
    return [l.name, l.unit, l.qty, r2(l.price).toFixed(2), amt(l).toFixed(2), T[l.task] || '', ...(v ? [o ? r2(o.price).toFixed(2) : 'new', o ? o.qty : 'new', o ? (amt(l) - amt(o)).toFixed(2) : amt(l).toFixed(2)] : [])]; }));
  const gone = changes.filter((c) => c.kind === 'removed').map((c) => [c.name + ' (removed)', '', 0, '0.00', '0.00', '', r2(c.oldPrice).toFixed(2), c.oldQty, r2(c.delta).toFixed(2)]);
  return head.concat(rows, gone).map((r) => r.map(csvQ).join(',')).join('\r\n');
}
function synopsis(v, total, prevTotal, changes) {
  if (v === 0) return 'BOM / BOQ v0 signed off: the materials baseline is ' + $(total) + '.';
  const d = total - prevTotal, pc = prevTotal ? Math.round(d / prevTotal * 1000) / 10 : 0, top = changes.slice(0, 4).map((c) => c.name + (c.kind === 'added' ? ' added ' + $(c.delta) : c.kind === 'removed' ? ' removed ' + $(c.delta) : ' ' + (c.oldPrice !== c.newPrice ? $(c.oldPrice) + ' → ' + $(c.newPrice) + ' each' : 'qty ' + c.oldQty + ' → ' + c.newQty) + ' (' + (c.delta >= 0 ? '+' : '') + $(c.delta) + ')'));
  return 'BOM / BOQ v' + v + ': ' + changes.length + ' change' + (changes.length === 1 ? '' : 's') + ', materials ' + (d >= 0 ? '+' : '') + $(d) + ' (' + (d >= 0 ? '+' : '') + pc + '%) to ' + $(total) + '. ' + top.join('; ') + (changes.length > 4 ? '; and ' + (changes.length - 4) + ' more' : '') + '. This changes the actual cost, the costing and CPI.';
}

// after a plan is saved: if its signed-off BOM differs from the last version, record a new one. Returns the plan saved again
// (with the baseline, the revision list, the lesson and the note), or null when nothing changed.
export async function check(core, plan, by, save) {
  const bom = plan && plan.bom; if (!bom || bom.status !== 'Signed off' || bom.ccPending || !(bom.lines || []).length) return null;   // 🔁 a version only once change control has approved it
  const lines = bom.lines.map(pick), H = (await kv.get('bomrev:' + core).catch(() => null)) || { list: [], docId: '' }, last = H.list[H.list.length - 1] || null;
  const changes = last ? diff(last.lines, lines) : [];
  if (last && !changes.length) return null;
  const v = last ? last.v + 1 : 0, at = Date.now(), total = r2(lines.reduce((a, l) => a + amt(l), 0)), prevTotal = last ? last.total : 0, prevById = last ? Object.fromEntries(last.lines.map((l) => [l.id, l])) : {};
  const job = await J.find(core).catch(() => null), syn = synopsis(v, total, prevTotal, changes);
  // 📄 the version in Project documents
  let docId = H.docId, pdfId = H.pdfId || '';
  try { const I = await import('./plan-intel.mjs'), text = csv(plan, job, v, at, by, lines, prevById, changes, total, prevTotal);
    const r = await I.upload(core, { name: 'BOM-BOQ.csv', title: 'BOM / BOQ v' + v + ' (spreadsheet)', type: 'text/csv', text, file: Buffer.from('﻿' + text).toString('base64'), size: text.length, folder: 'contracts', status: 'Approved', replaces: H.docId || undefined, vnote: syn, version: v, kind: 'BOM', tags: ['BOM', 'BOQ', 'v' + v, 'CSV'] }, by);
    try { const buf = await pdfOf(plan, job, v, at, by, lines, prevById, changes, total, prevTotal, syn);   // 📄 and the same version as a PDF
      const rp = await I.upload(core, { name: 'BOM-BOQ.pdf', title: 'BOM / BOQ v' + v + ' (PDF)', type: 'application/pdf', text: text.slice(0, 20000), file: buf.toString('base64'), size: buf.length, folder: 'contracts', status: 'Approved', replaces: H.pdfId || undefined, vnote: syn, version: v, kind: 'BOM', tags: ['BOM', 'BOQ', 'v' + v, 'PDF'] }, by);
      if (rp && rp.doc) pdfId = rp.doc.id; else if (rp && rp.error) console.error('BOM version PDF: ' + rp.error); } catch (e) { console.error('BOM version PDF: ' + e.message); }
    if (r && r.doc) { docId = r.doc.id; const D = await import('./dms.mjs'); await D.logEvent(core, { act: 'upload', id: r.doc.id, group: r.doc.group || r.doc.id, version: v, by, note: syn.slice(0, 400) }).catch(() => {}); } else if (r && r.error) console.error('BOM version file: ' + r.error); } catch (e) { console.error('BOM version file: ' + e.message); }
  await kv.update('bomrev:' + core, (x) => ({ docId, pdfId, list: [...((x && x.list) || []), { v, at, by, lines, total }].slice(-60) }), () => ({ list: [] }));
  // the plan: baseline (v0), revision list, lesson and a note for the people who need to know
  const p = JSON.parse(JSON.stringify(plan));
  if (v === 0 || !p.bomBase) { const byTask = {}; for (const l of lines) if (l.task) byTask[l.task] = r2((byTask[l.task] || 0) + amt(l)); p.bomBase = { v, at, total, byTask }; }
  p.bomRevs = [...(p.bomRevs || []), { v, at, by, total, delta: r2(total - prevTotal), pct: prevTotal ? Math.round((total - prevTotal) / prevTotal * 1000) / 10 : 0, n: changes.length, syn, top: changes.slice(0, 6) }].slice(-60);
  if (v > 0) p.lessons = [...(p.lessons || []), { id: 'l' + at.toString(36), title: 'BOM revision v' + v + ': materials ' + (total - prevTotal >= 0 ? '+' : '') + $(total - prevTotal), category: 'Procurement', impact: total - prevTotal > 0 ? 'negative' : 'positive',
    what: syn, cause: 'Material price or quantity changes recorded in the signed-off BOM (' + changes.map((c) => c.name + ': ' + c.kind).slice(0, 6).join('; ') + ').', rec: total > prevTotal ? 'Lock prices earlier (supplier quotes with validity dates, purchase orders at sign-off) and keep a materials contingency for volatile items.' : 'Record what secured the saving so it can be repeated.', status: 'Draft', reuse: true, source: 'manual', from: 'BOM v' + v, by, at }];
  try { const U = await import('./users.mjs'), us = (await U.list()).filter((u) => u.active !== false), nm = (r) => { const u = us.find((x) => x.role === r); return u ? u.name || u.username : ''; };
    const who = [(p.charter || {}).manager || (job || {}).manager || '', nm('CFO'), nm('CEO')].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
    const at2 = (p.tasks || []).find((t) => t.id === bom.milestone) || (p.tasks || []).find((t) => /Bill of Materials/.test(t.name)) || (p.tasks || [])[0];
    if (at2) { at2.stickies = at2.stickies || []; at2.stickies.push({ id: 'n' + at.toString(36), c: 'B', text: who.map((n) => '@' + n).join(' ') + ' 🧱 ' + syn + ' BOM / BOQ v' + v + ' (PDF and spreadsheet) is in Project documents (Contracts and commercial).', by, at, linked: 'bom:v' + v }); } } catch (e) { console.error('BOM note: ' + e.message); }
  const r = await save(core, p, plan.rev, by);
  return r && !r.conflict ? { plan: r.plan, info: { v, total, delta: r2(total - prevTotal), syn, docId } } : null;
}
export async function history(core) { return ((await kv.get('bomrev:' + core).catch(() => null)) || { list: [] }).list.map((x) => ({ v: x.v, at: x.at, by: x.by, total: x.total, n: x.lines.length })); }
