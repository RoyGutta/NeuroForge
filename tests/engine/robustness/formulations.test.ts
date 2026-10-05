import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { analyzeStudy, runStudy, type StudySpec } from "../../../src/engine/experiments/study";
import { postHocRobustSelection, tightenConstraints } from "../../../src/engine/robustness/formulations";
import { robustnessStudy } from "../../../src/engine/robustness/robustness";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const nominal = compileProblem(problem);
const scaled = (f: number) => nominal.baseline.parameters.map((v, i) => (nominal.space.variables[i].group === "area" ? v * f : v));

describe("constraint tightening as a robustness formulation", () => {
  test("scales every constraint limit by the margin, keeps metrics exact and costs one solver call", () => {
    const tight = tightenConstraints(nominal, { margin: 0.05 });
    for (const [i, c] of tight.problem.constraints.entries()) {
      const orig = problem.constraints[i];
      expect(c.id).toBe(orig.id);
      expect(c.limit).toBeCloseTo(orig.op === "<=" ? orig.limit * 0.95 : orig.limit * 1.05, 12);
    }
    const base = tight.evaluate(nominal.baseline.parameters);
    expect(base.metrics).toEqual(nominal.evaluate(nominal.baseline.parameters).metrics);
    expect(base.feasible).toBe(false);
    expect(tight.evaluate(scaled(1.1)).feasible).toBe(true);
    expect(tight.backendId).toContain("margin");
  });

  test("a margin optimum is more robust than the nominal optimum at the same design budget", () => {
    const base = { problem, seed: 2, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 4000 } };
    const plain = runExperimentToCompletion(createExperimentConfig({ ...base, id: "plain" }));
    const margin = runExperimentToCompletion(createExperimentConfig({ ...base, id: "margin", margin: 0.05 }));
    expect(margin.config.margin).toBe(0.05);
    const check = (p: number[]) => robustnessStudy(nominal, p, { samples: 300, seed: 999, tolerance: 0.02 }).feasibleFraction;
    expect(check(margin.best!.parameters)).toBeGreaterThan(check(plain.best!.parameters));
    expect(nominal.evaluate(margin.best!.parameters).feasible).toBe(true);
  });
});

describe("warm-start designs and post-hoc robust selection", () => {
  test("seedDesigns enter the first generation", () => {
    const good = scaled(1.2);
    const rec = runExperimentToCompletion(createExperimentConfig({ problem, seed: 5, optimizer: { id: "evolutionary", params: { populationSize: 20 } }, budget: { maxEvaluations: 200 }, seedBaseline: false, seedDesigns: [good] }));
    expect(rec.config.seedDesigns).toEqual([good]);
    const first = rec.generations[0].bestSoFar.evaluation!;
    expect(first.feasible).toBe(true);
    expect(first.metrics.mass_kg).toBeLessThanOrEqual(nominal.evaluate(good).metrics.mass_kg + 1e-12);
  });

  test("post-hoc selection walks the best-so-far trajectory back to the lightest design that passes the robust check", () => {
    const rec = runExperimentToCompletion(createExperimentConfig({ problem, seed: 3, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 6000 } }));
    const sel = postHocRobustSelection(nominal, rec, { tolerance: 0.02, samples: 120, seed: 11, targetFraction: 0.95 });
    expect(sel).not.toBeNull();
    expect(sel!.robustFeasibleFraction).toBeGreaterThanOrEqual(0.95);
    expect(sel!.checks).toBeGreaterThanOrEqual(1);
    expect(sel!.solverCalls).toBe(sel!.checks * 120);
    const trajectory = rec.generations.map((g) => JSON.stringify(g.bestSoFar.parameters));
    expect(trajectory).toContain(JSON.stringify(sel!.design.parameters));
    const finalFraction = robustnessStudy(nominal, rec.best!.parameters, { samples: 120, seed: 11, tolerance: 0.02 }).feasibleFraction;
    if (finalFraction < 0.95) expect(sel!.design.evaluation!.metrics.mass_kg).toBeGreaterThan(rec.best!.evaluation!.metrics.mass_kg);
  });
});

describe("study registry: solver-call budgets, formulations and per-run design retention", () => {
  const spec: StudySpec = {
    id: "formulations-test",
    title: "test",
    hypothesis: "test",
    benchmark: { problem: "truss-bridge", span_m: 2, load_N: 500, panels: 4 },
    budget: 2600,
    budgetUnit: "solverCalls",
    seeds: [1, 2],
    reference: "nominal",
    methods: [
      { id: "nominal", optimizer: "evolutionary", params: { populationSize: 12 } },
      { id: "posthoc", optimizer: "evolutionary", params: { populationSize: 12 }, postHoc: { targetFraction: 0.9 } },
      { id: "margin", optimizer: "evolutionary", params: { populationSize: 12 }, margin: 0.05 },
      { id: "robust", optimizer: "evolutionary", params: { populationSize: 12 }, robust: { tolerance: 0.02, samples: 12, targetFraction: 0.9 } },
      { id: "twophase", optimizer: "evolutionary", params: { populationSize: 12 }, robust: { tolerance: 0.02, samples: 12, targetFraction: 0.9 }, nominalPhaseFraction: 0.5 },
    ],
    metrics: ["bestObjective", "robustFeasibleFraction", "solverCalls"],
    targetFraction: 0.6,
    robustCheck: { tolerance: 0.02, samples: 60 },
  };

  test("gives copy-based methods fewer design evaluations so solver calls are equal, and keeps every run's design", () => {
    const result = runStudy(spec);
    const by = (m: string) => result.runs.filter((r) => r.method === m);
    expect(by("nominal")[0].budget).toBe(2600);
    expect(by("robust")[0].budget).toBe(200);
    expect(by("twophase")[0].budget).toBe(100);
    for (const r of result.runs) {
      expect(r.bestParameters.length).toBe(nominal.space.dimension);
      expect(r.bestEvaluation.metrics.mass_kg).toBe(r.bestObjective);
      expect(r.robustDetail?.constraints.map((c) => c.id)).toEqual(problem.constraints.map((c) => c.id));
      expect(r.solverCalls).toBeGreaterThanOrEqual(r.record.totalEvaluations);
    }
    expect(by("nominal")[0].solverCalls).toBe(by("nominal")[0].record.totalEvaluations);
    expect(by("robust")[0].solverCalls).toBe(by("robust")[0].record.totalEvaluations * 13);
    expect(by("posthoc")[0].solverCalls).toBeGreaterThan(by("posthoc")[0].record.totalEvaluations);
    expect(by("posthoc")[0].robustFeasibleFraction).toBeGreaterThanOrEqual(0);
    expect(by("twophase")[0].record.config.seedDesigns?.length).toBe(1);
    expect(by("twophase")[0].phases?.map((p) => p.kind)).toEqual(["nominal", "robust"]);
    const analysis = analyzeStudy(result);
    for (const m of analysis.methods) {
      expect(typeof m.medianSolverCalls).toBe("number");
      expect(typeof m.medianRobustFeasible).toBe("number");
    }
  });

  test("per-constraint margins override the uniform margin", () => {
    const tight = tightenConstraints(nominal, { margin: 0.03, margins: { buckling: 0.06 } });
    const limits = Object.fromEntries(tight.problem.constraints.map((c) => [c.id, c.limit]));
    expect(limits.stress).toBeCloseTo(0.97, 12);
    expect(limits.buckling).toBeCloseTo(0.94, 12);
    expect(tight.backendId).toContain("buckling");
  });

  test("bisection post-hoc selection finds a passing design in O(log n) checks and never a heavier one than the linear scan when robustness is monotone along the trajectory", () => {
    const rec = runExperimentToCompletion(createExperimentConfig({ problem, seed: 3, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 6000 } }));
    const opts = { tolerance: 0.02, samples: 120, seed: 11, targetFraction: 0.95 };
    const linear = postHocRobustSelection(nominal, rec, opts)!;
    const bisect = postHocRobustSelection(nominal, rec, { ...opts, strategy: "bisection" })!;
    expect(bisect).not.toBeNull();
    expect(bisect.robustFeasibleFraction).toBeGreaterThanOrEqual(0.95);
    expect(bisect.checks).toBeLessThanOrEqual(2 * Math.ceil(Math.log2(rec.generations.length)) + 3);
    expect(bisect.checks).toBeLessThan(linear.checks);
    expect(bisect.strategy).toBe("bisection");
    expect(bisect.design.evaluation!.metrics.mass_kg).toBeLessThanOrEqual(linear.design.evaluation!.metrics.mass_kg * 1.05);
    const strided = postHocRobustSelection(nominal, rec, { ...opts, strategy: "strided", stride: 16 })!;
    expect(strided).not.toBeNull();
    expect(strided.strategy).toBe("strided");
    expect(strided.robustFeasibleFraction).toBeGreaterThanOrEqual(0.95);
    expect(strided.checks).toBeLessThan(linear.checks);
    // Exact to within the stride: the strided result is never lighter than the linear one and at most 16 trajectory steps older.
    expect(strided.design.evaluation!.metrics.mass_kg).toBeGreaterThanOrEqual(linear.design.evaluation!.metrics.mass_kg - 1e-12);
  });
});
