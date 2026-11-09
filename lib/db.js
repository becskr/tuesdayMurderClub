import mysql from 'mysql2/promise'

// One connection pool per server process. Next.js can re-evaluate modules
// in development, so the pool is kept on globalThis.
export function db() {
  if (!globalThis.__tmcPool) {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env
    if (!DB_USER || !DB_NAME) throw new Error('Database is not configured: set DB_USER, DB_PASSWORD and DB_NAME.')
    globalThis.__tmcPool = mysql.createPool({
      host: DB_HOST || 'localhost',
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 4,
      timezone: 'Z',
      charset: 'utf8mb4',
    })
  }
  return globalThis.__tmcPool
}
