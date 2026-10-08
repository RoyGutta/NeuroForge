/**
 * Spatial structural domain: a triangular space truss girder analysed by
 * three-dimensional linear-static FEA. Same metrics and response ids as the
 * planar truss, so every layer above the domain treats them alike.
 */
import type { EngineeringProblem, ValidationIssue } from "../../../core/problem";
import type { CompiledProblem, EngineeringDomain } from "../../domain";
import { evaluateSpaceTruss, TRUSS3D_BACKEND_ID, TRUSS3D_METRICS, truss3dResponses } from "./evaluate";
import { freeDofs3d, type Truss3dModel } from "./model";
import { createSpaceTrussResponseModel } from "./responseModel";
import { createSpaceTrussSpace } from "./spaceTrussSpace";

const METRIC_IDS = new Set(TRUSS3D_METRICS.map((m) => m.id));

function validate(p: EngineeringProblem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const g = p.geometry;
  if (g.kind !== "space-truss") return [{ path: "geometry.kind", message: `unsupported geometry "${g.kind}"` }];
  if (!(g.span_m > 0)) issues.push({ path: "geometry.span_m", message: "span must be positive" });
  if (!Number.isInteger(g.bays) || g.bays < 2 || g.bays % 2 !== 0) issues.push({ path: "geometry.bays", message: "bays must be an even integer >= 2" });
  if (!(g.width_m > 0)) issues.push({ path: "geometry.width_m", message: "width must be positive" });
  if (!(g.depthMin_m > 0) || !(g.depthMin_m < g.depthMax_m)) issues.push({ path: "geometry.depthMin_m", message: "depth bounds must satisfy 0 < min < max" });
  if (!(g.areaMin_m2 > 0) || !(g.areaMin_m2 < g.areaMax_m2)) issues.push({ path: "geometry.areaMin_m2", message: "area bounds must satisfy 0 < min < max" });
  if (!(p.safetyFactor >= 1)) issues.push({ path: "safetyFactor", message: "safety factor must be >= 1" });
  if (p.loads.length !== 1 || p.loads[0].kind !== "point" || !(p.loads[0].magnitude_N > 0)) issues.push({ path: "loads", message: "exactly one positive point load is supported" });
  const m = p.material;
  if (!(m.youngsModulus_Pa > 0) || !(m.density_kg_m3 > 0) || !(m.yieldStrength_Pa > 0)) issues.push({ path: "material", message: "material properties must be positive" });
  if (p.objectives.length === 0) issues.push({ path: "objectives", message: "at least one objective is required" });
  p.objectives.forEach((o, i) => { if (!METRIC_IDS.has(o.metric)) issues.push({ path: `objectives[${i}].metric`, message: `unknown metric "${o.metric}"` }); });
  p.constraints.forEach((c, i) => { if (!METRIC_IDS.has(c.metric)) issues.push({ path: `constraints[${i}].metric`, message: `unknown metric "${c.metric}"` }); });
  return issues;
}

function compile(problem: EngineeringProblem): CompiledProblem<Truss3dModel> {
  const issues = validate(problem);
  if (issues.length > 0) throw new Error(`invalid problem: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  const space = createSpaceTrussSpace(problem);
  const baseline = space.baselineParameters();
  return {
    problem,
    space,
    metrics: TRUSS3D_METRICS,
    responses: truss3dResponses(space.memberCount, freeDofs3d(space.buildModel(baseline)).length),
    responseModel: createSpaceTrussResponseModel(problem, space),
    baseline: {
      label: "Conventional space truss",
      description: `Uniform-section triangular girder at a depth of span/8 (${(space.geometry.span_m / 8).toFixed(3)} m) with every member sized to the smallest common area that satisfies the same stress, buckling and deflection constraints.`,
      parameters: baseline,
    },
    evaluate: (params) => evaluateSpaceTruss(problem, space, params),
    artifact: (params) => space.buildModel(params),
    tradeoffMetric: problem.objectives[0]?.metric === "mass_kg" ? "compliance_J" : "mass_kg",
    backendId: TRUSS3D_BACKEND_ID,
  };
}

export const structural3dDomain: EngineeringDomain<Truss3dModel> = {
  id: "structural3d",
  label: "Structural 3D",
  metrics: TRUSS3D_METRICS,
  validate,
  compile,
};
