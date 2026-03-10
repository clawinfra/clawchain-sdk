/**
 * BatchBuilder — batch multiple extrinsics into a single transaction
 *
 * @example
 * ```ts
 * const result = await client.tx.batch()
 *   .add(client.token.transfer(addr1, 100n))
 *   .add(client.token.transfer(addr2, 200n))
 *   .signAndSend(signer)
 * ```
 */

import type { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { Logger } from '../types/common.js'
import type { TxResult } from '../types/common.js'
import { InvalidArgumentError } from '../errors.js'
import type { ClawChainSigner } from '../signer/types.js'
import type { SubmitOpts } from './types.js'
import { TransactionBuilder } from './builder.js'
import { noopLogger } from '../utils/logger.js'

export class BatchBuilder {
  private readonly api: ApiPromise
  private readonly logger: Logger
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly builders: TransactionBuilder<any>[] = []

  constructor(api: ApiPromise, logger?: Logger) {
    this.api = api
    this.logger = logger ?? noopLogger
  }

  /**
   * Add a TransactionBuilder to the batch.
   * The builders are executed in the order they are added.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(builder: TransactionBuilder<any>): BatchBuilder {
    this.builders.push(builder)
    return this
  }

  /**
   * Sign and submit all extrinsics as an atomic batch (utility.batchAll).
   * If any extrinsic fails, the entire batch is rolled back.
   */
  async signAndSend(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<void>> {
    if (this.builders.length === 0) {
      throw new InvalidArgumentError('BatchBuilder: cannot submit empty batch')
    }

    this.logger.info('BatchBuilder.signAndSend', {
      count: this.builders.length,
      signer: signer.address,
    })

    const extrinsics = this.extractExtrinsics()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch = (this.api.tx as any)['utility']['batchAll'](extrinsics) as SubmittableExtrinsic<'promise'>
    const batchBuilder = new TransactionBuilder<void>(this.api, batch, undefined, this.logger)
    return batchBuilder.signAndSend(signer, opts)
  }

  /**
   * Sign and submit as a best-effort batch (utility.batch).
   * Individual extrinsics may fail without rolling back the entire batch.
   * Emits a BatchInterrupted event for any failures.
   */
  async signAndSendBestEffort(signer: ClawChainSigner, opts?: SubmitOpts): Promise<TxResult<void>> {
    if (this.builders.length === 0) {
      throw new InvalidArgumentError('BatchBuilder: cannot submit empty batch')
    }

    this.logger.info('BatchBuilder.signAndSendBestEffort', {
      count: this.builders.length,
      signer: signer.address,
    })

    const extrinsics = this.extractExtrinsics()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch = (this.api.tx as any)['utility']['batch'](extrinsics) as SubmittableExtrinsic<'promise'>
    const batchBuilder = new TransactionBuilder<void>(this.api, batch, undefined, this.logger)
    return batchBuilder.signAndSend(signer, opts)
  }

  /** @internal — extract underlying extrinsics from builders */
  private extractExtrinsics(): SubmittableExtrinsic<'promise'>[] {
    // Access the private extrinsic via property (builders expose it for batch use)
    return this.builders.map((b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (b as any)['extrinsic'] as SubmittableExtrinsic<'promise'>
      return raw
    })
  }
}
