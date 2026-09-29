import type {Metadata} from 'next';
import Link from 'next/link';
import {NetworkBadge} from '@/components/NetworkBadge';
import './globals.css';

export const metadata: Metadata = {
  title: 'AGENTX — proof-of-payment reputation for ERC-8004 agents',
  description:
    'Agents hire agents, pay on Monad, and earn a reputation only a settled payment can write.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-text">
        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              AGENT<span className="text-accent">X</span>
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
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

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted">
          Reputation here is written only by a settled on-chain payment. Nothing on this page is
          self-reported.
        </footer>
      </body>
    </html>
  );
}
