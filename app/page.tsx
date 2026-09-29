'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {RunTrace} from '@/components/RunTrace';
import {ApiError, api, subscribeToRun, type RunDetail, type RunEvent} from '@/lib/api';

/**
 * The live demo.
 *
 * One box, one sentence, and then everything that happens is a consequence of
 * agents deciding: what to commission, who to hire, whether the work was
 * worth paying for. This page IS the submission video, which drives three
 * choices:
 *
 * - **Explorer link on every on-chain line.** A payment nobody can check is
 *   indistinguishable from a log message.
 * - **Refusals are shown, not hidden.** A worker declining, a judge rejecting
 *   work, a budget running out — these are the system working, and an
 *   audience that only ever sees the happy path has no reason to believe the
 *   rest exists.
 * - **The totals are always on screen**, because "what did that cost" is the
 *   first question anyone asks.
 */

const EXAMPLES = [
  'Research ETH/USDC liquidity on Monad and tell me whether to open a position.',
  'Find the cheapest agent that can summarise a protocol, and have it summarise Monad.',
  'Analyse the risk of providing liquidity to a new pool, then plan the entry.',
];

export default function DemoPage() {
  const [goal, setGoal] = useState(EXAMPLES[0]!);
  const [apiKey, setApiKey] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);

  const unsubscribe = useRef<(() => void) | null>(null);
  useEffect(() => () => unsubscribe.current?.(), []);

  const start = useCallback(async () => {
    setError(null);
    setEvents([]);
    setDetail(null);
    setFinished(false);
    unsubscribe.current?.();

    try {
      const {runId: id} = await api.startRun(goal, apiKey.trim());
      setRunId(id);
      setStartedAt(Date.now());

      unsubscribe.current = subscribeToRun(
        id,
        (event) => setEvents((prev) => [...prev, event]),
        () => {
          setFinished(true);
          // Read the finished run once the stream closes: the row carries the
          // synthesised answer and the per-step outcomes, which the event
          // trace deliberately does not repeat.
          api.run(id).then(setDetail).catch(() => undefined);
        },
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'could not start the run',
      );
    }
  }, [goal, apiKey]);

  const running = runId !== null && !finished;
  const spend = events.find((e) => e.kind === 'finished')?.payload['spent'];
  const hires = events.filter((e) => e.kind === 'hired').length;
  const settlements = events.filter((e) => e.kind === 'settled').length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          One sentence. Agents do the rest — and pay each other for it.
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Everything below happens on Monad. Each agent&apos;s reputation is written only when a
          payment actually settles, so it cannot be self-reported.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-edge bg-surface p-5">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          disabled={running}
          className="w-full resize-none rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
          placeholder="What do you want done?"
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setGoal(example)}
              disabled={running}
              className="rounded-full border border-edge px-3 py-1 text-xs text-muted hover:border-accent hover:text-text disabled:opacity-40"
            >
              {example.slice(0, 44)}…
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={running}
            type="password"
            placeholder="Orchestrator API key (ax_…)"
            className="tabular flex-1 rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
          <button
            onClick={start}
            disabled={running || goal.trim().length < 3 || apiKey.trim().length === 0}
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-ink disabled:opacity-40"
          >
            {running ? 'Running…' : 'Run'}
          </button>
        </div>

        {/* Said plainly rather than in a tooltip: a page that quietly keeps a
            credential is a page nobody should paste one into. */}
        <p className="text-xs text-muted">
          The key is used for this request only — it is never stored, and the run spends under that
          agent&apos;s own spending caps, which the signer enforces.
        </p>

        {error && (
          <p className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken">
            {error}
          </p>
        )}
      </section>

      {runId && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-edge bg-surface px-5 py-3 text-sm">
            <Stat label="run" value={`#${runId}`} />
            <Stat label="hires" value={String(hires)} />
            <Stat label="settled" value={String(settlements)} tone="text-settled" />
            <Stat label="spent" value={spend ? `${String(spend)} base units` : '—'} />
            <span className="ml-auto text-xs text-muted">
              {running ? 'live' : finished ? 'finished' : ''}
            </span>
          </div>

          <div className="rounded-lg border border-edge bg-surface px-5 py-2">
            <RunTrace events={events} startedAt={startedAt} />
          </div>

          {detail?.steps && detail.steps.length > 0 && (
            <div className="rounded-lg border border-edge bg-surface p-5">
              <h2 className="mb-3 text-sm font-medium">What each step cost, and why</h2>
              <ul className="space-y-2 text-sm">
                {detail.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="tabular w-6 text-right text-muted">{i + 1}.</span>
                    <span className="flex-1">
                      <span className="font-medium">{step.capability}</span>
                      <span
                        className={
                          step.status === 'settled'
                            ? 'ml-2 text-settled'
                            : step.status === 'failed'
                              ? 'ml-2 text-broken'
                              : 'ml-2 text-refused'
                        }
                      >
                        {step.status}
                      </span>
                      <span className="ml-2 text-muted">{step.detail}</span>
                      {step.explorerUrl && (
                        <a
                          href={step.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs text-accent hover:underline"
                        >
                          explorer ↗
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail?.answer && (
            <div className="rounded-lg border border-edge bg-surface p-5">
              <h2 className="mb-2 text-sm font-medium">Answer</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.answer}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({label, value, tone}: {label: string; value: string; tone?: string}) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className={`tabular font-medium ${tone ?? ''}`}>{value}</span>
    </span>
  );
}
