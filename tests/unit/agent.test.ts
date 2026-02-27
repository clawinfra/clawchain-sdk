import { describe, it, expect } from 'vitest'
import { createMockClient } from '../../src/testing/mock-client.js'
import {
  mockAgent,
  mockAgentList,
  MOCK_AGENT_ID,
  MOCK_OWNER_ADDRESS,
} from '../../src/testing/fixtures/agents.js'
import { AgentNotFoundError, InvalidArgumentError } from '../../src/errors.js'

describe('AgentModule.getOwnerAgents', () => {
  const client = createMockClient({ agents: mockAgentList })

  it('returns agent IDs for a known owner', async () => {
    const ids = await client.agent.getOwnerAgents(MOCK_OWNER_ADDRESS)
    expect(Array.isArray(ids)).toBe(true)
    expect(ids).toContain(MOCK_AGENT_ID)
  })

  it('returns empty array for unknown owner', async () => {
    const ids = await client.agent.getOwnerAgents('5FakeAddressXXXXXX')
    expect(ids).toEqual([])
  })

  it('throws InvalidArgumentError for empty address', async () => {
    await expect(client.agent.getOwnerAgents('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('AgentModule.getAgent', () => {
  const client = createMockClient({ agents: [mockAgent] })

  it('returns agent info for known ID', async () => {
    const agent = await client.agent.getAgent(MOCK_AGENT_ID)
    expect(agent).not.toBeNull()
    expect(agent!.id).toBe(MOCK_AGENT_ID)
    expect(agent!.owner).toBe(MOCK_OWNER_ADDRESS)
    expect(agent!.name).toBe('Test Agent')
    expect(agent!.status).toBe('Active')
    expect(agent!.capabilities).toContain('text')
  })

  it('returns null for unknown agent ID', async () => {
    const agent = await client.agent.getAgent('0x' + '00'.repeat(32))
    expect(agent).toBeNull()
  })

  it('throws InvalidArgumentError for empty agentId', async () => {
    await expect(client.agent.getAgent('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('AgentModule.requireAgent', () => {
  const client = createMockClient({ agents: [mockAgent] })

  it('returns agent for known ID', async () => {
    const agent = await client.agent.requireAgent(MOCK_AGENT_ID)
    expect(agent.id).toBe(MOCK_AGENT_ID)
  })

  it('throws AgentNotFoundError for unknown ID', async () => {
    await expect(client.agent.requireAgent('0x' + '11'.repeat(32))).rejects.toThrow(
      AgentNotFoundError,
    )
  })
})

describe('AgentModule.resolveDid', () => {
  const client = createMockClient({ agents: [mockAgent] })

  it('returns agent for known DID', async () => {
    const agent = await client.agent.resolveDid(mockAgent.did)
    expect(agent).not.toBeNull()
    expect(agent!.id).toBe(MOCK_AGENT_ID)
  })

  it('returns null for unknown DID', async () => {
    const agent = await client.agent.resolveDid('did:clawchain:unknown')
    expect(agent).toBeNull()
  })

  it('throws InvalidArgumentError for empty DID', async () => {
    await expect(client.agent.resolveDid('')).rejects.toThrow(InvalidArgumentError)
  })
})

describe('AgentModule.listAgentsByOwner', () => {
  const client = createMockClient({ agents: mockAgentList })

  it('returns paginated agents for owner', async () => {
    const result = await client.agent.listAgentsByOwner(MOCK_OWNER_ADDRESS)
    expect(result.items.length).toBeGreaterThan(0)
    expect(typeof result.total).toBe('number')
    expect(typeof result.hasMore).toBe('boolean')
  })

  it('respects limit', async () => {
    const result = await client.agent.listAgentsByOwner(MOCK_OWNER_ADDRESS, { limit: 1 })
    expect(result.items.length).toBeLessThanOrEqual(1)
  })
})

describe('AgentModule.listAgents', () => {
  const client = createMockClient({ agents: mockAgentList })

  it('lists all agents', async () => {
    const result = await client.agent.listAgents()
    expect(result.items.length).toBe(mockAgentList.length)
  })

  it('respects pagination', async () => {
    const result = await client.agent.listAgents({ limit: 1, offset: 0 })
    expect(result.items.length).toBe(1)
    expect(result.hasMore).toBe(true)
  })
})

describe('AgentModule phase-2 stubs', () => {
  const client = createMockClient()

  it('register throws Phase 2 error', async () => {
    await expect(
      client.agent.register({ name: 'x', description: 'x', endpoint: 'http://x' }, null),
    ).rejects.toThrow(/Phase 2/)
  })

  it('update throws Phase 2 error', async () => {
    await expect(client.agent.update('0x' + 'aa'.repeat(32), {}, null)).rejects.toThrow(/Phase 2/)
  })

  it('deactivate throws Phase 2 error', async () => {
    await expect(client.agent.deactivate('0x' + 'aa'.repeat(32), null)).rejects.toThrow(/Phase 2/)
  })
})
