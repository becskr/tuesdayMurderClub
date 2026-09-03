# UK streaming availability

V3 adds live UK watch-provider data from TMDB/JustWatch.

No Supabase migration is required.

The app calls:

- `/3/movie/{movie_id}/watch/providers` for films
- `/3/tv/{series_id}/watch/providers` for TV/docuseries

It reads the `GB` result only.

The card displays:

- **Stream in the UK**: subscription (`flatrate`), free and ad-supported providers
- **Rent / buy**: rental and purchase providers, if present

Provider information is fetched live when the watchlist/history loads rather than stored in Supabase, because availability changes over time.

TMDB's watch-provider data is powered by JustWatch, so the UI includes the required JustWatch attribution.
