/**
 * Thermal domain: a plate-fin heat sink in natural convection. Closed-form
 * fin theory and a buoyant-channel correlation, coupled through a fixed
 * point on the temperature rise, behind the same `EngineeringDomain`
 * contract as the truss and the manipulator.
 */
import type { EngineeringProblem, ValidationIssue } from "../../core/problem";
import type { CompiledProblem, EngineeringDomain, ResponseModel } from "../domain";
import { evaluateFinArray, FIN_ARRAY_BACKEND_ID, FIN_ARRAY_METRICS, finArrayArtifact, finArrayResponses, metricsFromState, THERMAL_STATE_IDS, type FinArrayArtifact } from "./finArray/evaluate";
import { createFinArraySpace } from "./finArray/space";

const METRIC_IDS = new Set(FIN_ARRAY_METRICS.map((m) => m.id));

function validate(p: EngineeringProblem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const g = p.geometry;
  if (g.kind !== "fin-array") return [{ path: "geometry.kind", message: `unsupported geometry "${g.kind}"` }];
  if (!(g.baseWidth_m > 0) || !(g.baseDepth_m > 0)) issues.push({ path: "geometry.baseWidth_m", message: "base footprint must be positive" });
  for (const [lo, hi, name] of [
    [g.finHeightMin_m, g.finHeightMax_m, "finHeight"],
    [g.finThicknessMin_m, g.finThicknessMax_m, "finThickness"],
    [g.finPitchMin_m, g.finPitchMax_m, "finPitch"],
    [g.baseThicknessMin_m, g.baseThicknessMax_m, "baseThickness"],
  ] as const) {
    if (!(lo > 0) || !(lo < hi)) issues.push({ path: `geometry.${name}Min_m`, message: `${name} bounds must satisfy 0 < min < max` });
  }
  if (!(g.gapMin_m >= 0)) issues.push({ path: "geometry.gapMin_m", message: "minimum gap must be non-negative" });
  const heat = p.loads.filter((l) => l.kind === "heat");
  if (heat.length !== 1 || p.loads.length !== 1) issues.push({ path: "loads", message: "exactly one heat load is supported" });
  else if (!(heat[0].kind === "heat" && heat[0].power_W > 0)) issues.push({ path: "loads[0].power_W", message: "power must be positive" });
  if (!(p.material.thermalConductivity_W_mK > 0)) issues.push({ path: "material.thermalConductivity_W_mK", message: "material needs a positive thermal conductivity" });
  const temp = p.constraints.find((c) => c.metric === "baseTemperature_C");
  if (temp && !(temp.limit > g.ambient_C)) issues.push({ path: "constraints.temperature", message: "temperature limit must exceed the ambient temperature" });
  if (p.objectives.length === 0) issues.push({ path: "objectives", message: "at least one objective is required" });
  p.objectives.forEach((o, i) => { if (!METRIC_IDS.has(o.metric)) issues.push({ path: `objectives[${i}].metric`, message: `unknown metric "${o.metric}"` }); });
  p.constraints.forEach((c, i) => { if (!METRIC_IDS.has(c.metric)) issues.push({ path: `constraints[${i}].metric`, message: `unknown metric "${c.metric}"` }); });
  return issues;
}

function compile(problem: EngineeringProblem): CompiledProblem<FinArrayArtifact> {
  const issues = validate(problem);
  if (issues.length > 0) throw new Error(`invalid problem: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  const space = createFinArraySpace(problem);
  const derivable = ["mass_kg", "baseTemperature_C", "thermalResistance_K_W", "finEfficiency", "heatTransferCoefficient_W_m2K", "gap_m", "finCount"];
  const responseModel: ResponseModel = {
    responseIds: ["thermalState"],
    derivableMetrics: derivable,
    derivableFrom(id) {
      return id === "thermalState" ? derivable : [];
    },
    derive(params, responses) {
      const d = space.buildDesign(params);
      return metricsFromState(problem, d, responses.thermalState ?? new Array(THERMAL_STATE_IDS.length).fill(NaN));
    },
    componentUtilizations(params, responses) {
      const d = space.buildDesign(params);
      const m = metricsFromState(problem, d, responses.thermalState ?? []);
      const limit = problem.constraints.find((c) => c.metric === "baseTemperature_C")?.limit;
      const g = problem.geometry.kind === "fin-array" ? problem.geometry : null;
      const util = limit !== undefined && g ? [(m.baseTemperature_C - g.ambient_C) / (limit - g.ambient_C)] : [];
      return { baseTemperature_C: util };
    },
  };
  return {
    problem,
    space,
    metrics: FIN_ARRAY_METRICS,
    responses: finArrayResponses(),
    responseModel,
    baseline: {
      label: "Conventional extruded heat sink",
      description: "1.5 mm fins at 8 mm pitch on a 3 mm base, fin height found by bisection to just satisfy the temperature limit.",
      parameters: space.baselineParameters(),
    },
    evaluate: (params) => evaluateFinArray(problem, space.buildDesign(params)),
    artifact: (params) => finArrayArtifact(problem, space.buildDesign(params)),
    tradeoffMetric: problem.objectives[0]?.metric === "mass_kg" ? "thermalResistance_K_W" : "mass_kg",
    backendId: FIN_ARRAY_BACKEND_ID,
  };
}

export const thermalDomain: EngineeringDomain<FinArrayArtifact> = {
  id: "thermal",
  label: "Thermal",
  metrics: FIN_ARRAY_METRICS,
  validate,
  compile,
};
