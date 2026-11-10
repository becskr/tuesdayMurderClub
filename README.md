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
- **Building:** Krystal's shared hosting can't build Next.js (its Linux is too old for the fast compiler, and the fallback runs out of memory). GitHub Actions builds the app on every push and commits a ready-to-run copy to the `krystal-build` branch, which is what Krystal runs. See `.github/workflows/krystal-build.yml`.

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

Don't add `NODE_ENV` yourself: setting the app to Production mode in cPanel does that.

If the app says a variable isn't set even though it's in Setup Node.js App (some cPanel servers don't pass them through), put them in a file called `.env` in the app folder on Krystal instead, one per line:

```text
EDIT_PASSCODE=your passcode
DB_NAME=krystaluser_tmc
DB_USER=krystaluser_tmc
DB_PASSWORD=the database password
TMDB_ACCESS_TOKEN=your TMDB token
```

Create it with File Manager (tick "Show Hidden Files" in Settings to see it afterwards), then Restart the app. Git ignores it, so it's never uploaded or overwritten.

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

1. Push to GitHub, then open the repo's **Actions** tab and wait for **Build for Krystal** to finish (a green tick, about 2 minutes). It creates the `krystal-build` branch.
2. cPanel → **Git Version Control** → **Create** → clone `https://github.com/becskr/tuesdayMurderClub.git` into a folder outside `public_html`, e.g. `tuesdayMurderClub`.
3. Open the repo in Git Version Control → **Basic Information** → set **Checked-Out Branch** to `krystal-build` → **Update**.

If git refuses because a file "would be overwritten" (cPanel creates a placeholder `server.js`), delete or rename that file in File Manager and try again.

### 5. Node.js app

1. cPanel → **Setup Node.js App** → **Create Application** (or edit the existing one):
   - Node.js version: the newest one offered (20 or later)
   - Application mode: **Production**
   - Application root: `tuesdayMurderClub`
   - Application URL: the domain from step 3
   - Application startup file: `server.js`
   - Environment variables: everything in the table above
2. Click **Save** (or **Create**), then **Restart**. There's no need to run NPM Install or a build: everything is already in the `app` folder.
3. Open the site and check that the list loads, the passcode unlocks editing, and you can add and close a case.

## Updating the live site

1. Push to GitHub and wait for **Build for Krystal** to finish in the repo's **Actions** tab.
2. cPanel → **Git Version Control** → the repo → **Pull or Deploy** → **Update from Remote**.
3. cPanel → **Setup Node.js App** → **Restart**.

`BUILD_COMMIT` in the app folder shows which commit is live.

## Running locally

Needs Node 20+ and a MySQL or MariaDB database with `mysql/schema.sql` applied. Put the environment variables in `.env.local`, then:

```bash
npm install
npm run dev
```

## Troubleshooting

- **Site shows a Passenger or 503 error:** check the log file set in Setup Node.js App. Make sure the checked-out branch is `krystal-build` and the startup file is `server.js`, then Restart.
- **"Could not load the case files":** the database variables are wrong or the user isn't added to the database.
- **No `krystal-build` branch, or it's out of date:** check the **Actions** tab on GitHub for a failed run and open it to see why.
- **Don't build on Krystal.** "Turbopack is not supported", `spawn … EAGAIN`, `std::bad_alloc` and `useContext` errors all came from trying. GitHub builds it instead.
- **Krystal's Node.js support** covers the Node service itself, not app code, and Krystal recommends a VPS for heavy production Node apps. This app is small, but if it outgrows shared hosting, the same setup works on a VPS.
