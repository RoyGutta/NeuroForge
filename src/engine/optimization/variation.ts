/**
 * Variation operators shared by the evolutionary optimisers. All operate in
 * the normalised unit cube and draw from the supplied Rng in a fixed order.
 */
import type { Rng } from "../core/rng";

/** Reflect a normalised coordinate back into [0, 1]. */
export function reflect(u: number): number {
  if (!Number.isFinite(u)) return 0.5;
  let v = u;
  for (let k = 0; k < 8 && (v < 0 || v > 1); k++) {
    if (v < 0) v = -v;
    if (v > 1) v = 2 - v;
  }
  return Math.min(1, Math.max(0, v));
}

/** BLX-alpha blend crossover (Eshelman & Schaffer, 1993). */
export function blxCrossover(u1: number[], u2: number[], alpha: number, rng: Rng): number[] {
  return u1.map((a, i) => {
    const b = u2[i];
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const range = hi - lo;
    return rng.uniform(lo - alpha * range, hi + alpha * range);
  });
}

/**
 * Per-gene Gaussian mutation with probability `rate`, width `sigma`; when
 * `forceOne` is set and nothing mutated, one random gene is perturbed.
 * Coordinates are reflected into [0, 1]. Mutates in place and returns genes.
 */
export function gaussianMutate(genes: number[], rate: number, sigma: number, rng: Rng, forceOne: boolean): number[] {
  let mutated = false;
  for (let i = 0; i < genes.length; i++) {
    if (rng.chance(rate)) {
      genes[i] += rng.gaussian() * sigma;
      mutated = true;
    }
  }
  if (!mutated && forceOne) {
    const i = rng.int(genes.length);
    genes[i] += rng.gaussian() * sigma;
  }
  for (let i = 0; i < genes.length; i++) genes[i] = reflect(genes[i]);
  return genes;
}
