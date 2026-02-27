/**
 * TokenModule — CLW token queries (claw-token pallet / system.account)
 */

import type { ApiPromise } from '@polkadot/api'
import { InvalidArgumentError } from '../errors.js'
import type { Logger } from '../types/common.js'
import type { TokenBalance, TokenMetadata, TransferOpts } from '../types/token.js'
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

  /**
   * Transfer CLW tokens. (Phase 2 — requires signer)
   * @throws {Error} Not yet implemented in Phase 1
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transfer(_to: string, _amount: bigint, _signer: unknown, _opts?: TransferOpts): Promise<never> {
    throw new Error('transfer() is available in Phase 2 (write API). Use @clawchain/sdk >= 0.2.0')
  }

  /**
   * Transfer with memo. (Phase 2)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transferWithNote(_to: string, _amount: bigint, _note: string, _signer: unknown): Promise<never> {
    throw new Error('transferWithNote() is available in Phase 2 (write API). Use @clawchain/sdk >= 0.2.0')
  }
}
