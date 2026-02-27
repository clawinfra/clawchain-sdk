/**
 * Token module types
 */

/** CLW token balance breakdown */
export interface TokenBalance {
  free: bigint
  reserved: bigint
  frozen: bigint
  /** free + reserved */
  total: bigint
  /** free - frozen */
  transferable: bigint
}

/** Transfer options */
export interface TransferOpts {
  tip?: bigint
  nonce?: number
}

/** CLW token metadata */
export interface TokenMetadata {
  /** 'ClawChain Token' */
  name: string
  /** 'CLW' */
  symbol: string
  /** 18 */
  decimals: number
}
