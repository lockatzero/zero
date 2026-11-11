/**
 * The lock lengths a launch can choose. One list for the form, the server and the checker, so
 * what the page offers is exactly what the server will build and what a coin is judged against.
 *
 * A lock releases nothing until its cliff, then one equal part per period. The last part lands
 * at `cliffSeconds + periodSeconds * periods` after the launch.
 */
export type LockPreset = Readonly<{
  id: '7d' | '30d' | '90d';
  label: string;
  /** Seconds from the launch to the first unlock. */
  cliffSeconds: number;
  /** Seconds between unlocks after the cliff. */
  periodSeconds: number;
  /** Equal parts released after the cliff. */
  periods: number;
}>;

const DAY = 86_400;

export const LOCK_PRESETS: readonly LockPreset[] = [
  { id: '7d', label: '7 days', cliffSeconds: DAY, periodSeconds: DAY, periods: 6 },
  { id: '30d', label: '30 days', cliffSeconds: 7 * DAY, periodSeconds: DAY, periods: 23 },
  { id: '90d', label: '90 days', cliffSeconds: 30 * DAY, periodSeconds: DAY, periods: 60 },
];

export const DEFAULT_LOCK_PRESET: LockPreset['id'] = '30d';

/** The shortest wait before anything unlocks that still counts as a zero launch. */
export const MIN_CLIFF_SECONDS = DAY;

/** First buy bounds, in lamports. The form and the server both read these. */
export const MIN_FIRST_BUY_LAMPORTS = 100_000_000n;
export const MAX_FIRST_BUY_LAMPORTS = 5_000_000_000n;

export function lockPreset(id: string): LockPreset | null {
  return LOCK_PRESETS.find(preset => preset.id === id) ?? null;
}

/** Seconds from the launch until the last part unlocks. */
export function lockLengthSeconds(preset: LockPreset): number {
  return preset.cliffSeconds + preset.periodSeconds * preset.periods;
}
