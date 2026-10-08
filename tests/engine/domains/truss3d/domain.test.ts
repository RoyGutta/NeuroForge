import { describe, expect, test } from "vitest";
import { compileProblem, listDomains, validateProblem } from "../../../../src/engine/domains/registry";
import { solveTruss3d } from "../../../../src/engine/domains/structural/truss3d/fea3d";
import type { Truss3dModel } from "../../../../src/engine/domains/structural/truss3d/model";
import { createSpaceTrussProblem } from "../../../../src/engine/domains/structural/truss3d/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../../src/engine/experiments/runner";
import { createTrussBridgeProblem } from "../../../../src/engine/domains/structural/truss/template";
import { responseReference } from "../../../fixtures/truss2dResponseReference";

describe("planar response model on the dimension-generic core", () => {
  test("reproduces the recorded derivations bit for bit", () => {
    const fx = responseReference as { params: number[]; fromForces: Record<string, number>; fromU: Record<string, number>; forcesFromU: number[]; conservative: Record<string, number>; utilizations: Record<string, number[]> }[];
    const compiled = compileProblem(createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 }));
    const rm = compiled.responseModel!;
    for (const c of fx) {
      const ev = compiled.evaluate(c.params);
      const u = ev.responses!.nodeDisplacements_m;
      const f = ev.responses!.memberForces_N;
      const std = u.map((_, i) => 1e-6 * (1 + (i % 3)));
      expect(rm.derive(c.params, { memberForces_N: f })).toEqual(c.fromForces);
      expect(rm.derive(c.params, { nodeDisplacements_m: u })).toEqual(c.fromU);
      expect(rm.forcesFromDisplacements!(c.params, u).forces).toEqual(c.forcesFromU);
      expect(rm.conservativeFromDisplacements!(c.params, u, std, 2)).toEqual(c.conservative);
      expect(rm.componentUtilizations(c.params, { memberForces_N: f })).toEqual(c.utilizations);
    }
  });
});

describe("structural3d domain: triangular space truss girder", () => {
  const problem = createSpaceTrussProblem({ span_m: 3, load_N: 2000, bays: 2 });
  const compiled = compileProblem(problem);

  test("template, validation and registration", () => {
    expect(problem.domain).toBe("structural3d");
    expect(problem.geometry.kind).toBe("space-truss");
    expect(validateProblem(problem)).toEqual([]);
    expect(listDomains().map((d) => d.id).sort()).toEqual(["robotics", "structural", "structural3d", "thermal"]);
    expect(problem.constraints.map((c) => c.metric)).toEqual(expect.arrayContaining(["stressUtilization", "bucklingUtilization", "maxDisplacement_m"]));
    expect(problem.assumptions.map((a) => a.field)).toEqual(expect.arrayContaining(["supports", "section", "width"]));
    expect(compiled.backendId).toBe("truss-fea-3d");
  });

  test("the design space is the station heights plus every member area; the model has 3 nodes per station and 10 members per bay plus 3 per station", () => {
    const bays = 2;
    expect(compiled.space.dimension).toBe(bays + 1 + (10 * bays + 3));
    const model = compiled.artifact(compiled.baseline.parameters) as Truss3dModel;
    expect(model.nodes.length).toBe(3 * (bays + 1));
    expect(model.members.length).toBe(10 * bays + 3);
    // Seven restraints: four vertical corners plus three in-plane (externally once indeterminate, like a four-legged table).
    const fixedCount = model.supports.reduce((s, x) => s + (x.fixX ? 1 : 0) + (x.fixY ? 1 : 0) + (x.fixZ ? 1 : 0), 0);
    expect(fixedCount).toBe(7);
    const r = solveTruss3d(model);
    expect(r.status).toBe("ok");
  });

  test("the baseline is feasible, sized by the same solver, and sits near a constraint limit", () => {
    const ev = compiled.evaluate(compiled.baseline.parameters);
    expect(ev.feasible).toBe(true);
    const util = Math.max(ev.metrics.stressUtilization, ev.metrics.bucklingUtilization, ev.metrics.maxDisplacement_m / problem.constraints.find((c) => c.id === "deflection")!.limit);
    expect(util).toBeGreaterThan(0.9);
    expect(util).toBeLessThanOrEqual(1 + 1e-9);
    expect(ev.responses?.memberForces_N?.length).toBe(10 * 2 + 3);
    expect(ev.responses?.nodeDisplacements_m?.length).toBe(3 * 9 - 7);
  });

  test("the structure is symmetric about midspan under the midspan load: mirrored members carry equal forces", () => {
    const model = compiled.artifact(compiled.baseline.parameters) as Truss3dModel;
    const r = solveTruss3d(model);
    if (r.status !== "ok") throw new Error("baseline unstable");
    // Left and right bottom chords of the same bay carry the same force (symmetry about the x-z plane).
    const chordPairs = model.members.map((m, k) => ({ k, a: model.nodes[m.i], b: model.nodes[m.j] })).filter(({ a, b }) => a.z === 0 && b.z === 0 && a.y === b.y && a.x !== b.x);
    const byBay = new Map<string, number[]>();
    for (const c of chordPairs) {
      const key = `${Math.min(c.a.x, c.b.x)}-${Math.max(c.a.x, c.b.x)}`;
      byBay.set(key, [...(byBay.get(key) ?? []), r.memberForces_N[c.k]]);
    }
    for (const [, forces] of byBay) {
      expect(forces.length).toBe(2);
      expect(forces[0]).toBeCloseTo(forces[1], 6);
    }
    // Reactions carry the whole load.
    const sumZ = model.supports.reduce((s, sup) => s + (sup.fixZ ? r.reactions_N[3 * sup.node + 2] : 0), 0);
    expect(sumZ).toBeCloseTo(model.loads.reduce((s, l) => s - l.fz_N, 0), 6);
  });

  test("the response model derives every metric exactly from forces or from the displacement field", () => {
    const ev = compiled.evaluate(compiled.baseline.parameters);
    const rm = compiled.responseModel!;
    const fromForces = rm.derive(compiled.baseline.parameters, { memberForces_N: ev.responses!.memberForces_N });
    for (const id of rm.derivableFrom("memberForces_N")) expect(fromForces[id]).toBeCloseTo(ev.metrics[id], 9);
    const fromU = rm.derive(compiled.baseline.parameters, { nodeDisplacements_m: ev.responses!.nodeDisplacements_m });
    for (const id of rm.derivableFrom("nodeDisplacements_m")) expect(fromU[id]).toBeCloseTo(ev.metrics[id], 6);
    const f = rm.forcesFromDisplacements!(compiled.baseline.parameters, ev.responses!.nodeDisplacements_m).forces;
    f.forEach((v, i) => expect(v).toBeCloseTo(ev.responses!.memberForces_N[i], 4));
  });

  test("the evolutionary optimiser finds a lighter feasible girder than the baseline, deterministically", () => {
    const cfg = () => createExperimentConfig({ id: "s3d", problem, seed: 5, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 2000 } });
    const a = runExperimentToCompletion(cfg());
    const b = runExperimentToCompletion(cfg());
    expect(a.best?.evaluation?.feasible).toBe(true);
    expect(a.best!.evaluation!.metrics.mass_kg).toBeLessThan(0.85 * compiled.evaluate(compiled.baseline.parameters).metrics.mass_kg);
    expect(a.best!.parameters).toEqual(b.best!.parameters);
  });

  test("the member-surrogate optimiser runs through the response model on the spatial truss", () => {
    const rec = runExperimentToCompletion(createExperimentConfig({ problem, seed: 2, optimizer: { id: "member-surrogate-evolutionary", params: { populationSize: 20, warmupEvaluations: 150 } }, budget: { maxEvaluations: 600 } }));
    expect(rec.status).toBe("completed");
    const funnel = (rec.optimizerDiagnostics as { funnel?: { sentToSolver: number } } | undefined)?.funnel;
    expect(funnel?.sentToSolver).toBeGreaterThan(0);
  });

  test("invalid geometry is rejected", () => {
    const bad = createSpaceTrussProblem({ span_m: 3, load_N: 2000, bays: 2 });
    if (bad.geometry.kind === "space-truss") bad.geometry.bays = 1;
    expect(validateProblem(bad).length).toBeGreaterThan(0);
  });
});
