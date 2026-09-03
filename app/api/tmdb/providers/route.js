import { NextResponse } from 'next/server'

function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

function uniqueProviders(groups = []) {
  const seen = new Set()
  return groups
    .flat()
    .filter(provider => {
      if (!provider?.provider_id || seen.has(provider.provider_id)) return false
      seen.add(provider.provider_id)
      return true
    })
    .map(provider => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logo_url: provider.logo_path
        ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
        : null,
    }))
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
    return NextResponse.json({ error: 'TMDB access token is not configured.' }, { status: 500 })
  }

  try {
    const response = await fetch(`https://api.themoviedb.org/3/${type}/${id}/watch/providers`, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('TMDB watch provider lookup failed:', response.status, body)
      return NextResponse.json(
        { error: `TMDB watch provider lookup failed (${response.status}).` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const gb = data.results?.GB || null

    if (!gb) {
      return NextResponse.json({
        streaming: [],
        rent: [],
        buy: [],
        link: null,
      })
    }

    return NextResponse.json({
      // Treat subscription, free and ad-supported availability as “streaming”.
      streaming: uniqueProviders([gb.flatrate || [], gb.free || [], gb.ads || []]),
      rent: uniqueProviders([gb.rent || []]),
      buy: uniqueProviders([gb.buy || []]),
      link: gb.link || null,
    })
  } catch (error) {
    console.error('TMDB watch provider lookup error:', error)
    return NextResponse.json({ error: 'Could not load UK streaming availability.' }, { status: 500 })
  }
}
