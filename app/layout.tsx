import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import Link from 'next/link';
import {SiteHeader} from '@/components/SiteHeader';
import {RevealRoot} from '@/components/ui/Motion';
import './globals.css';

// Self-hosted at build time: the CSP allows fonts from 'self' only, and a
// font fetched from a third party at view time is a request we do not need.
const sans = Geist({subsets: ['latin'], variable: '--font-geist-sans', display: 'swap'});
const mono = Geist_Mono({subsets: ['latin'], variable: '--font-geist-mono', display: 'swap'});

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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-ink text-text">
        <div aria-hidden className="ambient">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
        </div>
        <RevealRoot />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <SiteHeader />

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-edge/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              Reputation here is written only by a settled on-chain payment. Nothing on this page is
              self-reported.
            </p>
            <nav aria-label="Footer" className="flex gap-4">
              <Link href="/agents" className="hover:text-text">
                Marketplace
              </Link>
              <Link href="/register" className="hover:text-text">
                Register
              </Link>
              <Link href="/status" className="hover:text-text">
                Status
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
