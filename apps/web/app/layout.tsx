import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-figtree' });

export const metadata: Metadata = {
  title: 'Design System Vault',
  description: 'A library for storing, checking and syncing design systems.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
