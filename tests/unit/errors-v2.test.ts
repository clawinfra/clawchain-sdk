/**
 * v2 error types tests
 */
import { describe, it, expect } from 'vitest'
import {
  ClawChainError,
  TransactionError,
  SignerError,
  DispatchError,
  TxTimeoutError,
  NonceTooLowError,
  TaskNotFoundError,
  ServiceNotFoundError,
  ProposalNotFoundError,
  IbcError,
  MessagingError,
  EmergencyPauseError,
  NotFoundError,
} from '../../src/errors.js'

describe('SignerError', () => {
  it('is instanceof ClawChainError and Error', () => {
    const err = new SignerError('key derivation failed')
    expect(err instanceof SignerError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
    expect(err instanceof Error).toBe(true)
  })

  it('has code SIGNER_ERROR', () => {
    const err = new SignerError('test')
    expect(err.code).toBe('SIGNER_ERROR')
    expect(err.name).toBe('SignerError')
  })

  it('stores cause', () => {
    const cause = new Error('original')
    const err = new SignerError('wrap', cause)
    expect(err.cause).toBe(cause)
  })

  it('includes message', () => {
    const err = new SignerError('bad key')
    expect(err.message).toBe('bad key')
  })
})

describe('DispatchError', () => {
  it('is instanceof TransactionError and ClawChainError', () => {
    const err = new DispatchError('agentRegistry', 'AlreadyRegistered', 'Agent already registered')
    expect(err instanceof DispatchError).toBe(true)
    expect(err instanceof TransactionError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
  })

  it('stores module and errorName', () => {
    const err = new DispatchError('balances', 'InsufficientBalance', 'Not enough tokens')
    expect(err.module).toBe('balances')
    expect(err.errorName).toBe('InsufficientBalance')
    expect(err.name).toBe('DispatchError')
  })

  it('message contains module.errorName and details', () => {
    const err = new DispatchError('reputation', 'InvalidScore', 'Score out of range')
    expect(err.message).toContain('reputation.InvalidScore')
    expect(err.message).toContain('Score out of range')
  })

  it('accepts optional dispatchError reference', () => {
    const raw = { module: { error: 0 } }
    const err = new DispatchError('sys', 'BadOrigin', 'bad', raw)
    expect(err.dispatchError).toBe(raw)
  })
})

describe('TxTimeoutError', () => {
  it('is instanceof TransactionError and ClawChainError', () => {
    const err = new TxTimeoutError('0xabc', 60000)
    expect(err instanceof TxTimeoutError).toBe(true)
    expect(err instanceof TransactionError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
  })

  it('name is TxTimeoutError', () => {
    const err = new TxTimeoutError('0xabc', 60000)
    expect(err.name).toBe('TxTimeoutError')
  })

  it('message contains txHash and timeout', () => {
    const err = new TxTimeoutError('0xdeadbeef', 30000)
    expect(err.message).toContain('0xdeadbeef')
    expect(err.message).toContain('30000')
  })
})

describe('NonceTooLowError', () => {
  it('is instanceof TransactionError and ClawChainError', () => {
    const err = new NonceTooLowError(5, 3)
    expect(err instanceof NonceTooLowError).toBe(true)
    expect(err instanceof TransactionError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
  })

  it('stores expected and actual nonce', () => {
    const err = new NonceTooLowError(10, 7)
    expect(err.expectedNonce).toBe(10)
    expect(err.actualNonce).toBe(7)
    expect(err.name).toBe('NonceTooLowError')
  })

  it('message contains nonce values', () => {
    const err = new NonceTooLowError(5, 3)
    expect(err.message).toContain('5')
    expect(err.message).toContain('3')
  })
})

describe('TaskNotFoundError', () => {
  it('is instanceof NotFoundError and ClawChainError', () => {
    const err = new TaskNotFoundError('task-001')
    expect(err instanceof TaskNotFoundError).toBe(true)
    expect(err instanceof NotFoundError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
  })

  it('name is TaskNotFoundError', () => {
    expect(new TaskNotFoundError('x').name).toBe('TaskNotFoundError')
  })

  it('message contains task ID', () => {
    const err = new TaskNotFoundError('task-42')
    expect(err.message).toContain('task-42')
  })
})

describe('ServiceNotFoundError', () => {
  it('is instanceof NotFoundError', () => {
    const err = new ServiceNotFoundError('svc-001')
    expect(err instanceof ServiceNotFoundError).toBe(true)
    expect(err instanceof NotFoundError).toBe(true)
  })

  it('message contains service ID', () => {
    const err = new ServiceNotFoundError('svc-007')
    expect(err.message).toContain('svc-007')
  })
})

describe('ProposalNotFoundError', () => {
  it('is instanceof NotFoundError', () => {
    const err = new ProposalNotFoundError(42)
    expect(err instanceof ProposalNotFoundError).toBe(true)
    expect(err instanceof NotFoundError).toBe(true)
  })

  it('message contains proposal ID', () => {
    const err = new ProposalNotFoundError(99)
    expect(err.message).toContain('99')
  })
})

describe('IbcError', () => {
  it('is instanceof ClawChainError', () => {
    const err = new IbcError('channel not found')
    expect(err instanceof IbcError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
    expect(err.code).toBe('IBC_ERROR')
    expect(err.name).toBe('IbcError')
  })

  it('stores cause', () => {
    const cause = new Error('underlying')
    const err = new IbcError('ibc fail', cause)
    expect(err.cause).toBe(cause)
  })
})

describe('MessagingError', () => {
  it('is instanceof ClawChainError', () => {
    const err = new MessagingError('queue full')
    expect(err instanceof MessagingError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
    expect(err.code).toBe('MESSAGING_ERROR')
    expect(err.name).toBe('MessagingError')
  })
})

describe('EmergencyPauseError', () => {
  it('is instanceof ClawChainError', () => {
    const err = new EmergencyPauseError()
    expect(err instanceof EmergencyPauseError).toBe(true)
    expect(err instanceof ClawChainError).toBe(true)
    expect(err.code).toBe('EMERGENCY_PAUSE')
    expect(err.name).toBe('EmergencyPauseError')
  })

  it('has descriptive message', () => {
    const err = new EmergencyPauseError()
    expect(err.message).toContain('emergency pause')
  })
})

describe('All v2 errors are instanceof Error', () => {
  it('every error extends Error', () => {
    const errors = [
      new SignerError('x'),
      new DispatchError('m', 'e', 'd'),
      new TxTimeoutError('0x0', 1000),
      new NonceTooLowError(1, 0),
      new TaskNotFoundError('t'),
      new ServiceNotFoundError('s'),
      new ProposalNotFoundError(1),
      new IbcError('x'),
      new MessagingError('x'),
      new EmergencyPauseError(),
    ]
    for (const err of errors) {
      expect(err instanceof Error).toBe(true)
      expect(err instanceof ClawChainError).toBe(true)
    }
  })
})
