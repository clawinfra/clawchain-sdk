/**
 * Codec helpers for decoding Polkadot/Substrate types into SDK types
 */

import type { AgentInfo, AgentStatus, DidDocument } from '../types/agent.js'
import type { ReputationInfo } from '../types/reputation.js'
import type { QuotaInfo, QuotaTier } from '../types/quota.js'
import type { TokenBalance } from '../types/token.js'
import type { DidInfo } from '../types/did.js'

/**
 * Decode a raw agentRegistry storage value into AgentInfo.
 * Accepts either a real codec object or a plain JS object (from mocks).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeAgentInfo(agentId: string, raw: any): AgentInfo {
  const isCodec = typeof raw.toJSON === 'function'
  const data = isCodec ? (raw.toJSON() as Record<string, unknown>) : raw

  return {
    id: agentId,
    owner: String(data['owner'] ?? ''),
    did: String(data['did'] ?? `did:clawchain:${agentId}`),
    name: String(data['name'] ?? ''),
    description: String(data['description'] ?? ''),
    endpoint: String(data['endpoint'] ?? ''),
    capabilities: Array.isArray(data['capabilities']) ? (data['capabilities'] as string[]) : [],
    status: (data['status'] as AgentStatus) ?? 'Active',
    registeredAt: Number(data['registeredAt'] ?? 0),
    updatedAt: Number(data['updatedAt'] ?? 0),
    reputationScore: Number(data['reputationScore'] ?? 0),
  }
}

/** Decode a raw reputation storage value into ReputationInfo */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeReputationInfo(accountId: string, raw: any): ReputationInfo {
  const isCodec = typeof raw.toJSON === 'function'
  const data = isCodec ? (raw.toJSON() as Record<string, unknown>) : raw

  return {
    accountId,
    score: Number(data['score'] ?? 0),
    positiveCount: Number(data['positiveCount'] ?? 0),
    negativeCount: Number(data['negativeCount'] ?? 0),
    totalInteractions: Number(data['totalInteractions'] ?? 0),
    lastUpdatedBlock: Number(data['lastUpdatedBlock'] ?? 0),
  }
}

/** Decode a raw quota storage value into QuotaInfo */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeQuotaInfo(accountId: string, raw: any): QuotaInfo {
  const isCodec = typeof raw.toJSON === 'function'
  const data = isCodec ? (raw.toJSON() as Record<string, unknown>) : raw

  return {
    accountId,
    remaining: BigInt(data['remaining'] ?? 0),
    limit: BigInt(data['limit'] ?? 0),
    resetBlock: Number(data['resetBlock'] ?? 0),
    tier: (data['tier'] as QuotaTier) ?? 'Basic',
  }
}

/** Decode a raw agentDid storage value into DidInfo */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeDidInfo(did: string, raw: any): DidInfo {
  const isCodec = typeof raw.toJSON === 'function'
  const data = isCodec ? (raw.toJSON() as Record<string, unknown>) : raw

  const document = (data['document'] as DidDocument | undefined) ?? {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    verificationMethod: [],
    service: [],
  }

  return {
    did,
    agentId: String(data['agentId'] ?? data['agent_id'] ?? ''),
    owner: String(data['owner'] ?? ''),
    document,
    createdAtBlock: Number(data['createdAtBlock'] ?? data['created_at_block'] ?? 0),
    updatedAtBlock: Number(data['updatedAtBlock'] ?? data['updated_at_block'] ?? 0),
  }
}

/** Decode a system.account storage value into TokenBalance */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeTokenBalance(raw: any): TokenBalance {
  const isCodec = typeof raw.toJSON === 'function'
  const data = isCodec ? (raw.toJSON() as Record<string, unknown>) : raw

  // Substrate system.account has data.free, data.reserved, data.miscFrozen / feeFrozen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inner = (data['data'] as any) ?? data
  const free = BigInt(inner['free'] ?? 0)
  const reserved = BigInt(inner['reserved'] ?? 0)
  const frozen = BigInt(inner['frozen'] ?? inner['miscFrozen'] ?? 0)

  return {
    free,
    reserved,
    frozen,
    total: free + reserved,
    transferable: free > frozen ? free - frozen : 0n,
  }
}
