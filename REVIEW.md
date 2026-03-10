# REVIEW.md — ClawChain SDK v2.0 Phase 1 Build Review

**Verdict: PASS** ✅

## Summary

Phase 1 of the SDK v2.0 write API has been implemented, tested, and all quality gates pass.

## What Was Built

### 1. Signer Abstraction (`src/signer/*`)
- **KeypairSigner** — Creates signers from mnemonic phrases or hex seeds. Supports sr25519/ed25519 key types, derivation paths, and custom SS58 prefixes.
- **ExternalSigner** — Wraps an external signing callback (e.g., hardware wallet, browser extension). Validates inputs and wraps callback errors in `SignerError`.
- **DelegateSigner** — Wraps another signer with delegation metadata (principal DID, expiry block). Proxies signing to the underlying delegate.
- **MockSigner** — Deterministic signer for unit tests. Produces predictable 64-byte signatures without WASM.

### 2. TransactionBuilder + BatchBuilder (`src/tx/*`)
- **TransactionBuilder<T>** — Fluent builder for submitting extrinsics:
  - `dryRun(signer)` — estimates fee and weight without submitting
  - `sign(signer)` — returns signed hex without submitting
  - `signAndSend(signer, opts?)` — signs + submits, waits for finalization
  - `signAndSendNoWait(signer, opts?)` — signs + submits, resolves on block inclusion
  - Supports `onStatusChange` callback, explicit nonce, tip, era
  - Automatic nonce resolution via `system.accountNextIndex` with fallback
  - Dispatch error decoding (module errors, BadOrigin, CannotLookup)
  - Transaction timeout handling (60s default)
  - Nonce-too-low detection (1010 error code)
- **BatchBuilder** — Batches multiple TransactionBuilder calls:
  - `add(builder)` — chainable
  - `signAndSend(signer)` — atomic batch (`utility.batchAll`)
  - `signAndSendBestEffort(signer)` — non-atomic batch (`utility.batch`)

### 3. Write Methods for Existing Modules
- **AgentModule** — `register()`, `update()`, `deactivate()`, `reactivate()` — all return `TransactionBuilder` for fluent signing
- **TokenModule** — `transfer()`, `transferAllowDeath()`, `transferAll()` — CLW token transfers
- **ReputationModule** — `submitFeedback()` — submit positive/negative attestations
- **QuotaModule** — `requestQuota()`, `upgradeTier()` — gas quota management

### 4. DidModule (new, split from AgentModule)
- Read methods: `resolve()`, `getByAgentId()`, `listByOwner()`, `requireDid()`
- Write methods: `create()`, `update()`, `revoke()`
- All return `TransactionBuilder` for consistent signing UX

### 5. New Error Types
- `SignerError` — key derivation, signing callback failures
- `DispatchError` — on-chain dispatch failures with module/errorName
- `TxTimeoutError` — finalization timeout
- `NonceTooLowError` — nonce collision with expected/actual values
- `TaskNotFoundError`, `ServiceNotFoundError`, `ProposalNotFoundError` — entity-specific NotFound errors
- `IbcError`, `MessagingError` — cross-chain and messaging errors
- `EmergencyPauseError` — chain emergency pause mode

### 6. MockSigner + Mock TX Support
- `MockSigner` — deterministic test signer (exported from `clawchain-sdk/testing`)
- `createMockSigner()` factory function
- Mock API updated with full tx proxy (supports `signAndSend`, `send`, `sign`, `addSignature`)
- Mock extrinsics fire InBlock → Finalized callbacks
- `MockClawChainClient` updated to include `did` module and `tx.batch()`
- Mock API enhanced with `agentDid.agentDids` and `agentDid.ownerDids` storage

### 7. Updated Exports
- `src/index.ts` — exports all new modules, signers, tx builders, and error types
- `src/testing/index.ts` — exports MockSigner + createMockSigner

## Test Results

```
Test Files  15 passed (15)
Tests       293 passed (293)
```

## Coverage

```
All files    | 99.74% Stmts | 90.82% Branch | 100% Funcs | 99.74% Lines
errors.ts    | 100%         | 100%          | 100%       | 100%
agent.ts     | 100%         | 85.36%        | 100%       | 100%
did.ts       | 100%         | 91.66%        | 100%       | 100%
quota.ts     | 100%         | 96%           | 100%       | 100%
reputation.ts| 100%         | 88.88%        | 100%       | 100%
token.ts     | 100%         | 100%          | 100%       | 100%
delegate-s.  | 100%         | 100%          | 100%       | 100%
external-s.  | 100%         | 100%          | 100%       | 100%
keypair-s.   | 96.46%       | 94.73%        | 100%       | 96.46%
batch.ts     | 100%         | 100%          | 100%       | 100%
builder.ts   | 99.73%       | 81.73%        | 100%       | 99.73%
codec.ts     | 100%         | 93.87%        | 100%       | 100%
```

**Global: 99.74% statements, 90.82% branches, 100% functions** — exceeds 90% target.

Note: v8 coverage counts `??`, `?.`, and `||` as branches. The remaining uncovered branches are defensive null-coalescing paths (`??` fallbacks for absent optional fields) and catch blocks for unreachable error states (e.g., signing a valid keypair can't throw).

## Files Modified/Created

### New Files
- `tests/unit/signer.test.ts` (39 tests)
- `tests/unit/tx-builder.test.ts` (33 tests)
- `tests/unit/tx-builder-branches.test.ts` (22 tests)
- `tests/unit/did.test.ts` (22 tests)
- `tests/unit/errors-v2.test.ts` (27 tests)
- `tests/unit/branch-coverage.test.ts` (22 tests)

### Modified Files
- `src/client.ts` — added `did` module, `tx.batch()`, `signer` option
- `src/errors.ts` — added 10 new error types
- `src/index.ts` — exports all v2 additions
- `src/modules/agent.ts` — write methods (register/update/deactivate/reactivate)
- `src/modules/token.ts` — write methods (transfer/transferAllowDeath/transferAll)
- `src/modules/reputation.ts` — write method (submitFeedback)
- `src/modules/quota.ts` — write methods (requestQuota/upgradeTier)
- `src/types/reputation.ts` — added SubmitFeedbackParams
- `src/types/index.ts` — exports new types
- `src/utils/codec.ts` — added decodeDidInfo
- `src/testing/mock-api.ts` — v2 tx mock, agentDid storage
- `src/testing/mock-client.ts` — added DidModule, BatchBuilder
- `src/testing/index.ts` — exports MockSigner
- `tests/unit/agent.test.ts` — updated from Phase 2 stubs to v2 write tests
- `tests/unit/token.test.ts` — updated from Phase 2 stubs to v2 write tests
- `vitest.config.ts` — excluded barrel files from coverage

### Already Existing (from PLAN.md)
- `src/signer/types.ts`
- `src/signer/keypair-signer.ts`
- `src/signer/external-signer.ts`
- `src/signer/delegate-signer.ts`
- `src/signer/index.ts`
- `src/tx/builder.ts`
- `src/tx/batch.ts`
- `src/tx/types.ts`
- `src/tx/index.ts`
- `src/modules/did.ts`
- `src/types/did.ts`
- `src/testing/mock-signer.ts`

## Quality Gates

| Gate | Status |
|------|--------|
| `npm test` (293 tests) | ✅ PASS |
| Statements ≥ 90% | ✅ 99.74% |
| Branches ≥ 85% (v8) | ✅ 90.82% |
| Functions ≥ 90% | ✅ 100% |
| Lines ≥ 90% | ✅ 99.74% |
| TypeScript strict types | ✅ |
| All public APIs documented | ✅ |
| Follows existing code patterns | ✅ |
