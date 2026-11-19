// Sticky-note #tags: one list for the console (notes, Today), the server (Today) and Champ's help.
// Lean / TPS: a #blocker is the andon (work cannot flow until it is cleared); the rest say what kind of note it is.
// Order = how they sort on Today (most urgent first).
export const TAGS = [
  { id: 'blocker', i: '🚧', c: '#DC2626', n: 'Blocker', m: 'Work cannot move until this is cleared (the andon).' },
  { id: 'issue', i: '❗', c: '#EA580C', n: 'Issue', m: 'Something has gone wrong and needs fixing.' },
  { id: 'decision', i: '⚖️', c: '#7C3AED', n: 'Decision', m: 'A decision is needed from someone.' },
  { id: 'waiting', i: '⏳', c: '#CA8A04', n: 'Waiting', m: 'Waiting on someone outside the team: supplier, client, approval.' },
  { id: 'action', i: '✅', c: '#2563EB', n: 'Action', m: 'A specific to-do for someone.' },
  { id: 'risk', i: '⚠️', c: '#B45309', n: 'Risk', m: 'Might go wrong: worth watching.' },
  { id: 'idea', i: '💡', c: '#0D9488', n: 'Idea', m: 'An improvement idea (kaizen).' },
  { id: 'fyi', i: 'ℹ️', c: '#64748B', n: 'FYI', m: 'For information: no action needed.' }
];
const BY = Object.fromEntries(TAGS.map((t) => [t.id, t]));
const ALIAS = { block: 'blocker', blocked: 'blocker', blockers: 'blocker', issues: 'issue', risks: 'risk', decide: 'decision', wait: 'waiting', todo: 'action', actions: 'action', ideas: 'idea', info: 'fyi' };
export const tagOf = (w) => { const k = String(w || '').toLowerCase(); return BY[k] || BY[ALIAS[k]] || null; };
// the tags in a note, in the list's order, each once
export function tagsIn(text) {
  const seen = new Set(); String(text || '').replace(/(^|[^\p{L}\p{N}_&])#([\p{L}_]+)/gu, (m, a, w) => { const t = tagOf(w); if (t) seen.add(t.id); return m; });
  return TAGS.filter((t) => seen.has(t.id)).map((t) => t.id);
}
if (typeof window !== 'undefined') window.CHAMP_TAGS = { TAGS, tagOf, tagsIn };
