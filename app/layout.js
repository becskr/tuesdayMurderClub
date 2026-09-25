import './globals.css'
import { Playfair_Display, Special_Elite, Inter } from 'next/font/google'

const display = Playfair_Display({ subsets: ['latin'], weight: ['700', '900'], style: ['normal', 'italic'], variable: '--font-display' })
const typewriter = Special_Elite({ subsets: ['latin'], weight: '400', variable: '--font-type' })
const body = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata = {
  title: 'Tuesday Murder Club',
  description: 'A shared documentary watchlist.'
}

export const viewport = {
  themeColor: '#0b0a0a'
}

export default function RootLayout({ children }) {
  return <html lang="en" className={`${display.variable} ${typewriter.variable} ${body.variable}`}><body>{children}</body></html>
}
