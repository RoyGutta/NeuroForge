import { describe, expect, test } from "vitest";
import { Rng } from "../../../../src/engine/core/rng";
import { compileProblem, listDomains, validateProblem } from "../../../../src/engine/domains/registry";
import { createManipulatorProblem } from "../../../../src/engine/domains/robotics/manipulator/template";
import type { ManipulatorArtifact } from "../../../../src/engine/domains/robotics/manipulator/evaluate";
import { createExperimentConfig, runExperimentToCompletion } from "../../../../src/engine/experiments/runner";

describe("robotics domain: planar manipulator", () => {
  const problem = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 });
  const compiled = compileProblem(problem);

  test("is registered alongside the structural domain and validates its template", () => {
    expect(listDomains().map((d) => d.id)).toEqual(expect.arrayContaining(["structural", "robotics"]));
    expect(problem.domain).toBe("robotics");
    expect(problem.geometry.kind).toBe("planar-manipulator");
    expect(validateProblem(problem)).toEqual([]);
    expect(problem.objectives[0].metric).toBe("peakTorque_Nm");
    expect(problem.constraints.map((c) => c.metric)).toEqual(expect.arrayContaining(["unreachableFraction", "stressUtilization", "maxTipDeflection_m"]));
    expect(problem.assumptions.map((a) => a.field)).toEqual(expect.arrayContaining(["taskPoints", "linkModel", "elbowChoice"]));
  });

  test("design space has two link lengths and two log-scaled tube radii", () => {
    expect(compiled.space.dimension).toBe(4);
    const groups = compiled.space.variables.map((v) => v.group);
    expect(groups).toEqual(["length", "length", "radius", "radius"]);
    expect(compiled.space.variables[2].scale).toBe("log");
  });

  test("baseline reaches every task point, is feasible and nearly critical", () => {
    const ev = compiled.evaluate(compiled.baseline.parameters);
    expect(ev.status).toBe("ok");
    expect(ev.feasible).toBe(true);
    expect(ev.metrics.unreachableFraction).toBe(0);
    expect(Math.max(ev.metrics.stressUtilization, ev.metrics.maxTipDeflection_m / problem.constraints.find((c) => c.metric === "maxTipDeflection_m")!.limit)).toBeGreaterThan(0.9);
    expect(ev.metrics.peakTorque_Nm).toBeGreaterThan(0);
    expect(ev.metrics.mass_kg).toBeGreaterThan(0);
  });

  test("peak torque is the maximum absolute joint torque over the task points, from the artifact", () => {
    const params = compiled.baseline.parameters;
    const art = compiled.artifact(params) as ManipulatorArtifact;
    expect(art.poses).toHaveLength(problem.geometry.kind === "planar-manipulator" ? problem.geometry.taskPoints.length : 0);
    const peak = Math.max(...art.poses.filter((p) => p.reachable).map((p) => Math.max(Math.abs(p.tau1_Nm), Math.abs(p.tau2_Nm))));
    expect(compiled.evaluate(params).metrics.peakTorque_Nm).toBeCloseTo(peak, 9);
    expect(art.worstPoseIndex).toBeGreaterThanOrEqual(0);
  });

  test("shrinking the links below the farthest task point makes it unreachable and infeasible", () => {
    const params = compiled.baseline.parameters.slice();
    params[0] = compiled.space.variables[0].lower;
    params[1] = compiled.space.variables[1].lower;
    const ev = compiled.evaluate(params);
    expect(ev.metrics.unreachableFraction).toBeGreaterThan(0);
    expect(ev.feasible).toBe(false);
  });

  test("responses expose per-pose joint torques and tip deflections and the response model derives the metrics exactly", () => {
    const params = compiled.space.sample(new Rng(2));
    const ev = compiled.evaluate(params);
    const K = (problem.geometry as { taskPoints: unknown[] }).taskPoints.length;
    expect(ev.responses!.jointTorques_Nm).toHaveLength(2 * K);
    expect(ev.responses!.tipDeflections_m).toHaveLength(K);
    const rm = compiled.responseModel!;
    const derived = rm.derive(params, { jointTorques_Nm: ev.responses!.jointTorques_Nm, tipDeflections_m: ev.responses!.tipDeflections_m });
    for (const m of ["peakTorque_Nm", "stressUtilization", "maxTipDeflection_m", "mass_kg", "unreachableFraction"]) expect(derived[m]).toBeCloseTo(ev.metrics[m], 9);
    expect(rm.derivableFrom("jointTorques_Nm")).toEqual(expect.arrayContaining(["peakTorque_Nm", "stressUtilization", "mass_kg", "unreachableFraction"]));
    expect(rm.derivableFrom("tipDeflections_m")).toContain("maxTipDeflection_m");
  });

  test("the generic optimiser and runner work unchanged on the new domain and improve the baseline", () => {
    const record = runExperimentToCompletion(createExperimentConfig({ id: "arm", problem, seed: 3, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 1500 } }));
    expect(record.status).toBe("completed");
    expect(record.best?.evaluation?.feasible).toBe(true);
    expect(record.best!.evaluation!.metrics.peakTorque_Nm).toBeLessThan(record.baseline.evaluation!.metrics.peakTorque_Nm);
    expect(record.backendId).toBe("manipulator-statics-2d");
  });

  test("the surrogate optimiser runs on the new domain through the response model", () => {
    const record = runExperimentToCompletion(createExperimentConfig({ id: "arm-ms", problem, seed: 4, optimizer: { id: "member-surrogate-evolutionary", params: { populationSize: 20, warmupEvaluations: 120 } }, budget: { maxEvaluations: 600 } }));
    expect(record.status).toBe("completed");
    expect(record.best?.evaluation?.feasible).toBe(true);
    const d = record.optimizerDiagnostics as { funnel: { sentToSolver: number } };
    expect(d.funnel.sentToSolver).toBeGreaterThan(0);
  });
});
