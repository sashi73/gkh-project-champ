GKH PROJECT CHAMP: MOVING THE DATA FROM NETLIFY BLOBS TO POSTGRES
=================================================================

What changes
  Records (projects, plans, people, users, logs, everything saved as JSON) move to Postgres.
  Files (photos, receipts, PDFs, resumes) stay in Netlify Blobs, which is what Blobs is for.
  Postgres keeps a small row per file, so listing and deleting never have to ask Blobs.
  Nothing else in Champ changes. One setting, CHAMP_DB, picks where the data lives:
    not set (or "blobs")   Netlify Blobs, exactly as before
    "postgres"             Postgres

Why it is faster
  - Pages that read many records (Today, Summary, Pipeline, People, reports, the SQL wizard) make ONE query
    instead of one Blobs request per record (30 plans: 1 query instead of 31 requests).
  - A save is one read and one write, with no extra listing to find the version.
  - The connection is made once per warm function and reused.
  - The database is tuned for this kind of data: an index range for "every key starting with plan:",
    room on each page for quick rewrites of busy records, lz4 compression for big records,
    and file bytes are never squeezed twice.

Safety net (already in place)
  - Code before the move: the branch snapshot/pre-postgres on GitHub.
  - Neon's free plan sleeps the database after a few minutes with no use; the first query after that waits
    a moment while it wakes. Busy hours are not affected.
  - The move only COPIES from Blobs. Blobs is never changed, so it stays a full copy of the data
    from the moment of the move.

-----------------------------------------------------------------
THE MOVE (about 15 minutes, best at a quiet time)
-----------------------------------------------------------------
Champ uses its own Postgres (Neon, free plan). Netlify's own database would need the whole Netlify account moved to a
credit-based plan for good, so it is not used.

1. Make the database: neon.tech > New project, region AWS US East 2 (Ohio). It must be the same region as the
   Netlify functions (Netlify > Functions > Region: Ohio, US East), or every query crosses the US.
   Connect > Connection pooling ON > copy the connection string (the host has -pooler in it).

2. Netlify > Project configuration > Environment variables > Add:
     CHAMP_DATABASE_URL = the connection string   ("Contains secret values" ticked, scope: Functions)
   Then redeploy. Champ still uses Blobs: CHAMP_DB is not set yet.

3. Copy, from the console while signed in as the super user (the browser's developer console, F12 > Console):
     const move = (mode) => fetch('/.netlify/functions/db-move-background', { method: 'POST', credentials: 'include',
       headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1' }, body: JSON.stringify({ mode }) });
     const status = async () => (await (await fetch('/.netlify/functions/admin', { method: 'POST', credentials: 'include',
       headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1' }, body: JSON.stringify({ action: 'dbMoveStatus' }) })).json());
     await move('check');   then  await status()   what is in Blobs (read only)
     await move('copy');    then  await status()   every record into Postgres
     await move('compare'); then  await status()   expect ok: true and no problems
   (The same steps from a computer: tools/pg-move.mjs, which needs a Netlify access token.)

4. Switch: Environment variables > Add  CHAMP_DB = postgres, then Deploys > Trigger deploy > Deploy site.

5. Straight after the deploy: await move('only-missing')   picks up anything saved between steps 3 and 4.

6. Open the console: Today, a project, People, Ask AI. Everything should look the same, only quicker.

-----------------------------------------------------------------
GOING BACK
-----------------------------------------------------------------
A. Fast way back (anything changed after the switch is left behind in Postgres):
   delete CHAMP_DB in Netlify (or set it to blobs) and redeploy.
B. Way back that keeps the newest changes:
   await move('back')   then delete CHAMP_DB and redeploy.
C. The code itself: the branch snapshot/pre-postgres is Champ exactly as it was before this change.

Backups once on Postgres: Neon keeps a restore window (point-in-time restore) on its dashboard.

-----------------------------------------------------------------
OFF NETLIFY (a Malaysian cloud, a client's server, the local laptop)
-----------------------------------------------------------------
Any Postgres 14 or newer works. Set CHAMP_DB=postgres and CHAMP_DATABASE_URL=<that database's connection string>.
Off Netlify there is no Blobs, so the file bytes go into Postgres too. When copying from Blobs, use:
   node tools/pg-move.mjs to-postgres --files-into-db
Optional: CHAMP_DB_POOL (connections per server, default 5). The tables are made automatically the first time.

-----------------------------------------------------------------
TESTS
-----------------------------------------------------------------
tools/storage-test.mjs runs the same steps on Blobs and on Postgres and compares every answer, checks that
40 saves to one record at the same moment lose nothing, and tests the move and the way back.
It runs on every pull request (GitHub starts a throwaway Postgres for it). On your computer:
   CHAMP_TEST_DATABASE_URL=postgres://user@localhost:5432/scratch node tools/storage-test.mjs
