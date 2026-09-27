/**
 * Statistics for comparing methods across seeds. Small-sample friendly and
 * distribution-free: medians, seeded bootstrap intervals, and rank-based
 * effect sizes. Nothing here assumes normality.
 */
import { Rng } from "../core/rng";

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : 0.5 * (s[mid - 1] + s[mid]);
}

export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

export interface BootstrapCI {
  median: number;
  lower: number;
  upper: number;
  level: number;
  resamples: number;
  seed: number;
}

/** Percentile bootstrap confidence interval of the median (seeded, reproducible). */
export function bootstrapMedianCI(xs: number[], opts: { seed?: number; resamples?: number; level?: number } = {}): BootstrapCI {
  const seed = opts.seed ?? 1;
  const resamples = opts.resamples ?? 2000;
  const level = opts.level ?? 0.95;
  const rng = new Rng(seed);
  const n = xs.length;
  const meds: number[] = [];
  for (let r = 0; r < resamples; r++) {
    const sample = new Array<number>(n);
    for (let i = 0; i < n; i++) sample[i] = xs[rng.int(n)];
    meds.push(median(sample));
  }
  const alpha = (1 - level) / 2;
  return { median: median(xs), lower: quantile(meds, alpha), upper: quantile(meds, 1 - alpha), level, resamples, seed };
}

/**
 * Vargha–Delaney A: probability that a value drawn from `a` is smaller than
 * one drawn from `b` (ties count half). For minimisation, A > 0.5 favours `a`.
 */
export function varghaDelaneyA(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return NaN;
  let wins = 0;
  for (const x of a) for (const y of b) wins += x < y ? 1 : x === y ? 0.5 : 0;
  return wins / (a.length * b.length);
}

/** Cliff's delta = 2A - 1 in the same orientation: +1 when every a beats every b. */
export function cliffsDelta(a: number[], b: number[]): number {
  return 2 * varghaDelaneyA(a, b) - 1;
}
