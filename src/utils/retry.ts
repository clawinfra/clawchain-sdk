/**
 * Exponential backoff retry utility
 */

import { TimeoutError } from '../errors.js'

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
}

/** Sleep for the given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff.
 * Throws the last error if all attempts fail.
 */
export async function retry<T>(
  operation: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3
  const baseDelayMs = opts.baseDelayMs ?? 500
  const maxDelayMs = opts.maxDelayMs ?? 10_000
  const timeoutMs = opts.timeoutMs

  const deadline = timeoutMs != null ? Date.now() + timeoutMs : undefined

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (deadline != null && Date.now() >= deadline) {
      throw new TimeoutError('retry', timeoutMs!)
    }

    try {
      return await operation()
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
        await sleep(delay)
      }
    }
  }

  throw lastError
}
