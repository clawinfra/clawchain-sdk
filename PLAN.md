# ClawChain Agent SDK v2.0 — Technical Plan

> **Planner:** Alex Chen (Opus)  
> **Date:** 2026-03-09  
> **Status:** Ready for Builder  
> **Repo:** https://github.com/clawinfra/clawchain-sdk  
> **Current version:** 1.0.0 (read-only)  
> **Target version:** 2.0.0-alpha.1 → 2.0.0  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure](#2-file-structure)
3. [Interface Definitions](#3-interface-definitions)
4. [Data Models](#4-data-models)
5. [Error Handling Strategy](#5-error-handling-strategy)
6. [Module Specifications (All 12 Pallets)](#6-module-specifications)
7. [Test Plan](#7-test-plan)
8. [Phased Delivery](#8-phased-delivery)
9. [npm Publishing Workflow](#9-npm-publishing-workflow)
10. [Migration Guide (v1 → v2)](#10-migration-guide)

---

## 1. Architecture Overview

### 1.1 Design Principles

- **Tx Builder Pattern:** All write operations return a `TransactionBuilder<T>` that can be dry-run, estimated, signed, and submitted as separate steps
- **Signer Abstraction:** `ClawChainSigner` interface supports keypair, external (hardware wallet), and injected (browser extension) signers
- **Event Subscriptions:** Reactive event system using filtered subscriptions with typed event payloads
- **Zero `any`:** All codec decoding uses typed generics with runtime assertions
- **Backward Compatible Reads:** All v1 read methods remain unchanged; v2 adds write methods alongside

### 1.2 Data Flow

```
User Code
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  ClawChainClient                                     │
│  ├── .agent      → AgentModule      (read + write)  │
│  ├── .did        → DidModule        (read + write)  │  ◀── NEW: split from agent
│  ├── .token      → TokenModule      (read + write)  │
│  ├── .reputation → ReputationModule (read + write)  │
│  ├── .quota      → QuotaModule      (read + write)  │
│  ├── .taskMarket → TaskMarketModule (NEW)           │
│  ├── .serviceMarket → ServiceMarketModule (NEW)     │
│  ├── .governance → GovernanceModule (NEW)           │
│  ├── .receipts   → ReceiptsModule   (NEW)           │
│  ├── .messaging  → MessagingModule  (NEW)           │
│  ├── .rpcRegistry → RpcRegistryModule (NEW)         │
│  ├── .ibc        → IbcModule        (NEW)           │
│  ├── .events     → EventsModule     (NEW)           │
│  └── .tx         → TxBuilder        (NEW)           │
│                                                      │
│  Signer Layer:                                       │
│  ├── KeypairSigner (sr25519/ed25519 from mnemonic)  │
│  ├── ExternalSigner (callback-based)                 │
│  └── DelegateSigner (agent-to-agent delegation)      │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
              @polkadot/api (ApiPromise)
                           │
                           ▼
              wss://testnet.clawchain.win:9944
```

### 1.3 Transaction Lifecycle

```
1. Build:     client.token.transfer(to, amount)           → TransactionBuilder<TxResult>
2. Estimate:  builder.dryRun(signer)                      → DryRunResult (fee estimate, weight)
3. Sign:      builder.sign(signer)                        → SignedTransaction
4. Submit:    builder.signAndSend(signer)                 → TxResult<T>
5. Watch:     builder.signAndSend(signer, { watchStatus }) → Observable status updates
```

### 1.4 Event Subscription Flow

```
1. Subscribe:  client.events.subscribe({ pallets: ['taskMarket'] }, callback)
2. Filter:     Events are decoded and typed before delivery
3. Replay:     client.events.getHistorical({ fromBlock, toBlock, pallets })
4. Unsubscribe: unsub()  (returned from subscribe call)
```

---

## 2. File Structure

### 2.1 New Files (Builder creates these)

```
src/
├── client.ts                          # MODIFY: add new module properties + signer support
├── index.ts                           # MODIFY: re-export new modules, types, signers
├── errors.ts                          # MODIFY: add new error types
├── signer/
│   ├── index.ts                       # re-exports
│   ├── types.ts                       # ClawChainSigner interface + SignerType enum
│   ├── keypair-signer.ts              # KeypairSigner (sr25519/ed25519)
│   ├── external-signer.ts             # ExternalSigner (callback-based)
│   └── delegate-signer.ts            # DelegateSigner (agent delegation)
├── tx/
│   ├── index.ts                       # re-exports
│   ├── builder.ts                     # TransactionBuilder<T>
│   ├── batch.ts                       # BatchBuilder (utility batching)
│   └── types.ts                       # DryRunResult, SubmitOpts, TxStatus
├── events/
│   ├── index.ts                       # re-exports
│   ├── events-module.ts               # EventsModule class
│   ├── decoder.ts                     # Event type decoder (pallet→typed event)
│   └── types.ts                       # All event type definitions
├── modules/
│   ├── agent.ts                       # MODIFY: add write methods (register, update, deactivate)
│   ├── did.ts                         # NEW: split DID operations from agent
│   ├── token.ts                       # MODIFY: add transfer, transferWithNote
│   ├── reputation.ts                  # MODIFY: add submitFeedback
│   ├── quota.ts                       # MODIFY: add requestQuota, upgradeQuota
│   ├── task-market.ts                 # NEW: full task marketplace
│   ├── service-market.ts              # NEW: service listings + discovery
│   ├── governance.ts                  # NEW: quadratic governance
│   ├── receipts.ts                    # NEW: agent receipt management
│   ├── messaging.ts                   # NEW: anonymous messaging
│   ├── rpc-registry.ts               # NEW: RPC endpoint registry
│   └── ibc.ts                         # NEW: IBC-lite cross-chain
├── types/
│   ├── index.ts                       # MODIFY: re-export all new types
│   ├── agent.ts                       # existing (no changes)
│   ├── common.ts                      # existing (no changes)
│   ├── events.ts                      # MODIFY: add typed event definitions
│   ├── quota.ts                       # existing (no changes)
│   ├── reputation.ts                  # MODIFY: add SubmitFeedbackParams
│   ├── token.ts                       # existing (no changes)
│   ├── did.ts                         # NEW: DID-specific types
│   ├── task-market.ts                 # NEW
│   ├── service-market.ts              # NEW
│   ├── governance.ts                  # NEW
│   ├── receipts.ts                    # NEW
│   ├── messaging.ts                   # NEW
│   ├── rpc-registry.ts               # NEW
│   ├── ibc.ts                         # NEW
│   └── signer.ts                      # NEW (re-export from signer/types)
├── utils/
│   ├── codec.ts                       # MODIFY: add decoders for new pallets
│   ├── address.ts                     # existing (no changes)
│   ├── logger.ts                      # existing (no changes)
│   └── retry.ts                       # existing (no changes)
├── testing/
│   ├── index.ts                       # MODIFY: export new fixtures + mock-signer
│   ├── mock-api.ts                    # MODIFY: add mock tx submission
│   ├── mock-client.ts                 # MODIFY: add new modules
│   ├── mock-signer.ts                 # NEW: MockSigner for testing
│   └── fixtures/
│       ├── agents.ts                  # existing
│       ├── quota.ts                   # existing
│       ├── reputation.ts              # existing
│       ├── tasks.ts                   # NEW
│       ├── services.ts               # NEW
│       ├── governance.ts             # NEW
│       └── messaging.ts             # NEW

tests/
├── unit/
│   ├── agent.test.ts                  # MODIFY: add write op tests
│   ├── did.test.ts                    # NEW
│   ├── token.test.ts                  # MODIFY: add transfer tests
│   ├── reputation.test.ts            # MODIFY: add feedback tests
│   ├── quota.test.ts                  # MODIFY: add request tests
│   ├── task-market.test.ts            # NEW
│   ├── service-market.test.ts         # NEW
│   ├── governance.test.ts            # NEW
│   ├── receipts.test.ts              # NEW
│   ├── messaging.test.ts             # NEW
│   ├── rpc-registry.test.ts          # NEW
│   ├── ibc.test.ts                    # NEW
│   ├── signer.test.ts                # NEW
│   ├── tx-builder.test.ts            # NEW
│   ├── events.test.ts                # NEW
│   ├── client.test.ts                # existing
│   ├── errors.test.ts                # existing
│   ├── utils.test.ts                 # existing
│   ├── codec-branches.test.ts        # existing
│   └── module-branches.test.ts       # existing
├── integration/
│   ├── setup.ts                       # MODIFY: add signer setup
│   ├── agent.integration.test.ts      # existing
│   ├── token.integration.test.ts      # NEW
│   ├── task-market.integration.test.ts # NEW
│   └── governance.integration.test.ts # NEW

# Root files
MIGRATION.md                           # NEW: v1→v2 migration guide
CHANGELOG.md                           # MODIFY: add v2.0.0 entries
```

### 2.2 tsup Entry Points Update

```ts
// tsup.config.ts — add signer sub-path export
export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    target: 'node18',
  },
  {
    entry: { 'testing/index': 'src/testing/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
  },
  {
    entry: { 'signer/index': 'src/signer/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
  },
])
```

### 2.3 package.json exports update

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./testing": {
      "import": "./dist/testing/index.mjs",
      "require": "./dist/testing/index.js",
      "types": "./dist/testing/index.d.ts"
    },
    "./signer": {
      "import": "./dist/signer/index.mjs",
      "require": "./dist/signer/index.js",
      "types": "./dist/signer/index.d.ts"
    }
  }
}
```

---

## 3. Interface Definitions

### 3.1 Signer Abstraction

```ts
// src/signer/types.ts

/** Supported key types for signing */
export type KeyType = 'sr25519' | 'ed25519'

/** Signer type discriminator */
export type SignerType = 'keypair' | 'external' | 'delegate'

/**
 * Core signer interface — all signers implement this.
 * The SDK never touches private keys directly; it calls sign() on the signer.
 */
export interface ClawChainSigner {
  /** SS58 address of this signer */
  readonly address: string
  /** Signer type for debugging/logging */
  readonly type: SignerType
  /** Sign raw bytes and return the signature */
  sign(message: Uint8Array): Promise<Uint8Array>
  /** Get the public key bytes */
  getPublicKey(): Uint8Array
}

/** Options for creating a KeypairSigner */
export interface KeypairSignerOpts {
  /** BIP39 mnemonic (12 or 24 words) */
  mnemonic?: string
  /** Raw seed hex (alternative to mnemonic) */
  seed?: string
  /** Key type (default: sr25519) */
  keyType?: KeyType
  /** Derivation path (e.g. //Alice) */
  derivationPath?: string
  /** SS58 prefix (default: 42 for substrate) */
  ss58Prefix?: number
}

/** Callback for external signing (hardware wallets, browser extensions) */
export type ExternalSignFn = (message: Uint8Array) => Promise<Uint8Array>

/** Options for creating an ExternalSigner */
export interface ExternalSignerOpts {
  address: string
  publicKey: Uint8Array
  signFn: ExternalSignFn
}
```

### 3.2 Transaction Builder

```ts
// src/tx/types.ts

import type { ChainEvent, TxResult } from '../types/common.js'

/** Options for submitting a transaction */
export interface SubmitOpts {
  /** Tip to include (in CLW smallest units) */
  tip?: bigint
  /** Explicit nonce (auto-fetched if omitted) */
  nonce?: number
  /** Era — number of blocks the tx is valid for (default: mortal 64 blocks) */
  era?: number
  /** Watch for finalization (default: true) */
  waitForFinalization?: boolean
  /** Callback for status updates during submission */
  onStatusChange?: (status: TxStatus) => void
}

/** Transaction status during submission */
export type TxStatus =
  | { type: 'signed' }
  | { type: 'broadcast'; peers: number }
  | { type: 'inBlock'; blockHash: string }
  | { type: 'finalized'; blockHash: string; blockNumber: number }
  | { type: 'error'; error: string }

/** Result of a dry-run (fee estimation without submission) */
export interface DryRunResult {
  /** Whether the extrinsic would succeed */
  success: boolean
  /** Estimated fee in CLW (smallest unit) */
  estimatedFee: bigint
  /** Weight consumed */
  weight: { refTime: bigint; proofSize: bigint }
  /** Dispatch error message if success=false */
  error?: string
}

// src/tx/builder.ts — class signature

/**
 * Fluent transaction builder. Constructed by module write methods.
 *
 * @example
 * ```ts
 * const result = await client.token
 *   .transfer(to, amount)
 *   .signAndSend(signer)
 * ```
 */
export class TransactionBuilder<T = void> {
  /** @internal */
  constructor(
    api: ApiPromise,
    extrinsic: SubmittableExtrinsic<'promise'>,
    decoder?: (events: ChainEvent[]) => T,
    logger?: Logger,
  )

  /**
   * Dry-run the transaction to estimate fees without submission.
   */
  async dryRun(signer: ClawChainSigner): Promise<DryRunResult>

  /**
   * Sign the transaction (returns encoded hex, does NOT submit).
   */
  async sign(signer: ClawChainSigner, opts?: SubmitOpts): Promise<string>

  /**
   * Sign and submit the transaction, waiting for finalization.
   * @returns Transaction result with decoded pallet-specific data
   */
  async signAndSend(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<T>>

  /**
   * Sign and send, returning immediately after inclusion (not finalization).
   * Faster but less safe — block may be re-orged.
   */
  async signAndSendNoWait(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<T>>
}

// src/tx/batch.ts

/**
 * Batch multiple extrinsics into a single transaction.
 *
 * @example
 * ```ts
 * const result = await client.tx.batch()
 *   .add(client.token.transfer(addr1, 100n))
 *   .add(client.token.transfer(addr2, 200n))
 *   .signAndSend(signer)
 * ```
 */
export class BatchBuilder {
  constructor(api: ApiPromise, logger?: Logger)

  /** Add a TransactionBuilder to the batch */
  add(builder: TransactionBuilder<unknown>): BatchBuilder

  /** Sign and submit the entire batch atomically (utility.batchAll) */
  async signAndSend(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<void>>

  /** Sign and submit as best-effort batch (utility.batch — partial failures allowed) */
  async signAndSendBestEffort(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<void>>
}
```

### 3.3 Events Module

```ts
// src/events/events-module.ts

/**
 * Subscribe to real-time chain events with type-safe filtering.
 */
export class EventsModule {
  constructor(api: ApiPromise, logger: Logger)

  /**
   * Subscribe to new finalized blocks.
   */
  subscribeBlocks(callback: (block: BlockInfo) => void): Promise<Unsubscribe>

  /**
   * Subscribe to filtered events across pallets.
   *
   * @param filter - Which pallets/methods to listen for
   * @param callback - Receives typed ChainEvent objects
   * @returns Unsubscribe function
   */
  subscribe(
    filter: EventFilter,
    callback: (event: ChainEvent) => void,
  ): Promise<Unsubscribe>

  /**
   * Subscribe specifically to agent lifecycle events.
   */
  subscribeAgentEvents(
    callback: (event: AgentEvent) => void,
  ): Promise<Unsubscribe>

  /**
   * Subscribe to token transfer events.
   */
  subscribeTransfers(
    callback: (event: TransferEvent) => void,
    filter?: { from?: string; to?: string },
  ): Promise<Unsubscribe>

  /**
   * Subscribe to task market events.
   */
  subscribeTaskEvents(
    callback: (event: TaskMarketEvent) => void,
  ): Promise<Unsubscribe>

  /**
   * Subscribe to governance proposal events.
   */
  subscribeGovernanceEvents(
    callback: (event: GovernanceEvent) => void,
  ): Promise<Unsubscribe>

  /**
   * Fetch historical events from a block range.
   */
  getHistorical(filter: HistoricalEventFilter): Promise<ChainEvent[]>

  /**
   * Unsubscribe from all active subscriptions.
   */
  unsubscribeAll(): void
}
```

---

## 4. Data Models

### 4.1 DID Types (`src/types/did.ts`)

```ts
/** DID document stored on-chain */
export interface DidInfo {
  did: string
  agentId: string
  owner: string
  document: DidDocument
  createdAtBlock: number
  updatedAtBlock: number
}

/** Parameters for creating a DID */
export interface CreateDidParams {
  agentId: string
  document: DidDocument
}

/** Parameters for updating a DID document */
export interface UpdateDidParams {
  verificationMethods?: VerificationMethod[]
  services?: ServiceEndpoint[]
}
```

### 4.2 Task Market Types (`src/types/task-market.ts`)

```ts
/** Task status lifecycle */
export type TaskStatus = 'Open' | 'Assigned' | 'InProgress' | 'Completed' | 'Disputed' | 'Cancelled'

/** Task specification */
export interface TaskSpec {
  id: string
  creator: string
  title: string
  description: string
  /** Required capabilities for the assignee */
  requiredCapabilities: string[]
  /** Reward in CLW (smallest unit) */
  reward: bigint
  /** Deadline as block number */
  deadlineBlock: number
  status: TaskStatus
  assignee?: string
  /** IPFS CID for detailed task specification */
  specCid?: string
  createdAtBlock: number
  updatedAtBlock: number
}

/** Parameters for creating a task */
export interface CreateTaskParams {
  title: string
  description: string
  requiredCapabilities?: string[]
  reward: bigint
  /** Number of blocks from now until deadline */
  deadlineBlocks: number
  specCid?: string
}

/** Parameters for bidding on a task */
export interface TaskBidParams {
  taskId: string
  /** Proposed reward (can be ≤ original reward) */
  proposedReward?: bigint
  /** Message to the task creator */
  message?: string
}

/** A bid on a task */
export interface TaskBid {
  taskId: string
  bidder: string
  proposedReward: bigint
  message: string
  createdAtBlock: number
}

/** Parameters for completing a task */
export interface CompleteTaskParams {
  taskId: string
  /** IPFS CID of deliverable */
  deliverableCid: string
  /** Proof of work (hash or URL) */
  proof?: string
}

/** Parameters for disputing a task */
export interface DisputeTaskParams {
  taskId: string
  reason: string
  evidenceCid?: string
}

/** Task market event types */
export interface TaskMarketEvent extends ChainEvent {
  taskId: string
  eventType: 'Created' | 'BidPlaced' | 'Assigned' | 'Completed' | 'Disputed' | 'Cancelled'
}

/** Filter for task queries */
export interface TaskFilter {
  status?: TaskStatus
  creator?: string
  assignee?: string
  minReward?: bigint
  maxReward?: bigint
  capability?: string
}
```

### 4.3 Service Market Types (`src/types/service-market.ts`)

```ts
/** Service status */
export type ServiceStatus = 'Active' | 'Paused' | 'Retired'

/** Pricing model */
export type PricingModel =
  | { type: 'perCall'; pricePerCall: bigint }
  | { type: 'subscription'; pricePerBlock: bigint; minBlocks: number }
  | { type: 'negotiable' }

/** Service listing */
export interface ServiceListing {
  id: string
  provider: string
  name: string
  description: string
  /** API endpoint URL */
  endpoint: string
  capabilities: string[]
  pricing: PricingModel
  status: ServiceStatus
  /** Average reputation from consumers */
  averageRating: number
  totalConsumers: number
  createdAtBlock: number
  updatedAtBlock: number
}

/** Parameters for creating a service listing */
export interface CreateServiceParams {
  name: string
  description: string
  endpoint: string
  capabilities?: string[]
  pricing: PricingModel
}

/** Parameters for updating a service listing */
export interface UpdateServiceParams {
  name?: string
  description?: string
  endpoint?: string
  capabilities?: string[]
  pricing?: PricingModel
}

/** Service discovery filter */
export interface ServiceFilter {
  capability?: string
  status?: ServiceStatus
  provider?: string
  maxPricePerCall?: bigint
  minRating?: number
}
```

### 4.4 Governance Types (`src/types/governance.ts`)

```ts
/** Proposal status */
export type ProposalStatus = 'Pending' | 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Vetoed'

/** Vote direction */
export type VoteDirection = 'Aye' | 'Nay' | 'Abstain'

/** Governance proposal */
export interface GovernanceProposal {
  id: number
  proposer: string
  title: string
  description: string
  /** Encoded call data to execute if passed */
  callData?: string
  /** IPFS CID for detailed proposal */
  proposalCid?: string
  status: ProposalStatus
  /** Quadratic vote tally */
  ayeVotes: bigint
  nayVotes: bigint
  abstainVotes: bigint
  /** Block when voting ends */
  votingEndBlock: number
  /** Block when proposal was created */
  createdAtBlock: number
  executedAtBlock?: number
}

/** Parameters for creating a proposal */
export interface CreateProposalParams {
  title: string
  description: string
  callData?: string
  proposalCid?: string
  /** Duration in blocks for voting period */
  votingPeriodBlocks: number
}

/** Parameters for casting a vote */
export interface CastVoteParams {
  proposalId: number
  direction: VoteDirection
  /** Amount of tokens to lock for quadratic voting weight */
  conviction: bigint
}

/** Individual vote record */
export interface VoteRecord {
  voter: string
  proposalId: number
  direction: VoteDirection
  conviction: bigint
  /** Quadratic weight = sqrt(conviction) */
  weight: bigint
  blockNumber: number
}

/** Governance event types */
export interface GovernanceEvent extends ChainEvent {
  proposalId: number
  eventType: 'Created' | 'VoteCast' | 'Passed' | 'Rejected' | 'Executed' | 'Vetoed'
}
```

### 4.5 Receipts Types (`src/types/receipts.ts`)

```ts
/** Agent receipt — proof of work performed */
export interface AgentReceipt {
  id: string
  issuer: string
  receiver: string
  /** What service/task this receipt is for */
  taskId?: string
  serviceId?: string
  /** IPFS CID of the proof/deliverable */
  proofCid: string
  /** Amount paid (CLW smallest unit) */
  amount: bigint
  /** Timestamp as block number */
  blockNumber: number
  /** Cryptographic signature of receipt data */
  signature: string
}

/** Parameters for issuing a receipt */
export interface IssueReceiptParams {
  receiver: string
  taskId?: string
  serviceId?: string
  proofCid: string
  amount: bigint
}

/** Filter for receipt queries */
export interface ReceiptFilter {
  issuer?: string
  receiver?: string
  taskId?: string
  serviceId?: string
  fromBlock?: number
  toBlock?: number
}
```

### 4.6 Messaging Types (`src/types/messaging.ts`)

```ts
/** Encrypted anonymous message */
export interface AnonMessage {
  id: string
  /** Sender's ephemeral public key (for reply) */
  senderEphemeralPubkey: string
  /** Recipient agent DID or address */
  recipient: string
  /** NaCl box-encrypted payload (base64) */
  encryptedPayload: string
  /** Block number when posted */
  blockNumber: number
  /** TTL in blocks (message expires after) */
  expiresAtBlock: number
}

/** Parameters for sending an anonymous message */
export interface SendMessageParams {
  recipient: string
  /** Plaintext payload (will be encrypted by SDK) */
  payload: string
  /** TTL in blocks (default: 100) */
  ttlBlocks?: number
}

/** Parameters for reading messages */
export interface ReadMessagesParams {
  /** Recipient address to query */
  recipient: string
  /** Only messages after this block */
  sinceBlock?: number
  limit?: number
}
```

### 4.7 RPC Registry Types (`src/types/rpc-registry.ts`)

```ts
/** RPC endpoint entry */
export interface RpcEndpoint {
  id: string
  provider: string
  url: string
  /** Chain ID this endpoint serves */
  chainId: string
  /** Is this a public endpoint? */
  isPublic: boolean
  /** Geographic region hint */
  region?: string
  /** Health status */
  status: 'Online' | 'Offline' | 'Degraded'
  registeredAtBlock: number
}

/** Parameters for registering an RPC endpoint */
export interface RegisterRpcParams {
  url: string
  chainId: string
  isPublic?: boolean
  region?: string
}

/** Filter for RPC discovery */
export interface RpcFilter {
  chainId?: string
  isPublic?: boolean
  region?: string
  status?: 'Online' | 'Offline' | 'Degraded'
}
```

### 4.8 IBC Types (`src/types/ibc.ts`)

```ts
/** IBC channel state */
export type ChannelState = 'Init' | 'TryOpen' | 'Open' | 'Closed'

/** IBC channel info */
export interface IbcChannel {
  channelId: string
  portId: string
  counterpartyChannelId: string
  counterpartyPortId: string
  state: ChannelState
  connectionId: string
}

/** IBC packet */
export interface IbcPacket {
  sequence: bigint
  sourcePort: string
  sourceChannel: string
  destinationPort: string
  destinationChannel: string
  data: Uint8Array
  timeoutHeight: number
  timeoutTimestamp: bigint
}

/** Parameters for sending an IBC transfer */
export interface IbcTransferParams {
  /** Destination chain channel */
  channelId: string
  /** Recipient on destination chain */
  receiver: string
  /** Amount to transfer */
  amount: bigint
  /** Denom (default: CLW) */
  denom?: string
  /** Timeout in blocks on source chain */
  timeoutBlocks?: number
}

/** IBC channel query filter */
export interface IbcChannelFilter {
  state?: ChannelState
  portId?: string
}
```

### 4.9 Reputation Extension (`src/types/reputation.ts` — additions)

```ts
/** Parameters for submitting feedback/attestation */
export interface SubmitFeedbackParams {
  /** Target agent or account */
  target: string
  /** Positive or negative */
  isPositive: boolean
  /** Interaction reference (task ID, service ID, etc.) */
  referenceId?: string
  /** Optional comment (stored as hash) */
  commentHash?: string
}
```

---

## 5. Error Handling Strategy

### 5.1 Error Hierarchy (additions to existing `src/errors.ts`)

```ts
// Add to existing error hierarchy:

/** Signer-related errors */
export class SignerError extends ClawChainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SIGNER_ERROR', cause)
    this.name = 'SignerError'
  }
}

/** Transaction was submitted but dispatch failed on-chain */
export class DispatchError extends TransactionError {
  readonly module: string
  readonly errorName: string

  constructor(module: string, errorName: string, details: string, dispatchError?: unknown) {
    super(`${module}.${errorName}: ${details}`, dispatchError)
    this.name = 'DispatchError'
    this.module = module
    this.errorName = errorName
  }
}

/** Transaction timed out waiting for finalization */
export class TxTimeoutError extends TransactionError {
  constructor(txHash: string, timeoutMs: number) {
    super(`Transaction ${txHash} not finalized within ${timeoutMs}ms`)
    this.name = 'TxTimeoutError'
  }
}

/** Nonce collision / already-used nonce */
export class NonceTooLowError extends TransactionError {
  readonly expectedNonce: number
  readonly actualNonce: number

  constructor(expected: number, actual: number) {
    super(`Nonce too low: expected >= ${expected}, got ${actual}`)
    this.name = 'NonceTooLowError'
    this.expectedNonce = expected
    this.actualNonce = actual
  }
}

/** Task market specific errors */
export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: string) {
    super('Task', taskId)
    this.name = 'TaskNotFoundError'
  }
}

/** Service not found */
export class ServiceNotFoundError extends NotFoundError {
  constructor(serviceId: string) {
    super('Service', serviceId)
    this.name = 'ServiceNotFoundError'
  }
}

/** Proposal not found */
export class ProposalNotFoundError extends NotFoundError {
  constructor(proposalId: number) {
    super('Proposal', String(proposalId))
    this.name = 'ProposalNotFoundError'
  }
}

/** IBC channel error */
export class IbcError extends ClawChainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'IBC_ERROR', cause)
    this.name = 'IbcError'
  }
}

/** Messaging error */
export class MessagingError extends ClawChainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'MESSAGING_ERROR', cause)
    this.name = 'MessagingError'
  }
}

/** Emergency pause is active — all writes blocked */
export class EmergencyPauseError extends ClawChainError {
  constructor() {
    super('Chain is in emergency pause mode — write operations are blocked', 'EMERGENCY_PAUSE')
    this.name = 'EmergencyPauseError'
  }
}
```

### 5.2 Error Decoding Strategy

The `TransactionBuilder` must decode Substrate `DispatchError` into typed SDK errors:

```ts
// In tx/builder.ts — internal helper

function decodeDispatchError(api: ApiPromise, dispatchError: DispatchError): ClawChainError {
  if (dispatchError.isModule) {
    const decoded = api.registry.findMetaError(dispatchError.asModule)
    const { section, name, docs } = decoded

    // Map known pallet errors to SDK error types
    switch (`${section}.${name}`) {
      case 'agentRegistry.AgentNotFound':
        return new AgentNotFoundError(/* extract from events */)
      case 'balances.InsufficientBalance':
        return new InsufficientBalanceError(/* extract */)
      case 'gasQuota.InsufficientQuota':
        return new InsufficientQuotaError(/* extract */)
      case 'system.EmergencyPause':
        return new EmergencyPauseError()
      default:
        return new DispatchError(section, name, docs.join(' '), dispatchError)
    }
  }
  return new TransactionError('Unknown dispatch error', dispatchError)
}
```

---

## 6. Module Specifications

### 6.1 AgentModule (MODIFY — add write methods)

Keep all existing read methods unchanged. Add:

```ts
// In src/modules/agent.ts — new methods

/**
 * Register a new agent on-chain.
 * Pallet call: agentRegistry.registerAgent(name, description, endpoint, capabilities)
 *
 * @returns TransactionBuilder that resolves to TxResult<AgentInfo> on success
 */
register(params: RegisterAgentParams): TransactionBuilder<AgentInfo>

/**
 * Update an existing agent's metadata.
 * Pallet call: agentRegistry.updateAgent(agentId, name?, description?, endpoint?, capabilities?)
 */
update(agentId: AgentId, params: UpdateAgentParams): TransactionBuilder<void>

/**
 * Deactivate an agent (soft-delete, reversible).
 * Pallet call: agentRegistry.deactivateAgent(agentId)
 */
deactivate(agentId: AgentId): TransactionBuilder<void>

/**
 * Reactivate a previously deactivated agent.
 * Pallet call: agentRegistry.reactivateAgent(agentId)
 */
reactivate(agentId: AgentId): TransactionBuilder<void>
```

### 6.2 DidModule (NEW — split from AgentModule)

```ts
// src/modules/did.ts

export class DidModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  /** Resolve DID string to DidInfo */
  async resolve(did: string): Promise<DidInfo | null>

  /** Get DID document for an agent */
  async getByAgentId(agentId: AgentId): Promise<DidInfo | null>

  /** List all DIDs owned by an address */
  async listByOwner(owner: string, opts?: PaginationOpts): Promise<PagedResult<DidInfo>>

  // ── Writes ──

  /** Create a DID for an agent.
   * Pallet call: agentDid.createDid(agentId, document) */
  create(params: CreateDidParams): TransactionBuilder<DidInfo>

  /** Update a DID document.
   * Pallet call: agentDid.updateDid(did, verificationMethods?, services?) */
  update(did: string, params: UpdateDidParams): TransactionBuilder<void>

  /** Revoke a DID.
   * Pallet call: agentDid.revokeDid(did) */
  revoke(did: string): TransactionBuilder<void>
}
```

### 6.3 TokenModule (MODIFY — add write methods)

Keep existing reads. Add:

```ts
/**
 * Transfer CLW tokens.
 * Pallet call: balances.transferKeepAlive(to, amount)
 */
transfer(to: string, amount: bigint): TransactionBuilder<void>

/**
 * Transfer with existential deposit check removed (can kill sender account).
 * Pallet call: balances.transferAllowDeath(to, amount)
 */
transferAllowDeath(to: string, amount: bigint): TransactionBuilder<void>

/**
 * Transfer all free balance (minus existential deposit).
 * Pallet call: balances.transferAll(to, keepAlive)
 */
transferAll(to: string, keepAlive?: boolean): TransactionBuilder<void>
```

### 6.4 ReputationModule (MODIFY — add write)

Add:

```ts
/**
 * Submit feedback / attestation for an agent.
 * Pallet call: reputation.submitFeedback(target, isPositive, referenceId?, commentHash?)
 */
submitFeedback(params: SubmitFeedbackParams): TransactionBuilder<void>
```

### 6.5 QuotaModule (MODIFY — add write)

Add:

```ts
/**
 * Request additional gas quota (may require CLW payment).
 * Pallet call: gasQuota.requestQuota(amount)
 */
requestQuota(amount: bigint): TransactionBuilder<void>

/**
 * Upgrade quota tier.
 * Pallet call: gasQuota.upgradeTier(tier)
 */
upgradeTier(tier: QuotaTier): TransactionBuilder<void>
```

### 6.6 TaskMarketModule (NEW)

```ts
// src/modules/task-market.ts

export class TaskMarketModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  /** Get a task by ID */
  async getTask(taskId: string): Promise<TaskSpec | null>

  /** Get task, throw if not found */
  async requireTask(taskId: string): Promise<TaskSpec>

  /** List tasks with optional filters */
  async listTasks(filter?: TaskFilter, opts?: PaginationOpts): Promise<PagedResult<TaskSpec>>

  /** List open tasks matching a capability */
  async findByCapability(capability: string, opts?: PaginationOpts): Promise<PagedResult<TaskSpec>>

  /** Get all bids for a task */
  async getBids(taskId: string): Promise<TaskBid[]>

  /** Get tasks created by an address */
  async getCreatorTasks(creator: string, opts?: PaginationOpts): Promise<PagedResult<TaskSpec>>

  /** Get tasks assigned to an address */
  async getAssigneeTasks(assignee: string, opts?: PaginationOpts): Promise<PagedResult<TaskSpec>>

  // ── Writes ──

  /** Create a new task.
   * Pallet call: taskMarket.createTask(title, description, capabilities, reward, deadlineBlocks, specCid?)
   * Reward is escrowed from creator's balance. */
  createTask(params: CreateTaskParams): TransactionBuilder<TaskSpec>

  /** Place a bid on an open task.
   * Pallet call: taskMarket.placeBid(taskId, proposedReward?, message?) */
  placeBid(params: TaskBidParams): TransactionBuilder<void>

  /** Accept a bid and assign the task.
   * Pallet call: taskMarket.acceptBid(taskId, bidder) */
  acceptBid(taskId: string, bidder: string): TransactionBuilder<void>

  /** Submit task completion (assignee calls this).
   * Pallet call: taskMarket.completeTask(taskId, deliverableCid, proof?) */
  completeTask(params: CompleteTaskParams): TransactionBuilder<void>

  /** Approve completion and release escrow (creator calls this).
   * Pallet call: taskMarket.approveCompletion(taskId) */
  approveCompletion(taskId: string): TransactionBuilder<void>

  /** Dispute a task.
   * Pallet call: taskMarket.disputeTask(taskId, reason, evidenceCid?) */
  disputeTask(params: DisputeTaskParams): TransactionBuilder<void>

  /** Cancel an open task (creator only, before assignment).
   * Pallet call: taskMarket.cancelTask(taskId) */
  cancelTask(taskId: string): TransactionBuilder<void>
}
```

### 6.7 ServiceMarketModule (NEW)

```ts
// src/modules/service-market.ts

export class ServiceMarketModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  async getService(serviceId: string): Promise<ServiceListing | null>
  async requireService(serviceId: string): Promise<ServiceListing>
  async listServices(filter?: ServiceFilter, opts?: PaginationOpts): Promise<PagedResult<ServiceListing>>
  async findByCapability(capability: string, opts?: PaginationOpts): Promise<PagedResult<ServiceListing>>
  async getProviderServices(provider: string, opts?: PaginationOpts): Promise<PagedResult<ServiceListing>>

  // ── Writes ──

  /** Register a service listing.
   * Pallet call: serviceMarket.registerService(name, description, endpoint, capabilities, pricing) */
  registerService(params: CreateServiceParams): TransactionBuilder<ServiceListing>

  /** Update a service listing.
   * Pallet call: serviceMarket.updateService(serviceId, ...) */
  updateService(serviceId: string, params: UpdateServiceParams): TransactionBuilder<void>

  /** Pause a service (provider only).
   * Pallet call: serviceMarket.pauseService(serviceId) */
  pauseService(serviceId: string): TransactionBuilder<void>

  /** Resume a paused service.
   * Pallet call: serviceMarket.resumeService(serviceId) */
  resumeService(serviceId: string): TransactionBuilder<void>

  /** Retire a service (permanent).
   * Pallet call: serviceMarket.retireService(serviceId) */
  retireService(serviceId: string): TransactionBuilder<void>
}
```

### 6.8 GovernanceModule (NEW)

```ts
// src/modules/governance.ts

export class GovernanceModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  async getProposal(proposalId: number): Promise<GovernanceProposal | null>
  async requireProposal(proposalId: number): Promise<GovernanceProposal>
  async listProposals(status?: ProposalStatus, opts?: PaginationOpts): Promise<PagedResult<GovernanceProposal>>
  async getVotes(proposalId: number, opts?: PaginationOpts): Promise<PagedResult<VoteRecord>>
  async getVoterHistory(voter: string, opts?: PaginationOpts): Promise<PagedResult<VoteRecord>>

  // ── Writes ──

  /** Create a governance proposal.
   * Pallet call: quadraticGovernance.propose(title, description, callData?, proposalCid?, votingPeriodBlocks) */
  propose(params: CreateProposalParams): TransactionBuilder<GovernanceProposal>

  /** Cast a vote (quadratic voting — weight = sqrt(conviction)).
   * Pallet call: quadraticGovernance.vote(proposalId, direction, conviction) */
  vote(params: CastVoteParams): TransactionBuilder<void>

  /** Execute a passed proposal (permissionless — anyone can trigger after passing).
   * Pallet call: quadraticGovernance.execute(proposalId) */
  execute(proposalId: number): TransactionBuilder<void>

  /** Veto a proposal (requires special privileges).
   * Pallet call: quadraticGovernance.veto(proposalId) */
  veto(proposalId: number): TransactionBuilder<void>
}
```

### 6.9 ReceiptsModule (NEW)

```ts
// src/modules/receipts.ts

export class ReceiptsModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  async getReceipt(receiptId: string): Promise<AgentReceipt | null>
  async listByIssuer(issuer: string, opts?: PaginationOpts): Promise<PagedResult<AgentReceipt>>
  async listByReceiver(receiver: string, opts?: PaginationOpts): Promise<PagedResult<AgentReceipt>>
  async listByTask(taskId: string): Promise<AgentReceipt[]>
  async listByService(serviceId: string, opts?: PaginationOpts): Promise<PagedResult<AgentReceipt>>

  // ── Writes ──

  /** Issue a receipt for completed work.
   * Pallet call: agentReceipts.issueReceipt(receiver, taskId?, serviceId?, proofCid, amount) */
  issueReceipt(params: IssueReceiptParams): TransactionBuilder<AgentReceipt>
}
```

### 6.10 MessagingModule (NEW)

```ts
// src/modules/messaging.ts

export class MessagingModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  /** Get messages for a recipient (decryption is caller's responsibility) */
  async getMessages(params: ReadMessagesParams): Promise<AnonMessage[]>

  /** Get a single message by ID */
  async getMessage(messageId: string): Promise<AnonMessage | null>

  /** Count unread messages for a recipient since a given block */
  async countMessages(recipient: string, sinceBlock?: number): Promise<number>

  // ── Writes ──

  /** Send an anonymous encrypted message.
   * Pallet call: anonMessaging.sendMessage(recipient, encryptedPayload, ttlBlocks)
   * NOTE: Encryption is handled by the SDK before submission using the
   * recipient's public key and an ephemeral keypair (NaCl box). */
  sendMessage(params: SendMessageParams): TransactionBuilder<AnonMessage>
}
```

### 6.11 RpcRegistryModule (NEW)

```ts
// src/modules/rpc-registry.ts

export class RpcRegistryModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  async getEndpoint(endpointId: string): Promise<RpcEndpoint | null>
  async listEndpoints(filter?: RpcFilter, opts?: PaginationOpts): Promise<PagedResult<RpcEndpoint>>
  async getProviderEndpoints(provider: string): Promise<RpcEndpoint[]>

  // ── Writes ──

  /** Register an RPC endpoint.
   * Pallet call: rpcRegistry.registerEndpoint(url, chainId, isPublic, region?) */
  registerEndpoint(params: RegisterRpcParams): TransactionBuilder<RpcEndpoint>

  /** Update endpoint status.
   * Pallet call: rpcRegistry.updateStatus(endpointId, status) */
  updateStatus(endpointId: string, status: 'Online' | 'Offline' | 'Degraded'): TransactionBuilder<void>

  /** Deregister an endpoint.
   * Pallet call: rpcRegistry.deregisterEndpoint(endpointId) */
  deregisterEndpoint(endpointId: string): TransactionBuilder<void>
}
```

### 6.12 IbcModule (NEW)

```ts
// src/modules/ibc.ts

export class IbcModule {
  constructor(api: ApiPromise, logger: Logger)

  // ── Reads ──

  async getChannel(channelId: string): Promise<IbcChannel | null>
  async listChannels(filter?: IbcChannelFilter): Promise<IbcChannel[]>
  async getPacket(channelId: string, sequence: bigint): Promise<IbcPacket | null>

  // ── Writes ──

  /** Send an IBC token transfer to another chain.
   * Pallet call: ibcLite.transfer(channelId, receiver, amount, denom?, timeoutBlocks?) */
  transfer(params: IbcTransferParams): TransactionBuilder<void>
}
```

### 6.13 ClawChainClient Updates

```ts
// Additions to src/client.ts

export interface ConnectOptions {
  // ... existing fields ...
  /** Default signer for convenience (optional — can pass per-tx) */
  signer?: ClawChainSigner
  /** Expected genesis hash — rejects connection if mismatched */
  genesisHash?: string
}

export class ClawChainClient {
  // ... existing properties ...

  /** DID module (split from agent in v2) */
  readonly did: DidModule
  /** Task market module */
  readonly taskMarket: TaskMarketModule
  /** Service market module */
  readonly serviceMarket: ServiceMarketModule
  /** Quadratic governance module */
  readonly governance: GovernanceModule
  /** Agent receipts module */
  readonly receipts: ReceiptsModule
  /** Anonymous messaging module */
  readonly messaging: MessagingModule
  /** RPC endpoint registry module */
  readonly rpcRegistry: RpcRegistryModule
  /** IBC-lite cross-chain module */
  readonly ibc: IbcModule
  /** Event subscription module */
  readonly events: EventsModule
  /** Transaction batching utility */
  readonly tx: { batch(): BatchBuilder }

  /**
   * Check if the chain is in emergency pause mode.
   * Storage: emergencyPause.isPaused or system sudo pallet flag
   */
  async isEmergencyPaused(): Promise<boolean>
}
```

---

## 7. Test Plan

### 7.1 Testing Strategy

| Layer | Tool | What | Coverage Target |
|-------|------|------|-----------------|
| Unit | Vitest + mock-api | Each module method, tx builder, signer, event decoder | ≥90% lines/branches/functions |
| Integration | Vitest + real node | End-to-end flows against `wss://testnet.clawchain.win:9944` | Key flows only |
| Type Safety | `tsc --noEmit` | Zero type errors under strict mode | 100% |

### 7.2 Unit Test Structure

Each module test file follows this pattern:

```ts
// tests/unit/task-market.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskMarketModule } from '../../src/modules/task-market.js'
import { createMockApi } from '../../src/testing/mock-api.js'
import { createMockSigner } from '../../src/testing/mock-signer.js'
import { MOCK_TASKS } from '../../src/testing/fixtures/tasks.js'

describe('TaskMarketModule', () => {
  let api: ReturnType<typeof createMockApi>
  let module: TaskMarketModule

  beforeEach(() => {
    api = createMockApi()
    module = new TaskMarketModule(api as any, noopLogger)
  })

  describe('reads', () => {
    it('getTask returns TaskSpec for existing task', async () => { ... })
    it('getTask returns null for non-existent task', async () => { ... })
    it('requireTask throws TaskNotFoundError', async () => { ... })
    it('listTasks respects pagination', async () => { ... })
    it('listTasks filters by status', async () => { ... })
    it('findByCapability filters correctly', async () => { ... })
    it('getBids returns all bids for a task', async () => { ... })
  })

  describe('writes', () => {
    it('createTask returns TransactionBuilder', () => { ... })
    it('createTask.signAndSend submits correct extrinsic', async () => { ... })
    it('createTask validates reward > 0', () => { ... })
    it('placeBid validates taskId', () => { ... })
    it('acceptBid constructs correct call', () => { ... })
    it('completeTask requires deliverableCid', () => { ... })
    it('cancelTask only works on Open status', async () => { ... })
  })
})
```

### 7.3 Signer Tests

```ts
// tests/unit/signer.test.ts

describe('KeypairSigner', () => {
  it('creates from mnemonic (sr25519)', () => { ... })
  it('creates from mnemonic (ed25519)', () => { ... })
  it('creates from seed hex', () => { ... })
  it('derives with path', () => { ... })
  it('sign returns valid signature', async () => { ... })
  it('address matches expected SS58', () => { ... })
  it('rejects invalid mnemonic', () => { ... })
  it('rejects empty seed', () => { ... })
})

describe('ExternalSigner', () => {
  it('delegates signing to callback', async () => { ... })
  it('throws SignerError on callback failure', async () => { ... })
})
```

### 7.4 TransactionBuilder Tests

```ts
// tests/unit/tx-builder.test.ts

describe('TransactionBuilder', () => {
  it('dryRun returns fee estimate', async () => { ... })
  it('sign returns hex-encoded signed tx', async () => { ... })
  it('signAndSend waits for finalization', async () => { ... })
  it('signAndSendNoWait returns after inBlock', async () => { ... })
  it('decodes DispatchError into typed SDK error', async () => { ... })
  it('emits status callbacks', async () => { ... })
  it('respects nonce override', async () => { ... })
  it('respects tip', async () => { ... })
  it('times out after configured timeout', async () => { ... })
})

describe('BatchBuilder', () => {
  it('batches multiple extrinsics into batchAll', async () => { ... })
  it('bestEffort uses batch (not batchAll)', async () => { ... })
  it('rejects empty batch', () => { ... })
})
```

### 7.5 Events Tests

```ts
// tests/unit/events.test.ts

describe('EventsModule', () => {
  it('subscribe filters by pallet', async () => { ... })
  it('subscribe filters by method', async () => { ... })
  it('subscribeBlocks delivers BlockInfo', async () => { ... })
  it('subscribeAgentEvents decodes AgentEvent', async () => { ... })
  it('subscribeTransfers filters by from/to', async () => { ... })
  it('getHistorical fetches block range', async () => { ... })
  it('unsubscribeAll cleans up', async () => { ... })
})
```

### 7.6 Mock Signer for Testing

```ts
// src/testing/mock-signer.ts

/**
 * Mock signer for unit tests — produces deterministic signatures.
 * Exported from @clawchain/sdk/testing for consumer use.
 */
export class MockSigner implements ClawChainSigner {
  readonly address: string
  readonly type: SignerType = 'keypair'

  constructor(address?: string)

  async sign(message: Uint8Array): Promise<Uint8Array>
  getPublicKey(): Uint8Array
}

export function createMockSigner(address?: string): MockSigner
```

### 7.7 Mock API Enhancements

The existing `createMockApi()` needs extension to support:
- `api.tx.<pallet>.<method>()` returning mock submittable extrinsics
- Mock extrinsic `.signAndSend()` that fires status/event callbacks
- Mock `api.rpc.payment.queryFeeDetails()` for dry-run

### 7.8 Integration Tests

Run nightly against `wss://testnet.clawchain.win:9944`:

```ts
// tests/integration/setup.ts — additions

export function getTestSigner(): ClawChainSigner {
  const mnemonic = process.env['TEST_SIGNER_MNEMONIC']
  if (!mnemonic) throw new Error('TEST_SIGNER_MNEMONIC required')
  return new KeypairSigner({ mnemonic })
}
```

Integration test flows:
1. **Agent lifecycle:** register → update → deactivate → reactivate → verify on-chain
2. **Token transfer:** check balance → transfer → verify recipient balance
3. **Task market flow:** create task → bid → accept → complete → approve → check receipt
4. **Governance flow:** propose → vote → check tally

### 7.9 Coverage Configuration

```ts
// vitest.config.ts — updated
coverage: {
  thresholds: {
    lines: 90,
    branches: 90,
    functions: 90,
    statements: 90,
  },
  exclude: [
    'src/testing/**',
    'src/types/**',        // Pure type declarations
    'src/utils/logger.ts',
    'src/index.ts',        // Re-exports only
    'tests/**',
  ],
  // NOTE: src/client.ts is no longer excluded — constructor and module
  // wiring are testable with mock api
}
```

---

## 8. Phased Delivery

### Phase 1: Signing + Core Writes (Files: 18 new, 6 modified)

**Scope:**
1. Signer abstraction (`src/signer/*`)
2. TransactionBuilder + BatchBuilder (`src/tx/*`)
3. Write methods for existing modules:
   - `agent.register()`, `agent.update()`, `agent.deactivate()`, `agent.reactivate()`
   - `token.transfer()`, `token.transferAllowDeath()`, `token.transferAll()`
   - `reputation.submitFeedback()`
   - `quota.requestQuota()`, `quota.upgradeTier()`
4. DidModule (split from AgentModule)
5. New error types
6. MockSigner + mock tx support in testing
7. Unit tests for all above (≥90% coverage on new code)

**Exit criteria:**
- `pnpm test:coverage` passes with ≥90%
- `pnpm typecheck` clean
- `pnpm lint` clean
- Publish `v2.0.0-alpha.1` to npm

### Phase 2: Markets + Events (Files: 10 new, 4 modified)

**Scope:**
1. TaskMarketModule (full CRUD)
2. ServiceMarketModule (full CRUD)
3. ReceiptsModule
4. EventsModule (subscriptions + historical)
5. Event decoder (`src/events/decoder.ts`)
6. New types + fixtures
7. Unit tests for all above

**Exit criteria:**
- All Phase 1 criteria still pass
- New module coverage ≥90%
- Publish `v2.0.0-alpha.2`

### Phase 3: Governance + IBC + Polish (Files: 8 new, 4 modified)

**Scope:**
1. GovernanceModule (quadratic voting)
2. MessagingModule (anonymous encrypted)
3. RpcRegistryModule
4. IbcModule
5. `client.isEmergencyPaused()`
6. Integration tests
7. MIGRATION.md
8. README.md update
9. CHANGELOG.md update

**Exit criteria:**
- Full test suite green
- Overall coverage ≥90%
- `pnpm build` produces clean CJS+ESM
- `tsc --noEmit` clean
- Publish `v2.0.0-rc.1` → `v2.0.0`

---

## 9. npm Publishing Workflow

### 9.1 Version Strategy

```
v2.0.0-alpha.1  ←  Phase 1 complete (signer + core writes)
v2.0.0-alpha.2  ←  Phase 2 complete (markets + events)
v2.0.0-rc.1     ←  Phase 3 complete, pending final review
v2.0.0          ←  Stable release
```

### 9.2 Existing CI Workflow

The existing `.github/workflows/publish.yml` triggers on `v*` tags. It needs one update:

```yaml
# Add provenance for npm audit trail
- run: pnpm publish --access public --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 9.3 Pre-publish Checklist (automated in prepublishOnly)

```json
{
  "scripts": {
    "prepublishOnly": "pnpm run build && pnpm run typecheck && pnpm run lint && pnpm run test:coverage"
  }
}
```

### 9.4 Tag and Publish Flow

```bash
# Phase 1
npm version 2.0.0-alpha.1 --no-git-tag-version
git add -A && git commit -m "chore: v2.0.0-alpha.1"
git tag v2.0.0-alpha.1
git push origin main --tags
# CI publishes to npm with --tag alpha

# Phase 3 final
npm version 2.0.0
git add -A && git commit -m "chore: v2.0.0"
git tag v2.0.0
git push origin main --tags
# CI publishes to npm with --tag latest
```

---

## 10. Migration Guide

Create `MIGRATION.md` at repo root:

### Breaking Changes (v1.0.0 → v2.0.0)

1. **`agent.resolveDid()` moved to `did.resolve()`**
   ```ts
   // v1
   const info = await client.agent.resolveDid('did:clawchain:abc')

   // v2
   const info = await client.did.resolve('did:clawchain:abc')
   // agent.resolveDid still works but is deprecated (logs warning)
   ```

2. **Phase 2 stub methods now work (no longer throw)**
   ```ts
   // v1: throws "available in Phase 2"
   await client.agent.register(params, signer)

   // v2: returns TransactionBuilder
   const result = await client.agent.register(params).signAndSend(signer)
   ```

3. **Signer is no longer passed as `unknown`**
   ```ts
   // v1 stubs accepted unknown
   register(_params: RegisterAgentParams, _signer: unknown)

   // v2 uses typed ClawChainSigner
   register(params: RegisterAgentParams): TransactionBuilder<AgentInfo>
   // Signer is passed to .signAndSend() instead
   ```

4. **New peer dependency: `@polkadot/keyring` (already in v1 deps, but now required)**
   - KeypairSigner uses `@polkadot/keyring` for key derivation
   - This was already a dependency in v1 but unused; now it's actively used

5. **New export paths**
   ```ts
   import { KeypairSigner } from '@clawchain/sdk/signer'
   // or from main entry:
   import { KeypairSigner } from '@clawchain/sdk'
   ```

### Non-Breaking Additions
- All read-only methods unchanged
- All existing types unchanged
- All existing error classes unchanged
- New modules accessible as `client.taskMarket`, `client.serviceMarket`, etc.
- New `client.events` for subscriptions
- New `client.tx.batch()` for batching

---

## Appendix: Codec Decoders to Add

Add to `src/utils/codec.ts`:

```ts
export function decodeTaskSpec(taskId: string, raw: unknown): TaskSpec
export function decodeTaskBid(raw: unknown): TaskBid
export function decodeServiceListing(serviceId: string, raw: unknown): ServiceListing
export function decodeGovernanceProposal(proposalId: number, raw: unknown): GovernanceProposal
export function decodeVoteRecord(raw: unknown): VoteRecord
export function decodeAgentReceipt(receiptId: string, raw: unknown): AgentReceipt
export function decodeAnonMessage(messageId: string, raw: unknown): AnonMessage
export function decodeRpcEndpoint(endpointId: string, raw: unknown): RpcEndpoint
export function decodeIbcChannel(channelId: string, raw: unknown): IbcChannel
export function decodeDidInfo(did: string, raw: unknown): DidInfo
```

Each decoder follows the same pattern as existing `decodeAgentInfo` — check for `.toJSON()` codec method, fall back to plain object, and map fields with defaults.

---

## Summary

| Metric | Value |
|--------|-------|
| New modules | 8 (did, task-market, service-market, governance, receipts, messaging, rpc-registry, ibc) |
| New core systems | 3 (signer, tx-builder, events) |
| Modified modules | 4 (agent, token, reputation, quota) |
| New type files | 8 |
| New test files | ~14 |
| Total new source files | ~30 |
| Total modified files | ~12 |
| Estimated new LoC | ~4,000–5,000 (src) + ~3,000–4,000 (tests) |
| Coverage target | ≥90% lines/branches/functions/statements |

**Builder: implement Phase 1 first.** Ship `v2.0.0-alpha.1` before moving to Phase 2.
