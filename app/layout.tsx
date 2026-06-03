import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'CGP Watchlist Pro', description: 'Outil de suivi patrimonial CGP' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>
}
