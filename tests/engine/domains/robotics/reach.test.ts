import { describe, expect, test } from "vitest";
import { Rng } from "../../../../src/engine/core/rng";
import { compileProblem } from "../../../../src/engine/domains/registry";
import { evaluateArm, reachUtilization } from "../../../../src/engine/domains/robotics/manipulator/evaluate";
import { isReachable } from "../../../../src/engine/domains/robotics/manipulator/kinematics";
import { createManipulatorProblem } from "../../../../src/engine/domains/robotics/manipulator/template";
import { tightenConstraints } from "../../../../src/engine/robustness/formulations";

const at = (r: number) => ({ x_m: r, y_m: 0 });

describe("continuous reach utilisation", () => {
  test("closed-form cases: outer reach r/(L1+L2) and inner reach |L1-L2|/r, maximised over task points", () => {
    expect(reachUtilization(0.5, 0.5, [at(0.8)])).toBeCloseTo(0.8, 15);
    expect(reachUtilization(0.5, 0.5, [at(1.2)])).toBeCloseTo(1.2, 15);
    expect(reachUtilization(0.7, 0.2, [at(0.4)])).toBeCloseTo(1.25, 15);
    expect(reachUtilization(0.7, 0.2, [at(0.4), at(0.8)])).toBeCloseTo(1.25, 15);
    expect(reachUtilization(0.6, 0.3, [{ x_m: 0.3, y_m: 0.4 }])).toBeCloseTo(Math.max(0.5 / 0.9, 0.3 / 0.5), 15);
    expect(reachUtilization(0.5, 0.5, [at(0)])).toBe(0);
    expect(reachUtilization(0.6, 0.5, [at(0)])).toBe(Infinity);
  });

  test("utilisation <= 1 holds exactly for the designs that reach every point (2,000 random designs)", () => {
    const rng = new Rng(11);
    const pts = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }).geometry;
    if (pts.kind !== "planar-manipulator") throw new Error("geometry");
    let disagreements = 0;
    let unreachableSeen = 0;
    for (let i = 0; i < 2000; i++) {
      const L1 = 0.05 + rng.next() * 0.9;
      const L2 = 0.05 + rng.next() * 0.9;
      const u = reachUtilization(L1, L2, pts.taskPoints);
      if (Math.abs(u - 1) < 1e-6) continue; // the IK tolerance band
      const all = pts.taskPoints.every((p) => isReachable(L1, L2, p.x_m, p.y_m));
      if (!all) unreachableSeen++;
      if (all !== u <= 1) disagreements++;
    }
    expect(unreachableSeen).toBeGreaterThan(100);
    expect(disagreements).toBe(0);
  });

  test("the template constrains reach utilisation <= 1 and still reports the unreachable fraction", () => {
    const problem = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 });
    const reach = problem.constraints.find((c) => c.id === "reach")!;
    expect(reach).toMatchObject({ metric: "reachUtilization", op: "<=", limit: 1 });
    const c = compileProblem(problem);
    const ev = c.evaluate(c.baseline.parameters);
    expect(ev.metrics.reachUtilization).toBeLessThan(1);
    expect(ev.metrics.unreachableFraction).toBe(0);
    expect(c.metrics.map((m) => m.id)).toContain("reachUtilization");
  });

  test("an unreachable design's violation grows with how far out of reach it is", () => {
    const problem = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 });
    const short = evaluateArm(problem, { L1_m: 0.38, L2_m: 0.38, r1_m: 0.02, r2_m: 0.02 });
    const shorter = evaluateArm(problem, { L1_m: 0.3, L2_m: 0.3, r1_m: 0.02, r2_m: 0.02 });
    const v = (e: typeof short) => e.constraints.find((x) => x.id === "reach")!.violation;
    expect(v(short)).toBeGreaterThan(0);
    expect(v(shorter)).toBeGreaterThan(v(short));
    expect(v(short)).toBeCloseTo(0.8 / 0.76 - 1, 12);
  });

  test("a generic constraint margin now tightens reach: a design at 99 % of its reach fails a 3 % margin", () => {
    const problem = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 });
    const c = compileProblem(problem);
    const L = 0.8 / 0.99 / 2;
    const params = [L, L, 0.03, 0.03];
    const nominal = c.evaluate(params);
    expect(nominal.metrics.reachUtilization).toBeCloseTo(0.99, 12);
    expect(nominal.constraints.find((x) => x.id === "reach")!.satisfied).toBe(true);
    const tight = tightenConstraints(c, { margin: 0.03 }).evaluate(params);
    expect(tight.constraints.find((x) => x.id === "reach")!.satisfied).toBe(false);
    expect(tight.feasible).toBe(false);
  });

  test("the response model derives reach utilisation exactly from geometry", () => {
    const c = compileProblem(createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }));
    const rm = c.responseModel!;
    expect(rm.derivableFrom("jointTorques_Nm")).toContain("reachUtilization");
    expect(rm.derivableFrom("tipDeflections_m")).toContain("reachUtilization");
    for (const params of [c.baseline.parameters, [0.3, 0.3, 0.02, 0.02], [0.7, 0.2, 0.02, 0.015]]) {
      const ev = c.evaluate(params);
      expect(rm.derive(params, ev.responses!).reachUtilization).toBe(ev.metrics.reachUtilization);
    }
  });
});
