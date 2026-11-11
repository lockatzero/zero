/**
 * Read a coin's Streamflow locks yourself.
 *
 *   RPC_URL=https://your-rpc npx tsx examples/read-lock.ts <mint> <wallet that funded the lock>
 *
 * Prints each lock: how much it holds, when the first coins unlock, when the last do, how much
 * has unlocked so far, and whether anyone can still cancel or move it.
 */
import { Connection, PublicKey } from '@solana/web3.js';
import { readStreamflowLocks, streamflowUnlocked } from '../src/index.js';

const [mint, funder] = process.argv.slice(2);
if (!mint || !funder) {
  console.error('usage: read-lock.ts <mint> <wallet that funded the lock>');
  process.exit(2);
}
const connection = new Connection(process.env.RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
const now = Math.floor(Date.now() / 1000);
const date = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

const locks = await readStreamflowLocks(connection, new PublicKey(mint), new PublicKey(funder));
if (locks.length === 0) console.log('no Streamflow lock of that coin was funded by that wallet');
for (const lock of locks) {
  const unlocked = streamflowUnlocked(lock, now);
  console.log(`${lock.address}`);
  console.log(`  holds ${lock.deposited} base units, ${unlocked} unlocked so far, ${lock.withdrawn} withdrawn`);
  console.log(`  first unlock ${date(lock.cliff)}, last unlock ${date(lock.endTime)}`);
  console.log(`  ${lock.fixed ? 'nobody can cancel it, move it, pause it or change its rate' : 'someone can still cancel it, move it, pause it or change its rate'}`);
}
