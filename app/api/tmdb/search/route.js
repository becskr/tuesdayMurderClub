import { NextResponse } from 'next/server'

function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

export async function GET(request) {
  const token = getToken()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  if (!token) {
    return NextResponse.json(
      { error: 'TMDB access token is not configured.' },
      { status: 500 }
    )
  }

  try {
    const url = new URL('https://api.themoviedb.org/3/search/multi')
    url.searchParams.set('query', query)
    url.searchParams.set('include_adult', 'false')
    url.searchParams.set('language', 'en-GB')
    url.searchParams.set('page', '1')

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('TMDB multi-search failed:', response.status, body)
      return NextResponse.json(
        { error: `TMDB search failed (${response.status}).` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const results = (data.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 12)
      .map((item) => ({
        tmdb_id: item.id,
        media_type: item.media_type,
        title: item.media_type === 'tv' ? item.name : item.title,
        overview: item.overview || '',
        poster_path: item.poster_path,
      }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('TMDB search error:', error)
    return NextResponse.json(
      { error: 'Could not search TMDB.' },
      { status: 500 }
    )
  }
}
