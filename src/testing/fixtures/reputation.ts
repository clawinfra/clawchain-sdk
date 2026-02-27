import type { ReputationInfo } from '../../types/reputation.js'
import { MOCK_OWNER_ADDRESS } from './agents.js'

export const mockReputation: ReputationInfo = {
  accountId: MOCK_OWNER_ADDRESS,
  score: 8500,
  positiveCount: 42,
  negativeCount: 3,
  totalInteractions: 45,
  lastUpdatedBlock: 200,
}
