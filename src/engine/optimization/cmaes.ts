/**
 * CMA-ES: covariance matrix adaptation evolution strategy (Hansen, 2016
 * tutorial; (mu/mu_w, lambda) with rank-one and rank-mu updates and
 * cumulative step-size adaptation).
 *
 * Runs in the normalised unit cube. Sampled points outside the bounds are
 * reflected back and the repaired points are used in the update. Selection
 * is rank-based, so constraints are handled through the shared Deb
 * comparator: feasible designs rank above infeasible ones regardless of
 * objective. Diagnostics report the step size and covariance condition
 * number, which show whether the search has collapsed or is exploiting an
 * elongated valley.
 */
import { compareDesigns, type Design } from "../core/design";
import { symmetricEigen } from "../linalg/dense";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";
import { resolveParams } from "./types";
import { reflect } from "./variation";

const PARAMS = [
  { id: "populationSize", label: "Population size (lambda)", description: "Samples per generation; 0 = 4 + floor(3 ln d).", default: 0, min: 0, max: 500, step: 1 },
  { id: "initialSigma", label: "Initial step size", description: "Initial standard deviation as a fraction of each variable's range.", default: 0.3, min: 0.01, max: 1, step: 0.05 },
];

export const cmaesDescriptor: OptimizerDescriptor = {
  id: "cmaes",
  label: "CMA-ES",
  description:
    "Covariance matrix adaptation evolution strategy: samples from an adapted Gaussian, learning the local geometry of the objective. Strong on ill-conditioned continuous problems; rank-based, so constraints use Deb's rules.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new CmaEs(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class CmaEs implements Optimizer {
  readonly id = "cmaes";
  private readonly d: number;
  private readonly lambda: number;
  private readonly mu: number;
  private readonly weights: number[];
  private readonly muEff: number;
  private readonly cSigma: number;
  private readonly dSigma: number;
  private readonly cc: number;
  private readonly c1: number;
  private readonly cMu: number;
  private readonly chiN: number;
  private mean: number[];
  private sigma: number;
  private C: Float64Array;
  private pSigma: number[];
  private pC: number[];
  private B: Float64Array;
  private D: Float64Array;
  private eigenValid = false;
  private generation = 0;
  private bestSoFar: Design | undefined;
  private pending: { design: Design; z: number[] }[] = [];
  private conditionNumber = 1;

  constructor(
    private readonly ctx: OptimizerContext,
    p: Record<string, number>,
    seeds: Design[]
  ) {
    const d = ctx.space.dimension;
    this.d = d;
    this.lambda = p.populationSize > 0 ? Math.round(p.populationSize) : 4 + Math.floor(3 * Math.log(d));
    this.mu = Math.floor(this.lambda / 2);
    const raw = Array.from({ length: this.mu }, (_, i) => Math.log(this.mu + 0.5) - Math.log(i + 1));
    const sum = raw.reduce((a, b) => a + b, 0);
    this.weights = raw.map((w) => w / sum);
    this.muEff = 1 / this.weights.reduce((a, w) => a + w * w, 0);
    this.cSigma = (this.muEff + 2) / (d + this.muEff + 5);
    this.dSigma = 1 + 2 * Math.max(0, Math.sqrt((this.muEff - 1) / (d + 1)) - 1) + this.cSigma;
    this.cc = (4 + this.muEff / d) / (d + 4 + (2 * this.muEff) / d);
    this.c1 = 2 / ((d + 1.3) ** 2 + this.muEff);
    this.cMu = Math.min(1 - this.c1, (2 * (this.muEff - 2 + 1 / this.muEff)) / ((d + 2) ** 2 + this.muEff));
    this.chiN = Math.sqrt(d) * (1 - 1 / (4 * d) + 1 / (21 * d * d));
    this.mean = seeds[0] ? ctx.space.normalize(ctx.space.clamp(seeds[0].parameters)) : Array.from({ length: d }, () => ctx.rng.next());
    this.sigma = p.initialSigma;
    this.C = new Float64Array(d * d);
    for (let i = 0; i < d; i++) this.C[i * d + i] = 1;
    this.pSigma = new Array(d).fill(0);
    this.pC = new Array(d).fill(0);
    this.B = Float64Array.from(this.C);
    this.D = new Float64Array(d).fill(1);
    this.eigenValid = true;
  }

  private updateEigen(): void {
    if (this.eigenValid) return;
    const { values, vectors } = symmetricEigen(this.C, this.d);
    for (let i = 0; i < this.d; i++) this.D[i] = Math.sqrt(Math.max(values[i], 1e-20));
    this.B = vectors;
    this.conditionNumber = (this.D[this.d - 1] / this.D[0]) ** 2;
    this.eigenValid = true;
  }

  ask(generation: number): Design[] {
    this.updateEigen();
    const d = this.d;
    this.pending = [];
    const out: Design[] = [];
    for (let k = 0; k < this.lambda; k++) {
      const z = Array.from({ length: d }, () => this.ctx.rng.gaussian());
      const x = new Array<number>(d);
      for (let i = 0; i < d; i++) {
        let s = 0;
        for (let j = 0; j < d; j++) s += this.B[i * d + j] * this.D[j] * z[j];
        x[i] = reflect(this.mean[i] + this.sigma * s);
      }
      const design: Design = { id: this.ctx.nextId(), generation, parentIds: [], operator: "mutation", parameters: this.ctx.space.denormalize(x) };
      this.pending.push({ design, z });
      out.push(design);
    }
    return out;
  }

  tell(evaluated: Design[]): void {
    const d = this.d;
    const objId = this.ctx.objective.id;
    const dir = this.ctx.objective.direction;
    const byId = new Map(evaluated.filter((e) => e.evaluation).map((e) => [e.id, e]));
    const ranked = this.pending
      .map((p) => ({ ...p, design: byId.get(p.design.id) ?? p.design }))
      .filter((p) => p.design.evaluation)
      .sort((a, b) => compareDesigns(a.design, b.design, objId, dir));
    for (const r of ranked) {
      if (!this.bestSoFar || compareDesigns(r.design, this.bestSoFar, objId, dir) < 0) this.bestSoFar = r.design;
    }
    if (ranked.length < this.mu) return;
    const oldMean = this.mean.slice();
    // Use repaired (reflected) points so the update is consistent with what was evaluated.
    const xs = ranked.slice(0, this.mu).map((r) => this.ctx.space.normalize(r.design.parameters));
    const newMean = new Array<number>(d).fill(0);
    for (let i = 0; i < this.mu; i++) for (let j = 0; j < d; j++) newMean[j] += this.weights[i] * xs[i][j];
    const yw = newMean.map((m, j) => (m - oldMean[j]) / this.sigma);
    // C^{-1/2} y_w = B D^{-1} B^T y_w
    const bty = new Array<number>(d).fill(0);
    for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) bty[j] += this.B[i * d + j] * yw[i];
    const cInvSqrtY = new Array<number>(d).fill(0);
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cInvSqrtY[i] += (this.B[i * d + j] * bty[j]) / this.D[j];
    const csFactor = Math.sqrt(this.cSigma * (2 - this.cSigma) * this.muEff);
    for (let i = 0; i < d; i++) this.pSigma[i] = (1 - this.cSigma) * this.pSigma[i] + csFactor * cInvSqrtY[i];
    const psNorm = Math.sqrt(this.pSigma.reduce((s, v) => s + v * v, 0));
    this.generation++;
    const hSig = psNorm / Math.sqrt(1 - (1 - this.cSigma) ** (2 * this.generation)) / this.chiN < 1.4 + 2 / (d + 1) ? 1 : 0;
    const ccFactor = Math.sqrt(this.cc * (2 - this.cc) * this.muEff);
    for (let i = 0; i < d; i++) this.pC[i] = (1 - this.cc) * this.pC[i] + hSig * ccFactor * yw[i];
    // Covariance: rank-one + rank-mu.
    const ys = xs.map((x) => x.map((v, j) => (v - oldMean[j]) / this.sigma));
    const deltaH = (1 - hSig) * this.cc * (2 - this.cc);
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let rankMu = 0;
        for (let k = 0; k < this.mu; k++) rankMu += this.weights[k] * ys[k][i] * ys[k][j];
        this.C[i * d + j] = (1 - this.c1 - this.cMu) * this.C[i * d + j] + this.c1 * (this.pC[i] * this.pC[j] + deltaH * this.C[i * d + j]) + this.cMu * rankMu;
      }
    }
    this.sigma *= Math.exp((this.cSigma / this.dSigma) * (psNorm / this.chiN - 1));
    this.sigma = Math.min(this.sigma, 1);
    this.mean = newMean;
    this.eigenValid = false;
    this.pending = [];
  }

  best(): Design | undefined {
    return this.bestSoFar;
  }

  population(): Design[] {
    return this.bestSoFar ? [this.bestSoFar] : [];
  }

  diagnostics(): Record<string, unknown> {
    this.updateEigen();
    return { sigma: this.sigma, conditionNumber: this.conditionNumber, generations: this.generation, lambda: this.lambda, mu: this.mu, muEff: this.muEff };
  }
}
