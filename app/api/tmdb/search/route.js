import { NextResponse } from 'next/server'

function getToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN
}

function normalize(value = '') {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function tokens(value = '') {
  return new Set(normalize(value).split(' ').filter(Boolean))
}

function similarity(query, title) {
  const q = normalize(query)
  const t = normalize(title)
  if (!q || !t) return 0
  if (q === t) return 100
  if (t.includes(q) || q.includes(t)) return 88

  const qa = tokens(q)
  const ta = tokens(t)
  let overlap = 0
  qa.forEach(word => { if (ta.has(word)) overlap += 1 })
  const union = new Set([...qa, ...ta]).size || 1
  const jaccard = overlap / union
  const coverage = overlap / Math.max(qa.size, 1)
  return Math.round((jaccard * 55 + coverage * 45) * 100) / 100
}

function queryVariants(query) {
  const variants = new Set([query.trim()])
  const punctuationRelaxed = query.replace(/[:–—-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (punctuationRelaxed) variants.add(punctuationRelaxed)

  // Advertised titles are often a subtitle or franchise prefix separated by punctuation.
  for (const separator of [':', ' – ', ' — ', ' - ']) {
    if (query.includes(separator)) {
      query.split(separator).map(part => part.trim()).filter(part => part.length >= 3).forEach(part => variants.add(part))
    }
  }

  const stopWords = new Set(['a', 'an', 'the', 'and', 'of', 'for', 'to', 'in', 'on', 'with'])
  const relaxedWords = normalize(query).split(' ').filter(word => word.length > 1 && !stopWords.has(word))
  if (relaxedWords.length >= 2) variants.add(relaxedWords.join(' '))

  return [...variants].slice(0, 5)
}

async function tmdbSearch(query, token) {
  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'en-GB')
  url.searchParams.set('page', '1')

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(`TMDB search failed (${response.status})`)
  return response.json()
}

export async function GET(request) {
  const token = getToken()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) return NextResponse.json({ results: [] })
  if (!token) return NextResponse.json({ error: 'TMDB access token is not configured.' }, { status: 500 })

  try {
    const variants = queryVariants(query)
    const responses = await Promise.all(variants.map(variant => tmdbSearch(variant, token)))
    const merged = new Map()

    responses.forEach((data, variantIndex) => {
      ;(data.results || [])
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .forEach((item, resultIndex) => {
          const key = `${item.media_type}-${item.id}`
          const title = item.media_type === 'tv' ? item.name : item.title
          const originalTitle = item.media_type === 'tv' ? item.original_name : item.original_title
          const score = Math.max(similarity(query, title), similarity(query, originalTitle))
          const rankBoost = Math.max(0, 12 - resultIndex) + (variantIndex === 0 ? 8 : 0)
          const combinedScore = score + rankBoost + Math.min(Number(item.popularity || 0) / 50, 5)

          const candidate = {
            tmdb_id: item.id,
            media_type: item.media_type,
            title,
            overview: item.overview || '',
            poster_path: item.poster_path,
            match_score: combinedScore,
          }

          const existing = merged.get(key)
          if (!existing || candidate.match_score > existing.match_score) merged.set(key, candidate)
        })
    })

    const results = [...merged.values()]
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 18)
      .map(({ match_score, ...item }) => item)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('TMDB fuzzy search error:', error)
    return NextResponse.json({ error: 'Could not search TMDB.' }, { status: 500 })
  }
}
