# Migration Guide: v1.x → v2.0

## Overview

ClawChain SDK v2.0 introduces signer abstraction, transaction builders, and write methods for 4 core pallets while maintaining full backward compatibility for all read operations.

## Breaking Changes

### 1. Standalone functions → Client methods

**Before (v1.x):**
```ts
import { getAgent, getBalance, connect } from 'clawchain-sdk'

const api = await connect('wss://testnet.clawchain.win:9944')
const agent = await getAgent(api, 'agent-001')
const balance = await getBalance(api, '5Grwva...')
```

**After (v2.0):**
```ts
import { ClawChainClient } from 'clawchain-sdk'

const client = await ClawChainClient.connect({
  endpoint: 'wss://testnet.clawchain.win:9944',
})
const agent = await client.agent.getAgent('agent-001')
const balance = await client.token.getBalance('5Grwva...')
```

> **Note:** All v1 read methods (`getAgent`, `getOwnerAgents`, `getBalance`, `getReputation`, `getQuota`, `resolveDid`, `listAgents`, `listReputations`) are preserved on their respective modules with identical signatures and return types.

### 2. New module: `client.did`

DID operations previously accessed via `client.agent.resolveDid()` are now also available on a dedicated `client.did` module with `resolve()`, `create()`, `update()`, and `revoke()` methods.

`client.agent.resolveDid()` still works for backward compatibility.

### 3. Signer abstraction (new)

v2.0 introduces a `ClawChainSigner` interface with three implementations:

| Signer | Use case |
|---|---|
| `KeypairSigner` | Local mnemonic/seed (dev, CLI tools) |
| `ExternalSigner` | Hardware wallets, browser extensions |
| `DelegateSigner` | On-chain delegation (agent-to-agent) |

```ts
import { KeypairSigner } from 'clawchain-sdk'

const signer = KeypairSigner.fromMnemonic('word1 word2 ...')
```

### 4. TransactionBuilder (new)

All write methods return a `TransactionBuilder<T>` with a fluent API:

```ts
// Estimate fee first
const estimate = await client.token.transfer(to, amount).dryRun(signer)

// Sign and send (waits for finalization by default)
const result = await client.token.transfer(to, amount).signAndSend(signer)

// Explicit finalization wait
const result = await client.token.transfer(to, amount).waitForFinality(signer)

// Quick send (no finalization wait)
const result = await client.token.transfer(to, amount).signAndSendNoWait(signer)
```

### 5. New write methods by pallet

| Pallet | Methods |
|---|---|
| `agent-registry` | `register()`, `update()`, `deactivate()`, `reactivate()` |
| `agent-did` | `create()`, `update()`, `revoke()` |
| `token` (balances) | `transfer()`, `transferAllowDeath()`, `transferAll()` |
| `gas-quota` | `requestQuota()`, `upgradeTier()` |

### 6. New error types

v2.0 adds granular error classes for transaction handling:

- `SignerError` — signer initialization or signing failures
- `DispatchError` — on-chain dispatch errors (decoded from metadata)
- `TxTimeoutError` — transaction finalization timeout
- `NonceTooLowError` — stale nonce

All extend the existing `ClawChainError` base class.

### 7. Batch transactions (new)

```ts
import { BatchBuilder } from 'clawchain-sdk'

const batch = new BatchBuilder(client)
batch.add(client.token.transfer(addr1, 100n))
batch.add(client.token.transfer(addr2, 200n))
const result = await batch.signAndSendAll(signer)
```

## Non-breaking additions

- `MockSigner` and `createMockSigner()` in `clawchain-sdk/testing`
- Dual CJS/ESM build output
- Full TypeScript strict mode compliance
- All public API types exported (zero `any` in public surface)

## Minimum requirements

- Node.js ≥ 18
- TypeScript ≥ 5.0 (if using types)
