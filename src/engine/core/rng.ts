/**
 * Seeded pseudo-random number generator.
 *
 * Every stochastic component of the engine (optimizers, samplers, surrogate
 * training) draws from an `Rng` so that an experiment is fully reproducible
 * from its recorded seed. The generator is mulberry32 over a hashed seed:
 * fast, dependency-free, and statistically adequate for optimization work.
 * It is NOT cryptographically secure and is not meant to be.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Hash the seed so that nearby integer seeds give unrelated streams.
    this.state = hash32(seed >>> 0);
  }

  /** Uniform double in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform double in [lo, hi). */
  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Standard normal deviate via Box-Muller. No pair caching, so forked
   *  streams stay independent of call parity. */
  gaussian(): number {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Bernoulli trial with success probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Derive an independent child stream keyed by a label. Deterministic. */
  fork(label: string): Rng {
    let h = this.state;
    for (let i = 0; i < label.length; i++) {
      h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
    }
    return new Rng(hash32(h ^ 0x9e3779b9));
  }
}

function hash32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
