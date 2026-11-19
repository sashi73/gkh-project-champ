// GKH Project Champ: move the data between Netlify Blobs and Postgres from a computer (README-POSTGRES.txt).
// On Netlify the same move runs as an owner-only background job with no tokens needed (db-move-background.mjs);
// this tool is for running off Netlify, or by hand. "check", "to-postgres" and "compare" never change Blobs.
//
//   node tools/pg-move.mjs check                  how much data is in Blobs (stores, records, files, sizes, biggest keys)
//   node tools/pg-move.mjs to-postgres            copy every record from Blobs into Postgres (run again any time: it overwrites)
//        --only-missing                           only add keys Postgres doesn't have yet
//        --files-into-db                          also copy file bytes into Postgres (only for running off Netlify)
//   node tools/pg-move.mjs compare                every record in Blobs vs Postgres: missing or different
//   node tools/pg-move.mjs to-blobs               going back with the newest data: copy Postgres records back into Blobs
//
// Settings (environment variables, never in the code):
//   NETLIFY_SITE_ID     the Project Champ site's ID (Netlify > Site configuration > Site details)
//   NETLIFY_AUTH_TOKEN  a personal access token (Netlify > User settings > Applications > Personal access tokens)
//   CHAMP_DATABASE_URL  the Postgres connection string, not needed for "check"
import { getStore, listStores } from '@netlify/blobs';

const [cmd = 'check', ...flags] = process.argv.slice(2);
const SITE = process.env.NETLIFY_SITE_ID, TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const remote = !process.env.NETLIFY_BLOBS_CONTEXT;   // the tests point this tool at a local Blobs server instead
if (remote && (!SITE || !TOKEN)) { console.error('Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN first (see the top of this file).'); process.exit(1); }
const mode = { check: 'check', 'to-postgres': flags.includes('--only-missing') ? 'only-missing' : 'copy', compare: 'compare', 'to-blobs': 'back' }[cmd];
if (!mode) { console.error('Use: check | to-postgres [--only-missing] [--files-into-db] | compare | to-blobs'); process.exit(1); }
if (mode !== 'check' && !process.env.CHAMP_DATABASE_URL) { console.error('Set CHAMP_DATABASE_URL first (the Postgres connection string).'); process.exit(1); }

const opts = remote ? { siteID: SITE, token: TOKEN } : {};
const M = await import('../netlify/lib/db-move.mjs'), S = await import('../netlify/lib/storage.mjs');
const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : (n / 1024).toFixed(1) + ' KB');
const rep = await M.run(mode, { blobs: (name) => getStore({ name, ...opts }), listStores: () => listStores(opts), filesIntoDb: flags.includes('--files-into-db'), log: (s) => console.log(s) });
if (mode !== 'check') await S.closeDatabase();

if (mode === 'check') {
  console.log(`\nAll stores: ${rep.records} records (${kb(rep.recordBytes)}), ${rep.files} files (${kb(rep.fileBytes)}), ${kb(rep.recordBytes + rep.fileBytes)} in all.`);
  console.log('Records go to Postgres; on Netlify the files stay in Blobs (Postgres keeps only a small row per file).\n\nBiggest keys:');
  for (const b of rep.biggest) console.log(`  ${kb(b.bytes).padStart(10)}  ${b.store}  ${b.key}${b.file ? '  (file)' : ''}`);
}
if (mode === 'compare') { for (const p of rep.problems) console.log(p); console.log(rep.ok ? `\nAll ${rep.records + rep.files} keys match.` : `\n${rep.problems.length} keys missing or different.`); if (!rep.ok) process.exitCode = 1; }
if (mode === 'copy' || mode === 'only-missing') console.log('\nDone. Next: node tools/pg-move.mjs compare');
if (mode === 'back') console.log('\nDone. Remove CHAMP_DB in Netlify (or set it to blobs) and redeploy.');
