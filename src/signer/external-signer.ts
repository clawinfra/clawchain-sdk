/**
 * ExternalSigner — delegates signing to an external callback
 *
 * Use this for hardware wallets, browser extensions, or any signing
 * mechanism where the private key is not directly accessible.
 *
 * @example
 * ```ts
 * const signer = new ExternalSigner({
 *   address: '5GrwvaEF...',
 *   publicKey: pubKeyBytes,
 *   signFn: async (msg) => hardwareWallet.sign(msg),
 * })
 * ```
 */

import { SignerError } from '../errors.js'
import type { ClawChainSigner, ExternalSignerOpts, SignerType } from './types.js'

export class ExternalSigner implements ClawChainSigner {
  readonly type: SignerType = 'external'
  readonly address: string

  private readonly publicKey: Uint8Array
  private readonly signFn: ExternalSignerOpts['signFn']

  constructor(opts: ExternalSignerOpts) {
    if (!opts.address) {
      throw new SignerError('ExternalSigner: address is required')
    }
    if (!opts.publicKey || opts.publicKey.length === 0) {
      throw new SignerError('ExternalSigner: publicKey is required')
    }
    if (typeof opts.signFn !== 'function') {
      throw new SignerError('ExternalSigner: signFn must be a function')
    }
    this.address = opts.address
    this.publicKey = opts.publicKey
    this.signFn = opts.signFn
  }

  /** Delegate signing to the external callback */
  async sign(message: Uint8Array): Promise<Uint8Array> {
    try {
      return await this.signFn(message)
    } catch (err) {
      throw new SignerError('External sign callback failed', err)
    }
  }

  /** Return the public key supplied at construction */
  getPublicKey(): Uint8Array {
    return this.publicKey
  }
}
