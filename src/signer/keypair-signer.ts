/**
 * KeypairSigner — signs transactions using a local sr25519/ed25519 keypair
 *
 * Derives the keypair from a mnemonic or raw seed using @polkadot/keyring.
 */

import { Keyring } from '@polkadot/keyring'
import type { KeyringPair } from '@polkadot/keyring/types'
import { SignerError } from '../errors.js'
import type { ClawChainSigner, KeypairSignerOpts, KeyType, SignerType } from './types.js'

export class KeypairSigner implements ClawChainSigner {
  readonly type: SignerType = 'keypair'

  private readonly pair: KeyringPair

  private constructor(pair: KeyringPair) {
    this.pair = pair
  }

  /** SS58-encoded address */
  get address(): string {
    return this.pair.address
  }

  /**
   * Create a KeypairSigner from a BIP39 mnemonic.
   *
   * @param mnemonic - 12 or 24 word BIP39 mnemonic
   * @param opts - Optional key type, derivation path, SS58 prefix
   */
  static fromMnemonic(mnemonic: string, opts?: Omit<KeypairSignerOpts, 'mnemonic' | 'seed'>): KeypairSigner {
    if (!mnemonic || !mnemonic.trim()) {
      throw new SignerError('Mnemonic must not be empty')
    }
    const keyType: KeyType = opts?.keyType ?? 'sr25519'
    const keyring = new Keyring({ type: keyType, ss58Format: opts?.ss58Prefix ?? 42 })

    let uri = mnemonic.trim()
    if (opts?.derivationPath) {
      uri = `${uri}${opts.derivationPath}`
    }

    let pair: KeyringPair
    try {
      pair = keyring.addFromUri(uri)
    } catch (err) {
      throw new SignerError('Invalid mnemonic or derivation path', err)
    }

    return new KeypairSigner(pair)
  }

  /**
   * Create a KeypairSigner from a raw seed hex string (without 0x prefix).
   *
   * @param seed - 32-byte seed as hex string
   * @param opts - Optional key type, SS58 prefix
   */
  static fromSeed(seed: string, opts?: Omit<KeypairSignerOpts, 'mnemonic' | 'seed'>): KeypairSigner {
    if (!seed || !seed.trim()) {
      throw new SignerError('Seed must not be empty')
    }
    const stripped = seed.startsWith('0x') ? seed.slice(2) : seed
    if (stripped.length !== 64) {
      throw new SignerError(`Seed must be 32 bytes (64 hex chars), got ${stripped.length}`)
    }

    const keyType: KeyType = opts?.keyType ?? 'sr25519'
    const keyring = new Keyring({ type: keyType, ss58Format: opts?.ss58Prefix ?? 42 })

    let pair: KeyringPair
    try {
      pair = keyring.addFromUri(`0x${stripped}`)
    } catch (err) {
      throw new SignerError('Invalid seed hex', err)
    }

    return new KeypairSigner(pair)
  }

  /**
   * Create from KeypairSignerOpts — convenience factory.
   */
  static create(opts: KeypairSignerOpts): KeypairSigner {
    if (opts.mnemonic) {
      return KeypairSigner.fromMnemonic(opts.mnemonic, opts)
    }
    if (opts.seed) {
      return KeypairSigner.fromSeed(opts.seed, opts)
    }
    throw new SignerError('Either mnemonic or seed must be provided')
  }

  /** Sign a raw message with the keypair */
  async sign(message: Uint8Array): Promise<Uint8Array> {
    try {
      return this.pair.sign(message)
    } catch (err) {
      throw new SignerError('Signing failed', err)
    }
  }

  /** Get the raw public key bytes */
  getPublicKey(): Uint8Array {
    return this.pair.publicKey
  }

  /** Expose the underlying keyring pair (for @polkadot/api extrinsic signing) */
  getKeyringPair(): KeyringPair {
    return this.pair
  }
}
