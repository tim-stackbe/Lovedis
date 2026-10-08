import type { ReactNode } from 'react'
import React from 'react'

export const metadata = {
  title: 'Lovedis CMS',
  description: 'Headless Payload CMS for lovedis.de',
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
