/**
 * TransactionBuilder branch coverage tests — external signer paths,
 * error handling, dropped/invalid tx, dispatch errors, inBlock mode
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import { TransactionBuilder } from '../../src/tx/builder.js'
import { BatchBuilder } from '../../src/tx/batch.js'
import { ExternalSigner } from '../../src/signer/external-signer.js'
import { KeypairSigner } from '../../src/signer/keypair-signer.js'
import {
  DispatchError,
  NonceTooLowError,
  SignerError,
  InvalidArgumentError,
} from '../../src/errors.js'
import { createMockSigner } from '../../src/testing/mock-signer.js'
import { noopLogger } from '../../src/utils/logger.js'

beforeAll(async () => {
  await cryptoWaitReady()
})

const TEST_MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'
const TEST_ADDRESS = '5GrwvaEFygLfN1kHicBMfFMBrp6AvIBCnJQzHkDkZCVEgPYz'
const TEST_PUBKEY = new Uint8Array(32).fill(1)

/** Make a minimal mock API */
function makeMockApi(overrides: {
  fireDropped?: boolean
  fireInvalid?: boolean
  fireDispatchError?: boolean
  inBlockOnly?: boolean
  throwOnSign?: boolean
  nonceFail?: boolean
  paymentFail?: boolean
} = {}): ApiPromise {
  const makeScalar = (v: unknown) => ({
    toJSON: () => v, toString: () => String(v), toNumber: () => Number(v), valueOf: () => v,
  })

  const mockExtrinsic = {
    hash: { toHex: () => '0xabcdef01' + '00'.repeat(28) },
    toHex: () => '0xdeadbeef00',
    toU8a: () => new Uint8Array(32),
    method: { toU8a: () => new Uint8Array(4) },
    sign: function () { return this },
    addSignature: function () { return this },
    signAndSend: async (_acct: unknown, _opts: unknown, callback: (r: unknown) => void) => {
      if (overrides.throwOnSign) throw new Error('1010: Invalid transaction')

      if (overrides.inBlockOnly) {
        setTimeout(() => {
          callback({
            status: {
              isBroadcast: false, isInBlock: true, isFinalized: false,
              isDropped: false, isInvalid: false,
              asInBlock: { toHex: () => '0x' + 'aa'.repeat(32) },
              type: 'InBlock',
            },
            events: [],
          })
        }, 0)
        return () => {}
      }

      if (overrides.fireDropped) {
        setTimeout(() => {
          callback({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: false,
              isDropped: true, isInvalid: false,
              type: 'Dropped',
            },
            events: [],
          })
        }, 0)
        return () => {}
      }

      if (overrides.fireInvalid) {
        setTimeout(() => {
          callback({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: false,
              isDropped: false, isInvalid: true,
              type: 'Invalid',
            },
            events: [],
          })
        }, 0)
        return () => {}
      }

      if (overrides.fireDispatchError) {
        setTimeout(() => {
          callback({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'bb'.repeat(32) },
              type: 'Finalized',
            },
            events: [],
            dispatchError: {
              isModule: false,
              isBadOrigin: true,
              isCannotLookup: false,
            },
          })
        }, 0)
        return () => {}
      }

      // Normal finalized
      setTimeout(() => {
        callback({
          status: {
            isBroadcast: true, isInBlock: false, isFinalized: false,
            isDropped: false, isInvalid: false,
            type: 'Broadcast',
          },
          events: [],
        })
      }, 0)
      setTimeout(() => {
        callback({
          status: {
            isBroadcast: false, isInBlock: false, isFinalized: true,
            isDropped: false, isInvalid: false,
            asFinalized: { toHex: () => '0x' + 'bb'.repeat(32) },
            type: 'Finalized',
          },
          events: [
            {
              event: {
                section: 'balances',
                method: 'Transfer',
                data: { toJSON: () => ({ from: 'a', to: 'b', amount: '100' }) },
              },
              phase: {
                isApplyExtrinsic: true,
                asApplyExtrinsic: { toNumber: () => 0 },
              },
            },
          ],
        })
      }, 10)
      return () => {}
    },
    send: async (callback: (r: unknown) => void) => {
      setTimeout(() => {
        callback({
          status: {
            isBroadcast: false, isInBlock: false, isFinalized: true,
            isDropped: false, isInvalid: false,
            asFinalized: { toHex: () => '0x' + 'cc'.repeat(32) },
            type: 'Finalized',
          },
          events: [],
        })
      }, 10)
      return () => {}
    },
  }

  return {
    isConnected: true,
    runtimeChain: { toString: () => 'Test Chain' },
    runtimeVersion: {
      specVersion: { toString: () => '1', toNumber: () => 1 },
      transactionVersion: { toString: () => '1', toNumber: () => 1 },
    },
    genesisHash: { toHex: () => '0x' + '00'.repeat(32) },
    extrinsicVersion: 4,
    createType: (_type: string, _value?: unknown) => ({
      toRaw: () => ({ data: '0x' + '00'.repeat(64) }),
      toPayload: () => ({}),
    }),
    registry: {
      findMetaError: () => ({ section: 'test', name: 'TestError', docs: ['Test error'] }),
    },
    query: {
      system: {
        account: async () => ({ nonce: makeScalar(0), toJSON: () => ({ nonce: 0 }) }),
      },
    },
    rpc: {
      system: {
        accountNextIndex: overrides.nonceFail
          ? async () => { throw new Error('nonce unavailable') }
          : async () => makeScalar(3),
      },
      payment: overrides.paymentFail
        ? {
            queryInfo: async () => { throw new Error('payment RPC unavailable') },
          }
        : {
            queryInfo: async () => ({
              toJSON: () => ({ partialFee: '1000000000000', weight: { refTime: 100000000, proofSize: 0 } }),
            }),
          },
    },
    tx: new Proxy({} as Record<string, Record<string, () => unknown>>, {
      get: (_t, pallet: string) => {
        return new Proxy({} as Record<string, () => unknown>, {
          get: (_t2, _method: string) => {
            return (..._args: unknown[]) => mockExtrinsic
          },
        })
      },
    }),
    disconnect: async () => undefined,
  } as unknown as ApiPromise
}

// ── External signer path ──────────────────────────────────────────────────────

describe('TransactionBuilder with ExternalSigner', () => {
  it('sign() uses external signer path', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)

    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: async () => new Uint8Array(64).fill(0xff),
    })

    const hex = await builder.sign(signer)
    expect(typeof hex).toBe('string')
  })

  it('signAndSend() uses external signer path (send())', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)

    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: async () => new Uint8Array(64).fill(0xaa),
    })

    const result = await builder.signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('dryRun() with external signer uses addSignature path', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)

    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: async () => new Uint8Array(64).fill(0xbb),
    })

    const result = await builder.dryRun(signer)
    expect(result.success).toBe(true)
    expect(result.estimatedFee).toBeGreaterThan(0n)
  })
})

// ── Error paths ───────────────────────────────────────────────────────────────

describe('TransactionBuilder error handling', () => {
  it('rejects with DispatchError on dropped transaction', async () => {
    const api = makeMockApi({ fireDropped: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    await expect(builder.signAndSend(signer)).rejects.toThrow(DispatchError)
  })

  it('rejects with DispatchError on invalid transaction', async () => {
    const api = makeMockApi({ fireInvalid: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    await expect(builder.signAndSend(signer)).rejects.toThrow(DispatchError)
  })

  it('rejects with DispatchError on dispatch error in finalized block', async () => {
    const api = makeMockApi({ fireDispatchError: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    await expect(builder.signAndSend(signer)).rejects.toThrow(DispatchError)
  })

  it('rejects with NonceTooLowError when signAndSend throws 1010 error', async () => {
    const api = makeMockApi({ throwOnSign: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    await expect(builder.signAndSend(signer)).rejects.toThrow(NonceTooLowError)
  })

  it('falls back to nonce 0 when accountNextIndex fails', async () => {
    const api = makeMockApi({ nonceFail: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    // Should not throw — falls back to nonce 0
    const result = await builder.signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('dryRun falls back to static estimate when payment RPC fails', async () => {
    const api = makeMockApi({ paymentFail: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const result = await builder.dryRun(signer)
    expect(result.success).toBe(true)
    // Fallback static estimate: 1 CLW
    expect(result.estimatedFee).toBe(1_000_000_000_000n)
  })
})

// ── inBlock mode ──────────────────────────────────────────────────────────────

describe('TransactionBuilder inBlock mode', () => {
  it('signAndSendNoWait resolves on inBlock', async () => {
    const api = makeMockApi({ inBlockOnly: true })
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const result = await builder.signAndSendNoWait(signer)
    expect(result.success).toBe(true)
    expect(result.blockHash).toContain('aa')
  })
})

// ── broadcast status callback ─────────────────────────────────────────────────

describe('TransactionBuilder broadcast callback', () => {
  it('fires broadcast status', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const statuses: string[] = []
    await builder.signAndSend(signer, {
      onStatusChange: (s) => statuses.push(s.type),
    })
    expect(statuses).toContain('broadcast')
    expect(statuses).toContain('finalized')
  })

  it('decodes events from finalized block', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const result = await builder.signAndSend(signer)
    expect(Array.isArray(result.events)).toBe(true)
    // The mock fires a Transfer event in finalized
    const transferEvent = result.events.find((e) => e.method === 'Transfer')
    expect(transferEvent).toBeDefined()
    expect(transferEvent?.pallet).toBe('balances')
  })
})

// ── dispatch error decode paths ───────────────────────────────────────────────

describe('TransactionBuilder dispatch error decode paths', () => {
  it('decodes module error', async () => {
    const api = {
      ...makeMockApi(),
      registry: {
        findMetaError: () => ({ section: 'agentRegistry', name: 'AlreadyRegistered', docs: ['Already registered'] }),
      },
    } as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'bb'.repeat(32) },
              type: 'Finalized',
            },
            events: [],
            dispatchError: {
              isModule: true,
              isBadOrigin: false,
              isCannotLookup: false,
              asModule: {},
            },
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)
    await expect(builder.signAndSend(signer)).rejects.toThrow(DispatchError)
  })

  it('decodes CannotLookup error', async () => {
    const api = makeMockApi() as unknown as (ApiPromise & {
      tx: Record<string, Record<string, () => unknown>>
    })

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'bb'.repeat(32) },
              type: 'Finalized',
            },
            events: [],
            dispatchError: {
              isModule: false,
              isBadOrigin: false,
              isCannotLookup: true,
            },
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)
    await expect(builder.signAndSend(signer)).rejects.toThrow(DispatchError)
  })
})

// ── ExternalSigner fails during submit ────────────────────────────────────────

describe('TransactionBuilder external signer sign failure', () => {
  it('rejects with SignerError when external sign fails during submit', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()
    const builder = new TransactionBuilder(api, extrinsic as never, undefined, noopLogger)

    let callCount = 0
    const signer = new ExternalSigner({
      address: TEST_ADDRESS,
      publicKey: TEST_PUBKEY,
      signFn: async () => {
        callCount++
        throw new Error('hardware wallet rejected')
      },
    })

    await expect(builder.signAndSend(signer)).rejects.toThrow(SignerError)
  })
})

// ── decoder callback ──────────────────────────────────────────────────────────

describe('TransactionBuilder decoder', () => {
  it('calls decoder with events and returns data', async () => {
    const api = makeMockApi()
    const extrinsic = (api.tx as unknown as Record<string, Record<string, () => unknown>>)['balances']['transfer']()

    const decoder = (events: unknown[]) => ({ agentId: 'agent-001', eventCount: events.length })

    const builder = new TransactionBuilder(api, extrinsic as never, decoder, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const result = await builder.signAndSend(signer)
    expect(result.data?.agentId).toBe('agent-001')
    expect(typeof result.data?.eventCount).toBe('number')
  })
})

// ── dispatch error with inBlock + waitForFinalization=false ────────────────────

describe('TransactionBuilder inBlock dispatch error', () => {
  it('rejects on dispatch error in inBlock when not waiting for finalization', async () => {
    const api = makeMockApi() as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: true, isFinalized: false,
              isDropped: false, isInvalid: false,
              asInBlock: { toHex: () => '0x' + 'aa'.repeat(32) },
              type: 'InBlock',
            },
            events: [],
            dispatchError: {
              isModule: false,
              isBadOrigin: false,
              isCannotLookup: false,
            },
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    await expect(builder.signAndSendNoWait(signer)).rejects.toThrow(DispatchError)
  })
})

// ── null dispatchError is treated as success ──────────────────────────────────

describe('TransactionBuilder null dispatch error', () => {
  it('treats null dispatchError as success (no error)', async () => {
    const api = makeMockApi() as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'dd'.repeat(32) },
              type: 'Finalized',
            },
            events: [],
            dispatchError: null,
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    // null dispatchError = no error = success
    const result = await builder.signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('rejects on truthy unknown dispatchError shape', async () => {
    const api = makeMockApi() as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'dd'.repeat(32) },
              type: 'Finalized',
            },
            events: [],
            dispatchError: {
              isModule: false,
              isBadOrigin: false,
              isCannotLookup: false,
              toString: () => 'SomeOtherError',
            },
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    await expect(builder.signAndSend(signer)).rejects.toThrow(DispatchError)
  })
})

// ── events with non-iterable / null ───────────────────────────────────────────

describe('TransactionBuilder events edge cases', () => {
  it('handles null events gracefully', async () => {
    const api = makeMockApi() as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'ee'.repeat(32) },
              type: 'Finalized',
            },
            events: null,
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)
    const result = await builder.signAndSend(signer)
    expect(result.events).toEqual([])
    expect(result.success).toBe(true)
  })

  it('handles malformed event records gracefully', async () => {
    const api = makeMockApi() as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async (_a: unknown, _o: unknown, cb: (r: unknown) => void) => {
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'ff'.repeat(32) },
              type: 'Finalized',
            },
            events: [
              null, // malformed
              { event: null, phase: null }, // missing methods
              {
                event: { section: 'system', method: 'ExtrinsicSuccess', data: 'not-an-object' },
                phase: { isApplyExtrinsic: false },
              },
            ],
          })
        }, 0)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)
    const result = await builder.signAndSend(signer)
    // Malformed events are skipped, valid ones kept
    expect(result.success).toBe(true)
    expect(Array.isArray(result.events)).toBe(true)
  })
})

// ── non-Error throw from submit (covers else branch) ──────────────────────────

describe('TransactionBuilder generic submit error', () => {
  it('rejects with non-1010 error directly', async () => {
    const api = makeMockApi() as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(0),
      method: { toU8a: () => new Uint8Array(0) },
      sign: function () { return this },
      addSignature: function () { return this },
      signAndSend: async () => {
        throw new Error('Connection lost')
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)
    await expect(builder.signAndSend(signer)).rejects.toThrow('Connection lost')
  })
})
