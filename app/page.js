'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, FolderOpen, History, Plus, Search, Trash2, Undo2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PEOPLE = ['Becs', 'Charlie', 'Lisa', 'Ashley', 'Krishna']

export default function Home() {
  const [items, setItems] = useState([])
  const [view, setView] = useState('watchlist')
  const [filter, setFilter] = useState('All')
  const [absent, setAbsent] = useState([])
  const [modal, setModal] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [requestedBy, setRequestedBy] = useState('Becs')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState({})
  const [enrichment, setEnrichment] = useState({})

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('documentary_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const missing = items.filter(item => !enrichment[`${item.media_type}-${item.tmdb_id}`])
    if (missing.length === 0) return

    let cancelled = false

    async function loadEnrichment() {
      const entries = await Promise.all(missing.map(async item => {
        const key = `${item.media_type}-${item.tmdb_id}`
        try {
          const res = await fetch(`/api/tmdb/enrichment?id=${item.tmdb_id}&type=${item.media_type}`)
          if (!res.ok) return [key, { unavailable: true }]
          return [key, await res.json()]
        } catch {
          return [key, { unavailable: true }]
        }
      }))

      if (!cancelled) setEnrichment(current => ({ ...current, ...Object.fromEntries(entries) }))
    }

    loadEnrichment()
    return () => { cancelled = true }
  }, [items, enrichment])

  useEffect(() => {
    const missing = items.filter(item => !providers[`${item.media_type}-${item.tmdb_id}`])
    if (missing.length === 0) return

    let cancelled = false

    async function loadProviders() {
      const entries = await Promise.all(missing.map(async item => {
        const key = `${item.media_type}-${item.tmdb_id}`
        try {
          const res = await fetch(`/api/tmdb/providers?id=${item.tmdb_id}&type=${item.media_type}`)
          if (!res.ok) return [key, { streaming: [], rent: [], buy: [], link: null, unavailable: true }]
          return [key, await res.json()]
        } catch {
          return [key, { streaming: [], rent: [], buy: [], link: null, unavailable: true }]
        }
      }))

      if (!cancelled) {
        setProviders(current => ({ ...current, ...Object.fromEntries(entries) }))
      }
    }

    loadProviders()
    return () => { cancelled = true }
  }, [items, providers])

  useEffect(() => {
    if (!modal || query.trim().length < 2 || selected) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setError('')
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (!res.ok) {
          setResults([])
          setError(data.error || 'Could not search for documentaries.')
          return
        }
        setResults(data.results || [])
      } catch {
        setResults([])
        setError('Could not search for documentaries.')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, modal, selected])

  const shown = useMemo(() => items.filter(item => {
    const inView = view === 'watchlist' ? !item.watched_at : !!item.watched_at
    const byPerson = filter === 'All' || item.requested_by === filter
    const present = view !== 'watchlist' || !absent.includes(item.requested_by)
    return inView && byPerson && present
  }), [items, view, filter, absent])

  const hiddenCount = view === 'watchlist'
    ? items.filter(i => !i.watched_at && absent.includes(i.requested_by) && (filter === 'All' || i.requested_by === filter)).length
    : 0

  function toggleAbsent(person) {
    setAbsent(current => current.includes(person) ? current.filter(p => p !== person) : [...current, person])
    if (filter === person) setFilter('All')
  }

  const listNames = names => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

  async function addRequest() {
    if (!selected) return
    setSaving(true)
    setError('')

    const detailRes = await fetch(`/api/tmdb/details?id=${selected.tmdb_id}&type=${selected.media_type}`)
    const documentary = await detailRes.json()

    if (!detailRes.ok) {
      setError(documentary.error || 'Could not load documentary.')
      setSaving(false)
      return
    }

    const duplicate = items.some(i => i.tmdb_id === documentary.tmdb_id && i.media_type === documentary.media_type && !i.watched_at)
    if (duplicate) {
      setError('That documentary is already on the watchlist.')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('documentary_requests')
      .insert({ ...documentary, requested_by: requestedBy })

    if (error) setError(error.message)
    else {
      closeModal()
      await load()
    }
    setSaving(false)
  }

  function closeModal() {
    setModal(false)
    setQuery('')
    setResults([])
    setSelected(null)
    setRequestedBy('Becs')
    setError('')
  }

  async function toggleWatched(item) {
    await supabase
      .from('documentary_requests')
      .update({ watched_at: item.watched_at ? null : new Date().toISOString() })
      .eq('id', item.id)
    await load()
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”?`)) return
    await supabase.from('documentary_requests').delete().eq('id', item.id)
    await load()
  }

  const openCount = items.filter(i => !i.watched_at).length
  const closedCount = items.length - openCount

  return <main>
    <header className="topbar">
      <div className="tape" aria-hidden="true"><span>Crime scene · Do not cross · Crime scene · Do not cross · Crime scene · Do not cross · Crime scene · Do not cross · Crime scene · Do not cross ·</span></div>
      <div className="topInner">
        <div>
          <span className="eyebrow">Est. on Tuesdays · Case files</span>
          <h1>Tuesday <em>Murder</em> Club</h1>
          <p className="tally"><span><b>{openCount}</b> open</span><span><b>{closedCount}</b> closed</span></p>
        </div>
        <button className="addTop" onClick={() => setModal(true)}><Plus size={18}/> Open a case</button>
      </div>
    </header>

    <section className="shell">
      <nav className="tabs">
        <button className={view === 'watchlist' ? 'active' : ''} onClick={() => setView('watchlist')}><FolderOpen size={16}/> Open cases</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}><History size={16}/> Closed cases</button>
      </nav>

      <div className="filters">
        <span className="filterLabel">Filed by</span>
        {['All', ...PEOPLE].map(p => <button key={p} className={filter === p ? 'active' : ''} onClick={() => setFilter(p)}>
          {p !== 'All' && <i className="initial">{p[0]}</i>}{p === 'All' ? 'Everyone' : p}
        </button>)}
      </div>

      {view === 'watchlist' && <div className="filters absentRow">
        <span className="filterLabel">Missing tonight</span>
        {PEOPLE.map(p => <button key={p} className={absent.includes(p) ? 'absent' : ''} aria-pressed={absent.includes(p)} onClick={() => toggleAbsent(p)} title={absent.includes(p) ? `${p} is back in` : `Hide ${p}'s picks`}>
          <i className="initial">{absent.includes(p) ? '✕' : p[0]}</i>{p}
        </button>)}
        {absent.length > 0 && <button className="clearAbsent" onClick={() => setAbsent([])}>Everyone's here</button>}
      </div>}

      {view === 'watchlist' && hiddenCount > 0 && <p className="hiddenNote">Hiding {hiddenCount} {hiddenCount === 1 ? 'pick' : 'picks'} from {listNames(absent)} while they're away.</p>}

      {error && !modal && <p className="error">{error}</p>}

      {loading ? <div className="empty"><div className="emptyIcon spin">🔍</div><p className="typed">Dusting for prints…</p></div> : shown.length === 0 ?
        <div className="empty">
          <div className="emptyIcon">{view === 'watchlist' ? '🕵️' : '🗄️'}</div>
          <h2>{view !== 'watchlist' ? 'The archive is empty' : hiddenCount > 0 ? 'No cases left for tonight' : 'No open cases. Suspiciously quiet.'}</h2>
          <p>{view !== 'watchlist' ? 'Documentaries you finish will be filed away here.' : hiddenCount > 0 ? `Every open case was filed by ${listNames(absent)}. Save them for when they're back.` : 'Somebody file the first documentary before the trail goes cold.'}</p>
          {view === 'watchlist' && <button className="primary" onClick={() => setModal(true)}><Plus size={18}/> Open a case</button>}
        </div> :
        <div className="grid">{shown.map((item, index) =>
          <article className={`card ${item.watched_at ? 'closed' : ''}`} key={item.id} style={{ '--delay': `${Math.min(index, 8) * 60}ms` }}>
            <div className="poster">{item.poster_url ? <img src={item.poster_url} alt=""/> : <span>🎞️</span>}</div>
            <div className="content">
              <div className="caseLine">
                <span>Case #{String(item.id).padStart(4, '0')}</span>
                <span className="filedBy">Filed by {item.requested_by}</span>
              </div>
              <h2>{item.title}</h2>
              <p className="meta">{item.media_type === 'tv' ? 'Series' : 'Film'}<RuntimeInfo item={item} data={enrichment[`${item.media_type}-${item.tmdb_id}`]} />{item.rating ? <> · <span className="rating">★ {Number(item.rating).toFixed(1)}</span></> : ''}{item.watched_at ? ` · Closed ${new Date(item.watched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p>
              <ContentWarning data={enrichment[`${item.media_type}-${item.tmdb_id}`]} />
              <p className="overview">{item.overview || 'No synopsis available.'}</p>
              <ProviderInfo data={providers[`${item.media_type}-${item.tmdb_id}`]} />
              <div className="actions">
                <button className="watch" onClick={() => toggleWatched(item)}>
                  {item.watched_at ? <><Undo2 size={16}/> Reopen case</> : <><Check size={16}/> Case closed</>}
                </button>
                <button className="iconBtn" onClick={() => remove(item)} title="Delete" aria-label={`Delete ${item.title}`}><Trash2 size={17}/></button>
              </div>
            </div>
            <span className="stamp" aria-hidden="true">{item.watched_at ? 'Solved' : 'Unsolved'}</span>
          </article>)}
        </div>}
    </section>

    {modal && <div className="backdrop" onMouseDown={closeModal}>
      <section className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={closeModal} aria-label="Close"><X/></button>
        <span className="eyebrow">New case file</span>
        <h2>What are we investigating?</h2>

        <label>Documentary</label>
        <div className="searchBox"><Search size={18}/><input autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Search for a documentary…"/></div>

        {results.length > 0 && <div className="results">{results.map(r =>
          <button key={`${r.media_type}-${r.tmdb_id}`} onClick={() => { setSelected(r); setQuery(r.title); setResults([]) }}>
            {r.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt=""/> : <div className="miniPoster">🎞️</div>}
            <span><strong>{r.title}</strong><small>{r.media_type === 'tv' ? 'Series' : 'Film'} · {r.overview || 'No synopsis available.'}</small></span>
          </button>)}
        </div>}

        <label>Filed by</label>
        <select value={requestedBy} onChange={e => setRequestedBy(e.target.value)}>
          {PEOPLE.map(p => <option key={p}>{p}</option>)}
        </select>

        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={!selected || saving} onClick={addRequest}>{saving ? 'Filing…' : 'File the case'}</button>
      </section>
    </div>}
  </main>
}


function RuntimeInfo({ item, data }) {
  if (!data || data.unavailable) return item.runtime ? <> · {item.runtime} min</> : null
  if (item.media_type === 'tv' && data.episode_count > 1) {
    return <> · {data.episode_count} episodes{data.average_episode_runtime ? ` · ~${data.average_episode_runtime} min each` : ''}</>
  }
  const runtime = data.runtime || item.runtime
  return runtime ? <> · {runtime} min</> : null
}

function ContentWarning({ data }) {
  if (!data?.child_harm_warning) return null
  const reasons = (data.child_harm_reasons || []).join(' and ')
  return <div className="contentWarning" role="note">
    <strong>⚠️ Child harm warning</strong>
    <span>This documentary may contain {reasons || 'child murder, death or abuse'} content.</span>
    <small>Automatic warning based on TMDB synopsis/keywords; it may not catch every case.</small>
  </div>
}


function ProviderInfo({ data }) {
  if (!data) return <div className="providers loadingProviders">Tracing UK streaming…</div>
  if (data.unavailable) return <div className="providers subtle">UK streaming availability unavailable.</div>

  const streaming = data.streaming || []
  const rent = data.rent || []
  const buy = data.buy || []

  if (streaming.length === 0 && rent.length === 0 && buy.length === 0) {
    return <div className="providers subtle">No UK streaming availability listed.</div>
  }

  const names = list => list.map(p => p.name).join(' · ')

  return <div className="providers">
    {streaming.length > 0 && <div className="providerRow"><strong>Stream in the UK</strong><span>{names(streaming)}</span></div>}
    {(rent.length > 0 || buy.length > 0) && <div className="providerRow secondary"><strong>Rent / buy</strong><span>{names([...rent, ...buy].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i))}</span></div>}
    <small>Streaming data by JustWatch</small>
  </div>
}
