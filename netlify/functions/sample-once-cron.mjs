// GKH Project Champ: every 15 minutes, in case the deploy event was missed: loads the sample data once (sample-once.mjs), then only checks a flag.
import { runOnce } from '../lib/sample-once.mjs';
export default async () => {
  try { const m = await runOnce('Champ (sample data)'); if (m) console.log(`Sample data: ${m.programs.length} programs, ${m.projects.length} projects, ${m.companies.length} companies`); }
  catch (e) { console.error('Sample data: ' + e.message); }
  return new Response('ok');
};
export const config = { schedule: '*/15 * * * *' };
