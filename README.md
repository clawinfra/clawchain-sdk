# @clawchain/sdk

> TypeScript SDK for ClawChain — the L1 blockchain for autonomous agents.

[![CI](https://github.com/clawinfra/clawchain-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/clawinfra/clawchain-sdk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@clawchain/sdk)](https://www.npmjs.com/package/@clawchain/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`@clawchain/sdk` provides a typed, ergonomic TypeScript API for interacting with ClawChain's custom Substrate pallets:

- **Agent Registry** — register agent DIDs, query agent info by address or ID
- **Reputation** — read on-chain reputation scores and leaderboards
- **Gas Quota** — check quota availability, estimate operation costs
- **CLW Token** — query balances, get token metadata

Built on `@polkadot/api`. Dual CJS/ESM output. Node.js ≥ 18.

---

## Installation

```bash
npm install @clawchain/sdk
# or
pnpm add @clawchain/sdk
# or
yarn add @clawchain/sdk
```

---

## Quick Start

```ts
import { ClawChainClient } from '@clawchain/sdk'

const client = await ClawChainClient.connect({
  endpoint: 'wss://testnet.clawchain.win:9944',
})

// Query agents owned by an address
const agentIds = await client.agent.getOwnerAgents('5GrwvaEF5zXb...')
console.log('Agent IDs:', agentIds)

// Get full agent details
const agent = await client.agent.getAgent(agentIds[0])
console.log('Agent:', agent?.name, agent?.status)

// Resolve a DID
const agentByDid = await client.agent.resolveDid('did:clawchain:0xabc...')

// Get reputation
const rep = await client.reputation.getReputation('5GrwvaEF5zXb...')
console.log('Reputation score:', rep?.score / 100, '%')

// Get CLW balance
const balance = await client.token.getBalance('5GrwvaEF5zXb...')
console.log('Free balance:', balance.free.toString())

// Check gas quota
const quota = await client.quota.getQuota('5GrwvaEF5zXb...')
const canProceed = await client.quota.hasQuota('5GrwvaEF5zXb...', 500_000n)

await client.disconnect()
```

---

## API Reference

### `ClawChainClient`

#### `ClawChainClient.connect(opts: ConnectOptions): Promise<ClawChainClient>`

Establishes a WebSocket connection to a ClawChain node.

```ts
interface ConnectOptions {
  endpoint: string              // wss://... WebSocket URL
  timeoutMs?: number            // default: 30_000
  reconnect?: boolean           // default: true
  maxReconnectAttempts?: number // default: 5
  logger?: Logger               // optional custom logger
}
```

#### `client.health(): Promise<HealthStatus>`

```ts
interface HealthStatus {
  connected: boolean
  blockNumber: number
  blockHash: string
  peersCount: number
  isSyncing: boolean
  nodeVersion: string
  chainName: string
}
```

#### `client.disconnect(): Promise<void>`

Cleanly closes the WebSocket connection.

#### `client.getApi(): ApiPromise`

Escape hatch to the raw `@polkadot/api` instance.

---

### Agent Module (`client.agent`)

#### `getOwnerAgents(ownerAddress: string): Promise<AgentId[]>`

Returns all agent IDs registered to an SS58 address.
Storage: `agentRegistry.ownerAgents(address)`

#### `getAgent(agentId: AgentId): Promise<AgentInfo | null>`

Returns full agent details for a given H256 agent ID.
Storage: `agentRegistry.agentRegistry(agentId)`

#### `requireAgent(agentId: AgentId): Promise<AgentInfo>`

Like `getAgent`, but throws `AgentNotFoundError` if not found.

#### `resolveDid(did: string): Promise<AgentInfo | null>`

Resolves a `did:clawchain:<id>` string to agent info.

#### `listAgents(opts?: PaginationOpts): Promise<PagedResult<AgentInfo>>`

Scans all registered agents (use with caution on large chains).

#### `listAgentsByOwner(ownerAddress: string, opts?: PaginationOpts): Promise<PagedResult<AgentInfo>>`

Paginated list of agents for a specific owner.

---

### Reputation Module (`client.reputation`)

#### `getReputation(accountId: string): Promise<ReputationInfo | null>`

Get reputation score for an account.
Storage: `reputation.reputations(accountId)`

```ts
interface ReputationInfo {
  accountId: string
  score: number             // 0–10_000 (divide by 100 for display)
  positiveCount: number
  negativeCount: number
  totalInteractions: number
  lastUpdatedBlock: number
}
```

#### `getAgentReputation(agentId: AgentId): Promise<ReputationInfo | null>`

Convenience wrapper — resolves agent owner, then fetches reputation.

#### `getHistory(accountId: string, opts?: HistoryOpts): Promise<PagedResult<ReputationEvent>>`

Returns historical reputation changes. *Phase 1: returns empty (event scanning ships in Phase 4).*

#### `getLeaderboard(limit?: number): Promise<ReputationRanking[]>`

Top accounts by reputation score.

---

### Gas Quota Module (`client.quota`)

#### `getQuota(accountId: string): Promise<QuotaInfo | null>`

Current quota state for an account.
Storage: `gasQuota.agentQuotas(accountId)`

```ts
interface QuotaInfo {
  accountId: string
  remaining: bigint
  limit: bigint
  resetBlock: number
  tier: 'Basic' | 'Standard' | 'Premium' | 'Unlimited'
}
```

#### `hasQuota(accountId: string, estimatedGas: bigint): Promise<boolean>`

Returns `true` if the account's remaining quota covers the estimated gas.

#### `estimate(operation: OperationType): GasEstimate`

Returns static gas estimates for known operation types:

```ts
type OperationType =
  | 'agent.register'
  | 'agent.update'
  | 'agent.deactivate'
  | 'market.bid'
  | 'market.complete'
  | 'market.dispute'
  | 'reputation.submit'
```

---

### Token Module (`client.token`)

#### `getBalance(address: string): Promise<TokenBalance>`

CLW token balance breakdown for an address.

```ts
interface TokenBalance {
  free: bigint
  reserved: bigint
  frozen: bigint
  total: bigint        // free + reserved
  transferable: bigint // free - frozen
}
```

#### `getBalances(addresses: string[]): Promise<Map<string, TokenBalance>>`

Batch balance fetch.

#### `getTotalSupply(): Promise<bigint>`

Total CLW in existence.

#### `getMetadata(): TokenMetadata`

Returns `{ name: 'ClawChain Token', symbol: 'CLW', decimals: 18 }`.

---

## Error Handling

All SDK errors extend `ClawChainError` and include a machine-readable `code` field:

```ts
import { AgentNotFoundError, InsufficientQuotaError, ClawChainError } from '@clawchain/sdk'

try {
  const agent = await client.agent.requireAgent(agentId)
} catch (err) {
  if (err instanceof AgentNotFoundError) {
    console.error('No such agent:', err.agentId)
  } else if (err instanceof ClawChainError) {
    console.error(err.code, err.message)
  }
}
```

| Error class | Code | When |
|---|---|---|
| `ConnectionError` | `CONNECTION_ERROR` | WS connect failed |
| `ChainMismatchError` | `CHAIN_MISMATCH` | Wrong network |
| `AgentNotFoundError` | `AGENT_NOT_FOUND` | Agent ID not on-chain |
| `InsufficientQuotaError` | `INSUFFICIENT_QUOTA` | Gas quota exhausted |
| `InsufficientBalanceError` | `INSUFFICIENT_BALANCE` | Token balance too low |
| `TransactionError` | `TRANSACTION_ERROR` | Extrinsic rejected |
| `TimeoutError` | `TIMEOUT_ERROR` | RPC timed out |
| `InvalidArgumentError` | `INVALID_ARGUMENT` | Bad input |

---

## Testing Utilities

Import mocks from `@clawchain/sdk/testing` (dev/test only):

```ts
import { createMockClient, mockAgent, mockReputation } from '@clawchain/sdk/testing'

const client = createMockClient({
  agents: [mockAgent],
  reputations: { [mockAgent.owner]: mockReputation },
  quotas: { [mockAgent.owner]: { remaining: 1_000_000n, limit: 5_000_000n, ... } },
})

// Use exactly like a real ClawChainClient — no network needed
const rep = await client.reputation.getReputation(mockAgent.owner)
expect(rep?.score).toBe(8500)
```

---

## Configuration

| Environment variable | Purpose |
|---|---|
| `CLAWCHAIN_ENDPOINT` | Default node endpoint for integration tests |
| `TEST_SIGNER_MNEMONIC` | Funded keypair for integration tests |

---

## Roadmap

| Phase | Version | Status |
|---|---|---|
| Phase 1 — Read-only API | `0.1.0-alpha.1` | ✅ Current |
| Phase 2 — Write API (transactions) | `0.1.0-alpha.2` | Planned |
| Phase 3 — Market module | `0.2.0-alpha.1` | Planned |
| Phase 4 — Events & subscriptions | `0.2.0-alpha.2` | Planned |
| Phase 5 — GA stable | `0.1.0` | Planned |

---

## Contributing

See [AGENTS.md](https://github.com/clawinfra/.github/blob/main/AGENTS.md) for the ClawInfra contribution guide.

```bash
git clone https://github.com/clawinfra/clawchain-sdk
cd clawchain-sdk
pnpm install
pnpm test
pnpm run test:coverage
```

---

## License

MIT © ClawChain Contributors
