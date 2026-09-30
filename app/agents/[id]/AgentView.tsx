'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {ApiError, api, type AgentSummary} from '@/lib/api';
import {safeHref} from '@/lib/links';

/**
 * One agent.
 *
 * The page exists to answer a single question honestly: what is this
 * reputation actually made of? So it shows the counts the score is derived
 * from, links the wallet to the explorer, and says plainly when there is no
 * history — rather than presenting a default 50 as if it were an assessment.
 */
export function AgentView({agentId}: {agentId: number}) {
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setAgent(null);
    setError(null);
    api
      .agent(agentId, controller.signal)
      .then(setAgent)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError && err.code === 'NOT_FOUND'
            ? `There is no agent #${agentId}.`
            : err instanceof Error
              ? err.message
              : 'could not load this agent',
        );
      });
    return () => controller.abort();
  }, [agentId]);

  if (error) {
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken"
        >
          {error}
        </p>
        <Link href="/agents" className="text-sm text-accent hover:underline">
          ← back to the marketplace
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <p role="status" className="py-8 text-sm text-muted">
        Loading…
      </p>
    );
  }

  const attempts = agent.completed + agent.failed;
  const explorer = safeHref(agent.explorerUrl);

  return (
    <div className="space-y-6">
      <Link href="/agents" className="text-sm text-muted hover:text-text">
        ← marketplace
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
        {agent.description && <p className="max-w-2xl text-sm text-muted">{agent.description}</p>}
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((c) => (
            <span key={c} className="rounded border border-edge px-1.5 py-0.5 text-xs text-muted">
              {c}
            </span>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Figure label="price per task" value={agent.priceDisplay} />
        <Figure label="score" value={attempts === 0 ? 'unproven' : String(agent.score)} />
        <Figure label="settled" value={String(agent.completed)} tone="text-settled" />
        <Figure label="failed" value={String(agent.failed)} tone={agent.failed > 0 ? 'text-refused' : ''} />
      </section>

      <section className="rounded-lg border border-edge bg-surface p-5 text-sm">
        <h2 className="mb-2 font-medium">What this score is made of</h2>
        {attempts === 0 ? (
          <p className="text-muted">
            Nothing has settled for this agent yet, so there is no reputation to report. It starts at 50 —
            unknown, not bad — and only a completed on-chain payment moves it.
          </p>
        ) : (
          <p className="text-muted">
            {agent.completed} payment{agent.completed === 1 ? '' : 's'} settled on-chain and {agent.failed}{' '}
            did not, a success rate of{' '}
            <span className="tabular text-text">
              {agent.successRate === null ? '—' : `${Math.round(agent.successRate * 100)}%`}
            </span>
            . Each of those was written by the escrow when money moved, which is why this agent cannot report
            it itself.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-edge bg-surface p-5 text-sm">
        <h2 className="mb-2 font-medium">On-chain</h2>
        <dl className="space-y-1">
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 text-muted">wallet</dt>
            <dd className="tabular min-w-0 break-all">
              {explorer ? (
                <a href={explorer} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {agent.walletAddress}
                  <span className="sr-only"> (opens the block explorer in a new tab)</span>
                </a>
              ) : (
                agent.walletAddress
              )}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 text-muted">accepting work</dt>
            <dd>{agent.active ? 'yes' : 'no'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Figure({label, value, tone}: {label: string; value: string; tone?: string}) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`tabular mt-1 text-lg font-medium ${tone ?? ''}`}>{value}</div>
    </div>
  );
}
