/**
 * Engineering uncertainty taxonomy for a result. Each source is classified
 * and marked as quantified (a measured number is attached), documented (the
 * assumption is stated with its confidence but not measured), or not
 * modelled. Nothing is marked quantified without a measurement behind it.
 */
import type { Evaluation } from "../core/design";
import type { EngineeringProblem } from "../core/problem";
import type { RobustnessResult } from "../robustness/robustness";

export const UNCERTAINTY_KINDS = ["model-form", "parameter", "numerical", "manufacturing", "surrogate", "statistical"] as const;
export type UncertaintyKind = (typeof UNCERTAINTY_KINDS)[number];
export type UncertaintyStatus = "quantified" | "documented" | "not-modelled";

export interface UncertaintyEntry {
  kind: UncertaintyKind;
  source: string;
  status: UncertaintyStatus;
  evidence: string;
  value?: number;
  unit?: string;
  confidence?: "high" | "medium" | "low";
}

export interface UncertaintyReport {
  entries: UncertaintyEntry[];
  quantified: number;
  documented: number;
  notModelled: number;
}

export interface PilotObservation {
  strategy: string;
  seed: number;
  bestObjective: number;
  feasible: boolean;
}

export interface UncertaintyInput {
  problem: EngineeringProblem;
  evaluation?: Evaluation;
  robustness?: RobustnessResult;
  screening?: { precision: number; falseFeasibleRate: number; forceR2?: number; coverage95?: number };
  pilots?: PilotObservation[];
  chosenStrategy?: string;
}

export function buildUncertaintyReport(input: UncertaintyInput): UncertaintyReport {
  const { problem } = input;
  const entries: UncertaintyEntry[] = [];

  // Model form: every stated assumption, plus the analysis fidelity.
  for (const a of problem.assumptions) {
    entries.push({ kind: "model-form", source: a.field, status: "documented", evidence: `${a.value}. ${a.reason}`, confidence: a.confidence });
  }
  entries.push({
    kind: "model-form",
    source: "analysis fidelity",
    status: "documented",
    evidence: input.evaluation ? `${input.evaluation.fidelity} via ${input.evaluation.backend}; limitations listed in docs/LIMITATIONS.md` : "not evaluated",
  });

  // Parameters: material and load values are inputs, not measured distributions.
  entries.push({ kind: "parameter", source: "material properties", status: "documented", evidence: `${problem.material.name}: handbook values, no scatter modelled` });
  for (const l of problem.loads) {
    entries.push({ kind: "parameter", source: `load ${l.id}`, status: "documented", evidence: l.kind === "heat" ? `${l.power_W} W treated as exact` : `${l.magnitude_N} N treated as exact` });
  }

  // Numerical: deterministic direct solves; no stochastic error.
  entries.push({
    kind: "numerical",
    source: "solver",
    status: "documented",
    evidence: "deterministic closed-form or direct (Cholesky) solve; identical inputs reproduce identical outputs (tested); discretisation error not applicable to the models used",
  });

  // Manufacturing: measured only when a robustness study ran.
  if (input.robustness) {
    const r = input.robustness;
    entries.push({
      kind: "manufacturing",
      source: `parameter tolerance +/- ${(r.tolerance * 100).toFixed(1)} %`,
      status: "quantified",
      value: r.feasibleFraction,
      unit: "feasible fraction",
      evidence: `${r.samples} perturbed designs through the solver (${r.distribution}, seed ${r.seed}): ${(r.feasibleFraction * 100).toFixed(1)} % feasible; objective median ${fmt(r.objective.median)}, 95th percentile ${fmt(r.objective.q95)} against nominal ${fmt(r.objective.nominal)}`,
    });
  } else {
    entries.push({ kind: "manufacturing", source: "parameter tolerance", status: "not-modelled", evidence: "no robustness study run for this design" });
  }

  // Surrogate: only when a surrogate screened candidates and its reliability was measured.
  if (input.screening) {
    const s = input.screening;
    entries.push({
      kind: "surrogate",
      source: "feasibility screen",
      status: "quantified",
      value: s.falseFeasibleRate,
      unit: "false-feasible rate",
      evidence: `measured on the designs the surrogate gated: precision ${(s.precision * 100).toFixed(1)} %, false-feasible ${(s.falseFeasibleRate * 100).toFixed(1)} %${s.forceR2 !== undefined ? `, response R^2 ${s.forceR2.toFixed(3)}` : ""}${s.coverage95 !== undefined ? `, 95 % coverage ${(s.coverage95 * 100).toFixed(0)} %` : ""}; the solver verified every accepted design`,
    });
  } else {
    entries.push({ kind: "surrogate", source: "feasibility screen", status: "not-modelled", evidence: "no surrogate used, or its reliability was not recorded" });
  }

  // Statistical: seed-to-seed variation of the search.
  const pilots = (input.pilots ?? []).filter((p) => p.feasible && Number.isFinite(p.bestObjective));
  const chosen = input.chosenStrategy ? pilots.filter((p) => p.strategy === input.chosenStrategy) : pilots;
  if (chosen.length >= 2) {
    const vals = chosen.map((p) => p.bestObjective);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const mid = 0.5 * (lo + hi);
    const spread = mid !== 0 ? (hi - lo) / mid : 0;
    entries.push({
      kind: "statistical",
      source: "search seed",
      status: "quantified",
      value: spread,
      unit: "relative range of best objective across seeds",
      evidence: `${chosen.length} seeds of ${input.chosenStrategy ?? "the search"}: best objective ${fmt(lo)} to ${fmt(hi)} (relative range ${(spread * 100).toFixed(2)} %)`,
    });
  } else {
    entries.push({ kind: "statistical", source: "search seed", status: "documented", evidence: "single seed per strategy; variation across seeds not measured in this run (see the registered studies for multi-seed intervals)" });
  }

  return {
    entries,
    quantified: entries.filter((e) => e.status === "quantified").length,
    documented: entries.filter((e) => e.status === "documented").length,
    notModelled: entries.filter((e) => e.status === "not-modelled").length,
  };
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return "n/a";
  const a = Math.abs(v);
  return a >= 100 ? v.toFixed(1) : a >= 1 ? v.toFixed(3) : v.toPrecision(3);
}
