/**
 * DidModule — agent DID pallet queries and write operations
 *
 * Splits DID operations from AgentModule (which retains a deprecated
 * resolveDid() stub for backward compatibility).
 */

import type { ApiPromise } from '@polkadot/api'
import { InvalidArgumentError, NotFoundError } from '../errors.js'
import type { AgentId } from '../types/agent.js'
import type { Logger, PagedResult, PaginationOpts } from '../types/common.js'
import type { CreateDidParams, DidInfo, UpdateDidParams } from '../types/did.js'
import { TransactionBuilder } from '../tx/builder.js'
import { decodeDidInfo } from '../utils/codec.js'

export class DidModule {
  constructor(
    private readonly api: ApiPromise,
    private readonly logger: Logger,
  ) {}

  // ── Reads ─────────────────────────────────────────────────────────────────

  /**
   * Resolve a DID string to DidInfo.
   * Storage: agentDid.didRegistry(did)
   */
  async resolve(did: string): Promise<DidInfo | null> {
    if (!did) throw new InvalidArgumentError('did is required')
    this.logger.debug('DidModule.resolve', { did })

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.api.query as any)['agentDid']['didRegistry'](did)
      if (!result || result.isNone || result.isEmpty) return null

      const inner = typeof result.unwrap === 'function' ? result.unwrap() : result
      return decodeDidInfo(did, inner)
    } catch {
      return null
    }
  }

  /**
   * Get DID info for an agent ID.
   * Storage: agentDid.agentDids(agentId)
   */
  async getByAgentId(agentId: AgentId): Promise<DidInfo | null> {
    if (!agentId) throw new InvalidArgumentError('agentId is required')
    this.logger.debug('DidModule.getByAgentId', { agentId })

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.api.query as any)['agentDid']['agentDids'](agentId)
      if (!result || result.isNone || result.isEmpty) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = typeof result.unwrap === 'function' ? result.unwrap() : result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = typeof inner.toJSON === 'function' ? (inner.toJSON() as any) : inner
      const did = String(data['did'] ?? `did:clawchain:${agentId}`)
      return this.resolve(did)
    } catch {
      return null
    }
  }

  /**
   * List all DIDs owned by an address.
   * Storage: agentDid.ownerDids(owner) → Vec<did>
   */
  async listByOwner(owner: string, opts?: PaginationOpts): Promise<PagedResult<DidInfo>> {
    if (!owner) throw new InvalidArgumentError('owner is required')
    this.logger.debug('DidModule.listByOwner', { owner })

    const limit = Math.min(opts?.limit ?? 20, 100)
    const offset = opts?.offset ?? 0

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.api.query as any)['agentDid']['ownerDids'](owner)
      const raw = typeof result.toJSON === 'function' ? result.toJSON() : result
      const dids: string[] = Array.isArray(raw) ? (raw as string[]) : []

      const slice = dids.slice(offset, offset + limit)
      const items = await Promise.all(slice.map((did) => this.resolve(did)))
      const filtered = items.filter((d): d is DidInfo => d !== null)

      return {
        items: filtered,
        total: dids.length,
        hasMore: offset + limit < dids.length,
        nextCursor: offset + limit < dids.length ? String(offset + limit) : undefined,
      }
    } catch {
      return { items: [], total: 0, hasMore: false }
    }
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  /**
   * Create a DID for an agent.
   * Pallet call: agentDid.createDid(agentId, document)
   *
   * @returns TransactionBuilder<DidInfo>
   */
  create(params: CreateDidParams): TransactionBuilder<DidInfo> {
    if (!params.agentId) throw new InvalidArgumentError('agentId is required')
    if (!params.document) throw new InvalidArgumentError('document is required')

    this.logger.debug('DidModule.create', { agentId: params.agentId })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extrinsic = (this.api.tx as any)['agentDid']['createDid'](
      params.agentId,
      params.document,
    )

    return new TransactionBuilder<DidInfo>(
      this.api,
      extrinsic,
      (events) => {
        const event = events.find(
          (e) => e.pallet === 'agentDid' && e.method === 'DidCreated',
        )
        const did = String(event?.data['did'] ?? `did:clawchain:${params.agentId}`)
        return {
          did,
          agentId: params.agentId,
          owner: '',
          document: params.document,
          createdAtBlock: 0,
          updatedAtBlock: 0,
        }
      },
      this.logger,
    )
  }

  /**
   * Update a DID document.
   * Pallet call: agentDid.updateDid(did, verificationMethods?, services?)
   */
  update(did: string, params: UpdateDidParams): TransactionBuilder<void> {
    if (!did) throw new InvalidArgumentError('did is required')

    this.logger.debug('DidModule.update', { did })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extrinsic = (this.api.tx as any)['agentDid']['updateDid'](
      did,
      params.verificationMethods ?? null,
      params.services ?? null,
    )

    return new TransactionBuilder<void>(this.api, extrinsic, undefined, this.logger)
  }

  /**
   * Revoke (permanently deactivate) a DID.
   * Pallet call: agentDid.revokeDid(did)
   */
  revoke(did: string): TransactionBuilder<void> {
    if (!did) throw new InvalidArgumentError('did is required')

    this.logger.debug('DidModule.revoke', { did })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extrinsic = (this.api.tx as any)['agentDid']['revokeDid'](did)

    return new TransactionBuilder<void>(this.api, extrinsic, undefined, this.logger)
  }

  /**
   * Require a DID to exist; throws NotFoundError if absent.
   */
  async requireDid(did: string): Promise<DidInfo> {
    const info = await this.resolve(did)
    if (!info) throw new NotFoundError('DID', did)
    return info
  }
}
