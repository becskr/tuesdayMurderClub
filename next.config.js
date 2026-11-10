/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  experimental: {
    // Krystal's shared hosting caps processes per account. By default the
    // build starts a worker per CPU core (15 there) and gets refused, so
    // keep it to one worker and run webpack in the main process.
    cpus: 1,
    webpackBuildWorker: false,
  },
  async headers() {
    return [
      {
        // Keep the site out of search engines, API routes included.
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}
