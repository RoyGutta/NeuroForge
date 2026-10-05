/**
 * Robotics domain: a planar two-link manipulator sized for static payload
 * holding. Different mathematics from the truss (closed-form kinematics,
 * rigid-body statics, beam bending) behind the same `EngineeringDomain`.
 */
import type { EngineeringProblem, ValidationIssue } from "../../core/problem";
import type { CompiledProblem, EngineeringDomain, ResponseModel } from "../domain";
import { bendingStress_Pa } from "./manipulator/beam";
import { analyzeArm, armMasses, evaluateArm, MANIPULATOR_BACKEND_ID, MANIPULATOR_METRICS, manipulatorResponses, metricsFromResponses, type ManipulatorArtifact } from "./manipulator/evaluate";
import { createManipulatorSpace } from "./manipulator/space";

const METRIC_IDS = new Set(MANIPULATOR_METRICS.map((m) => m.id));

function validate(p: EngineeringProblem): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const g = p.geometry;
  if (g.kind !== "planar-manipulator") return [{ path: "geometry.kind", message: `unsupported geometry "${g.kind}"` }];
  if (!(g.reach_m > 0)) issues.push({ path: "geometry.reach_m", message: "reach must be positive" });
  if (!(g.linkMin_m > 0) || !(g.linkMin_m < g.linkMax_m)) issues.push({ path: "geometry.linkMin_m", message: "link bounds must satisfy 0 < min < max" });
  if (!(g.radiusMin_m > 0) || !(g.radiusMin_m < g.radiusMax_m)) issues.push({ path: "geometry.radiusMin_m", message: "radius bounds must satisfy 0 < min < max" });
  if (!(g.wallRatio >= 0 && g.wallRatio < 1)) issues.push({ path: "geometry.wallRatio", message: "wall ratio must be in [0, 1)" });
  if (g.taskPoints.length === 0) issues.push({ path: "geometry.taskPoints", message: "at least one task point is required" });
  if (p.loads.length !== 1 || p.loads[0].kind !== "point" || !(p.loads[0].magnitude_N > 0)) issues.push({ path: "loads", message: "exactly one positive payload load is supported" });
  if (!(p.safetyFactor >= 1)) issues.push({ path: "safetyFactor", message: "safety factor must be >= 1" });
  if (p.objectives.length === 0) issues.push({ path: "objectives", message: "at least one objective is required" });
  p.objectives.forEach((o, i) => { if (!METRIC_IDS.has(o.metric)) issues.push({ path: `objectives[${i}].metric`, message: `unknown metric "${o.metric}"` }); });
  p.constraints.forEach((c, i) => { if (!METRIC_IDS.has(c.metric)) issues.push({ path: `constraints[${i}].metric`, message: `unknown metric "${c.metric}"` }); });
  return issues;
}

function compile(problem: EngineeringProblem): CompiledProblem<ManipulatorArtifact> {
  const issues = validate(problem);
  if (issues.length > 0) throw new Error(`invalid problem: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  const space = createManipulatorSpace(problem);
  const K = space.geometry.taskPoints.length;
  const responseModel: ResponseModel = {
    responseIds: ["jointTorques_Nm", "tipDeflections_m"],
    derivableMetrics: ["peakTorque_Nm", "mass_kg", "stressUtilization", "unreachableFraction", "maxTipDeflection_m"],
    derivableFrom(id) {
      if (id === "jointTorques_Nm") return ["peakTorque_Nm", "mass_kg", "stressUtilization", "unreachableFraction"];
      if (id === "tipDeflections_m") return ["maxTipDeflection_m", "mass_kg", "unreachableFraction"];
      return [];
    },
    derive(params, responses) {
      const d = space.buildDesign(params);
      const torques = responses.jointTorques_Nm ?? new Array(2 * K).fill(0);
      const out = metricsFromResponses(problem, d, torques, responses.tipDeflections_m ?? null);
      if (!responses.jointTorques_Nm) { delete out.peakTorque_Nm; delete out.stressUtilization; }
      return out;
    },
    componentUtilizations(params, responses) {
      const d = space.buildDesign(params);
      const torques = responses.jointTorques_Nm ?? [];
      const { s1, s2 } = armMasses(problem, d);
      const sf = problem.safetyFactor;
      const sy = problem.material.yieldStrength_Pa;
      const stress: number[] = [];
      for (let i = 0; i + 1 < torques.length; i += 2) {
        stress.push((bendingStress_Pa(torques[i], s1) * sf) / sy);
        stress.push((bendingStress_Pa(torques[i + 1], s2) * sf) / sy);
      }
      return { stressUtilization: stress };
    },
  };
  return {
    problem,
    space,
    metrics: MANIPULATOR_METRICS,
    responses: manipulatorResponses(K),
    responseModel,
    baseline: {
      label: "Equal-link arm",
      description: "Two equal links long enough to reach the farthest task point with a 10 % margin, tube radii sized to the smallest common value that satisfies the stress and deflection constraints.",
      parameters: space.baselineParameters(),
    },
    evaluate: (params) => evaluateArm(problem, space.buildDesign(params)),
    artifact: (params) => analyzeArm(problem, space.buildDesign(params)),
    tradeoffMetric: problem.objectives[0]?.metric === "mass_kg" ? "peakTorque_Nm" : "mass_kg",
    backendId: MANIPULATOR_BACKEND_ID,
  };
}

export const roboticsDomain: EngineeringDomain<ManipulatorArtifact> = {
  id: "robotics",
  label: "Robotics",
  metrics: MANIPULATOR_METRICS,
  validate,
  compile,
};
