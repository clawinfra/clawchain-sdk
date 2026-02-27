# Changelog

All notable changes to `@clawchain/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] — 2026-02-27

### Added
- Initial alpha release of `@clawchain/sdk`
- `ClawChainClient` with `connect()`, `disconnect()`, `health()`, `isConnected()`, `getApi()`
- `AgentModule` — `getOwnerAgents`, `getAgent`, `requireAgent`, `resolveDid`, `listAgents`, `listAgentsByOwner`
- `ReputationModule` — `getReputation`, `getAgentReputation`, `getHistory`, `getLeaderboard`
- `QuotaModule` — `getQuota`, `hasQuota`, `estimate`, `getUsageHistory`
- `TokenModule` — `getBalance`, `getBalances`, `getTotalSupply`, `getMetadata`
- Full TypeScript type definitions for all modules
- Typed error hierarchy (`ClawChainError` and 9 subclasses)
- `@clawchain/sdk/testing` entry with `createMockClient()`, `createMockApi()`, and fixtures
- 114 unit tests, 91.46% branch coverage
- Dual CJS + ESM output via tsup
- GitHub Actions CI (test + build + nightly integration)
