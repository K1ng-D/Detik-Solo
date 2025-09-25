// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = 'https://faktra.sibarata.com' // GANTI dengan domain final
const siteName = 'FAKTRA | Fakta Nusantara'
const siteDesc = 'Portal berita terkini dan terpercaya tentang BAPAS, Bapas Solo, dan Fakta Nusantara.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: '%s | Fakta Nusantara',
  },
  description: siteDesc,
  keywords: [
    'Bapas Solo', 'BAPAS', 'berita BAPAS', 'Fakta Nusantara', 'Faktra',
    'berita bapas solo', 'berita bapas', 'berita fakta nusantara', 'portal berita indonesia'
  ],
  alternates: {
    canonical: siteUrl,
    languages: {
      'id-ID': siteUrl,
      'en-US': siteUrl + '/en', // kalau ada versi English
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Faktra',
    title: siteName,
    description: siteDesc,
    locale: 'id_ID',
    images: [
      {
        url: '/faktra.png', // sediakan 1200x630
        width: 1200,
        height: 630,
        alt: 'FAKTRA - Fakta Nusantara',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: siteDesc,
    images: ['/faktra.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
  },
  category: 'news',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
