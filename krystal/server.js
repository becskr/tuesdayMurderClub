// Startup file for cPanel's "Setup Node.js App" (Phusion Passenger).
// This file lives at the root of the krystal-build branch, which GitHub
// Actions generates; the built app is in ./app.
const fs = require('fs')
const path = require('path')

// Some cPanel/LiteSpeed servers don't pass the environment variables set in
// Setup Node.js App through to the app. As a fallback, read KEY=value lines
// from a .env file next to this one (created in File Manager, never in git).
// Variables that are already set win.
const envFile = path.join(__dirname, '.env')
let envStatus = 'not found'
try {
  if (fs.existsSync(envFile)) {
    let count = 0
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
      if (!match) continue
      let value = match[2]
      if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
      if (process.env[match[1]] === undefined || process.env[match[1]] === '') process.env[match[1]] = value
      count++
    }
    envStatus = `read ${count} settings`
  }
} catch (error) {
  envStatus = `could not read: ${error.code || error.message}`
}

// Shown (without any values) at /api/status to help diagnose the setup.
let buildCommit = 'unknown'
try { buildCommit = fs.readFileSync(path.join(__dirname, 'BUILD_COMMIT'), 'utf8').trim().slice(0, 7) } catch {}
process.env.TMC_ENV_FILE = `.env: ${envStatus}`
process.env.TMC_BUILD = buildCommit
process.env.TMC_STARTED_AT = new Date().toISOString()

// Restart automatically after an update. On Krystal, cPanel's Restart button
// doesn't stop a running Next.js process, so it would keep serving the old
// build. Every 30 seconds this checks whether a new build has arrived
// (BUILD_COMMIT changed) or a restart was asked for (tmp/restart.txt touched
// since start). It waits for the change to be seen twice in a row, so a
// half-finished update isn't loaded, then exits; the web server starts a
// fresh process on the next request.
const startedAtMs = Date.now()
const restartFile = path.join(__dirname, 'tmp', 'restart.txt')
const readBuild = () => {
  try { return fs.readFileSync(path.join(__dirname, 'BUILD_COMMIT'), 'utf8').trim() } catch { return null }
}
const loadedBuild = readBuild()
let pendingReason = null
setInterval(() => {
  const current = readBuild()
  let reason = null
  if (current && current !== loadedBuild) reason = `new build ${current.slice(0, 7)}`
  else {
    try { if (fs.statSync(restartFile).mtimeMs > startedAtMs) reason = 'restart requested' } catch {}
  }
  if (reason && reason === pendingReason) {
    console.log(`Tuesday Murder Club: restarting (${reason})`)
    process.exit(0)
  }
  pendingReason = reason
}, 30 * 1000).unref()

process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
require('./app/server.js')
