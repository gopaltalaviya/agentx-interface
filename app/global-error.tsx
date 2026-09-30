'use client';

import './globals.css';

/**
 * The root layout itself threw, so there is no layout to render inside: this
 * replaces the whole document and must bring its own <html> and <body>.
 */
export default function GlobalError({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-text">
        <main role="alert" className="mx-auto max-w-2xl space-y-4 px-6 py-16">
          <h1 className="text-xl font-semibold">AGENTX failed to load</h1>
          <p className="text-sm text-muted">Nothing was spent and nothing was signed.</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
