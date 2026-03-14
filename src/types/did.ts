/**
 * DID module types for ClawChain SDK v2
 */

import type { VerificationMethod, ServiceEndpoint, DidDocument } from './agent.js'
import type { AgentId } from './agent.js'

// Re-export shared types for convenience
export type { VerificationMethod, ServiceEndpoint, DidDocument, AgentId }

/** DID document stored on-chain */
export interface DidInfo {
  /** Fully-qualified DID: did:clawchain:<id> */
  did: string
  /** Associated agent ID */
  agentId: AgentId
  /** SS58 owner address */
  owner: string
  /** The DID document */
  document: DidDocument
  /** Block number when the DID was created */
  createdAtBlock: number
  /** Block number when the DID was last updated */
  updatedAtBlock: number
}

/** Parameters for creating a DID */
export interface CreateDidParams {
  /** Agent ID to associate the DID with */
  agentId: AgentId
  /** Initial DID document */
  document: DidDocument
}

/** Parameters for updating a DID document */
export interface UpdateDidParams {
  /** Replace verification methods (replaces all if provided) */
  verificationMethods?: VerificationMethod[]
  /** Replace service endpoints (replaces all if provided) */
  services?: ServiceEndpoint[]
}
