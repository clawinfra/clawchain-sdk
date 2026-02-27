import { describe, it, expect } from 'vitest'
import {
  ClawChainError,
  ConnectionError,
  ChainMismatchError,
  AgentNotFoundError,
  InsufficientQuotaError,
  InsufficientBalanceError,
  MarketError,
  TransactionError,
  TimeoutError,
  NotFoundError,
  InvalidArgumentError,
} from '../../src/errors.js'

describe('Error hierarchy', () => {
  it('ClawChainError sets name, code, cause', () => {
    const cause = new Error('original')
    const err = new ClawChainError('test', 'TEST_CODE', cause)
    expect(err.name).toBe('ClawChainError')
    expect(err.code).toBe('TEST_CODE')
    expect(err.cause).toBe(cause)
    expect(err instanceof Error).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
  })

  it('ConnectionError instanceof ClawChainError', () => {
    const err = new ConnectionError('ws failed')
    expect(err instanceof ConnectionError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
    expect(err.code).toBe('CONNECTION_ERROR')
    expect(err.name).toBe('ConnectionError')
  })

  it('ChainMismatchError stores expected/actual genesis', () => {
    const err = new ChainMismatchError('0xexpected', '0xactual')
    expect(err instanceof ChainMismatchError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
    expect(err.code).toBe('CHAIN_MISMATCH')
    expect(err.expectedGenesis).toBe('0xexpected')
    expect(err.actualGenesis).toBe('0xactual')
    expect(err.message).toContain('0xexpected')
    expect(err.message).toContain('0xactual')
  })

  it('AgentNotFoundError stores agentId', () => {
    const err = new AgentNotFoundError('0xabc')
    expect(err instanceof AgentNotFoundError).toBe(true)
    expect(err.code).toBe('AGENT_NOT_FOUND')
    expect(err.agentId).toBe('0xabc')
    expect(err.message).toContain('0xabc')
  })

  it('InsufficientQuotaError stores accountId, required, available', () => {
    const err = new InsufficientQuotaError('alice', 1000n, 500n)
    expect(err instanceof InsufficientQuotaError).toBe(true)
    expect(err.code).toBe('INSUFFICIENT_QUOTA')
    expect(err.accountId).toBe('alice')
    expect(err.required).toBe(1000n)
    expect(err.available).toBe(500n)
  })

  it('InsufficientBalanceError stores address, required, available', () => {
    const err = new InsufficientBalanceError('5Alice', 100n, 50n)
    expect(err instanceof InsufficientBalanceError).toBe(true)
    expect(err.code).toBe('INSUFFICIENT_BALANCE')
    expect(err.address).toBe('5Alice')
  })

  it('MarketError', () => {
    const err = new MarketError('task not found')
    expect(err instanceof MarketError).toBe(true)
    expect(err.code).toBe('MARKET_ERROR')
  })

  it('TransactionError stores dispatchError', () => {
    const dispatch = { module: 'agentRegistry', error: 'AlreadyRegistered' }
    const err = new TransactionError('tx failed', dispatch)
    expect(err instanceof TransactionError).toBe(true)
    expect(err.code).toBe('TRANSACTION_ERROR')
    expect(err.dispatchError).toBe(dispatch)
  })

  it('TimeoutError stores timeoutMs', () => {
    const err = new TimeoutError('health', 5000)
    expect(err instanceof TimeoutError).toBe(true)
    expect(err.code).toBe('TIMEOUT_ERROR')
    expect(err.timeoutMs).toBe(5000)
    expect(err.message).toContain('5000')
  })

  it('NotFoundError', () => {
    const err = new NotFoundError('Agent', '0xabc')
    expect(err instanceof NotFoundError).toBe(true)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toContain('Agent')
    expect(err.message).toContain('0xabc')
  })

  it('InvalidArgumentError', () => {
    const err = new InvalidArgumentError('address is required')
    expect(err instanceof InvalidArgumentError).toBe(true)
    expect(err.code).toBe('INVALID_ARGUMENT')
  })

  it('all errors are instanceof Error', () => {
    const errors = [
      new ConnectionError('x'),
      new ChainMismatchError('a', 'b'),
      new AgentNotFoundError('id'),
      new InsufficientQuotaError('a', 1n, 0n),
      new InsufficientBalanceError('a', 1n, 0n),
      new MarketError('x'),
      new TransactionError('x'),
      new TimeoutError('op', 1000),
      new NotFoundError('X', 'y'),
      new InvalidArgumentError('x'),
    ]
    for (const e of errors) {
      expect(e instanceof Error).toBe(true)
      expect(e instanceof ClawChainError).toBe(true)
    }
  })
})
