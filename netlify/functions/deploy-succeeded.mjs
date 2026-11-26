// GKH Project Champ: after every successful deploy Netlify calls this. It loads the sample data once (sample-once.mjs).
import { runOnce } from '../lib/sample-once.mjs';
export default async () => {
  try { const m = await runOnce('Champ (sample data)'); console.log(m ? `Sample data: ${m.programs.length} programs, ${m.projects.length} projects, ${m.companies.length} companies` : 'Sample data: already loaded'); }
  catch (e) { console.error('Sample data: ' + e.message); }
  return new Response('ok');
};
