/** @type {import('next').NextConfig} */
module.exports = {
  poweredByHeader: false,
  // Bundle the app with only the packages it needs, so GitHub can build it
  // and Krystal can run it without installing or building anything.
  output: 'standalone',
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
