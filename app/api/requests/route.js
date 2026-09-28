import { NextResponse } from 'next/server'
import { isEditor } from '../../../lib/editorAuth'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { fetchDetails } from '../../../lib/tmdbDetails'
import { PEOPLE } from '../../../lib/people'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  if (!isEditor(request)) {
    return NextResponse.json({ error: 'Enter the club passcode to make changes.' }, { status: 401 })
  }

  let body = {}
  try { body = await request.json() } catch {}
  const { tmdb_id, media_type, requested_by } = body

  if (!PEOPLE.includes(requested_by)) {
    return NextResponse.json({ error: 'Pick who is filing this case.' }, { status: 400 })
  }

  const details = await fetchDetails(tmdb_id, media_type)
  if (details.status !== 200) return NextResponse.json(details.body, { status: details.status })

  try {
    const { error } = await supabaseAdmin()
      .from('documentary_requests')
      .insert({ ...details.body, requested_by })

    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That documentary is already on the watchlist.' }, { status: 409 })
    }
    if (error) {
      console.error('Insert failed:', error)
      return NextResponse.json({ error: 'Could not save the documentary.' }, { status: 500 })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
