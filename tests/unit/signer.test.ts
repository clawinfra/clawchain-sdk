/**
 * Signer tests — KeypairSigner, ExternalSigner, DelegateSigner, MockSigner
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { KeypairSigner } from '../../src/signer/keypair-signer.js'
import { ExternalSigner } from '../../src/signer/external-signer.js'
import { DelegateSigner } from '../../src/signer/delegate-signer.js'
import { SignerError } from '../../src/errors.js'
import { MockSigner, createMockSigner, DEFAULT_MOCK_ADDRESS } from '../../src/testing/mock-signer.js'

// WASM crypto must be initialized before sr25519 operations
beforeAll(async () => {
  await cryptoWaitReady()
})

// ── KeypairSigner ─────────────────────────────────────────────────────────────

describe('KeypairSigner.fromMnemonic', () => {
  const ALICE_MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

  it('creates signer from valid mnemonic', () => {
    const signer = KeypairSigner.fromMnemonic(ALICE_MNEMONIC)
    expect(signer.type).toBe('keypair')
    expect(signer.address).toBeTruthy()
    expect(signer.address.startsWith('5')).toBe(true)
  })

  it('has deterministic address for same mnemonic', () => {
    const s1 = KeypairSigner.fromMnemonic(ALICE_MNEMONIC)
    const s2 = KeypairSigner.fromMnemonic(ALICE_MNEMONIC)
    expect(s1.address).toBe(s2.address)
  })

  it('throws SignerError for empty mnemonic', () => {
    expect(() => KeypairSigner.fromMnemonic('')).toThrow(SignerError)
    expect(() => KeypairSigner.fromMnemonic('   ')).toThrow(SignerError)
  })

  it('accepts derivation path', () => {
    const base = KeypairSigner.fromMnemonic(ALICE_MNEMONIC)
    const derived = KeypairSigner.fromMnemonic(ALICE_MNEMONIC, { derivationPath: '//Bob' })
    expect(base.address).not.toBe(derived.address)
  })

  it('supports ed25519 key type', () => {
    const signer = KeypairSigner.fromMnemonic(ALICE_MNEMONIC, { keyType: 'ed25519' })
    expect(signer.address).toBeTruthy()
  })

  it('accepts custom ss58 prefix', () => {
    const generic = KeypairSigner.fromMnemonic(ALICE_MNEMONIC, { ss58Prefix: 42 })
    const polkadot = KeypairSigner.fromMnemonic(ALICE_MNEMONIC, { ss58Prefix: 0 })
    // Different prefix → different encoded address (same key, different format)
    expect(generic.address).not.toBe(polkadot.address)
  })
})

describe('KeypairSigner.fromSeed', () => {
  const SEED_HEX = '0101010101010101010101010101010101010101010101010101010101010101'

  it('creates signer from 32-byte hex seed', () => {
    const signer = KeypairSigner.fromSeed(SEED_HEX)
    expect(signer.type).toBe('keypair')
    expect(signer.address).toBeTruthy()
  })

  it('accepts 0x-prefixed seed', () => {
    const s1 = KeypairSigner.fromSeed(SEED_HEX)
    const s2 = KeypairSigner.fromSeed('0x' + SEED_HEX)
    expect(s1.address).toBe(s2.address)
  })

  it('throws SignerError for empty seed', () => {
    expect(() => KeypairSigner.fromSeed('')).toThrow(SignerError)
  })

  it('throws SignerError for wrong-length seed', () => {
    expect(() => KeypairSigner.fromSeed('abcd')).toThrow(SignerError)
  })

  it('returns 32-byte public key', () => {
    const signer = KeypairSigner.fromSeed(SEED_HEX)
    const pubkey = signer.getPublicKey()
    expect(pubkey).toBeInstanceOf(Uint8Array)
    expect(pubkey.length).toBe(32)
  })
})

describe('KeypairSigner.create', () => {
  const MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'
  const SEED_HEX = '0202020202020202020202020202020202020202020202020202020202020202'

  it('creates from mnemonic opts', () => {
    const signer = KeypairSigner.create({ mnemonic: MNEMONIC })
    expect(signer.address).toBeTruthy()
  })

  it('creates from seed opts', () => {
    const signer = KeypairSigner.create({ seed: SEED_HEX })
    expect(signer.address).toBeTruthy()
  })

  it('throws if neither mnemonic nor seed provided', () => {
    expect(() => KeypairSigner.create({})).toThrow(SignerError)
  })
})

describe('KeypairSigner.sign', () => {
  const MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

  it('signs a message (returns Uint8Array ≥ 64 bytes)', async () => {
    const signer = KeypairSigner.fromMnemonic(MNEMONIC)
    const msg = new TextEncoder().encode('hello clawchain')
    const sig = await signer.sign(msg)
    expect(sig).toBeInstanceOf(Uint8Array)
    expect(sig.length).toBeGreaterThanOrEqual(64)
  })

  it('signature differs for different messages', async () => {
    const signer = KeypairSigner.fromMnemonic(MNEMONIC)
    const sig1 = await signer.sign(new TextEncoder().encode('msg1'))
    const sig2 = await signer.sign(new TextEncoder().encode('msg2'))
    expect(Buffer.from(sig1).toString('hex')).not.toBe(Buffer.from(sig2).toString('hex'))
  })

  it('exposes getKeyringPair()', () => {
    const signer = KeypairSigner.fromMnemonic(MNEMONIC)
    const pair = signer.getKeyringPair()
    expect(pair).toBeDefined()
    expect(pair.address).toBe(signer.address)
  })
})

// ── ExternalSigner ────────────────────────────────────────────────────────────

describe('ExternalSigner', () => {
  const TEST_ADDRESS = '5GrwvaEFygLfN1kHicBMfFMBrp6AvIBCnJQzHkDkZCVEgPYz'
  const TEST_PUBKEY = new Uint8Array(32).fill(7)
  const mockSignFn = vi.fn(async (_msg: Uint8Array) => new Uint8Array(64).fill(0xab))

  it('creates external signer with correct type', () => {
    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: mockSignFn,
    })
    expect(signer.type).toBe('external')
    expect(signer.address).toBe(TEST_ADDRESS)
  })

  it('returns supplied public key', () => {
    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: mockSignFn,
    })
    expect(signer.getPublicKey()).toBe(TEST_PUBKEY)
  })

  it('delegates signing to callback', async () => {
    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: mockSignFn,
    })
    const msg = new TextEncoder().encode('test message')
    const sig = await signer.sign(msg)
    expect(sig).toEqual(new Uint8Array(64).fill(0xab))
    expect(mockSignFn).toHaveBeenCalledWith(msg)
  })

  it('wraps callback errors in SignerError', async () => {
    const failSignFn = vi.fn(async () => { throw new Error('hardware error') })
    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: failSignFn,
    })
    await expect(signer.sign(new Uint8Array(1))).rejects.toThrow(SignerError)
  })

  it('throws SignerError for missing address', () => {
    expect(() => new ExternalSigner({
      address: '',
      publicKey: TEST_PUBKEY,
      signFn: mockSignFn,
    })).toThrow(SignerError)
  })

  it('throws SignerError for empty publicKey', () => {
    expect(() => new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: new Uint8Array(0),
      signFn: mockSignFn,
    })).toThrow(SignerError)
  })

  it('throws SignerError if signFn is not a function', () => {
    expect(() => new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: null as unknown as ExternalSigner['sign'],
    })).toThrow(SignerError)
  })
})

// ── DelegateSigner ────────────────────────────────────────────────────────────

describe('DelegateSigner', () => {
  const MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'
  let delegate: KeypairSigner
  const PRINCIPAL = 'did:clawchain:0x' + 'aa'.repeat(32)

  beforeAll(async () => {
    await cryptoWaitReady()
    delegate = KeypairSigner.fromMnemonic(MNEMONIC)
  })

  it('creates delegate signer with correct type', () => {
    const signer = new DelegateSigner({ delegate, principal: PRINCIPAL })
    expect(signer.type).toBe('delegate')
    expect(signer.principal).toBe(PRINCIPAL)
    expect(signer.expiresAtBlock).toBeUndefined()
  })

  it('address is the delegate address', () => {
    const signer = new DelegateSigner({ delegate, principal: PRINCIPAL })
    expect(signer.address).toBe(delegate.address)
  })

  it('delegates signing to underlying signer', async () => {
    // Use ExternalSigner as delegate for deterministic comparison
    const signFn = async (m: Uint8Array) => new Uint8Array(64).fill(m[0] ?? 0)
    const extDelegate = new ExternalSigner({
      address: delegate.address,
      publicKey: delegate.getPublicKey(),
      signFn,
    })
    const signer = new DelegateSigner({ delegate: extDelegate, principal: PRINCIPAL })
    const msg = new TextEncoder().encode('test msg')
    const sig = await signer.sign(msg)
    // Should have called signFn, so first byte of sig = first byte of msg
    expect(sig.length).toBe(64)
    const expectedFill = msg[0] ?? 0
    expect(sig[0]).toBe(expectedFill)
  })

  it('public key is the delegate public key', () => {
    const signer = new DelegateSigner({ delegate, principal: PRINCIPAL })
    expect(signer.getPublicKey()).toEqual(delegate.getPublicKey())
  })

  it('accepts optional expiresAtBlock', () => {
    const signer = new DelegateSigner({
      delegate,
      principal: PRINCIPAL,
      expiresAtBlock: 99999,
    })
    expect(signer.expiresAtBlock).toBe(99999)
  })

  it('throws SignerError for missing delegate', () => {
    expect(() => new DelegateSigner({
      delegate: null as unknown as KeypairSigner,
      principal: PRINCIPAL,
    })).toThrow(SignerError)
  })

  it('throws SignerError for missing principal', () => {
    expect(() => new DelegateSigner({
      delegate,
      principal: '',
    })).toThrow(SignerError)
  })
})

// ── MockSigner ────────────────────────────────────────────────────────────────

describe('MockSigner', () => {
  it('uses default address when none provided', () => {
    const signer = new MockSigner()
    expect(signer.address).toBe(DEFAULT_MOCK_ADDRESS)
  })

  it('accepts custom address', () => {
    const signer = new MockSigner('5Custom...')
    expect(signer.address).toBe('5Custom...')
  })

  it('type is keypair', () => {
    const signer = new MockSigner()
    expect(signer.type).toBe('keypair')
  })

  it('sign() returns 64-byte Uint8Array', async () => {
    const signer = new MockSigner()
    const sig = await signer.sign(new TextEncoder().encode('test'))
    expect(sig).toBeInstanceOf(Uint8Array)
    expect(sig.length).toBe(64)
  })

  it('sign() is deterministic', async () => {
    const signer = new MockSigner()
    const msg = new TextEncoder().encode('same')
    const sig1 = await signer.sign(msg)
    const sig2 = await signer.sign(msg)
    expect(Buffer.from(sig1).toString('hex')).toBe(Buffer.from(sig2).toString('hex'))
  })

  it('getPublicKey() returns 32-byte array', () => {
    const signer = new MockSigner()
    const pk = signer.getPublicKey()
    expect(pk).toBeInstanceOf(Uint8Array)
    expect(pk.length).toBe(32)
  })

  it('createMockSigner factory works', () => {
    const signer = createMockSigner('5TestAddr')
    expect(signer.address).toBe('5TestAddr')
    expect(signer instanceof MockSigner).toBe(true)
  })

  it('createMockSigner with no args uses default address', () => {
    const signer = createMockSigner()
    expect(signer.address).toBe(DEFAULT_MOCK_ADDRESS)
  })
})
