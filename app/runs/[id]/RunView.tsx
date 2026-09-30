'use client';

import Link from 'next/link';
import {use, useEffect, useState} from 'react';
import {RunTrace} from '@/components/RunTrace';
import {api, type RunDetail, type RunEvent, type RunStep} from '@/lib/api';

/**
 * One run, after the fact.
 *
 * The same trace the demo page streams live, read back from the durable
 * record — so a run can be shared as a link and read later, with every
 * on-chain line carrying its explorer link. Public by design: the trace is
 * the evidence, and evidence nobody can open is not evidence.
 */

const STEP_TONE: Record<RunStep['status'], string> = {
  settled: 'text-settled',
  disputed: 'text-refused',
  unrecoverable: 'text-refused',
  'no-candidate': 'text-refused',
  'budget-exceeded': 'text-refused',
  timeout: 'text-broken',
  failed: 'text-broken',
};

export default function RunPage({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .run(id)
      .then(setRun)
      .catch((err) => setError(err instanceof Error ? err.message : 'could not load this run'));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken">{error}</p>
        <Link href="/runs" className="text-sm text-accent hover:underline">
          ← all runs
        </Link>
      </div>
    );
  }

  if (!run) return <p className="py-8 text-sm text-muted">Loading…</p>;

  const events: RunEvent[] = run.events.map((e) => ({
    kind: e.kind as RunEvent['kind'],
    payload: e.payload,
    at: Date.parse(e.occurredAt),
  }));

  return (
    <div className="space-y-6">
      <Link href="/runs" className="text-sm text-muted hover:text-text">
        ← runs
      </Link>

      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{run.goal}</h1>
        <p className="text-xs text-muted">
          run {run.runId} · {run.network} · {run.state} · spent{' '}
          <span className="tabular">{run.spentDisplay}</span> · {new Date(run.startedAt).toLocaleString()}
        </p>
      </header>

      {run.answer && (
        <section className="rounded-lg border border-edge bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Answer</h2>
          <p className="text-sm leading-relaxed">{run.answer}</p>
        </section>
      )}

      {run.error && (
        <p className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken">{run.error}</p>
      )}

      {run.steps.length > 0 && (
        <section className="rounded-lg border border-edge bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold">Steps</h2>
          <ol className="space-y-3">
            {run.steps.map((step, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="tabular text-muted">{i + 1}.</span>
                  <span className="font-medium">{step.capability}</span>
                  <span className={`text-xs font-medium ${STEP_TONE[step.status] ?? 'text-muted'}`}>{step.status}</span>
                  {step.explorerUrl && (
                    <a href={step.explorerUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                      transaction ↗
                    </a>
                  )}
                </div>
                <p className="ml-6 mt-1 text-muted">{step.detail}</p>
                {step.retriedAfter && (
                  <p className="ml-6 mt-1 text-xs text-refused">first worker: {step.retriedAfter}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Trace</h2>
        <RunTrace events={events} startedAt={Date.parse(run.startedAt)} />
      </section>
    </div>
  );
}
