import { NextResponse } from 'next/server'

function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

export async function GET(request) {
  const token = getToken()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'A valid TMDB ID is required.' }, { status: 400 })
  }

  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json({ error: 'Content type must be movie or tv.' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json(
      { error: 'TMDB access token is not configured.' },
      { status: 500 }
    )
  }

  try {
    const url = new URL(`https://api.themoviedb.org/3/${type}/${id}`)
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
      console.error('TMDB details lookup failed:', response.status, body)
      return NextResponse.json(
        { error: `TMDB details lookup failed (${response.status}).` },
        { status: response.status }
      )
    }

    const item = await response.json()
    const runtime = type === 'tv'
      ? (Array.isArray(item.episode_run_time) ? item.episode_run_time.find(Boolean) : null)
      : item.runtime

    return NextResponse.json({
      tmdb_id: item.id,
      media_type: type,
      title: type === 'tv' ? item.name : item.title,
      overview: item.overview || '',
      runtime: runtime || null,
      rating: item.vote_average || null,
      poster_url: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
    })
  } catch (error) {
    console.error('TMDB details lookup error:', error)
    return NextResponse.json(
      { error: 'Could not load documentary details.' },
      { status: 500 }
    )
  }
}
