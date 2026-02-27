/**
 * QuotaModule — gas-quota pallet queries
 */

import type { ApiPromise } from '@polkadot/api'
import { InvalidArgumentError } from '../errors.js'
import type { Logger, PagedResult } from '../types/common.js'
import type {
  GasEstimate,
  OperationType,
  QuotaHistoryOpts,
  QuotaInfo,
  QuotaUsageEvent,
} from '../types/quota.js'
import { decodeQuotaInfo } from '../utils/codec.js'

/** Hard-coded gas estimates per operation type (Phase 1 — static) */
const GAS_ESTIMATES: Record<OperationType, bigint> = {
  'agent.register': 500_000n,
  'agent.update': 200_000n,
  'agent.deactivate': 100_000n,
  'market.bid': 300_000n,
  'market.complete': 250_000n,
  'market.dispute': 400_000n,
  'reputation.submit': 150_000n,
}

/** Base fee in CLW units per gas unit (1e-12 CLW per gas) */
const BASE_FEE_PER_GAS = 1_000_000n // 1e-12 CLW

export class QuotaModule {
  constructor(
    private readonly api: ApiPromise,
    private readonly logger: Logger,
  ) {}

  /**
   * Get current quota info for an account.
   * Storage: gasQuota.agentQuotas(accountId)
   */
  async getQuota(accountId: string): Promise<QuotaInfo | null> {
    if (!accountId) throw new InvalidArgumentError('accountId is required')
    this.logger.debug('QuotaModule.getQuota', { accountId })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.api.query as any)['gasQuota']['agentQuotas'](accountId)

    if (!result || result.isNone || result.isEmpty) return null

    const inner = typeof result.unwrap === 'function' ? result.unwrap() : result
    return decodeQuotaInfo(accountId, inner)
  }

  /**
   * Check if an account has enough quota for an estimated gas cost.
   */
  async hasQuota(accountId: string, estimatedGas: bigint): Promise<boolean> {
    if (!accountId) throw new InvalidArgumentError('accountId is required')
    if (estimatedGas < 0n) throw new InvalidArgumentError('estimatedGas must be non-negative')

    const quota = await this.getQuota(accountId)
    if (!quota) return false
    return quota.remaining >= estimatedGas
  }

  /**
   * Estimate gas and fee for a given operation type.
   * Phase 1: uses static estimates; Phase 2 will use live RPC estimation.
   */
  estimate(operation: OperationType): GasEstimate {
    const estimatedGas = GAS_ESTIMATES[operation]
    if (!estimatedGas) {
      throw new InvalidArgumentError(`Unknown operation type: ${operation}`)
    }

    return {
      operation,
      estimatedGas,
      estimatedFeeClw: estimatedGas * BASE_FEE_PER_GAS,
      confidence: 'medium',
    }
  }

  /**
   * Get quota usage history for an account.
   * Phase 1: returns empty; Phase 4 will scan on-chain events.
   */
  async getUsageHistory(
    accountId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _opts?: QuotaHistoryOpts,
  ): Promise<PagedResult<QuotaUsageEvent>> {
    if (!accountId) throw new InvalidArgumentError('accountId is required')
    this.logger.debug('QuotaModule.getUsageHistory', { accountId })

    return {
      items: [],
      total: 0,
      hasMore: false,
    }
  }
}
