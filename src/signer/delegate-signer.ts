/**
 * DelegateSigner — agent-to-agent delegation signer
 *
 * A DelegateSigner wraps another signer (the delegate) and tracks
 * which principal (delegating agent) authorized it. Useful for
 * agent-to-agent delegation flows where an agent acts on behalf of
 * another.
 *
 * @example
 * ```ts
 * const delegateSigner = new DelegateSigner({
 *   delegate: agentKeypairSigner,
 *   principal: 'did:clawchain:abc123',
 * })
 * ```
 */

import { SignerError } from '../errors.js'
import type { ClawChainSigner, SignerType } from './types.js'

export interface DelegateSignerOpts {
  /** The signer that actually performs the signing */
  delegate: ClawChainSigner
  /** The principal (agent DID or address) that granted delegation */
  principal: string
  /** Optional expiry block number (informational only) */
  expiresAtBlock?: number
}

export class DelegateSigner implements ClawChainSigner {
  readonly type: SignerType = 'delegate'

  /** The principal that granted this delegation */
  readonly principal: string
  /** Optional block at which delegation expires */
  readonly expiresAtBlock: number | undefined

  private readonly delegate: ClawChainSigner

  constructor(opts: DelegateSignerOpts) {
    if (!opts.delegate) {
      throw new SignerError('DelegateSigner: delegate signer is required')
    }
    if (!opts.principal) {
      throw new SignerError('DelegateSigner: principal is required')
    }
    this.delegate = opts.delegate
    this.principal = opts.principal
    this.expiresAtBlock = opts.expiresAtBlock
  }

  /** Address is the delegate's address (the actual signer) */
  get address(): string {
    return this.delegate.address
  }

  /** Delegate signing to the underlying signer */
  async sign(message: Uint8Array): Promise<Uint8Array> {
    return this.delegate.sign(message)
  }

  /** Public key from the underlying delegate signer */
  getPublicKey(): Uint8Array {
    return this.delegate.getPublicKey()
  }
}
