/**
 * Constrained Bayesian optimisation.
 *
 * Gaussian processes model the log of the objective metric and of every
 * constraint metric as functions of the normalised design vector. Each
 * generation, a batch of q candidates maximises the constrained expected
 * improvement
 *
 *   EI(x) * prod_c P(g_c(x) <= limit_c)
 *
 * over a pool of random and locally perturbed points, with a simple
 * minimum-distance rule for batch diversity. The initial design is a
 * seeded Latin hypercube. Above `maxPoints`, the GPs are fitted on the best
 * designs plus the most recent ones to bound the O(n^3) cost.
 *
 * References: Jones, Schonlau & Welch (1998); Gardner et al. (2014) for the
 * probability-of-feasibility weighting.
 */
import { compareDesigns, type Design } from "../core/design";
import type { Rng } from "../core/rng";
import { createSurrogate, type SurrogateModel } from "../ml/models";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";
import { resolveParams } from "./types";

const PARAMS = [
  { id: "batchSize", label: "Batch size", description: "Candidates evaluated per generation.", default: 8, min: 1, max: 64, step: 1 },
  { id: "initialDesigns", label: "Initial designs", description: "Latin-hypercube samples evaluated before the model is used.", default: 40, min: 4, max: 1000, step: 1 },
  { id: "candidatePool", label: "Candidate pool", description: "Points at which the acquisition is evaluated each generation.", default: 1200, min: 100, max: 50000, step: 100 },
  { id: "maxPoints", label: "Max GP points", description: "Training-set cap for the Gaussian processes.", default: 300, min: 20, max: 1500, step: 10 },
  { id: "hyperparameterInterval", label: "Hyperparameter interval", description: "Generations between marginal-likelihood re-selection of GP hyperparameters.", default: 5, min: 1, max: 100, step: 1 },
  { id: "exploration", label: "Exploration (xi)", description: "Improvement margin in EI, in standardised log-objective units.", default: 0.01, min: 0, max: 1 },
];

export const bayesianDescriptor: OptimizerDescriptor = {
  id: "bayesian",
  label: "Bayesian optimisation (GP)",
  description:
    "Gaussian-process surrogates on the objective and each constraint, constrained expected improvement, batch proposals. Sample-efficient at small evaluation budgets; the GP cost grows with the number of points.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new BayesianOptimizer(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class BayesianOptimizer implements Optimizer {
  readonly id = "bayesian";
  private archive: Design[] = [];
  private bestSoFar: Design | undefined;
  private initialised = false;
  private readonly targets: string[];
  private readonly rng: Rng;
  private lastHyper: Record<string, number> = {};
  private gpPoints = 0;
  private modelGenerations = 0;
  private fitsSinceSelection = Infinity;

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    private readonly seeds: Design[]
  ) {
    this.rng = ctx.rng.fork("bayesian");
    const spec = ctx.screening;
    this.targets = spec ? Array.from(new Set([spec.objectiveMetric, ...spec.constraints.map((c) => c.metric)])) : [];
  }

  ask(generation: number): Design[] {
    if (!this.initialised) {
      this.initialised = true;
      const n = Math.round(this.p.initialDesigns);
      const out: Design[] = this.seeds.slice(0, n).map((s) => ({ ...s, generation: 0, parameters: this.ctx.space.clamp(s.parameters) }));
      const lhs = latinHypercube(n - out.length, this.ctx.space.dimension, this.rng);
      for (const u of lhs) out.push({ id: this.ctx.nextId(), generation: 0, parentIds: [], operator: "initial", parameters: this.ctx.space.denormalize(u) });
      return out;
    }
    const spec = this.ctx.screening;
    const q = Math.round(this.p.batchSize);
    if (!spec || this.archive.length < 4) return this.randomBatch(generation, q);

    const models = this.fitModels();
    this.modelGenerations++;
    const pool = this.candidatePool();
    const X = pool;
    const preds: Record<string, { mean: number[]; std: number[] }> = {};
    for (const t of this.targets) {
      const pr = models[t].predict(X);
      preds[t] = { mean: pr.mean, std: pr.std ?? pr.mean.map(() => 0) };
    }
    const feasibleBest = this.archive.filter((d) => d.evaluation?.feasible).sort((a, b) => this.cmp(a, b))[0];
    const objT = spec.objectiveMetric;
    const fBest = feasibleBest
      ? Math.log(Math.max(feasibleBest.evaluation!.metrics[objT], 1e-12))
      : Math.min(...this.archive.map((d) => Math.log(Math.max(d.evaluation!.metrics[objT], 1e-12))));
    const xi = this.p.exploration;
    const scores = X.map((_, i) => {
      const mu = preds[objT].mean[i];
      const sd = Math.max(preds[objT].std[i], 1e-9);
      const ei = this.ctx.objective.direction === "minimize" ? expectedImprovementMin(mu, sd, fBest - xi) : expectedImprovementMin(-mu, sd, -fBest - xi);
      let pf = 1;
      for (const c of spec.constraints) {
        const m = preds[c.metric].mean[i];
        const s = Math.max(preds[c.metric].std[i], 1e-9);
        const lim = Math.log(Math.max(c.limit, 1e-12));
        const z = c.op === "<=" ? (lim - m) / s : (m - lim) / s;
        pf *= normalCdf(z);
      }
      return ei * pf;
    });
    const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]);
    const chosen: number[] = [];
    const minDist = 0.05 * Math.sqrt(this.ctx.space.dimension);
    for (const i of order) {
      if (chosen.length >= q) break;
      if (chosen.every((j) => dist(X[i], X[j]) > minDist)) chosen.push(i);
    }
    while (chosen.length < q) chosen.push(order[chosen.length]);
    return chosen.map((i) => ({
      id: this.ctx.nextId(),
      generation,
      parentIds: feasibleBest ? [feasibleBest.id] : [],
      operator: "surrogate-proposal",
      parameters: this.ctx.space.denormalize(X[i]),
    }));
  }

  tell(evaluated: Design[]): void {
    for (const d of evaluated) {
      if (!d.evaluation) continue;
      if (d.evaluation.status === "ok") this.archive.push(d);
      if (!this.bestSoFar || this.cmp(d, this.bestSoFar) < 0) this.bestSoFar = d;
    }
  }

  best(): Design | undefined {
    return this.bestSoFar;
  }

  population(): Design[] {
    return this.archive.slice(-Math.round(this.p.batchSize));
  }

  diagnostics(): Record<string, unknown> {
    const lengthscale: Record<string, number> = {};
    const noise: Record<string, number> = {};
    for (const t of this.targets) {
      lengthscale[t] = this.lastHyper[`${t}:lengthscale`] ?? NaN;
      noise[t] = this.lastHyper[`${t}:noise`] ?? NaN;
    }
    return { surrogate: "gp-rbf-log", gpPoints: this.gpPoints, modelGenerations: this.modelGenerations, lengthscale, noise, archiveSize: this.archive.length };
  }

  private cmp(a: Design, b: Design): number {
    return compareDesigns(a, b, this.ctx.objective.id, this.ctx.objective.direction);
  }

  private randomBatch(generation: number, q: number): Design[] {
    return Array.from({ length: q }, () => ({
      id: this.ctx.nextId(),
      generation,
      parentIds: [],
      operator: "random",
      parameters: this.ctx.space.sample(this.rng),
    }));
  }

  /** Training set: best designs plus most recent, capped. */
  private trainingSet(): Design[] {
    const cap = Math.round(this.p.maxPoints);
    if (this.archive.length <= cap) return this.archive;
    const sorted = this.archive.slice().sort((a, b) => this.cmp(a, b));
    const half = Math.floor(cap / 2);
    const best = sorted.slice(0, half);
    const ids = new Set(best.map((d) => d.id));
    const recent = this.archive.slice().reverse().filter((d) => !ids.has(d.id)).slice(0, cap - half);
    return best.concat(recent);
  }

  private fitModels(): Record<string, SurrogateModel> {
    const train = this.trainingSet();
    this.gpPoints = train.length;
    const X = train.map((d) => this.ctx.space.normalize(d.parameters));
    const models: Record<string, SurrogateModel> = {};
    const reselect = this.fitsSinceSelection >= this.p.hyperparameterInterval;
    for (const t of this.targets) {
      const y = train.map((d) => Math.log(Math.max(d.evaluation!.metrics[t], 1e-12)));
      const params: Record<string, number> = { maxPoints: Math.round(this.p.maxPoints) };
      if (!reselect) {
        params.lengthscale = this.lastHyper[`${t}:lengthscale`] ?? 0;
        params.noise = this.lastHyper[`${t}:noise`] ?? 0;
      }
      const m = createSurrogate("gp", params, this.rng);
      m.fit(X, y);
      models[t] = m;
      this.lastHyper[`${t}:lengthscale`] = m.hyperparameters.lengthscale;
      this.lastHyper[`${t}:noise`] = m.hyperparameters.noise;
    }
    this.fitsSinceSelection = reselect ? 1 : this.fitsSinceSelection + 1;
    return models;
  }

  /** Half uniform, half Gaussian perturbations of the best feasible designs. */
  private candidatePool(): number[][] {
    const n = Math.round(this.p.candidatePool);
    const d = this.ctx.space.dimension;
    const pool: number[][] = [];
    const nUniform = Math.floor(n / 2);
    for (let i = 0; i < nUniform; i++) pool.push(Array.from({ length: d }, () => this.rng.next()));
    const elite = this.archive.slice().sort((a, b) => this.cmp(a, b)).slice(0, 5).map((e) => this.ctx.space.normalize(e.parameters));
    const sigmas = [0.02, 0.05, 0.1];
    while (pool.length < n && elite.length > 0) {
      const base = elite[this.rng.int(elite.length)];
      const sigma = sigmas[this.rng.int(sigmas.length)];
      pool.push(base.map((v) => clamp01(v + this.rng.gaussian() * sigma)));
    }
    return pool;
  }
}

export function latinHypercube(n: number, d: number, rng: Rng): number[][] {
  if (n <= 0) return [];
  const cols: number[][] = [];
  for (let j = 0; j < d; j++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const k = rng.int(i + 1);
      [perm[i], perm[k]] = [perm[k], perm[i]];
    }
    cols.push(perm.map((p) => (p + rng.next()) / n));
  }
  return Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
}

/** EI for minimisation with target f_best: E[max(f_best - f, 0)], f ~ N(mu, sd^2). */
export function expectedImprovementMin(mu: number, sd: number, fBest: number): number {
  const z = (fBest - mu) / sd;
  return (fBest - mu) * normalCdf(z) + sd * normalPdf(z);
}

export function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

export function normalCdf(z: number): number {
  // Abramowitz & Stegun 7.1.26, |error| < 1.5e-7
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - normalPdf(z) * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

function dist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
