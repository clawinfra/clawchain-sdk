# Changelog

## [2.0.0-alpha.1] - 2026-03-10

### Added
- `ClawChainClient` single entry-point with signer abstraction (KeypairSigner, ExternalSigner, DelegateSigner)
- `TransactionBuilder` fluent API: `dryRun()`, `signAndSend()`, `waitForFinality()`
- Write methods for 4 core pallets: agent-registry, DID, claw-token, gas-quota
- 10 typed error classes (SignerError, DispatchError, TxTimeoutError, etc.)

### Breaking Changes
- See MIGRATION.md for v1→v2 upgrade guide

## [1.0.0] - 2026-02-27

### First Stable Release 🎉

**What's included:**
- Full TypeScript SDK for ClawChain L1
- Support for all 12 pallets: agent-did, agent-receipts, agent-registry, claw-token, gas-quota, quadratic-governance, reputation, rpc-registry, task-market, ibc-lite, anon-messaging, service-market
- 114 tests, 99.48% coverage
- WebSocket connection management
- Type-safe extrinsic submission
- Query helpers for all pallet storage

**Bug fixes:**
- Fixed TypeScript strict-mode errors in `TokenModule` (non-null assertions for polkadot API query objects under `noUncheckedIndexedAccess`)

**Installation:**
```bash
npm install clawchain-sdk
```

### Package
- Published to npm as `clawchain-sdk` (unscoped, free tier)
- Install: `npm install clawchain-sdk`
