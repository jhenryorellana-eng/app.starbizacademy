import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Starbiz Academy - Hub Central',
  description: 'Gestiona tu cuenta familiar, membresías y códigos de acceso de Starbiz Academy',
  manifest: '/manifest.json',
  other: {
    'google': 'notranslate',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="light" translate="no">
      <body className="min-h-screen notranslate">{children}</body>
    </html>
  )
}
