/** Convergence tests on a best-so-far history (minimisation orientation). */

export interface PlateauOptions {
  /** Number of most recent generations to compare against. */
  window: number;
  /** Relative improvement below which the history counts as flat. */
  minRelativeImprovement: number;
}

/**
 * True when the best value improved by less than `minRelativeImprovement`
 * (relative to the value `window` generations ago) over the last `window`
 * generations. Needs more than `window` entries to decide.
 */
export function detectPlateau(bests: number[], opts: PlateauOptions): boolean {
  const n = bests.length;
  if (n <= opts.window) return false;
  const then = bests[n - 1 - opts.window];
  const now = bests[n - 1];
  if (!Number.isFinite(then) || !Number.isFinite(now)) return false;
  const scale = Math.abs(then) > 1e-12 ? Math.abs(then) : 1;
  return (then - now) / scale < opts.minRelativeImprovement;
}
