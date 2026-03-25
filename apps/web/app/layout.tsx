import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vouch - Runtime Safety for AI Agents',
  description: 'Define what your AI agent is allowed to do. Enforce at runtime. Prove compliance with a public trust page. Zero user data stored.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://vouch.run'),
  openGraph: {
    title: 'Vouch - Runtime Safety for AI Agents',
    description: 'Define what your AI agent is allowed to do. Enforce at runtime. Prove compliance publicly.',
    siteName: 'Vouch',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vouch - Runtime Safety for AI Agents',
    description: 'The safety layer between your AI agent and the real world.',
  },
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
