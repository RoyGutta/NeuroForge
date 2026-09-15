/**
 * Optimiser benchmark at equal solver budget across seeds.
 *
 *   npm run benchmark                 # default: 5 seeds, 1,500 evaluations
 *   npm run benchmark -- 10 3000      # seeds, budget
 *
 * Every registered optimiser runs on the canonical problem with the same
 * seeds and the same evaluation budget. Reports median and interquartile
 * range of the best feasible mass, the median evaluations needed to reach a
 * target mass, and wall time. Bayesian optimisation is run at a reduced
 * budget because its cost per evaluation is far higher; that is stated in
 * the output rather than hidden.
 */
import { createTrussBridgeProblem } from "../src/engine/domains/structural/truss/template";
import { compileProblem } from "../src/engine/domains/registry";
import { createExperimentConfig, runExperimentToCompletion } from "../src/engine/experiments/runner";
import { listOptimizers } from "../src/engine/optimization";
import { ENGINE_VERSION } from "../src/engine/version";

const seeds = Number(process.argv[2] ?? 5);
const budget = Number(process.argv[3] ?? 1500);
const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 2 });
const compiled = compileProblem(problem);
const baselineMass = compiled.evaluate(compiled.baseline.parameters).metrics.mass_kg;
const target = baselineMass * 0.5; // reach half the baseline mass

const PARAMS: Record<string, Record<string, number>> = {
  evolutionary: { populationSize: 30 },
  "surrogate-evolutionary": { populationSize: 30, screeningFactor: 4, warmupEvaluations: 200 },
  annealing: { chains: 8 },
  "random-search": { batchSize: 50 },
  bayesian: { batchSize: 8, initialDesigns: 40 },
};
const BUDGET: Record<string, number> = { bayesian: Math.min(budget, 300) };

function quantile(xs: number[], q: number): number {
  const s = xs.slice().sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

console.log(`NeuroForge ${ENGINE_VERSION} benchmark: canonical truss bridge, ${seeds} seeds, budget ${budget} evaluations`);
console.log(`baseline mass ${baselineMass.toFixed(3)} kg; target for time-to-target: ${target.toFixed(3)} kg`);
console.log("");
console.log(["optimizer".padEnd(26), "budget".padStart(7), "median kg".padStart(10), "IQR kg".padStart(14), "feasible".padStart(9), "evals->target".padStart(14), "s/run".padStart(7)].join(" "));
for (const desc of listOptimizers()) {
  const b = BUDGET[desc.id] ?? budget;
  const bests: number[] = [];
  const toTarget: number[] = [];
  let feasible = 0;
  let time = 0;
  for (let s = 1; s <= seeds; s++) {
    const cfg = createExperimentConfig({ id: `bench-${desc.id}-${s}`, problem, seed: s, optimizer: { id: desc.id, params: PARAMS[desc.id] ?? {} }, budget: { maxEvaluations: b } });
    const t0 = performance.now();
    const rec = runExperimentToCompletion(cfg);
    time += (performance.now() - t0) / 1000;
    const ev = rec.best?.evaluation;
    if (ev?.feasible) {
      feasible++;
      bests.push(ev.metrics.mass_kg);
    }
    const hit = rec.generations.find((g) => g.bestSoFar.evaluation?.feasible && g.bestSoFar.evaluation.metrics.mass_kg <= target);
    if (hit) toTarget.push(hit.cumulativeEvaluations);
  }
  const med = bests.length ? quantile(bests, 0.5) : NaN;
  const iqr = bests.length ? `${quantile(bests, 0.25).toFixed(3)}-${quantile(bests, 0.75).toFixed(3)}` : "-";
  const tt = toTarget.length ? `${Math.round(quantile(toTarget, 0.5))} (${toTarget.length}/${seeds})` : `not reached`;
  console.log([desc.id.padEnd(26), String(b).padStart(7), (Number.isFinite(med) ? med.toFixed(3) : "-").padStart(10), iqr.padStart(14), `${feasible}/${seeds}`.padStart(9), tt.padStart(14), (time / seeds).toFixed(2).padStart(7)].join(" "));
}
console.log("");
console.log("Lower median mass is better. IQR = interquartile range across seeds. evals->target = median cumulative evaluations at which the best feasible design first reached the target mass (runs reaching it / seeds).");
