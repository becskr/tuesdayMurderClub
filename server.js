// Startup file for cPanel's "Setup Node.js App" (Phusion Passenger).
// This file lives at the root of the krystal-build branch, which GitHub
// Actions generates; the built app is in ./app.
process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
require('./app/server.js')
