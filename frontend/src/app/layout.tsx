import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Broadcast Content Intelligence Auditor',
  description: 'Enterprise audit dashboard for content compliance and brand safety.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">{children}</main>
      </body>
    </html>
  );
}
