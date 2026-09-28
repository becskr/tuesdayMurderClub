function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

// Returns { status, body }: body is the documentary row on success, or { error }.
export async function fetchDetails(id, type) {
  const token = getToken()

  if (!id || !/^\d+$/.test(String(id))) {
    return { status: 400, body: { error: 'A valid TMDB ID is required.' } }
  }

  if (type !== 'movie' && type !== 'tv') {
    return { status: 400, body: { error: 'Content type must be movie or tv.' } }
  }

  if (!token) {
    return { status: 500, body: { error: 'TMDB access token is not configured.' } }
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
      const text = await response.text()
      console.error('TMDB details lookup failed:', response.status, text)
      return { status: response.status, body: { error: `TMDB details lookup failed (${response.status}).` } }
    }

    const item = await response.json()
    const runtime = type === 'tv'
      ? (Array.isArray(item.episode_run_time) ? item.episode_run_time.find(Boolean) : null)
      : item.runtime

    return {
      status: 200,
      body: {
        tmdb_id: item.id,
        media_type: type,
        title: type === 'tv' ? item.name : item.title,
        overview: item.overview || '',
        runtime: runtime || null,
        rating: item.vote_average || null,
        poster_url: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : null,
      },
    }
  } catch (error) {
    console.error('TMDB details lookup error:', error)
    return { status: 500, body: { error: 'Could not load documentary details.' } }
  }
}
