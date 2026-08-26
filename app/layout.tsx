import type { Metadata } from 'next'
import { Source_Serif_4, DM_Sans } from 'next/font/google'
import './globals.css'

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Upadesh AI — Guidance from the Bhagavad Gita',
  description:
    'Thoughtful spiritual guidance grounded in Bhagavad Gita verses, with clear sources.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
