'use client';

import {useEffect, useState} from 'react';
import {api, type NetworkInfo} from '@/lib/api';

/**
 * Which chain, and whether the funds are real.
 *
 * Deliberately loud when they are. A viewer watching agents spend money is
 * entitled to know in one glance whether it matters, and the honest failure
 * mode is to say nothing rather than to assume testnet — a badge that
 * defaults to "testnet" while the API is unreachable would be a reassuring
 * lie.
 */
export function NetworkBadge() {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    api
      .network()
      .then(setNetwork)
      .catch(() => setUnreachable(true));
  }, []);

  if (unreachable) {
    return (
      <span className="rounded-full border border-broken/40 px-3 py-1 text-xs text-broken">
        API unreachable
      </span>
    );
  }

  if (!network) {
    return <span className="rounded-full border border-edge px-3 py-1 text-xs text-muted">…</span>;
  }

  return (
    <span
      className={
        network.testnet
          ? 'rounded-full border border-edge px-3 py-1 text-xs text-muted'
          : 'rounded-full border border-refused/50 bg-refused/10 px-3 py-1 text-xs font-medium text-refused'
      }
      title={network.contracts['TaskEscrow'] ?? undefined}
    >
      {network.name}
      {network.testnet ? ' · testnet' : ' · REAL FUNDS'}
    </span>
  );
}
