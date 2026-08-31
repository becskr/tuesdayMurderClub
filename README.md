# Tuesday Murder Club

A shared documentary request list built with Next.js, Supabase and TMDB.

## Features

- Search TMDB for documentaries/movies
- Fixed requesters: Becs, Charlie, Lisa, Ashley and Krishna
- Shared watchlist
- Filter by requester
- Mark a documentary as watched (moves it to Watched History)
- Restore watched items
- Delete requests
- Duplicate protection for active watchlist items
- Mobile-first interface

## 1. Set up Supabase

Open the Supabase SQL Editor for the **Tuesday Murder Club** project and run `supabase.sql`.

## 2. Environment variables

Create `.env.local` locally, or add these variables to your Vercel project settings:

```text
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
TMDB_ACCESS_TOKEN=your_tmdb_api_read_access_token
```

`TMDB_ACCESS_TOKEN` is only used in Next.js server routes and should not be exposed as a `NEXT_PUBLIC_` variable.

## 3. Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## 4. Deploy

Deploy the project to Vercel and add the same three environment variables in the Vercel project settings before deploying.

## Security

`.env.local` is intentionally excluded from Git and from the distributable ZIP. Do not commit the TMDB token to a repository.
