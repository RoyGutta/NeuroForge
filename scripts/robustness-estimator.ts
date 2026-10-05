/**
 * How many perturbations does a robustness estimate need? Re-evaluates the
 * retained designs of a registered study at several sample sizes with
 * independent seeds and reports the spread of the feasible-fraction
 * estimate and its agreement with a 2,000-sample reference.
 *
 *   npm run robustness:estimator -- benchmarks/results/<study>.json [tolerance]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { compileProblem } from "../src/engine/domains/registry";
import { studyProblem, type StudyBenchmark } from "../src/engine/experiments/study";
import { robustnessStudy } from "../src/engine/robustness/robustness";
import { ENGINE_VERSION } from "../src/engine/version";

const file = process.argv[2];
if (!file) {
  console.error("usage: npm run robustness:estimator -- <study result json> [tolerance]");
  process.exit(1);
}
const tolerance = Number(process.argv[3] ?? 0.02);
const record = JSON.parse(readFileSync(file, "utf8")) as { spec: { id: string; benchmark: StudyBenchmark; methods: { id: string }[] }; runs: { method: string; seed: number; bestParameters: number[]; bestObjective: number | null }[] };
const compiled = compileProblem(studyProblem(record.spec.benchmark));
const sizes = [30, 60, 100, 300, 1000];
const repeats = 5;
const reference = 2000;

interface Row { method: string; seed: number; reference: number; estimates: Record<string, { mean: number; std: number; maxAbsError: number; misclassified95: number }> }
const rows: Row[] = [];
console.log(`${record.spec.id}: ${record.runs.length} retained designs, tolerance ${tolerance}, reference ${reference} samples, ${repeats} repeats per size`);
for (const run of record.runs) {
  if (!run.bestParameters?.length) continue;
  const ref = robustnessStudy(compiled, run.bestParameters, { samples: reference, seed: 424242 + run.seed, tolerance }).feasibleFraction;
  const estimates: Row["estimates"] = {};
  for (const n of sizes) {
    const vals: number[] = [];
    for (let r = 0; r < repeats; r++) vals.push(robustnessStudy(compiled, run.bestParameters, { samples: n, seed: 1000 * n + 17 * r + run.seed, tolerance }).feasibleFraction);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length - 1));
    const maxAbsError = Math.max(...vals.map((v) => Math.abs(v - ref)));
    const misclassified95 = vals.filter((v) => (v >= 0.95) !== (ref >= 0.95)).length;
    estimates[String(n)] = { mean, std, maxAbsError, misclassified95 };
  }
  rows.push({ method: run.method, seed: run.seed, reference: ref, estimates });
}
// Aggregate per sample size over designs whose reference lies in the decision band (0.8 to 1.0), where estimation matters.
console.log(["samples".padEnd(8), "mean std".padStart(10), "max |err|".padStart(10), "95 % flips".padStart(11), "flip rate (band)".padStart(17)].join(" "));
const summary: Record<string, { meanStd: number; maxAbsError: number; flips: number; bandDesigns: number; flipRateBand: number }> = {};
for (const n of sizes) {
  const all = rows.map((r) => r.estimates[String(n)]);
  const band = rows.filter((r) => r.reference >= 0.8 && r.reference < 1);
  const flipsBand = band.reduce((a, r) => a + r.estimates[String(n)].misclassified95, 0);
  const s = {
    meanStd: all.reduce((a, e) => a + e.std, 0) / all.length,
    maxAbsError: Math.max(...all.map((e) => e.maxAbsError)),
    flips: all.reduce((a, e) => a + e.misclassified95, 0),
    bandDesigns: band.length,
    flipRateBand: band.length ? flipsBand / (band.length * repeats) : 0,
  };
  summary[String(n)] = s;
  console.log([String(n).padEnd(8), s.meanStd.toFixed(3).padStart(10), s.maxAbsError.toFixed(3).padStart(10), String(s.flips).padStart(11), `${(s.flipRateBand * 100).toFixed(0)} % of ${s.bandDesigns}`.padStart(17)].join(" "));
}
const out = file.replace(/\.json$/, `-estimator-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(out, JSON.stringify({ kind: "analysis", analysis: "robustness-estimator", source: file, engineVersion: ENGINE_VERSION, createdAt: new Date().toISOString(), tolerance, reference, repeats, sizes, summary, rows }, null, 1));
console.log(`\nwrote ${out}`);
