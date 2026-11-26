// GKH Project Champ: 🧪 the sample programs, projects and ESG companies, loaded into the database once, with no one signed in.
// Run by Netlify when a deploy succeeds (deploy-succeeded.mjs) and, in case that event is missed, every 15 minutes (sample-once-cron.mjs).
// The flag 'sample-portfolio' is claimed first (compare-and-set), so it runs once only, however many times it is called.
import * as kv from './kv.mjs';
export async function runOnce(who) {
  let first = false;
  await kv.update('sample-portfolio', (cur) => { if (cur) return cur; first = true; return { at: Date.now(), by: who, running: true }; }, () => null);
  if (!first) return null;
  try {
    const SP = await import('./sample-portfolio.mjs'), made = await SP.seed(who, new Date().toISOString().slice(0, 10));
    try { const A = await import('./admin-lib.mjs'); await Promise.resolve(A.audit(who, 'Sample data loaded: ' + made.programs.length + ' programs, ' + made.projects.length + ' projects, ' + made.companies.length + ' ESG companies')).catch(() => {}); } catch (e) { /* the audit line is optional */ }
    await kv.set('sample-portfolio', { at: Date.now(), by: who, made });
    return made;
  } catch (e) { await kv.del('sample-portfolio').catch(() => {}); throw e; }   // failed: the next run tries again (names already there are skipped)
}
