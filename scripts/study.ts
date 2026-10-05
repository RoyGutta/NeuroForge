/**
 * Run a registered study and write its raw runs and analysis.
 *
 *   npm run study -- benchmarks/studies/representation-and-screening.json
 *
 * Output: benchmarks/results/<study id>-<date>.json containing the spec, one
 * entry per (method, seed) with the convergence curve and reliability (full
 * experiment records are not stored; they are reproducible from the spec),
 * and the analysis: medians with seeded bootstrap intervals, quartiles,
 * evaluations-to-target, and Vargha–Delaney A / Cliff's delta against the
 * reference method.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { analyzeStudy, runStudy, type StudySpec } from "../src/engine/experiments/study";

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run study -- <study spec json>");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(file, "utf8")) as StudySpec;
console.log(`study ${spec.id}: ${spec.title}`);
console.log(`hypothesis: ${spec.hypothesis}`);
console.log(`${spec.methods.length} methods x ${spec.seeds.length} seeds at ${spec.budget} evaluations`);
const result = runStudy(spec, (run, i, total) => console.log(`  [${i}/${total}] ${run.method} seed ${run.seed}: ${run.bestObjective?.toFixed(3) ?? "infeasible"}${run.evaluationsToTarget ? ` (target at ${run.evaluationsToTarget})` : ""}`));
const analysis = analyzeStudy(result);
console.log("");
console.log(["method".padEnd(20), `median ${result.objective.unit}`.padStart(10), "95% CI".padStart(16), "IQR".padStart(14), "to target".padStart(12), "A vs ref".padStart(9), "effect".padStart(11), "robust".padStart(8), "calls".padStart(9)].join(" "));
for (const m of analysis.methods) {
  const c = analysis.comparisons.find((x) => x.method === m.id);
  console.log([m.id.padEnd(20), m.best.median.toFixed(3).padStart(10), `${m.best.lower.toFixed(3)}–${m.best.upper.toFixed(3)}`.padStart(16), `${m.q1Best.toFixed(3)}–${m.q3Best.toFixed(3)}`.padStart(14), (m.medianEvaluationsToTarget ? `${Math.round(m.medianEvaluationsToTarget)} (${m.runsReachingTarget}/${m.runs})` : "not reached").padStart(12), (c ? c.varghaDelaneyA.toFixed(2) : "ref").padStart(9), (c ? c.effectLabel : "").padStart(11), (m.medianRobustFeasible === undefined ? "" : `${(m.medianRobustFeasible * 100).toFixed(0)} %`).padStart(8), Math.round(m.medianSolverCalls).toLocaleString().padStart(9)].join(" "));
}
mkdirSync("benchmarks/results", { recursive: true });
const out = `benchmarks/results/${spec.id}-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(out, JSON.stringify({ kind: "study", spec, engineVersion: result.engineVersion, createdAt: new Date().toISOString(), objective: result.objective, baselineObjective: result.baselineObjective, targetObjective: result.targetObjective, runs: result.runs.map(({ record: _record, ...rest }) => rest), analysis }, null, 1));
console.log(`\nwrote ${out}`);
