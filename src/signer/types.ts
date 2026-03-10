/**
 * Signer abstraction types for ClawChain SDK v2
 *
 * The SDK never handles private keys directly — all signing is delegated
 * to a ClawChainSigner implementation.
 */

/** Supported key types */
export type KeyType = 'sr25519' | 'ed25519'

/** Signer type discriminator */
export type SignerType = 'keypair' | 'external' | 'delegate'

/**
 * Core signer interface — all signers implement this.
 *
 * @example
 * ```ts
 * import { KeypairSigner } from '@clawchain/sdk/signer'
 *
 * const signer = await KeypairSigner.fromMnemonic('word1 word2 ...')
 * const result = await client.token.transfer(to, 100n).signAndSend(signer)
 * ```
 */
export interface ClawChainSigner {
  /** SS58-encoded address of this signer */
  readonly address: string
  /** Signer type for debugging/logging */
  readonly type: SignerType
  /** Sign raw bytes and return the signature */
  sign(message: Uint8Array): Promise<Uint8Array>
  /** Get the public key bytes */
  getPublicKey(): Uint8Array
}

/** Options for creating a KeypairSigner */
export interface KeypairSignerOpts {
  /** BIP39 mnemonic (12 or 24 words) */
  mnemonic?: string
  /** Raw seed hex (alternative to mnemonic, without 0x prefix) */
  seed?: string
  /** Key type (default: sr25519) */
  keyType?: KeyType
  /** Derivation path (e.g. //Alice, //Bob//stash) */
  derivationPath?: string
  /** SS58 prefix (default: 42 for substrate generic) */
  ss58Prefix?: number
}

/** Callback for external signing (hardware wallets, browser extensions) */
export type ExternalSignFn = (message: Uint8Array) => Promise<Uint8Array>

/** Options for creating an ExternalSigner */
export interface ExternalSignerOpts {
  /** SS58 address of the signer */
  address: string
  /** Public key bytes */
  publicKey: Uint8Array
  /** Sign callback */
  signFn: ExternalSignFn
}
