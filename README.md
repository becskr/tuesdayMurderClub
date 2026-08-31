# Tuesday Murder Club

A shared documentary watchlist for Becs, Charlie, Lisa, Ashley and Krishna.

## Set up Supabase

Open the SQL Editor in the **Tuesday Murder Club** Supabase project and run `supabase.sql`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `TMDB_READ_ACCESS_TOKEN`

The Supabase publishable key is intended for browser use with RLS enabled. Keep the TMDB token server-side.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

Import the project into Vercel and add the same three environment variables in Vercel Project Settings > Environment Variables.

## Features

- TMDB autocomplete search
- Fixed requester list
- Watchlist + watched history
- Filter by requester
- Poster, synopsis, runtime and rating
- Mark watched / restore
- Delete mistakes
- Duplicate prevention for active watchlist items
