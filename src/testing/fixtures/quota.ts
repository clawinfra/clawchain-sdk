import type { QuotaInfo } from '../../types/quota.js'
import { MOCK_OWNER_ADDRESS } from './agents.js'

export const mockQuota: QuotaInfo = {
  accountId: MOCK_OWNER_ADDRESS,
  remaining: 1_000_000n,
  limit: 5_000_000n,
  resetBlock: 1000,
  tier: 'Standard',
}
