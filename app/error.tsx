'use client';

import Link from 'next/link';
import {useEffect} from 'react';

/**
 * A page that threw.
 *
 * Without this boundary a render error blanks the whole app, header and all —
 * and the header carries the network badge, the one fact a viewer must never
 * lose. This keeps the frame and offers a retry, because most failures here
 * are an API that was briefly unreachable.
 */
export default function PageError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="space-y-4 py-8">
      <h1 className="text-xl font-semibold">This page failed to load</h1>
      <p className="max-w-2xl text-sm text-muted">
        Nothing was spent and nothing was signed — this page only reads. The usual cause is the API being
        unreachable for a moment.
        {error.digest ? (
          <>
            {' '}
            Reference <code className="tabular">{error.digest}</code>.
          </>
        ) : null}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink"
        >
          Try again
        </button>
        <Link href="/" className="rounded-md border border-edge px-4 py-2 text-sm hover:border-accent">
          Back to the demo
        </Link>
      </div>
    </div>
  );
}
