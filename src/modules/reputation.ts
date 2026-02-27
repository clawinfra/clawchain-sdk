/**
 * ReputationModule — reputation pallet queries
 */

import type { ApiPromise } from '@polkadot/api'
import { InvalidArgumentError } from '../errors.js'
import type { AgentId } from '../types/agent.js'
import type { Logger, PagedResult } from '../types/common.js'
import type { HistoryOpts, ReputationEvent, ReputationInfo, ReputationRanking } from '../types/reputation.js'
import { decodeReputationInfo } from '../utils/codec.js'

export class ReputationModule {
  constructor(
    private readonly api: ApiPromise,
    private readonly logger: Logger,
  ) {}

  /**
   * Get current reputation score for an account.
   * Storage: reputation.reputations(accountId)
   */
  async getReputation(accountId: string): Promise<ReputationInfo | null> {
    if (!accountId) throw new InvalidArgumentError('accountId is required')
    this.logger.debug('ReputationModule.getReputation', { accountId })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.api.query as any)['reputation']['reputations'](accountId)

    if (!result || result.isNone || result.isEmpty) return null

    const inner = typeof result.unwrap === 'function' ? result.unwrap() : result
    return decodeReputationInfo(accountId, inner)
  }

  /**
   * Get reputation for an agent (looks up owner address then fetches reputation).
   */
  async getAgentReputation(agentId: AgentId): Promise<ReputationInfo | null> {
    if (!agentId) throw new InvalidArgumentError('agentId is required')
    this.logger.debug('ReputationModule.getAgentReputation', { agentId })

    // Try fetching by agentId directly first (some implementations store by agent ID)
    const byId = await this.getReputation(agentId)
    if (byId) return byId

    // Fallback: look up agent owner and fetch by owner address
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agentResult = await (this.api.query as any)['agentRegistry']['agentRegistry'](agentId)
      if (!agentResult || agentResult.isNone || agentResult.isEmpty) return null

      const inner = typeof agentResult.unwrap === 'function' ? agentResult.unwrap() : agentResult
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = typeof inner.toJSON === 'function' ? (inner.toJSON() as any) : inner
      const owner: string = data['owner'] ?? ''
      if (!owner) return null
      return this.getReputation(owner)
    } catch {
      return null
    }
  }

  /**
   * Get historical reputation events for an account.
   * Fetches from on-chain events (requires archive node or block range).
   */
  async getHistory(
    accountId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _opts?: HistoryOpts,
  ): Promise<PagedResult<ReputationEvent>> {
    if (!accountId) throw new InvalidArgumentError('accountId is required')
    this.logger.debug('ReputationModule.getHistory', { accountId })

    // Phase 1: returns empty history; Phase 4 will implement event scanning
    return {
      items: [],
      total: 0,
      hasMore: false,
    }
  }

  /**
   * Get top accounts by reputation score (leaderboard).
   * Phase 1: scans all reputation storage entries.
   */
  async getLeaderboard(limit = 10): Promise<ReputationRanking[]> {
    this.logger.debug('ReputationModule.getLeaderboard', { limit })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (this.api.query as any)['reputation']['reputations'].entries()

    const rankings: ReputationInfo[] = []
    for (const [key, value] of entries as [unknown, unknown][]) {
      if (!value) continue
      const keyStr = String(key)
      const accountId = keyStr.split(',').pop()?.trim() ?? keyStr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = typeof (value as any).unwrap === 'function' ? (value as any).unwrap() : value
      try {
        rankings.push(decodeReputationInfo(accountId, inner))
      } catch {
        // skip
      }
    }

    rankings.sort((a, b) => b.score - a.score)

    return rankings.slice(0, limit).map((info, idx) => ({
      rank: idx + 1,
      accountId: info.accountId,
      score: info.score,
    }))
  }
}
