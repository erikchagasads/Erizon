import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import type { Metadata } from 'next'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'ERIZON | Growth OS',
  description: 'Sua plataforma de Growth OS — insights, automações e gestão de equipes.',
  // mantenha o manifest aqui
  manifest: '/manifest.json',
  // Não coloque themeColor aqui para evitar o aviso do Next.js
}

/**
 * Export viewport separado conforme
 * https://nextjs.org/docs/app/api-reference/functions/generate-viewport
 */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // themeColor deve ficar aqui
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        {/* Manifesto PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* Ícones / meta para iOS */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ERIZON | Growth OS" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Theme / cores (colocamos meta por compatibilidade) */}
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="ERIZON | Growth OS" />

        {/* Descrição / viewport */}
        <meta name="description" content="Sua plataforma de Growth OS — insights, automações e gestão de equipes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className={`${jakarta.className} bg-[#0a0a0b] antialiased`}>{children}</body>
    </html>
  )
}