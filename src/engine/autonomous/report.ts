/**
 * The discovery report in the form of a short lab report: question, method,
 * results, uncertainty, limitations, reproducibility, conclusion. Every
 * sentence is composed from numbers already in the lab record; nothing here
 * is estimated or embellished.
 */
import type { LabRecord } from "./lab";

export interface DiscoveryReport {
  title: string;
  question: string;
  method: string[];
  results: string[];
  uncertainty: string[];
  limitations: string[];
  reproducibility: string[];
  conclusion: string;
}

function fmt(v: number, unit: string): string {
  if (!Number.isFinite(v)) return "n/a";
  const a = Math.abs(v);
  const s = a >= 100 ? v.toFixed(1) : a >= 1 ? v.toFixed(3) : v.toPrecision(3);
  return unit ? `${s} ${unit}` : s;
}

function pct(v: number): string {
  return Number.isFinite(v) ? `${(v * 100).toFixed(1)} %` : "n/a";
}

export function buildDiscoveryReport(record: LabRecord): DiscoveryReport {
  const { config, report, analysis } = record;
  const problem = config.problem;
  const objective = problem.objectives[0];
  const unit = unitOf(record, objective.metric);
  const dir = objective.direction === "minimize" ? "minimise" : "maximise";
  const better = objective.direction === "minimize" ? "lower" : "higher";

  const question = `Can a design be found that ${dir}s ${objective.label.toLowerCase()} for "${problem.title}" while satisfying every stated constraint, and how much better than a conventionally sized baseline is it?`;

  const method: string[] = [
    `Problem compiled to ${analysis?.variables ?? "n/a"} design variables and ${problem.constraints.length} constraints (${problem.constraints.map((c) => c.id).join(", ")}); ${problem.assumptions.length} assumptions recorded with reasons and confidence.`,
    `Baseline: ${compiledBaselineLabel(record)}, sized by the same evaluator; ${objective.label.toLowerCase()} ${fmt(report.baselineObjective, unit)}.`,
    `Pilot stage: ${config.strategies.length} strategies (${record.ranking.map((r) => r.label).join("; ")}) each run for ${config.pilotBudget.toLocaleString()} solver evaluations on ${config.pilotSeeds} seed${config.pilotSeeds === 1 ? "" : "s"}; strategies ranked by the median best feasible objective.`,
    `Main stage: the winning strategy run with up to ${(config.totalBudget - config.strategies.length * config.pilotSeeds * config.pilotBudget - config.tradeoffBudget - (config.robustness?.samples ?? 0)).toLocaleString()} evaluations, stopping when the best-so-far improved by less than ${(config.convergence.minRelativeImprovement * 100).toFixed(2)} % over ${config.convergence.window} generations.`,
    record.tradeoff
      ? `Trade-off stage: NSGA-II on ${record.tradeoff.config.problem.objectives.map((o) => o.label.toLowerCase()).join(" versus ")} for ${config.tradeoffBudget.toLocaleString()} evaluations, with an external Pareto archive and hypervolume against the baseline box.`
      : "Trade-off stage skipped: the problem exposes no second objective.",
    config.robustness
      ? `Robustness stage: the discovered design perturbed uniformly within +/- ${(config.robustness.tolerance * 100).toFixed(1)} % on every variable, ${config.robustness.samples} samples through the solver.`
      : "Robustness stage skipped by configuration.",
  ];

  const results: string[] = [];
  results.push(
    `Pilot ranking (median best over ${config.pilotSeeds} seed${config.pilotSeeds === 1 ? "" : "s"}): ${record.ranking
      .map((r) => `${r.label} ${r.feasibleSeeds ? fmt(r.medianObjective, unit) : "no feasible design"}${r.seeds > 1 && r.feasibleSeeds > 1 ? ` (range ${fmt(r.bestObjective, unit)} to ${fmt(r.worstObjective, unit)})` : ""}`)
      .join("; ")}.`
  );
  results.push(
    `${report.chosenStrategyLabel} reached ${fmt(report.bestObjective, unit)} after ${report.mainGenerations} generations (${record.main.totalEvaluations.toLocaleString()} evaluations), ${Math.abs(report.improvementPercent).toFixed(1)} % ${report.improvementPercent >= 0 ? better : objective.direction === "minimize" ? "higher" : "lower"} than the baseline; the run ${report.stopReason === "converged" ? "stopped on a plateau" : "spent its budget"}.`
  );
  results.push(
    report.bindingConstraints.length
      ? `Binding constraints at the discovered design: ${report.bindingConstraints.map((c) => `${c.id} at ${(c.utilization * 100).toFixed(1)} % of its limit`).join(", ")}.`
      : "No constraint is within 5 % of its limit at the discovered design."
  );
  if (report.topVariables.length) results.push(`Most influential variables (finite differences at the discovered design): ${report.topVariables.map((v) => `${v.label} ${(v.share * 100).toFixed(0)} %`).join(", ")}.`);
  if (record.tradeoff) results.push(`Trade-off front: ${report.paretoFrontSize} non-dominated designs, hypervolume ${report.hypervolume === null ? "n/a" : pct(report.hypervolume)} of the baseline box.`);
  if (report.screening) results.push(`Surrogate screen (measured on the designs it gated): precision ${pct(report.screening.precision)}, false-feasible rate ${pct(report.screening.falseFeasibleRate)}${report.screening.forceR2 !== undefined ? `, response R^2 ${report.screening.forceR2.toFixed(3)}` : ""}; ${report.surrogatePredictions.toLocaleString()} predictions for ${report.solverEvaluations.toLocaleString()} solver evaluations.`);
  if (report.robustness) {
    const r = report.robustness;
    results.push(`Robustness: ${pct(r.feasibleFraction)} of ${r.samples} designs perturbed within +/- ${(r.tolerance * 100).toFixed(1)} % remain feasible; objective median ${fmt(r.objectiveMedian, unit)}, 95th percentile ${fmt(r.objectiveQ95, unit)}${r.worstConstraint ? `; the constraint most often violated is ${r.worstConstraint}` : ""}.`);
  }

  const uncertainty: string[] = report.uncertainty.entries
    .filter((e) => e.status !== "documented" || e.kind !== "model-form")
    .map((e) => `${e.kind} / ${e.source}: ${e.status}${e.value !== undefined ? ` (${e.unit ? `${e.unit} ` : ""}${Number.isFinite(e.value) ? (e.unit?.includes("fraction") || e.unit?.includes("rate") || e.unit?.includes("range") ? pct(e.value) : fmt(e.value, "")) : "n/a"})` : ""}. ${e.evidence}`);
  uncertainty.unshift(`${report.uncertainty.quantified} sources quantified, ${report.uncertainty.documented} documented, ${report.uncertainty.notModelled} not modelled; model-form assumptions (${problem.assumptions.length}) are listed in the specification.`);

  const limitations: string[] = [
    `Fidelity: ${record.main.best?.evaluation?.fidelity ?? "n/a"} (${record.backendId}); the physics not modelled is listed in docs/LIMITATIONS.md.`,
    ...problem.assumptions.filter((a) => a.confidence === "low").map((a) => `Low-confidence assumption: ${a.field} = ${a.value}.`),
    "A preliminary design study, not a validated or fabrication-ready design.",
  ];

  const reproducibility: string[] = [
    `Engine ${record.engineVersion}; lab seed ${config.seed}; pilot seeds ${Array.from(new Set(record.pilots.map((p) => p.seed))).join(", ")}; main seed ${record.main.config.seed}${record.tradeoff ? `; trade-off seed ${record.tradeoff.config.seed}` : ""}${record.robustness ? `; robustness seed ${record.robustness.seed}` : ""}.`,
    `Total solver evaluations ${report.solverEvaluations.toLocaleString()}; wall time ${(report.wallTimeMs / 1000).toFixed(1)} s. Every stage record stores its configuration and per-generation history and reproduces identically from its seed.`,
  ];

  const conclusion = `${report.chosenStrategyLabel} found a feasible design ${Math.abs(report.improvementPercent).toFixed(1)} % ${better} in ${objective.label.toLowerCase()} than the baseline (${fmt(report.baselineObjective, unit)} to ${fmt(report.bestObjective, unit)})${report.robustness ? `, with ${pct(report.robustness.feasibleFraction)} of +/- ${(report.robustness.tolerance * 100).toFixed(1)} % perturbations remaining feasible` : ""}. The result holds under the stated assumptions and the model's fidelity; it is a starting point for detailed design, not a substitute for it.`;

  return { title: `${problem.title}: autonomous search report`, question, method, results, uncertainty, limitations, reproducibility, conclusion };
}

function unitOf(record: LabRecord, metric: string): string {
  const u = record.metricUnits[metric] ?? "";
  return u === "-" ? "" : u;
}

function compiledBaselineLabel(record: LabRecord): string {
  return record.baselineLabel.toLowerCase();
}
