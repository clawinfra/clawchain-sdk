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

// Modules
export { AgentModule } from './modules/agent.js'
export { DidModule } from './modules/did.js'
export { ReputationModule } from './modules/reputation.js'
export { QuotaModule } from './modules/quota.js'
export { TokenModule } from './modules/token.js'

// TX builder (v2)
export { TransactionBuilder } from './tx/builder.js'
export { BatchBuilder } from './tx/batch.js'
export type { SubmitOpts, TxStatus, DryRunResult } from './tx/types.js'

// Signer abstraction (v2)
export { KeypairSigner } from './signer/keypair-signer.js'
export { ExternalSigner } from './signer/external-signer.js'
export { DelegateSigner } from './signer/delegate-signer.js'
export type {
  ClawChainSigner,
  KeyType,
  SignerType,
  KeypairSignerOpts,
  ExternalSignerOpts,
  ExternalSignFn,
} from './signer/types.js'
export type { DelegateSignerOpts } from './signer/delegate-signer.js'

// Types
export * from './types/index.js'

// Errors
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
  // v2 errors
  SignerError,
  DispatchError,
  TxTimeoutError,
  NonceTooLowError,
  TaskNotFoundError,
  ServiceNotFoundError,
  ProposalNotFoundError,
  IbcError,
  MessagingError,
  EmergencyPauseError,
} from './errors.js'

export { formatTokenAmount, normaliseH256, validateSS58, validateH256 } from './utils/address.js'
