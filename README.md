# zero

Launch a coin with the first buy locked.

zero is a way to launch a pump.fun coin where the creator's first buy is locked from the start, on a schedule anyone can read. The site is https://lockatzero.xyz.

This repo holds the part you can check for yourself: the code that reads a lock straight from the chain, and the lock lengths the site offers.

## What a lock is here

- The coins from the creator's first buy sit in a lock, not in the creator's wallet.
- Nothing unlocks before the first date on the schedule. After that the coins unlock in equal parts until the last date.
- A lock only counts as locked when nobody can cancel it, move it to another wallet, pause it or change its rate. The reader reports that as `fixed`.

## What a lock does not tell you

A lock covers the coins that are in it. It says nothing about any other wallet the creator may control. Read the rest of the chart yourself.

## Read a lock yourself

```
npm install
RPC_URL=https://your-rpc npx tsx examples/read-lock.ts <mint> <wallet that funded the lock>
```

It prints how much the lock holds, when the first and last coins unlock, how much has unlocked so far, and whether anyone can still change it. Locks are Streamflow streams, read at the offsets Streamflow's own SDK publishes.

## What is in here

| Path | What it does |
| --- | --- |
| `src/streamflow.ts` | Finds and decodes a coin's Streamflow locks, and works out how much has unlocked |
| `src/presets.ts` | The lock lengths the site offers: 7, 30 and 90 days |
| `src/slot.ts` | Picks a slot the lookup table program accepts on today's mainnet |
| `examples/read-lock.ts` | A small command that prints a coin's locks |

## Status

The site is live. Launches through it are not open to everyone yet.
