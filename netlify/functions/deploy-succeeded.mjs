// GKH Project Champ: after every successful deploy Netlify calls this. It loads the sample data once (sample-once.mjs).
import { runOnce, runOnce2 } from '../lib/sample-once.mjs';
export default async () => {
  try { const m = await runOnce('Champ (sample data)'); console.log(m ? `Sample data: ${m.programs.length} programs, ${m.projects.length} projects, ${m.companies.length} companies` : 'Sample data: already loaded'); }
  catch (e) { console.error('Sample data: ' + e.message); }
  try { const m2 = await runOnce2('Champ (sample data)'); if (m2) console.log(`Sample data set 2: ${m2.companies.length} companies, ${m2.vaults.length} vaults, ${m2.suppliers.length} supplier replies`); }
  catch (e) { console.error('Sample data set 2: ' + e.message); }
  return new Response('ok');
};
