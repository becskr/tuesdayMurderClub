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
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    if (process.env[match[1]] === undefined || process.env[match[1]] === '') process.env[match[1]] = value
  }
}

process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
require('./app/server.js')
