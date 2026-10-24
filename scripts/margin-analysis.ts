/**
 * Analyse constraint-margin studies (records written by `npm run study`).
 *
 *   npm run margins:analyze -- benchmarks/results/margin-sweep-manipulator-isolated-<date>.json [more records] [--max-failure 0.05]
 *
 * For every run: per-constraint failure counts from the record's independent
 * robustness check, 95 % Wilson bounds, the analytic reach guarantee under the
 * check's box, a 2^d box-corner check, the design's own nominal utilisations,
 * and the overall failure rate an independence assumption would predict.
 * Per method: the pre-registered criterion (every seed's Wilson upper bound
 * <= max failure) per constraint and overall, and the paired cost against the
 * study's reference. Per sweep family: the smallest tested margin meeting the
 * criterion, with any non-monotone result reported. Writes a `kind: "analysis"`
 * record next to the first input.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { compileProblem } from "../src/engine/domains/registry";
import { reachUtilizationBound } from "../src/engine/domains/robotics/manipulator/evaluate";
import type { StudySpec } from "../src/engine/experiments/study";
import { studyProblem } from "../src/engine/experiments/study";
import { analyzeMarginRuns, boxCornerCheck, isolatedThresholds, wilsonInterval, type MarginRunInput } from "../src/engine/robustness/marginAnalysis";
import { robustnessStudy } from "../src/engine/robustness/robustness";
import { ENGINE_VERSION } from "../src/engine/version";

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const files = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const CONFIRM_SEED_OFFSET = 2_000_003;
const maxFailure = Number(flag("max-failure", "0.05"));
/** Optional confirmation: re-check the named methods' designs with fresh perturbations (different seed, more samples). */
const confirm = flag("confirm", "").split(",").filter(Boolean);
const confirmSamples = Number(flag("confirm-samples", "10000"));
if (files.length === 0) {
  console.error("usage: npm run margins:analyze -- <study record> [...] [--max-failure 0.05]");
  process.exit(1);
}

interface RecordRun { method: string; seed: number; bestObjective: number | null; robustFeasibleFraction?: number; robustDetail?: { tolerance: number; samples: number; seed: number; constraints: { id: string; violationProbability: number }[] }; bestParameters: number[]; solverCalls: number }
interface StudyRecord { kind: string; spec: StudySpec; engineVersion: string; createdAt: string; runs: RecordRun[] }

const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "-" : `${(v * 100).toFixed(d)} %`);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };


const out: unknown[] = [];
for (const file of files) {
  const rec = JSON.parse(readFileSync(file, "utf8")) as StudyRecord;
  if (rec.kind !== "study" || !rec.spec.robustCheck) throw new Error(`${file}: needs a study record with a robustCheck`);
  const spec = rec.spec;
  const tol = spec.robustCheck!.tolerance;
  const compiled = compileProblem(studyProblem(spec.benchmark));
  const constraintIds = compiled.problem.constraints.map((c) => c.id);
  const g = compiled.problem.geometry;
  const marginOf = (m: StudySpec["methods"][number], id: string) => (m.margin === undefined ? 0 : m.margins?.[id] ?? m.margin);

  const inputs: MarginRunInput[] = [];
  const perRun = rec.runs.map((r) => {
    const n = r.robustDetail?.samples ?? 0;
    const failures: Record<string, number> = {};
    for (const c of r.robustDetail?.constraints ?? []) failures[c.id] = Math.round(c.violationProbability * n);
    const overall = r.robustFeasibleFraction === undefined ? 0 : Math.round((1 - r.robustFeasibleFraction) * n);
    inputs.push({ method: r.method, seed: r.seed, bestObjective: r.bestObjective, samples: n, failures, overallFailures: overall });
    if (r.bestObjective === null || !r.bestParameters?.length) return { method: r.method, seed: r.seed, design: false };
    const ev = compiled.evaluate(r.bestParameters);
    const nominalUtil = Object.fromEntries(ev.constraints.map((c) => [c.id, c.op === "<=" && c.limit !== 0 ? c.value / c.limit : c.value]));
    const corners = boxCornerCheck(compiled, r.bestParameters, tol);
    const reachBound = g.kind === "planar-manipulator" ? reachUtilizationBound(r.bestParameters[0], r.bestParameters[1], g.taskPoints, tol) : null;
    const pIndep = 1 - constraintIds.reduce((p, id) => p * (1 - (failures[id] ?? 0) / Math.max(1, n)), 1);
    return { method: r.method, seed: r.seed, design: true, bestObjective: r.bestObjective, solverCalls: r.solverCalls, samples: n, failures, overallFailures: overall, nominalUtilization: nominalUtil, reachBound, reachGuaranteed: reachBound !== null ? reachBound <= 1 : null, corners: corners.constraints, independencePrediction: pIndep };
  });

  const analysis = analyzeMarginRuns(inputs, { reference: spec.reference, maxFailureRate: maxFailure, constraints: constraintIds });
  const methods = analysis.methods.map((m) => {
    const sm = spec.methods.find((x) => x.id === m.method)!;
    const runs = perRun.filter((r) => r.method === m.method && r.design) as Extract<(typeof perRun)[number], { design: true }>[];
    const margins = Object.fromEntries(constraintIds.map((id) => [id, marginOf(sm, id)]));
    return {
      ...m,
      optimizer: sm.optimizer,
      margins,
      reachGuaranteedSeeds: runs.filter((r) => r.reachGuaranteed).length,
      cornerFailingSeeds: Object.fromEntries(constraintIds.map((id) => [id, runs.filter((r) => (r.corners.find((c) => c.id === id)?.failingCorners ?? 0) > 0).length])),
      medianNominalUtilization: Object.fromEntries(constraintIds.map((id) => [id, median(runs.map((r) => r.nominalUtilization[id]))])),
      medianObservedOverall: median(runs.map((r) => r.overallFailures / r.samples)),
      medianIndependencePrediction: median(runs.map((r) => r.independencePrediction)),
    };
  });

  const thresholds = isolatedThresholds(methods, constraintIds, spec.reference);

  console.log(`\n${spec.id} · engine ${rec.engineVersion} · ${rec.runs.length} runs · check ${spec.robustCheck!.samples} perturbations at +/- ${tol * 100} % · criterion: ${analysis.criterion}`);
  console.log(["method".padEnd(17), ...constraintIds.map((id) => `m:${id}`.padStart(13)), "cost".padStart(7), ...constraintIds.map((id) => `fail ${id} med/max (seeds ok)`.padStart(28)), "overall med (ok)".padStart(17), "indep".padStart(7), "reach guar".padStart(10), "corner-fail defl".padStart(16)].join(" "));
  for (const m of methods) {
    console.log([m.method.padEnd(17), ...constraintIds.map((id) => pct(m.margins[id]).padStart(13)), pct(m.medianCost, 2).padStart(7), ...constraintIds.map((id) => `${pct(m.perConstraint[id].medianFailureRate)}/${pct(m.perConstraint[id].maxFailureRate)} (${m.perConstraint[id].seedsMeetingCriterion}/${m.seeds})`.padStart(28)), `${pct(m.overall.medianFailureRate)} (${m.overall.seedsMeetingCriterion}/${m.seeds})`.padStart(17), pct(m.medianIndependencePrediction).padStart(7), `${m.reachGuaranteedSeeds}/${m.seeds}`.padStart(10), `${m.cornerFailingSeeds.deflection ?? "-"}/${m.seeds}`.padStart(16)].join(" "));
  }
  for (const t of thresholds) if (t.tested.length) console.log(`smallest isolated ${t.constraint} margin meeting the criterion: ${t.smallestMeeting ? pct(t.smallestMeeting.margin) + ` (cost ${pct(t.smallestMeeting.medianCost, 2)})` : "none tested"}${t.monotone ? "" : "  [NON-MONOTONE: a larger tested margin fails]"}`);
  const jointPassing = methods.filter((m) => m.overall.meetsCriterion).sort((a, b) => (a.medianCost ?? Infinity) - (b.medianCost ?? Infinity)).map((m) => ({ method: m.method, optimizer: m.optimizer, margins: m.margins, medianCost: m.medianCost, maxCost: m.maxCost, overallMaxUpperBound: m.overall.maxUpperBound, reachGuaranteedSeeds: m.reachGuaranteedSeeds, cornerFailingSeeds: m.cornerFailingSeeds }));
  console.log(`methods meeting the overall criterion, by median cost: ${jointPassing.length ? jointPassing.map((j) => `${j.method} (${pct(j.medianCost, 2)})`).join(", ") : "none"}`);
  const confirmIds = confirm.includes("all") ? spec.methods.map((m) => m.id) : confirm.filter((id) => rec.runs.some((r) => r.method === id));
  const confirmInputs: MarginRunInput[] = [];
  const confirmation = confirmIds.map((id) => {
    const runs = rec.runs.filter((r) => r.method === id);
    const checks = runs.map((r) => {
      if (r.bestObjective === null) { confirmInputs.push({ method: id, seed: r.seed, bestObjective: null, samples: 0, failures: {}, overallFailures: 0 }); return { seed: r.seed, samples: 0, failures: 0, rate: NaN, upper: 1, perConstraint: {} }; }
      const res = robustnessStudy(compiled, r.bestParameters, { samples: confirmSamples, seed: CONFIRM_SEED_OFFSET + r.seed, tolerance: tol });
      const fails = Math.round((1 - res.feasibleFraction) * confirmSamples);
      const perConstraint = Object.fromEntries(res.constraints.map((c) => [c.id, Math.round(c.violationProbability * confirmSamples)]));
      confirmInputs.push({ method: id, seed: r.seed, bestObjective: r.bestObjective, samples: confirmSamples, failures: perConstraint, overallFailures: fails });
      return { seed: r.seed, samples: confirmSamples, failures: fails, rate: fails / confirmSamples, upper: wilsonInterval(fails, confirmSamples).upper, perConstraint };
    });
    return { method: id, samples: confirmSamples, seedOffset: CONFIRM_SEED_OFFSET, seedsMeetingCriterion: checks.filter((c) => c.upper <= maxFailure).length, runs: runs.length, checks };
  });
  let confirmed: unknown = null;
  if (confirmInputs.length) {
    const ca = analyzeMarginRuns(confirmInputs, { reference: spec.reference, maxFailureRate: maxFailure, constraints: constraintIds });
    const cm = ca.methods.map((m) => ({ ...m, margins: methods.find((x) => x.method === m.method)!.margins }));
    const ct = isolatedThresholds(cm, constraintIds, spec.reference);
    const cj = cm.filter((m) => m.overall.meetsCriterion).sort((a, b) => (a.medianCost ?? Infinity) - (b.medianCost ?? Infinity)).map((m) => ({ method: m.method, margins: m.margins, medianCost: m.medianCost, overallMaxUpperBound: m.overall.maxUpperBound }));
    console.log(`\nconfirmation: ${confirmSamples} fresh perturbations per run (seed offset ${CONFIRM_SEED_OFFSET})`);
    for (const m of cm) console.log(`  ${m.method.padEnd(18)} ${constraintIds.map((id) => `${id} ${pct(m.perConstraint[id].medianFailureRate, 2)}/${pct(m.perConstraint[id].maxFailureRate, 2)} (${m.perConstraint[id].seedsMeetingCriterion}/${m.seeds})`).join("  ")}  overall ${pct(m.overall.medianFailureRate, 2)}/${pct(m.overall.maxFailureRate, 2)} (${m.overall.seedsMeetingCriterion}/${m.seeds})`);
    for (const t of ct) if (t.tested.length) console.log(`  confirmed smallest isolated ${t.constraint} margin: ${t.smallestMeeting ? pct(t.smallestMeeting.margin) : "none tested"}${t.monotone ? "" : "  [NON-MONOTONE]"}`);
    console.log(`  confirmed overall criterion, by median cost: ${cj.length ? cj.map((j) => `${j.method} (${pct(j.medianCost, 2)})`).join(", ") : "none"}`);
    confirmed = { samples: confirmSamples, seedOffset: CONFIRM_SEED_OFFSET, criterion: ca.criterion, methods: cm, thresholds: ct, jointPassing: cj };
  }
  out.push({ source: file, studyId: spec.id, jointPassing, confirmation, confirmed, studyEngineVersion: rec.engineVersion, robustCheck: spec.robustCheck, criterion: analysis.criterion, methods, thresholds, runs: perRun });
}

const date = new Date().toISOString().slice(0, 10);
const target = files[0].replace(/\.json$/, `-margins-${date}.json`);
writeFileSync(target, JSON.stringify({ kind: "analysis", analysis: "constraint-margins", engineVersion: ENGINE_VERSION, createdAt: new Date().toISOString(), maxFailureRate: maxFailure, studies: out }, null, 1));
console.log(`\nwrote ${target}`);
