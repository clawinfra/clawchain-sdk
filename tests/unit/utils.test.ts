import { describe, it, expect } from 'vitest'
import {
  validateSS58,
  validateH256,
  normaliseH256,
  formatTokenAmount,
} from '../../src/utils/address.js'
import { InvalidArgumentError } from '../../src/errors.js'
import { retry, sleep } from '../../src/utils/retry.js'
import { decodeTokenBalance, decodeReputationInfo, decodeQuotaInfo, decodeAgentInfo } from '../../src/utils/codec.js'

describe('address utils', () => {
  describe('validateSS58', () => {
    it('accepts a valid SS58 address', () => {
      expect(() => validateSS58('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).not.toThrow()
    })
    it('throws for empty string', () => {
      expect(() => validateSS58('')).toThrow(InvalidArgumentError)
    })
    it('throws for too-short string', () => {
      expect(() => validateSS58('abc')).toThrow(InvalidArgumentError)
    })
  })

  describe('validateH256', () => {
    it('accepts valid 0x-prefixed H256', () => {
      expect(() => validateH256('0x' + 'ab'.repeat(32))).not.toThrow()
    })
    it('accepts valid unprefixed H256', () => {
      expect(() => validateH256('ab'.repeat(32))).not.toThrow()
    })
    it('throws for invalid hex', () => {
      expect(() => validateH256('not-hex')).toThrow(InvalidArgumentError)
    })
  })

  describe('normaliseH256', () => {
    it('lowercases and adds 0x prefix', () => {
      const result = normaliseH256('ABCD' + '00'.repeat(30))
      expect(result.startsWith('0x')).toBe(true)
      expect(result).toBe(result.toLowerCase())
    })
    it('handles already prefixed input', () => {
      const hex = '0x' + 'ab'.repeat(32)
      expect(normaliseH256(hex)).toBe(hex)
    })
  })

  describe('formatTokenAmount', () => {
    it('formats whole number', () => {
      expect(formatTokenAmount(1_000_000_000_000_000_000n)).toBe('1')
    })
    it('formats fractional amount', () => {
      const result = formatTokenAmount(1_500_000_000_000_000_000n)
      expect(result).toBe('1.5')
    })
    it('formats zero', () => {
      expect(formatTokenAmount(0n)).toBe('0')
    })
  })
})

describe('retry utility', () => {
  it('returns result on first success', async () => {
    const result = await retry(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('retries on failure and succeeds', async () => {
    let attempts = 0
    const result = await retry(
      () => {
        attempts++
        if (attempts < 3) return Promise.reject(new Error('fail'))
        return Promise.resolve('ok')
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    )
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('throws after all attempts fail', async () => {
    await expect(
      retry(() => Promise.reject(new Error('always fail')), {
        maxAttempts: 2,
        baseDelayMs: 1,
      }),
    ).rejects.toThrow('always fail')
  })
})

describe('sleep', () => {
  it('resolves after delay', async () => {
    const start = Date.now()
    await sleep(10)
    expect(Date.now() - start).toBeGreaterThanOrEqual(5)
  })
})

describe('codec helpers', () => {
  describe('decodeTokenBalance', () => {
    it('decodes from plain object', () => {
      const raw = { data: { free: '1000', reserved: '0', frozen: '0' } }
      const bal = decodeTokenBalance(raw)
      expect(bal.free).toBe(1000n)
      expect(bal.reserved).toBe(0n)
      expect(bal.total).toBe(1000n)
      expect(bal.transferable).toBe(1000n)
    })

    it('handles frozen > free correctly', () => {
      const raw = { data: { free: '100', reserved: '0', frozen: '200' } }
      const bal = decodeTokenBalance(raw)
      expect(bal.transferable).toBe(0n)
    })
  })

  describe('decodeReputationInfo', () => {
    it('decodes from plain object', () => {
      const raw = {
        score: 8500,
        positiveCount: 10,
        negativeCount: 2,
        totalInteractions: 12,
        lastUpdatedBlock: 100,
      }
      const rep = decodeReputationInfo('alice', raw)
      expect(rep.accountId).toBe('alice')
      expect(rep.score).toBe(8500)
    })
  })

  describe('decodeQuotaInfo', () => {
    it('decodes from plain object', () => {
      const raw = { remaining: '1000000', limit: '5000000', resetBlock: 1000, tier: 'Standard' }
      const quota = decodeQuotaInfo('alice', raw)
      expect(quota.remaining).toBe(1_000_000n)
      expect(quota.tier).toBe('Standard')
    })
  })

  describe('decodeAgentInfo', () => {
    it('decodes from plain object', () => {
      const raw = {
        owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        name: 'Test',
        description: 'Desc',
        endpoint: 'http://x',
        capabilities: ['text'],
        status: 'Active',
        registeredAt: 1,
        updatedAt: 2,
        reputationScore: 100,
      }
      const agent = decodeAgentInfo('0x' + 'ab'.repeat(32), raw)
      expect(agent.name).toBe('Test')
      expect(agent.status).toBe('Active')
    })
  })
})
