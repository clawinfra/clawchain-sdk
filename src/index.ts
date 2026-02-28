/**
 * clawchain-sdk — TypeScript SDK for ClawChain
 *
 * The L1 blockchain for autonomous agents.
 *
 * @example
 * ```ts
 * import { ClawChainClient } from 'clawchain-sdk'
 *
 * const client = await ClawChainClient.connect({
 *   endpoint: 'wss://testnet.clawchain.win:9944',
 * })
 *
 * const agents = await client.agent.getOwnerAgents('5GrwvaEF...')
 * console.log(agents)
 *
 * await client.disconnect()
 * ```
 */

export { ClawChainClient, connect } from './client.js'
export type { ConnectOptions, HealthStatus } from './client.js'

export { AgentModule } from './modules/agent.js'
export { ReputationModule } from './modules/reputation.js'
export { QuotaModule } from './modules/quota.js'
export { TokenModule } from './modules/token.js'

export * from './types/index.js'

export {
  ClawChainError,
  ConnectionError,
  ChainMismatchError,
  AgentNotFoundError,
  InsufficientQuotaError,
  InsufficientBalanceError,
  MarketError,
  TransactionError,
  TimeoutError,
  NotFoundError,
  InvalidArgumentError,
} from './errors.js'

export { formatTokenAmount, normaliseH256, validateSS58, validateH256 } from './utils/address.js'
