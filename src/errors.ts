/**
 * ClawChain SDK Error hierarchy
 *
 * All errors thrown by the SDK extend ClawChainError.
 * Callers can use `instanceof` checks or inspect the `code` field.
 */

/** Base error class for all ClawChain SDK errors */
export class ClawChainError extends Error {
  readonly code: string
  readonly cause: unknown

  constructor(message: string, code: string, cause?: unknown) {
    super(message)
    this.name = 'ClawChainError'
    this.code = code
    this.cause = cause
    // Ensure correct prototype chain in transpiled code
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** WebSocket connection failure or timeout */
export class ConnectionError extends ClawChainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONNECTION_ERROR', cause)
    this.name = 'ConnectionError'
  }
}

/** Connected to wrong network (genesis hash mismatch) */
export class ChainMismatchError extends ClawChainError {
  readonly expectedGenesis: string
  readonly actualGenesis: string

  constructor(expectedGenesis: string, actualGenesis: string) {
    super(
      `Chain genesis mismatch: expected ${expectedGenesis}, got ${actualGenesis}`,
      'CHAIN_MISMATCH',
    )
    this.name = 'ChainMismatchError'
    this.expectedGenesis = expectedGenesis
    this.actualGenesis = actualGenesis
  }
}

/** Requested agent does not exist on-chain */
export class AgentNotFoundError extends ClawChainError {
  readonly agentId: string

  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND')
    this.name = 'AgentNotFoundError'
    this.agentId = agentId
  }
}

/** Account has insufficient gas quota for the operation */
export class InsufficientQuotaError extends ClawChainError {
  readonly accountId: string
  readonly required: bigint
  readonly available: bigint

  constructor(accountId: string, required: bigint, available: bigint) {
    super(
      `Insufficient gas quota for ${accountId}: required ${required}, available ${available}`,
      'INSUFFICIENT_QUOTA',
    )
    this.name = 'InsufficientQuotaError'
    this.accountId = accountId
    this.required = required
    this.available = available
  }
}

/** Account has insufficient CLW token balance */
export class InsufficientBalanceError extends ClawChainError {
  readonly address: string
  readonly required: bigint
  readonly available: bigint

  constructor(address: string, required: bigint, available: bigint) {
    super(
      `Insufficient balance for ${address}: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE',
    )
    this.name = 'InsufficientBalanceError'
    this.address = address
    this.required = required
    this.available = available
  }
}

/** Task market operation failed */
export class MarketError extends ClawChainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'MARKET_ERROR', cause)
    this.name = 'MarketError'
  }
}

/** On-chain transaction was rejected (extrinsic failed) */
export class TransactionError extends ClawChainError {
  /** Raw Polkadot dispatch error */
  readonly dispatchError: unknown

  constructor(message: string, dispatchError?: unknown, cause?: unknown) {
    super(message, 'TRANSACTION_ERROR', cause)
    this.name = 'TransactionError'
    this.dispatchError = dispatchError
  }
}

/** RPC call or subscription timed out */
export class TimeoutError extends ClawChainError {
  readonly timeoutMs: number

  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR')
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/** Requested resource was not found (generic) */
export class NotFoundError extends ClawChainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/** Invalid argument provided to an SDK method */
export class InvalidArgumentError extends ClawChainError {
  constructor(message: string) {
    super(message, 'INVALID_ARGUMENT')
    this.name = 'InvalidArgumentError'
  }
}
