/**
 * ClawChainClient — main entry point to the SDK
 *
 * Usage:
 *   import { ClawChainClient } from 'clawchain-sdk'
 *   const client = await ClawChainClient.connect({ endpoint: 'wss://testnet.clawchain.win:9944' })
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { ConnectionError, TimeoutError } from './errors.js'
import { AgentModule } from './modules/agent.js'
import { QuotaModule } from './modules/quota.js'
import { ReputationModule } from './modules/reputation.js'
import { TokenModule } from './modules/token.js'
import type { Logger } from './types/common.js'
import { noopLogger } from './utils/logger.js'
import { retry } from './utils/retry.js'

/** Options for establishing a ClawChain connection */
export interface ConnectOptions {
  /** WebSocket endpoint, e.g. 'wss://testnet.clawchain.win:9944' */
  endpoint: string
  /** Default timeout for RPC calls in milliseconds (default: 30_000) */
  timeoutMs?: number
  /** Auto-reconnect on connection drop (default: true) */
  reconnect?: boolean
  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number
  /** Inject a custom logger */
  logger?: Logger
}

/** Node health and sync status */
export interface HealthStatus {
  connected: boolean
  blockNumber: number
  blockHash: string
  peersCount: number
  isSyncing: boolean
  nodeVersion: string
  chainName: string
}

/**
 * Main ClawChain SDK client.
 *
 * Instantiate via `ClawChainClient.connect(opts)`.
 * All modules are accessible as properties: `.agent`, `.reputation`, `.quota`, `.token`.
 */
export class ClawChainClient {
  private readonly _api: ApiPromise
  private readonly _logger: Logger
  private readonly _timeoutMs: number

  /** Agent registry and DID module */
  readonly agent: AgentModule

  /** Reputation module */
  readonly reputation: ReputationModule

  /** Gas quota module */
  readonly quota: QuotaModule

  /** CLW token module */
  readonly token: TokenModule

  private constructor(api: ApiPromise, opts: ConnectOptions) {
    this._api = api
    this._logger = opts.logger ?? noopLogger
    this._timeoutMs = opts.timeoutMs ?? 30_000

    this.agent = new AgentModule(api, this._logger)
    this.reputation = new ReputationModule(api, this._logger)
    this.quota = new QuotaModule(api, this._logger)
    this.token = new TokenModule(api, this._logger)
  }

  /**
   * Connect to a ClawChain node.
   *
   * @param opts - Connection options
   * @returns Connected ClawChainClient instance
   * @throws {ConnectionError} if the connection cannot be established
   */
  static async connect(opts: ConnectOptions): Promise<ClawChainClient> {
    const logger = opts.logger ?? noopLogger
    const timeoutMs = opts.timeoutMs ?? 30_000

    logger.info('Connecting to ClawChain node', { endpoint: opts.endpoint })

    const provider = new WsProvider(
      opts.endpoint,
      opts.reconnect !== false ? 2_500 : undefined,
      {},
      timeoutMs,
    )

    let api: ApiPromise
    try {
      api = await retry(
        () => ApiPromise.create({ provider }),
        { maxAttempts: opts.maxReconnectAttempts ?? 5, timeoutMs },
      )
    } catch (err) {
      throw new ConnectionError(
        `Failed to connect to ClawChain node at ${opts.endpoint}`,
        err,
      )
    }

    logger.info('Connected to ClawChain', {
      chain: api.runtimeChain.toString(),
      version: api.runtimeVersion.specVersion.toString(),
    })

    return new ClawChainClient(api, opts)
  }

  /**
   * Disconnect from the node and clean up all subscriptions.
   */
  async disconnect(): Promise<void> {
    this._logger.info('Disconnecting from ClawChain')
    await this._api.disconnect()
  }

  /**
   * Check node health and sync status.
   */
  async health(): Promise<HealthStatus> {
    const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new TimeoutError('health', this._timeoutMs)), this._timeoutMs),
        ),
      ])

    try {
      const [header, health, nodeVersion] = await Promise.all([
        withTimeout(this._api.rpc.chain.getHeader()),
        withTimeout(this._api.rpc.system.health()),
        withTimeout(this._api.rpc.system.version()),
      ])

      return {
        connected: this._api.isConnected,
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
        peersCount: health.peers.toNumber(),
        isSyncing: health.isSyncing.valueOf(),
        nodeVersion: nodeVersion.toString(),
        chainName: this._api.runtimeChain.toString(),
      }
    } catch (err) {
      if (err instanceof TimeoutError) throw err
      throw new ConnectionError('Failed to fetch node health', err)
    }
  }

  /**
   * Returns true if the WebSocket connection is currently open.
   */
  isConnected(): boolean {
    return this._api.isConnected
  }

  /**
   * Escape hatch: access the raw @polkadot/api instance for advanced use cases.
   */
  getApi(): ApiPromise {
    return this._api
  }

  /** @internal for use by modules during testing */
  get _internalApi(): ApiPromise {
    return this._api
  }
}

/**
 * Convenience factory — same as `ClawChainClient.connect`.
 */
export async function connect(opts: ConnectOptions): Promise<ClawChainClient> {
  return ClawChainClient.connect(opts)
}
