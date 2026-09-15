/**
 * Surrogate-assisted (mu + lambda) evolutionary search.
 *
 * An inner evolutionary optimiser proposes k x lambda children per
 * generation. Once enough designs have been evaluated, ridge surrogates
 * (degree-2 polynomial, log targets) are fitted on the archive for the
 * objective and every constraint metric; the children are ranked under
 * Deb's rules using *predicted* metrics and only the top lambda are sent to
 * the solver. Because predictions are made before the solver runs, every
 * generation yields an honest online accuracy measurement (predicted vs
 * actual on the designs that were evaluated), which is recorded.
 *
 * The solver remains the only source of recorded results; the surrogate
 * only decides which candidates get its attention.
 */
import { checkConstraints, compareDesigns, type Design, type Evaluation } from "../core/design";
import { choleskySolve } from "../linalg/dense";
import { r2 } from "../ml/metrics";
import { featureCount, polynomialFeatures } from "../ml/models/features";
import { evolutionaryDescriptor } from "./evolutionary";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";
import { resolveParams } from "./types";

const PARAMS = [
  ...evolutionaryDescriptor.params.filter((p) => p.id !== "offspringSize"),
  {
    id: "screeningFactor",
    label: "Screening factor",
    description: "Children proposed per solver evaluation; the surrogate keeps the best 1/k.",
    default: 4,
    min: 1,
    max: 20,
    step: 1,
  },
  {
    id: "warmupEvaluations",
    label: "Warm-up evaluations",
    description: "Solver evaluations collected before the surrogate starts screening.",
    default: 240,
    min: 20,
    max: 5000,
    step: 10,
  },
  {
    id: "archiveSize",
    label: "Archive size",
    description: "Most recent evaluated designs used to fit the surrogates.",
    default: 1500,
    min: 50,
    max: 20000,
    step: 50,
  },
];

export const surrogateEvolutionaryDescriptor: OptimizerDescriptor = {
  id: "surrogate-evolutionary",
  label: "Surrogate-assisted evolutionary",
  description:
    "Evolutionary search where quadratic ridge surrogates, refitted every generation on the evaluated archive, pre-screen k times more children than the solver evaluates. Online prediction accuracy is recorded.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new SurrogateEvolutionary(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class SurrogateEvolutionary implements Optimizer {
  readonly id = "surrogate-evolutionary";
  private readonly inner: Optimizer;
  private readonly archive: Design[] = [];
  /** Incremental normal equations shared by all targets: Phi^T Phi and Phi^T y_t. */
  private gram: Float64Array;
  private rhs: Record<string, Float64Array> = {};
  private readonly k: number;
  private readonly lambda: number;
  private readonly targets: string[];
  private pendingPredictions = new Map<string, Record<string, number>>();
  private readonly pairs: Record<string, { actual: number[]; predicted: number[] }> = {};
  private screenedGenerations = 0;
  private lastFitMs = 0;

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    seeds: Design[]
  ) {
    this.lambda = Math.round(p.populationSize);
    const k = Math.round(p.screeningFactor);
    this.inner = evolutionaryDescriptor.create(
      ctx,
      { ...p, offspringSize: this.lambda * k },
      seeds
    );
    const spec = ctx.screening;
    this.targets = spec ? Array.from(new Set([spec.objectiveMetric, ...spec.constraints.map((c) => c.metric)])) : [];
    for (const t of this.targets) this.pairs[t] = { actual: [], predicted: [] };
    this.k = featureCount(ctx.space.dimension, 2);
    this.gram = new Float64Array(this.k * this.k);
    for (const t of this.targets) this.rhs[t] = new Float64Array(this.k);
  }

  /** Add (or, with sign -1, remove) one design's contribution to the normal equations. */
  private accumulate(d: Design, sign: 1 | -1): void {
    const phi = polynomialFeatures([this.ctx.space.normalize(d.parameters)], 2)[0];
    const k = this.k;
    for (let i = 0; i < k; i++) {
      const pi = phi[i] * sign;
      const base = i * k;
      for (let j = i; j < k; j++) this.gram[base + j] += pi * phi[j];
    }
    for (const t of this.targets) {
      const y = Math.log(Math.max(d.evaluation!.metrics[t], 1e-12));
      const r = this.rhs[t];
      for (let i = 0; i < k; i++) r[i] += phi[i] * y * sign;
    }
  }

  ask(generation: number): Design[] {
    const proposals = this.inner.ask(generation);
    if (generation === 0 || !this.ctx.screening || this.archive.length < this.p.warmupEvaluations) {
      return proposals.slice(0, Math.max(this.lambda, generation === 0 ? proposals.length : this.lambda));
    }
    const t0 = now();
    const models = this.fitModels();
    this.lastFitMs = now() - t0;
    const Phi = polynomialFeatures(proposals.map((d) => this.ctx.space.normalize(d.parameters)), 2);
    const predicted: Record<string, number[]> = {};
    for (const t of this.targets) {
      const w = models[t];
      predicted[t] = Phi.map((row) => {
        let acc = 0;
        for (let i = 0; i < row.length; i++) acc += row[i] * w[i];
        return Math.exp(acc);
      });
    }
    const spec = this.ctx.screening;
    const scored = proposals.map((d, i) => {
      const metrics: Record<string, number> = {};
      for (const t of this.targets) metrics[t] = predicted[t][i];
      const constraints = checkConstraints(spec.constraints, metrics);
      const totalViolation = constraints.reduce((s, c) => s + c.violation, 0);
      const ev: Evaluation = {
        status: "ok",
        metrics,
        objectives: { [this.ctx.objective.id]: metrics[spec.objectiveMetric] },
        constraints,
        feasible: totalViolation === 0,
        totalViolation,
        diagnostics: [],
        fidelity: "surrogate",
        backend: "ridge-poly2",
      };
      return { design: d, proxy: { ...d, evaluation: ev } as Design, metrics };
    });
    scored.sort((a, b) => compareDesigns(a.proxy, b.proxy, this.ctx.objective.id, this.ctx.objective.direction));
    const chosen = scored.slice(0, this.lambda);
    this.pendingPredictions = new Map(chosen.map((c) => [c.design.id, c.metrics]));
    this.screenedGenerations++;
    return chosen.map((c) => c.design);
  }

  tell(evaluated: Design[]): void {
    for (const d of evaluated) {
      if (!d.evaluation || d.evaluation.status !== "ok") continue;
      this.archive.push(d);
      this.accumulate(d, 1);
      const pred = this.pendingPredictions.get(d.id);
      if (pred) {
        for (const t of this.targets) {
          const a = d.evaluation.metrics[t];
          if (Number.isFinite(a) && Number.isFinite(pred[t])) {
            this.pairs[t].actual.push(a);
            this.pairs[t].predicted.push(pred[t]);
          }
        }
      }
    }
    const cap = Math.round(this.p.archiveSize);
    if (this.archive.length > cap) {
      for (const old of this.archive.splice(0, this.archive.length - cap)) this.accumulate(old, -1);
    }
    this.pendingPredictions.clear();
    this.inner.tell(evaluated);
  }

  best(): Design | undefined {
    return this.inner.best();
  }

  population(): Design[] {
    return this.inner.population();
  }

  diagnostics(): Record<string, unknown> {
    const onlineR2: Record<string, number> = {};
    let pairsCount = 0;
    for (const t of this.targets) {
      const pr = this.pairs[t];
      pairsCount = Math.max(pairsCount, pr.actual.length);
      onlineR2[t] = pr.actual.length > 2 ? r2(pr.actual, pr.predicted) : NaN;
    }
    return {
      surrogate: "ridge-poly2-log",
      screeningFactor: this.p.screeningFactor,
      screenedGenerations: this.screenedGenerations,
      archiveSize: this.archive.length,
      predictedPairs: pairsCount,
      onlineR2,
      lastFitMs: this.lastFitMs,
    };
  }

  /** Solve the shared ridge normal equations for every target; returns weights per target. */
  private fitModels(): Record<string, Float64Array> {
    const k = this.k;
    const A = new Float64Array(k * k);
    const n = this.archive.length;
    for (let i = 0; i < k; i++) {
      for (let j = i; j < k; j++) {
        const v = this.gram[i * k + j];
        A[i * k + j] = v;
        A[j * k + i] = v;
      }
      A[i * k + i] += 1e-4 + 1e-12 * n;
    }
    const weights: Record<string, Float64Array> = {};
    for (const t of this.targets) weights[t] = choleskySolve(A, this.rhs[t], k);
    return weights;
  }
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
