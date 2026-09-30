'use client';

import type {RunEvent} from '@/lib/api';

/**
 * The trace, one line per event.
 *
 * The rule this follows: **every on-chain action carries its explorer link on
 * the line where it happens.** A payment nobody can verify is
 * indistinguishable from a `console.log`, and the whole claim of the project
 * is that these payments are real.
 *
 * The second rule: a refusal reads as a decision, not as a bug. "No agent
 * offers this" and "the judge rejected the work" are the system working, and
 * they are styled to say so — amber, not red. Red is reserved for something
 * actually broken.
 */

const TONE: Record<string, string> = {
  planned: 'text-accent',
  // No plan is not a decision the system made — the model could not be
  // reached or answered off-schema — so it is red, not amber.
  'plan-failed': 'text-broken',
  discovered: 'text-muted',
  selected: 'text-text',
  hired: 'text-text',
  judged: 'text-text',
  settled: 'text-settled',
  disputed: 'text-refused',
  retrying: 'text-refused',
  skipped: 'text-refused',
  finished: 'text-settled',
  failed: 'text-broken',
};

export function RunTrace({events, startedAt}: {events: RunEvent[]; startedAt: number | null}) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Waiting for the first event…
      </p>
    );
  }

  return (
    <ol className="divide-y divide-edge">
      {events.map((event, i) => (
        <li key={i} className="flex gap-4 py-2.5 text-sm">
          <span className="tabular w-12 shrink-0 text-right text-xs text-muted">
            {startedAt ? `${((event.at - startedAt) / 1000).toFixed(1)}s` : ''}
          </span>
          <span className={`w-20 shrink-0 text-xs font-medium ${TONE[event.kind] ?? 'text-muted'}`}>
            {event.kind}
          </span>
          <span className="min-w-0 flex-1">
            <Line event={event} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Line({event}: {event: RunEvent}) {
  const p = event.payload;

  switch (event.kind) {
    case 'planned':
      return (
        <>
          <strong>{String(p['subtasks'])} subtask(s)</strong>
          <span className="text-muted"> — {String(p['reasoning'] ?? '')}</span>
        </>
      );

    case 'plan-failed':
      return <span className="text-broken">no plan — {String(p['reason'] ?? 'the model could not be reached')}</span>;

    case 'discovered':
      return (
        <span className="text-muted">
          {String(p['capability'])}: {String(p['candidates'])} candidate(s)
        </span>
      );

    case 'selected':
      return (
        <>
          agent <strong>#{String(p['agentId'])}</strong> at {String(p['price'])}
          {/* Why this agent, not just which: a marketplace that cannot answer
              that looks like a lottery. */}
          <span className="text-muted"> — {String(p['reason'] ?? '')}</span>
        </>
      );

    case 'hired':
      return (
        <>
          job <strong>{String(p['jobId'])}</strong> for{' '}
          <span className="tabular">{String(p['amount'])}</span>
          <Explorer url={p['explorerUrl']} />
        </>
      );

    case 'judged':
      return (
        <>
          job {String(p['jobId'])}:{' '}
          <strong className={p['accept'] ? 'text-settled' : 'text-refused'}>
            {p['accept'] ? 'accept' : 'reject'}
          </strong>{' '}
          <span className="text-muted">quality {String(p['quality'])}</span>
          {p['injectionAttempted'] === true && (
            <span className="ml-2 rounded border border-refused/50 bg-refused/10 px-1.5 py-0.5 text-xs font-medium text-refused">
              injection attempt caught
            </span>
          )}
        </>
      );

    case 'settled':
      return (
        <>
          job <strong>{String(p['jobId'])}</strong> paid
          <Explorer url={p['explorerUrl']} />
        </>
      );

    case 'disputed':
      return (
        <>
          job {String(p['jobId'])} <span className="text-muted">— {String(p['reason'] ?? '')}</span>
        </>
      );

    case 'retrying':
      return (
        <>
          job {String(p['jobId'])}{' '}
          <span className="text-muted">— {String(p['reason'] ?? '')}; asking another agent</span>
        </>
      );

    case 'skipped':
      return (
        <>
          {String(p['capability'])}: <strong>{String(p['status'])}</strong>
          <span className="text-muted"> — {String(p['detail'] ?? '')}</span>
        </>
      );

    case 'finished':
      return (
        <span className="text-muted">
          spent <span className="tabular">{String(p['spent'])}</span> base units
        </span>
      );

    case 'failed':
      return <span className="text-broken">{String(p['detail'] ?? 'the run failed')}</span>;

    default:
      return <span className="text-muted">{JSON.stringify(p)}</span>;
  }
}

function Explorer({url}: {url: unknown}) {
  if (typeof url !== 'string' || !url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="ml-2 text-xs text-accent underline-offset-2 hover:underline"
    >
      explorer ↗
    </a>
  );
}
