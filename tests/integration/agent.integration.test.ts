/**
 * Agent module integration tests
 * Run with: pnpm test:integration
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { getClient, teardown, isEndpointReachable } from './setup.js'

let skip = false

beforeAll(async () => {
  skip = !(await isEndpointReachable())
})

afterAll(teardown)

describe('AgentModule integration', () => {
  it('connects to testnet and checks health', async () => {
    if (skip) return

    const client = await getClient()
    const health = await client.health()
    expect(health.connected).toBe(true)
    expect(health.blockNumber).toBeGreaterThan(0)
  })

  it('getOwnerAgents returns array for any address', async () => {
    if (skip) return

    const client = await getClient()
    // Use a null-ish address — should return empty array, not throw
    const ids = await client.agent.getOwnerAgents('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
    expect(Array.isArray(ids)).toBe(true)
  })
})
