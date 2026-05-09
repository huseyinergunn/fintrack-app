import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'fintrack | faturadan veriye',
  description: 'Fatura ve gider yönetimini saniyeler içinde yapın. AI destekli fiş tarama, otomatik fatura oluşturma.',
  icons: {
    icon: '/logo/icon.svg',
    shortcut: '/logo/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
