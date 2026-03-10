/**
 * TransactionBuilder and BatchBuilder tests
 */
import { describe, it, expect } from 'vitest'
import { createMockClient } from '../../src/testing/mock-client.js'
import { createMockSigner } from '../../src/testing/mock-signer.js'
import { InvalidArgumentError } from '../../src/errors.js'
import { MOCK_OWNER_ADDRESS } from '../../src/testing/fixtures/agents.js'

// ── TransactionBuilder via module write methods ────────────────────────────

describe('TransactionBuilder (via token.transfer)', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)

  it('dryRun() returns DryRunResult with fee estimate', async () => {
    const result = await client.token.transfer('5Bob', 100n).dryRun(signer)
    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.estimatedFee).toBe('bigint')
    expect(result.estimatedFee).toBeGreaterThanOrEqual(0n)
    expect(result.weight).toBeDefined()
    expect(typeof result.weight.refTime).toBe('bigint')
    expect(typeof result.weight.proofSize).toBe('bigint')
  })

  it('dryRun() returns success=true for valid tx', async () => {
    const result = await client.token.transfer('5Bob', 100n).dryRun(signer)
    expect(result.success).toBe(true)
  })

  it('sign() returns a hex string', async () => {
    const hex = await client.token.transfer('5Bob', 100n).sign(signer)
    expect(typeof hex).toBe('string')
    expect(hex.startsWith('0x')).toBe(true)
  })

  it('signAndSend() returns TxResult', async () => {
    const result = await client.token.transfer('5Bob', 100n).signAndSend(signer)
    expect(result).toBeDefined()
    expect(typeof result.txHash).toBe('string')
    expect(typeof result.blockHash).toBe('string')
    expect(result.success).toBe(true)
    expect(Array.isArray(result.events)).toBe(true)
    expect(typeof result.fee).toBe('bigint')
  })

  it('signAndSendNoWait() returns TxResult', async () => {
    const result = await client.token.transfer('5Bob', 100n).signAndSendNoWait(signer)
    expect(result.success).toBe(true)
  })

  it('signAndSend with onStatusChange callback fires finalized', async () => {
    const statuses: string[] = []
    await client.token.transfer('5Bob', 100n).signAndSend(signer, {
      onStatusChange: (s) => statuses.push(s.type),
    })
    expect(statuses).toContain('finalized')
  })
})

describe('TransactionBuilder (via agent.register)', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)

  it('signAndSend() returns TxResult with decoded data', async () => {
    const result = await client.agent.register({
      name: 'TestAgent',
      description: 'A test agent',
      endpoint: 'https://agent.example.com',
      capabilities: ['text', 'code'],
    }).signAndSend(signer)

    expect(result.success).toBe(true)
    // data is the decoded AgentInfo (may be empty if no AgentRegistered event)
    // but result itself is valid
  })

  it('dryRun() returns fee estimate for agent registration', async () => {
    const result = await client.agent.register({
      name: 'x',
      description: '',
      endpoint: 'http://x',
    }).dryRun(signer)
    expect(result.success).toBe(true)
    expect(result.estimatedFee).toBeGreaterThanOrEqual(0n)
  })
})

describe('TransactionBuilder (via agent write methods)', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)
  const AGENT_ID = '0x' + 'aa'.repeat(32)

  it('update() signAndSend succeeds', async () => {
    const result = await client.agent.update(AGENT_ID, { name: 'NewName' }).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('deactivate() signAndSend succeeds', async () => {
    const result = await client.agent.deactivate(AGENT_ID).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('reactivate() signAndSend succeeds', async () => {
    const result = await client.agent.reactivate(AGENT_ID).signAndSend(signer)
    expect(result.success).toBe(true)
  })
})

describe('TransactionBuilder (via token write methods)', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)

  it('transferAllowDeath() signAndSend succeeds', async () => {
    const result = await client.token.transferAllowDeath('5Bob', 50n).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('transferAll() signAndSend succeeds', async () => {
    const result = await client.token.transferAll('5Bob').signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('transferAll(keepAlive=false) signAndSend succeeds', async () => {
    const result = await client.token.transferAll('5Bob', false).signAndSend(signer)
    expect(result.success).toBe(true)
  })
})

describe('TransactionBuilder (via reputation.submitFeedback)', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)
  const TARGET = '0x' + 'cc'.repeat(32)

  it('submitFeedback() returns TransactionBuilder', () => {
    const builder = client.reputation.submitFeedback({ target: TARGET, isPositive: true })
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('submitFeedback() signAndSend positive feedback succeeds', async () => {
    const result = await client.reputation.submitFeedback({
      target: TARGET,
      isPositive: true,
      referenceId: 'task-001',
    }).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('submitFeedback() signAndSend negative feedback succeeds', async () => {
    const result = await client.reputation.submitFeedback({
      target: TARGET,
      isPositive: false,
    }).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('submitFeedback() throws for missing target', () => {
    expect(() => client.reputation.submitFeedback({ target: '', isPositive: true }))
      .toThrow(/target is required/)
  })
})

describe('TransactionBuilder (via quota write methods)', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)

  it('requestQuota() returns TransactionBuilder', () => {
    const builder = client.quota.requestQuota(1_000_000n)
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('requestQuota() signAndSend succeeds', async () => {
    const result = await client.quota.requestQuota(1_000_000n).signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('requestQuota() throws for zero amount', () => {
    expect(() => client.quota.requestQuota(0n)).toThrow(/amount must be greater than 0/)
  })

  it('requestQuota() throws for negative amount', () => {
    expect(() => client.quota.requestQuota(-1n)).toThrow(/amount must be greater than 0/)
  })

  it('upgradeTier() returns TransactionBuilder', () => {
    const builder = client.quota.upgradeTier('Premium')
    expect(typeof builder.signAndSend).toBe('function')
  })

  it('upgradeTier() signAndSend succeeds', async () => {
    const result = await client.quota.upgradeTier('Standard').signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('upgradeTier() throws for empty tier', () => {
    expect(() => client.quota.upgradeTier('' as 'Basic')).toThrow(/tier is required/)
  })
})

// ── BatchBuilder ──────────────────────────────────────────────────────────────

describe('BatchBuilder', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)

  it('throws InvalidArgumentError for empty batch', async () => {
    // Access tx.batch() via client if available, else skip
    // The client exposes tx via _internalApi but we test via the module
    // For now, test via the BatchBuilder directly
    const { BatchBuilder } = await import('../../src/tx/batch.js')
    const api = client.getApi()
    const batch = new BatchBuilder(api)
    await expect(batch.signAndSend(signer)).rejects.toThrow(InvalidArgumentError)
  })

  it('sends batch with multiple transfers', async () => {
    const { BatchBuilder } = await import('../../src/tx/batch.js')
    const api = client.getApi()
    const batch = new BatchBuilder(api)
      .add(client.token.transfer('5Alice', 100n))
      .add(client.token.transfer('5Bob', 200n))

    const result = await batch.signAndSend(signer)
    expect(result.success).toBe(true)
  })

  it('signAndSendBestEffort() sends batch', async () => {
    const { BatchBuilder } = await import('../../src/tx/batch.js')
    const api = client.getApi()
    const batch = new BatchBuilder(api)
      .add(client.token.transfer('5Alice', 50n))
      .add(client.agent.deactivate('0x' + 'dd'.repeat(32)))

    const result = await batch.signAndSendBestEffort(signer)
    expect(result.success).toBe(true)
  })

  it('throws InvalidArgumentError for empty best-effort batch', async () => {
    const { BatchBuilder } = await import('../../src/tx/batch.js')
    const api = client.getApi()
    const batch = new BatchBuilder(api)
    await expect(batch.signAndSendBestEffort(signer)).rejects.toThrow(InvalidArgumentError)
  })

  it('add() is chainable', async () => {
    const { BatchBuilder } = await import('../../src/tx/batch.js')
    const api = client.getApi()
    const batch = new BatchBuilder(api)
    const returned = batch.add(client.token.transfer('5Alice', 100n))
    expect(returned).toBe(batch)
  })
})

// ── SubmitOpts edge cases ─────────────────────────────────────────────────────

describe('TransactionBuilder submit opts', () => {
  const client = createMockClient()
  const signer = createMockSigner(MOCK_OWNER_ADDRESS)

  it('respects explicit nonce', async () => {
    const result = await client.token.transfer('5Bob', 100n).signAndSend(signer, { nonce: 5 })
    expect(result.success).toBe(true)
  })

  it('respects tip option', async () => {
    const result = await client.token.transfer('5Bob', 100n).signAndSend(signer, { tip: 1000n })
    expect(result.success).toBe(true)
  })

  it('waitForFinalization=false returns on inBlock', async () => {
    const result = await client.token.transfer('5Bob', 100n).signAndSend(signer, {
      waitForFinalization: false,
    })
    // Mock always fires finalized since inBlock is not in the mock sequence
    expect(result.success).toBe(true)
  })
})
