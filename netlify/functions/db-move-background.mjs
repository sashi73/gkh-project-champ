// GKH Project Champ: the move between Netlify Blobs and Postgres, run on Netlify (README-POSTGRES.txt). Super user only.
// A background function (name ends in -background): the browser gets an immediate 202 and the move can take up to 15 minutes.
// It already has access to this site's Blobs, and CHAMP_DATABASE_URL gives the database, so no tokens are needed.
// The report is kept in Blobs (mbs-admin, key db-move) whichever store Champ is using; the console reads it with the
// "dbMoveStatus" action. POST { mode: check | copy | only-missing | compare | back }
import { listStores } from '@netlify/blobs';
import * as A from '../lib/admin-lib.mjs';
import { blobStore } from '../lib/storage.mjs';
import { run } from '../lib/db-move.mjs';

const MODES = ['check', 'copy', 'only-missing', 'compare', 'back'];
export default async (req) => {
  if (req.method !== 'POST' || req.headers.get('x-mbs-admin') !== '1') return new Response('', { status: 403 });
  await A.ensureSecret();
  const session = A.readSession(req);
  if (!session || session.uid) return new Response('', { status: 403 });   // the super user only (users from Users & access have a uid)
  let body = {};
  try { body = await req.json(); } catch { return new Response('', { status: 400 }); }
  const mode = String(body.mode || '');
  if (!MODES.includes(mode)) return new Response('', { status: 400 });
  const report = async (r) => (await blobStore(A.ADMIN)).setJSON('db-move', r);
  if (mode !== 'check' && !String(process.env.CHAMP_DATABASE_URL || '').trim()) { await report({ mode, ok: false, error: 'CHAMP_DATABASE_URL is not set in Netlify yet.', finished: Date.now() }); return new Response('', { status: 202 }); }
  await report({ mode, status: 'working', started: Date.now() });
  try {
    // logged before it runs, so the activity log that gets copied already has this line (check and compare only read: not logged)
    if (!['check', 'compare'].includes(mode)) await A.audit(session.u, `Data move: ${{ copy: 'copied Blobs to Postgres', 'only-missing': 'copied new Blobs records to Postgres', back: 'copied Postgres back to Blobs' }[mode]}`);
    const r = await run(mode, { blobs: (name) => blobStore(name), listStores: () => listStores() });
    await report({ ...r, status: 'done' });
  } catch (e) {
    console.error('db move failed:', e);
    await report({ mode, status: 'error', ok: false, error: String(e && e.message || e).slice(0, 500), finished: Date.now() });
  }
  return new Response('', { status: 202 });
};
