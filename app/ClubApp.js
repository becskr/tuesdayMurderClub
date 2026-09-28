'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, FolderOpen, History, Lock, Plus, Search, Trash2, Undo2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PEOPLE } from '../lib/people'

// mode 'edit': the club's page. Editing needs the passcode once per device.
// mode 'view': read-only, never shows editing controls.
export default function ClubApp({ mode = 'edit' }) {
  const [editor, setEditor] = useState(null)
  const [passcode, setPasscode] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [items, setItems] = useState([])
  const [view, setView] = useState('watchlist')
  const [included, setIncluded] = useState(PEOPLE)
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
    if (mode !== 'edit') return
    fetch('/api/editor', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setEditor(!!data.editor))
      .catch(() => setEditor(false))
  }, [mode])

  const canEdit = mode === 'edit' && editor === true
  // /view can open the add form to show it off, but can't submit it.
  const canOpenForm = canEdit || mode === 'view'

  async function unlock(event) {
    event.preventDefault()
    setUnlocking(true)
    setUnlockError('')
    try {
      const res = await fetch('/api/editor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode }) })
      const data = await res.json()
      if (res.ok) { setEditor(true); setPasscode('') }
      else setUnlockError(data.error || 'Could not unlock editing.')
    } catch {
      setUnlockError('Could not unlock editing.')
    }
    setUnlocking(false)
  }

  async function lock() {
    await fetch('/api/editor', { method: 'DELETE' })
    setEditor(false)
    setModal(false)
  }

  // Sends a change to the server and reloads the list. Returns an error message or ''.
  async function change(url, options) {
    try {
      const res = await fetch(url, { ...options, headers: { 'content-type': 'application/json' } })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) setEditor(false)
      if (!res.ok) return data.error || 'Something went wrong. Try again.'
      await load()
      return ''
    } catch {
      return 'Could not reach the server. Try again.'
    }
  }

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
    return inView && included.includes(item.requested_by)
  }), [items, view, included])

  const allSelected = included.length === PEOPLE.length
  const noneSelected = included.length === 0
  const hiddenCount = items.filter(i => (view === 'watchlist' ? !i.watched_at : !!i.watched_at) && !included.includes(i.requested_by)).length

  function togglePerson(person) {
    setIncluded(current => current.includes(person)
      ? current.filter(p => p !== person)
      : PEOPLE.filter(p => p === person || current.includes(p)))
  }

  async function addRequest() {
    if (!selected) return
    setSaving(true)
    setError('')

    const duplicate = items.some(i => i.tmdb_id === selected.tmdb_id && i.media_type === selected.media_type && !i.watched_at)
    if (duplicate) {
      setError('That documentary is already on the watchlist.')
      setSaving(false)
      return
    }

    const message = await change('/api/requests', {
      method: 'POST',
      body: JSON.stringify({ tmdb_id: selected.tmdb_id, media_type: selected.media_type, requested_by: requestedBy }),
    })

    if (message) setError(message)
    else closeModal()
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
    const message = await change(`/api/requests/${item.id}`, { method: 'PATCH', body: JSON.stringify({ watched: !item.watched_at }) })
    setError(message)
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”?`)) return
    const message = await change(`/api/requests/${item.id}`, { method: 'DELETE' })
    setError(message)
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
        {canEdit && <div className="editTools">
          <button className="addTop" onClick={() => setModal(true)}><Plus size={18}/> Open a case</button>
          <button className="lockBtn" onClick={lock}><Lock size={13}/> Lock editing</button>
        </div>}
        {mode === 'view' && <div className="editTools">
          <button className="addTop" onClick={() => setModal(true)}><Plus size={18}/> Open a case</button>
          <span className="viewBadge"><Eye size={15}/> View only</span>
        </div>}
      </div>
    </header>

    {mode === 'edit' && editor === false && <form className="unlockBar" onSubmit={unlock}>
      <div className="unlockInner">
        <label htmlFor="passcode"><Lock size={14}/> Viewing only. Enter the club passcode to add or close cases.</label>
        <div className="unlockField">
          <input id="passcode" type="password" autoComplete="current-password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Passcode"/>
          <button className="primary" disabled={!passcode || unlocking}>{unlocking ? 'Checking…' : 'Unlock'}</button>
        </div>
        {unlockError && <p className="unlockError">{unlockError}</p>}
      </div>
    </form>}

    <section className="shell">
      <nav className="tabs">
        <button className={view === 'watchlist' ? 'active' : ''} onClick={() => setView('watchlist')}><FolderOpen size={16}/> Open cases</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}><History size={16}/> Closed cases</button>
      </nav>

      <div className="filters">
        <span className="filterLabel">Filed by</span>
        {PEOPLE.map(p => <button key={p} className={included.includes(p) ? 'active' : 'excluded'} aria-pressed={included.includes(p)} onClick={() => togglePerson(p)} title={included.includes(p) ? `Hide ${p}'s picks` : `Show ${p}'s picks`}>
          <i className="initial">{p[0]}</i>{p}
        </button>)}
        <span className="bulk">
          <button className="bulkBtn" disabled={allSelected} onClick={() => setIncluded(PEOPLE)}>Select all</button>
          <button className="bulkBtn" disabled={noneSelected} onClick={() => setIncluded([])}>Deselect all</button>
        </span>
      </div>

      {!noneSelected && hiddenCount > 0 && <p className="hiddenNote">{hiddenCount} {hiddenCount === 1 ? 'case' : 'cases'} hidden by your filter.</p>}

      {error && !modal && <p className="error">{error}</p>}

      {loading ? <div className="empty"><div className="emptyIcon spin">🔍</div><p className="typed">Dusting for prints…</p></div> : shown.length === 0 ?
        <div className="empty">
          <div className="emptyIcon">{view === 'watchlist' ? '🕵️' : '🗄️'}</div>
          <h2>{noneSelected ? 'No one selected' : hiddenCount > 0 ? 'Nothing from this lot' : view !== 'watchlist' ? 'The archive is empty' : 'No open cases. Suspiciously quiet.'}</h2>
          <p>{noneSelected ? 'Pick at least one name to see their cases.' : hiddenCount > 0 ? 'Everything here was filed by someone you’ve deselected.' : view !== 'watchlist' ? 'Documentaries you finish will be filed away here.' : 'Somebody file the first documentary before the trail goes cold.'}</p>
          {noneSelected && <button className="primary" onClick={() => setIncluded(PEOPLE)}>Select all</button>}
          {canOpenForm && view === 'watchlist' && !noneSelected && hiddenCount === 0 && <button className="primary" onClick={() => setModal(true)}><Plus size={18}/> Open a case</button>}
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
              {canEdit && <div className="actions">
                <button className="watch" onClick={() => toggleWatched(item)}>
                  {item.watched_at ? <><Undo2 size={16}/> Reopen case</> : <><Check size={16}/> Case closed</>}
                </button>
                <button className="iconBtn" onClick={() => remove(item)} title="Delete" aria-label={`Delete ${item.title}`}><Trash2 size={17}/></button>
              </div>}
            </div>
            <span className="stamp" aria-hidden="true">{item.watched_at ? 'Solved' : 'Unsolved'}</span>
          </article>)}
        </div>}
    </section>

    {canOpenForm && modal && <div className="backdrop" onMouseDown={closeModal}>
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
        <button className="primary full" disabled={!canEdit || !selected || saving} onClick={addRequest}>{saving ? 'Filing…' : 'File the case'}</button>
        {!canEdit && <p className="formNote"><Eye size={14}/> This is the view-only link, so filing is switched off.</p>}
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
