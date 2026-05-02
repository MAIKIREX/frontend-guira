import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/providers'

const gilroy = localFont({
  src: [
    {
      path: '../public/fonts/Gilroy-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/Gilroy-ExtraBold.otf',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Guira - Transacciones Seguras',
  description: 'Plataforma para operaciones y pagos',
  icons: {
    icon: '/asdsadsa.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={gilroy.variable} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
