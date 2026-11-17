// GKH Project Champ: 🩺 Champ's project watch. Every project gets a Red / Amber / Green health check from fixed rules
// (earned value, the baseline, late work, risks, issues and the budget), so the colour is the same every time and can be
// explained to a client. Then Champ, as an agent, writes a short brief: what is wrong, why, and what it would do next.
// The rules cost nothing; the brief is one AI call, kept (watch:<core>) until the project's numbers change, at most once a day.
import * as kv from './kv.mjs';
import { rollup, taskCost, workBetween, allDays } from './plan.mjs';
import { llmJson, usage, checkLimit, llmSetup, sydToday } from './ai.mjs';
import * as KB from './kb.mjs';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const days = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 864e5) : 0);
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-AU');
export const RAG_WORD = { red: 'Act now', amber: 'Watch closely', green: 'On track', grey: 'Not enough data yet' };
// a finished project (100% done) is judged on how it ended: time against the baseline finish, cost against the approved budget
export const VERDICT = { success: { rag: 'green', word: 'Finished: succeeded' }, partial: { rag: 'amber', word: 'Finished: partly succeeded' }, failed: { rag: 'red', word: 'Finished: failed' } };

// the rules: the colour and every reason for it, worst first
export function check(plan, today = sydToday()) {
  if (!plan || !Array.isArray(plan.tasks) || !plan.tasks.length) return { rag: 'grey', word: RAG_WORD.grey, reasons: [{ lvl: 'grey', k: 'plan', text: 'No plan yet: add tasks with dates and costs so Champ can watch it.' }], n: {} };
  const R = rollup(plan, today), c = plan.charter || {}, b = plan.baseline || null;
  const work = plan.tasks.filter((t) => t.dur > 0);
  if (work.length && plan.tasks.every((t) => (t.pct || 0) >= 100)) return closeOut(plan, R, c, b, today);   // every task and milestone done
  const budget = Number(c.budget) || 0, EAC = R.EAC != null ? R.EAC : R.BAC;
  const slip = b && b.finish && R.finish ? days(b.finish, R.finish) : 0;
  const late = plan.tasks.filter((t) => (t.pct || 0) < 100 && t.ef && t.ef < today && t.dur > 0).sort((x, y) => (x.ef < y.ef ? -1 : 1));
  const lateMs = plan.tasks.filter((t) => (t.pct || 0) < 100 && t.ef && t.ef < today && t.dur === 0);
  const risks = (plan.risks || []).filter((x) => x.status !== 'Closed' && x.title).map((x) => ({ ...x, score: (x.p || 0) * (x.i || 0) })).sort((x, y) => y.score - x.score);
  const high = risks.filter((x) => x.score >= 12), issues = (plan.issues || []).filter((x) => x.status !== 'Resolved' && x.title);
  const crit = issues.filter((x) => x.priority === 'Critical'), hi = issues.filter((x) => x.priority === 'High');
  const over = budget ? r2((EAC - budget) / budget * 100) : null;
  const reasons = [], add = (lvl, k, text) => reasons.push({ lvl, k, text });
  if (R.SPI != null && R.SPI < 0.9) add('red', 'spi', `Behind schedule: SPI ${R.SPI.toFixed(2)} (only ${Math.round(R.SPI * 100)}% of the work planned by today is done).`);
  else if (R.SPI != null && R.SPI < 1) add('amber', 'spi', `Slightly behind schedule: SPI ${R.SPI.toFixed(2)}.`);
  if (R.CPI != null && R.CPI < 0.9) add('red', 'cpi', `Over budget: CPI ${R.CPI.toFixed(2)} (every $1 spent delivers ${Math.round(R.CPI * 100)}c of work).`);
  else if (R.CPI != null && R.CPI < 1) add('amber', 'cpi', `Slightly over budget: CPI ${R.CPI.toFixed(2)}.`);
  if (slip > 21) add('red', 'slip', `Finish has moved ${slip} days past the baseline (${b.finish} → ${R.finish}).`);
  else if (slip > 0) add('amber', 'slip', `Finish is ${slip} days past the baseline (${b.finish} → ${R.finish}).`);
  if (over != null && over > 10) add('red', 'eac', `Forecast cost ${money(EAC)} is ${Math.round(over)}% over the approved budget of ${money(budget)}.`);
  else if (over != null && over > 0) add('amber', 'eac', `Forecast cost ${money(EAC)} is ${over.toFixed(1)}% over the approved budget of ${money(budget)}.`);
  if (late.length >= 3) add('red', 'late', `${late.length} tasks are past their finish date and not done.`);
  else if (late.length) add('amber', 'late', `${late.length} task${late.length > 1 ? 's are' : ' is'} past its finish date and not done.`);
  if (lateMs.length) add(lateMs.length >= 2 ? 'red' : 'amber', 'ms', `${lateMs.length} milestone${lateMs.length > 1 ? 's' : ''} missed: ${lateMs.map((t) => t.name).slice(0, 2).join('; ')}.`);
  if (crit.length) add('red', 'issue', `${crit.length} critical issue${crit.length > 1 ? 's' : ''} open: ${crit.map((x) => x.title).slice(0, 2).join('; ')}.`);
  else if (hi.length) add('amber', 'issue', `${hi.length} high-priority issue${hi.length > 1 ? 's' : ''} open.`);
  if (high.length >= 3) add('red', 'risk', `${high.length} high risks (score 12 or more) are open.`);
  else if (high.length) add('amber', 'risk', `${high.length} high risk${high.length > 1 ? 's' : ''} open: ${high[0].title}.`);
  const rag = reasons.some((x) => x.lvl === 'red') ? 'red' : reasons.some((x) => x.lvl === 'amber') ? 'amber' : 'green';
  if (rag === 'green') add('green', 'ok', R.SPI == null && R.CPI == null ? 'No work due yet and nothing spent: on plan so far.' : 'On schedule and within budget.');
  reasons.sort((x, y) => ({ red: 0, amber: 1, green: 2, grey: 3 }[x.lvl] - { red: 0, amber: 1, green: 2, grey: 3 }[y.lvl]));
  const n = { today, pct: R.pct, SPI: R.SPI, CPI: R.CPI, BAC: R.BAC, AC: R.AC, EV: R.EV, PV: R.PV, EAC: r2(EAC), budget, over_pct: over, finish: R.finish, baseline_finish: (b && b.finish) || '', slip_days: slip,
    late_tasks: late.slice(0, 8).map((t) => ({ name: t.name, due: t.ef, pct: t.pct || 0, cost: taskCost(t) })), missed_milestones: lateMs.map((t) => t.name).slice(0, 4),
    top_risks: risks.slice(0, 5).map((x) => ({ title: x.title, score: x.score, response: x.response, action: x.action, owner: x.owner })),
    open_issues: issues.slice(0, 6).map((x) => ({ title: x.title, priority: x.priority, owner: x.owner, due: x.due })) };
  return { rag, word: RAG_WORD[rag], reasons, n };
}
// 🏁 a finished project: did it meet its time and its budget? SPI always ends at 1.00 (all the work is done in the end), so
// time is judged by the time index: the planned duration over the actual one (earned-schedule style; 1.00 = on time).
//   succeeded       on time (within 5% of the planned duration, at least 5 days) and within the approved budget
//   partly          up to 15% late and up to 10% over budget
//   failed          later or dearer than that
function closeOut(plan, R, c, b, today) {
  // the actual finish: when the work was really done (doneAt), else its scheduled finish; days on the project's own calendar
  const A = allDays(plan), fin = plan.tasks.filter((t) => t.dur > 0).reduce((m, t) => { const d = /^\d{4}-\d{2}-\d{2}$/.test(t.doneAt || '') ? t.doneAt : t.ef || ''; return d > m ? d : m; }, '') || R.finish;
  const budget = Number(c.budget) || 0, AC = R.AC, start = plan.start || R.start, baseFin = (b && b.finish) || fin;
  const planned = Math.max(1, workBetween(start, baseFin, A)), actual = Math.max(1, workBetween(start, fin, A)), slip = days(baseFin, fin);
  const SPIt = r2(planned / actual), lateBy = Math.max(0, actual - planned), latePct = r2(lateBy / planned * 100);
  const over = budget ? r2((AC - budget) / budget * 100) : (R.CPI ? r2((1 / R.CPI - 1) * 100) : 0);
  const onTime = lateBy <= Math.max(5, planned * 0.05), inBudget = over <= 0;
  const verdict = onTime && inBudget ? 'success' : latePct <= 15 && over <= 10 ? 'partial' : 'failed', V = VERDICT[verdict];
  const reasons = [], add = (lvl, k, text) => reasons.push({ lvl, k, text });
  const mo = (d) => (d >= 45 ? `about ${Math.round(d / 30.4 * 2) / 2} months` : `${d} days`);
  if (onTime) add('green', 'time', `Finished on time: ${actual} working days against ${planned} planned (time index ${SPIt.toFixed(2)}).`);
  else add(latePct > 15 ? 'red' : 'amber', 'time', `Finished ${mo(slip)} late (${fin} against the baseline ${baseFin}): ${actual} working days against ${planned} planned, ${Math.round(latePct)}% longer (time index ${SPIt.toFixed(2)}).`);
  if (inBudget) add('green', 'cost', `Within budget: final cost ${money(AC)}${budget ? ` against an approved budget of ${money(budget)}` : ''} (CPI ${R.CPI != null ? R.CPI.toFixed(2) : '-'}).`);
  else add(over > 10 ? 'red' : 'amber', 'cost', `Over budget: final cost ${money(AC)}${budget ? ` against an approved budget of ${money(budget)}, ${Math.round(over)}% over` : ''} (CPI ${R.CPI != null ? R.CPI.toFixed(2) : '-'}: every $1 bought ${Math.round((R.CPI || 0) * 100)}c of the planned work).`);
  const openR = (plan.risks || []).filter((x) => x.status !== 'Closed' && x.title).length, openI = (plan.issues || []).filter((x) => x.status !== 'Resolved' && x.title).length;
  if (openR || openI) add('amber', 'close', `${openR ? openR + ' risk' + (openR > 1 ? 's' : '') : ''}${openR && openI ? ' and ' : ''}${openI ? openI + ' issue' + (openI > 1 ? 's' : '') : ''} still open: close them or hand them to operations.`);
  reasons.sort((x, y) => ({ red: 0, amber: 1, green: 2, grey: 3 }[x.lvl] - { red: 0, amber: 1, green: 2, grey: 3 }[y.lvl]));
  const lessons = (plan.lessons || []).filter((l) => l && l.title).slice(0, 10).map((l) => ({ title: l.title, impact: l.impact, what: l.what, rec: l.rec, category: l.category }));
  const n = { today, finished: true, verdict, verdict_word: V.word, pct: 100, SPI: R.SPI, SPIt, CPI: R.CPI, BAC: R.BAC, AC, EV: R.EV, PV: R.PV, EAC: AC, budget, over_pct: over, finish: fin, baseline_finish: baseFin, slip_days: slip,
    planned_days: planned, actual_days: actual, late_pct: latePct, late_tasks: [], missed_milestones: [], top_risks: [], open_issues: [],
    issues_log: (plan.issues || []).filter((x) => x.title).slice(0, 8).map((x) => ({ title: x.title, priority: x.priority, resolution: x.resolution })), lessons_logged: lessons, closure_note: String(c.notes || '').slice(0, 600) };
  return { rag: V.rag, word: V.word, reasons, n };
}
// the numbers that matter: the brief is written again only when one of them changes (or on a new day)
const sigOf = (h) => JSON.stringify([h.rag, h.n.today, h.n.pct, h.n.SPI, h.n.CPI, h.n.EAC, h.n.finish, h.n.budget, h.n.late_tasks.length, h.n.top_risks.map((x) => x.score), h.n.open_issues.length]
  .concat(h.n.finished ? [h.n.verdict, h.n.SPIt, h.n.slip_days, h.n.over_pct, h.n.closure_note, (h.n.lessons_logged || []).map((l) => [l.title, l.impact, l.rec]), (h.n.issues_log || []).map((x) => [x.title, x.priority, x.resolution])] : []));   // a finished project: its post-mortem inputs too

// what Champ would do, from the rules alone (when the AI is not set up or the daily limit is reached)
function fallback(h) {
  if (h.n && h.n.finished) return postFallback(h);
  const k = new Set(h.reasons.map((x) => x.k)), a = [];
  if (k.has('spi') || k.has('slip') || k.has('late') || k.has('ms')) a.push({ title: 'Recover the schedule on the critical path', detail: 'Look at the critical path first: crash the late tasks (more people or overtime), fast-track tasks that can overlap, and move non-critical work out of the way.' });
  if (k.has('cpi') || k.has('eac')) a.push({ title: 'Get the cost back under control', detail: 'Find what is driving the overspend (rates, extra hours, rework), stop work that is not in the charter, and agree any extra scope through a change request.' });
  if (k.has('issue')) a.push({ title: 'Escalate the critical issues this week', detail: 'Give each critical issue one owner and a date, and take the blockers to the sponsor.' });
  if (k.has('risk')) a.push({ title: 'Act on the top risks', detail: 'Make sure each high risk has a real mitigation action, an owner and a date, and check them weekly.' });
  if (h.rag === 'red') a.push({ title: 'Reset with the sponsor', detail: 'Present the honest forecast (finish and cost), the options to recover and what each costs, then re-baseline through change control once agreed.' });
  if (h.rag === 'green') a.push({ title: 'Keep the rhythm', detail: 'Keep progress and actual costs up to date weekly, so Champ can spot a slip early.' });
  const headline = h.rag === 'red' ? 'This project needs corrective action now.' : h.rag === 'amber' ? 'Things are moving, but watch these closely.' : h.rag === 'green' ? 'On track. Keep an eye on it.' : 'Not enough data yet.';
  return { headline, summary: h.reasons.map((x) => x.text).slice(0, 3).join(' '), actions: a.slice(0, 5), watch: [], ai: false };
}

// a finished project, from the rules and its own lessons log: the verdict, why, and how Champ would have done it better
function postFallback(h) {
  const n = h.n, k = new Set(h.reasons.filter((x) => x.lvl !== 'green').map((x) => x.k)), a = [];
  (n.lessons_logged || []).filter((l) => l.impact === 'negative' && l.rec).slice(0, 3).forEach((l) => a.push({ title: String(l.title).slice(0, 80), detail: l.rec }));
  if (k.has('time') && a.length < 4) a.push({ title: 'Plan with real buffers on the critical path', detail: 'Put schedule contingency on the critical path for the known risks (approvals, suppliers, weather) and track it like money.' });
  if (k.has('cost') && a.length < 4) a.push({ title: 'Control cost from week one', detail: 'Weekly actuals against earned value, a tight change-control gate, and contingency released only by the sponsor.' });
  if (n.verdict === 'success') a.push({ title: 'Reuse what worked', detail: 'Turn this project\'s plan, risks and lessons into the template for the next one.' });
  a.push({ title: 'Agree and share the lessons learned', detail: 'Open the Lessons learned tab, agree the lessons with the team and write the report so the next project can reuse them.' });
  const over = n.over_pct, late = n.slip_days, misses = [];   // say only what actually went wrong (late, over budget, or both)
  if (late > 0 && k.has('time')) misses.push(late + ' days late'); if (over > 0) misses.push(Math.round(over) + '% over budget');
  const why = misses.length ? 'it finished ' + misses.join(' and ') : 'it missed its targets';
  const headline = n.verdict === 'success' ? 'Success: this project finished on time and within budget.' : n.verdict === 'partial' ? `Partly successful: ${why}.` : `This project failed: ${why}.`;
  return { headline, summary: h.reasons.map((x) => x.text).slice(0, 3).join(' '), actions: a.slice(0, 5), watch: [], ai: false, finished: true };
}

// ai false (the console, straight away): the brief kept from before if the numbers have not changed, otherwise the rules' brief
// marked stale, and the console asks for a fresh one in the background (ai true: one AI call, kept).
export async function brief(core, plan, { refresh = false, name = '', ai = false, lang = 'en' } = {}) {
  const h = check(plan), sig = sigOf(h) + '|' + lang, key = 'watch:' + core;
  const old = await kv.get(key).catch(() => null);
  if (!refresh && old && old.sig === sig && old.brief) return { ...h, brief: old.brief, at: old.at, cached: true };
  if (h.rag === 'grey') return { ...h, brief: fallback(h), at: Date.now() };
  if (!ai) return { ...h, brief: fallback(h), at: Date.now(), stale: !!llmSetup() };
  let out = null;
  if (llmSetup()) {
    try {
      await checkLimit();
      const q = h.reasons.map((x) => x.text).join(' ') + ' ' + (h.rag === 'red' ? 'project recovery corrective action' : 'monitoring and control');
      const hits = await KB.search(q, 2000).catch(() => []), notes = hits.length ? KB.forPrompt(hits) : undefined;
      const LL = await import('./lessons.mjs'), past = core ? ((await LL.library({ forCore: core, limit: 3 }).catch(() => ({ lessons: [] }))).lessons || []).map((l) => ({ lesson: l.title, from: l.project, recommendation: l.rec })) : [];
      const sys = h.n.finished ? 'You are Champ, the project-monitoring agent inside GKH Project Champ, doing the post-mortem of a FINISHED project like a seasoned PMP project director. ' +
        `The verdict from the fixed rules is: ${h.n.verdict_word.toUpperCase()} (time against the baseline finish, cost against the approved budget). Do not change it. ` +
        'Use the real figures given: time index (planned over actual duration; SPI always ends at 1.00 so do not use it for time), CPI, days late, % over budget, the issues log, the closure note and the lessons the team logged. ' +
        'headline: one short sentence that states the verdict in plain words (e.g. "This project failed: it finished 4 months late and 41% over budget."). summary: 2-3 sentences on why it ended this way (the root causes, named). ' +
        'actions: 3 to 5 things you would have done differently if you had run it ("how I would have done this better"), most important first, each {title (imperative, under 9 words), detail (1-2 sentences, specific to this project, citing the lesson or issue)}. For a success, what to repeat. ' +
        'If one of the lessons from past projects clearly fits, use it and say which project it came from. watch: 1-3 short things to carry into the next project (each under 8 words). say: the verdict and the main reason in ONE short spoken sentence, under 20 words. No markdown. ' +
        'JSON only: {"headline":"","summary":"","say":"","actions":[{"title":"","detail":""}],"watch":[""],"class_note":""}'
        : 'You are Champ, the project-monitoring agent inside GKH Project Champ. You watch every project like a seasoned PMP project director and brief the project manager the moment they open it. ' +
        `The health check (fixed rules) says ${h.rag.toUpperCase()}. Red = corrective action needed now; amber = things are moving but watch these closely; green = fine, stay mindful. Do not change the colour. ` +
        'Write the brief from the numbers, the late tasks, risks and issues given (name them; use the real figures, dates and owners). ' +
        'headline: one short sentence that leads with the colour in plain words (e.g. "Heads up: this project is 55 days late and 23% over budget."). summary: 2-3 sentences on what is going wrong and why. ' +
        'actions: 3 to 5 things you would do if you were the project manager, most important first, each {title (imperative, under 9 words), detail (1-2 sentences, specific to this project: which tasks, which risk, who)}. Use real PM techniques where they fit (crashing, fast-tracking, re-sequencing the critical path, de-scoping with the sponsor, a change request and re-baseline, EVM and EAC, value engineering, escalation, risk response). ' +
        'If one of the lessons from past projects clearly fits, make it one of the actions and say which project it came from. ' +
        'For green keep it to 1-2 light actions. watch: 1-3 short things to keep an eye on next (each under 8 words). say: the summary in ONE short spoken sentence, under 20 words, for Champ to read aloud. No markdown. ' +
        (notes ? KB.RULE + ' Here add at most one short line in "class_note", e.g. "Sashi also covers project recovery in his training class: ...", only if a note is clearly about this situation; otherwise empty. ' : '') +
        'JSON only: {"headline":"","summary":"","say":"","actions":[{"title":"","detail":""}],"watch":[""],"class_note":""}';
      const r = await llmJson([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ project: name || plan.name, health: h.rag, reasons: h.reasons.map((x) => x.text), numbers: h.n, course_notes: notes, lessons_from_past_projects: past.length ? past : undefined }) }], { maxTokens: 1400, temperature: 0.3, timeoutMs: 90000 });
      const d = r && r.data;
      if (d && d.headline) {
        out = { headline: String(d.headline).slice(0, 300), summary: String(d.summary || '').slice(0, 900), say: String(d.say || '').slice(0, 200),
          actions: (Array.isArray(d.actions) ? d.actions : []).slice(0, 5).map((x) => ({ title: String((x && x.title) || '').slice(0, 120), detail: String((x && x.detail) || '').slice(0, 400) })).filter((x) => x.title),
          watch: (Array.isArray(d.watch) ? d.watch : []).slice(0, 3).map((x) => String(x).slice(0, 200)).filter(Boolean),
          finished: !!h.n.finished, note: notes && d.class_note && /Sashi/i.test(d.class_note) ? String(d.class_note).slice(0, 300) : '', sources: notes && d.class_note && /Sashi/i.test(d.class_note) ? KB.sourcesOf(hits) : [], ai: true };
        await usage(true, r.used || 0).catch(() => {});
      }
    } catch (e) { console.error('Champ watch: ' + e.message); }
  }
  if (!out) out = fallback(h);
  const at = Date.now();
  if (out.ai) await kv.set(key, { sig, brief: out, at, rag: h.rag }).catch(() => {});
  return { ...h, brief: out, at };
}

// ---------------- Build 2: the watch across every project ----------------
// sweep(): the health rules on every open project (cheap, any time), what changed since yesterday, alerts when one gets
// worse (in the console, and on Telegram when it is set up); with ai, Champ also refreshes the brief of red and amber
// projects whose numbers changed (at most AI_WATCH_MAX a run, 12 by default).
const ORDER = { red: 0, amber: 1, green: 2, grey: 3 };
const worse = (from, to) => from && to && ORDER[to] < ORDER[from] && to !== 'grey';
export async function sweep({ ai = false, lang = 'en', maxAi = Math.max(0, Number(process.env.AI_WATCH_MAX || 12) || 12) } = {}) {
  const { list, portfolio } = await import('./plan.mjs');
  const today = sydToday(), [plans, cards, old, prevKv] = await Promise.all([list(), portfolio(today).catch(() => []), kv.get('watch:board').catch(() => null), kv.get('watch:prev').catch(() => null)]);
  // yesterday's colours: when the day turns over, the last board of the old day becomes "yesterday"
  let prev = prevKv && prevKv.map ? prevKv : { day: '', map: {} };
  if (old && old.day && old.day !== today) { prev = { day: old.day, map: Object.fromEntries((old.items || []).map((x) => [x.core, x.rag])) }; await kv.set('watch:prev', prev).catch(() => {}); }
  const byCore = Object.fromEntries(cards.map((c) => [c.core, c])), oldBy = Object.fromEntries(((old && old.items) || []).map((x) => [x.core, x]));
  const items = [], done = [];
  for (const p of plans) {
    const c = byCore[p.core]; if (!c) continue;
    const h = check(p, today);
    if (h.n.finished) {   // 🏁 finished projects: how they ended (time index, CPI, the verdict); not watched or alerted any more
      const kept = await kv.get('watch:' + p.core).catch(() => null), fresh = kept && kept.sig === sigOf(h) + '|' + lang && kept.brief;
      done.push({ core: p.core, ref: c.ref, name: c.name || p.name, program: c.program || '', verdict: h.n.verdict, word: h.word, rag: h.rag, SPIt: h.n.SPIt, CPI: h.n.CPI, slip: h.n.slip_days, over: h.n.over_pct,
        finish: h.n.finish, headline: fresh ? kept.brief.headline : '', reasons: h.reasons.filter((x) => x.lvl !== 'green').slice(0, 2).map((x) => x.text) });
      continue;
    }
    if (c.phase === 'close') continue;   // closed or lost projects are not watched
    const kept = await kv.get('watch:' + p.core).catch(() => null);
    const fresh = kept && kept.sig === sigOf(h) + '|' + lang && kept.brief;
    const was = prev.map[p.core] || '', o = oldBy[p.core];
    items.push({ core: p.core, ref: c.ref, name: c.name || p.name, program: c.program || '', client: c.client || '', rag: h.rag, word: h.word,
      reasons: h.reasons.filter((x) => x.lvl !== 'green').slice(0, 3).map((x) => x.text), headline: fresh ? kept.brief.headline : '', ai: !!fresh,
      SPI: h.n.SPI, CPI: h.n.CPI, slip: h.n.slip_days, over: h.n.over_pct, pct: h.n.pct, was, since: o && o.rag === h.rag ? o.since || today : today, _h: h, _p: p, _fresh: !!fresh });
  }
  items.sort((a, b) => ORDER[a.rag] - ORDER[b.rag] || (a.SPI ?? 9) - (b.SPI ?? 9));
  // Champ's view of the projects that need it (red first), in this run's budget
  let briefs = 0;
  if (ai && llmSetup()) for (const x of items) {
    if (briefs >= maxAi) break; if (x._fresh || x.rag === 'green' || x.rag === 'grey') continue;
    const r = await brief(x.core, x._p, { refresh: true, ai: true, name: x.name, lang }).catch(() => null);
    if (r && r.brief && r.brief.ai) { x.headline = r.brief.headline; x.ai = true; briefs++; }
  }
  // alerts: a project that got worse since yesterday (or since the last look today), once per project, colour and day
  const sent = (await kv.get('watch:alerted').catch(() => null)) || {}, alerts = [];
  for (const x of items) {
    const from = x.was || (o2(oldBy[x.core]) || '');
    if (!worse(from, x.rag)) continue;
    const k = `${today}|${x.core}|${x.rag}`; if (sent[k]) continue; sent[k] = Date.now();
    alerts.push({ core: x.core, name: x.name, program: x.program, from, to: x.rag, at: Date.now(), why: x.reasons[0] || '' });
  }
  for (const k of Object.keys(sent)) if (!k.startsWith(today) && Date.now() - sent[k] > 7 * 864e5) delete sent[k];
  if (alerts.length) {
    await kv.set('watch:alerted', sent).catch(() => {});
    const log = ((await kv.get('watch:alerts').catch(() => null)) || { list: [] }).list || [];
    await kv.set('watch:alerts', { list: alerts.concat(log).slice(0, 60) }).catch(() => {});
    await telegram(alerts).catch(() => {});
  }
  const counts = { red: 0, amber: 0, green: 0, grey: 0 }; items.forEach((x) => counts[x.rag]++);
  const VO = { failed: 0, partial: 1, success: 2 };
  done.sort((a, b) => VO[a.verdict] - VO[b.verdict] || String(b.finish).localeCompare(String(a.finish)));
  const board = { day: today, at: Date.now(), counts, items: items.map(({ _h, _p, _fresh, ...x }) => x), done, briefs, prevDay: prev.day };
  await kv.set('watch:board', board).catch(() => {});
  return { ...board, alerts };
}
const o2 = (o) => (o ? o.rag : '');
async function telegram(alerts) {
  const chat = String(process.env.TELEGRAM_CHAT_ID || '').trim(); if (!chat || !String(process.env.TELEGRAM_BOT_TOKEN || '').trim()) return;
  const B = await import('./bot.mjs'), dot = { red: '🔴', amber: '🟠', green: '🟢' }, site = String(process.env.URL || '').replace(/\/+$/, '');
  const esc = (s) => String(s || '').replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]));
  const text = '🩺 <b>Champ\'s watch</b>\n' + alerts.slice(0, 10).map((a) => `${dot[a.from] || '⚪'} → ${dot[a.to]} <b>${esc(a.name)}</b>${a.program ? ' (' + esc(a.program) + ')' : ''}\n${esc(a.why)}${site ? `\n${site}/admin/#plan/${a.core}/overview` : ''}`).join('\n\n');
  await B.send(chat, text);
}
// the board for the console: the last sweep if it is recent, otherwise a fresh one (rules only: quick)
export async function board({ refresh = false, maxAgeMs = 10 * 60000, lang = 'en' } = {}) {
  const b = await kv.get('watch:board').catch(() => null);
  if (!refresh && b && b.day === sydToday() && Date.now() - b.at < maxAgeMs) return b;
  return sweep({ ai: false, lang });
}
export async function alertsList() { return ((await kv.get('watch:alerts').catch(() => null)) || { list: [] }).list || []; }

// 🔊 is Champ's voice working? A tiny test with Azure (a dozen characters), kept for 6 hours; when it fails the watch says
// why (a changed key, a lapsed subscription…) and, the first time, sends an alert, while the console uses the browser's voice.
export async function voiceCheck(site, { force = false } = {}) {
  const old = await kv.get('voice:health').catch(() => null);
  if (!force && old && Date.now() - old.at < 6 * 3600e3) return old;
  if (!site) return old;
  let ok = false, reason = '';
  try {
    const r = await fetch(String(site).replace(/\/+$/, '') + '/.netlify/functions/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Champ check.', lang: 'en' }), signal: AbortSignal.timeout(12000) });
    ok = r.ok; if (!ok) { const j = await r.json().catch(() => ({})); reason = j.reason || j.error || 'HTTP ' + r.status; }
  } catch (e) { reason = e.message; }
  const why = ok ? '' : /401|403/.test(reason) ? 'Azure turned down the key (Azure ' + (reason.match(/\d{3}/) || [''])[0] + '): the key was changed, the region does not match, or the Speech subscription lapsed. Update AZURE_SPEECH_KEY / AZURE_SPEECH_REGION in Netlify.'
    : /429/.test(reason) ? 'Azure says the monthly free voice allowance is used up (Azure 429). It resets next month, or move the Speech resource to Standard (S0).'
    : /not set up|503/.test(reason) ? 'The voice is not set up: add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in Netlify.' : 'The voice service did not answer (' + reason + ').';
  const rec = { ok, reason: String(reason).slice(0, 120), why, at: Date.now(), since: ok ? 0 : (old && !old.ok && old.since) || Date.now() };
  await kv.set('voice:health', rec).catch(() => {});
  if (!ok && (!old || old.ok)) await telegramText('🔇 <b>Champ\'s voice is down</b>\n' + why.replace(/[<&>]/g, '') + '\nChamp uses the browser\'s voice until it is fixed.').catch(() => {});
  return rec;
}
async function telegramText(text) {
  const chat = String(process.env.TELEGRAM_CHAT_ID || '').trim(); if (!chat || !String(process.env.TELEGRAM_BOT_TOKEN || '').trim()) return;
  const B = await import('./bot.mjs'); await B.send(chat, text);
}
