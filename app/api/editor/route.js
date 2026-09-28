import { NextResponse } from 'next/server'
import { EDITOR_COOKIE, editorToken, isEditor, passcodeMatches } from '../../../lib/editorAuth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  return NextResponse.json({ editor: isEditor(request) })
}

export async function POST(request) {
  if (!process.env.EDIT_PASSCODE) {
    return NextResponse.json({ error: 'Editing isn’t set up yet: add EDIT_PASSCODE in Vercel.' }, { status: 500 })
  }

  let body = {}
  try { body = await request.json() } catch {}

  if (!passcodeMatches(body.passcode)) {
    await new Promise(resolve => setTimeout(resolve, 700))
    return NextResponse.json({ error: 'That passcode isn’t right.' }, { status: 401 })
  }

  const response = NextResponse.json({ editor: true })
  response.cookies.set(EDITOR_COOKIE, editorToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ editor: false })
  response.cookies.set(EDITOR_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
