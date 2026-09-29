/**
 * The browser's wallet, via viem and EIP-1193 directly.
 *
 * ## Why not wagmi + RainbowKit
 *
 * RainbowKit needs a WalletConnect project id, which is another account to
 * create and another key to keep working, days before a deadline — and wagmi's
 * value is shared, reactive state across many components. This app connects a
 * wallet on exactly one page and sends one transaction from it. That is forty
 * lines of viem, no configuration, and nothing to expire.
 *
 * The trade-off, stated rather than hidden: **injected wallets only**. Someone
 * on a mobile wallet without an in-app browser cannot register from this page.
 * They can still register through the API directly, which is how every agent
 * in the demo is registered anyway.
 *
 * Nothing here ever sees a private key. The wallet signs; this code asks.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  parseEventLogs,
  type Address,
  type Hex,
} from 'viem';

/** The subset of ERC-8004 identity registration this page performs. */
export const IDENTITY_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      {name: 'agentURI', type: 'string'},
      {name: 'wallet', type: 'address'},
    ],
    outputs: [{name: 'agentId', type: 'uint256'}],
  },
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{name: 'agentURI', type: 'string'}],
    outputs: [{name: 'agentId', type: 'uint256'}],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      {name: 'agentId', type: 'uint256', indexed: true},
      {name: 'agentURI', type: 'string', indexed: false},
      {name: 'owner', type: 'address', indexed: true},
    ],
  },
] as const;

interface Eip1193Provider {
  request(args: {method: string; params?: unknown[]}): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

function provider(): Eip1193Provider {
  const injected = (globalThis as {ethereum?: Eip1193Provider}).ethereum;
  if (!injected) {
    throw new Error(
      'No browser wallet found. Install MetaMask, or register through the API directly.',
    );
  }
  return injected;
}

export function hasWallet(): boolean {
  return Boolean((globalThis as {ethereum?: unknown}).ethereum);
}

export async function connect(): Promise<Address> {
  const accounts = (await provider().request({method: 'eth_requestAccounts'})) as Address[];
  const account = accounts[0];
  if (!account) throw new Error('The wallet returned no account.');
  return account;
}

/**
 * Put the wallet on the right chain before asking it to sign.
 *
 * A transaction sent from the wrong network does not fail usefully — it goes
 * to a contract address that means something else, or nothing. Switching
 * first, and adding the chain when the wallet has never seen it, is the
 * difference between "approve this" and a support question.
 */
export async function ensureChain(chain: {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerBaseUrl: string | null;
  nativeCurrency: {name: string; symbol: string; decimals: number};
}): Promise<void> {
  const hexId = `0x${chain.chainId.toString(16)}` as Hex;

  try {
    await provider().request({method: 'wallet_switchEthereumChain', params: [{chainId: hexId}]});
  } catch (err) {
    // 4902 = the wallet has never heard of this chain. Monad testnet is not
    // in any wallet's default list, so this is the normal path, not an error.
    const code = (err as {code?: number}).code;
    if (code !== 4902) throw err;

    await provider().request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: hexId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [chain.rpcUrl],
          ...(chain.explorerBaseUrl ? {blockExplorerUrls: [chain.explorerBaseUrl]} : {}),
        },
      ],
    });
  }
}

/**
 * Register an ERC-8004 identity and wait for it to be mined.
 *
 * `referenceImplementation` picks the ABI: the reference registry takes a
 * payout wallet, the canonical one does not. Guessing sends a transaction
 * that reverts, and on mainnet it costs gas to find out.
 */
export async function registerIdentity(args: {
  registry: Address;
  agentURI: string;
  payoutWallet: Address;
  referenceImplementation: boolean;
  chainId: number;
  rpcUrl: string;
}): Promise<{txHash: Hex; agentId: bigint}> {
  const account = await connect();

  const data = args.referenceImplementation
    ? encodeFunctionData({
        abi: IDENTITY_ABI,
        functionName: 'register',
        args: [args.agentURI, args.payoutWallet],
      })
    : encodeFunctionData({
        abi: IDENTITY_ABI,
        functionName: 'register',
        args: [args.agentURI],
      });

  const wallet = createWalletClient({account, transport: custom(provider())});
  const txHash = await wallet.sendTransaction({
    to: args.registry,
    data,
    chain: null,
    account,
  });

  // Wait here rather than returning immediately: the AGENTX row is created
  // next, and creating it before the identity exists produces an agent that
  // cannot be hired until an indexer catches up — which looks, to whoever
  // registered it, exactly like a broken marketplace.
  const pub = createPublicClient({transport: http(args.rpcUrl)});
  const receipt = await pub.waitForTransactionReceipt({hash: txHash});

  // The id the registry assigned. The API needs it to link the record to the
  // identity — without it the agent exists but can never be hired, because
  // the escrow addresses agents by this id.
  const [registered] = parseEventLogs({abi: IDENTITY_ABI, eventName: 'Registered', logs: receipt.logs});
  if (!registered) throw new Error(`registration ${txHash} emitted no Registered event`);

  return {txHash, agentId: registered.args.agentId};
}
