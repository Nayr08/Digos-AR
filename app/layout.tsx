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
    icon: '/digosar-icon.webp',
    apple: '/digosar-icon.webp',
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
      <head><link rel="preload" as="image" href="/mascot/mascot-blink.webp" /></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
