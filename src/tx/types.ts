/**
 * Transaction builder types for ClawChain SDK v2
 */

/** Options for submitting a transaction */
export interface SubmitOpts {
  /** Tip to include with the transaction (in CLW smallest units) */
  tip?: bigint
  /** Explicit nonce (auto-fetched if omitted) */
  nonce?: number
  /** Era — number of blocks the tx is valid for (default: mortal 64 blocks) */
  era?: number
  /** Whether to wait for finalization (default: true) */
  waitForFinalization?: boolean
  /** Callback for status updates during submission */
  onStatusChange?: (status: TxStatus) => void
}

/** Transaction status during submission lifecycle */
export type TxStatus =
  | { type: 'signed' }
  | { type: 'broadcast'; peers: number }
  | { type: 'inBlock'; blockHash: string }
  | { type: 'finalized'; blockHash: string; blockNumber: number }
  | { type: 'error'; error: string }

/** Result of a dry-run (fee estimation without submission) */
export interface DryRunResult {
  /** Whether the extrinsic would succeed if submitted */
  success: boolean
  /** Estimated transaction fee in CLW (smallest unit) */
  estimatedFee: bigint
  /** Weight consumed by this transaction */
  weight: { refTime: bigint; proofSize: bigint }
  /** Dispatch error message if success=false */
  error?: string
}
