/**
 * Multi-output surrogates: one model that maps a design vector to a vector
 * of responses (e.g. all member forces at once).
 *
 * - Bayesian ridge: shared Gram matrix over polynomial features, one weight
 *   vector per output solved against the same Cholesky factor; per-output
 *   noise variance estimated from training residuals; closed-form posterior
 *   predictive variance  s_j^2 (1 + phi^T (Phi^T Phi + lambda I)^-1 phi).
 * - Gaussian process: shared RBF kernel and hyperparameters (selected by the
 *   summed log marginal likelihood over outputs), one alpha per output, one
 *   shared predictive variance in standardised units scaled per output.
 *
 * The uncertainty is a statistical statement about the surrogate's error on
 * data like its training set, not an engineering margin.
 */
import type { Rng } from "../../core/rng";
import { choleskyFactor, choleskySolveWith } from "../../linalg/dense";
import { standardize, type Standardizer } from "../dataset";
import { polynomialFeatures } from "./features";
import { gpFactor, gpKernelMatrix, gpMedianDistance, rbf } from "./gp";
import type { SurrogateParamSpec } from "./types";
import { resolveSurrogateParams } from "./types";

export interface MultiPrediction {
  /** [point][output] */
  mean: number[][];
  std?: number[][];
}

export interface MultiOutputSurrogate {
  readonly id: string;
  fit(inputs: number[][], targets: number[][]): void;
  predict(inputs: number[][]): MultiPrediction;
  readonly hyperparameters: Record<string, number>;
  readonly outputs: number;
}

export interface MultiOutputDescriptor {
  id: string;
  label: string;
  description: string;
  params: SurrogateParamSpec[];
  create(params: Record<string, number>, rng: Rng): MultiOutputSurrogate;
}

const RIDGE_PARAMS: SurrogateParamSpec[] = [
  { id: "degree", label: "Polynomial degree", description: "1 = linear, 2 = quadratic with interactions.", default: 2, min: 1, max: 2 },
  { id: "lambda", label: "Ridge penalty", description: "L2 regularisation strength on the feature weights.", default: 1e-6, min: 0, max: 10 },
];

export const bayesianRidgeMultiDescriptor: MultiOutputDescriptor = {
  id: "ridge",
  label: "Bayesian ridge (polynomial)",
  description: "Shared polynomial features, one weight vector per output, closed-form predictive variance.",
  params: RIDGE_PARAMS,
  create(given) {
    return new BayesianRidgeMulti(resolveSurrogateParams(RIDGE_PARAMS, given));
  },
};

class BayesianRidgeMulti implements MultiOutputSurrogate {
  readonly id = "ridge";
  readonly hyperparameters: Record<string, number>;
  outputs = 0;
  private readonly degree: 1 | 2;
  private L: Float64Array | null = null;
  private k = 0;
  private weights: Float64Array[] = [];
  private noiseVar: number[] = [];
  private scalers: Standardizer[] = [];

  constructor(p: Record<string, number>) {
    this.degree = p.degree >= 2 ? 2 : 1;
    this.hyperparameters = { degree: this.degree, lambda: p.lambda };
  }

  fit(X: number[][], Y: number[][]): void {
    if (X.length !== Y.length || X.length === 0) throw new Error("ridge-multi: inputs and targets must be non-empty and aligned");
    const m = Y[0].length;
    this.outputs = m;
    const Phi = polynomialFeatures(X, this.degree);
    const n = Phi.length;
    const k = Phi[0].length;
    this.k = k;
    const A = new Float64Array(k * k);
    for (let r = 0; r < n; r++) {
      const row = Phi[r];
      for (let i = 0; i < k; i++) {
        const base = i * k;
        for (let j = i; j < k; j++) A[base + j] += row[i] * row[j];
      }
    }
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) A[j * k + i] = A[i * k + j];
      A[i * k + i] += this.hyperparameters.lambda + 1e-12 * n;
    }
    this.L = choleskyFactor(A, k);
    this.scalers = [];
    this.weights = [];
    this.noiseVar = [];
    for (let j = 0; j < m; j++) {
      const yj = Y.map((row) => row[j]);
      const sc = standardize(yj);
      const z = sc.apply(yj);
      const b = new Float64Array(k);
      for (let r = 0; r < n; r++) {
        const row = Phi[r];
        for (let i = 0; i < k; i++) b[i] += row[i] * z[r];
      }
      const w = choleskySolveWith(this.L, b, k);
      let rss = 0;
      for (let r = 0; r < n; r++) {
        let pred = 0;
        const row = Phi[r];
        for (let i = 0; i < k; i++) pred += row[i] * w[i];
        rss += (z[r] - pred) ** 2;
      }
      const dof = Math.max(1, n - k);
      this.scalers.push(sc);
      this.weights.push(w);
      this.noiseVar.push(Math.max(rss / dof, 1e-12));
    }
    this.hyperparameters.features = k;
    this.hyperparameters.points = n;
  }

  predict(X: number[][]): MultiPrediction {
    if (!this.L) throw new Error("ridge-multi: fit before predict");
    const Phi = polynomialFeatures(X, this.degree);
    const k = this.k;
    const mean: number[][] = [];
    const std: number[][] = [];
    for (const row of Phi) {
      const phi = Float64Array.from(row);
      const v = choleskySolveWith(this.L, phi, k);
      let lev = 0;
      for (let i = 0; i < k; i++) lev += row[i] * v[i];
      const rowMean: number[] = [];
      const rowStd: number[] = [];
      for (let j = 0; j < this.outputs; j++) {
        const w = this.weights[j];
        let mu = 0;
        for (let i = 0; i < k; i++) mu += row[i] * w[i];
        const sc = this.scalers[j];
        const scale = sc.std > 0 ? sc.std : 1;
        rowMean.push(mu * scale + sc.mean);
        rowStd.push(Math.sqrt(this.noiseVar[j] * (1 + Math.max(lev, 0))) * scale);
      }
      mean.push(rowMean);
      std.push(rowStd);
    }
    return { mean, std };
  }
}

const GP_PARAMS: SurrogateParamSpec[] = [
  { id: "noise", label: "Noise variance", description: "Fixed noise variance; 0 selects it automatically.", default: 0, min: 0, max: 1 },
  { id: "lengthscale", label: "Lengthscale", description: "Fixed RBF lengthscale; 0 selects it automatically.", default: 0, min: 0, max: 100 },
  { id: "maxPoints", label: "Max training points", description: "Subsample above this size.", default: 500, min: 10, max: 3000 },
];

export const gpMultiDescriptor: MultiOutputDescriptor = {
  id: "gp",
  label: "Gaussian process (shared kernel)",
  description: "One RBF kernel and one set of hyperparameters for all outputs; shared predictive variance.",
  params: GP_PARAMS,
  create(given) {
    return new GpMulti(resolveSurrogateParams(GP_PARAMS, given));
  },
};

class GpMulti implements MultiOutputSurrogate {
  readonly id = "gp";
  readonly hyperparameters: Record<string, number> = { lengthscale: 0, noise: 0, points: 0 };
  outputs = 0;
  private X: number[][] = [];
  private L: Float64Array | null = null;
  private alphas: Float64Array[] = [];
  private scalers: Standardizer[] = [];
  private ls = 1;
  private noise = 1e-6;

  constructor(private readonly p: Record<string, number>) {}

  fit(Xin: number[][], Yin: number[][]): void {
    if (Xin.length !== Yin.length || Xin.length === 0) throw new Error("gp-multi: inputs and targets must be non-empty and aligned");
    let X = Xin;
    let Y = Yin;
    const maxN = Math.round(this.p.maxPoints);
    if (X.length > maxN) {
      const stride = X.length / maxN;
      const idx = Array.from({ length: maxN }, (_, i) => Math.floor(i * stride));
      X = idx.map((i) => Xin[i]);
      Y = idx.map((i) => Yin[i]);
    }
    this.X = X;
    this.outputs = Y[0].length;
    const n = X.length;
    this.scalers = Array.from({ length: this.outputs }, (_, j) => standardize(Y.map((r) => r[j])));
    const Z = this.scalers.map((sc, j) => sc.apply(Y.map((r) => r[j])));
    const median = gpMedianDistance(X);
    const lsGrid = this.p.lengthscale > 0 ? [this.p.lengthscale] : [0.35, 0.7, 1.4, 2.8].map((f) => f * Math.max(median, 1e-3));
    const noiseGrid = this.p.noise > 0 ? [this.p.noise] : [1e-6, 1e-4, 1e-2, 1e-1];
    let best: { lml: number; ls: number; noise: number; L: Float64Array; alphas: Float64Array[] } | null = null;
    for (const ls of lsGrid) {
      const K = gpKernelMatrix(X, ls);
      for (const noise of noiseGrid) {
        let total = 0;
        let L: Float64Array | null = null;
        const alphas: Float64Array[] = [];
        let ok = true;
        for (let j = 0; j < this.outputs; j++) {
          const f = gpFactor(K, n, noise, Z[j], L);
          if (!f) {
            ok = false;
            break;
          }
          L = f.L;
          alphas.push(f.alpha);
          total += f.lml;
        }
        if (ok && L && (!best || total > best.lml)) best = { lml: total, ls, noise, L, alphas };
      }
    }
    if (!best) throw new Error("gp-multi: no positive-definite kernel found");
    this.ls = best.ls;
    this.noise = best.noise;
    this.L = best.L;
    this.alphas = best.alphas;
    this.hyperparameters.lengthscale = best.ls;
    this.hyperparameters.noise = best.noise;
    this.hyperparameters.points = n;
    this.hyperparameters.logMarginalLikelihood = best.lml;
  }

  predict(Xs: number[][]): MultiPrediction {
    if (!this.L) throw new Error("gp-multi: fit before predict");
    const n = this.X.length;
    const mean: number[][] = [];
    const std: number[][] = [];
    for (const x of Xs) {
      const k = new Float64Array(n);
      for (let i = 0; i < n; i++) k[i] = rbf(x, this.X[i], this.ls);
      const v = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let s = k[i];
        for (let j = 0; j < i; j++) s -= this.L[i * n + j] * v[j];
        v[i] = s / this.L[i * n + i];
      }
      let vv = 0;
      for (let i = 0; i < n; i++) vv += v[i] * v[i];
      const variance = Math.max(1 - vv, 0) + this.noise;
      const rowMean: number[] = [];
      const rowStd: number[] = [];
      for (let j = 0; j < this.outputs; j++) {
        let mu = 0;
        const a = this.alphas[j];
        for (let i = 0; i < n; i++) mu += k[i] * a[i];
        const sc = this.scalers[j];
        const scale = sc.std > 0 ? sc.std : 1;
        rowMean.push(mu * scale + sc.mean);
        rowStd.push(Math.sqrt(variance) * scale);
      }
      mean.push(rowMean);
      std.push(rowStd);
    }
    return { mean, std };
  }
}
