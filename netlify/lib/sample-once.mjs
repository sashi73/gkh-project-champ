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
// 🧪 the second set (sample-esg-2.mjs: Singapore shipping, Dubai real estate, Saudi cement, with their vaults and supplier data), once, under its own flag
export async function runOnce2(who) {
  let first = false;
  // the claim: set afresh on every attempt of the compare-and-set (a losing attempt ends with first = false); a claim left running for 20 minutes by a run that died is taken over
  await kv.update('sample-esg-2', (cur) => { first = false; if (cur && !(cur.running && Date.now() - (cur.at || 0) > 20 * 60e3)) return cur; first = true; return { at: Date.now(), by: who, running: true }; }, () => null);
  if (!first) return null;
  try {
    const S2 = await import('./sample-esg-2.mjs'), made = await S2.seed2(who);
    try { const A = await import('./admin-lib.mjs'); await Promise.resolve(A.audit(who, 'Sample data (set 2) loaded: ' + made.companies.length + ' ESG companies, ' + made.vaults.length + ' vaults, ' + made.suppliers.length + ' supplier replies')).catch(() => {}); } catch { /* the audit is optional */ }
    await kv.set('sample-esg-2', { at: Date.now(), by: who, made });
    return made;
  } catch (e) { await kv.del('sample-esg-2').catch(() => {}); throw e; }
}
// 💱 the carbon-market examples for two sample companies loaded before they existed (sample-esg-2.mjs topUp2), once
export async function runOnce2b(who) {
  let first = false;
  await kv.update('sample-esg-2b', (cur) => { first = false; if (cur && !(cur.running && Date.now() - (cur.at || 0) > 20 * 60e3)) return cur; first = true; return { at: Date.now(), by: who, running: true }; }, () => null);
  if (!first) return null;
  try { const S2 = await import('./sample-esg-2.mjs'), done = await S2.topUp2(who); await kv.set('sample-esg-2b', { at: Date.now(), by: who, done }); return done; }
  catch (e) { await kv.del('sample-esg-2b').catch(() => {}); throw e; }
}
