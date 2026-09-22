import { describe, expect, test } from "vitest";
import { Rng } from "../../../../src/engine/core/rng";
import { compileProblem } from "../../../../src/engine/domains/registry";
import { solveTruss } from "../../../../src/engine/domains/structural/truss/fea";
import { createTrussBridgeProblem } from "../../../../src/engine/domains/structural/truss/template";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);

describe("member-level responses on evaluations", () => {
  test("the evaluator exposes member axial forces that match the solver", () => {
    const params = compiled.space.sample(new Rng(1));
    const ev = compiled.evaluate(params);
    expect(ev.responses).toBeDefined();
    const forces = ev.responses!.memberForces_N;
    expect(forces).toHaveLength(15);
    const sol = solveTruss(compiled.artifact(params) as never);
    expect(sol.status).toBe("ok");
    if (sol.status !== "ok") return;
    forces.forEach((f, i) => expect(f).toBeCloseTo(sol.memberForces_N[i], 9));
    expect(compiled.responses.find((r) => r.id === "memberForces_N")?.size).toBe(15);
  });

  test("a wrong-length parameter vector is still rejected", () => {
    expect(() => compiled.evaluate([1, 2])).toThrow();
  });
});

describe("exact metrics derived from member forces (response model)", () => {
  test("derive() from the true forces reproduces the evaluator's stress, buckling and mass exactly", () => {
    const params = compiled.space.sample(new Rng(2));
    const ev = compiled.evaluate(params);
    const derived = compiled.responseModel!.derive(params, { memberForces_N: ev.responses!.memberForces_N });
    expect(derived.mass_kg).toBeCloseTo(ev.metrics.mass_kg, 12);
    expect(derived.stressUtilization).toBeCloseTo(ev.metrics.stressUtilization, 12);
    expect(derived.bucklingUtilization).toBeCloseTo(ev.metrics.bucklingUtilization, 12);
    expect(derived.maxStress_Pa).toBeCloseTo(ev.metrics.maxStress_Pa, 6);
  });

  test("declares which metrics are derivable from responses and which are not", () => {
    const rm = compiled.responseModel!;
    expect(rm.derivableMetrics).toEqual(expect.arrayContaining(["mass_kg", "maxStress_Pa", "stressUtilization", "bucklingUtilization"]));
    expect(rm.derivableMetrics).not.toContain("maxDisplacement_m");
    expect(rm.derivableMetrics).not.toContain("compliance_J");
    expect(rm.responseIds).toEqual(["memberForces_N"]);
  });

  test("scaling every predicted force doubles stress utilisation and doubles buckling utilisation", () => {
    const params = compiled.space.sample(new Rng(3));
    const forces = compiled.evaluate(params).responses!.memberForces_N;
    const a = compiled.responseModel!.derive(params, { memberForces_N: forces });
    const b = compiled.responseModel!.derive(params, { memberForces_N: forces.map((f) => 2 * f) });
    expect(b.stressUtilization).toBeCloseTo(2 * a.stressUtilization, 12);
    expect(b.bucklingUtilization).toBeCloseTo(2 * a.bucklingUtilization, 12);
    expect(b.mass_kg).toBeCloseTo(a.mass_kg, 12);
  });

  test("per-member utilisations are exposed so the worst member can be identified", () => {
    const params = compiled.space.sample(new Rng(4));
    const forces = compiled.evaluate(params).responses!.memberForces_N;
    const per = compiled.responseModel!.componentUtilizations(params, { memberForces_N: forces });
    expect(per.stressUtilization).toHaveLength(15);
    expect(per.bucklingUtilization).toHaveLength(15);
    const derived = compiled.responseModel!.derive(params, { memberForces_N: forces });
    expect(Math.max(...per.stressUtilization)).toBeCloseTo(derived.stressUtilization, 12);
    expect(Math.max(...per.bucklingUtilization)).toBeCloseTo(derived.bucklingUtilization, 12);
    per.bucklingUtilization.forEach((u, i) => (forces[i] >= 0 ? expect(u).toBe(0) : expect(u).toBeGreaterThan(0)));
  });
});
