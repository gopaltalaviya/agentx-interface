/**
 * The browser's view of the AGENTX API.
 *
 * ## Why this is not `@agentx/sdk`
 *
 * The SDK lives in `agentx-backend`, which is a separate repository on
 * purpose: the contracts and the signer must never enter a Vercel build
 * container. Importing across that line would mean either publishing the SDK
 * or giving the hosting build a deploy key to a private repo — both worse
 * than a small duplicated surface.
 *
 * So these types are a COPY, and a copy drifts. The guard is
 * `scripts/check-api-contract.mjs`: it calls a running API and asserts every
 * field this file claims actually exists. A type that agrees with itself
 * proves nothing; one checked against the real server does.
 *
 * Only read endpoints appear here. Anything that spends is done by an agent
 * holding its own key, never by a browser.
 */

export const API_URL =
  process.env['NEXT_PUBLIC_API_URL']?.replace(/\/$/, '') ?? 'http://127.0.0.1:8080';

export interface NetworkInfo {
  chainId: number;
  name: string;
  testnet: boolean;
  paymentToken: {symbol: string; decimals: number; address: string | null};
  contracts: Record<string, string>;
  erc8004: {
    identityRegistry?: string;
    reputationRegistry?: string;
    /** Reference registry takes register(uri, wallet); canonical takes register(uri). */
    referenceImplementation: boolean;
  };
  /** PUBLIC endpoints. A wallet needs one to add Monad, which it has never seen. */
  rpcUrls: string[];
  nativeCurrency: {name: string; symbol: string; decimals: number};
  explorerBaseUrl: string | null;
  fastPathMaxDisplay: string;
  protocolFeeBps: number;
}

export interface AgentSummary {
  agentId: number;
  chainId: number;
  name: string;
  description: string | null;
  capabilities: string[];
  pricePerTask: string;
  priceDisplay: string;
  walletAddress: string;
  score: number;
  completed: number;
  failed: number;
  successRate: number | null;
  active: boolean;
  explorerUrl: string;
}

export interface RunSummary {
  runId: string;
  chainId: number;
  network: string;
  testnet: boolean;
  goal: string;
  state: 'running' | 'done' | 'failed';
  spent: string;
  spentDisplay: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface RunDetail extends RunSummary {
  answer: string | null;
  steps: RunStep[];
  error: string | null;
  events: {kind: string; payload: Record<string, unknown>; occurredAt: string}[];
}

export interface RunStep {
  capability: string;
  status: 'settled' | 'disputed' | 'unrecoverable' | 'no-candidate' | 'budget-exceeded' | 'timeout' | 'failed';
  /** Set when a second worker delivered: why the first did not. */
  retriedAfter?: string;
  detail: string;
  jobId?: string;
  agentId?: number;
  amount?: string;
  explorerUrl?: string;
  verdict?: {accept: boolean; reason: string; quality: number; injectionAttempted: boolean};
}

/** The event kinds the orchestrator emits, plus the two terminal ones. */
export type RunEventKind =
  | 'planned'
  | 'discovered'
  | 'selected'
  | 'hired'
  | 'judged'
  | 'settled'
  | 'disputed'
  | 'retrying'
  | 'skipped'
  | 'finished'
  | 'failed';

export interface RunEvent {
  kind: RunEventKind;
  payload: Record<string, unknown>;
  /** Client-side, for ordering and for the elapsed column. */
  at: number;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {cache: 'no-store'});
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as {code?: string; detail?: string};
    throw new ApiError(problem.code ?? 'UNKNOWN', problem.detail ?? `${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export interface RegisteredAgent {
  agentId: number;
  chainId: number;
  walletAddress: string;
  apiKey: string;
  warning: string;
}

export const api = {
  network: () => get<NetworkInfo>('/v1/network'),

  agents: (q: {capability?: string; rank?: string; minScore?: number; limit?: number} = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') params.set(k, String(v));
    return get<{agents: AgentSummary[]}>(`/v1/agents?${params}`).then((r) => r.agents);
  },

  agent: (agentId: number) => get<AgentSummary>(`/v1/agents/${agentId}`),

  run: (runId: string) => get<RunDetail>(`/v1/runs/${runId}`),

  /**
   * The runs an orchestrator has made, newest first. Needs its key — a run
   * history is that agent's own business — which, as on the demo page, is
   * used for the request and never stored.
   */
  async runs(apiKey: string, limit = 50): Promise<RunSummary[]> {
    const res = await fetch(`${API_URL}/v1/runs?limit=${limit}`, {
      cache: 'no-store',
      headers: {authorization: `Bearer ${apiKey}`},
    });
    if (!res.ok) {
      const problem = (await res.json().catch(() => ({}))) as {code?: string; detail?: string};
      throw new ApiError(problem.code ?? 'UNKNOWN', problem.detail ?? `could not list runs (${res.status})`);
    }
    return ((await res.json()) as {runs: RunSummary[]}).runs;
  },

  /**
   * Create the AGENTX record for an agent.
   *
   * The API key comes back exactly once and is never recoverable, so the page
   * must put it in front of the person before anything else can navigate away.
   */
  async register(body: {
    name: string;
    description?: string;
    capabilities: string[];
    pricePerTask: string;
    walletAddress: string;
    ownerAddress: string;
    chainId: number;
    /** The ERC-8004 id; the API checks it against the registry before storing it. */
    chainAgentId?: string;
  }): Promise<RegisteredAgent> {
    const res = await fetch(`${API_URL}/v1/agents`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const problem = (await res.json().catch(() => ({}))) as {code?: string; detail?: string};
      throw new ApiError(problem.code ?? 'UNKNOWN', problem.detail ?? `registration failed (${res.status})`);
    }
    return (await res.json()) as RegisteredAgent;
  },

  /**
   * Start a run.
   *
   * The key is supplied by whoever is driving the demo and is never stored:
   * a browser is not a place to keep an agent's credentials, and a page that
   * remembered one would leave it in `localStorage` for the next person on
   * that machine.
   */
  async startRun(goal: string, apiKey: string): Promise<{runId: string; eventsUrl: string}> {
    const res = await fetch(`${API_URL}/v1/runs`, {
      method: 'POST',
      headers: {'content-type': 'application/json', authorization: `Bearer ${apiKey}`},
      body: JSON.stringify({goal}),
    });
    if (!res.ok) {
      const problem = (await res.json().catch(() => ({}))) as {code?: string; detail?: string};
      throw new ApiError(problem.code ?? 'UNKNOWN', problem.detail ?? `could not start (${res.status})`);
    }
    return (await res.json()) as {runId: string; eventsUrl: string};
  },
};

/**
 * Subscribe to a run's events.
 *
 * `EventSource` replays from the server on reconnect, and the server sends
 * everything that already happened when a client connects — so a page opened
 * late, or refreshed mid-run, still shows the whole story. Returns an
 * unsubscribe function.
 */
export function subscribeToRun(
  runId: string,
  onEvent: (event: RunEvent) => void,
  onClose?: () => void,
): () => void {
  const source = new EventSource(`${API_URL}/v1/runs/${runId}/events`);

  const KINDS: RunEventKind[] = [
    'planned',
    'discovered',
    'selected',
    'hired',
    'judged',
    'settled',
    'disputed',
    'retrying',
    'skipped',
    'finished',
    'failed',
  ];

  for (const kind of KINDS) {
    source.addEventListener(kind, (e) => {
      try {
        onEvent({kind, payload: JSON.parse((e as MessageEvent).data), at: Date.now()});
      } catch {
        // A malformed frame must not kill the stream; the run is still real
        // and the next event will render.
      }
      if (kind === 'finished' || kind === 'failed') {
        source.close();
        onClose?.();
      }
    });
  }

  source.onerror = () => {
    // EventSource retries on its own. Only a closed source is terminal.
    if (source.readyState === EventSource.CLOSED) onClose?.();
  };

  return () => source.close();
}

/** `20000` → `0.02`, without floats: the string is the source of truth. */
export function formatUnits(base: string, decimals = 6): string {
  const negative = base.startsWith('-');
  const digits = (negative ? base.slice(1) : base).padStart(decimals + 1, '0');
  const whole = digits.slice(0, -decimals) || '0';
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
