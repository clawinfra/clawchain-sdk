/**
 * @clawchain/sdk/signer — Signer abstraction for ClawChain SDK v2
 *
 * @example
 * ```ts
 * import { KeypairSigner } from '@clawchain/sdk/signer'
 * // or
 * import { KeypairSigner } from '@clawchain/sdk'
 * ```
 */

export { KeypairSigner } from './keypair-signer.js'
export { ExternalSigner } from './external-signer.js'
export { DelegateSigner } from './delegate-signer.js'
export type {
  ClawChainSigner,
  KeyType,
  SignerType,
  KeypairSignerOpts,
  ExternalSignerOpts,
  ExternalSignFn,
} from './types.js'
export type { DelegateSignerOpts } from './delegate-signer.js'
