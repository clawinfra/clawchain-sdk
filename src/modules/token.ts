/**
 * TokenModule — CLW token queries and transfers (claw-token pallet / system.account)
 */

import type { ApiPromise } from '@polkadot/api'
import { InvalidArgumentError } from '../errors.js'
import type { Logger } from '../types/common.js'
import type { TokenBalance, TokenMetadata } from '../types/token.js'
import { TransactionBuilder } from '../tx/builder.js'
import { decodeTokenBalance } from '../utils/codec.js'

export class TokenModule {
  constructor(
    private readonly api: ApiPromise,
    private readonly logger: Logger,
  ) {}

  /**
   * Get CLW token balance for an address.
   * Uses system.account for free/reserved/frozen breakdown.
   */
  async getBalance(address: string): Promise<TokenBalance> {
    if (!address) throw new InvalidArgumentError('address is required')
    this.logger.debug('TokenModule.getBalance', { address })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await this.api.query['system']!['account']!(address)
    return decodeTokenBalance(result)
  }

  /**
   * Get balances for multiple addresses in a single batch.
   */
  async getBalances(addresses: string[]): Promise<Map<string, TokenBalance>> {
    if (!addresses.length) return new Map()
    this.logger.debug('TokenModule.getBalances', { count: addresses.length })

    const results = await Promise.all(addresses.map((addr) => this.getBalance(addr)))
    const map = new Map<string, TokenBalance>()
    addresses.forEach((addr, i) => {
      const result = results[i]
      if (result !== undefined) map.set(addr, result)
    })
    return map
  }

  /**
   * Get CLW total supply.
   * Reads from the totalIssuance storage entry.
   */
  async getTotalSupply(): Promise<bigint> {
    this.logger.debug('TokenModule.getTotalSupply')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await this.api.query['balances']!['totalIssuance']!()
    return BigInt(result.toString())
  }

  /**
   * Get CLW token metadata.
   */
  getMetadata(): TokenMetadata {
    return {
      name: 'ClawChain Token',
      symbol: 'CLW',
      decimals: 18,
    }
  }

  // ── Write methods (v2) ────────────────────────────────────────────────────

  /**
   * Transfer CLW tokens to an address (keeps sender account alive).
   * Pallet call: balances.transferKeepAlive(to, amount)
   *
   * @example
   * ```ts
   * const result = await client.token
   *   .transfer('5GrwvaEF...', 1_000_000_000_000_000_000n)
   *   .signAndSend(signer)
   * ```
   */
  transfer(to: string, amount: bigint): TransactionBuilder<void> {
    if (!to) throw new InvalidArgumentError('to address is required')
    if (amount <= 0n) throw new InvalidArgumentError('amount must be greater than 0')

    this.logger.debug('TokenModule.transfer', { to, amount: amount.toString() })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extrinsic = (this.api.tx as any)['balances']['transferKeepAlive'](to, amount)

    return new TransactionBuilder<void>(this.api, extrinsic, undefined, this.logger)
  }

  /**
   * Transfer CLW — allows sender account to be reaped (balance → 0).
   * Pallet call: balances.transferAllowDeath(to, amount)
   */
  transferAllowDeath(to: string, amount: bigint): TransactionBuilder<void> {
    if (!to) throw new InvalidArgumentError('to address is required')
    if (amount <= 0n) throw new InvalidArgumentError('amount must be greater than 0')

    this.logger.debug('TokenModule.transferAllowDeath', { to, amount: amount.toString() })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extrinsic = (this.api.tx as any)['balances']['transferAllowDeath'](to, amount)

    return new TransactionBuilder<void>(this.api, extrinsic, undefined, this.logger)
  }

  /**
   * Transfer all free balance to an address.
   * Pallet call: balances.transferAll(to, keepAlive)
   *
   * @param keepAlive - Keep sender alive by retaining existential deposit (default: true)
   */
  transferAll(to: string, keepAlive = true): TransactionBuilder<void> {
    if (!to) throw new InvalidArgumentError('to address is required')

    this.logger.debug('TokenModule.transferAll', { to, keepAlive })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extrinsic = (this.api.tx as any)['balances']['transferAll'](to, keepAlive)

    return new TransactionBuilder<void>(this.api, extrinsic, undefined, this.logger)
  }
}
