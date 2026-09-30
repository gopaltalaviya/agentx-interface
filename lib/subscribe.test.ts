import {afterEach, describe, expect, it, vi} from 'vitest';
import {subscribeToRun, type RunEvent} from './api';

/**
 * A stand-in EventSource. It records the URL and lets a test deliver named
 * events, which is exactly the surface `subscribeToRun` uses — and the one
 * that matters: an SSE event with no listener is silently dropped.
 */
class FakeEventSource {
  static CLOSED = 2;
  static last: FakeEventSource | null = null;
  readyState = 1;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, ((e: {data: string}) => void)[]>();
  constructor(readonly url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(kind: string, fn: (e: {data: string}) => void) {
    this.listeners.set(kind, [...(this.listeners.get(kind) ?? []), fn]);
  }
  emit(kind: string, data: string) {
    for (const fn of this.listeners.get(kind) ?? []) fn({data});
  }
  close() {
    this.readyState = FakeEventSource.CLOSED;
  }
}

afterEach(() => {
  FakeEventSource.last = null;
  vi.unstubAllGlobals();
});

function subscribe() {
  vi.stubGlobal('EventSource', FakeEventSource);
  const events: RunEvent[] = [];
  const onClose = vi.fn();
  const stop = subscribeToRun('3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b', (e) => events.push(e), onClose);
  return {events, onClose, stop, source: FakeEventSource.last!};
}

describe('subscribeToRun', () => {
  it('streams from the run’s events URL', () => {
    const {source} = subscribe();
    expect(source.url).toMatch(/\/v1\/runs\/3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b\/events$/);
  });

  it('delivers every kind the trace renders, including plan-failed', () => {
    const {source, events} = subscribe();
    for (const kind of ['planned', 'plan-failed', 'hired', 'settled', 'disputed', 'skipped'])
      source.emit(kind, JSON.stringify({kind}));
    expect(events.map((e) => e.kind)).toEqual([
      'planned',
      'plan-failed',
      'hired',
      'settled',
      'disputed',
      'skipped',
    ]);
  });

  it('survives a malformed frame and keeps streaming', () => {
    const {source, events} = subscribe();
    source.emit('planned', '{not json');
    source.emit('hired', JSON.stringify({jobId: 'x'}));
    expect(events.map((e) => e.kind)).toEqual(['hired']);
    expect(source.readyState).not.toBe(FakeEventSource.CLOSED);
  });

  it('closes on a terminal event and says so once', () => {
    const {source, onClose} = subscribe();
    source.emit('finished', JSON.stringify({spent: '0'}));
    expect(source.readyState).toBe(FakeEventSource.CLOSED);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats a transient error as retryable and a closed source as the end', () => {
    const {source, onClose} = subscribe();
    source.onerror?.();
    expect(onClose).not.toHaveBeenCalled();
    source.readyState = FakeEventSource.CLOSED;
    source.onerror?.();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes by closing the stream', () => {
    const {source, stop} = subscribe();
    stop();
    expect(source.readyState).toBe(FakeEventSource.CLOSED);
  });
});
