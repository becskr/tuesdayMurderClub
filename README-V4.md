# Tuesday Murder Club V4

This update adds:

- Better series runtime display: multi-episode titles show episode count and average minutes per episode.
- Automatic child-harm warning when TMDB synopsis/keywords suggest child murder/death or child abuse/exploitation.
- More forgiving documentary search: multiple relaxed title queries are merged and fuzzy-ranked.

## Deploy

Replace the files in your existing GitHub repository with this package and commit. Vercel should redeploy automatically.

No Supabase migration is required for V4. Runtime/episode information and content warnings are fetched live from TMDB for both existing and new entries.

## Important content-warning limitation

TMDB does not provide a dedicated parental/content-trigger flag for child murder or abuse. The warning is therefore a conservative automated check of TMDB synopsis and keyword metadata. It can miss content where TMDB metadata does not mention it. The UI says this explicitly rather than presenting the warning as guaranteed.

## V4.1: Supabase keep-alive

This package adds a Vercel Cron endpoint at `/api/keepalive`. Once per day it performs a harmless one-row read from the `documentaries` table.

In Vercel, add an environment variable named `CRON_SECRET` with a long random value. Do not put that value in this repository. Vercel will send it as a Bearer token when invoking the cron endpoint.

The schedule is defined in `vercel.json` as `0 12 * * *` (daily at 12:00 UTC).
