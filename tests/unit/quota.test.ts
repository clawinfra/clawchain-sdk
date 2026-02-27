import { describe, it, expect } from 'vitest'
import { createMockClient } from '../../src/testing/mock-client.js'
import { MOCK_OWNER_ADDRESS } from '../../src/testing/fixtures/agents.js'
import { mockQuota } from '../../src/testing/fixtures/quota.js'
import { InvalidArgumentError } from '../../src/errors.js'

describe('QuotaModule.getQuota', () => {
  const client = createMockClient({
    quotas: { [MOCK_OWNER_ADDRESS]: mockQuota },
  })

  it('returns quota for known account', async () => {
    const quota = await client.quota.getQuota(MOCK_OWNER_ADDRESS)
    expect(quota).not.toBeNull()
    expect(quota!.accountId).toBe(MOCK_OWNER_ADDRESS)
    expect(quota!.remaining).toBe(1_000_000n)
    expect(quota!.limit).toBe(5_000_000n)
    expect(quota!.tier).toBe('Standard')
  })

  it('returns null for unknown account', async () => {
    const quota = await client.quota.getQuota('5Unknown')
    expect(quota).toBeNull()
  })

  it('throws InvalidArgumentError for empty accountId', async () => {
    await expect(client.quota.getQuota('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('QuotaModule.hasQuota', () => {
  const client = createMockClient({
    quotas: { [MOCK_OWNER_ADDRESS]: mockQuota },
  })

  it('returns true when remaining >= required', async () => {
    const result = await client.quota.hasQuota(MOCK_OWNER_ADDRESS, 500_000n)
    expect(result).toBe(true)
  })

  it('returns true when remaining === required', async () => {
    const result = await client.quota.hasQuota(MOCK_OWNER_ADDRESS, 1_000_000n)
    expect(result).toBe(true)
  })

  it('returns false when remaining < required', async () => {
    const result = await client.quota.hasQuota(MOCK_OWNER_ADDRESS, 2_000_000n)
    expect(result).toBe(false)
  })

  it('returns false for unknown account (no quota record)', async () => {
    const result = await client.quota.hasQuota('5Unknown', 1n)
    expect(result).toBe(false)
  })

  it('throws InvalidArgumentError for empty accountId', async () => {
    await expect(client.quota.hasQuota('', 1n)).rejects.toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError for negative gas', async () => {
    await expect(client.quota.hasQuota(MOCK_OWNER_ADDRESS, -1n)).rejects.toThrow(
      InvalidArgumentError,
    )
  })
})

describe('QuotaModule.estimate', () => {
  const client = createMockClient()

  const ops = [
    'agent.register',
    'agent.update',
    'agent.deactivate',
    'market.bid',
    'market.complete',
    'market.dispute',
    'reputation.submit',
  ] as const

  for (const op of ops) {
    it(`estimates gas for ${op}`, () => {
      const estimate = client.quota.estimate(op)
      expect(estimate.operation).toBe(op)
      expect(estimate.estimatedGas).toBeGreaterThan(0n)
      expect(estimate.estimatedFeeClw).toBeGreaterThan(0n)
      expect(['low', 'medium', 'high']).toContain(estimate.confidence)
    })
  }

  it('throws InvalidArgumentError for unknown operation', () => {
    // @ts-expect-error — intentional bad input
    expect(() => client.quota.estimate('bad.operation')).toThrow(InvalidArgumentError)
  })
})

describe('QuotaModule.getUsageHistory', () => {
  const client = createMockClient()

  it('returns empty paged result in Phase 1', async () => {
    const result = await client.quota.getUsageHistory(MOCK_OWNER_ADDRESS)
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('throws InvalidArgumentError for empty accountId', async () => {
    await expect(client.quota.getUsageHistory('')).rejects.toThrow(InvalidArgumentError)
  })
})
