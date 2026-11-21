// 🧱 BOM revisions: every signed-off Bill of Materials is kept as a version. The first sign-off is v0 (the materials baseline:
// the budget for materials); every later change to a signed-off BOM is v1, v2 … The current revision is the actual material price,
// so it flows into the actual cost (AC), the costing and CPI. Each version is filed in Project documents (BOM.csv, one version
// per revision), summarised for the project manager, the CFO and the CEO (a note in their Today), and recorded in Lessons learned.
import * as kv from './kv.mjs';
import * as J from './jobs.mjs';
import * as P from './plan.mjs';

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
  const head = [['Bill of Materials (BOM)'], ['Project', plan.name], ['Reference', job ? J.refFor(job) : plan.core], ['Version', 'v' + v + (v === 0 ? ' (baseline)' : '')], ['Date', new Date(at).toISOString().slice(0, 10)], ['Signed off by', (plan.bom && plan.bom.signedBy) || by],
    ['Total (before tax)', $(total)], ...(v ? [['Change from v' + (v - 1), (total - prevTotal >= 0 ? '+' : '') + $(total - prevTotal) + (prevTotal ? ' (' + (Math.round((total - prevTotal) / prevTotal * 1000) / 10) + '%)' : '')]] : []), []];
  const T = Object.fromEntries((plan.tasks || []).map((t, i) => [t.id, '#' + (i + 1) + ' ' + t.name]));
  const rows = [['Item', 'Unit', 'Quantity', 'Unit price', 'Amount', 'Task', ...(v ? ['Previous unit price', 'Previous quantity', 'Change'] : [])]].concat(lines.map((l) => { const o = prevById[l.id];
    return [l.name, l.unit, l.qty, r2(l.price).toFixed(2), amt(l).toFixed(2), T[l.task] || '', ...(v ? [o ? r2(o.price).toFixed(2) : 'new', o ? o.qty : 'new', o ? (amt(l) - amt(o)).toFixed(2) : amt(l).toFixed(2)] : [])]; }));
  const gone = changes.filter((c) => c.kind === 'removed').map((c) => [c.name + ' (removed)', '', 0, '0.00', '0.00', '', r2(c.oldPrice).toFixed(2), c.oldQty, r2(c.delta).toFixed(2)]);
  return head.concat(rows, gone).map((r) => r.map(csvQ).join(',')).join('\r\n');
}
function synopsis(v, total, prevTotal, changes) {
  if (v === 0) return 'BOM v0 signed off: the materials baseline is ' + $(total) + '.';
  const d = total - prevTotal, pc = prevTotal ? Math.round(d / prevTotal * 1000) / 10 : 0, top = changes.slice(0, 4).map((c) => c.name + (c.kind === 'added' ? ' added ' + $(c.delta) : c.kind === 'removed' ? ' removed ' + $(c.delta) : ' ' + (c.oldPrice !== c.newPrice ? $(c.oldPrice) + ' → ' + $(c.newPrice) + ' each' : 'qty ' + c.oldQty + ' → ' + c.newQty) + ' (' + (c.delta >= 0 ? '+' : '') + $(c.delta) + ')'));
  return 'BOM v' + v + ': ' + changes.length + ' change' + (changes.length === 1 ? '' : 's') + ', materials ' + (d >= 0 ? '+' : '') + $(d) + ' (' + (d >= 0 ? '+' : '') + pc + '%) to ' + $(total) + '. ' + top.join('; ') + (changes.length > 4 ? '; and ' + (changes.length - 4) + ' more' : '') + '. This changes the actual cost, the costing and CPI.';
}

// after a plan is saved: if its signed-off BOM differs from the last version, record a new one. Returns the plan saved again
// (with the baseline, the revision list, the lesson and the note), or null when nothing changed.
export async function check(core, plan, by, save) {
  const bom = plan && plan.bom; if (!bom || bom.status !== 'Signed off' || !(bom.lines || []).length) return null;
  const lines = bom.lines.map(pick), H = (await kv.get('bomrev:' + core).catch(() => null)) || { list: [], docId: '' }, last = H.list[H.list.length - 1] || null;
  const changes = last ? diff(last.lines, lines) : [];
  if (last && !changes.length) return null;
  const v = last ? last.v + 1 : 0, at = Date.now(), total = r2(lines.reduce((a, l) => a + amt(l), 0)), prevTotal = last ? last.total : 0, prevById = last ? Object.fromEntries(last.lines.map((l) => [l.id, l])) : {};
  const job = await J.find(core).catch(() => null), syn = synopsis(v, total, prevTotal, changes);
  // 📄 the version in Project documents
  let docId = H.docId;
  try { const I = await import('./plan-intel.mjs'), text = csv(plan, job, v, at, by, lines, prevById, changes, total, prevTotal);
    const r = await I.upload(core, { name: 'BOM.csv', title: 'Bill of Materials (BOM) v' + v, type: 'text/csv', text, file: Buffer.from('﻿' + text).toString('base64'), size: text.length, folder: 'contracts', status: 'Approved', replaces: H.docId || undefined, vnote: syn, version: v, kind: 'BOM', tags: ['BOM', 'v' + v] }, by);
    if (r && r.doc) { docId = r.doc.id; const D = await import('./dms.mjs'); await D.logEvent(core, { act: 'upload', id: r.doc.id, group: r.doc.group || r.doc.id, version: v, by, note: syn.slice(0, 400) }).catch(() => {}); } else if (r && r.error) console.error('BOM version file: ' + r.error); } catch (e) { console.error('BOM version file: ' + e.message); }
  await kv.update('bomrev:' + core, (x) => ({ docId, list: [...((x && x.list) || []), { v, at, by, lines, total }].slice(-60) }), () => ({ list: [] }));
  // the plan: baseline (v0), revision list, lesson and a note for the people who need to know
  const p = JSON.parse(JSON.stringify(plan));
  if (v === 0 || !p.bomBase) { const byTask = {}; for (const l of lines) if (l.task) byTask[l.task] = r2((byTask[l.task] || 0) + amt(l)); p.bomBase = { v, at, total, byTask }; }
  p.bomRevs = [...(p.bomRevs || []), { v, at, by, total, delta: r2(total - prevTotal), pct: prevTotal ? Math.round((total - prevTotal) / prevTotal * 1000) / 10 : 0, n: changes.length, syn, top: changes.slice(0, 6) }].slice(-60);
  if (v > 0) p.lessons = [...(p.lessons || []), { id: 'l' + at.toString(36), title: 'BOM revision v' + v + ': materials ' + (total - prevTotal >= 0 ? '+' : '') + $(total - prevTotal), category: 'Procurement', impact: total - prevTotal > 0 ? 'negative' : 'positive',
    what: syn, cause: 'Material price or quantity changes recorded in the signed-off BOM (' + changes.map((c) => c.name + ': ' + c.kind).slice(0, 6).join('; ') + ').', rec: total > prevTotal ? 'Lock prices earlier (supplier quotes with validity dates, purchase orders at sign-off) and keep a materials contingency for volatile items.' : 'Record what secured the saving so it can be repeated.', status: 'Draft', reuse: true, source: 'manual', from: 'BOM v' + v, by, at }];
  try { const U = await import('./users.mjs'), us = (await U.list()).filter((u) => u.active !== false), nm = (r) => { const u = us.find((x) => x.role === r); return u ? u.name || u.username : ''; };
    const who = [(p.charter || {}).manager || (job || {}).manager || '', nm('CFO'), nm('CEO')].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
    const at2 = (p.tasks || []).find((t) => t.id === bom.milestone) || (p.tasks || []).find((t) => /Bill of Materials/.test(t.name)) || (p.tasks || [])[0];
    if (at2) { at2.stickies = at2.stickies || []; at2.stickies.push({ id: 'n' + at.toString(36), c: 'B', text: who.map((n) => '@' + n).join(' ') + ' 🧱 ' + syn + ' The BOM v' + v + ' file is in Project documents (Contracts and commercial).', by, at, linked: 'bom:v' + v }); } } catch (e) { console.error('BOM note: ' + e.message); }
  const r = await save(core, p, plan.rev, by);
  return r && !r.conflict ? { plan: r.plan, info: { v, total, delta: r2(total - prevTotal), syn, docId } } : null;
}
export async function history(core) { return ((await kv.get('bomrev:' + core).catch(() => null)) || { list: [] }).list.map((x) => ({ v: x.v, at: x.at, by: x.by, total: x.total, n: x.lines.length })); }
