import { NextResponse } from 'next/server'
import { fetchDetails } from '../../../../lib/tmdbDetails'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const { status, body } = await fetchDetails(searchParams.get('id'), searchParams.get('type'))
  return NextResponse.json(body, { status })
}
