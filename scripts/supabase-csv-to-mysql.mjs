// Converts a Supabase CSV export of documentary_requests into MySQL INSERTs.
//
//   node scripts/supabase-csv-to-mysql.mjs documentary_requests_rows.csv > data.sql
//
// Then paste data.sql into phpMyAdmin's SQL tab (after mysql/schema.sql).
// No packages needed. Times are converted to UTC.
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/supabase-csv-to-mysql.mjs <export.csv> > data.sql')
  process.exit(1)
}

// RFC 4180 CSV: quoted fields may contain commas, quotes ("") and newlines.
function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false, wasQuoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') { quoted = true; wasQuoted = true }
    else if (c === ',') { row.push({ field, wasQuoted }); field = ''; wasQuoted = false }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push({ field, wasQuoted }); rows.push(row); row = []; field = ''; wasQuoted = false
    } else field += c
  }
  if (field !== '' || wasQuoted || row.length) { row.push({ field, wasQuoted }); rows.push(row) }
  return rows.filter(r => !(r.length === 1 && r[0].field === '' && !r[0].wasQuoted))
}

const sqlString = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\0/g, '') + "'"

function sqlTime(value) {
  if (!value) return 'NULL'
  // Supabase writes e.g. "2026-09-25 16:34:00.123456+00"
  const iso = value.trim().replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new Error(`Unreadable time: ${value}`)
  return sqlString(date.toISOString().replace('T', ' ').replace('Z', ''))
}

const [header, ...records] = parseCsv(readFileSync(file, 'utf8').replace(/^﻿/, ''))
const names = header.map(h => h.field.trim())
const need = ['id', 'tmdb_id', 'media_type', 'title', 'overview', 'runtime', 'rating', 'poster_url', 'requested_by', 'created_at', 'watched_at']
const missing = need.filter(n => !names.includes(n))
if (missing.length) {
  console.error(`The CSV is missing columns: ${missing.join(', ')}`)
  process.exit(1)
}

const out = ['-- Generated from ' + file.split(/[\\/]/).pop(), 'START TRANSACTION;']
for (const record of records) {
  const get = n => record[names.indexOf(n)] || { field: '', wasQuoted: false }
  const text = n => { const v = get(n); return v.field === '' && !v.wasQuoted ? 'NULL' : sqlString(v.field) }
  const int = n => { const v = get(n).field.trim(); if (v === '') return 'NULL'; if (!/^-?\d+$/.test(v)) throw new Error(`${n} is not a whole number: ${v}`); return v }
  const num = n => { const v = get(n).field.trim(); if (v === '') return 'NULL'; if (!/^-?\d+(\.\d+)?$/.test(v)) throw new Error(`${n} is not a number: ${v}`); return v }
  out.push(
    'INSERT INTO documentary_requests (id, tmdb_id, media_type, title, overview, runtime, rating, poster_url, requested_by, created_at, watched_at) VALUES (' +
    [int('id'), int('tmdb_id'), text('media_type'), text('title'), text('overview'), int('runtime'), num('rating'), text('poster_url'), text('requested_by'), sqlTime(get('created_at').field), sqlTime(get('watched_at').field)].join(', ') +
    ');'
  )
}
out.push('COMMIT;')
console.log(out.join('\n'))
console.error(`Converted ${records.length} cases.`)
