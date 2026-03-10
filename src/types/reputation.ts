/**
 * Reputation module types
 */

import type { AgentId } from './agent.js'
import type { PaginationOpts } from './common.js'

/** Current reputation state for an account */
export interface ReputationInfo {
  accountId: string
  /** Score 0–10_000 (divide by 100 for display as percentage) */
  score: number
  positiveCount: number
  negativeCount: number
  totalInteractions: number
  lastUpdatedBlock: number
}

/** Historical reputation change event */
export interface ReputationEvent {
  blockNumber: number
  blockHash: string
  eventType: 'Increased' | 'Decreased' | 'Reset'
  delta: number
  scoreBefore: number
  scoreAfter: number
  reason?: string
  counterparty?: string
}

/** Entry in the reputation leaderboard */
export interface ReputationRanking {
  rank: number
  accountId: string
  agentId?: AgentId
  score: number
}

/** Options for fetching reputation history */
export interface HistoryOpts extends PaginationOpts {
  fromBlock?: number
  toBlock?: number
}

/** Parameters for submitting feedback/attestation (v2) */
export interface SubmitFeedbackParams {
  /** Target agent ID or SS58 address */
  target: string
  /** Whether the feedback is positive */
  isPositive: boolean
  /** Reference ID (task ID, service ID, etc.) */
  referenceId?: string
  /** Optional comment stored as hash (not plaintext) */
  commentHash?: string
}
