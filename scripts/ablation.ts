/**
 * Ablation of the member-surrogate optimiser: which ingredient matters?
 *
 *   npm run ablation                # 8 seeds, 1,500 evaluations
 *   npm run ablation -- 10 2000 --out
 *
 * Variants at equal solver budget and identical seeds:
 *   representation only   riskK = 0,  exploreFraction = 0
 *   + conservative bound  riskK = 2,  exploreFraction = 0
 *   + exploration         riskK = 0,  exploreFraction = 0.2
 *   full method           riskK = 2,  exploreFraction = 0.2
 *   global surrogate      (v0.2 method, for reference)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createTrussBridgeProblem } from "../src/engine/domains/structural/truss/template";
import { compileProblem } from "../src/engine/domains/registry";
import { createExperimentConfig, runExperimentToCompletion } from "../src/engine/experiments/runner";
import { ENGINE_VERSION } from "../src/engine/version";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const writeOut = process.argv.includes("--out");
const seeds = Number(args[0] ?? 8);
const budget = Number(args[1] ?? 1500);
const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 2 });
const compiled = compileProblem(problem);
const baselineMass = compiled.evaluate(compiled.baseline.parameters).metrics.mass_kg;
const target = baselineMass * 0.5;
const base = { populationSize: 30, screeningFactor: 4, warmupEvaluations: 200 };

const VARIANTS: { label: string; optimizer: string; params: Record<string, number> }[] = [
  { label: "global surrogate (v0.2)", optimizer: "surrogate-evolutionary", params: base },
  { label: "member repr. only (k=0, explore=0)", optimizer: "member-surrogate-evolutionary", params: { ...base, riskK: 0, exploreFraction: 0 } },
  { label: "member + conservative (k=2, explore=0)", optimizer: "member-surrogate-evolutionary", params: { ...base, riskK: 2, exploreFraction: 0 } },
  { label: "member + exploration (k=0, explore=0.2)", optimizer: "member-surrogate-evolutionary", params: { ...base, riskK: 0, exploreFraction: 0.2 } },
  { label: "member full (k=2, explore=0.2)", optimizer: "member-surrogate-evolutionary", params: { ...base, riskK: 2, exploreFraction: 0.2 } },
  { label: "member aggressive k (k=4, explore=0.2)", optimizer: "member-surrogate-evolutionary", params: { ...base, riskK: 4, exploreFraction: 0.2 } },
];

function quantile(xs: number[], q: number): number {
  const s = xs.slice().sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

interface Row { label: string; optimizer: string; params: Record<string, number>; medianBest: number; q1: number; q3: number; medianToTarget: number | null; reached: number; medianFalseFeasible: number | null; medianFalseInfeasible: number | null; medianForceR2: number | null; medianCoverage: number | null; runs: { seed: number; best: number; toTarget: number | null; falseFeasible?: number; falseInfeasible?: number; forceR2?: number; coverage95?: number; precision?: number; recall?: number }[] }

const rows: Row[] = [];
console.log(`NeuroForge ${ENGINE_VERSION} ablation: ${seeds} seeds, ${budget} evaluations, target ${target.toFixed(3)} kg`);
console.log(["variant".padEnd(42), "median kg".padStart(10), "IQR".padStart(14), "evals->target".padStart(14), "false-feas".padStart(11), "false-infeas".padStart(13), "force R2".padStart(9), "cov95".padStart(7)].join(" "));
for (const v of VARIANTS) {
  const runs: Row["runs"] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const rec = runExperimentToCompletion(createExperimentConfig({ id: `abl-${v.optimizer}-${seed}`, problem, seed, optimizer: { id: v.optimizer, params: v.params }, budget: { maxEvaluations: budget } }));
    const best = rec.best!.evaluation!.metrics.mass_kg;
    const hit = rec.generations.find((g) => g.bestSoFar.evaluation?.feasible && g.bestSoFar.evaluation.metrics.mass_kg <= target);
    const d = rec.optimizerDiagnostics as Record<string, unknown> | undefined;
    const feas = d?.feasibility as { falseFeasibleRate: number; falseInfeasibleRate: number; precision: number; recall: number } | undefined;
    const forces = d?.forces as { overallR2: number; coverage95: number } | undefined;
    runs.push({ seed, best, toTarget: hit?.cumulativeEvaluations ?? null, falseFeasible: feas?.falseFeasibleRate, falseInfeasible: feas?.falseInfeasibleRate, forceR2: forces?.overallR2, coverage95: forces?.coverage95, precision: feas?.precision, recall: feas?.recall });
  }
  const bests = runs.map((r) => r.best);
  const tt = runs.map((r) => r.toTarget).filter((x): x is number => x !== null);
  const ff = runs.map((r) => r.falseFeasible).filter((x): x is number => x !== undefined && Number.isFinite(x));
  const fi = runs.map((r) => r.falseInfeasible).filter((x): x is number => x !== undefined && Number.isFinite(x));
  const fr = runs.map((r) => r.forceR2).filter((x): x is number => x !== undefined && Number.isFinite(x));
  const cv = runs.map((r) => r.coverage95).filter((x): x is number => x !== undefined && Number.isFinite(x));
  const row: Row = { label: v.label, optimizer: v.optimizer, params: v.params, medianBest: quantile(bests, 0.5), q1: quantile(bests, 0.25), q3: quantile(bests, 0.75), medianToTarget: tt.length ? quantile(tt, 0.5) : null, reached: tt.length, medianFalseFeasible: ff.length ? quantile(ff, 0.5) : null, medianFalseInfeasible: fi.length ? quantile(fi, 0.5) : null, medianForceR2: fr.length ? quantile(fr, 0.5) : null, medianCoverage: cv.length ? quantile(cv, 0.5) : null, runs };
  rows.push(row);
  const pct = (x: number | null) => (x === null ? "-" : `${(x * 100).toFixed(1)} %`);
  console.log([v.label.padEnd(42), row.medianBest.toFixed(3).padStart(10), `${row.q1.toFixed(3)}-${row.q3.toFixed(3)}`.padStart(14), (row.medianToTarget ? `${Math.round(row.medianToTarget)} (${row.reached}/${seeds})` : "not reached").padStart(14), pct(row.medianFalseFeasible).padStart(11), pct(row.medianFalseInfeasible).padStart(13), (row.medianForceR2?.toFixed(3) ?? "-").padStart(9), pct(row.medianCoverage).padStart(7)].join(" "));
}
if (writeOut) {
  mkdirSync("benchmarks/results", { recursive: true });
  const file = `benchmarks/results/${new Date().toISOString().slice(0, 10)}-ablation-${budget}x${seeds}.json`;
  writeFileSync(file, JSON.stringify({ engineVersion: ENGINE_VERSION, createdAt: new Date().toISOString(), seeds, budget, targetMass_kg: target, baselineMass_kg: baselineMass, rows }, null, 1));
  console.log(`\nwrote ${file}`);
}
