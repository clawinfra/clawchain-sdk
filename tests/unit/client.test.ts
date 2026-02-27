import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockClient } from '../../src/testing/mock-client.js'
import { mockAgent } from '../../src/testing/fixtures/agents.js'
import { mockReputation } from '../../src/testing/fixtures/reputation.js'
import { mockQuota } from '../../src/testing/fixtures/quota.js'

describe('MockClawChainClient', () => {
  const client = createMockClient({
    agents: [mockAgent],
    reputations: { [mockReputation.accountId]: mockReputation },
    quotas: { [mockQuota.accountId]: mockQuota },
    blockNumber: 99,
    chainName: 'ClawChain Testnet',
  })

  it('isConnected returns true', () => {
    expect(client.isConnected()).toBe(true)
  })

  it('health returns expected shape', async () => {
    const h = await client.health()
    expect(h.connected).toBe(true)
    expect(h.blockNumber).toBe(99)
    expect(h.chainName).toBe('ClawChain Testnet')
    expect(h.peersCount).toBe(5)
    expect(typeof h.blockHash).toBe('string')
  })

  it('disconnect resolves without error', async () => {
    await expect(client.disconnect()).resolves.toBeUndefined()
  })

  it('getApi returns the underlying API object', () => {
    const api = client.getApi()
    expect(api).toBeDefined()
    expect(typeof api).toBe('object')
  })

  it('exposes agent, reputation, quota, token modules', () => {
    expect(client.agent).toBeDefined()
    expect(client.reputation).toBeDefined()
    expect(client.quota).toBeDefined()
    expect(client.token).toBeDefined()
  })
})

describe('createMockClient defaults', () => {
  it('works with no options', async () => {
    const client = createMockClient()
    const h = await client.health()
    expect(h.blockNumber).toBe(42)
    expect(h.chainName).toBe('ClawChain Testnet')
  })
})
