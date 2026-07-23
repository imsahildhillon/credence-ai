import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import '@/styles/globals.css';

// Self-hosted via next/font (no external request, no layout shift) —
// the two typefaces the brand's typography system requires: a humanist
// grotesque sans for all interface/heading text, and a monospace face
// reserved exclusively for evidence content (docs/02-brand-guidelines.md
// §8). The `variable` names below are what src/styles/globals.css maps
// into the Tailwind theme as `--font-sans` / `--font-mono`.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Credence AI',
  description: 'Credence AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
