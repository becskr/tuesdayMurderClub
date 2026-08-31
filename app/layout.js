import './globals.css'

export const metadata = {
  title: 'Tuesday Murder Club',
  description: 'A shared documentary watchlist.'
}

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>
}
