import { NextResponse } from 'next/server'

function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

const WARNING_GROUPS = [
  {
    reason: 'child murder/death',
    patterns: [
      /child murder/i, /murder(?:ed)? (?:of )?(?:a )?child/i, /murdered children/i,
      /child(?:ren)? (?:is|are|was|were|being )?(?:killed|murdered)/i,
      /death of (?:a )?child/i, /death of children/i, /child death/i,
      /infanticide/i, /filicide/i, /murdered (?:baby|infant)/i,
      /(?:baby|infant) (?:is|was|being )?(?:killed|murdered)/i,
    ],
  },
  {
    reason: 'child abuse/exploitation',
    patterns: [
      /child abuse/i, /abuse of (?:a )?child/i, /abused child/i, /abused children/i,
      /child sexual abuse/i, /sexual abuse of (?:a )?child/i, /child molest/i,
      /pedophil/i, /paedophil/i, /child trafficking/i, /child exploitation/i,
      /child prostitution/i, /abused (?:baby|infant)/i,
    ],
  },
]

function warningFromText(text) {
  const reasons = WARNING_GROUPS
    .filter(group => group.patterns.some(pattern => pattern.test(text)))
    .map(group => group.reason)
  return [...new Set(reasons)]
}

async function tmdbFetch(path, token, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!response.ok) return null
  return response.json()
}

async function tvEpisodeStats(id, item, token) {
  const seasons = (item.seasons || []).filter(season => season.season_number > 0 && season.episode_count > 0)
  const seasonData = await Promise.all(seasons.map(season =>
    tmdbFetch(`/tv/${id}/season/${season.season_number}`, token, { language: 'en-GB' })
  ))

  const episodes = seasonData.flatMap(season => season?.episodes || []).filter(Boolean)
  const runtimes = episodes.map(episode => Number(episode.runtime)).filter(runtime => Number.isFinite(runtime) && runtime > 0)
  const average = runtimes.length
    ? Math.round(runtimes.reduce((sum, runtime) => sum + runtime, 0) / runtimes.length)
    : null

  const fallbackRuntimes = (item.episode_run_time || []).map(Number).filter(runtime => runtime > 0)
  const fallbackAverage = fallbackRuntimes.length
    ? Math.round(fallbackRuntimes.reduce((sum, runtime) => sum + runtime, 0) / fallbackRuntimes.length)
    : null

  return {
    episode_count: Number(item.number_of_episodes) || episodes.length || null,
    average_episode_runtime: average || fallbackAverage || null,
  }
}

export async function GET(request) {
  const token = getToken()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'A valid TMDB ID is required.' }, { status: 400 })
  if (type !== 'movie' && type !== 'tv') return NextResponse.json({ error: 'Content type must be movie or tv.' }, { status: 400 })
  if (!token) return NextResponse.json({ error: 'TMDB access token is not configured.' }, { status: 500 })

  try {
    const item = await tmdbFetch(`/${type}/${id}`, token, { language: 'en-GB' })
    if (!item) return NextResponse.json({ error: 'Could not load TMDB metadata.' }, { status: 502 })

    const keywordData = await tmdbFetch(`/${type}/${id}/keywords`, token)
    const keywordItems = keywordData?.keywords || keywordData?.results || []
    const keywordText = keywordItems.map(keyword => keyword.name || '').join(' ')
    const searchableText = `${item.title || item.name || ''} ${item.overview || ''} ${keywordText}`
    const warningReasons = warningFromText(searchableText)

    let runtime = null
    let episode_count = null
    let average_episode_runtime = null

    if (type === 'movie') {
      runtime = Number(item.runtime) || null
    } else {
      const stats = await tvEpisodeStats(id, item, token)
      episode_count = stats.episode_count
      average_episode_runtime = stats.average_episode_runtime
      if (episode_count === 1) runtime = average_episode_runtime
    }

    return NextResponse.json({
      runtime,
      episode_count,
      average_episode_runtime,
      child_harm_warning: warningReasons.length > 0,
      child_harm_reasons: warningReasons,
      warning_basis: warningReasons.length ? 'TMDB synopsis/keywords' : null,
    })
  } catch (error) {
    console.error('TMDB enrichment error:', error)
    return NextResponse.json({ error: 'Could not load supplementary documentary information.' }, { status: 500 })
  }
}
