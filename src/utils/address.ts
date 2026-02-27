/**
 * Address and codec utilities for ClawChain
 */

import { InvalidArgumentError } from '../errors.js'

/** Validate an SS58 address (basic check — 47–48 chars, base58) */
export function validateSS58(address: string): void {
  if (!address || address.length < 35 || address.length > 50) {
    throw new InvalidArgumentError(`Invalid SS58 address: ${address}`)
  }
}

/** Validate an H256 hex string */
export function validateH256(hex: string): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex) && !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new InvalidArgumentError(`Invalid H256 hex string: ${hex}`)
  }
}

/** Normalise an H256 value to 0x-prefixed lowercase */
export function normaliseH256(hex: string): string {
  const stripped = hex.startsWith('0x') ? hex.slice(2) : hex
  return `0x${stripped.toLowerCase()}`
}

/** Format a bigint token amount with decimals for display */
export function formatTokenAmount(amount: bigint, decimals = 18): string {
  const divisor = 10n ** BigInt(decimals)
  const whole = amount / divisor
  const remainder = amount % divisor
  if (remainder === 0n) return whole.toString()
  const remainderStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}.${remainderStr}`
}
