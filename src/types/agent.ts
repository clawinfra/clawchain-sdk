/**
 * Agent module types
 */

/** Agent identifier — H256 hex string */
export type AgentId = string

/** Agent lifecycle status */
export type AgentStatus = 'Active' | 'Inactive' | 'Suspended' | 'Deactivated'

/** Full agent information from on-chain storage */
export interface AgentInfo {
  id: AgentId
  /** SS58 owner address */
  owner: string
  /** DID: did:clawchain:<id> */
  did: string
  name: string
  description: string
  /** Agent's service URL */
  endpoint: string
  capabilities: string[]
  status: AgentStatus
  /** Block number when registered */
  registeredAt: number
  updatedAt: number
  /** Cached reputation score from reputation pallet */
  reputationScore: number
}

/** Parameters for registering a new agent */
export interface RegisterAgentParams {
  name: string
  description: string
  endpoint: string
  capabilities?: string[]
  didDocument?: DidDocument
}

/** Parameters for updating an existing agent */
export interface UpdateAgentParams {
  name?: string
  description?: string
  endpoint?: string
  capabilities?: string[]
}

/** W3C DID document */
export interface DidDocument {
  '@context': string[]
  id: string
  verificationMethod: VerificationMethod[]
  service?: ServiceEndpoint[]
}

/** DID verification method */
export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyMultibase?: string
}

/** DID service endpoint */
export interface ServiceEndpoint {
  id: string
  type: string
  serviceEndpoint: string
}
