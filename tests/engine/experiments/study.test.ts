import { describe, expect, test } from "vitest";
import { analyzeStudy, runStudy, type StudySpec } from "../../../src/engine/experiments/study";

const spec: StudySpec = {
  id: "test-study",
  title: "Does the global surrogate beat plain evolution at a small budget?",
  hypothesis: "The surrogate-assisted optimiser reaches a lower median best mass than the plain evolutionary algorithm at equal solver budget.",
  benchmark: { problem: "truss-bridge", span_m: 2, load_N: 500, panels: 4 },
  budget: 500,
  seeds: [1, 2, 3, 4],
  reference: "ea",
  methods: [
    { id: "ea", optimizer: "evolutionary", params: { populationSize: 20 } },
    { id: "surrogate", optimizer: "surrogate-evolutionary", params: { populationSize: 20, warmupEvaluations: 100 } },
  ],
  metrics: ["bestObjective", "evaluationsToTarget"],
  targetFraction: 0.6,
};

describe("study registry", () => {
  test("runs every method on every seed at the stated budget and keeps raw runs separate from analysis", () => {
    const result = runStudy(spec);
    expect(result.spec).toEqual(spec);
    expect(result.runs).toHaveLength(spec.methods.length * spec.seeds.length);
    for (const r of result.runs) {
      expect(r.budget).toBe(500);
      expect(r.record.totalEvaluations).toBeGreaterThanOrEqual(500);
      expect(spec.seeds).toContain(r.seed);
    }
    const analysis = analyzeStudy(result);
    expect(analysis.methods.map((m) => m.id)).toEqual(["ea", "surrogate"]);
    for (const m of analysis.methods) {
      expect(Number.isFinite(m.best.median)).toBe(true);
      expect(m.best.lower).toBeLessThanOrEqual(m.best.median);
      expect(m.best.upper).toBeGreaterThanOrEqual(m.best.median);
      expect(m.runs).toBe(4);
    }
    const cmp = analysis.comparisons.find((c) => c.method === "surrogate")!;
    expect(cmp.reference).toBe("ea");
    expect(cmp.varghaDelaneyA).toBeGreaterThanOrEqual(0);
    expect(cmp.varghaDelaneyA).toBeLessThanOrEqual(1);
    expect(Math.abs(cmp.cliffsDelta)).toBeLessThanOrEqual(1);
    expect(["large", "medium", "small", "negligible"]).toContain(cmp.effectLabel);
    expect(analysis.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("is deterministic in both runs and analysis", () => {
    const a = analyzeStudy(runStudy(spec));
    const b = analyzeStudy(runStudy(spec));
    const strip = (m: (typeof a.methods)[number]) => ({ ...m, meanWallTimeS: 0 });
    expect(a.methods.map(strip)).toEqual(b.methods.map(strip));
    expect(a.comparisons).toEqual(b.comparisons);
  });

  test("runs on the manipulator benchmark and reports the torque objective", () => {
    const arm: StudySpec = { ...spec, id: "arm-study", benchmark: { problem: "planar-manipulator", payload_kg: 2, reach_m: 0.8 }, seeds: [1, 2], budget: 300, methods: [{ id: "ea", optimizer: "evolutionary", params: { populationSize: 12 } }, { id: "cma", optimizer: "cmaes", params: {} }], reference: "ea", targetFraction: 0.98 };
    const result = runStudy(arm);
    expect(result.objective.metric).toBe("peakTorque_Nm");
    expect(result.objective.unit).toBe("N m");
    expect(result.targetObjective).toBeCloseTo(result.baselineObjective * 0.98, 9);
    for (const r of result.runs) expect(r.bestObjective).toBe(r.record.best!.evaluation!.objectives.torque);
    const analysis = analyzeStudy(result);
    expect(analysis.objective.metric).toBe("peakTorque_Nm");
    expect(analysis.methods.map((m) => m.id)).toEqual(["ea", "cma"]);
  });

  test("rejects a spec whose reference method is not among its methods", () => {
    expect(() => runStudy({ ...spec, reference: "missing" })).toThrow(/reference/);
  });

  test("records an independent robustness check per run and lets a method optimise in robust mode", () => {
    const sp: StudySpec = {
      ...spec,
      id: "robust-check",
      seeds: [1, 2],
      budget: 300,
      methods: [
        { id: "nominal", optimizer: "evolutionary", params: { populationSize: 12 } },
        { id: "robust", optimizer: "evolutionary", params: { populationSize: 12 }, robust: { tolerance: 0.02, samples: 8, targetFraction: 0.9 } },
      ],
      reference: "nominal",
      robustCheck: { tolerance: 0.02, samples: 60 },
    };
    const result = runStudy(sp);
    for (const r of result.runs) {
      expect(r.robustFeasibleFraction).toBeGreaterThanOrEqual(0);
      expect(r.robustFeasibleFraction).toBeLessThanOrEqual(1);
      expect(r.record.config.robust ?? null).toEqual(r.method === "robust" ? { tolerance: 0.02, samples: 8, targetFraction: 0.9 } : null);
    }
    const analysis = analyzeStudy(result);
    for (const m of analysis.methods) expect(typeof m.medianRobustFeasible).toBe("number");
  });
});
