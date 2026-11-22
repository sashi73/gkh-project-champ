// 🔒 The Finance vault: contracts, billing, invoices and commercial documents, filed like a directory: Program → Project → folder.
//   Who opens it: the super user, the CEO, the CFO, and the program director named on that project's program. No one else.
//   Who files: the CFO (and the super user) into any folder; a project manager or director into Contracts and Documents only.
//   A file from someone who cannot open the vault gets a redacted copy (money, rates, bank and tax numbers, contact details
//   blacked out) in the project's own documents, so the team still has it; the original stays here.
//   Files: R2 under vault/<core>/ (private, signed links), or kept here up to 3.5 MB. Index: vault:<core>. Text: vaulttext:<core>:<id>.
import * as kv from './kv.mjs';
import * as J from './jobs.mjs';
import * as P from './plan.mjs';
import * as PG from './programs.mjs';

export const FOLDERS = [['contracts', '📜 Contracts'], ['billing', '💵 Billing'], ['invoices', '🧾 Invoices'], ['documents', '🗂 Documents']];
const FK = new Set(FOLDERS.map((f) => f[0]));
const PM_FOLDERS = ['contracts', 'documents'];
const str = (s, n = 300) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const MAX_FILE = 3.5 * 1024 * 1024, MAX_TEXT = 400000;

// ---------- who may do what ----------
export const isFinance = (ctx) => !!ctx && !ctx.scope && (ctx.owner || ctx.role === 'CEO' || ctx.role === 'CFO' || ctx.role === 'PMO Director');
const isPM = (ctx) => !!ctx && (!ctx.scope || !!(ctx.pgm && ctx.pgm.kind === 'project')) && ctx.role === 'Project manager';   // a Project manager files on their own projects (the request's project is checked first)
async function programOf(core) { const j = await J.find(core).catch(() => null); if (!j) return null; const L = await PG.list(); return L.find((p) => p.name === (j.program || '')) || null; }
export async function canView(ctx, core, prog) { if (isFinance(ctx)) return true; if (!ctx || ctx.scope || !ctx.uid) return false; const p = prog === undefined ? await programOf(core) : prog; return !!(p && p.director && p.director === ctx.uid); }
export function canFile(ctx, folder, viewer) { if (!ctx || (ctx.scope && !isPM(ctx))) return false; if (ctx.owner || ctx.role === 'CFO') return true; return (isPM(ctx) || viewer) && PM_FOLDERS.includes(folder); }

// ---------- 🖍 redaction: money, rates, bank and tax numbers, cards, emails and phone numbers ----------
const CUR = '(?:A\\$|US\\$|S\\$|NZ\\$|RM|AUD|USD|SGD|MYR|NZD|IDR|Rp|EUR|GBP|INR|AED|SAR|[$€£¥₹])';
const RULES = [
  [new RegExp(CUR + '\\s?\\d[\\d,]*(?:\\.\\d+)?(?:\\s?(?:k|m|mil|million|bn|billion))?(?:\\s?(?:\\/|per)\\s?(?:h|hr|hour|day|week|month|m2|m²|unit|each))?', 'gi'), 'amount'],
  [/\b\d[\d,]*(?:\.\d+)?\s?(?:dollars|ringgit|rupiah|euros?|pounds|rupees|AUD|USD|SGD|MYR|NZD|EUR|GBP)\b/gi, 'amount'],
  [/\b(?:BSB|IBAN|SWIFT|BIC|sort code|routing(?: number)?|account (?:no\.?|number|#)|acc(?:t)?\.? ?(?:no\.?|#))\s*[:#]?\s*[A-Z0-9][A-Z0-9 -]{3,33}/gi, 'bank details'],
  [/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, 'bank details'],
  [/\b(?:ABN|ACN|TFN|GST(?: no\.?| number)?|SST(?: no\.?)?|NPWP|VAT(?: no\.?| number)?|tax (?:file )?(?:no\.?|number|id))\s*[:#]?\s*[\dA-Z][\dA-Z .-]{5,20}\d/gi, 'tax number'],
  [/\b(?:\d[ -]?){13,19}\b/g, 'card or account number'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, 'email'],
  [/(?:\+\d{1,3}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?\d{2,4}[\s-]\d{3,4}[\s-]\d{3,4}\b/g, 'phone'],
];
export function redact(text, extra = []) {
  let t = String(text || ''), n = 0;
  for (const s of extra) { const x = String(s || '').trim(); if (x.length >= 3 && x.length <= 200) { const k = t.split(x).length - 1; if (k) { n += k; t = t.split(x).join('[REDACTED]'); } } }
  for (const [re, what] of RULES) t = t.replace(re, () => { n++; return '[REDACTED: ' + what + ']'; });
  return { text: t, count: n };
}
// the AI finds what the rules cannot (amounts in words, payment terms, retention, damages, personal details); the rules then run as well
export async function redactAi(text) {
  const AI = await import('./ai.mjs');
  if (!AI.llmSetup()) return redact(text);
  try {
    await AI.checkLimit();
    const r = await AI.llmJson([{ role: 'system', content: 'You redact commercial documents before a project team sees them. List, exactly as written in the text, every piece of financial or sensitive information: contract sums, prices, rates, fees, amounts written in words, payment terms with amounts, retention, liquidated damages amounts, bank and payment details, tax numbers, personal addresses, personal phone numbers and emails, ID numbers and signatures. Do not list company names, scope, dates or clause headings. JSON only: {"redact":["exact text", ...]}' },
      { role: 'user', content: String(text).slice(0, 24000) }], { maxTokens: 1200, timeoutMs: 90000 });
    const L = (r && r.data && Array.isArray(r.data.redact) ? r.data.redact : []).map((x) => String(x)).filter((x) => x.length >= 3).slice(0, 400);
    await AI.usage(true, r.used || 0).catch(() => {});
    return redact(text, L);
  } catch (e) { return redact(text); }
}
async function redactedPdf(title, text) {
  const { pdfLib } = await import('./pdf.mjs'), { PDFDocument, StandardFonts, rgb } = await pdfLib();
  const doc = await PDFDocument.create(), font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const safe = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '');
  const W = 595, H = 842, M = 50, size = 9.5, lh = 13, wmax = W - 2 * M;
  let page = null, y = 0;
  const head = () => { page = doc.addPage([W, H]); y = H - M; page.drawRectangle({ x: 0, y: H - 30, width: W, height: 30, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('REDACTED COPY - financial and sensitive details removed. The original is in the Finance vault.', { x: M, y: H - 20, size: 9, font: bold, color: rgb(1, 0.85, 0.3) }); y = H - 50; };
  head(); page.drawText(safe(title).slice(0, 90), { x: M, y, size: 13, font: bold }); y -= 22;
  for (const para of safe(text).split('\n')) {
    const words = para.split(/(\s+)/); let line = '';
    const flush = () => { if (y < M) head();
      let x = M; for (const part of line.split(/(\[REDACTED[^\]]*\])/)) { if (!part) continue; const red = /^\[REDACTED/.test(part), w = font.widthOfTextAtSize(part, size);
        if (red) page.drawRectangle({ x: x - 1, y: y - 2, width: w + 2, height: lh - 2, color: rgb(0, 0, 0) }); else page.drawText(part, { x, y, size, font }); x += w; }
      y -= lh; line = ''; };
    for (const w of words) { if (font.widthOfTextAtSize(line + w, size) > wmax && line.trim()) flush(); line += w; }
    flush();
  }
  return Buffer.from(await doc.save());
}
// the team's copy: a redacted document in the project's own documents (Contracts and commercial, or Other)
async function teamCopy(core, f, text, by) {
  const I = await import('./plan-intel.mjs'), R = redact(text), name = 'REDACTED ' + f.name.replace(/\.[a-z0-9]+$/i, '') + '.pdf';
  const r = await I.upload(core, { name, type: 'application/pdf', text: R.text || '(no readable text)', kind: f.folder === 'contracts' ? 'Contract' : 'Document', folder: f.folder === 'contracts' ? 'contracts' : 'other', tags: ['redacted'], allowEmpty: true }, by);
  if (r.error || !r.doc) return { error: r.error };
  const pdf = await redactedPdf(f.name, R.text || '').catch(() => null);
  if (pdf && pdf.length <= MAX_FILE) { await kv.putFile(`pdocfile:${core}:${r.doc.id}`, pdf, { name, type: 'application/pdf' }); await kv.update('pdocs:' + core, (x) => { (x.docs || []).forEach((y) => { if (y.id === r.doc.id) { y.hasFile = true; y.size = pdf.length; y.vault = f.id; } }); return x; }, () => ({ docs: [] })); }
  return { id: r.doc.id, count: R.count };
}

// 🖍 the AI pass, in the background after an upload: it finds what the rules missed, and the team's copy is redone
export async function refine(core, id) {
  const f = (await files(core)).find((x) => x.id === id); if (!f || !f.copy) return { error: 'Nothing to redact.' };
  const t = await kv.get(`vaulttext:${core}:${id}`).catch(() => null); if (!t || !t.text) return { error: 'No text.' };
  const R = await redactAi(t.text), pdf = await redactedPdf(f.name, R.text).catch(() => null);
  await kv.set(`pdoctext:${core}:${f.copy}`, { text: R.text });
  if (pdf && pdf.length <= MAX_FILE) await kv.putFile(`pdocfile:${core}:${f.copy}`, pdf, { name: 'REDACTED ' + f.name.replace(/\.[a-z0-9]+$/i, '') + '.pdf', type: 'application/pdf' });
  await kv.update('vault:' + core, (x) => { (x.files || []).forEach((y) => { if (y.id === id) y.redactedAi = Date.now(); }); return x; }, () => ({ files: [] }));
  return { ok: true, count: R.count };
}

// ---------- the index ----------
async function files(core) { return ((await kv.get('vault:' + core)) || { files: [] }).files || []; }
export async function tree(ctx) {
  const [programs, plans, jobs] = await Promise.all([PG.list(), P.list(), J.all()]), jb = Object.fromEntries(jobs.map((j) => [j.core, j]));
  const out = [];
  for (const g of programs) {
    const viewer = isFinance(ctx) || (!!ctx.uid && g.director === ctx.uid);
    const projects = [];
    for (const p of plans.filter((x) => ((jb[x.core] || {}).program || '') === g.name)) {
      if (ctx.scope && !ctx.scope.includes(p.core)) continue;
      const fileable = FOLDERS.map((f) => f[0]).filter((f) => canFile(ctx, f, viewer));
      if (!viewer && !fileable.length) continue;
      const L = viewer ? await files(p.core) : [];
      projects.push({ core: p.core, ref: jb[p.core] ? J.refFor(jb[p.core]) : p.core, name: p.name, view: viewer, file: fileable, counts: Object.fromEntries(FOLDERS.map((f) => [f[0], L.filter((x) => x.folder === f[0]).length])) });
    }
    if (projects.length) out.push({ id: g.id, key: g.key || '', name: g.name, color: g.color || '', director: g.director || '', view: viewer, projects });
  }
  return { programs: out, folders: FOLDERS, finance: isFinance(ctx), canMove: !!(ctx.owner || ctx.role === 'CFO') };
}
export async function list(ctx, core) {
  if (!(await canView(ctx, core))) return { error: 'Only the CEO, the CFO, the program director and the super user can open this.', code: 403 };
  const L = await files(core), ACC = await import('./accounts.mjs'), x = await ACC.index().catch(() => ({ invoices: {}, quotes: {} }));
  const champ = Object.values(x.invoices || {}).filter((i) => i.core === core && i.status !== 'void').map((i) => ({ id: i.id, folder: 'invoices', name: 'Tax invoice ' + i.id, champ: 'invoice', at: Date.parse(i.issued || '') || i.updated || 0, by: 'Champ', inc: i.inc, status: i.status, balance: i.balance }))
    .concat(Object.values(x.quotes || {}).filter((q) => q.core === core && q.status !== 'void').map((q) => ({ id: q.id, folder: 'contracts', name: 'Quote ' + q.id + (q.status === 'accepted' ? ' (accepted)' : ''), champ: 'quote', at: Date.parse(q.issued || '') || q.updated || 0, by: 'Champ', inc: q.inc, status: q.status })));
  return { files: L.map((f) => ({ ...f, text: undefined })).concat(champ).sort((a, b) => (b.at || 0) - (a.at || 0)) };
}
export async function add(ctx, body, by) {
  const core = str(body.core, 40), folder = FK.has(body.folder) ? body.folder : '';
  const plan = await P.get(core); if (!plan) return { error: 'That project is not there any more.', code: 404 };
  const viewer = await canView(ctx, core);
  if (!folder || !canFile(ctx, folder, viewer)) return { error: 'You can file into ' + (isPM(ctx) ? 'Contracts and Documents only.' : 'the vault only as the CFO or the super user.'), code: 403 };
  const id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name = str(body.name, 160).replace(/[\\/]/g, '-') || 'document';
  let r2 = '', hasFile = false;
  if (body.r2Key) { const R2 = await import('./r2.mjs'); if (R2.ready() && R2.keyOk(String(body.r2Key), `vault/${core}/`)) { r2 = String(body.r2Key); hasFile = true; } }
  if (!hasFile && body.file) { const buf = Buffer.from(String(body.file), 'base64'); if (buf.length && buf.length <= MAX_FILE) { await kv.putFile(`vaultfile:${core}:${id}`, buf, { name, type: str(body.type, 100) }); hasFile = true; } }
  const text = String(body.text || '').slice(0, MAX_TEXT);
  if (!hasFile && !text.trim()) return { error: 'The file could not be kept. Try again.', code: 400 };
  if (text.trim()) await kv.set(`vaulttext:${core}:${id}`, { text });
  const f = { id, folder, name, type: str(body.type, 100), size: Math.max(0, Number(body.size) || 0), r2: r2 || undefined, hasFile, at: Date.now(), by: str(by, 80), byName: str(ctx.name || '', 80), role: ctx.owner ? 'Super user' : ctx.role, note: str(body.note, 300) };
  await kv.update('vault:' + core, (x) => ({ files: (x.files || []).concat([f]) }), () => ({ files: [] }));
  let copy = null;
  if (!viewer && text.trim()) { copy = await teamCopy(core, f, text, by).catch((e) => ({ error: e.message })); if (copy && copy.id) await kv.update('vault:' + core, (x) => { (x.files || []).forEach((y) => { if (y.id === id) y.copy = copy.id; }); return x; }, () => ({ files: [] })); }
  return { ok: true, file: f, copy, viewer };
}
export async function file(ctx, core, id) {
  if (!(await canView(ctx, core))) return { error: 'Only the CEO, the CFO, the program director and the super user can open this.', code: 403 };
  const f = (await files(core)).find((x) => x.id === id); if (!f) return { error: 'File not found', code: 404 };
  if (f.r2) { const R2 = await import('./r2.mjs'); const url = R2.presign('GET', f.r2, { expires: 300, download: f.name }); if (url) return { name: f.name, url }; }
  const b = await kv.getFile(`vaultfile:${core}:${id}`); if (b) return { name: f.name, type: f.type || 'application/octet-stream', file: b.buf.toString('base64') };
  const t = await kv.get(`vaulttext:${core}:${id}`); if (t) return { name: f.name + '.txt', type: 'text/plain', file: Buffer.from(t.text).toString('base64') };
  return { error: 'The file is not there any more.', code: 404 };
}
export async function remove(ctx, core, id) {
  if (!(ctx.owner || ctx.role === 'CFO')) return { error: 'Only the CFO or the super user can delete from the vault.', code: 403 };
  const f = (await files(core)).find((x) => x.id === id); if (!f) return { error: 'File not found', code: 404 };
  if (f.r2) { const R2 = await import('./r2.mjs'); await R2.del(f.r2).catch(() => {}); }
  await Promise.all([kv.del(`vaultfile:${core}:${id}`), kv.del(`vaulttext:${core}:${id}`)].map((p) => p.catch(() => {})));
  await kv.update('vault:' + core, (x) => ({ files: (x.files || []).filter((y) => y.id !== id) }), () => ({ files: [] }));
  return { ok: true };
}
export async function uploadUrl(ctx, body) {
  const core = str(body.core, 40), folder = FK.has(body.folder) ? body.folder : '';
  if (!(await P.get(core))) return { error: 'That project is not there any more.', code: 404 };
  if (!folder || !canFile(ctx, folder, await canView(ctx, core))) return { error: 'You cannot file into that folder.', code: 403 };
  const R2 = await import('./r2.mjs'); if (!R2.ready()) return { r2: false };
  const key = `vault/${core}/${Date.now().toString(36)}-${str(body.name, 100).replace(/[^\w.-]+/g, '_')}`;
  return { r2: true, key, url: R2.presign('PUT', key, { expires: 900 }) };
}
// 📦 the contracts and invoices already in the project folders move into the vault; the team keeps a redacted copy
export async function moveIn(ctx, by) {
  if (!(ctx.owner || ctx.role === 'CFO')) return { error: 'Only the CFO or the super user can move files into the vault.', code: 403 };
  const I = await import('./plan-intel.mjs'), plans = await P.list(); let moved = 0;
  for (const p of plans) {
    const docs = (await I.docList(p.core)).filter((d) => d.folder === 'contracts' && !(d.tags || []).includes('redacted') && !d.vault);
    for (const d of docs) {
      const id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t = await kv.get(`pdoctext:${p.core}:${d.id}`).catch(() => null), text = (t && t.text) || '';
      const old = await kv.getFile(`pdocfile:${p.core}:${d.id}`).catch(() => null);
      if (old) await kv.putFile(`vaultfile:${p.core}:${id}`, old.buf, { name: d.name, type: d.type || '' });
      if (text) await kv.set(`vaulttext:${p.core}:${id}`, { text });
      const f = { id, folder: /invoice/i.test(d.kind + ' ' + d.name) ? 'invoices' : 'contracts', name: d.name, type: d.type || '', size: d.size || 0, r2: d.r2 || undefined, hasFile: !!(d.r2 || old), at: d.at || Date.now(), by: d.by || '', byName: '', role: 'moved from the project documents', copy: d.id };
      await kv.update('vault:' + p.core, (x) => ({ files: (x.files || []).concat([f]) }), () => ({ files: [] }));
      // the project's copy becomes the redacted one (its own file, not the original)
      const R = redact(text), pdf = await redactedPdf(d.name, R.text).catch(() => null), nm = 'REDACTED ' + d.name.replace(/\.[a-z0-9]+$/i, '') + '.pdf';
      await kv.set(`pdoctext:${p.core}:${d.id}`, { text: R.text });
      if (pdf && pdf.length <= MAX_FILE) await kv.putFile(`pdocfile:${p.core}:${d.id}`, pdf, { name: nm, type: 'application/pdf' }); else await kv.del(`pdocfile:${p.core}:${d.id}`).catch(() => {});
      await kv.del(`pdocai:${p.core}:${d.id}`).catch(() => {});
      await kv.update('pdocs:' + p.core, (x) => { (x.docs || []).forEach((y) => { if (y.id === d.id) Object.assign(y, { name: nm, type: 'application/pdf', r2: undefined, hasFile: !!pdf, size: pdf ? pdf.length : 0, tags: (y.tags || []).concat(['redacted']).slice(0, 8), vault: id }); }); return x; }, () => ({ docs: [] }));
      moved++;
    }
  }
  return { ok: true, moved };
}

// 🔎 the library: every document this login may open, across programs and projects, searched by name, project, program and the words inside
export async function search(ctx, body) {
  const T = await tree(ctx), q = String(body.q || '').toLowerCase().trim().slice(0, 120), folder = FK.has(body.folder) ? body.folder : '', prog = String(body.program || ''), core0 = String(body.core || '');
  const words = [...new Set(q.match(/[\p{L}\p{N}$.,-]{2,}/gu) || [])].slice(0, 10);
  const viewable = [], fileable = [];
  for (const g of T.programs) for (const p of g.projects) { const x = { core: p.core, ref: p.ref, project: p.name, program: g.name, programId: g.id, color: g.color, folders: p.file }; if (p.view) viewable.push(x); if (p.file.length) fileable.push(x); }
  const scope = viewable.filter((p) => (!prog || String(p.programId) === prog) && (!core0 || p.core === core0));
  const idx = await kv.getMany(scope.map((p) => 'vault:' + p.core)), ACC = await import('./accounts.mjs'), ai = await ACC.index().catch(() => ({ invoices: {}, quotes: {} }));
  let rows = [];
  scope.forEach((p, i) => {
    for (const f of ((idx[i] && idx[i].files) || [])) rows.push({ id: f.id, core: p.core, project: p.project, program: p.program, color: p.color, ref: p.ref, folder: f.folder, name: f.name, type: f.type || '', size: f.size || 0, at: f.at, by: f.byName || f.by || '', role: f.role || '', copy: !!f.copy, note: f.note || '' });
    for (const inv of Object.values(ai.invoices || {})) if (inv.core === p.core && inv.status !== 'void') rows.push({ id: inv.id, champ: 'invoice', core: p.core, project: p.project, program: p.program, color: p.color, ref: p.ref, folder: 'invoices', name: 'Tax invoice ' + inv.id, at: Date.parse(inv.issued || '') || inv.updated || 0, by: 'Champ', inc: inv.inc, status: inv.status, balance: inv.balance });
    for (const qt of Object.values(ai.quotes || {})) if (qt.core === p.core && qt.status !== 'void') rows.push({ id: qt.id, champ: 'quote', core: p.core, project: p.project, program: p.program, color: p.color, ref: p.ref, folder: 'contracts', name: 'Quote ' + qt.id + (qt.status === 'accepted' ? ' (accepted)' : ''), at: Date.parse(qt.issued || '') || qt.updated || 0, by: 'Champ', inc: qt.inc, status: qt.status });
  });
  const counts = Object.fromEntries(FOLDERS.map((f) => [f[0], 0])); for (const r of rows) counts[r.folder] = (counts[r.folder] || 0) + 1;
  if (folder) rows = rows.filter((r) => r.folder === folder);
  if (words.length) {
    const texts = await kv.getMany(rows.map((r) => (r.champ ? 'none:x' : `vaulttext:${r.core}:${r.id}`))).catch(() => []);
    rows = rows.map((r, i) => {
      const head = (r.name + ' ' + r.project + ' ' + r.program + ' ' + r.ref + ' ' + (r.note || '') + ' ' + (r.by || '')).toLowerCase(), body = String((texts[i] && texts[i].text) || '');
      const low = body.toLowerCase(); let sc = 0, hit = '';
      for (const w of words) { if (head.includes(w)) sc += 3; const k = low.split(w).length - 1; if (k) { sc += 1 + Math.log(1 + k); if (!hit) { const at = low.indexOf(w); hit = body.slice(Math.max(0, at - 90), at + 160).replace(/\s+/g, ' ').trim(); } } }
      return sc ? { ...r, score: sc, snippet: hit } : null; }).filter(Boolean).sort((a, b) => b.score - a.score || (b.at || 0) - (a.at || 0));
  } else rows.sort((a, b) => (b.at || 0) - (a.at || 0));
  return { rows: rows.slice(0, 300), total: rows.length, counts, folders: FOLDERS, programs: T.programs.filter((g) => g.view).map((g) => ({ id: g.id, name: g.name, color: g.color })), projects: viewable.map((p) => ({ core: p.core, name: p.project, programId: p.programId })),
    fileable, finance: T.finance, canDelete: T.canMove, canMove: T.canMove };
}
