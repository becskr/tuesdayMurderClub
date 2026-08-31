import { NextResponse } from 'next/server'

export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const token = process.env.TMDB_READ_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'TMDB is not configured.' }, { status: 500 })

  const url = new URL('https://api.themoviedb.org/3/search/movie')
  url.searchParams.set('query', q)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'en-GB')
  url.searchParams.set('region', 'GB')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store'
  })

  if (!res.ok) return NextResponse.json({ error: 'TMDB search failed.' }, { status: res.status })
  const data = await res.json()

  return NextResponse.json({
    results: (data.results || []).slice(0, 8).map(movie => ({
      tmdb_id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      rating: movie.vote_average
    }))
  })
}
