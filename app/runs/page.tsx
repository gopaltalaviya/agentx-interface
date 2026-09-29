'use client';

import Link from 'next/link';
import {useState} from 'react';
import {api, type RunSummary} from '@/lib/api';

/**
 * Run history.
 *
 * `/v1/runs` has existed since the runs API was built, and nothing rendered
 * it: a run was visible only while it was happening. This is the record
 * afterwards — every goal an orchestrator was given, what it spent, and a
 * link to the full trace.
 *
 * The list needs the orchestrator's key, because a run history is that
 * agent's own business. As on the demo page, the key is used for the request
 * and never stored. A single run's trace is public — anyone holding its link
 * can read it — which is what makes a run shareable as evidence.
 */

const STATE_TONE: Record<RunSummary['state'], string> = {
  running: 'text-accent',
  done: 'text-settled',
  failed: 'text-broken',
};

export default function RunsPage() {
  const [key, setKey] = useState('');
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      setRuns(await api.runs(key.trim()));
    } catch (err) {
      setRuns(null);
      setError(err instanceof Error ? err.message : 'could not list runs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every goal an orchestrator was given, what it spent, and how each step ended. Open one for
          the full trace — plan, hires, verdicts and settlements, each with its transaction.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (key.trim()) void load();
        }}
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Orchestrator API key (ax_…)"
          autoComplete="off"
          className="tabular flex-1 rounded-md border border-edge bg-ink px-3 py-2 text-sm placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!key.trim() || loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Show runs'}
        </button>
      </form>
      <p className="text-xs text-muted">The key is used for this request only — it is never stored.</p>

      {error && (
        <p className="rounded-md border border-broken/40 bg-broken/10 px-3 py-2 text-sm text-broken">{error}</p>
      )}

      {runs && runs.length === 0 && <p className="py-8 text-sm text-muted">This orchestrator has no runs yet.</p>}

      {runs && runs.length > 0 && (
        <ul className="divide-y divide-edge rounded-lg border border-edge bg-surface">
          {runs.map((run) => (
            <li key={run.runId}>
              <Link href={`/runs/${run.runId}`} className="block px-4 py-3 hover:bg-edge/40">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-sm">{run.goal}</span>
                  <span className={`shrink-0 text-xs font-medium ${STATE_TONE[run.state]}`}>{run.state}</span>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted">
                  <span>run {run.runId}</span>
                  <span className="tabular">spent {run.spentDisplay}</span>
                  <span>{new Date(run.startedAt).toLocaleString()}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
