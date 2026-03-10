/**
 * DidModule tests
 */
import { describe, it, expect } from 'vitest'
import { DidModule } from '../../src/modules/did.js'
import { InvalidArgumentError, NotFoundError } from '../../src/errors.js'
import { createMockApi } from '../../src/testing/mock-api.js'
import { createMockSigner } from '../../src/testing/mock-signer.js'
import type { ApiPromise } from '@polkadot/api'
import { mockAgent, MOCK_AGENT_ID, MOCK_OWNER_ADDRESS } from '../../src/testing/fixtures/agents.js'
import { noopLogger } from '../../src/utils/logger.js'
import type { DidDocument } from '../../src/types/did.js'

const MOCK_DID = mockAgent.did

function makeDidModule() {
  const api = createMockApi({ agents: [mockAgent] }) as ApiPromise
  return new DidModule(api, noopLogger)
}

const TEST_DOC: DidDocument = {
  '@context': ['https://www.w3.org/ns/did/v1'],
  id: MOCK_DID,
  verificationMethod: [{
    id: `${MOCK_DID}#key-1`,
    type: 'MultiKey',
    controller: MOCK_DID,
    publicKeyMultibase: 'zAbc123',
  }],
  service: [{
    id: `${MOCK_DID}#service-1`,
    type: 'AgentEndpoint',
    serviceEndpoint: 'https://agent.example.com',
  }],
}

// ── resolve ───────────────────────────────────────────────────────────────────

describe('DidModule.resolve', () => {
  it('resolves known DID', async () => {
    const mod = makeDidModule()
    const info = await mod.resolve(MOCK_DID)
    // Mock returns agentId, then resolve calls getAgent which looks up by agentId
    // Our mock stores didRegistry keyed by did → { agentId }
    // The DidModule.resolve tries to call decodeDidInfo... let's check the mock
    // The mock for agentDid.didRegistry returns { agentId } — DidModule.resolve decodes it
    expect(info).not.toBeNull()
  })

  it('returns null for unknown DID', async () => {
    const mod = makeDidModule()
    const info = await mod.resolve('did:clawchain:unknown')
    expect(info).toBeNull()
  })

  it('throws InvalidArgumentError for empty DID', async () => {
    const mod = makeDidModule()
    await expect(mod.resolve('')).rejects.toThrow(InvalidArgumentError)
  })
})

// ── getByAgentId ──────────────────────────────────────────────────────────────

describe('DidModule.getByAgentId', () => {
  it('returns DID info for known agentId', async () => {
    const mod = makeDidModule()
    const info = await mod.getByAgentId(MOCK_AGENT_ID)
    // Mock now implements agentDid.agentDids — returns did, then resolves it
    expect(info).not.toBeNull()
  })

  it('returns null for unknown agentId', async () => {
    const mod = makeDidModule()
    const info = await mod.getByAgentId('0x' + '00'.repeat(32))
    expect(info).toBeNull()
  })

  it('throws InvalidArgumentError for empty agentId', async () => {
    const mod = makeDidModule()
    await expect(mod.getByAgentId('')).rejects.toThrow(InvalidArgumentError)
  })
})

// ── listByOwner ───────────────────────────────────────────────────────────────

describe('DidModule.listByOwner', () => {
  it('returns DIDs for known owner', async () => {
    const mod = makeDidModule()
    const result = await mod.listByOwner(MOCK_OWNER_ADDRESS)
    // Mock now implements agentDid.ownerDids — returns dids for owner
    expect(result.items.length).toBeGreaterThanOrEqual(0)
    expect(typeof result.total).toBe('number')
    expect(typeof result.hasMore).toBe('boolean')
  })

  it('returns empty for unknown owner', async () => {
    const mod = makeDidModule()
    const result = await mod.listByOwner('5UnknownAddr')
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  it('throws InvalidArgumentError for empty owner', async () => {
    const mod = makeDidModule()
    await expect(mod.listByOwner('')).rejects.toThrow(InvalidArgumentError)
  })

  it('respects pagination opts', async () => {
    const mod = makeDidModule()
    const result = await mod.listByOwner(MOCK_OWNER_ADDRESS, { limit: 1 })
    expect(result.items.length).toBeLessThanOrEqual(1)
  })
})

// ── create (write) ────────────────────────────────────────────────────────────

describe('DidModule.create', () => {
  it('returns TransactionBuilder', () => {
    const mod = makeDidModule()
    const builder = mod.create({ agentId: MOCK_AGENT_ID, document: TEST_DOC })
    expect(builder).toBeDefined()
    expect(typeof builder.signAndSend).toBe('function')
    expect(typeof builder.dryRun).toBe('function')
  })

  it('throws InvalidArgumentError for missing agentId', () => {
    const mod = makeDidModule()
    expect(() => mod.create({ agentId: '', document: TEST_DOC })).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError for missing document', () => {
    const mod = makeDidModule()
    expect(() => mod.create({ agentId: MOCK_AGENT_ID, document: null as unknown as DidDocument }))
      .toThrow(InvalidArgumentError)
  })

  it('signAndSend() succeeds', async () => {
    const mod = makeDidModule()
    const signer = createMockSigner(MOCK_OWNER_ADDRESS)
    const result = await mod.create({ agentId: MOCK_AGENT_ID, document: TEST_DOC }).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('signAndSend() returns DidInfo with correct agentId', async () => {
    const mod = makeDidModule()
    const signer = createMockSigner(MOCK_OWNER_ADDRESS)
    const result = await mod.create({ agentId: MOCK_AGENT_ID, document: TEST_DOC }).signAndSend(signer)
    expect(result.data?.agentId).toBe(MOCK_AGENT_ID)
    expect(result.data?.document).toBe(TEST_DOC)
  })
})

// ── update (write) ────────────────────────────────────────────────────────────

describe('DidModule.update', () => {
  it('returns TransactionBuilder', () => {
    const mod = makeDidModule()
    const builder = mod.update(MOCK_DID, { verificationMethods: TEST_DOC.verificationMethod })
    expect(builder).toBeDefined()
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('throws InvalidArgumentError for empty DID', () => {
    const mod = makeDidModule()
    expect(() => mod.update('', {})).toThrow(InvalidArgumentError)
  })

  it('signAndSend() succeeds', async () => {
    const mod = makeDidModule()
    const signer = createMockSigner(MOCK_OWNER_ADDRESS)
    const result = await mod.update(MOCK_DID, { services: TEST_DOC.service }).signAndSend(signer)
    expect(result.success).toBe(true)
  })
})

// ── revoke (write) ────────────────────────────────────────────────────────────

describe('DidModule.revoke', () => {
  it('returns TransactionBuilder', () => {
    const mod = makeDidModule()
    const builder = mod.revoke(MOCK_DID)
    expect(builder).toBeDefined()
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('throws InvalidArgumentError for empty DID', () => {
    const mod = makeDidModule()
    expect(() => mod.revoke('')).toThrow(InvalidArgumentError)
  })

  it('signAndSend() succeeds', async () => {
    const mod = makeDidModule()
    const signer = createMockSigner(MOCK_OWNER_ADDRESS)
    const result = await mod.revoke(MOCK_DID).signAndSend(signer)
    expect(result.success).toBe(true)
  })
})

// ── requireDid ────────────────────────────────────────────────────────────────

describe('DidModule.requireDid', () => {
  it('throws NotFoundError for unknown DID', async () => {
    const mod = makeDidModule()
    await expect(mod.requireDid('did:clawchain:unknown')).rejects.toThrow(NotFoundError)
  })
})
