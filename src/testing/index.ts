/**
 * @clawchain/sdk/testing — Mock utilities for unit testing
 *
 * Import from this entry point only in test code.
 * Zero production overhead — this module is not included in the main bundle.
 */

export { createMockClient } from './mock-client.js'
export type { MockClientOptions, MockClawChainClient } from './mock-client.js'
export { createMockApi } from './mock-api.js'
export type { MockApiOptions } from './mock-api.js'

// Fixtures
export { mockAgent, mockAgentList, MOCK_AGENT_ID, MOCK_OWNER_ADDRESS } from './fixtures/agents.js'
export { mockReputation } from './fixtures/reputation.js'
export { mockQuota } from './fixtures/quota.js'
