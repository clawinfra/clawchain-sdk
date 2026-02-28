/**
 * AgentModule — agent-registry and agent-DID pallet queries
 */

import type { ApiPromise } from '@polkadot/api'
import { AgentNotFoundError, InvalidArgumentError } from '../errors.js'
import type { AgentId, AgentInfo, RegisterAgentParams, UpdateAgentParams } from '../types/agent.js'
import type { PagedResult, PaginationOpts } from '../types/common.js'
import type { Logger } from '../types/common.js'
import { decodeAgentInfo } from '../utils/codec.js'

export class AgentModule {
  constructor(
    private readonly api: ApiPromise,
    private readonly logger: Logger,
  ) {}

  /**
   * Get all agent IDs owned by the given address.
   * Storage: agentRegistry.ownerAgents(address)
   */
  async getOwnerAgents(ownerAddress: string): Promise<AgentId[]> {
    if (!ownerAddress) throw new InvalidArgumentError('ownerAddress is required')
    this.logger.debug('AgentModule.getOwnerAgents', { ownerAddress })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.api.query as any)['agentRegistry']['ownerAgents'](ownerAddress)

    if (!result || result.isEmpty) return []

    const raw = typeof result.toJSON === 'function' ? result.toJSON() : result
    if (Array.isArray(raw)) return raw as AgentId[]
    return []
  }

  /**
   * Get full agent details by ID.
   * Storage: agentRegistry.agentRegistry(agentId)
   */
  async getAgent(agentId: AgentId): Promise<AgentInfo | null> {
    if (!agentId) throw new InvalidArgumentError('agentId is required')
    this.logger.debug('AgentModule.getAgent', { agentId })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.api.query as any)['agentRegistry']['agentRegistry'](agentId)

    if (!result || result.isNone || result.isEmpty) return null

    const inner = typeof result.unwrap === 'function' ? result.unwrap() : result
    return decodeAgentInfo(agentId, inner)
  }

  /**
   * Get agent details, throwing AgentNotFoundError if not found.
   */
  async requireAgent(agentId: AgentId): Promise<AgentInfo> {
    const agent = await this.getAgent(agentId)
    if (!agent) throw new AgentNotFoundError(agentId)
    return agent
  }

  /**
   * List agents owned by an address with basic pagination.
   */
  async listAgentsByOwner(
    ownerAddress: string,
    opts?: PaginationOpts,
  ): Promise<PagedResult<AgentInfo>> {
    const ids = await this.getOwnerAgents(ownerAddress)
    const limit = Math.min(opts?.limit ?? 20, 100)
    const offset = opts?.offset ?? 0

    const slice = ids.slice(offset, offset + limit)
    const items = await Promise.all(slice.map((id) => this.getAgent(id)))
    const filtered = items.filter((a): a is AgentInfo => a !== null)

    return {
      items: filtered,
      total: ids.length,
      hasMore: offset + limit < ids.length,
      nextCursor: offset + limit < ids.length ? String(offset + limit) : undefined,
    }
  }

  /**
   * Resolve a DID string to agent info.
   * Storage: agentDid.didRegistry(did)
   */
  async resolveDid(did: string): Promise<AgentInfo | null> {
    if (!did) throw new InvalidArgumentError('did is required')
    this.logger.debug('AgentModule.resolveDid', { did })

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.api.query as any)['agentDid']['didRegistry'](did)
      if (!result || result.isNone || result.isEmpty) return null

      const inner = typeof result.unwrap === 'function' ? result.unwrap() : result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = typeof inner.toJSON === 'function' ? (inner.toJSON() as any) : inner
      const agentId: string = data['agentId'] ?? data['agent_id'] ?? ''
      if (!agentId) return null
      return this.getAgent(agentId)
    } catch {
      return null
    }
  }

  /**
   * List all agents with pagination (scans all storage entries).
   * Note: on large chains, prefer owner-based queries for performance.
   */
  async listAgents(opts?: PaginationOpts): Promise<PagedResult<AgentInfo>> {
    this.logger.debug('AgentModule.listAgents', { opts })
    const limit = Math.min(opts?.limit ?? 20, 100)
    const offset = opts?.offset ?? 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = await (this.api.query as any)['agentRegistry']['agentRegistry'].entries()

    const all: AgentInfo[] = []
    for (const [key, value] of entries as [unknown, unknown][]) {
      if (!value) continue
      const keyStr = String(key)
      const agentId = keyStr.split(',').pop()?.trim() ?? keyStr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = typeof (value as any).unwrap === 'function' ? (value as any).unwrap() : value
      try {
        all.push(decodeAgentInfo(agentId, inner))
      } catch {
        // skip malformed entries
      }
    }

    const slice = all.slice(offset, offset + limit)
    return {
      items: slice,
      total: all.length,
      hasMore: offset + limit < all.length,
      nextCursor: offset + limit < all.length ? String(offset + limit) : undefined,
    }
  }

  // ── Phase 2 stubs (transactions) ───────────────────────────────────────────

  /**
   * Register a new agent on-chain. (Phase 2 — requires signer)
   * @throws {Error} Not yet implemented in Phase 1
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async register(_params: RegisterAgentParams, _signer: unknown): Promise<never> {
    throw new Error('register() is available in Phase 2 (write API). Use clawchain-sdk >= 0.2.0')
  }

  /**
   * Update agent metadata on-chain. (Phase 2)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(_agentId: AgentId, _params: UpdateAgentParams, _signer: unknown): Promise<never> {
    throw new Error('update() is available in Phase 2 (write API). Use clawchain-sdk >= 0.2.0')
  }

  /**
   * Deactivate an agent on-chain. (Phase 2)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deactivate(_agentId: AgentId, _signer: unknown): Promise<never> {
    throw new Error('deactivate() is available in Phase 2 (write API). Use clawchain-sdk >= 0.2.0')
  }
}
