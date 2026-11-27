// GKH Project Champ: every 15 minutes, in case the deploy event was missed: loads the sample data once (sample-once.mjs), then only checks a flag.
import { runOnce, runOnce2, runOnce2b } from '../lib/sample-once.mjs';
export default async () => {
  try { const m = await runOnce('Champ (sample data)'); if (m) console.log(`Sample data: ${m.programs.length} programs, ${m.projects.length} projects, ${m.companies.length} companies`); }
  catch (e) { console.error('Sample data: ' + e.message); }
  try { const m2 = await runOnce2('Champ (sample data)'); if (m2) console.log(`Sample data set 2: ${m2.companies.length} companies, ${m2.vaults.length} vaults, ${m2.suppliers.length} supplier replies`); }
  catch (e) { console.error('Sample data set 2: ' + e.message); }
  try { const d = await runOnce2b('Champ (sample data)'); if (d) console.log('Sample carbon-market data added: ' + d.join(', ')); } catch (e) { console.error('Sample carbon-market data: ' + e.message); }
  return new Response('ok');
};
export const config = { schedule: '*/15 * * * *' };
