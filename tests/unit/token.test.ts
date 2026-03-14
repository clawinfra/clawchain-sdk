import { describe, it, expect } from 'vitest'
import { createMockClient } from '../../src/testing/mock-client.js'
import { MOCK_OWNER_ADDRESS } from '../../src/testing/fixtures/agents.js'
import { InvalidArgumentError } from '../../src/errors.js'
import type { TokenBalance } from '../../src/types/token.js'

const mockBalance: TokenBalance = {
  free: 5_000_000_000_000_000_000n,
  reserved: 500_000_000_000_000_000n,
  frozen: 100_000_000_000_000_000n,
  total: 5_500_000_000_000_000_000n,
  transferable: 4_900_000_000_000_000_000n,
}

describe('TokenModule.getBalance', () => {
  const client = createMockClient({
    balances: { [MOCK_OWNER_ADDRESS]: mockBalance },
  })

  it('returns token balance for known address', async () => {
    const bal = await client.token.getBalance(MOCK_OWNER_ADDRESS)
    expect(bal).toBeDefined()
    expect(typeof bal.free).toBe('bigint')
    expect(typeof bal.reserved).toBe('bigint')
    expect(typeof bal.total).toBe('bigint')
    expect(typeof bal.transferable).toBe('bigint')
  })

  it('throws InvalidArgumentError for empty address', async () => {
    await expect(client.token.getBalance('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('TokenModule.getBalances', () => {
  const client = createMockClient({
    balances: {
      alice: { ...mockBalance },
      bob: { ...mockBalance, free: 100n, total: 100n, transferable: 100n },
    },
  })

  it('returns a map of balances', async () => {
    const result = await client.token.getBalances(['alice', 'bob'])
    expect(result.size).toBe(2)
    expect(result.has('alice')).toBe(true)
    expect(result.has('bob')).toBe(true)
  })

  it('returns empty map for empty input', async () => {
    const result = await client.token.getBalances([])
    expect(result.size).toBe(0)
  })
})

describe('TokenModule.getTotalSupply', () => {
  const client = createMockClient()

  it('returns a positive bigint', async () => {
    const supply = await client.token.getTotalSupply()
    expect(typeof supply).toBe('bigint')
    expect(supply).toBeGreaterThan(0n)
  })
})

describe('TokenModule.getMetadata', () => {
  const client = createMockClient()

  it('returns CLW token metadata', () => {
    const meta = client.token.getMetadata()
    expect(meta.name).toBe('ClawChain Token')
    expect(meta.symbol).toBe('CLW')
    expect(meta.decimals).toBe(18)
  })
})

describe('TokenModule write methods (v2)', () => {
  const client = createMockClient()

  it('transfer() returns TransactionBuilder', () => {
    const builder = client.token.transfer('5Alice', 100n)
    expect(builder).toBeDefined()
    expect(typeof builder.signAndSend).toBe('function')
    expect(typeof builder.dryRun).toBe('function')
  })

  it('transfer() throws for empty to address', () => {
    expect(() => client.token.transfer('', 100n)).toThrow(/to address is required/)
  })

  it('transfer() throws for zero amount', () => {
    expect(() => client.token.transfer('5Alice', 0n)).toThrow(/amount must be greater than 0/)
  })

  it('transfer() throws for negative amount', () => {
    expect(() => client.token.transfer('5Alice', -1n)).toThrow(/amount must be greater than 0/)
  })

  it('transferAllowDeath() returns TransactionBuilder', () => {
    const builder = client.token.transferAllowDeath('5Alice', 100n)
    expect(builder).toBeDefined()
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('transferAllowDeath() throws for empty to address', () => {
    expect(() => client.token.transferAllowDeath('', 100n)).toThrow(/to address is required/)
  })

  it('transferAllowDeath() throws for zero amount', () => {
    expect(() => client.token.transferAllowDeath('5Bob', 0n)).toThrow(/amount must be greater than 0/)
  })

  it('transferAll() returns TransactionBuilder', () => {
    const builder = client.token.transferAll('5Alice')
    expect(builder).toBeDefined()
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('transferAll() defaults keepAlive to true', () => {
    const builder = client.token.transferAll('5Alice')
    expect(builder).toBeDefined()
  })

  it('transferAll() throws for empty to address', () => {
    expect(() => client.token.transferAll('')).toThrow(/to address is required/)
  })
})
