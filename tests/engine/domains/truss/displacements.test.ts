import { describe, expect, test } from "vitest";
import { Rng } from "../../../../src/engine/core/rng";
import { compileProblem } from "../../../../src/engine/domains/registry";
import { solveTruss } from "../../../../src/engine/domains/structural/truss/fea";
import { createTrussBridgeProblem } from "../../../../src/engine/domains/structural/truss/template";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);

describe("free-node displacement responses", () => {
  test("evaluations expose the free-DOF displacement vector matching the solver", () => {
    const params = compiled.space.sample(new Rng(1));
    const ev = compiled.evaluate(params);
    const u = ev.responses!.nodeDisplacements_m;
    expect(u).toHaveLength(15);
    const desc = compiled.responses.find((r) => r.id === "nodeDisplacements_m")!;
    expect(desc.size).toBe(15);
    const sol = solveTruss(compiled.artifact(params) as never);
    if (sol.status !== "ok") throw new Error("expected ok");
    const free = compiled.responseModel!.freeDofs!;
    expect(free).toHaveLength(15);
    u.forEach((v, i) => expect(v).toBeCloseTo(sol.displacements_m[free[i]], 12));
  });

  test("member forces derived kinematically from the displacement field equal the solver's forces", () => {
    const params = compiled.space.sample(new Rng(2));
    const ev = compiled.evaluate(params);
    const derived = compiled.responseModel!.derive(params, { nodeDisplacements_m: ev.responses!.nodeDisplacements_m });
    expect(derived.stressUtilization).toBeCloseTo(ev.metrics.stressUtilization, 10);
    expect(derived.bucklingUtilization).toBeCloseTo(ev.metrics.bucklingUtilization, 10);
    expect(derived.maxDisplacement_m).toBeCloseTo(ev.metrics.maxDisplacement_m, 12);
    expect(derived.compliance_J).toBeCloseTo(ev.metrics.compliance_J, 10);
    expect(derived.mass_kg).toBeCloseTo(ev.metrics.mass_kg, 12);
  });

  test("the response model declares deflection and compliance derivable from displacements", () => {
    const rm = compiled.responseModel!;
    expect(rm.responseIds).toEqual(["memberForces_N", "nodeDisplacements_m"]);
    expect(rm.derivableFrom("nodeDisplacements_m")).toEqual(expect.arrayContaining(["mass_kg", "stressUtilization", "bucklingUtilization", "maxDisplacement_m", "compliance_J"]));
    expect(rm.derivableFrom("memberForces_N")).not.toContain("maxDisplacement_m");
  });

  test("forcesFromDisplacements exposes the linear map so uncertainty can be propagated exactly", () => {
    const params = compiled.space.sample(new Rng(3));
    const ev = compiled.evaluate(params);
    const u = ev.responses!.nodeDisplacements_m;
    const { forces, matrix } = compiled.responseModel!.forcesFromDisplacements!(params, u);
    forces.forEach((f, m) => expect(f).toBeCloseTo(ev.responses!.memberForces_N[m], 8));
    expect(matrix).toHaveLength(15);
    expect(matrix[0]).toHaveLength(15);
    const twice = compiled.responseModel!.forcesFromDisplacements!(params, u.map((v) => 2 * v)).forces;
    twice.forEach((f, m) => expect(f).toBeCloseTo(2 * forces[m], 8));
  });
});
