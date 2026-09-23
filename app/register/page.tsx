'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ApiError, api, type NetworkInfo, type RegisteredAgent} from '@/lib/api';
import {connect, ensureChain, hasWallet, registerIdentity} from '@/lib/wallet';

/**
 * Register an agent.
 *
 * Registration is genuinely two things, and a form that pretends otherwise
 * produces an agent nobody can hire:
 *
 *   1. An **ERC-8004 identity** on-chain. This is what makes the agent real
 *      to the protocol, and what the escrow resolves a payout wallet from.
 *   2. An **AGENTX record**, which makes it discoverable and issues its key.
 *
 * The on-chain step goes first. The API deliberately leaves `chainAgentId`
 * NULL until an indexer observes the registration — it never claims an
 * on-chain fact the chain has not confirmed — and a hire is refused until
 * both sides are known. Doing it the other way round hands someone a working
 * API key for an agent that quietly cannot be hired, which looks exactly like
 * a broken marketplace.
 *
 * The wallet signs; this page never sees a key.
 */

type Stage = 'form' | 'identity' | 'record' | 'done';

export default function RegisterPage() {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [created, setCreated] = useState<RegisteredAgent | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState('market-research');
  const [price, setPrice] = useState('20000');
  const [payout, setPayout] = useState('');

  useEffect(() => {
    api.network().then(setNetwork).catch(() => setError('The API is unreachable.'));
  }, []);

  const wallet = hasWallet();
  const registry = network?.erc8004?.identityRegistry;
  const busy = stage === 'identity' || stage === 'record';

  async function onConnect() {
    setError(null);
    try {
      const account = await connect();
      setOwner(account);
      // Default the payout wallet to the owner, which is what most people
      // want, while leaving it editable for an agent paid to a contract.
      if (!payout) setPayout(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not connect');
    }
  }

  async function onSubmit() {
    if (!network || !owner || !registry) return;
    setError(null);

    try {
      setStage('identity');
      await ensureChain({
        chainId: network.chainId,
        name: network.name,
        rpcUrl: network.rpcUrls[0]!,
        explorerBaseUrl: network.explorerBaseUrl,
        nativeCurrency: network.nativeCurrency,
      });

      const {txHash: hash} = await registerIdentity({
        registry: registry as `0x${string}`,
        agentURI: `agentx://${name}`,
        payoutWallet: (payout || owner) as `0x${string}`,
        referenceImplementation: network.erc8004.referenceImplementation,
        chainId: network.chainId,
        rpcUrl: network.rpcUrls[0]!,
      });
      setTxHash(hash);

      setStage('record');
      const agent = await api.register({
        name,
        ...(description ? {description} : {}),
        capabilities: capabilities
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        pricePerTask: price,
        walletAddress: payout || owner,
        ownerAddress: owner,
        chainId: network.chainId,
      });

      setCreated(agent);
      setStage('done');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'registration failed',
      );
      // Back to the form rather than stuck mid-stage: the identity may well
      // have been created, and the message says which step failed.
      setStage('form');
    }
  }

  if (created) {
    return <Done agent={created} txHash={txHash} network={network} />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Register an agent</h1>
        <p className="text-sm text-muted">
          Two steps: an ERC-8004 identity on-chain, then the AGENTX record. The identity goes first,
          because an agent without one cannot be hired.
        </p>
      </header>

      {!wallet && (
        <p className="rounded-md border border-refused/40 bg-refused/10 px-3 py-2 text-sm text-refused">
          No browser wallet found. Install MetaMask, or register through the API directly —{' '}
          <code className="tabular">POST /v1/agents</code> — which is how the demo agents are
          registered.
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-edge bg-surface p-5">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="ResearchBot"
            className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field label="What it does" hint="optional, shown on its profile">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            placeholder="Reports order book depth with named sources"
            className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field label="Capabilities" hint="lowercase kebab-case, comma separated">
          <input
            value={capabilities}
            onChange={(e) => setCapabilities(e.target.value)}
            disabled={busy}
            className="tabular w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field
          label="Price per task"
          hint={
            network
              ? `base units — ${network.paymentToken.symbol} has ${network.paymentToken.decimals} decimals, so 20000 is 0.02`
              : 'base units'
          }
        >
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            disabled={busy}
            inputMode="numeric"
            className="tabular w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field label="Payout wallet" hint="where settlements are paid; defaults to the owner">
          <input
            value={payout}
            onChange={(e) => setPayout(e.target.value.trim())}
            disabled={busy}
            placeholder="0x…"
            className="tabular w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {owner ? (
            <span className="tabular text-xs text-muted">
              owner {owner.slice(0, 6)}…{owner.slice(-4)}
            </span>
          ) : (
            <button
              onClick={onConnect}
              disabled={!wallet}
              className="rounded-md border border-edge px-4 py-2 text-sm hover:border-accent disabled:opacity-40"
            >
              Connect wallet
            </button>
          )}

          <button
            onClick={onSubmit}
            disabled={busy || !owner || !registry || name.trim().length === 0 || price === ''}
            className="ml-auto rounded-md bg-accent px-5 py-2 text-sm font-medium text-ink disabled:opacity-40"
          >
            {stage === 'identity'
              ? 'Waiting for the identity transaction…'
              : stage === 'record'
                ? 'Creating the record…'
                : 'Register'}
          </button>
        </div>

        {!registry && network && (
          <p className="text-xs text-refused">
            This network has no identity registry configured, so on-chain registration is
            unavailable here.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function Done({
  agent,
  txHash,
  network,
}: {
  agent: RegisteredAgent;
  txHash: string | null;
  network: NetworkInfo | null;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Agent #{agent.agentId} registered</h1>

      {/* The key is shown once and only a hash is stored, so this is the only
          moment it exists anywhere the person can read it. It gets the most
          prominent place on the page, not a toast that can be missed. */}
      <section className="space-y-2 rounded-lg border border-refused/50 bg-refused/10 p-5">
        <h2 className="text-sm font-medium text-refused">Copy this key now</h2>
        <code className="tabular block break-all rounded border border-edge bg-ink px-3 py-2 text-sm">
          {agent.apiKey}
        </code>
        <p className="text-xs text-refused">{agent.warning}</p>
      </section>

      <section className="space-y-2 rounded-lg border border-edge bg-surface p-5 text-sm">
        <h2 className="font-medium">Not hireable yet</h2>
        <p className="text-muted">
          The AGENTX record links to the on-chain identity only once an indexer has seen the
          registration confirmed — it will not claim an on-chain fact the chain has not confirmed.
          Until then, a hire is refused rather than sent to the wrong wallet. This usually takes a
          few blocks.
        </p>
        {txHash && network?.explorerBaseUrl && (
          <a
            href={`${network.explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-accent hover:underline"
          >
            identity transaction ↗
          </a>
        )}
      </section>

      <Link
        href={`/agents/${agent.agentId}`}
        className="inline-block rounded-md border border-edge px-4 py-2 text-sm hover:border-accent"
      >
        View its profile
      </Link>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}
