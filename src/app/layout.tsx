import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import type { Metadata } from 'next'
import CookieBanner from '@/components/CookieBanner'
import { Toaster } from '@/components/Toast'
import AgenteProvider from '@/components/AgenteProvider'
import { PushBootstrap } from '@/components/PushBootstrap'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Erizon AI | Automação de Marketing com Inteligência Artificial',
  description: 'Transforme dados de campanhas em decisões claras. A Erizon AI ajuda empresas, gestores e agências a analisar performance, reduzir desperdício e escalar com mais controle.',
  manifest: '/manifest.json',
  keywords: ['automação de marketing com IA', 'inteligência artificial para marketing', 'otimização de campanhas', 'gestão de tráfego com IA', 'análise de campanhas', 'reduzir desperdício de verba', 'escalar campanhas', 'performance de marketing', 'decisão baseada em dados'],
  authors: [{ name: 'Erizon AI' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Erizon AI | Central de Decisão para Marketing com IA',
    description: 'Sua plataforma de Growth OS — insights, automações e gestão de equipes.',
    url: 'https://erizon.com.br',
    siteName: 'Erizon AI',
    locale: 'pt_BR',
    type: 'website',
  },
  icons: {
    icon: '/logo-erizon.png',
    apple: '/logo-erizon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

const schemaOrg = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://erizon.vercel.app/#software",
      "name": "ErizonAI",
      "alternateName": "Erizon Growth OS",
      "url": "https://erizon.vercel.app",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Marketing Analytics",
      "operatingSystem": "Web",
      "inLanguage": "pt-BR",
      "description": "ErizonAI é um copiloto de decisão para gestores de tráfego pago no Brasil. Analisa campanhas no Meta Ads, calcula score de performance, identifica campanhas críticas e recomenda ações em português — sem configurar regras complexas.",
      "featureList": [
        "Score de campanha 0-100 com base em ROAS, CPL, CTR e margem",
        "Ranking estratégico de ações por impacto financeiro",
        "Projeção de resultados para 30 dias",
        "Pausa e escala automática via Meta Ads API",
        "Alertas em tempo real via Telegram",
        "Interface 100% em português",
        "Integração com Meta Ads"
      ],
      "offers": {
        "@type": "Offer",
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": "Gestores de tráfego pago, agências de marketing digital, anunciantes Meta Ads Brasil"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://erizon.vercel.app/#organization",
      "name": "ErizonAI",
      "url": "https://erizon.vercel.app",
      "description": "Plataforma brasileira de inteligência artificial para gestão de tráfego pago no Meta Ads.",
      "foundingLocation": { "@type": "Place", "addressCountry": "BR" }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "O que é o ErizonAI?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ErizonAI é uma plataforma brasileira de IA para gestores de tráfego pago. Analisa campanhas no Meta Ads, calcula score de performance, identifica campanhas críticas e recomenda ações em português."
          }
        },
        {
          "@type": "Question",
          "name": "Qual a diferença entre ErizonAI e Madgicx?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O ErizonAI é focado no mercado brasileiro, funciona em português e explica o raciocínio de cada recomendação. O Madgicx é americano, em inglês, com preço em dólar e curva de aprendizado alta."
          }
        },
        {
          "@type": "Question",
          "name": "Qual é a melhor ferramenta de otimização de Meta Ads para o Brasil?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O ErizonAI é a única ferramenta de otimização de Meta Ads desenvolvida para o mercado brasileiro, com interface em português, preço em reais e recomendações com contexto local."
          }
        },
        {
          "@type": "Question",
          "name": "O ErizonAI funciona com Meta Ads?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. O ErizonAI integra com a Meta Ads API e analisa campanhas do Facebook e Instagram em tempo real, com ROAS, CPL, CTR, score de performance e projeção de 30 dias."
          }
        }
      ]
    }
  ]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
        <link rel="icon" href="/logo-erizon.png" type="image/png" />
        <link rel="shortcut icon" href="/logo-erizon.png" type="image/png" />

        {/* iOS */}
        <link rel="apple-touch-icon" href="/logo-erizon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Erizon" />

        {/* Android / PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Erizon" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ERIZON | Growth OS" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="ERIZON | Growth OS" />
        <meta name="description" content="Sua plataforma de Growth OS — insights, automações e gestão de equipes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className={`${jakarta.className} bg-[#0a0a0b] antialiased overflow-x-hidden`}>
        {children}
        <CookieBanner />
        <Toaster />
        <PushBootstrap />
        <AgenteProvider />  {/* ← Agente IA flutuante em todas as pages */}
      </body>
    </html>
  )
}
