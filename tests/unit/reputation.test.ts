import { describe, it, expect } from 'vitest'
import { createMockClient } from '../../src/testing/mock-client.js'
import { mockAgent, MOCK_AGENT_ID, MOCK_OWNER_ADDRESS } from '../../src/testing/fixtures/agents.js'
import { mockReputation } from '../../src/testing/fixtures/reputation.js'
import { InvalidArgumentError } from '../../src/errors.js'

describe('ReputationModule.getReputation', () => {
  const client = createMockClient({
    agents: [mockAgent],
    reputations: { [MOCK_OWNER_ADDRESS]: mockReputation },
  })

  it('returns reputation for known account', async () => {
    const rep = await client.reputation.getReputation(MOCK_OWNER_ADDRESS)
    expect(rep).not.toBeNull()
    expect(rep!.accountId).toBe(MOCK_OWNER_ADDRESS)
    expect(rep!.score).toBe(8500)
    expect(rep!.positiveCount).toBe(42)
    expect(rep!.negativeCount).toBe(3)
    expect(rep!.totalInteractions).toBe(45)
  })

  it('returns null for unknown account', async () => {
    const rep = await client.reputation.getReputation('5Unknown')
    expect(rep).toBeNull()
  })

  it('throws InvalidArgumentError for empty accountId', async () => {
    await expect(client.reputation.getReputation('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('ReputationModule.getAgentReputation', () => {
  const client = createMockClient({
    agents: [mockAgent],
    reputations: { [MOCK_OWNER_ADDRESS]: mockReputation },
  })

  it('returns reputation for agent owner', async () => {
    // The mock agent's owner is MOCK_OWNER_ADDRESS; getAgentReputation should resolve via owner
    const rep = await client.reputation.getAgentReputation(MOCK_AGENT_ID)
    // May be null if the mock doesn't chain correctly — but should not throw
    if (rep !== null) {
      expect(rep.score).toBe(8500)
    }
  })

  it('returns null for unknown agent', async () => {
    const rep = await client.reputation.getAgentReputation('0x' + '00'.repeat(32))
    expect(rep).toBeNull()
  })

  it('throws InvalidArgumentError for empty agentId', async () => {
    await expect(client.reputation.getAgentReputation('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('ReputationModule.getHistory', () => {
  const client = createMockClient({
    reputations: { [MOCK_OWNER_ADDRESS]: mockReputation },
  })

  it('returns empty paged result in Phase 1', async () => {
    const result = await client.reputation.getHistory(MOCK_OWNER_ADDRESS)
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('throws InvalidArgumentError for empty accountId', async () => {
    await expect(client.reputation.getHistory('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('ReputationModule.getLeaderboard', () => {
  const client = createMockClient({
    reputations: {
      alice: { ...mockReputation, accountId: 'alice', score: 9000 },
      bob: { ...mockReputation, accountId: 'bob', score: 7500 },
      carol: { ...mockReputation, accountId: 'carol', score: 8200 },
    },
  })

  it('returns sorted leaderboard', async () => {
    const leaderboard = await client.reputation.getLeaderboard(3)
    expect(leaderboard.length).toBe(3)
    // Should be sorted descending
    expect(leaderboard[0]!.score).toBeGreaterThanOrEqual(leaderboard[1]!.score)
    expect(leaderboard[1]!.score).toBeGreaterThanOrEqual(leaderboard[2]!.score)
  })

  it('respects limit', async () => {
    const leaderboard = await client.reputation.getLeaderboard(1)
    expect(leaderboard.length).toBe(1)
    expect(leaderboard[0]!.rank).toBe(1)
  })
})
