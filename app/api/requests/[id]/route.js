import { NextResponse } from 'next/server'
import { isEditor } from '../../../../lib/editorAuth'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function checked(request, params) {
  if (!isEditor(request)) {
    return { response: NextResponse.json({ error: 'Enter the club passcode to make changes.' }, { status: 401 }) }
  }
  const { id } = await params
  if (!/^\d+$/.test(String(id))) {
    return { response: NextResponse.json({ error: 'Invalid case number.' }, { status: 400 }) }
  }
  return { id: Number(id) }
}

export async function PATCH(request, { params }) {
  const { id, response } = await checked(request, params)
  if (response) return response

  let body = {}
  try { body = await request.json() } catch {}
  if (typeof body.watched !== 'boolean') {
    return NextResponse.json({ error: 'Say whether the case is closed.' }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin()
      .from('documentary_requests')
      .update({ watched_at: body.watched ? new Date().toISOString() : null })
      .eq('id', id)

    if (error?.code === '23505') {
      return NextResponse.json({ error: 'That documentary is already open on the watchlist.' }, { status: 409 })
    }
    if (error) {
      console.error('Update failed:', error)
      return NextResponse.json({ error: 'Could not update the case.' }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request, { params }) {
  const { id, response } = await checked(request, params)
  if (response) return response

  try {
    const { error } = await supabaseAdmin().from('documentary_requests').delete().eq('id', id)
    if (error) {
      console.error('Delete failed:', error)
      return NextResponse.json({ error: 'Could not delete the case.' }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
