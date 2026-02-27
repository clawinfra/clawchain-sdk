/**
 * Mock @polkadot/api for unit testing
 *
 * Creates a minimal fake ApiPromise that returns controlled responses
 * without needing a real WebSocket connection.
 */

import type { AgentInfo } from '../types/agent.js'
import type { ReputationInfo } from '../types/reputation.js'
import type { QuotaInfo } from '../types/quota.js'
import type { TokenBalance } from '../types/token.js'

export interface MockApiOptions {
  agents?: AgentInfo[]
  reputations?: Record<string, ReputationInfo>
  quotas?: Record<string, QuotaInfo>
  balances?: Record<string, TokenBalance>
  blockNumber?: number
  chainName?: string
  nodeVersion?: string
}

/** Wrap a value to look like an Option<T> codec type */
function makeSome(value: unknown) {
  return {
    isNone: false,
    isEmpty: false,
    isSome: true,
    unwrap: () => makeCodec(value),
    toJSON: () => value,
  }
}

function makeNone() {
  return {
    isNone: true,
    isEmpty: true,
    isSome: false,
    unwrap: () => { throw new Error('Option is None') },
    toJSON: () => null,
  }
}

function makeVec(items: unknown[]) {
  return {
    isNone: false,
    isEmpty: items.length === 0,
    toJSON: () => items,
  }
}

function makeCodec(value: unknown) {
  return {
    toJSON: () => value,
    toString: () => JSON.stringify(value),
    isEmpty: value == null,
    isNone: value == null,
  }
}

function makeScalar(value: unknown) {
  return {
    toJSON: () => value,
    toString: () => String(value),
    toNumber: () => Number(value),
    valueOf: () => value,
    isEmpty: false,
    isNone: false,
  }
}

/** Build a mock ApiPromise compatible object */
export function createMockApi(opts: MockApiOptions = {}): unknown {
  const {
    agents = [],
    reputations = {},
    quotas = {},
    balances = {},
    blockNumber = 42,
    chainName = 'ClawChain Testnet',
    nodeVersion = '0.9.0-clawchain',
  } = opts

  const agentById = new Map(agents.map((a) => [a.id, a]))
  const ownerAgents = new Map<string, string[]>()
  for (const agent of agents) {
    const existing = ownerAgents.get(agent.owner) ?? []
    existing.push(agent.id)
    ownerAgents.set(agent.owner, existing)
  }

  return {
    isConnected: true,
    runtimeChain: { toString: () => chainName },
    runtimeVersion: { specVersion: { toString: () => '1' } },

    rpc: {
      chain: {
        getHeader: async () => ({
          number: makeScalar(blockNumber),
          hash: { toHex: () => '0xdeadbeef' + '00'.repeat(28) },
        }),
      },
      system: {
        health: async () => ({
          peers: makeScalar(5),
          isSyncing: makeScalar(false),
        }),
        version: async () => makeScalar(nodeVersion),
      },
    },

    query: {
      system: {
        account: async (address: string) => {
          const bal = balances[address] ?? {
            free: 1_000_000_000_000_000_000n,
            reserved: 0n,
            frozen: 0n,
            total: 1_000_000_000_000_000_000n,
            transferable: 1_000_000_000_000_000_000n,
          }
          return makeCodec({ data: { free: bal.free, reserved: bal.reserved, frozen: bal.frozen } })
        },
      },
      balances: {
        totalIssuance: async () => makeScalar(100_000_000_000_000_000_000_000_000n),
      },
      agentRegistry: {
        ownerAgents: async (address: string) => {
          const ids = ownerAgents.get(address) ?? []
          return makeVec(ids)
        },
        agentRegistry: Object.assign(
          async (agentId: string) => {
            const agent = agentById.get(agentId)
            if (!agent) return makeNone()
            return makeSome(agent)
          },
          {
            entries: async () => {
              return agents.map((a) => [
                { toString: () => `agentRegistry,${a.id}` },
                makeSome(a),
              ])
            },
          },
        ),
      },
      agentDid: {
        didRegistry: async (did: string) => {
          const agent = agents.find((a) => a.did === did)
          if (!agent) return makeNone()
          return makeSome({ agentId: agent.id })
        },
      },
      reputation: {
        reputations: Object.assign(
          async (accountId: string) => {
            const rep = reputations[accountId]
            if (!rep) return makeNone()
            return makeSome(rep)
          },
          {
            entries: async () => {
              return Object.entries(reputations).map(([accountId, rep]) => [
                { toString: () => `reputation,${accountId}` },
                makeSome(rep),
              ])
            },
          },
        ),
      },
      gasQuota: {
        agentQuotas: async (accountId: string) => {
          const quota = quotas[accountId]
          if (!quota) return makeNone()
          return makeSome(quota)
        },
      },
    },

    disconnect: async () => undefined,
  }
}
