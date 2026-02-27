/**
 * Common shared types across all modules
 */

/** Pagination options for list queries */
export interface PaginationOpts {
  /** Maximum number of items to return (default 20, max 100) */
  limit?: number
  /** Offset for page-based pagination (default 0) */
  offset?: number
  /** Cursor for cursor-based pagination (preferred over offset) */
  cursor?: string
}

/** Paginated result wrapper */
export interface PagedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

/** Result of an on-chain transaction */
export interface TxResult<T = void> {
  txHash: string
  blockHash: string
  blockNumber: number
  extrinsicIndex: number
  success: boolean
  data?: T
  events: ChainEvent[]
  fee: bigint
}

/** Generic on-chain event */
export interface ChainEvent {
  blockNumber: number
  blockHash: string
  extrinsicIndex?: number
  pallet: string
  method: string
  data: Record<string, unknown>
  raw: unknown
}

/** Injectable logger interface */
export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  error(msg: string, meta?: Record<string, unknown>): void
}
