# Changelog

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
