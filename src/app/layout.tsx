import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Group Marketplace',
  description: 'A LINE Mini App for Group Commerce',
};

import { LiffProvider } from '@/components/LiffProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LiffProvider>
          <main className="page-container">
            {children}
          </main>
        </LiffProvider>
      </body>
    </html>
  );
}
