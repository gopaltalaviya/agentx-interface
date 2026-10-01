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

// A production build without NEXT_PUBLIC_API_URL fails in next.config.mjs,
// so this fallback only ever serves `next dev` and the tests.
export const API_URL = process.env['NEXT_PUBLIC_API_URL']?.replace(/\/$/, '') ?? 'http://127.0.0.1:8080';

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
  /** The smallest job the escrow accepts, in base units. A cheaper agent can never be hired. */
  minJobAmount?: string;
  minFee?: string;
  windows?: {accept: number; work: number; review: number; dispute: number};
}

export interface AgentSummary {
  agentId: number;
  chainId: number;
  /** The agent's ERC-8004 identity id on this chain, once registered there. */
  chainAgentId?: string | number | null;
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
  status:
    'settled' | 'disputed' | 'unrecoverable' | 'no-candidate' | 'budget-exceeded' | 'timeout' | 'failed';
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
  | 'plan-failed'
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

/** Messages for the two failures that are not the API speaking. */
export const UNREACHABLE = 'Cannot reach the AGENTX API — check your connection, or see the status page.';
export const UNAVAILABLE =
  'AGENTX is temporarily unavailable — a service it depends on is down. Try again in a moment.';
export const BAD_RESPONSE =
  'The API sent an unexpected answer (not a valid response) — often a proxy or a deploy in progress. Try again in a moment.';

// These are shared by reads AND writes, so none of them claims "nothing was
// spent": after a 5xx or a dropped connection on POST /v1/runs the site cannot
// know that. Read-only pages say it themselves, where it is true.
/**
 * Every request goes through here, so every failure reads the same way:
 * the API's own RFC 7807 problem when it sent one; otherwise one of two
 * sentences a person can act on — never "Failed to fetch" or a JSON parser's
 * "Unexpected token '<'".
 */
async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {cache: 'no-store', ...init});
  } catch (err) {
    if ((err as {name?: string})?.name === 'AbortError') throw err;
    throw new ApiError('UNREACHABLE', UNREACHABLE);
  }
  const text = await res.text().catch(() => '');
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const problem = (body ?? {}) as {code?: string; detail?: string};
    // A 5xx is never the visitor's to fix, and its detail (if any) is written
    // for an operator: say what it means for them instead.
    if (res.status === 503 || problem.code === 'UPSTREAM_UNAVAILABLE')
      throw new ApiError('UPSTREAM_UNAVAILABLE', UNAVAILABLE);
    if (res.status >= 500)
      throw new ApiError(
        problem.code ?? 'UPSTREAM_UNAVAILABLE',
        `The API had a problem (${res.status}). Try again in a moment.`,
      );
    throw new ApiError(problem.code ?? 'UNKNOWN', problem.detail ?? `${fallback} (${res.status})`);
  }
  if (body === undefined) throw new ApiError('BAD_RESPONSE', BAD_RESPONSE);
  return body as T;
}

function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, signal ? {signal} : {}, `${path} failed`);
}

export interface RegisteredAgent {
  agentId: number;
  chainId: number;
  walletAddress: string;
  apiKey: string;
  warning: string;
}

/**
 * `GET /v1/status` — public by design: states and numbers only, never a host,
 * URL or error message. See agentx-backend apps/api/src/routes/status.ts.
 */
export type ComponentStatus = 'up' | 'degraded' | 'down' | 'unknown';

export interface StatusReport {
  status: 'operational' | 'degraded' | 'down';
  checkedAt: string;
  build: {service: string; version: string; commit: string; builtAt: string | null} | null;
  components: {
    api: ComponentStatus;
    database: ComponentStatus;
    signer: ComponentStatus;
    rpc: ComponentStatus;
    indexer: ComponentStatus;
  };
  chains: {
    chainId: number;
    name: string;
    testnet: boolean;
    rpc: ComponentStatus;
    headBlock: number | null;
    indexer: {
      status: ComponentStatus;
      indexedBlock: number | null;
      lagBlocks: number | null;
      lastIndexedAt: string | null;
      secondsSinceIndexed: number | null;
    };
  }[];
}

export const api = {
  network: (signal?: AbortSignal) => get<NetworkInfo>('/v1/network', signal),

  status: (signal?: AbortSignal) => get<StatusReport>('/v1/status', signal),

  agents: (
    q: {capability?: string; rank?: string; minScore?: number; limit?: number} = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') params.set(k, String(v));
    return get<{agents: AgentSummary[]}>(`/v1/agents?${params}`, signal).then((r) => r.agents);
  },

  agent: (agentId: number, signal?: AbortSignal) => get<AgentSummary>(`/v1/agents/${agentId}`, signal),

  run: (runId: string, signal?: AbortSignal) =>
    get<RunDetail>(`/v1/runs/${encodeURIComponent(runId)}`, signal),

  /**
   * The runs an orchestrator has made, newest first. Needs its key — a run
   * history is that agent's own business — which, as on the demo page, is
   * used for the request and never stored.
   */
  async runs(apiKey: string, limit = 50): Promise<RunSummary[]> {
    const body = await request<{runs: RunSummary[]}>(
      `/v1/runs?limit=${limit}`,
      {headers: {authorization: `Bearer ${apiKey}`}},
      'could not list runs',
    );
    return body.runs;
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
    return request<RegisteredAgent>(
      '/v1/agents',
      {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)},
      'registration failed',
    );
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
    return request<{runId: string; eventsUrl: string}>(
      '/v1/runs',
      {
        method: 'POST',
        headers: {'content-type': 'application/json', authorization: `Bearer ${apiKey}`},
        body: JSON.stringify({goal}),
      },
      'could not start',
    );
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
export type StreamState = 'open' | 'reconnecting' | 'lost';

export function subscribeToRun(
  runId: string,
  onEvent: (event: RunEvent) => void,
  onClose?: () => void,
  /**
   * Connection state, so a dropped stream is said rather than looking like a
   * run that never ends: `reconnecting` after an error, `lost` after three in
   * a row (the browser keeps retrying; `open` again if it gets back).
   */
  onConnection?: (state: StreamState) => void,
): () => void {
  const source = new EventSource(`${API_URL}/v1/runs/${encodeURIComponent(runId)}/events`);

  // Every kind the page renders. A kind missing here is not an error — it is
  // silence: an SSE event with no listener is dropped by the browser.
  const KINDS: RunEventKind[] = [
    'planned',
    'plan-failed',
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

  let failures = 0;
  source.onopen = () => {
    failures = 0;
    onConnection?.('open');
  };
  source.onerror = () => {
    // EventSource retries on its own. Only a closed source is terminal.
    if (source.readyState === EventSource.CLOSED) {
      onClose?.();
      return;
    }
    failures += 1;
    onConnection?.(failures >= 3 ? 'lost' : 'reconnecting');
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
