/**
 * Integration test setup
 * Requires:
 *   CLAWCHAIN_ENDPOINT=wss://testnet.clawchain.win:9944
 *   TEST_SIGNER_MNEMONIC=<funded test account mnemonic>
 */

import { ClawChainClient } from '../../src/client.js'
import net from 'node:net'

export const ENDPOINT = process.env['CLAWCHAIN_ENDPOINT'] ?? 'wss://testnet.clawchain.win:9944'
export const SIGNER_MNEMONIC = process.env['TEST_SIGNER_MNEMONIC']

let _client: ClawChainClient | null = null
let _reachable: boolean | null = null

/**
 * Returns true if the testnet endpoint is TCP-reachable within 5 s.
 * Results are cached for the lifetime of the process.
 */
export async function isEndpointReachable(): Promise<boolean> {
  if (_reachable !== null) return _reachable

  const url = new URL(ENDPOINT.replace(/^wss?:\/\//, 'http://'))
  const host = url.hostname
  const port = Number(url.port) || (ENDPOINT.startsWith('wss') ? 443 : 80)

  _reachable = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 5_000)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })

  if (!_reachable) {
    console.warn(
      `\n⚠️  Integration testnet unreachable (${ENDPOINT}). ` +
      'All integration tests will be skipped.\n',
    )
  }

  return _reachable
}

export async function getClient(): Promise<ClawChainClient> {
  if (!_client) {
    _client = await ClawChainClient.connect({ endpoint: ENDPOINT, timeoutMs: 30_000 })
  }
  return _client
}

export async function teardown(): Promise<void> {
  if (_client) {
    await _client.disconnect()
    _client = null
  }
}
