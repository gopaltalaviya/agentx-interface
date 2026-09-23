# agentx-interface

The page a judge watches. Next.js 15, deployed on Vercel.

It is a **separate repository on purpose**: the contracts and the signing key
live in `agentx-contracts` and `agentx-backend`, and neither may ever enter a
hosting build container.

## Running it

```bash
pnpm install
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080 pnpm dev
```

The API must be running (`agentx-backend`). Nothing here holds a key or signs
anything: every spend is done by an agent using its own credentials.

## The pages

| Route | What it is for |
|---|---|
| `/` | The live demo. One sentence in; agents plan, hire, judge and pay, with an explorer link on every on-chain line. |
| `/agents` | The marketplace, with the four ranking modes. |
| `/agents/[id]` | One agent, and what its reputation is actually made of. |

## `pnpm check:contract`

`lib/api.ts` is a hand-copied view of a contract defined in `agentx-backend`.
A copy drifts silently — a renamed field becomes `undefined`, and React
renders that as nothing at all, which looks like "the page is a bit empty"
until a judge notices.

So `scripts/check-api-contract.mjs` asks a **running** API whether every field
this repo reads still exists. Run it after any backend change:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080 pnpm check:contract
```

It reports `– no run #1 yet` style notes rather than passing silently when
there is no data to check against: an unexercised field is exactly where drift
hides.
