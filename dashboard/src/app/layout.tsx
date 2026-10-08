import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'DayKindle Analytics',
    template: '%s · DayKindle Analytics',
  },
  description: 'Private internal product analytics for DayKindle.',
  robots: { index: false, follow: false, noarchive: true },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

