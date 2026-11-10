// Production build entry point (npm run build).
//
// cPanel/CloudLinux can inject the app's own environment (including
// NODE_ENV=development) into commands run from package.json scripts, which
// overrides a "NODE_ENV=production next build" prefix. A build in
// development mode loads React's development runtime and fails while
// prerendering. Setting NODE_ENV here, inside Node, can't be overridden.
process.env.NODE_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
process.argv = [process.argv[0], require.resolve('next/dist/bin/next'), 'build', '--webpack']
require('next/dist/bin/next')
