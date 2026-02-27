/**
 * Tests specifically targeting uncovered branches in codec.ts and retry.ts
 */
import { describe, it, expect } from 'vitest'
import {
  decodeTokenBalance,
  decodeReputationInfo,
  decodeQuotaInfo,
  decodeAgentInfo,
} from '../../src/utils/codec.js'
import { retry } from '../../src/utils/retry.js'
import { TimeoutError } from '../../src/errors.js'

// Helper: create an object that looks like a Polkadot codec (has toJSON)
function makeCodecLike(value: unknown) {
  return {
    toJSON: () => value,
    toString: () => String(value),
  }
}

describe('codec.ts — codec (toJSON) branch', () => {
  it('decodeTokenBalance from codec-like object', () => {
    const raw = makeCodecLike({
      data: { free: '2000', reserved: '100', frozen: '50' },
    })
    const bal = decodeTokenBalance(raw)
    expect(bal.free).toBe(2000n)
    expect(bal.reserved).toBe(100n)
    expect(bal.frozen).toBe(50n)
    expect(bal.total).toBe(2100n)
    expect(bal.transferable).toBe(1950n)
  })

  it('decodeTokenBalance codec — miscFrozen fallback', () => {
    // Some Substrate versions use miscFrozen instead of frozen
    const raw = makeCodecLike({
      data: { free: '1000', reserved: '0', miscFrozen: '200' },
    })
    const bal = decodeTokenBalance(raw)
    expect(bal.frozen).toBe(200n)
  })

  it('decodeReputationInfo from codec-like object', () => {
    const raw = makeCodecLike({
      score: 7500,
      positiveCount: 30,
      negativeCount: 5,
      totalInteractions: 35,
      lastUpdatedBlock: 500,
    })
    const rep = decodeReputationInfo('bob', raw)
    expect(rep.accountId).toBe('bob')
    expect(rep.score).toBe(7500)
    expect(rep.positiveCount).toBe(30)
  })

  it('decodeQuotaInfo from codec-like object', () => {
    const raw = makeCodecLike({
      remaining: '2000000',
      limit: '10000000',
      resetBlock: 500,
      tier: 'Premium',
    })
    const quota = decodeQuotaInfo('carol', raw)
    expect(quota.remaining).toBe(2_000_000n)
    expect(quota.tier).toBe('Premium')
  })

  it('decodeAgentInfo from codec-like object', () => {
    const raw = makeCodecLike({
      owner: '5Alice',
      did: 'did:clawchain:0x1234',
      name: 'CodecAgent',
      description: 'A codec agent',
      endpoint: 'http://codec.agent',
      capabilities: ['nlu', 'exec'],
      status: 'Inactive',
      registeredAt: 10,
      updatedAt: 20,
      reputationScore: 5000,
    })
    const agent = decodeAgentInfo('0x' + 'aa'.repeat(32), raw)
    expect(agent.name).toBe('CodecAgent')
    expect(agent.status).toBe('Inactive')
    expect(agent.capabilities).toContain('nlu')
  })

  it('decodeAgentInfo falls back gracefully for missing fields', () => {
    const agent = decodeAgentInfo('0x' + 'bb'.repeat(32), {})
    expect(agent.name).toBe('')
    expect(agent.status).toBe('Active') // default
    expect(agent.capabilities).toEqual([])
  })

  it('decodeReputationInfo falls back to 0 for missing fields', () => {
    const rep = decodeReputationInfo('dave', {})
    expect(rep.score).toBe(0)
    expect(rep.positiveCount).toBe(0)
    expect(rep.negativeCount).toBe(0)
    expect(rep.totalInteractions).toBe(0)
    expect(rep.lastUpdatedBlock).toBe(0)
  })

  it('decodeReputationInfo codec fallback path', () => {
    const raw = makeCodecLike({}) // codec that returns empty object
    const rep = decodeReputationInfo('dave', raw)
    expect(rep.score).toBe(0)
  })

  it('decodeQuotaInfo falls back to 0 for missing fields', () => {
    const quota = decodeQuotaInfo('eve', {})
    expect(quota.remaining).toBe(0n)
    expect(quota.limit).toBe(0n)
    expect(quota.resetBlock).toBe(0)
    expect(quota.tier).toBe('Basic')
  })

  it('decodeQuotaInfo codec fallback path', () => {
    const raw = makeCodecLike({})
    const quota = decodeQuotaInfo('eve', raw)
    expect(quota.tier).toBe('Basic')
  })

  it('decodeTokenBalance fallback — missing free/reserved/frozen', () => {
    const bal = decodeTokenBalance({ data: {} })
    expect(bal.free).toBe(0n)
    expect(bal.reserved).toBe(0n)
    expect(bal.frozen).toBe(0n)
    expect(bal.total).toBe(0n)
    expect(bal.transferable).toBe(0n)
  })

  it('decodeTokenBalance codec — missing all inner fields', () => {
    const raw = makeCodecLike({ data: {} })
    const bal = decodeTokenBalance(raw)
    expect(bal.free).toBe(0n)
  })

  it('decodeTokenBalance — flat structure without data wrapper', () => {
    const raw = { free: '500', reserved: '0', frozen: '0' }
    const bal = decodeTokenBalance(raw)
    expect(bal.free).toBe(500n)
  })
})

describe('retry — timeout deadline branch', () => {
  it('throws TimeoutError when deadline is exceeded between attempts', async () => {
    // Operation always fails; deadline expires before second attempt check
    const failOp = () => Promise.reject(new Error('fail'))

    // After first failure + 1ms delay, the deadline check at top of second iteration fires
    await expect(
      retry(failOp, { maxAttempts: 3, timeoutMs: 0, baseDelayMs: 1 }),
    ).rejects.toThrow(TimeoutError)
  })
})
