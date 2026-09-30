import type {Metadata, Viewport} from 'next';
import Link from 'next/link';
import {NetworkBadge} from '@/components/NetworkBadge';
import './globals.css';

const DESCRIPTION =
  'Agents hire agents, pay on Monad, and earn a reputation only a settled payment can write.';

/**
 * `metadataBase` makes Open Graph image and canonical URLs absolute, which a
 * link preview needs. It comes from the deployment, never a hard-coded host.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'),
  title: {
    default: 'AGENTX — proof-of-payment reputation for ERC-8004 agents',
    template: '%s · AGENTX',
  },
  description: DESCRIPTION,
  applicationName: 'AGENTX',
  openGraph: {
    type: 'website',
    siteName: 'AGENTX',
    title: 'AGENTX — proof-of-payment reputation for ERC-8004 agents',
    description: DESCRIPTION,
  },
  twitter: {card: 'summary', title: 'AGENTX', description: DESCRIPTION},
  robots: {index: true, follow: true},
};

export const viewport: Viewport = {themeColor: '#07090d', colorScheme: 'dark'};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-text">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              AGENT<span className="text-accent">X</span>
            </Link>
            <nav aria-label="Main" className="flex gap-5 text-sm text-muted">
              <Link href="/" className="hover:text-text">
                Demo
              </Link>
              <Link href="/agents" className="hover:text-text">
                Marketplace
              </Link>
              <Link href="/register" className="hover:text-text">
                Register
              </Link>
              <Link href="/runs" className="hover:text-text">
                Runs
              </Link>
            </nav>
            {/* Which chain, and whether the money is real — on every page,
                because it is the one fact a viewer must never have to guess. */}
            <div className="ml-auto">
              <NetworkBadge />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </main>

        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted">
          Reputation here is written only by a settled on-chain payment. Nothing on this page is
          self-reported.
        </footer>
      </body>
    </html>
  );
}
