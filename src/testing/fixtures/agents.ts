import type { AgentId, AgentInfo } from '../../types/agent.js'

export const MOCK_AGENT_ID: AgentId = '0x' + 'ab'.repeat(32)
export const MOCK_OWNER_ADDRESS = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

export const mockAgent: AgentInfo = {
  id: MOCK_AGENT_ID,
  owner: MOCK_OWNER_ADDRESS,
  did: `did:clawchain:${MOCK_AGENT_ID}`,
  name: 'Test Agent',
  description: 'A test autonomous agent',
  endpoint: 'https://agent.example.com',
  capabilities: ['text', 'reasoning'],
  status: 'Active',
  registeredAt: 100,
  updatedAt: 200,
  reputationScore: 8500,
}

export const mockAgentList: AgentInfo[] = [
  mockAgent,
  {
    ...mockAgent,
    id: '0x' + 'cd'.repeat(32),
    name: 'Agent Two',
    did: `did:clawchain:${'0x' + 'cd'.repeat(32)}`,
    reputationScore: 7200,
  },
]
