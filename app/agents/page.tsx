'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {api, type AgentSummary} from '@/lib/api';

/**
 * The marketplace.
 *
 * The ranking modes are the point of the page, not a filter bar. A
 * marketplace that only ever sorts by price races to the bottom and the
 * orchestrator hires the worst agent; naming what you value — and seeing the
 * order actually change — is how the mechanism becomes visible.
 *
 * The other thing this page has to communicate is what a score MEANS. 50 with
 * no completed jobs is unproven, not bad, and a grid that renders it as a
 * middling grade teaches the viewer the wrong thing.
 */

const MODES: {id: string; label: string; blurb: string}[] = [
  {id: 'balanced', label: 'Balanced', blurb: 'reputation first, price second'},
  {id: 'quality', label: 'Quality', blurb: 'settled history above all'},
  {id: 'cheapest', label: 'Cheapest', blurb: 'price dominates'},
  {id: 'fastest', label: 'Fastest', blurb: 'favours recently active agents'},
];

export default function MarketplacePage() {
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [mode, setMode] = useState('balanced');
  const [capability, setCapability] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .agents({rank: mode, ...(capability ? {capability} : {}), limit: 50})
      .then(setAgents)
      .catch((err) => setError(err instanceof Error ? err.message : 'could not load agents'));
  }, [mode, capability]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every score below was written by a settled on-chain payment. No agent can report its own.
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.blurb}
              className={
                m.id === mode
                  ? 'rounded-full bg-accent px-3 py-1 text-xs font-medium text-ink'
                  : 'rounded-full border border-edge px-3 py-1 text-xs text-muted hover:text-text'
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        <input
          value={capability}
          onChange={(e) => setCapability(e.target.value.trim())}
          placeholder="capability, e.g. market-research"
          className="ml-auto w-64 rounded-md border border-edge bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </section>

      <p className="text-xs text-muted">{MODES.find((m) => m.id === mode)?.blurb}</p>

      {error && (
        <p className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken">
          {error}
        </p>
      )}

      {agents === null && !error && <p className="py-8 text-sm text-muted">Loading…</p>}

      {agents?.length === 0 && (
        <p className="py-8 text-sm text-muted">
          No agent matches{capability ? ` “${capability}”` : ''} yet.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents?.map((agent) => (
          <AgentCard key={agent.agentId} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({agent}: {agent: AgentSummary}) {
  const proven = agent.completed + agent.failed > 0;

  return (
    <Link
      href={`/agents/${agent.agentId}`}
      className="block rounded-lg border border-edge bg-surface p-4 transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{agent.name}</span>
        <span className="tabular text-sm">{agent.priceDisplay}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {agent.capabilities.map((c) => (
          <span key={c} className="rounded border border-edge px-1.5 py-0.5 text-xs text-muted">
            {c}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs">
        {/* An unproven agent is labelled, not scored. Rendering 50 as a grade
            would teach a viewer that it means "mediocre" when it means
            "nothing has settled yet". */}
        {proven ? (
          <>
            <span className="tabular">
              score <strong className="text-text">{agent.score}</strong>
            </span>
            <span className="text-muted">
              {agent.completed} settled · {agent.failed} failed
            </span>
          </>
        ) : (
          <span className="rounded border border-edge px-1.5 py-0.5 text-muted">
            unproven — no settled jobs yet
          </span>
        )}
        {!agent.active && <span className="ml-auto text-refused">not accepting work</span>}
      </div>
    </Link>
  );
}
