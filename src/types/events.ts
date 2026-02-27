/**
 * Events module types
 */

import type { AgentId } from './agent.js'
import type { ChainEvent } from './common.js'

/** Unsubscribe function returned from subscription methods */
export type Unsubscribe = () => void

/** Summary info for a finalized block */
export interface BlockInfo {
  number: number
  hash: string
  parentHash: string
  stateRoot: string
  extrinsicsRoot: string
  timestamp: number
  extrinsicsCount: number
}

/** Filter for subscribing to chain events */
export interface EventFilter {
  /** e.g. ['agentRegistry', 'taskMarket'] */
  pallets?: string[]
  /** e.g. ['AgentRegistered'] */
  methods?: string[]
}

/** Agent lifecycle event */
export interface AgentEvent extends ChainEvent {
  agentId: AgentId
  eventType: 'Registered' | 'Updated' | 'Deactivated' | 'DidUpdated'
  owner: string
}

/** Token transfer event */
export interface TransferEvent extends ChainEvent {
  from: string
  to: string
  amount: bigint
}

/** Filter for fetching historical events */
export interface HistoricalEventFilter extends EventFilter {
  fromBlock: number
  toBlock?: number
  limit?: number
}
