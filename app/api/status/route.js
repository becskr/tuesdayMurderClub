import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Setup check: says which settings the running app can see, never their values.
const SETTINGS = ['EDIT_PASSCODE', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'TMDB_ACCESS_TOKEN']

export async function GET() {
  return NextResponse.json({
    build: process.env.TMC_BUILD || 'unknown',
    startedAt: process.env.TMC_STARTED_AT || 'unknown',
    envFile: process.env.TMC_ENV_FILE || 'startup file did not run',
    nodeEnv: process.env.NODE_ENV,
    node: process.version,
    settings: Object.fromEntries(SETTINGS.map(name => [name, process.env[name] ? 'set' : 'missing'])),
  })
}
