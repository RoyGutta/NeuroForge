import { describe, expect, test } from "vitest";
import { compileProblem, listDomains, validateProblem } from "../../../../src/engine/domains/registry";
import type { FinArrayArtifact } from "../../../../src/engine/domains/thermal/finArray/evaluate";
import { createHeatSinkProblem } from "../../../../src/engine/domains/thermal/finArray/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../../src/engine/experiments/runner";

describe("thermal domain: plate-fin heat sink", () => {
  const problem = createHeatSinkProblem({ power_W: 40, maxTemperature_C: 80 });
  const compiled = compileProblem(problem);

  test("the template states its assumptions, the objective and the constraints", () => {
    expect(problem.domain).toBe("thermal");
    expect(problem.geometry.kind).toBe("fin-array");
    expect(validateProblem(problem)).toEqual([]);
    expect(problem.objectives[0].metric).toBe("mass_kg");
    expect(problem.constraints.map((c) => c.metric)).toEqual(expect.arrayContaining(["baseTemperature_C", "gap_m"]));
    expect(problem.loads[0].kind).toBe("heat");
    expect(problem.assumptions.map((a) => a.field)).toEqual(expect.arrayContaining(["ambient", "convection", "airProperties", "orientation"]));
    expect(problem.material.thermalConductivity_W_mK).toBeGreaterThan(0);
  });

  test("the design space has fin height, thickness, pitch and base thickness, and the baseline is feasible and near its temperature limit", () => {
    expect(compiled.space.dimension).toBe(4);
    expect(compiled.space.variables.map((v) => v.group)).toEqual(["height", "thickness", "pitch", "base"]);
    const base = compiled.evaluate(compiled.baseline.parameters);
    expect(base.feasible).toBe(true);
    const limit = problem.constraints.find((c) => c.metric === "baseTemperature_C")!.limit;
    expect(base.metrics.baseTemperature_C).toBeLessThanOrEqual(limit);
    expect(base.metrics.baseTemperature_C).toBeGreaterThan(limit - 5);
    expect(base.metrics.finCount).toBeGreaterThanOrEqual(2);
    expect(compiled.backendId).toBe("fin-array-natural-convection");
  });

  test("the artifact exposes the fin geometry and temperatures for drawing", () => {
    const art = compiled.artifact(compiled.baseline.parameters) as FinArrayArtifact;
    expect(art.finCount).toBe(compiled.evaluate(compiled.baseline.parameters).metrics.finCount);
    expect(art.baseTemperature_C).toBeGreaterThan(art.tipTemperature_C);
    expect(art.tipTemperature_C).toBeGreaterThan(art.ambient_C);
    expect(art.finProfile.length).toBeGreaterThan(5);
    expect(art.finProfile[0].temperature_C).toBeCloseTo(art.baseTemperature_C, 6);
  });

  test("responses carry the thermal state and the response model derives every metric exactly", () => {
    const ev = compiled.evaluate(compiled.baseline.parameters);
    expect(compiled.responses.map((r) => r.id)).toEqual(["thermalState"]);
    const derived = compiled.responseModel!.derive(compiled.baseline.parameters, ev.responses!);
    for (const id of compiled.responseModel!.derivableMetrics) expect(derived[id]).toBeCloseTo(ev.metrics[id], 9);
    expect(compiled.responseModel!.derivableFrom("thermalState")).toEqual(expect.arrayContaining(["baseTemperature_C", "thermalResistance_K_W", "mass_kg"]));
  });

  test("an optimiser finds a lighter feasible heat sink than the baseline", () => {
    const rec = runExperimentToCompletion(createExperimentConfig({ problem, seed: 3, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 1500 } }));
    expect(rec.best?.evaluation?.feasible).toBe(true);
    expect(rec.best!.evaluation!.metrics.mass_kg).toBeLessThan(0.9 * compiled.evaluate(compiled.baseline.parameters).metrics.mass_kg);
    expect(rec.best!.evaluation!.metrics.baseTemperature_C).toBeLessThanOrEqual(80);
  });

  test("the member-surrogate optimiser runs through the response model", () => {
    const rec = runExperimentToCompletion(createExperimentConfig({ problem, seed: 2, optimizer: { id: "member-surrogate-evolutionary", params: { populationSize: 20, warmupEvaluations: 120 } }, budget: { maxEvaluations: 500 } }));
    expect(rec.status).toBe("completed");
    const funnel = (rec.optimizerDiagnostics as { funnel?: { sentToSolver: number } } | undefined)?.funnel;
    expect(funnel?.sentToSolver).toBeGreaterThan(0);
  });

  test("a brief the physics cannot meet is reported as infeasible, not solved", () => {
    const hot = compileProblem(createHeatSinkProblem({ power_W: 100, maxTemperature_C: 80 }));
    const base = hot.evaluate(hot.baseline.parameters);
    expect(base.feasible).toBe(false);
    expect(base.metrics.baseTemperature_C).toBeGreaterThan(80);
    expect(base.status).toBe("ok");
  });

  test("the registry lists three domains and rejects a heat sink with a non-positive power", () => {
    expect(listDomains().map((d) => d.id).sort()).toEqual(["robotics", "structural", "structural3d", "thermal"]);
    const bad = createHeatSinkProblem({ power_W: 40, maxTemperature_C: 80 });
    (bad.loads[0] as { power_W: number }).power_W = 0;
    expect(validateProblem(bad).length).toBeGreaterThan(0);
  });
});
