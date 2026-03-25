import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vouch - Runtime Safety for AI Agents',
  description: 'Open-source runtime behavioral safety protocol for AI agents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
