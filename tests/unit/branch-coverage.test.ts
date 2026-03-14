/**
 * Extra tests for remaining branch coverage gaps
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import { createMockApi } from '../../src/testing/mock-api.js'
import { createMockClient } from '../../src/testing/mock-client.js'
import { DidModule } from '../../src/modules/did.js'
import { AgentModule } from '../../src/modules/agent.js'
import { ReputationModule } from '../../src/modules/reputation.js'
import { TransactionBuilder } from '../../src/tx/builder.js'
import { KeypairSigner } from '../../src/signer/keypair-signer.js'
import { noopLogger } from '../../src/utils/logger.js'
import { mockAgent, MOCK_AGENT_ID, MOCK_OWNER_ADDRESS } from '../../src/testing/fixtures/agents.js'
import { DispatchError, SignerError } from '../../src/errors.js'

beforeAll(async () => {
  await cryptoWaitReady()
})

const TEST_MNEMONIC = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk'

// ── Agent.listAgents malformed entry ──────────────────────────────────────────

describe('AgentModule.listAgents with malformed entry', () => {
  it('skips entries that throw on decode', async () => {
    const mockApi = createMockApi({
      agents: [mockAgent],
    })
    // Inject a malformed entry where unwrap succeeds but decodeAgentInfo throws
    const agentReg = (mockApi as any).query.agentRegistry.agentRegistry
    const origEntries = agentReg.entries
    agentReg.entries = async () => {
      const good = await origEntries()
      // unwrap returns a value whose toJSON throws — decodeAgentInfo will throw
      good.push([
        { toString: () => 'agentRegistry,malformed' },
        {
          isNone: false,
          isEmpty: false,
          unwrap: () => ({
            toJSON: () => { throw new Error('decode error') },
          }),
        },
      ])
      // Also test the path where value has no unwrap (uses value directly)
      good.push([
        { toString: () => 'agentRegistry,noUnwrap' },
        {
          toJSON: () => { throw new Error('no toJSON') },
        },
      ])
      return good
    }

    const mod = new AgentModule(mockApi as ApiPromise, noopLogger)
    const result = await mod.listAgents()
    // Malformed entries should be skipped, only the good one remains
    expect(result.items.length).toBe(1)
    expect(result.items[0]!.id).toBe(MOCK_AGENT_ID)
  })
})

// ── ReputationModule.getAgentReputation catch path ────────────────────────────

describe('ReputationModule.getAgentReputation error path', () => {
  it('returns null when agentRegistry query throws', async () => {
    const mockApi = createMockApi({}) as any
    // Make agentRegistry.agentRegistry throw
    mockApi.query.agentRegistry.agentRegistry = async () => {
      throw new Error('storage error')
    }

    const mod = new ReputationModule(mockApi as ApiPromise, noopLogger)
    const rep = await mod.getAgentReputation('some-agent')
    expect(rep).toBeNull()
  })
})

// ── DidModule.resolve catch path ──────────────────────────────────────────────

describe('DidModule.resolve error path', () => {
  it('returns null when didRegistry query throws', async () => {
    const mockApi = createMockApi({}) as any
    mockApi.query.agentDid.didRegistry = async () => {
      throw new Error('storage unavailable')
    }

    const mod = new DidModule(mockApi as ApiPromise, noopLogger)
    const info = await mod.resolve('did:clawchain:broken')
    expect(info).toBeNull()
  })
})

// ── DidModule.getByAgentId catch path ─────────────────────────────────────────

describe('DidModule.getByAgentId error path', () => {
  it('returns null when agentDids query throws', async () => {
    const mockApi = createMockApi({}) as any
    mockApi.query.agentDid.agentDids = async () => {
      throw new Error('storage error')
    }

    const mod = new DidModule(mockApi as ApiPromise, noopLogger)
    const info = await mod.getByAgentId('some-id')
    expect(info).toBeNull()
  })
})

// ── DidModule.listByOwner catch path ──────────────────────────────────────────

describe('DidModule.listByOwner error path', () => {
  it('returns empty result when ownerDids query throws', async () => {
    const mockApi = createMockApi({}) as any
    mockApi.query.agentDid.ownerDids = async () => {
      throw new Error('storage unavailable')
    }

    const mod = new DidModule(mockApi as ApiPromise, noopLogger)
    const result = await mod.listByOwner(MOCK_OWNER_ADDRESS)
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })
})

// ── DidModule.requireDid happy path ───────────────────────────────────────────

describe('DidModule.requireDid happy path', () => {
  it('returns DidInfo for known DID', async () => {
    const mockApi = createMockApi({ agents: [mockAgent] }) as ApiPromise
    const mod = new DidModule(mockApi, noopLogger)
    const info = await mod.requireDid(mockAgent.did)
    expect(info).toBeDefined()
  })
})

// ── KeypairSigner.fromSeed invalid hex catches ───────────────────────────────

describe('KeypairSigner.fromSeed error handling', () => {
  it('throws SignerError for invalid hex characters', () => {
    // Valid length but invalid content won't throw at hex parsing in polkadot
    // but let's ensure the catch path works
    const invalidSeed = 'zzzz'.repeat(16) // 64 chars but not valid hex
    expect(() => KeypairSigner.fromSeed(invalidSeed)).toThrow(SignerError)
  })
})

// ── ReputationModule getAgentReputation branches ─────────────────────────────

describe('ReputationModule.getAgentReputation branches', () => {
  it('returns reputation when found by agentId directly', async () => {
    const client = createMockClient({
      agents: [mockAgent],
      reputations: {
        [MOCK_AGENT_ID]: {
          accountId: MOCK_AGENT_ID,
          score: 9000,
          positiveCount: 50,
          negativeCount: 2,
          totalInteractions: 52,
          lastUpdatedBlock: 100,
        },
      },
    })
    const rep = await client.reputation.getAgentReputation(MOCK_AGENT_ID)
    expect(rep).not.toBeNull()
    expect(rep!.score).toBe(9000)
  })

  it('falls back to owner address when agentId rep not found', async () => {
    const client = createMockClient({
      agents: [mockAgent],
      reputations: {
        [mockAgent.owner]: {
          accountId: mockAgent.owner,
          score: 7500,
          positiveCount: 30,
          negativeCount: 5,
          totalInteractions: 35,
          lastUpdatedBlock: 200,
        },
      },
    })
    const rep = await client.reputation.getAgentReputation(MOCK_AGENT_ID)
    expect(rep).not.toBeNull()
    expect(rep!.score).toBe(7500)
  })

  it('returns null when agent not found and no reputation', async () => {
    const client = createMockClient({ agents: [] })
    const rep = await client.reputation.getAgentReputation('0x' + '00'.repeat(32))
    expect(rep).toBeNull()
  })

  it('returns null when agent found but owner has no reputation', async () => {
    const client = createMockClient({
      agents: [mockAgent],
      reputations: {},
    })
    const rep = await client.reputation.getAgentReputation(MOCK_AGENT_ID)
    expect(rep).toBeNull()
  })
})

// ── TransactionBuilder.sign() with KeypairSigner tip/era ─────────────────────

describe('TransactionBuilder.sign with tip and era', () => {
  it('sign() with tip/era and KeypairSigner succeeds', async () => {
    const client = createMockClient()
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const hex = await client.token.transfer('5Bob', 100n).sign(signer, {
      tip: 5000n,
      era: 64,
      nonce: 10,
    })
    expect(typeof hex).toBe('string')
    expect(hex.startsWith('0x')).toBe(true)
  })
})

// ── DidModule branches for unwrap vs raw value ───────────────────────────────

describe('DidModule.getByAgentId result without unwrap', () => {
  it('handles result without unwrap (raw value)', async () => {
    const mockApi = createMockApi({ agents: [mockAgent] }) as any
    // Override agentDids to return raw value without unwrap
    mockApi.query.agentDid.agentDids = async (agentId: string) => {
      if (agentId === MOCK_AGENT_ID) {
        return {
          isNone: false,
          isEmpty: false,
          toJSON: () => ({ did: mockAgent.did }),
        }
      }
      return { isNone: true, isEmpty: true }
    }

    const mod = new DidModule(mockApi as ApiPromise, noopLogger)
    const info = await mod.getByAgentId(MOCK_AGENT_ID)
    expect(info).not.toBeNull()
  })
})

// ── Reputation leaderboard sorting ───────────────────────────────────────────

describe('ReputationModule.getLeaderboard sorting', () => {
  it('sorts by score descending', async () => {
    const client = createMockClient({
      reputations: {
        alice: { accountId: 'alice', score: 5000, positiveCount: 1, negativeCount: 0, totalInteractions: 1, lastUpdatedBlock: 1 },
        bob: { accountId: 'bob', score: 9000, positiveCount: 5, negativeCount: 0, totalInteractions: 5, lastUpdatedBlock: 5 },
        charlie: { accountId: 'charlie', score: 7000, positiveCount: 3, negativeCount: 1, totalInteractions: 4, lastUpdatedBlock: 4 },
      },
    })
    const leaderboard = await client.reputation.getLeaderboard(3)
    expect(leaderboard[0]!.score).toBe(9000)
    expect(leaderboard[1]!.score).toBe(7000)
    expect(leaderboard[2]!.score).toBe(5000)
  })
})

// ── Agent register() decoder branches ─────────────────────────────────────────

describe('AgentModule.register decoder branches', () => {
  it('register with minimal params exercises ?? branches', async () => {
    const client = createMockClient()
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)
    // Call register with capabilities undefined and description undefined
    const result = await client.agent.register({
      name: 'Agent',
      description: '',
      endpoint: 'https://x.com',
      // No capabilities
    }).signAndSend(signer)
    // The decoder fires but events is empty, so event?.data paths go to ??
    expect(result.success).toBe(true)
  })
})

// ── Agent update() with all params ────────────────────────────────────────────

describe('AgentModule.update decoder branches', () => {
  it('update with all params set exercises non-null paths', () => {
    const client = createMockClient()
    const builder = client.agent.update('0x' + 'ab'.repeat(32), {
      name: 'NewName',
      description: 'NewDesc',
      endpoint: 'https://new.com',
      capabilities: ['text', 'code'],
    })
    expect(builder).toBeDefined()
  })
})

// ── Reputation getReputation with value that has no unwrap ────────────────────

describe('ReputationModule.getReputation branches', () => {
  it('handles result that has no unwrap method', async () => {
    const mockApi = createMockApi({}) as any
    // Return a value with no unwrap
    mockApi.query.reputation.reputations = Object.assign(
      async (accountId: string) => {
        if (accountId === 'test-account') {
          return {
            isNone: false,
            isEmpty: false,
            // No unwrap method — code should use value directly
            toJSON: () => ({
              score: 5000,
              positiveCount: 10,
              negativeCount: 1,
              totalInteractions: 11,
              lastUpdatedBlock: 50,
            }),
          }
        }
        return { isNone: true, isEmpty: true }
      },
      { entries: async () => [] },
    )

    const mod = new ReputationModule(mockApi as ApiPromise, noopLogger)
    const rep = await mod.getReputation('test-account')
    expect(rep).not.toBeNull()
    expect(rep!.score).toBe(5000)
  })
})

// ── DidModule.listByOwner with non-array result ──────────────────────────────

describe('DidModule.listByOwner non-array result branch', () => {
  it('handles ownerDids returning non-array value', async () => {
    const mockApi = createMockApi({ agents: [mockAgent] }) as any
    mockApi.query.agentDid.ownerDids = async () => ({
      toJSON: () => 'not-an-array',
    })

    const mod = new DidModule(mockApi as ApiPromise, noopLogger)
    const result = await mod.listByOwner(MOCK_OWNER_ADDRESS)
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

// ── DidModule.resolve with value that has no unwrap ──────────────────────────

describe('DidModule.resolve without unwrap', () => {
  it('handles didRegistry result with no unwrap', async () => {
    const mockApi = createMockApi({ agents: [mockAgent] }) as any
    mockApi.query.agentDid.didRegistry = async (did: string) => {
      if (did === 'did:clawchain:test-direct') {
        return {
          isNone: false,
          isEmpty: false,
          toJSON: () => ({
            agentId: 'test-agent',
            owner: MOCK_OWNER_ADDRESS,
            document: { '@context': ['https://www.w3.org/ns/did/v1'], id: did, verificationMethod: [] },
            createdAtBlock: 1,
            updatedAtBlock: 1,
          }),
        }
      }
      return { isNone: true, isEmpty: true }
    }

    const mod = new DidModule(mockApi as ApiPromise, noopLogger)
    const info = await mod.resolve('did:clawchain:test-direct')
    expect(info).not.toBeNull()
  })
})

// ── builder.ts line ~204: dryRun signer failure ──────────────────────────────

describe('TransactionBuilder dryRun failure path', () => {
  it('returns success=false when signer fails during dryRun', async () => {
    const makeScalar = (v: unknown) => ({
      toJSON: () => v, toString: () => String(v), toNumber: () => Number(v), valueOf: () => v,
    })

    const api = {
      isConnected: true,
      runtimeVersion: { specVersion: makeScalar(1), transactionVersion: makeScalar(1) },
      genesisHash: { toHex: () => '0x00' },
      extrinsicVersion: 4,
      query: {
        system: {
          account: async () => { throw new Error('cannot query account') },
        },
      },
      rpc: {
        system: { accountNextIndex: async () => makeScalar(0) },
        payment: { queryInfo: async () => ({ toJSON: () => ({ partialFee: 0 }) }) },
      },
    } as unknown as ApiPromise

    const mockEx = {
      hash: { toHex: () => '0x00' },
      toHex: () => '0x00',
      toU8a: () => new Uint8Array(32),
      method: { toU8a: () => new Uint8Array(4) },
      sign: function () { return this },
      addSignature: function () { return this },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const result = await builder.dryRun(signer)
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

// ── builder decodeDispatchError with findMetaError throwing ───────────────────

describe('TransactionBuilder decodeDispatchError catch path', () => {
  it('falls back to unknown when findMetaError throws', async () => {
    const makeScalar = (v: unknown) => ({
      toJSON: () => v, toString: () => String(v), toNumber: () => Number(v), valueOf: () => v,
    })

    const api = {
      isConnected: true,
      runtimeVersion: { specVersion: makeScalar(1), transactionVersion: makeScalar(1) },
      genesisHash: { toHex: () => '0x00' },
      extrinsicVersion: 4,
      registry: {
        findMetaError: () => { throw new Error('no metadata') },
      },
      rpc: {
        system: { accountNextIndex: async () => makeScalar(0) },
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
              asFinalized: { toHex: () => '0x' + 'ee'.repeat(32) },
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
})

// ── builder handleResult with null result ─────────────────────────────────────

describe('TransactionBuilder handleResult edge', () => {
  it('handles callback with null result (no-op)', async () => {
    const makeScalar = (v: unknown) => ({
      toJSON: () => v, toString: () => String(v), toNumber: () => Number(v), valueOf: () => v,
    })

    const api = {
      isConnected: true,
      runtimeVersion: { specVersion: makeScalar(1), transactionVersion: makeScalar(1) },
      genesisHash: { toHex: () => '0x00' },
      extrinsicVersion: 4,
      rpc: {
        system: { accountNextIndex: async () => makeScalar(0) },
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
        // Fire null result first (no-op), then finalized
        setTimeout(() => cb(null), 0)
        setTimeout(() => {
          cb({
            status: {
              isBroadcast: false, isInBlock: false, isFinalized: true,
              isDropped: false, isInvalid: false,
              asFinalized: { toHex: () => '0x' + 'ff'.repeat(32) },
              type: 'Finalized',
            },
            events: [],
          })
        }, 10)
        return () => {}
      },
    }

    const builder = new TransactionBuilder(api, mockEx as never, undefined, noopLogger)
    const signer = KeypairSigner.fromMnemonic(TEST_MNEMONIC)

    const result = await builder.signAndSend(signer)
    expect(result.success).toBe(true)
  })
})
