import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700', '800'] 
})

export const metadata = {
  title: 'ERIZON | Growth OS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className={`${jakarta.className} bg-[#0a0a0b] antialiased`}>{children}</body>
    </html>
  )
}