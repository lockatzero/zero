import { type Connection, PublicKey } from '@solana/web3.js';

/**
 * Reads Streamflow token locks for one coin, funded by one wallet.
 *
 * A Streamflow lock is a "stream" account owned by the Streamflow program. Its layout is the one
 * the official SDK publishes (streamflow-finance/js-sdk, packages/stream/solana/layout.ts, read
 * 2026-11-11); only the fields a lock card needs are read here, each at its fixed offset.
 *
 * Nothing unlocks before `cliff`. At the cliff `cliffAmount` unlocks, then `amountPerPeriod`
 * every `period` seconds, never more than was deposited. A plain "token lock" is the same shape
 * with almost everything in the cliff amount.
 */
export const STREAMFLOW_PROGRAM_ID = new PublicKey('strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m');

const OFFSET = {
  withdrawn: 17,
  canceledAt: 25,
  endTime: 33,
  sender: 49,
  recipient: 113,
  mint: 177,
  escrowTokens: 209,
  startTime: 409,
  deposited: 417,
  period: 425,
  amountPerPeriod: 433,
  cliff: 441,
  cliffAmount: 449,
  cancelableBySender: 457,
  cancelableByRecipient: 458,
  transferableBySender: 460,
  transferableByRecipient: 461,
  pausable: 539,
  canUpdateRate: 540,
} as const;

/** The last field read ends here; a shorter account is not a stream. */
const MIN_LENGTH = 541;

export type StreamflowLock = Readonly<{
  /** The stream account. */
  address: string;
  sender: string;
  recipient: string;
  mint: string;
  escrowTokens: string;
  /** Base units. */
  deposited: bigint;
  withdrawn: bigint;
  /** Unix seconds. */
  startTime: number;
  cliff: number;
  endTime: number;
  period: number;
  amountPerPeriod: bigint;
  cliffAmount: bigint;
  canceledAt: number;
  /** True when nobody can cancel it, hand it to another wallet, pause it or change its rate. */
  fixed: boolean;
}>;

export function decodeStreamflowLock(address: PublicKey, data: Uint8Array): StreamflowLock | null {
  if (data.length < MIN_LENGTH) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const u64 = (offset: number) => view.getBigUint64(offset, true);
  const key = (offset: number) => new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  const flag = (offset: number) => data[offset] !== 0;
  return {
    address: address.toBase58(),
    sender: key(OFFSET.sender),
    recipient: key(OFFSET.recipient),
    mint: key(OFFSET.mint),
    escrowTokens: key(OFFSET.escrowTokens),
    deposited: u64(OFFSET.deposited),
    withdrawn: u64(OFFSET.withdrawn),
    startTime: Number(u64(OFFSET.startTime)),
    cliff: Number(u64(OFFSET.cliff)),
    endTime: Number(u64(OFFSET.endTime)),
    period: Number(u64(OFFSET.period)),
    amountPerPeriod: u64(OFFSET.amountPerPeriod),
    cliffAmount: u64(OFFSET.cliffAmount),
    canceledAt: Number(u64(OFFSET.canceledAt)),
    fixed:
      !flag(OFFSET.cancelableBySender) &&
      !flag(OFFSET.cancelableByRecipient) &&
      !flag(OFFSET.transferableBySender) &&
      !flag(OFFSET.transferableByRecipient) &&
      !flag(OFFSET.pausable) &&
      !flag(OFFSET.canUpdateRate),
  };
}

/** How much of the deposit has unlocked by `now` (unix seconds). */
export function streamflowUnlocked(lock: Pick<StreamflowLock, 'cliff' | 'cliffAmount' | 'period' | 'amountPerPeriod' | 'deposited'>, now: number): bigint {
  if (now < lock.cliff) return 0n;
  const periods = lock.period > 0 ? BigInt(Math.floor((now - lock.cliff) / lock.period)) : 0n;
  const unlocked = lock.cliffAmount + periods * lock.amountPerPeriod;
  return unlocked > lock.deposited ? lock.deposited : unlocked;
}

/** Streamflow locks of `mint` that `sender` funded and that are still in force. */
export async function readStreamflowLocks(
  connection: Pick<Connection, 'getProgramAccounts'>,
  mint: PublicKey,
  sender: PublicKey,
  limit = 16,
): Promise<StreamflowLock[]> {
  const accounts = await connection.getProgramAccounts(STREAMFLOW_PROGRAM_ID, {
    // The sender is part of the filter so a stranger's locks, however many, never enter the read.
    filters: [
      { memcmp: { offset: OFFSET.mint, bytes: mint.toBase58() } },
      { memcmp: { offset: OFFSET.sender, bytes: sender.toBase58() } },
    ],
  });
  const locks: StreamflowLock[] = [];
  for (const account of accounts.slice(0, limit)) {
    const lock = decodeStreamflowLock(account.pubkey, account.account.data);
    // The filter asked for these; a node that ignored it must not widen the answer.
    if (!lock || lock.mint !== mint.toBase58() || lock.sender !== sender.toBase58()) continue;
    if (lock.canceledAt !== 0 || lock.deposited === 0n) continue;
    locks.push(lock);
  }
  return locks;
}
