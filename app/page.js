'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, History, Plus, Search, Trash2, Undo2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PEOPLE = ['Becs', 'Charlie', 'Lisa', 'Ashley', 'Krishna']

export default function Home() {
  const [items, setItems] = useState([])
  const [view, setView] = useState('watchlist')
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [requestedBy, setRequestedBy] = useState('Becs')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState({})

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
    return inView && byPerson
  }), [items, view, filter])

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

  return <main>
    <header className="topbar">
      <div>
        <span className="eyebrow">Tuesday Murder Club</span>
        <h1>Documentary List</h1>
      </div>
      <button className="addTop" onClick={() => setModal(true)}><Plus size={18}/> Add</button>
    </header>

    <section className="shell">
      <nav className="tabs">
        <button className={view === 'watchlist' ? 'active' : ''} onClick={() => setView('watchlist')}>Watchlist</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}><History size={16}/> Watched history</button>
      </nav>

      <div className="filters">
        {['All', ...PEOPLE].map(p => <button key={p} className={filter === p ? 'active' : ''} onClick={() => setFilter(p)}>{p}</button>)}
      </div>

      {error && !modal && <p className="error">{error}</p>}

      {loading ? <div className="empty">Loading…</div> : shown.length === 0 ?
        <div className="empty">
          <div className="emptyIcon">🎬</div>
          <h2>{view === 'watchlist' ? 'Nothing queued yet' : 'No watched documentaries yet'}</h2>
          <p>{view === 'watchlist' ? 'Add the first documentary suggestion.' : 'Finished documentaries will appear here.'}</p>
          {view === 'watchlist' && <button className="primary" onClick={() => setModal(true)}><Plus size={18}/> Add documentary</button>}
        </div> :
        <div className="grid">{shown.map(item =>
          <article className="card" key={item.id}>
            <div className="poster">{item.poster_url ? <img src={item.poster_url} alt=""/> : <span>🎞️</span>}</div>
            <div className="content">
              <h2>{item.title}</h2>
              <p className="meta">Requested by <strong>{item.requested_by}</strong>{item.runtime ? ` · ${item.runtime} min` : ''}{item.rating ? ` · ★ ${Number(item.rating).toFixed(1)}` : ''}</p>
              <p className="overview">{item.overview || 'No synopsis available.'}</p>
              <ProviderInfo data={providers[`${item.media_type}-${item.tmdb_id}`]} />
              <div className="actions">
                <button className="watch" onClick={() => toggleWatched(item)}>
                  {item.watched_at ? <><Undo2 size={16}/> Restore</> : <><Check size={16}/> Mark watched</>}
                </button>
                <button className="iconBtn" onClick={() => remove(item)} title="Delete"><Trash2 size={17}/></button>
              </div>
            </div>
          </article>)}
        </div>}
    </section>

    {modal && <div className="backdrop" onMouseDown={closeModal}>
      <section className="modal" onMouseDown={e => e.stopPropagation()}>
        <button className="close" onClick={closeModal}><X/></button>
        <span className="eyebrow">New suggestion</span>
        <h2>Add a documentary</h2>

        <label>Documentary</label>
        <div className="searchBox"><Search size={18}/><input autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }} placeholder="Search for a documentary…"/></div>

        {results.length > 0 && <div className="results">{results.map(r =>
          <button key={`${r.media_type}-${r.tmdb_id}`} onClick={() => { setSelected(r); setQuery(r.title); setResults([]) }}>
            {r.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} alt=""/> : <div className="miniPoster">🎞️</div>}
            <span><strong>{r.title}</strong><small>{r.media_type === 'tv' ? 'Series' : 'Film'} · {r.overview || 'No synopsis available.'}</small></span>
          </button>)}
        </div>}

        <label>Requested by</label>
        <select value={requestedBy} onChange={e => setRequestedBy(e.target.value)}>
          {PEOPLE.map(p => <option key={p}>{p}</option>)}
        </select>

        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={!selected || saving} onClick={addRequest}>{saving ? 'Adding…' : 'Add to watchlist'}</button>
      </section>
    </div>}
  </main>
}


function ProviderInfo({ data }) {
  if (!data) return <div className="providers loadingProviders">Checking UK streaming…</div>
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
