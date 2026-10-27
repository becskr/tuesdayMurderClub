import { NextResponse } from 'next/server'
import { isEditor } from '../../../../lib/editorAuth'
import { deleteRequest, setWatched } from '../../../../lib/requests'

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
    const result = await setWatched(id, body.watched)
    if (result === 'duplicate') {
      return NextResponse.json({ error: 'That documentary is already open on the watchlist.' }, { status: 409 })
    }
    if (result === 'missing') {
      return NextResponse.json({ error: 'That case no longer exists.' }, { status: 404 })
    }
  } catch (error) {
    console.error('Update failed:', error)
    return NextResponse.json({ error: 'Could not update the case.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request, { params }) {
  const { id, response } = await checked(request, params)
  if (response) return response

  try {
    await deleteRequest(id)
  } catch (error) {
    console.error('Delete failed:', error)
    return NextResponse.json({ error: 'Could not delete the case.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
