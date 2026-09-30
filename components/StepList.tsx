import type {RunStep} from '@/lib/api';
import {safeHref} from '@/lib/links';
import {Badge, type Tone} from './ui/Badge';
import {Icon, type IconName} from './ui/Icon';

/**
 * How each step of a run ended, as a timeline: what was commissioned, the
 * outcome in words and colour, why, and the transaction that proves it.
 *
 * One component for the live demo and the permanent record, so a step reads
 * the same in both places.
 */

const OUTCOME: Record<RunStep['status'], {tone: Tone; icon: IconName}> = {
  settled: {tone: 'settled', icon: 'check'},
  disputed: {tone: 'refused', icon: 'alert'},
  unrecoverable: {tone: 'refused', icon: 'alert'},
  'no-candidate': {tone: 'refused', icon: 'users'},
  'budget-exceeded': {tone: 'refused', icon: 'coins'},
  timeout: {tone: 'broken', icon: 'x'},
  failed: {tone: 'broken', icon: 'x'},
};

const RING: Record<Tone, string> = {
  settled: 'border-settled/40 bg-settled/10 text-settled',
  refused: 'border-refused/40 bg-refused/10 text-refused',
  broken: 'border-broken/40 bg-broken/10 text-broken',
  live: 'border-accent/40 bg-accent/10 text-accent',
  neutral: 'border-edge bg-raised text-muted',
  chain: 'border-chain/40 bg-chain/10 text-chain',
};

export function StepList({steps}: {steps: RunStep[]}) {
  return (
    <ol className="stagger space-y-0">
      {steps.map((step, i) => {
        const outcome = OUTCOME[step.status] ?? {tone: 'neutral' as Tone, icon: 'activity' as IconName};
        const href = safeHref(step.explorerUrl);
        const last = i === steps.length - 1;
        return (
          <li
            key={`${i}-${step.capability}-${step.jobId ?? ''}`}
            style={{'--i': i} as React.CSSProperties}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            {!last && <span aria-hidden className="absolute bottom-0 left-4 top-9 w-px bg-edge" />}
            <span
              className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border ${RING[outcome.tone]}`}
            >
              <Icon name={outcome.icon} className="size-3.5" />
              <span className="sr-only">Step {i + 1}</span>
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-medium">{step.capability}</span>
                <Badge tone={outcome.tone}>{step.status}</Badge>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    transaction ↗<span className="sr-only"> (opens the block explorer in a new tab)</span>
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.detail}</p>
              {step.retriedAfter && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-refused">
                  <Icon name="refresh" className="mt-px size-3.5" />
                  First worker: {step.retriedAfter}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
