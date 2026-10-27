# Tuesday Murder Club

A shared documentary watchlist for the club, built with Next.js, MySQL/MariaDB and TMDB. It runs as a Node.js app on Krystal cPanel hosting.

## Features

- Search TMDB for documentaries and series
- Fixed members: Becs, Charlie, Lisa, Ashley and Krishna
- Open cases (watchlist) and closed cases (watched history)
- Include or exclude members' picks with the name filter
- UK streaming availability (via TMDB/JustWatch), runtimes and episode counts
- Automatic child-harm content warning from TMDB synopsis and keywords. TMDB has no dedicated flag for this, so it can miss content its metadata doesn't mention, and the page says so.
- Passcode-protected editing on `/`, read-only page at `/view`
- One open case per documentary

## How it fits together

- **Browser:** reads the list from `GET /api/requests`. It never talks to the database directly.
- **Server routes:** `/api/requests` (list, add) and `/api/requests/[id]` (close, reopen, delete). Changes need the editor cookie, which `/api/editor` sets when the right passcode is entered.
- **Database:** one MySQL table, `documentary_requests` (see `mysql/schema.sql`). The connection details only exist on the server.
- **TMDB:** search, details, streaming and content-warning lookups go through `/api/tmdb/*` so the token stays on the server.

## Environment variables

Set these in cPanel → Setup Node.js App → your app → Environment variables (or `.env.local` for local development). All of them are secret; none start with `NEXT_PUBLIC_`.

| Variable | What it is |
|---|---|
| `DB_NAME` | The database name, e.g. `krystaluser_tmc` |
| `DB_USER` | The database user, e.g. `krystaluser_tmc` |
| `DB_PASSWORD` | That user's password |
| `DB_HOST` | Optional, defaults to `localhost` |
| `TMDB_ACCESS_TOKEN` | TMDB API read access token |
| `EDIT_PASSCODE` | The club passcode. Changing it signs every device out. |
| `NODE_ENV` | `production` |

## First-time setup on Krystal

### 1. Database

1. cPanel → **Manage My Databases** (or **MySQL Databases**): create a database (e.g. `tmc`) and a user with a long password. cPanel adds your account name as a prefix, so note the full names.
2. On the same page, add the user to the database with **All Privileges**.
3. cPanel → **phpMyAdmin** → pick the database → **SQL** tab → paste the contents of `mysql/schema.sql` → **Go**.

### 2. Bring the data over from Supabase

1. In the Supabase dashboard, resume the project if it's paused.
2. Table Editor → `documentary_requests` → **Export** → **Export table as CSV**.
3. Convert it (needs Node, no packages):
   ```bash
   node scripts/supabase-csv-to-mysql.mjs ~/Downloads/documentary_requests_rows.csv > data.sql
   ```
4. phpMyAdmin → your database → **SQL** tab → paste `data.sql` → **Go**. Case numbers stay the same, and new cases carry on from the highest one.

`data.sql` and `*.csv` are git-ignored so the export doesn't end up in GitHub.

### 3. Website address

cPanel → **Domains**: add the domain or subdomain the app will live on (e.g. `tmc.yourdomain.co.uk`). Krystal issues the SSL certificate automatically; it can take a little while.

### 4. Code

cPanel → **Git Version Control** → **Create** → clone `https://github.com/becskr/tuesdayMurderClub.git` into a folder outside `public_html`, e.g. `tuesdayMurderClub`.

### 5. Node.js app

1. cPanel → **Setup Node.js App** → **Create Application**:
   - Node.js version: the newest one offered (20 or later)
   - Application mode: Production
   - Application root: `tuesdayMurderClub`
   - Application URL: the domain from step 3
   - Application startup file: `server.js`
   - Environment variables: everything in the table above
2. Click **Create**, then **Run NPM Install**.
3. Copy the `source …/activate` command shown at the top of the app's page. Open cPanel → **Terminal** (or SSH in), paste it, then run:
   ```bash
   cd ~/tuesdayMurderClub
   npm run build
   ```
4. Back in Setup Node.js App, click **Restart**. Open the site and check that the list loads, the passcode unlocks editing, and you can add and close a case.

## Updating the live site

Push to GitHub as usual, then in cPanel Terminal:

```bash
source /home/…/activate        # the command from Setup Node.js App
~/tuesdayMurderClub/scripts/deploy.sh
```

It pulls the latest code, installs packages, builds, and restarts the app.

## Running locally

Needs Node 20+ and a MySQL or MariaDB database with `mysql/schema.sql` applied. Put the environment variables in `.env.local`, then:

```bash
npm install
npm run dev
```

## Troubleshooting

- **Site shows a Passenger or 503 error:** check the log file set in Setup Node.js App, make sure `npm run build` finished, then Restart.
- **"Could not load the case files":** the database variables are wrong or the user isn't added to the database.
- **Build stops with "Killed" or out of memory:** shared hosting caps memory per account. Try again when the site is quiet, or ask Krystal support whether the limit can be raised for the build.
- **Krystal's Node.js support** covers the Node service itself, not app code, and Krystal recommends a VPS for heavy production Node apps. This app is small, but if it outgrows shared hosting, the same setup works on a VPS.
