import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import ProtectionLayer from '@/components/ProtectionLayer';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'TheZora | AI Studio Management & Gallery',
  description: 'The definitive platform for artistic studio management and private guest galleries.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <ProtectionLayer />
        {children}
      </body>
    </html>
  );
}
