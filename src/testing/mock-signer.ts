/**
 * MockSigner — deterministic signer for unit tests
 *
 * Produces predictable signatures without requiring a real keypair.
 * Exported from @clawchain/sdk/testing for use in consumer test code.
 *
 * @example
 * ```ts
 * import { createMockSigner } from '@clawchain/sdk/testing'
 *
 * const signer = createMockSigner('5GrwvaEF...')
 * const result = await builder.signAndSend(signer)
 * ```
 */

import type { ClawChainSigner, SignerType } from '../signer/types.js'

/** Default test address (Alice in ss58 format) */
export const DEFAULT_MOCK_ADDRESS = '5GrwvaEFygLfN1kHicBMfFMBrp6AvIBCnJQzHkDkZCVEgPYz'

export class MockSigner implements ClawChainSigner {
  readonly type: SignerType = 'keypair'
  readonly address: string

  private readonly _publicKey: Uint8Array

  constructor(address: string = DEFAULT_MOCK_ADDRESS) {
    this.address = address
    // Deterministic pseudo-public key based on address bytes
    this._publicKey = new Uint8Array(32).fill(0)
    const encoded = new TextEncoder().encode(address)
    for (let i = 0; i < Math.min(encoded.length, 32); i++) {
      this._publicKey[i] = encoded[i] ?? 0
    }
  }

  /**
   * Produce a deterministic 64-byte signature (repeating address bytes).
   * Not cryptographically valid — for testing only.
   */
  async sign(message: Uint8Array): Promise<Uint8Array> {
    // Deterministic: XOR message bytes with address bytes, padded to 64 bytes
    const sig = new Uint8Array(64)
    const addrBytes = new TextEncoder().encode(this.address)
    for (let i = 0; i < 64; i++) {
      sig[i] = (message[i % message.length] ?? 0) ^ (addrBytes[i % addrBytes.length] ?? 0)
    }
    return sig
  }

  getPublicKey(): Uint8Array {
    return this._publicKey
  }
}

/**
 * Create a mock signer for use in tests.
 *
 * @param address - SS58 address for the signer (default: Alice's address)
 */
export function createMockSigner(address?: string): MockSigner {
  return new MockSigner(address)
}
