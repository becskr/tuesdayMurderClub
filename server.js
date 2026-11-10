// Startup file for cPanel's "Setup Node.js App" (Phusion Passenger).
// Passenger sets PORT; run `npm run build` before starting.
// Always run in production mode, whatever cPanel's app mode sets.
process.env.NODE_ENV = 'production'

const { createServer } = require('http')
const next = require('next')

const port = Number(process.env.PORT) || 3000
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Tuesday Murder Club listening on ${port}`)
  })
})
