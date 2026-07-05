import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Group Marketplace',
  description: 'A LINE Mini App for Group Commerce',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  }
};

import { LiffProvider } from '@/components/LiffProvider';

import { LanguageProvider } from '@/components/LanguageProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <LiffProvider>
            <main className="page-container">
              {children}
            </main>
          </LiffProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
