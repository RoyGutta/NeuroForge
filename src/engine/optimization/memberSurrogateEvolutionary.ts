/**
 * Uncertainty-aware, member-surrogate-assisted (mu + lambda) evolution.
 *
 * Screening pipeline per generation (after warm-up):
 *   inner EA proposes k x lambda children
 *   -> hybrid predictor: member forces (mu, sigma) -> exact stress / Euler
 *      -> nominal and conservative (mu + k sigma) utilisations, deflection
 *   -> acquisition: exploit the best conservatively-feasible candidates
 *      (Deb order on conservative metrics), explore the most uncertain
 *      nominally-feasible ones for a fraction of the batch
 *   -> only the selected lambda go to the finite-element solver.
 *
 * Every prediction made for a design that is then solved is kept, so the
 * diagnostics (feasibility confusion, force error, calibration, funnel) are
 * measured on exactly the designs the model gated. The solver is the only
 * source of recorded results.
 */
import { checkConstraints, compareDesigns, type Design, type Evaluation } from "../core/design";
import { buildDataset } from "../ml/dataset";
import { HybridPredictor, type ForceAccuracy, type HybridPrediction } from "../ml/hybrid";
import { calibrationBins, confusionFromPairs, type CalibrationBin, type FeasibilityConfusion } from "../ml/reliability";
import { coverage, mae, r2, rmse } from "../ml/metrics";
import type { CompiledProblem } from "../domains/domain";
import { evolutionaryDescriptor } from "./evolutionary";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";
import { resolveParams } from "./types";

const PARAMS = [
  ...evolutionaryDescriptor.params.filter((p) => p.id !== "offspringSize"),
  { id: "screeningFactor", label: "Screening factor", description: "Children proposed per solver evaluation.", default: 4, min: 1, max: 20, step: 1 },
  { id: "warmupEvaluations", label: "Warm-up evaluations", description: "Solver evaluations before screening starts.", default: 240, min: 20, max: 5000, step: 10 },
  { id: "archiveSize", label: "Archive size", description: "Most recent solved designs used for training.", default: 1000, min: 50, max: 20000, step: 50 },
  { id: "riskK", label: "Risk multiplier k", description: "Conservative bound mu + k*sigma on member forces for the feasibility screen.", default: 2, min: 0, max: 5, step: 0.5 },
  { id: "exploreFraction", label: "Exploration fraction", description: "Share of each solver batch spent on the most uncertain nominally-feasible candidates.", default: 0.2, min: 0, max: 0.9, step: 0.05 },
  { id: "refitEvery", label: "Refit interval", description: "Generations between model refits.", default: 2, min: 1, max: 50, step: 1 },
];

export const memberSurrogateEvolutionaryDescriptor: OptimizerDescriptor = {
  id: "member-surrogate-evolutionary",
  label: "Member-surrogate evolutionary (uncertainty-aware)",
  description:
    "Predicts every member's axial force with a Bayesian ridge surrogate, derives stress and buckling exactly, screens with a k-sigma conservative bound and spends part of each batch on the most uncertain candidates. Reliability of the screen is measured and recorded.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new MemberSurrogateEvolutionary(ctx, resolveParams(PARAMS, given), seeds);
  },
};

export interface ScreeningFunnel {
  candidatesGenerated: number;
  surrogatePredictions: number;
  passedScreening: number;
  sentToSolver: number;
  warmupEvaluations: number;
  explorationPicks: number;
}

export interface MemberSurrogateDiagnostics {
  surrogate: string;
  policy: { riskK: number; exploreFraction: number };
  funnel: ScreeningFunnel;
  /** Confusion of the conservative (risk-adjusted) screen against the solver. */
  feasibility: FeasibilityConfusion;
  /** Confusion of the nominal (mean) prediction against the solver. */
  feasibilityNominal: FeasibilityConfusion;
  forces: ForceAccuracy;
  calibration: CalibrationBin[];
  screenedGenerations: number;
  refits: number;
  lastFitMs: number;
  trainingSize: number;
}

interface PendingPrediction {
  prediction: HybridPrediction;
  exploration: boolean;
}

class MemberSurrogateEvolutionary implements Optimizer {
  readonly id = "member-surrogate-evolutionary";
  private readonly inner: Optimizer;
  private readonly archive: Design[] = [];
  private readonly lambda: number;
  private predictor: HybridPredictor | null = null;
  private pending = new Map<string, PendingPrediction>();
  private readonly pairs: { predicted: boolean; actual: boolean }[] = [];
  private readonly pairsNominal: { predicted: boolean; actual: boolean }[] = [];
  private readonly forceActual: number[][] = [];
  private readonly forcePred: number[][] = [];
  private readonly forceStd: number[][] = [];
  private funnel: ScreeningFunnel = { candidatesGenerated: 0, surrogatePredictions: 0, passedScreening: 0, sentToSolver: 0, warmupEvaluations: 0, explorationPicks: 0 };
  private screenedGenerations = 0;
  private refits = 0;
  private lastFitMs = 0;
  private sinceFit = Infinity;
  private readonly forceId: string;
  private readonly nonDerivable: string[];

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    seeds: Design[]
  ) {
    this.lambda = Math.round(p.populationSize);
    this.inner = evolutionaryDescriptor.create(ctx, { ...p, offspringSize: this.lambda * Math.round(p.screeningFactor) }, seeds);
    const compiled = ctx.compiled;
    if (!compiled?.responseModel) throw new Error("member-surrogate optimiser needs a compiled problem with a response model");
    this.forceId = compiled.responseModel.responseIds[0];
    const needed = new Set([...compiled.problem.constraints.map((c) => c.metric), ...compiled.problem.objectives.map((o) => o.metric)]);
    this.nonDerivable = Array.from(needed).filter((m) => !compiled.responseModel!.derivableMetrics.includes(m));
  }

  private get compiled(): CompiledProblem {
    return this.ctx.compiled!;
  }

  ask(generation: number): Design[] {
    const proposals = this.inner.ask(generation);
    const warm = generation === 0 || this.archive.length < this.p.warmupEvaluations;
    if (warm) {
      const batch = generation === 0 ? proposals : proposals.slice(0, this.lambda);
      this.funnel.warmupEvaluations += batch.length;
      return batch;
    }
    if (this.sinceFit >= this.p.refitEvery || !this.predictor) {
      const t0 = now();
      this.predictor = new HybridPredictor(this.compiled, { memberModel: "ridge", riskK: this.p.riskK }, this.ctx.rng.fork("member-surrogate"));
      this.predictor.fit(buildDataset(this.ctx.space, this.archive, this.nonDerivable, [this.forceId]));
      this.lastFitMs = now() - t0;
      this.refits++;
      this.sinceFit = 0;
    }
    this.sinceFit++;
    const preds = this.predictor.predict(proposals.map((d) => d.parameters));
    this.funnel.candidatesGenerated += proposals.length;
    this.funnel.surrogatePredictions += preds.length;
    const objId = this.ctx.objective.id;
    const dir = this.ctx.objective.direction;
    const objMetric = this.ctx.objective.metric;
    // Deb ordering on conservative predictions.
    const proxy = (d: Design, pe: HybridPrediction["conservative"]): Design => {
      const ev: Evaluation = {
        status: "ok",
        metrics: pe.metrics,
        objectives: { [objId]: pe.metrics[objMetric] },
        constraints: pe.constraints,
        feasible: pe.feasible,
        totalViolation: pe.totalViolation,
        diagnostics: [],
        fidelity: "surrogate",
        backend: "member-forces:ridge",
      };
      return { ...d, evaluation: ev };
    };
    const scored = proposals.map((d, i) => ({ d, pred: preds[i], proxy: proxy(d, preds[i].conservative), unc: mean(preds[i].forces.std) }));
    this.funnel.passedScreening += scored.filter((s) => s.pred.conservative.feasible).length;
    scored.sort((a, b) => compareDesigns(a.proxy, b.proxy, objId, dir));
    const nExplore = Math.min(this.lambda, Math.round(this.lambda * this.p.exploreFraction));
    const nExploit = this.lambda - nExplore;
    const chosen: { d: Design; pred: HybridPrediction; exploration: boolean }[] = scored.slice(0, nExploit).map((s) => ({ d: s.d, pred: s.pred, exploration: false }));
    if (nExplore > 0) {
      const taken = new Set(chosen.map((c) => c.d.id));
      const rest = scored.filter((s) => !taken.has(s.d.id));
      // Most uncertain among nominally feasible first, then most uncertain overall.
      const feasibleFirst = rest.filter((s) => s.pred.nominal.feasible).sort((a, b) => b.unc - a.unc);
      const others = rest.filter((s) => !s.pred.nominal.feasible).sort((a, b) => b.unc - a.unc);
      for (const s of feasibleFirst.concat(others).slice(0, nExplore)) chosen.push({ d: s.d, pred: s.pred, exploration: true });
    }
    this.pending = new Map(chosen.map((c) => [c.d.id, { prediction: c.pred, exploration: c.exploration }]));
    this.funnel.sentToSolver += chosen.length;
    this.funnel.explorationPicks += chosen.filter((c) => c.exploration).length;
    this.screenedGenerations++;
    return chosen.map((c) => c.d);
  }

  tell(evaluated: Design[]): void {
    for (const d of evaluated) {
      const ev = d.evaluation;
      if (!ev || ev.status !== "ok") continue;
      this.archive.push(d);
      const pend = this.pending.get(d.id);
      if (pend) {
        this.pairs.push({ predicted: pend.prediction.conservative.feasible, actual: ev.feasible });
        this.pairsNominal.push({ predicted: pend.prediction.nominal.feasible, actual: ev.feasible });
        const actualForces = ev.responses?.[this.forceId];
        if (actualForces) {
          this.forceActual.push(actualForces);
          this.forcePred.push(pend.prediction.forces.mean);
          this.forceStd.push(pend.prediction.forces.std);
        }
      }
    }
    const cap = Math.round(this.p.archiveSize);
    if (this.archive.length > cap) this.archive.splice(0, this.archive.length - cap);
    this.pending.clear();
    this.inner.tell(evaluated);
  }

  best(): Design | undefined {
    return this.inner.best();
  }

  population(): Design[] {
    return this.inner.population();
  }

  diagnostics(): Record<string, unknown> {
    return this.memberDiagnostics() as unknown as Record<string, unknown>;
  }

  memberDiagnostics(): MemberSurrogateDiagnostics {
    const m = this.forceActual[0]?.length ?? 0;
    const perMemberMae: number[] = [];
    const perMemberRmse: number[] = [];
    const allA: number[] = [];
    const allP: number[] = [];
    const allS: number[] = [];
    for (let j = 0; j < m; j++) {
      const a = this.forceActual.map((r) => r[j]);
      const p = this.forcePred.map((r) => r[j]);
      perMemberMae.push(mae(a, p));
      perMemberRmse.push(rmse(a, p));
      allA.push(...a);
      allP.push(...p);
      allS.push(...this.forceStd.map((r) => r[j]));
    }
    const errors = allA.map((a, i) => Math.abs(a - allP[i]));
    const forces: ForceAccuracy = {
      perMemberMae,
      perMemberRmse,
      overallR2: allA.length > 1 ? r2(allA, allP) : NaN,
      coverage95: allA.length ? coverage(allA, allP, allS, 1.96) : NaN,
      meanStd: allS.length ? mean(allS) : NaN,
      errorStdCorrelation: allA.length > 2 ? pearson(errors, allS) : NaN,
    };
    return {
      surrogate: "member-forces:ridge",
      policy: { riskK: this.p.riskK, exploreFraction: this.p.exploreFraction },
      funnel: { ...this.funnel },
      feasibility: confusionFromPairs(this.pairs),
      feasibilityNominal: confusionFromPairs(this.pairsNominal),
      forces,
      calibration: calibrationBins(errors, allS, 5),
      screenedGenerations: this.screenedGenerations,
      refits: this.refits,
      lastFitMs: this.lastFitMs,
      trainingSize: this.predictor?.trainingSize ?? 0,
    };
  }
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function pearson(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < a.length; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// Keep checkConstraints referenced for consumers building proxies elsewhere.
export { checkConstraints };
