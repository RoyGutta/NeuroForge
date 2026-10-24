import { describe, expect, test } from "vitest";
import { Rng } from "../../../src/engine/core/rng";
import { compileProblem } from "../../../src/engine/domains/registry";
import { reachUtilization, reachUtilizationBound } from "../../../src/engine/domains/robotics/manipulator/evaluate";
import { createManipulatorProblem } from "../../../src/engine/domains/robotics/manipulator/template";
import { analyzeMarginRuns, boxCornerCheck, isolatedThresholds, wilsonInterval, type MarginRunInput } from "../../../src/engine/robustness/marginAnalysis";

describe("Wilson score interval", () => {
  test("matches reference values", () => {
    const zero = wilsonInterval(0, 1000);
    expect(zero.lower).toBe(0);
    expect(zero.upper).toBeCloseTo(0.003827, 5);
    const half = wilsonInterval(50, 100);
    expect(half.lower).toBeCloseTo(0.4038, 4);
    expect(half.upper).toBeCloseTo(0.5962, 4);
    const all = wilsonInterval(300, 300);
    expect(all.upper).toBe(1);
    expect(all.lower).toBeCloseTo(0.98736, 4);
    expect(() => wilsonInterval(3, 0)).toThrow();
  });
});

describe("analytic reach bound under a relative box perturbation of the link lengths", () => {
  const g = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }).geometry;
  if (g.kind !== "planar-manipulator") throw new Error("geometry");
  test("is exact for the outer boundary: u / (1 - t)", () => {
    expect(reachUtilizationBound(0.5, 0.5, [{ x_m: 0.8, y_m: 0 }], 0.02)).toBeCloseTo(0.8 / 0.98, 15);
    expect(reachUtilizationBound(0.5, 0.5, g.taskPoints, 0)).toBe(reachUtilization(0.5, 0.5, g.taskPoints));
  });

  test("bounds every sampled perturbation (20,000 draws over 200 random designs)", () => {
    const rng = new Rng(5);
    let tightest = Infinity;
    for (let d = 0; d < 200; d++) {
      const L1 = 0.2 + rng.next() * 0.7;
      const L2 = 0.2 + rng.next() * 0.7;
      const bound = reachUtilizationBound(L1, L2, g.taskPoints, 0.02);
      for (let k = 0; k < 100; k++) {
        const u = reachUtilization(L1 * (1 + 0.02 * rng.uniform(-1, 1)), L2 * (1 + 0.02 * rng.uniform(-1, 1)), g.taskPoints);
        expect(u).toBeLessThanOrEqual(bound + 1e-12);
        tightest = Math.min(tightest, bound - u);
      }
    }
    expect(tightest).toBeLessThan(1e-3);
  });

  test("a 2 % reach margin guarantees reach under +/- 2 %, a 1.9 % margin does not", () => {
    const r = 0.8;
    const at = (m: number) => { const L = (r / (1 - m)) / 2; return reachUtilizationBound(L, L, [{ x_m: r, y_m: 0 }], 0.02); };
    expect(at(0.02)).toBeLessThanOrEqual(1 + 1e-12);
    expect(at(0.019)).toBeGreaterThan(1);
  });
});

describe("box-corner check", () => {
  test("evaluates all 2^d corners, clamped to bounds, and reports per-constraint worst utilisation", () => {
    const c = compileProblem(createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }));
    const res = boxCornerCheck(c, c.baseline.parameters, 0.02);
    expect(res.corners).toBe(16);
    const reach = res.constraints.find((x) => x.id === "reach")!;
    const L = c.baseline.parameters[0];
    expect(reach.maxUtilization).toBeCloseTo(0.8 / (2 * L * 0.98), 10);
    expect(res.constraints.map((x) => x.id).sort()).toEqual(["deflection", "reach", "stress"]);
    for (const x of res.constraints) expect(x.failingCorners).toBeGreaterThanOrEqual(0);
  });
});

describe("margin analysis", () => {
  const run = (method: string, seed: number, obj: number, failures: Record<string, number>, overall: number): MarginRunInput => ({
    method,
    seed,
    bestObjective: obj,
    samples: 1000,
    failures,
    overallFailures: overall,
  });
  const runs: MarginRunInput[] = [];
  for (let s = 1; s <= 10; s++) {
    runs.push(run("nominal", s, 17 + s * 0.001, { reach: 470, deflection: 330 }, 800));
    runs.push(run("reach-2", s, 17.2 + s * 0.001, { reach: 0, deflection: 340 }, 340));
    runs.push(run("reach-1", s, 17.1, { reach: s === 3 ? 60 : 10, deflection: 300 }, 310));
  }

  test("applies the pre-registered criterion: every seed's Wilson upper bound on the failure rate <= 5 %", () => {
    const a = analyzeMarginRuns(runs, { reference: "nominal", maxFailureRate: 0.05, constraints: ["reach", "deflection"] });
    const r2 = a.methods.find((m) => m.method === "reach-2")!;
    expect(r2.perConstraint.reach).toMatchObject({ seedsMeetingCriterion: 10, meetsCriterion: true, medianFailureRate: 0, maxFailureRate: 0 });
    expect(r2.perConstraint.deflection.meetsCriterion).toBe(false);
    expect(r2.overall.meetsCriterion).toBe(false);
    const r1 = a.methods.find((m) => m.method === "reach-1")!;
    expect(r1.perConstraint.reach.seedsMeetingCriterion).toBe(9);
    expect(r1.perConstraint.reach.meetsCriterion).toBe(false);
    expect(r1.perConstraint.reach.maxFailureRate).toBeCloseTo(0.06, 12);
  });

  test("reports cost as the paired per-seed objective change against the reference", () => {
    const a = analyzeMarginRuns(runs, { reference: "nominal", maxFailureRate: 0.05, constraints: ["reach", "deflection"] });
    const r2 = a.methods.find((m) => m.method === "reach-2")!;
    expect(r2.medianCost).toBeCloseTo(0.2 / 17.005, 3);
    expect(r2.seeds).toBe(10);
    expect(a.methods.find((m) => m.method === "nominal")!.medianCost).toBe(0);
  });

  test("counts runs without a design as failing the criterion rather than dropping them", () => {
    const withMissing = [...runs, { method: "reach-3", seed: 1, bestObjective: null, samples: 0, failures: {}, overallFailures: 0 }];
    const a = analyzeMarginRuns(withMissing, { reference: "nominal", maxFailureRate: 0.05, constraints: ["reach"] });
    const r3 = a.methods.find((m) => m.method === "reach-3")!;
    expect(r3.runsWithoutDesign).toBe(1);
    expect(r3.perConstraint.reach.meetsCriterion).toBe(false);
  });
});

describe("isolated thresholds", () => {
  const ok = (meets: boolean) => ({ meetsCriterion: meets, seedsMeetingCriterion: meets ? 10 : 5 });
  const row = (method: string, reach: number, defl: number, reachOk: boolean, deflOk: boolean) => ({ method, margins: { reach, deflection: defl }, medianCost: reach + defl, perConstraint: { reach: ok(reachOk), deflection: ok(deflOk) } });
  test("finds the smallest passing margin per constraint, ignoring joint methods, and flags non-monotone sweeps", () => {
    const rows = [row("nominal", 0, 0, false, false), row("r1", 0.01, 0, false, false), row("r2", 0.02, 0, true, false), row("r3", 0.03, 0, true, false), row("d5", 0, 0.05, false, true), row("d7", 0, 0.07, false, false), row("j", 0.01, 0.01, true, true)];
    const [reach, defl] = isolatedThresholds(rows, ["reach", "deflection"], "nominal");
    expect(reach.smallestMeeting?.margin).toBe(0.02);
    expect(reach.monotone).toBe(true);
    expect(reach.tested.map((x) => x.method)).toEqual(["nominal", "r1", "r2", "r3"]);
    expect(defl.smallestMeeting?.margin).toBe(0.05);
    expect(defl.monotone).toBe(false);
  });
});
