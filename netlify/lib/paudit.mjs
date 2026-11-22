// GKH Project Champ: 🔏 the project audit trail. Every change to a project: when (Sydney time), who (login, name, role), from where (IP),
// what (the action) and the detail (each field before and after). Append-only and tamper-evident: each entry carries a SHA-256 hash of
// itself and the entry before it, so a changed or removed entry breaks the chain and the check says where.
// Kept per project (paudit:<core>, older entries rolled into paudit:<core>:a<n>), shown in Project documents, downloaded as PDF or CSV.
import { createHash } from 'node:crypto';
import * as kv from './kv.mjs';
import * as J from './jobs.mjs';

const KEEP = 1500, ROLL = 1000;   // entries in the live key; the oldest ROLL move to an archive key when it is full
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const hashOf = (prev, e) => createHash('sha256').update(prev + '|' + JSON.stringify([e.seq, e.at, e.who, e.name, e.role, e.ip, e.kind, e.what, e.lines])).digest('hex');
export const when = (at) => new Date(at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

// ---------- record ----------
export async function record(core, { who, name, role, ip, kind, what, lines }) {
  if (!core || !what) return null;
  const L = (Array.isArray(lines) ? lines : []).map((x) => str(x, 400)).filter(Boolean).slice(0, 60);
  let out = null, roll = null;
  await kv.update('paudit:' + core, (x) => {
    x.log = x.log || []; const last = x.log[x.log.length - 1], prevH = last ? last.h : x.tail || 'genesis';
    const e = { seq: (x.seq || 0) + 1, at: Date.now(), who: str(who, 120), name: str(name, 120), role: str(role, 40), ip: str(ip, 60), kind: str(kind, 40) || 'Project', what: str(what, 300), lines: L };
    e.h = hashOf(prevH, e); x.seq = e.seq; x.log.push(e); out = e;
    if (x.log.length > KEEP) { roll = x.log.slice(0, ROLL); x.log = x.log.slice(ROLL); x.arch = (x.arch || 0) + 1; x.tail = roll[roll.length - 1].h; roll = { n: x.arch, log: roll }; }
    return x;
  }, () => ({ log: [], seq: 0, arch: 0 }));
  if (roll) await kv.set('paudit:' + core + ':a' + roll.n, { log: roll.log });
  return out;
}

// ---------- read and check ----------
export async function all(core) {
  const live = (await kv.get('paudit:' + core)) || { log: [], arch: 0 };
  const parts = []; for (let n = 1; n <= (live.arch || 0); n++) { const a = await kv.get('paudit:' + core + ':a' + n).catch(() => null); if (a && a.log) parts.push(...a.log); }
  return parts.concat(live.log || []);
}
export function verify(log) {
  let prev = 'genesis';
  for (let i = 0; i < log.length; i++) { const e = log[i]; if (e.seq !== i + 1) return { ok: false, at: e.seq, why: 'entry ' + (i + 1) + ' is missing or out of order' }; if (hashOf(prev, e) !== e.h) return { ok: false, at: e.seq, why: 'entry ' + e.seq + ' was changed after it was written' }; prev = e.h; }
  return { ok: true, n: log.length, last: prev };
}

// ---------- what changed in a plan save, in words ----------
const V = (v) => (v == null || v === '' ? '(blank)' : Array.isArray(v) ? (v.length ? v.join(', ') : '(none)') : typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 160));
const nm = (s) => String(s || '').replace(/^[✓◆\s]+/, '').slice(0, 90);
function byId(list) { const o = {}; (Array.isArray(list) ? list : []).forEach((x, i) => { if (x && x.id) o[x.id] = { x, i }; }); return o; }
function fields(label, a, b, keys, out) { for (const [k, lab] of keys) { const x = a ? a[k] : undefined, y = b ? b[k] : undefined; if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null) && !(x == null && (y === '' || y === 0 || (Array.isArray(y) && !y.length))) && !(y == null && (x === '' || x === 0 || (Array.isArray(x) && !x.length)))) out.push(label + ': ' + lab + ' ' + V(x) + ' -> ' + V(y)); } }
function listDiff(kind, A, B, title, keys, out) {
  const a = byId(A), b = byId(B);
  for (const id of Object.keys(b)) if (!a[id]) out.push(kind + ' added: "' + nm(title(b[id].x)) + '"');
  for (const id of Object.keys(a)) if (!b[id]) out.push(kind + ' removed: "' + nm(title(a[id].x)) + '"');
  for (const id of Object.keys(b)) if (a[id]) fields(kind + ' "' + nm(title(b[id].x)) + '"', a[id].x, b[id].x, keys, out);
}
export function planDiff(before, after) {
  const out = []; if (!after) return out; const b = before || {};
  if (!before) { out.push('Plan created: "' + nm(after.name) + '" with ' + (after.tasks || []).length + ' tasks'); return out; }
  fields('Plan', b, after, [['name', 'name'], ['start', 'start'], ['workStart', 'work starts'], ['finishBy', 'finish by'], ['weekends', 'weekends allowed'], ['holidaysOk', 'public holidays allowed'], ['emergency', 'emergency']], out);
  const tn = (t) => '#' + ((after.tasks || []).findIndex((x) => x.id === t.id) + 1 || ((b.tasks || []).findIndex((x) => x.id === t.id) + 1)) + ' ' + nm(t.name);
  const resOf = (t) => (t.res || []).map((r) => (r && (r.name || r.n)) || r).filter((r) => typeof r === 'string');
  const A = (b.tasks || []).map((t) => ({ ...t, resN: resOf(t) })), B = (after.tasks || []).map((t) => ({ ...t, resN: resOf(t) }));
  listDiff('Task', A, B, tn, [['name', 'name'], ['dur', 'days'], ['pred', 'after'], ['snet', 'start no earlier than'], ['status', 'status'], ['pct', '% complete'], ['resN', 'people'], ['lead', 'lead'], ['qty', 'quantity'], ['crew', 'people x'], ['unit', 'unit'], ['rate', 'rate $'], ['actual', 'actual $'], ['priority', 'priority'], ['points', 'points'], ['owner', 'owner']], out);
  const ord = (L) => (L || []).map((t) => t.id).join(','); if (out.every((l) => !/^Task (added|removed)/.test(l)) && ord(b.tasks) !== ord(after.tasks) && (b.tasks || []).length === (after.tasks || []).length) out.push('Tasks reordered');
  const sub = (t) => (t.subs || []).length; for (const t of after.tasks || []) { const o = (b.tasks || []).find((x) => x.id === t.id); if (o && sub(o) !== sub(t)) out.push('Task ' + tn(t) + ': sub-tasks ' + sub(o) + ' -> ' + sub(t)); }
  listDiff('Risk', b.risks, after.risks, (r) => r.title, [['title', 'title'], ['cause', 'cause'], ['p', 'probability'], ['i', 'impact'], ['response', 'response'], ['action', 'action'], ['owner', 'owner'], ['status', 'status']], out);
  listDiff('Issue', b.issues, after.issues, (r) => r.title, [['title', 'title'], ['priority', 'priority'], ['owner', 'owner'], ['due', 'due'], ['status', 'status']], out);
  listDiff('Stakeholder', b.stakeholders, after.stakeholders, (r) => r.name || r.role, [['name', 'name'], ['role', 'role'], ['raci', 'RACI'], ['phone', 'phone'], ['email', 'email']], out);
  listDiff('Phase', b.phases, after.phases, (r) => r.name, [['name', 'name']], out);
  listDiff('Change request', b.changes, after.changes, (c) => 'CR-' + String(c.num).padStart(3, '0') + ' ' + c.title, [['title', 'title'], ['status', 'status']], out);
  listDiff('Contract', b.contracts, after.contracts, (c) => c.type + ' ' + (c.party || ''), [['type', 'type'], ['party', 'party']], out);
  listDiff('Meeting', b.meetings, after.meetings, (m) => m.title, [['title', 'title'], ['date', 'date'], ['status', 'status']], out);
  fields('Charter', b.charter, after.charter, [['objective', 'objective'], ['inScope', 'in scope'], ['outScope', 'out of scope'], ['deliverables', 'deliverables'], ['acceptance', 'acceptance'], ['assumptions', 'assumptions'], ['budget', 'approved budget $'], ['manager', 'manager'], ['customer', 'customer'], ['docVersion', 'version'], ['docStatus', 'status']], out);
  fields('Costing', b.budgetCfg, after.budgetCfg, [['cont', 'contingency %'], ['res', 'management reserve %'], ['margin', 'margin %'], ['gst', 'GST %'], ['ctype', 'contract type'], ['setAmt', 'budget approved $'], ['setBy', 'budget approved by']], out);
  const bl = (p) => (p.baseline ? p.baseline.at : 0); if (bl(b) !== bl(after)) out.push(after.baseline ? 'Baseline set: finish ' + after.baseline.finish + ', budget $' + Math.round(after.baseline.BAC || 0).toLocaleString('en-AU') + (after.baseline.cr ? ' (' + after.baseline.cr + ')' : '') + (after.baseline.why ? '. Why: ' + str(after.baseline.why, 160) : '') : 'Baseline removed');
  const bom = (p) => (p.bom ? p.bom.status + ' / ' + (p.bom.lines || []).length + ' lines' : '');
  if (bom(b) !== bom(after)) out.push('BOM / BOQ: ' + V(bom(b)) + ' -> ' + V(bom(after)));
  else if (after.bom && b.bom) { const pr = (p) => (p.bom.lines || []).map((l) => l.id + ':' + l.qty + '@' + l.price).join('|'); if (pr(b) !== pr(after)) out.push('BOM / BOQ lines changed (quantities or prices)'); }
  return out.slice(0, 60);
}

// ---------- the downloads ----------
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function csv(log, check) {
  const rows = [['Seq', 'When (Sydney)', 'When (UTC)', 'Login', 'Name', 'Role', 'IP', 'Area', 'Action', 'Details', 'Hash']];
  for (const e of log) rows.push([e.seq, when(e.at), new Date(e.at).toISOString(), e.who, e.name, e.role, e.ip, e.kind, e.what, (e.lines || []).join(' | '), e.h]);
  rows.push([]); rows.push(['Integrity check', check.ok ? 'Hash chain intact: all ' + check.n + ' entries verified' : 'BROKEN at entry ' + check.at + ': ' + check.why]);
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
const pdfSafe = (s) => String(s ?? '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[•·]/g, '-').replace(/→/g, '->').replace(/[\r\t]/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');
export async function pdf(log, check, { project, ref, by }) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib'), LOGO = (await import('./logo-png.mjs')).default;
  const doc = await PDFDocument.create(), W = 841.89, H = 595.28, M = 30, INK = rgb(0.08, 0.08, 0.08), GREY = rgb(0.42, 0.41, 0.38), GOLD = rgb(0.79, 0.64, 0.15), PALE = rgb(0.985, 0.97, 0.92), RED = rgb(0.7, 0.14, 0.1), GRN = rgb(0.02, 0.46, 0.28);
  doc.setTitle(pdfSafe('Project audit trail - ' + project)); doc.setAuthor('GKH Project Champ'); doc.setCreator('GKH Project Champ');
  const reg = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold), logo = await doc.embedPng(Buffer.from(LOGO, 'base64'));
  let page, y, pn = 0;
  const tx = (t, x, yy, o = {}) => { const f = o.bold ? bold : reg, z = o.size || 8; let q = pdfSafe(t); if (o.max) while (q.length > 1 && f.widthOfTextAtSize(q, z) > o.max) q = q.slice(0, -2) + '.'; page.drawText(q, { x: o.align === 'right' ? x - f.widthOfTextAtSize(q, z) : x, y: yy, size: z, font: f, color: o.color || INK }); };
  const wrap = (t, w, z = 7.5) => { const out = []; for (const para of pdfSafe(t).split('\n')) { let ln = ''; for (const word of para.split(' ')) { const t2 = ln ? ln + ' ' + word : word; if (reg.widthOfTextAtSize(t2, z) > w && ln) { out.push(ln); ln = word; } else ln = t2; } out.push(ln); } return out; };
  const C = [['#', M], ['When (Sydney)', M + 28], ['Who', M + 118], ['Role', M + 250], ['What', M + 322], ['Details', M + 470]];
  const head = () => { page.drawRectangle({ x: M - 4, y: y - 5, width: W - 2 * M + 8, height: 17, color: INK }); C.forEach(([n, x]) => tx(n, x, y, { bold: true, color: rgb(1, 1, 1) })); y -= 18; };
  const newPage = () => { page = doc.addPage([W, H]); pn++; y = H - M;
    page.drawImage(logo, { x: M, y: y - 26, width: 26, height: 26 }); tx('Project audit trail', M + 34, y - 10, { bold: true, size: 14 });
    tx(project + '  -  ' + ref + '  -  produced ' + when(Date.now()) + ' (Sydney) by ' + by, M + 34, y - 24, { size: 9, color: GREY }); tx('Page ' + pn, W - M, y - 10, { align: 'right', size: 8, color: GREY });
    page.drawLine({ start: { x: M, y: y - 32 }, end: { x: W - M, y: y - 32 }, thickness: 1.2, color: GOLD }); y -= 46; };
  newPage();
  tx(check.ok ? 'Integrity: hash chain intact. All ' + check.n + ' entries verified (SHA-256, each entry sealed with the one before it).' : 'Integrity: CHAIN BROKEN at entry ' + check.at + ' (' + check.why + '). Entries after this point cannot be trusted.', M, y, { bold: true, size: 9.5, color: check.ok ? GRN : RED });
  y -= 13; tx('Entries: ' + log.length + (log.length ? '   First: ' + when(log[0].at) + '   Last: ' + when(log[log.length - 1].at) : '') + (check.ok && check.last ? '   Last seal: ' + check.last.slice(0, 32) + '...' : ''), M, y, { size: 8.5, color: GREY }); y -= 18;
  head();
  log.forEach((e, i) => {
    const det = wrap((e.lines || []).join('\n') || '-', W - M - C[5][1]), what = wrap(e.what, C[5][1] - C[4][1] - 8), who = wrap(e.name ? e.name + ' (' + e.who + ')' : e.who, C[3][1] - C[2][1] - 8);
    const n = Math.max(det.length, what.length, who.length, e.ip ? 2 : 1), h = n * 9.5 + 5;
    if (y - h < M + 14) { newPage(); head(); }
    if (i % 2) page.drawRectangle({ x: M - 4, y: y - h + 9, width: W - 2 * M + 8, height: h, color: PALE });
    tx(String(e.seq), C[0][1], y, { color: GREY }); tx(when(e.at), C[1][1], y);
    who.forEach((l, k) => tx(l, C[2][1], y - k * 9.5)); if (e.ip) tx('IP ' + e.ip, C[2][1], y - who.length * 9.5, { color: GREY, size: 7 });
    tx(e.role || '-', C[3][1], y, { max: C[4][1] - C[3][1] - 8, color: GREY }); what.forEach((l, k) => tx(l, C[4][1], y - k * 9.5, { bold: k === 0 }));
    det.forEach((l, k) => tx(l, C[5][1], y - k * 9.5, { size: 7.5 }));
    y -= h;
  });
  if (!log.length) tx('No changes recorded yet.', M, y, { color: GREY });
  page.drawText(pdfSafe('Kept by GKH Project Champ. Each entry is sealed with a SHA-256 hash of itself and the entry before it; the same check is printed at the top of every download.'), { x: M, y: 14, size: 7, font: reg, color: GREY });
  return Buffer.from(await doc.save());
}
