#!/usr/bin/env node
/**
 * Does the API still return what the interface renders?
 *
 * `lib/api.ts` is a hand-copied view of a contract that lives in another
 * repository, and a copy drifts silently — a renamed field becomes
 * `undefined`, which React happily renders as nothing at all. That failure
 * looks like "the page is a bit empty", which is the worst kind: nobody
 * notices until a judge does.
 *
 * So this asks a RUNNING API and checks every field the interface reads. A
 * type that agrees with itself proves nothing.
 *
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:8080 node scripts/check-api-contract.mjs
 */

import http from 'node:http';
import https from 'node:https';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  failures++;
};

/** Present means "the key exists and is not undefined". `null` is a real value. */
function expectFields(label, object, fields) {
  const missing = fields.filter((f) => object?.[f] === undefined);
  missing.length === 0
    ? ok(`${label}: ${fields.length} field(s) present`)
    : fail(`${label} is missing ${missing.join(', ')}`);
}

/**
 * Plain `node:http` rather than `fetch`.
 *
 * Node's fetch keeps sockets in a shared pool, and on Windows this process
 * aborts during teardown with a libuv assertion (exit 0xC0000409) once that
 * pool is collected — so a run where every check passed exits non-zero and
 * reads in CI as a permanent failure. One unpooled request per call leaves
 * nothing to tear down. This script makes four GETs; it does not need a
 * connection pool.
 */
function request(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API}${path}`);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        agent: false,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({status: res.statusCode ?? 0, body}));
      },
    );

    req.on('error', reject);
    req.end();
  });
}

async function get(path) {
  const {status, body} = await request(path);
  if (status < 200 || status >= 300) throw new Error(`GET ${path} → ${status}`);
  return JSON.parse(body);
}

console.log(`\nAPI contract — ${API}\n`);

try {
  const health = await get('/health');
  ok(`api is up (orchestrator: ${health.orchestrator === true ? 'yes' : 'no'})`);

  const network = await get('/v1/network');
  expectFields('/v1/network', network, [
    'chainId',
    'name',
    'testnet',
    'paymentToken',
    'contracts',
    'erc8004',
    'rpcUrls',
    'nativeCurrency',
    'explorerBaseUrl',
    'fastPathMaxDisplay',
    'protocolFeeBps',
  ]);
  expectFields('/v1/network paymentToken', network.paymentToken, ['symbol', 'decimals', 'address']);
  expectFields('/v1/network nativeCurrency', network.nativeCurrency, ['name', 'symbol', 'decimals']);

  // The register page picks its ABI from this. Guessing sends a transaction
  // that reverts, and on mainnet it pays gas to find out.
  typeof network.erc8004?.referenceImplementation === 'boolean'
    ? ok('/v1/network states which ERC-8004 registry ABI the chain has')
    : fail('/v1/network erc8004.referenceImplementation is missing or not a boolean');

  // A wallet cannot add Monad without one of these; it is in no default list.
  Array.isArray(network.rpcUrls) && network.rpcUrls.length > 0
    ? ok(`/v1/network offers ${network.rpcUrls.length} public RPC endpoint(s) a wallet can use`)
    : fail('/v1/network returned no rpcUrls, so a wallet cannot add this chain');

  // The badge says "testnet" or "REAL FUNDS" from this one boolean. A string
  // here would be truthy either way, and the page would claim testnet safety
  // on mainnet.
  typeof network.testnet === 'boolean'
    ? ok('/v1/network testnet is a boolean, so the safety badge cannot be wrong')
    : fail(`/v1/network testnet is ${typeof network.testnet}, not a boolean`);

  const {agents} = await get('/v1/agents?limit=1');
  if (!Array.isArray(agents)) {
    fail('/v1/agents did not return an agents array');
  } else if (agents.length === 0) {
    console.log('  – /v1/agents is empty; register an agent to check its fields');
  } else {
    expectFields('/v1/agents[0]', agents[0], [
      'agentId',
      'name',
      'capabilities',
      'pricePerTask',
      'priceDisplay',
      'score',
      'completed',
      'failed',
      'successRate',
      'active',
      'explorerUrl',
    ]);
  }

  const run = await request('/v1/runs/1');
  if (run.status >= 400) {
    console.log('  – no run #1 yet; run one to check the trace fields');
  } else {
    const parsed = JSON.parse(run.body);
    expectFields('/v1/runs/:id', parsed, [
      'runId',
      'goal',
      'state',
      'spent',
      'spentDisplay',
      'answer',
      'steps',
      'events',
      'startedAt',
      'finishedAt',
    ]);
    Array.isArray(parsed.events) && parsed.events.every((e) => typeof e.kind === 'string')
      ? ok('/v1/runs/:id events all carry a kind the page can switch on')
      : fail('/v1/runs/:id returned an event with no kind');
  }
} catch (err) {
  fail(`could not check the contract: ${err.message}`);
  console.error('\n  Is the API running? Start it with `pnpm dev` in agentx-backend.\n');
}

console.log(failures ? `\nFAILED (${failures})\n` : '\nContract holds.\n');
process.exitCode = failures ? 1 : 0;
