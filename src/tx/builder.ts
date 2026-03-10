/**
 * TransactionBuilder — fluent tx construction, dry-run, sign, and submit
 *
 * All write methods on modules return a TransactionBuilder<T>.
 * The caller chooses when/how to sign and submit.
 *
 * @example
 * ```ts
 * // Simple: sign and send in one step
 * const result = await client.token.transfer(to, amount).signAndSend(signer)
 *
 * // Advanced: estimate fee first
 * const estimate = await client.token.transfer(to, amount).dryRun(signer)
 * console.log('fee:', estimate.estimatedFee)
 * if (estimate.success) {
 *   const result = await client.token.transfer(to, amount).signAndSend(signer)
 * }
 * ```
 */

import type { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ChainEvent, TxResult } from '../types/common.js'
import type { Logger } from '../types/common.js'
import { DispatchError, TxTimeoutError, NonceTooLowError, SignerError } from '../errors.js'
import type { ClawChainSigner } from '../signer/types.js'
import type { DryRunResult, SubmitOpts, TxStatus } from './types.js'
import { KeypairSigner } from '../signer/keypair-signer.js'
import { noopLogger } from '../utils/logger.js'

/** Default finalization timeout: 60 seconds */
const DEFAULT_TX_TIMEOUT_MS = 60_000

/**
 * Fluent transaction builder.
 *
 * Constructed internally by module write methods — do not instantiate directly.
 */
export class TransactionBuilder<T = void> {
  private readonly api: ApiPromise
  private readonly extrinsic: SubmittableExtrinsic<'promise'>
  private readonly decoder: ((events: ChainEvent[]) => T) | undefined
  private readonly logger: Logger

  /** @internal — use module write methods to obtain a TransactionBuilder */
  constructor(
    api: ApiPromise,
    extrinsic: SubmittableExtrinsic<'promise'>,
    decoder?: (events: ChainEvent[]) => T,
    logger?: Logger,
  ) {
    this.api = api
    this.extrinsic = extrinsic
    this.decoder = decoder
    this.logger = logger ?? noopLogger
  }

  /**
   * Dry-run the transaction to estimate fees without submission.
   * Uses the `payment.queryFeeDetails` RPC if available; otherwise falls back
   * to a static estimate.
   */
  async dryRun(signer: ClawChainSigner): Promise<DryRunResult> {
    this.logger.debug('TransactionBuilder.dryRun', {
      signer: signer.address,
    })

    try {
      // Get nonce for the signer
      const accountInfo = await this.api.query['system']!['account']!(signer.address)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nonce: number = (accountInfo as any).nonce?.toNumber?.() ?? 0

      // Sign with nonce (ephemeral — not submitted)
      let signed: SubmittableExtrinsic<'promise'>
      if (signer instanceof KeypairSigner) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signed = this.extrinsic.sign(signer.getKeyringPair(), { nonce } as any) as unknown as SubmittableExtrinsic<'promise'>
      } else {
        // For external signers, sign the raw payload
        const payload = this.extrinsic.toU8a()
        const signature = await signer.sign(payload)
        // Attach signature via addSignature
        this.extrinsic.addSignature(
          signer.address,
          { sr25519: `0x${Buffer.from(signature).toString('hex')}` } as unknown as `0x${string}`,
          { nonce, blockHash: this.api.genesisHash, genesisHash: this.api.genesisHash, specVersion: this.api.runtimeVersion.specVersion, transactionVersion: this.api.runtimeVersion.transactionVersion } as unknown as Parameters<typeof this.extrinsic.addSignature>[2],
        )
        signed = this.extrinsic
      }

      // Use paymentQueryInfo for fee estimation
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const info = await (this.api.rpc as any)['payment']['queryInfo'](
          signed.toHex(),
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const infoJson = typeof info.toJSON === 'function' ? (info.toJSON() as any) : info
        const partialFee = BigInt(infoJson?.partialFee ?? 0)
        const weight = infoJson?.weight ?? {}

        return {
          success: true,
          estimatedFee: partialFee,
          weight: {
            refTime: BigInt(weight.refTime ?? weight.ref_time ?? 0),
            proofSize: BigInt(weight.proofSize ?? weight.proof_size ?? 0),
          },
        }
      } catch {
        // RPC not available — return static estimate
        return {
          success: true,
          estimatedFee: 1_000_000_000_000n, // 1 CLW placeholder
          weight: { refTime: 100_000_000n, proofSize: 0n },
        }
      }
    } catch (err) {
      return {
        success: false,
        estimatedFee: 0n,
        weight: { refTime: 0n, proofSize: 0n },
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  /**
   * Sign the transaction and return the encoded hex (does NOT submit).
   */
  async sign(signer: ClawChainSigner, opts?: SubmitOpts): Promise<string> {
    this.logger.debug('TransactionBuilder.sign', { signer: signer.address })

    const nonce = await this.resolveNonce(signer, opts?.nonce)

    if (signer instanceof KeypairSigner) {
      const signOpts: Record<string, unknown> = {
        nonce,
        tip: opts?.tip ?? 0n,
      }
      if (opts?.era !== undefined) signOpts['era'] = opts.era
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signed = this.extrinsic.sign(signer.getKeyringPair(), signOpts as any)
      return (signed as unknown as { toHex(): string }).toHex()
    }

    // External signer path
    const signerPayload = this.api.createType('SignerPayload', {
      method: this.extrinsic.method,
      nonce,
      genesisHash: this.api.genesisHash,
      blockHash: this.api.genesisHash,
      runtimeVersion: this.api.runtimeVersion,
      version: this.api.extrinsicVersion,
    })
    const { data } = signerPayload.toRaw()
    const dataBytes = Buffer.from(data.slice(2), 'hex')
    const signature = await signer.sign(dataBytes)

    this.extrinsic.addSignature(
      signer.address,
      signature,
      signerPayload.toPayload(),
    )
    return this.extrinsic.toHex()
  }

  /**
   * Sign and submit the transaction, waiting for finalization by default.
   */
  async signAndSend(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<T>> {
    return this.submit(signer, { ...opts, waitForFinalization: opts?.waitForFinalization !== false })
  }

  /**
   * Sign, send, and wait for finalization. Alias for `signAndSend()` (which
   * waits for finalization by default), provided for explicit intent.
   */
  async waitForFinality(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<T>> {
    return this.submit(signer, { ...opts, waitForFinalization: true })
  }

  /**
   * Sign and send, returning after block inclusion (not finalization).
   * Faster but block may be re-orged.
   */
  async signAndSendNoWait(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<T>> {
    return this.submit(signer, { ...opts, waitForFinalization: false })
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async resolveNonce(signer: ClawChainSigner, override?: number): Promise<number> {
    if (override !== undefined) return override
    try {
      const nonce = await this.api.rpc.system.accountNextIndex(signer.address)
      return nonce.toNumber()
    } catch {
      return 0
    }
  }

  private async submit(signer: ClawChainSigner, opts: SubmitOpts): Promise<TxResult<T>> {
    const timeoutMs = DEFAULT_TX_TIMEOUT_MS
    const onStatus = opts.onStatusChange

    this.logger.info('TransactionBuilder.submit', {
      signer: signer.address,
      waitForFinalization: opts.waitForFinalization,
    })

    return new Promise<TxResult<T>>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new TxTimeoutError('pending', timeoutMs))
      }, timeoutMs)

      const doSubmit = async () => {
        try {
          const nonce = await this.resolveNonce(signer, opts.nonce)

          let unsub: (() => void) | undefined

          const submitFn = async () => {
            if (signer instanceof KeypairSigner) {
              return this.extrinsic.signAndSend(
                signer.getKeyringPair(),
                { nonce, tip: opts.tip ?? 0n },
                (result) => handleResult(result, unsub),
              )
            } else {
              // Prepare and sign payload
              const signerPayload = this.api.createType('SignerPayload', {
                method: this.extrinsic.method,
                nonce,
                genesisHash: this.api.genesisHash,
                blockHash: this.api.genesisHash,
                runtimeVersion: this.api.runtimeVersion,
                version: this.api.extrinsicVersion,
              })
              const { data } = signerPayload.toRaw()
              const dataBytes = Buffer.from(data.slice(2), 'hex')
              let signature: Uint8Array
              try {
                signature = await signer.sign(dataBytes)
              } catch (err) {
                throw new SignerError('Signing failed during submit', err)
              }
              this.extrinsic.addSignature(
                signer.address,
                signature,
                signerPayload.toPayload(),
              )
              return this.extrinsic.send((result) => handleResult(result, unsub))
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handleResult = (result: any, unsubFn: (() => void) | undefined) => {
            if (!result) return

            const { status, events: rawEvents, dispatchError } = result

            if (status?.isBroadcast) {
              onStatus?.({ type: 'broadcast', peers: 0 })
            }

            if (status?.isInBlock) {
              const blockHash = status.asInBlock?.toHex?.() ?? String(status.asInBlock)
              onStatus?.({ type: 'inBlock', blockHash })

              if (!opts.waitForFinalization) {
                clearTimeout(timeoutHandle)
                unsubFn?.()

                if (dispatchError) {
                  reject(decodeDispatchError(this.api, dispatchError))
                  return
                }

                const events = decodeEvents(rawEvents)
                resolve(buildResult(this.extrinsic.hash?.toHex?.() ?? '', blockHash, 0, events, this.decoder))
              }
            }

            if (status?.isFinalized) {
              const blockHash = status.asFinalized?.toHex?.() ?? String(status.asFinalized)
              clearTimeout(timeoutHandle)
              unsubFn?.()
              onStatus?.({ type: 'finalized', blockHash, blockNumber: 0 })

              if (dispatchError) {
                reject(decodeDispatchError(this.api, dispatchError))
                return
              }

              const events = decodeEvents(rawEvents)
              resolve(buildResult(this.extrinsic.hash?.toHex?.() ?? '', blockHash, 0, events, this.decoder))
            }

            if (status?.isDropped || status?.isInvalid) {
              clearTimeout(timeoutHandle)
              unsubFn?.()
              const errMsg = status.isDropped ? 'Transaction dropped' : 'Transaction invalid'
              onStatus?.({ type: 'error', error: errMsg })
              reject(new DispatchError('system', status.type, errMsg))
            }
          }

          const unsubPromise = await submitFn()
          if (typeof unsubPromise === 'function') {
            unsub = unsubPromise
          }
        } catch (err) {
          clearTimeout(timeoutHandle)
          if (err instanceof Error && err.message?.includes('1010')) {
            reject(new NonceTooLowError(0, 0))
          } else {
            reject(err)
          }
        }
      }

      doSubmit()
    })
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeDispatchError(api: ApiPromise, dispatchError: any): Error {
  if (!dispatchError) return new DispatchError('unknown', 'Unknown', 'Unknown dispatch error')

  try {
    if (dispatchError.isModule) {
      const decoded = api.registry.findMetaError(dispatchError.asModule)
      const { section, name, docs } = decoded
      return new DispatchError(section, name, docs.join(' '), dispatchError)
    }
    if (dispatchError.isBadOrigin) {
      return new DispatchError('system', 'BadOrigin', 'Bad origin — wrong caller', dispatchError)
    }
    if (dispatchError.isCannotLookup) {
      return new DispatchError('system', 'CannotLookup', 'Cannot lookup account', dispatchError)
    }
  } catch {
    // ignore decode errors
  }
  return new DispatchError('unknown', 'Unknown', String(dispatchError), dispatchError)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeEvents(rawEvents: any): ChainEvent[] {
  if (!rawEvents || typeof rawEvents[Symbol.iterator] !== 'function') return []

  const events: ChainEvent[] = []
  for (const record of rawEvents) {
    try {
      const { event, phase } = record
      events.push({
        blockNumber: 0,
        blockHash: '',
        extrinsicIndex: phase?.isApplyExtrinsic ? phase.asApplyExtrinsic.toNumber() : undefined,
        pallet: event.section ?? '',
        method: event.method ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: typeof event.data?.toJSON === 'function' ? (event.data.toJSON() as Record<string, unknown>) : {},
        raw: record,
      })
    } catch {
      // skip malformed events
    }
  }
  return events
}

function buildResult<T>(
  txHash: string,
  blockHash: string,
  blockNumber: number,
  events: ChainEvent[],
  decoder: ((events: ChainEvent[]) => T) | undefined,
): TxResult<T> {
  return {
    txHash,
    blockHash,
    blockNumber,
    extrinsicIndex: 0,
    success: true,
    data: decoder ? decoder(events) : undefined,
    events,
    fee: 0n,
  }
}
