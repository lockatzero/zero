import { type Connection, PublicKey } from '@solana/web3.js';

/**
 * The slot a new lookup table is derived from.
 *
 * The lookup table program only accepts a slot that is listed in the SlotHashes sysvar, and a
 * bank lists its ancestors, never itself. `getSlot('finalized')` used to be about 32 slots behind
 * the tip, so it was always listed. Mainnet now finalizes within a slot (read 2026-11-11:
 * finalized and confirmed were the same slot, and the newest listed slot was one below it), so
 * the finalized slot is not listed yet and the create fails with "is not a recent slot".
 *
 * So the slot is taken from the list itself: the newest listed slot at or below the finalized
 * one. Listed means the program accepts it; at or below finalized means it cannot be rolled back.
 */
const SLOT_HASHES = new PublicKey('SysvarS1otHashes111111111111111111111111111');
const SYSVAR_OWNER = new PublicKey('Sysvar1111111111111111111111111111111111111');

/** The sysvar is a u64 count, then (u64 slot, 32-byte hash) entries, newest first. */
const ENTRY_BYTES = 40;
const HEADER_BYTES = 8;

/** The newest `limit` slots the sysvar lists, newest first. Empty when the bytes are not a list. */
export function listedSlots(data: Uint8Array, limit = 32): number[] {
  if (data.length < HEADER_BYTES + ENTRY_BYTES) return [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = Number(view.getBigUint64(0, true));
  const readable = Math.min(count, limit, Math.floor((data.length - HEADER_BYTES) / ENTRY_BYTES));
  const slots: number[] = [];
  for (let index = 0; index < readable; index += 1) {
    slots.push(Number(view.getBigUint64(HEADER_BYTES + index * ENTRY_BYTES, true)));
  }
  return slots;
}

/** The newest listed slot at or below `finalized`, or null when none of them is. */
export function pickDerivationSlot(listed: readonly number[], finalized: number): number | null {
  for (const slot of listed) {
    if (slot <= finalized) return slot;
  }
  return null;
}

export async function tableDerivationSlot(connection: Pick<Connection, 'getSlot' | 'getAccountInfo'>): Promise<number> {
  const [finalized, info] = await Promise.all([
    connection.getSlot('finalized'),
    connection.getAccountInfo(SLOT_HASHES, 'confirmed').catch(() => null),
  ]);
  // A node that does not serve the sysvar (some local forks) keeps the old answer, which is what
  // those nodes accept.
  if (!info || !info.owner.equals(SYSVAR_OWNER)) return finalized;
  return pickDerivationSlot(listedSlots(info.data), finalized) ?? finalized;
}
