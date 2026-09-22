/**
 * Hybrid learned/physics predictor.
 *
 *   design parameters -> multi-output surrogate -> member axial forces (mu, sigma)
 *                     -> exact stress and Euler equations -> utilisations -> feasibility
 *
 * Metrics the domain cannot derive from responses (here: deflection) are
 * predicted by a single-output surrogate in log space. Two derivations are
 * produced per candidate: `nominal` from the predicted means, and
 * `conservative` from mu shifted by k*sigma in the unfavourable direction
 * for each check (larger |force| for stress, more compressive force for
 * buckling, larger deflection). k = 0 makes the two identical. The solver,
 * never this predictor, produces recorded results.
 */
import { checkConstraints, type ConstraintResult } from "../core/design";
import type { Rng } from "../core/rng";
import type { CompiledProblem } from "../domains/domain";
import { standardize, type Dataset } from "./dataset";
import { mae, r2, rmse, coverage } from "./metrics";
import { createMultiOutputSurrogate, createSurrogate, type MultiOutputSurrogate, type SurrogateModel } from "./models";

export interface HybridOptions {
  /** Multi-output model id for member forces ("ridge" | "gp"). */
  memberModel: string;
  /** Conservative bound multiplier k in mu + k*sigma. */
  riskK: number;
  /** Single-output model id for non-derivable metrics (default "ridge"). */
  globalModel?: string;
  memberParams?: Record<string, number>;
}

export interface PredictedEvaluation {
  metrics: Record<string, number>;
  constraints: ConstraintResult[];
  feasible: boolean;
  totalViolation: number;
}

export interface HybridPrediction {
  forces: { mean: number[]; std: number[] };
  nominal: PredictedEvaluation;
  conservative: PredictedEvaluation;
  /** Predictive std of non-derivable metrics in log space, keyed by metric id. */
  globalStd: Record<string, number>;
}

export interface ForceAccuracy {
  perMemberMae: number[];
  perMemberRmse: number[];
  overallR2: number;
  coverage95: number;
  meanStd: number;
  /** Pearson correlation between |error| and predicted std (positive = uncertainty is informative). */
  errorStdCorrelation: number;
}

export class HybridPredictor {
  private member: MultiOutputSurrogate | null = null;
  private globals = new Map<string, SurrogateModel>();
  /** Training log-range per global metric, widened by e^3, to clamp extrapolations. */
  private globalRange = new Map<string, [number, number]>();
  private readonly forceId: string;
  private readonly nonDerivable: string[];
  private trainedOn = 0;

  constructor(
    private readonly compiled: CompiledProblem,
    private readonly opts: HybridOptions,
    private readonly rng: Rng
  ) {
    const rm = compiled.responseModel;
    if (!rm) throw new Error("hybrid predictor needs a domain response model");
    this.forceId = rm.responseIds[0];
    const needed = new Set([...compiled.problem.constraints.map((c) => c.metric), ...compiled.problem.objectives.map((o) => o.metric)]);
    this.nonDerivable = Array.from(needed).filter((m) => !rm.derivableMetrics.includes(m));
  }

  get trainingSize(): number {
    return this.trainedOn;
  }

  fit(ds: Dataset): void {
    if (!ds.responseIds.includes(this.forceId)) throw new Error(`dataset lacks response "${this.forceId}"`);
    this.member = createMultiOutputSurrogate(this.opts.memberModel, this.opts.memberParams ?? {}, this.rng.fork("member"));
    this.member.fit(ds.inputs, ds.responseMatrix(this.forceId));
    this.globals.clear();
    for (const m of this.nonDerivable) {
      const y = ds.targets[m];
      if (!y) continue;
      const logs = y.map((v) => Math.log(Math.max(v, 1e-15)));
      const model = createSurrogate(this.opts.globalModel ?? "ridge", {}, this.rng.fork(`global:${m}`));
      model.fit(ds.inputs, logs);
      this.globals.set(m, model);
      this.globalRange.set(m, [Math.min(...logs) - 3, Math.max(...logs) + 3]);
    }
    this.trainedOn = ds.size;
  }

  /** Exact derivation from a known force vector (and known non-derivable metrics). */
  deriveFromForces(params: number[], forces: number[], ...extra: number[]): PredictedEvaluation {
    const rm = this.compiled.responseModel!;
    const metrics = rm.derive(params, { [this.forceId]: forces });
    this.nonDerivable.forEach((m, i) => {
      if (extra[i] !== undefined) metrics[m] = extra[i];
    });
    return this.finish(metrics);
  }

  predict(paramsList: number[][]): HybridPrediction[] {
    if (!this.member) throw new Error("hybrid predictor: fit before predict");
    const rm = this.compiled.responseModel!;
    const X = paramsList.map((p) => this.compiled.space.normalize(p));
    const f = this.member.predict(X);
    const globalPred = new Map<string, { mean: number[]; std: number[] }>();
    for (const [m, model] of this.globals) {
      const pr = model.predict(X);
      globalPred.set(m, { mean: pr.mean, std: pr.std ?? pr.mean.map(() => 0) });
    }
    const k = this.opts.riskK;
    return paramsList.map((params, i) => {
      const mu = f.mean[i];
      const sd = f.std?.[i] ?? mu.map(() => 0);
      const nominalMetrics = rm.derive(params, { [this.forceId]: mu });
      // Stress: larger magnitude. Buckling: more compressive. Evaluate each with its own shifted vector.
      const stressForces = mu.map((v, j) => Math.sign(v || 1) * (Math.abs(v) + k * sd[j]));
      const bucklingForces = mu.map((v, j) => v - k * sd[j]);
      const dStress = rm.derive(params, { [this.forceId]: stressForces });
      const dBuck = rm.derive(params, { [this.forceId]: bucklingForces });
      const conservativeMetrics: Record<string, number> = { ...nominalMetrics };
      if ("stressUtilization" in dStress) conservativeMetrics.stressUtilization = Math.max(nominalMetrics.stressUtilization, dStress.stressUtilization);
      if ("maxStress_Pa" in dStress) conservativeMetrics.maxStress_Pa = Math.max(nominalMetrics.maxStress_Pa, dStress.maxStress_Pa);
      if ("bucklingUtilization" in dBuck) conservativeMetrics.bucklingUtilization = Math.max(nominalMetrics.bucklingUtilization, dBuck.bucklingUtilization);
      const globalStd: Record<string, number> = {};
      for (const [m, pr] of globalPred) {
        // Clamp log-space extrapolations to the training range (widened by
        // e^3) so a wild prediction is a large finite error, not Infinity.
        const [lo, hi] = this.globalRange.get(m) ?? [-Infinity, Infinity];
        const mu = Math.min(hi, Math.max(lo, pr.mean[i]));
        nominalMetrics[m] = Math.exp(mu);
        conservativeMetrics[m] = Math.exp(Math.min(hi, mu + k * pr.std[i]));
        globalStd[m] = pr.std[i];
      }
      return {
        forces: { mean: mu, std: sd },
        nominal: this.finish(nominalMetrics),
        conservative: this.finish(conservativeMetrics),
        globalStd,
      };
    });
  }

  /** Accuracy of the member-force model against solver forces. */
  forceAccuracy(paramsList: number[][], actual: number[][]): ForceAccuracy {
    const preds = this.predict(paramsList);
    const m = actual[0].length;
    const perMemberMae: number[] = [];
    const perMemberRmse: number[] = [];
    const allA: number[] = [];
    const allP: number[] = [];
    const allS: number[] = [];
    for (let j = 0; j < m; j++) {
      const a = actual.map((r) => r[j]);
      const p = preds.map((r) => r.forces.mean[j]);
      perMemberMae.push(mae(a, p));
      perMemberRmse.push(rmse(a, p));
      allA.push(...a);
      allP.push(...p);
      allS.push(...preds.map((r) => r.forces.std[j]));
    }
    const errors = allA.map((a, i) => Math.abs(a - allP[i]));
    return {
      perMemberMae,
      perMemberRmse,
      overallR2: r2(allA, allP),
      coverage95: coverage(allA, allP, allS, 1.96),
      meanStd: allS.reduce((s, v) => s + v, 0) / allS.length,
      errorStdCorrelation: pearson(errors, allS),
    };
  }

  private finish(metrics: Record<string, number>): PredictedEvaluation {
    const constraints = checkConstraints(this.compiled.problem.constraints, metrics);
    const totalViolation = constraints.reduce((s, c) => s + c.violation, 0);
    return { metrics, constraints, feasible: totalViolation === 0, totalViolation };
  }
}

function pearson(a: number[], b: number[]): number {
  const sa = standardize(a);
  const sb = standardize(b);
  if (sa.std === 0 || sb.std === 0) return 0;
  const za = sa.apply(a);
  const zb = sb.apply(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += za[i] * zb[i];
  return s / a.length;
}
