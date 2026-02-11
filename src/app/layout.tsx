import './globals.css'
import { Inter, Michroma } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const michroma = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-michroma' })

export const metadata = {
  title: 'ERIZON | Growth Intelligence',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className={`${inter.variable} ${michroma.variable} font-sans`}>{children}</body>
    </html>
  )
}