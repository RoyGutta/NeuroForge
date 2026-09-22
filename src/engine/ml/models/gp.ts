/**
 * Gaussian-process regression with a squared-exponential (RBF) kernel:
 *   k(x, x') = s_f^2 exp(-|x - x'|^2 / (2 l^2)) + s_n^2 [x = x']
 * on standardised targets with a zero prior mean. The lengthscale and noise
 * are selected by maximising the log marginal likelihood over a small grid,
 * which is robust and deterministic. Prediction returns mean and standard
 * deviation; the latter is what Bayesian optimisation needs.
 *
 * Reference: Rasmussen & Williams (2006), Gaussian Processes for Machine
 * Learning, algorithm 2.1.
 */
import { NotPositiveDefiniteError } from "../../linalg/dense";
import { standardize, type Standardizer } from "../dataset";
import type { SurrogateDescriptor, SurrogateModel } from "./types";
import { resolveSurrogateParams } from "./types";

const PARAMS = [
  { id: "noise", label: "Noise variance", description: "Fixed noise variance; 0 selects it automatically by marginal likelihood.", default: 0, min: 0, max: 1 },
  { id: "lengthscale", label: "Lengthscale", description: "Fixed RBF lengthscale in normalised input units; 0 selects it automatically.", default: 0, min: 0, max: 100 },
  { id: "maxPoints", label: "Max training points", description: "Subsample above this size to bound the O(n^3) factorisation.", default: 600, min: 10, max: 3000 },
];

export const gpDescriptor: SurrogateDescriptor = {
  id: "gp",
  label: "Gaussian process (RBF)",
  description: "Exact GP regression with an RBF kernel and marginal-likelihood hyperparameter selection. Provides calibrated uncertainty; cost grows as n^3.",
  params: PARAMS,
  create(given) {
    return new GpSurrogate(resolveSurrogateParams(PARAMS, given));
  },
};

class GpSurrogate implements SurrogateModel {
  readonly id = "gp";
  readonly hyperparameters: Record<string, number>;
  private X: number[][] = [];
  private L: Float64Array | null = null;
  private alpha: Float64Array | null = null;
  private n = 0;
  private scaler: Standardizer | null = null;
  private lengthscale = 1;
  private noise = 1e-6;
  private signal = 1;

  constructor(private readonly p: Record<string, number>) {
    this.hyperparameters = { lengthscale: 0, noise: 0, signal: 1, points: 0, logMarginalLikelihood: NaN };
  }

  fit(Xin: number[][], yin: number[]): void {
    if (Xin.length !== yin.length || Xin.length === 0) throw new Error("gp: inputs and targets must be non-empty and aligned");
    let X = Xin;
    let y = yin;
    const maxN = Math.round(this.p.maxPoints);
    if (X.length > maxN) {
      // Deterministic stride subsample keeps coverage of the whole set.
      const stride = X.length / maxN;
      const idx = Array.from({ length: maxN }, (_, i) => Math.floor(i * stride));
      X = idx.map((i) => Xin[i]);
      y = idx.map((i) => yin[i]);
    }
    this.X = X;
    this.n = X.length;
    this.scaler = standardize(y);
    const z = this.scaler.apply(y);
    this.signal = 1;

    const d = X[0].length;
    const median = medianDistance(X);
    const lsGrid = this.p.lengthscale > 0 ? [this.p.lengthscale] : [0.35, 0.7, 1.4, 2.8].map((f) => f * Math.max(median, 1e-3));
    const noiseGrid = this.p.noise > 0 ? [this.p.noise] : [1e-6, 1e-4, 1e-2, 1e-1];
    let best = { lml: -Infinity, ls: lsGrid[0], noise: noiseGrid[0], L: null as Float64Array | null, alpha: null as Float64Array | null };
    for (const ls of lsGrid) {
      const K = this.kernelMatrix(X, ls);
      for (const noise of noiseGrid) {
        const fit = this.factor(K, noise, z);
        if (!fit) continue;
        if (fit.lml > best.lml) best = { lml: fit.lml, ls, noise, L: fit.L, alpha: fit.alpha };
      }
    }
    if (!best.L || !best.alpha) throw new Error("gp: no positive-definite kernel found");
    this.lengthscale = best.ls;
    this.noise = best.noise;
    this.L = best.L;
    this.alpha = best.alpha;
    this.hyperparameters.lengthscale = best.ls;
    this.hyperparameters.noise = best.noise;
    this.hyperparameters.points = this.n;
    this.hyperparameters.dimension = d;
    this.hyperparameters.logMarginalLikelihood = best.lml;
  }

  predict(Xs: number[][]) {
    if (!this.L || !this.alpha || !this.scaler) throw new Error("gp: fit before predict");
    const n = this.n;
    const mean: number[] = [];
    const std: number[] = [];
    const scale = this.scaler.std > 0 ? this.scaler.std : 1;
    for (const x of Xs) {
      const k = new Float64Array(n);
      for (let i = 0; i < n; i++) k[i] = this.kernel(x, this.X[i], this.lengthscale);
      let mu = 0;
      for (let i = 0; i < n; i++) mu += k[i] * this.alpha[i];
      // v = L^{-1} k
      const v = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let s = k[i];
        for (let j = 0; j < i; j++) s -= this.L[i * n + j] * v[j];
        v[i] = s / this.L[i * n + i];
      }
      let vv = 0;
      for (let i = 0; i < n; i++) vv += v[i] * v[i];
      const variance = Math.max(this.signal - vv, 0) + this.noise;
      mean.push(mu * scale + this.scaler.mean);
      std.push(Math.sqrt(variance) * scale);
    }
    return { mean, std };
  }

  private kernel(a: number[], b: number[], ls: number): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return this.signal * Math.exp(-s / (2 * ls * ls));
  }

  private kernelMatrix(X: number[][], ls: number): Float64Array {
    const n = X.length;
    const K = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      K[i * n + i] = this.signal;
      for (let j = i + 1; j < n; j++) {
        const v = this.kernel(X[i], X[j], ls);
        K[i * n + j] = v;
        K[j * n + i] = v;
      }
    }
    return K;
  }

  /** Cholesky of K + noise I; returns L, alpha = K^{-1} z and the log marginal likelihood. */
  private factor(K: Float64Array, noise: number, z: number[]): { L: Float64Array; alpha: Float64Array; lml: number } | null {
    const n = this.n;
    const L = new Float64Array(n * n);
    let logDet = 0;
    try {
      for (let j = 0; j < n; j++) {
        let dgn = K[j * n + j] + noise;
        for (let k = 0; k < j; k++) dgn -= L[j * n + k] * L[j * n + k];
        if (!(dgn > 1e-14)) throw new NotPositiveDefiniteError(j);
        const ljj = Math.sqrt(dgn);
        L[j * n + j] = ljj;
        logDet += Math.log(ljj);
        for (let i = j + 1; i < n; i++) {
          let s = K[i * n + j];
          for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
          L[i * n + j] = s / ljj;
        }
      }
    } catch (e) {
      if (e instanceof NotPositiveDefiniteError) return null;
      throw e;
    }
    const y1 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = z[i];
      for (let k = 0; k < i; k++) s -= L[i * n + k] * y1[k];
      y1[i] = s / L[i * n + i];
    }
    const alpha = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y1[i];
      for (let k = i + 1; k < n; k++) s -= L[k * n + i] * alpha[k];
      alpha[i] = s / L[i * n + i];
    }
    let fit = 0;
    for (let i = 0; i < n; i++) fit += z[i] * alpha[i];
    const lml = -0.5 * fit - logDet - 0.5 * n * Math.log(2 * Math.PI);
    return { L, alpha, lml };
  }
}

/** Unit-signal RBF kernel. */
export function rbf(a: number[], b: number[], ls: number): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.exp(-s / (2 * ls * ls));
}

export function gpKernelMatrix(X: number[][], ls: number): Float64Array {
  const n = X.length;
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    K[i * n + i] = 1;
    for (let j = i + 1; j < n; j++) {
      const v = rbf(X[i], X[j], ls);
      K[i * n + j] = v;
      K[j * n + i] = v;
    }
  }
  return K;
}

/**
 * Cholesky of K + noise I (reused across outputs when `Lin` is supplied),
 * alpha = (K + noise I)^-1 z and the log marginal likelihood of z.
 * Returns null when the matrix is not positive definite.
 */
export function gpFactor(K: Float64Array, n: number, noise: number, z: number[], Lin: Float64Array | null): { L: Float64Array; alpha: Float64Array; lml: number } | null {
  let L = Lin;
  if (!L) {
    const A = new Float64Array(n * n);
    A.set(K);
    for (let i = 0; i < n; i++) A[i * n + i] += noise;
    try {
      L = choleskyFactorSafe(A, n);
    } catch (e) {
      if (e instanceof NotPositiveDefiniteError) return null;
      throw e;
    }
  }
  let logDet = 0;
  for (let i = 0; i < n; i++) logDet += Math.log(L[i * n + i]);
  const y1 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = z[i];
    for (let k = 0; k < i; k++) s -= L[i * n + k] * y1[k];
    y1[i] = s / L[i * n + i];
  }
  const alpha = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y1[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * alpha[k];
    alpha[i] = s / L[i * n + i];
  }
  let fit = 0;
  for (let i = 0; i < n; i++) fit += z[i] * alpha[i];
  return { L, alpha, lml: -0.5 * fit - logDet - 0.5 * n * Math.log(2 * Math.PI) };
}

function choleskyFactorSafe(A: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    let dgn = A[j * n + j];
    for (let k = 0; k < j; k++) dgn -= L[j * n + k] * L[j * n + k];
    if (!(dgn > 1e-14)) throw new NotPositiveDefiniteError(j);
    const ljj = Math.sqrt(dgn);
    L[j * n + j] = ljj;
    for (let i = j + 1; i < n; i++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = s / ljj;
    }
  }
  return L;
}

export const gpMedianDistance = medianDistance;

/** Median pairwise distance over a deterministic sample of points. */
function medianDistance(X: number[][]): number {
  const n = X.length;
  const step = Math.max(1, Math.floor(n / 60));
  const dists: number[] = [];
  for (let i = 0; i < n; i += step) {
    for (let j = i + step; j < n; j += step) {
      let s = 0;
      for (let k = 0; k < X[i].length; k++) s += (X[i][k] - X[j][k]) ** 2;
      dists.push(Math.sqrt(s));
    }
  }
  if (dists.length === 0) return 1;
  dists.sort((a, b) => a - b);
  return dists[Math.floor(dists.length / 2)] || 1;
}
