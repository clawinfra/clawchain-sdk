import type { Logger } from '../types/common.js'

/** Default no-op logger */
export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

/** Console-based logger */
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.debug(`[clawchain-sdk] ${msg}`, meta ?? ''),
  info: (msg, meta) => console.info(`[clawchain-sdk] ${msg}`, meta ?? ''),
  warn: (msg, meta) => console.warn(`[clawchain-sdk] ${msg}`, meta ?? ''),
  error: (msg, meta) => console.error(`[clawchain-sdk] ${msg}`, meta ?? ''),
}
