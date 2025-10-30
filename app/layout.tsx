import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lend - University Item Borrowing System',
  description: 'University item lending and borrowing management system for students and staff',
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['university', 'borrowing', 'lending', 'items', 'inventory', 'management'],
  authors: [
    { name: 'University Development Team' }
  ],
  creator: 'University Development Team',
  publisher: 'University',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://lend-3nkb7yq6x-john-godfrey-maligs-projects.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Lend - University Item Borrowing System',
    description: 'University item lending and borrowing management system for students and staff',
    url: 'https://lend-3nkb7yq6x-john-godfrey-maligs-projects.vercel.app',
    siteName: 'Lend',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon-72x72.svg', sizes: '72x72', type: 'image/svg+xml' },
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
  verification: {
    // Add your verification codes here if needed
    // google: 'google-verification-code',
    // yandex: 'yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="background-color" content="#ffffff" />
        <meta name="display" content="standalone" />
        <meta name="orientation" content="portrait-primary" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Lend" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lend" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-192x192.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.svg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-192x192.svg" />
        
        {/* Splash Screens for iOS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/icon-72x72.svg" />
        <link rel="shortcut icon" href="/icon-72x72.svg" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
