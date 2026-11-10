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
process.env.TMC_ENV_FILE = `${envFile}: ${envStatus}`
process.env.TMC_BUILD = buildCommit
process.env.TMC_STARTED_AT = new Date().toISOString()

process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
require('./app/server.js')
