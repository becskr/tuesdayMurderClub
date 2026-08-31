import { NextResponse } from 'next/server'

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  const token = process.env.TMDB_READ_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'TMDB is not configured.' }, { status: 500 })

  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 3600 }
  })

  if (!res.ok) return NextResponse.json({ error: 'TMDB lookup failed.' }, { status: res.status })
  const m = await res.json()

  return NextResponse.json({
    tmdb_id: m.id,
    title: m.title,
    overview: m.overview,
    runtime: m.runtime,
    rating: m.vote_average,
    poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null
  })
}
