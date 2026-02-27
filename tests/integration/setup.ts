/**
 * Integration test setup
 * Requires:
 *   CLAWCHAIN_ENDPOINT=wss://testnet.clawchain.win:9944
 *   TEST_SIGNER_MNEMONIC=<funded test account mnemonic>
 */

import { ClawChainClient } from '../../src/client.js'

export const ENDPOINT = process.env['CLAWCHAIN_ENDPOINT'] ?? 'wss://testnet.clawchain.win:9944'
export const SIGNER_MNEMONIC = process.env['TEST_SIGNER_MNEMONIC']

let _client: ClawChainClient | null = null

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
