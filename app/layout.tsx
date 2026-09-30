import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Montserrat } from 'next/font/google';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'DigosAR — Explore Digos City',
  description: 'A mobile-first augmented reality tourism prototype for discovering Digos City.',
  applicationName: 'DigosAR',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DigosAR',
  },
  icons: {
    icon: [
      { url: '/digosar-icon-logo-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/digosar-icon-logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/digosar-icon-logo-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#071A12',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/digosar-icon-logo.webp" />
        <link rel="preload" as="image" href="/mascot/mascot-blink.webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
