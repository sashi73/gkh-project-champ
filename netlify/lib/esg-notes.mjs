// 🗒 sticky notes on an ESG report: ad hoc remarks on a section (Scope 1 & 2, Human rights, Carbon credits…), the same colours as on a project
//  (red urgent, amber semi-urgent, green fine). Kept apart from the report (esgnotes:<id>), so a note never clashes with someone typing in the form.
//  A note that @mentions someone is pushed to them: it shows in their 🎯 Today and on the phone app (myday.mjs reads them with forMe).
import * as kv from './kv.mjs';

export const SECS = ['overview', 'org', 'standards', 'material', 'achieve', 'carbon', 'scope3', 'resources', 'climate', 'workforce', 'rights', 'community', 'board', 'ethics', 'certs', 'avoid', 'credits', 'pricing', 'statement', 'report', 'records'];
export const SEC_NAME = { overview: 'Overview', org: 'Organisation', standards: 'Standards', material: 'Material topics', achieve: 'Achievements', carbon: 'Scope 1 & 2', scope3: 'Scope 3', resources: 'Energy, water & waste', climate: 'Climate risk',
  workforce: 'Workforce & safety', rights: 'Human rights', community: 'Community', board: 'Board', ethics: 'Ethics & risk', certs: 'Certifications', avoid: 'Avoided emissions', credits: 'Carbon credits', pricing: 'Pricing & CBAM', statement: 'Statement', report: 'ESG report', records: 'Records' };
const MAX = 300;
const idOf = (id) => String(id || '').replace(/[^A-Z0-9]/gi, '').slice(0, 24);
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : '');
const key = (id) => 'esgnotes:' + id;

async function entity(id) { return id ? kv.get('esg:' + id) : null; }

export async function list(id) {
  id = idOf(id); if (!(await entity(id))) return { error: 'This reporting entity was not found', code: 404 };
  return { notes: ((await kv.get(key(id))) || { notes: [] }).notes || [] };
}

export async function add(id, body, by) {
  id = idOf(id); const e = await entity(id); if (!e) return { error: 'This reporting entity was not found', code: 404 };
  const text = str(body.text, 1500); if (!text) return { error: 'Write the note first.', code: 400 };
  const sec = SECS.includes(body.sec) ? body.sec : 'overview';
  const n = { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), sec, c: ['R', 'A', 'G'].includes(body.c) ? body.c : 'G', text, by: str(by, 80) || 'Someone', at: Date.now(), done: false, doneBy: '', due: ymd(body.due), editedAt: 0, editedBy: '' };
  const r = await kv.update(key(id), (x) => { x.notes = (x.notes || []).concat([n]); if (x.notes.length > MAX) { const done = x.notes.findIndex((q) => q.done); x.notes.splice(done >= 0 ? done : 0, 1); } return x; }, () => ({ notes: [] }));
  return { note: n, notes: r.notes, name: (e.org || {}).name || '' };
}

// change a note: done (tick or untick), text, colour, due date; or delete it (the writer, or the super user)
export async function set(id, nid, body, ctx, by) {
  id = idOf(id); nid = str(nid, 20); if (!(await entity(id))) return { error: 'This reporting entity was not found', code: 404 };
  let err = null, found = null;
  const r = await kv.update(key(id), (x) => {
    err = null; found = null; x.notes = x.notes || [];
    const i = x.notes.findIndex((q) => q.id === nid); if (i < 0) { err = { error: 'That note is not there any more.', code: 404 }; return x; }
    const n = x.notes[i];
    if (body.del) { if (!(ctx && ctx.owner) && n.by !== by) { err = { error: 'Only the person who wrote a note (or the super user) can delete it.', code: 403 }; return x; } x.notes.splice(i, 1); found = n; return x; }
    if ('done' in body) { n.done = !!body.done; n.doneBy = n.done ? str(by, 80) : ''; }
    if (body.text != null) { const t = str(body.text, 1500); if (!t) { err = { error: 'A note cannot be empty: delete it instead.', code: 400 }; return x; } if (t !== n.text) { n.text = t; n.editedAt = Date.now(); n.editedBy = str(by, 80); } }
    if (['R', 'A', 'G'].includes(body.c) && body.c !== n.c) { n.c = body.c; n.editedAt = Date.now(); n.editedBy = str(by, 80); }
    if ('due' in body) n.due = ymd(body.due);
    found = n; return x;
  }, () => ({ notes: [] }));
  return err || { note: found, notes: r.notes };
}

// 🎯 for Today and the phone app: open notes on ESG reports that @mention this person (isMine tells whether the words after @ are them)
export async function forMe(isMine) {
  const idx = (await kv.get('esg-index')) || { ents: {} }, ids = Object.keys(idx.ents || {}).slice(0, 200);
  if (!ids.length) return [];
  const all = await kv.getMany(ids.map(key)), out = [];
  ids.forEach((id, k) => { const L = (all[k] || {}).notes || [], ent = idx.ents[id] || {};
    L.forEach((n) => { if (!n.done && isMine(n.text)) out.push({ esg: id, entity: ent.name || 'ESG report', note: n }); }); });
  return out;
}
export async function markDone(id, nid, by) { return set(id, nid, { done: true }, null, by); }
