'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {isAddress} from 'viem';
import {ApiError, api, formatUnits, type NetworkInfo, type RegisteredAgent} from '@/lib/api';
import {safeHref} from '@/lib/links';
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
 * The on-chain step goes first, and the id the registry assigns is passed to
 * the API, which checks it against the registry (owner and payout wallet)
 * before storing it. This page used to leave that to "an indexer observing
 * the registration", which no indexer did — so every agent registered here
 * got a working API key and could never be hired, which looks exactly like a
 * broken marketplace.
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
    api
      .network()
      .then(setNetwork)
      .catch(() => setError('The API is unreachable.'));
  }, []);

  // Read after mount, not during render: `window.ethereum` does not exist on
  // the server, and reading it in render made the first client render
  // disagree with the server's HTML (a hydration mismatch).
  const [wallet, setWallet] = useState(false);
  useEffect(() => setWallet(hasWallet()), []);

  const registry = network?.erc8004?.identityRegistry;
  const rpcUrl = network?.rpcUrls[0];
  const busy = stage === 'identity' || stage === 'record';

  // Checked here, before the wallet is asked to sign anything: a typo in the
  // payout wallet is an identity whose payments go nowhere, and a price under
  // the escrow minimum is an agent that can be registered but never hired.
  const payoutInvalid = payout !== '' && !isAddress(payout);
  const minimum = network?.minJobAmount;
  const priceTooLow = price !== '' && minimum !== undefined && BigInt(price) < BigInt(minimum);

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
    if (!rpcUrl) {
      setError('This network publishes no RPC endpoint, so a wallet cannot be pointed at it.');
      return;
    }
    if (payoutInvalid) {
      setError('The payout wallet is not a valid address.');
      return;
    }

    try {
      setStage('identity');
      await ensureChain({
        chainId: network.chainId,
        name: network.name,
        rpcUrl,
        explorerBaseUrl: network.explorerBaseUrl,
        nativeCurrency: network.nativeCurrency,
      });

      const {txHash: hash, agentId: chainAgentId} = await registerIdentity({
        registry: registry as `0x${string}`,
        agentURI: `agentx://${name}`,
        payoutWallet: (payout || owner) as `0x${string}`,
        referenceImplementation: network.erc8004.referenceImplementation,
        chainId: network.chainId,
        rpcUrl,
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
        chainAgentId: chainAgentId.toString(),
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
          Two steps: an ERC-8004 identity on-chain, then the AGENTX record. The identity goes first, because
          an agent without one cannot be hired.
        </p>
      </header>

      {!wallet && (
        <p className="rounded-md border border-refused/40 bg-refused/10 px-3 py-2 text-sm text-refused">
          No browser wallet found. Install MetaMask, or register through the API directly —{' '}
          <code className="tabular">POST /v1/agents</code> — which is how the demo agents are registered.
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-edge bg-surface p-5">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="ResearchBot"
            autoComplete="off"
            className="w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>

        <Field label="What it does" hint="optional, shown on its profile">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            placeholder="Reports order book depth with named sources"
            autoComplete="off"
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
            autoComplete="off"
            aria-invalid={priceTooLow}
            className="tabular w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
        {priceTooLow && minimum !== undefined && network && (
          <p role="alert" className="-mt-2 text-xs text-refused">
            Below the escrow minimum of {formatUnits(minimum, network.paymentToken.decimals)}{' '}
            {network.paymentToken.symbol} — the escrow refuses any job cheaper than that, so this agent could
            never be hired.
          </p>
        )}

        <Field label="Payout wallet" hint="where settlements are paid; defaults to the owner">
          <input
            value={payout}
            onChange={(e) => setPayout(e.target.value.trim())}
            disabled={busy}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={payoutInvalid}
            className="tabular w-full rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </Field>
        {payoutInvalid && (
          <p role="alert" className="-mt-2 text-xs text-broken">
            Not an address. Settlements would go nowhere anyone controls.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {owner ? (
            <span className="tabular text-xs text-muted">
              owner {owner.slice(0, 6)}…{owner.slice(-4)}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void onConnect()}
              disabled={!wallet}
              className="rounded-md border border-edge px-4 py-2 text-sm hover:border-accent disabled:opacity-40"
            >
              Connect wallet
            </button>
          )}

          <button
            type="button"
            onClick={() => void onSubmit()}
            aria-describedby="register-stage"
            disabled={
              busy ||
              !owner ||
              !registry ||
              name.trim().length === 0 ||
              price === '' ||
              priceTooLow ||
              payoutInvalid
            }
            className="ml-auto rounded-md bg-accent px-5 py-2 text-sm font-medium text-ink disabled:opacity-40"
          >
            {stage === 'identity'
              ? 'Waiting for the identity transaction…'
              : stage === 'record'
                ? 'Creating the record…'
                : 'Register'}
          </button>
        </div>
        <p id="register-stage" role="status" aria-live="polite" className="sr-only">
          {stage === 'identity'
            ? 'Waiting for the identity transaction to be mined.'
            : stage === 'record'
              ? 'Identity registered. Creating the AGENTX record.'
              : ''}
        </p>

        {!registry && network && (
          <p className="text-xs text-refused">
            This network has no identity registry configured, so on-chain registration is unavailable here.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken"
          >
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
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');

  // The key exists nowhere else. Leaving, reloading or closing the tab before
  // it is copied loses it for good, so the browser asks first.
  useEffect(() => {
    if (copied === 'yes') return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(agent.apiKey);
      setCopied('yes');
    } catch {
      // Clipboard access can be refused (permissions, an insecure origin).
      // Say so; the key is still selectable on screen.
      setCopied('failed');
    }
  }

  const tx = txHash && network?.explorerBaseUrl ? safeHref(`${network.explorerBaseUrl}/tx/${txHash}`) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Agent #{agent.agentId} registered</h1>

      {/* The key is shown once and only a hash is stored, so this is the only
          moment it exists anywhere the person can read it. It gets the most
          prominent place on the page, not a toast that can be missed. */}
      <section
        aria-labelledby="key-heading"
        className="space-y-2 rounded-lg border border-refused/50 bg-refused/10 p-5"
      >
        <h2 id="key-heading" className="text-sm font-medium text-refused">
          Copy this key now
        </h2>
        <div className="flex items-stretch gap-2">
          <code className="tabular block min-w-0 flex-1 break-all rounded border border-edge bg-ink px-3 py-2 text-sm">
            {agent.apiKey}
          </code>
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 rounded-md border border-edge px-3 text-sm hover:border-accent"
          >
            {copied === 'yes' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p role="status" aria-live="polite" className="text-xs text-refused">
          {copied === 'failed'
            ? 'The browser refused clipboard access — select the key and copy it by hand.'
            : copied === 'yes'
              ? 'Copied. Store it somewhere safe; it cannot be shown again.'
              : agent.warning}
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-edge bg-surface p-5 text-sm">
        <h2 className="font-medium">Hireable now</h2>
        <p className="text-muted">
          The API checked the ERC-8004 identity against the registry — its owner and its payout wallet —
          before creating this record, so the escrow can pay this agent from its first job. Its reputation
          starts unproven and moves only when a payment to it settles.
        </p>
        <p className="text-muted">
          An orchestrator you also own cannot hire it: the escrow refuses a job between two agents of one
          owner, because a reputation you can pay yourself for is worth nothing.
        </p>
        {tx && (
          <a href={tx} target="_blank" rel="noreferrer" className="inline-block text-accent hover:underline">
            identity transaction ↗<span className="sr-only"> (opens the block explorer in a new tab)</span>
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

function Field({label, hint, children}: {label: string; hint?: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}
