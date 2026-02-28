/**
 * createMockClient — exported testing utility
 *
 * Creates a ClawChainClient-compatible object backed by in-memory data,
 * with no real WebSocket connection needed.
 *
 * @example
 * ```ts
 * import { createMockClient } from 'clawchain-sdk/testing'
 *
 * const mock = createMockClient({
 *   agents: [mockAgentFixture],
 *   reputations: { [address]: { score: 8500, ... } },
 * })
 *
 * const agents = await mock.agent.getOwnerAgents(address)
 * ```
 */

import type { ApiPromise } from '@polkadot/api'
import { AgentModule } from '../modules/agent.js'
import { QuotaModule } from '../modules/quota.js'
import { ReputationModule } from '../modules/reputation.js'
import { TokenModule } from '../modules/token.js'
import type { AgentInfo } from '../types/agent.js'
import type { ReputationInfo } from '../types/reputation.js'
import type { QuotaInfo } from '../types/quota.js'
import type { TokenBalance } from '../types/token.js'
import type { Logger } from '../types/common.js'
import type { HealthStatus } from '../client.js'
import { noopLogger } from '../utils/logger.js'
import { createMockApi } from './mock-api.js'

export interface MockClientOptions {
  agents?: AgentInfo[]
  reputations?: Record<string, ReputationInfo>
  quotas?: Record<string, QuotaInfo>
  balances?: Record<string, TokenBalance>
  blockNumber?: number
  chainName?: string
  logger?: Logger
}

export interface MockClawChainClient {
  agent: AgentModule
  reputation: ReputationModule
  quota: QuotaModule
  token: TokenModule
  health(): Promise<HealthStatus>
  isConnected(): boolean
  disconnect(): Promise<void>
  getApi(): ApiPromise
}

/**
 * Create a mock ClawChain client for use in tests.
 * The returned object satisfies the same interface as ClawChainClient.
 */
export function createMockClient(opts: MockClientOptions = {}): MockClawChainClient {
  const logger = opts.logger ?? noopLogger
  const api = createMockApi(opts) as ApiPromise

  const agentModule = new AgentModule(api, logger)
  const reputationModule = new ReputationModule(api, logger)
  const quotaModule = new QuotaModule(api, logger)
  const tokenModule = new TokenModule(api, logger)

  const blockNumber = opts.blockNumber ?? 42
  const chainName = opts.chainName ?? 'ClawChain Testnet'

  return {
    agent: agentModule,
    reputation: reputationModule,
    quota: quotaModule,
    token: tokenModule,

    async health(): Promise<HealthStatus> {
      return {
        connected: true,
        blockNumber,
        blockHash: '0xdeadbeef' + '00'.repeat(28),
        peersCount: 5,
        isSyncing: false,
        nodeVersion: '0.9.0-clawchain',
        chainName,
      }
    },

    isConnected(): boolean {
      return true
    },

    async disconnect(): Promise<void> {
      // no-op for mock
    },

    getApi(): ApiPromise {
      return api
    },
  }
}
