import { db } from './db'

const COLUMNS = 'id, tmdb_id, media_type, title, overview, runtime, rating, poster_url, requested_by, created_at, watched_at'

export async function listRequests() {
  const [rows] = await db().query(`SELECT ${COLUMNS} FROM documentary_requests ORDER BY created_at DESC, id DESC`)
  return rows.map(row => ({ ...row, rating: row.rating === null ? null : Number(row.rating) }))
}

// Returns 'duplicate' if the documentary already has an open case.
export async function insertRequest(doc, requestedBy) {
  try {
    await db().execute(
      `INSERT INTO documentary_requests
        (tmdb_id, media_type, title, overview, runtime, rating, poster_url, requested_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [doc.tmdb_id, doc.media_type, doc.title, doc.overview || '', doc.runtime ?? null, doc.rating ?? null, doc.poster_url ?? null, requestedBy]
    )
    return 'ok'
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return 'duplicate'
    throw error
  }
}

export async function setWatched(id, watched) {
  try {
    const [result] = await db().execute(
      `UPDATE documentary_requests SET watched_at = ${watched ? 'UTC_TIMESTAMP(3)' : 'NULL'} WHERE id = ?`,
      [id]
    )
    return result.affectedRows ? 'ok' : 'missing'
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return 'duplicate'
    throw error
  }
}

export async function deleteRequest(id) {
  const [result] = await db().execute('DELETE FROM documentary_requests WHERE id = ?', [id])
  return result.affectedRows ? 'ok' : 'missing'
}
