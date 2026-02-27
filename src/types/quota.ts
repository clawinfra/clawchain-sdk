/**
 * Gas Quota module types
 */

import type { PaginationOpts } from './common.js'

/** Quota tier levels */
export type QuotaTier = 'Basic' | 'Standard' | 'Premium' | 'Unlimited'

/** Operation types for gas estimation */
export type OperationType =
  | 'agent.register'
  | 'agent.update'
  | 'agent.deactivate'
  | 'market.bid'
  | 'market.complete'
  | 'market.dispute'
  | 'reputation.submit'

/** Current quota state for an account */
export interface QuotaInfo {
  accountId: string
  remaining: bigint
  limit: bigint
  /** Block number when quota resets */
  resetBlock: number
  tier: QuotaTier
}

/** Gas estimation result */
export interface GasEstimate {
  operation: OperationType
  estimatedGas: bigint
  /** Estimated fee in CLW token units */
  estimatedFeeClw: bigint
  confidence: 'low' | 'medium' | 'high'
}

/** Historical quota usage event */
export interface QuotaUsageEvent {
  blockNumber: number
  operation: string
  gasUsed: bigint
  remainingAfter: bigint
}

/** Options for quota usage history */
export interface QuotaHistoryOpts extends PaginationOpts {
  fromBlock?: number
  toBlock?: number
}
