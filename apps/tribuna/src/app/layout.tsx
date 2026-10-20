import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AppHeader } from '@/components/header/AppHeader';
import './globals.css';

// SF Pro en dispositivos Apple; Inter en el resto.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Tribuna', template: '%s · Tribuna' },
  description: 'Real Madrid, FC Barcelona y Atlético de Madrid: partidos, plantilla y resultados en directo.',
  appleWebApp: { capable: true, title: 'Tribuna', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-dvh">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
