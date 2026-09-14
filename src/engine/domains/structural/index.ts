/**
 * Structural engineering domain. Currently one problem family: the planar
 * truss bridge analysed by linear-static FEA.
 */
import type { EngineeringProblem, ValidationIssue } from "../../core/problem";
import type { CompiledProblem, EngineeringDomain } from "../domain";
import { createBridgeSpace } from "./truss/bridgeSpace";
import { evaluateTrussDesign, TRUSS_BACKEND_ID, TRUSS_METRICS } from "./truss/evaluate";
import type { TrussModel } from "./truss/model";

const METRIC_IDS = new Set(TRUSS_METRICS.map((m) => m.id));

function validate(p: EngineeringProblem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const g = p.geometry;
  if (g.kind !== "truss-bridge") {
    issues.push({ path: "geometry.kind", message: `unsupported geometry "${g.kind}"` });
    return issues;
  }
  if (!(g.span_m > 0)) issues.push({ path: "geometry.span_m", message: "span must be positive" });
  if (!Number.isInteger(g.panels) || g.panels < 2 || g.panels % 2 !== 0) {
    issues.push({ path: "geometry.panels", message: "panels must be an even integer >= 2" });
  }
  if (!(g.depthMin_m > 0) || !(g.depthMin_m < g.depthMax_m)) {
    issues.push({ path: "geometry.depthMin_m", message: "depth bounds must satisfy 0 < min < max" });
  }
  if (!(g.areaMin_m2 > 0) || !(g.areaMin_m2 < g.areaMax_m2)) {
    issues.push({ path: "geometry.areaMin_m2", message: "area bounds must satisfy 0 < min < max" });
  }
  if (!(p.safetyFactor >= 1)) issues.push({ path: "safetyFactor", message: "safety factor must be >= 1" });
  p.loads.forEach((l, i) => {
    if (!(l.magnitude_N > 0)) {
      issues.push({ path: `loads[${i}].magnitude_N`, message: "load must be positive" });
    }
  });
  if (p.loads.length !== 1) issues.push({ path: "loads", message: "exactly one point load is supported" });
  const m = p.material;
  if (!(m.youngsModulus_Pa > 0) || !(m.density_kg_m3 > 0) || !(m.yieldStrength_Pa > 0)) {
    issues.push({ path: "material", message: "material properties must be positive" });
  }
  if (p.objectives.length === 0) issues.push({ path: "objectives", message: "at least one objective is required" });
  p.objectives.forEach((o, i) => {
    if (!METRIC_IDS.has(o.metric)) {
      issues.push({ path: `objectives[${i}].metric`, message: `unknown metric "${o.metric}"` });
    }
  });
  p.constraints.forEach((c, i) => {
    if (!METRIC_IDS.has(c.metric)) {
      issues.push({ path: `constraints[${i}].metric`, message: `unknown metric "${c.metric}"` });
    }
    if (!Number.isFinite(c.limit)) issues.push({ path: `constraints[${i}].limit`, message: "limit must be finite" });
  });
  return issues;
}

function compile(problem: EngineeringProblem): CompiledProblem<TrussModel> {
  const issues = validate(problem);
  if (issues.length > 0) {
    throw new Error(`invalid problem: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  }
  const space = createBridgeSpace(problem);
  const g = problem.geometry as { span_m: number };
  return {
    problem,
    space,
    metrics: TRUSS_METRICS,
    baseline: {
      label: "Conventional Warren truss",
      description:
        `Uniform-section Warren truss at a depth of span/8 (${(g.span_m / 8).toFixed(3)} m), ` +
        "with every member sized to the smallest common area that satisfies the same stress, buckling and deflection constraints.",
      parameters: space.baselineParameters(),
    },
    evaluate: (params) => evaluateTrussDesign(problem, space, params),
    artifact: (params) => space.buildModel(params),
    backendId: TRUSS_BACKEND_ID,
  };
}

export const structuralDomain: EngineeringDomain<TrussModel> = {
  id: "structural",
  label: "Structural",
  metrics: TRUSS_METRICS,
  validate,
  compile,
};
