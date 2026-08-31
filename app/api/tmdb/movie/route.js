import { NextResponse } from 'next/server'

function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

export async function GET(request) {
  const token = getToken()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'A valid TMDB movie ID is required.' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json(
      { error: 'TMDB access token is not configured.' },
      { status: 500 }
    )
  }

  try {
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`)
    url.searchParams.set('language', 'en-GB')

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('TMDB movie lookup failed:', response.status, body)
      return NextResponse.json(
        { error: `TMDB movie lookup failed (${response.status}).` },
        { status: response.status }
      )
    }

    const movie = await response.json()

    return NextResponse.json({
      tmdb_id: movie.id,
      title: movie.title,
      overview: movie.overview || '',
      runtime: movie.runtime || null,
      rating: movie.vote_average || null,
      poster_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
    })
  } catch (error) {
    console.error('TMDB movie lookup error:', error)
    return NextResponse.json(
      { error: 'Could not load documentary details.' },
      { status: 500 }
    )
  }
}
