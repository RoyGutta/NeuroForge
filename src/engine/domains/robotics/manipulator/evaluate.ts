/**
 * Static evaluation of a two-link arm over its task points: inverse
 * kinematics, gravity torques, tube bending stress and tip deflection.
 * Metrics: peak joint torque, link mass, stress utilisation, maximum tip
 * deflection, fraction of unreachable task points.
 */
import { checkConstraints, FAILED_DESIGN_VIOLATION, type Evaluation } from "../../../core/design";
import type { EngineeringProblem, MetricDescriptor, TaskPoint } from "../../../core/problem";
import type { ResponseDescriptor } from "../../domain";
import { bendingStress_Pa, cantileverTipDeflection_m, cantileverTipSlope_rad, tubeSection, type TubeSection } from "./beam";
import { forwardKinematics, inverseKinematics } from "./kinematics";
import { GRAVITY_M_S2, jointTorques_Nm } from "./statics";

export const MANIPULATOR_BACKEND_ID = "manipulator-statics-2d";
export const MANIPULATOR_FIDELITY = "static-kinematics-beam";

export const MANIPULATOR_METRICS: MetricDescriptor[] = [
  { id: "peakTorque_Nm", label: "Peak joint torque", unit: "N m", description: "Largest |joint torque| over all task points and both joints." },
  { id: "mass_kg", label: "Link mass", unit: "kg", description: "Mass of both tubular links." },
  { id: "stressUtilization", label: "Bending stress utilisation", unit: "-", description: "Peak root bending stress x safety factor / yield. Must stay <= 1." },
  { id: "maxTipDeflection_m", label: "Max tip deflection", unit: "m", description: "Largest static tip deflection over the task points." },
  { id: "unreachableFraction", label: "Unreachable task points", unit: "-", description: "Fraction of task points outside the arm's workspace." },
];

export interface ArmDesign {
  L1_m: number;
  L2_m: number;
  r1_m: number;
  r2_m: number;
}

export interface ArmPose {
  point: TaskPoint;
  reachable: boolean;
  theta1: number;
  theta2: number;
  tau1_Nm: number;
  tau2_Nm: number;
  tipDeflection_m: number;
  stress1_Pa: number;
  stress2_Pa: number;
}

export interface ManipulatorArtifact {
  design: ArmDesign;
  sections: { link1: TubeSection; link2: TubeSection };
  masses: { m1_kg: number; m2_kg: number; payload_kg: number };
  poses: ArmPose[];
  worstPoseIndex: number;
}

export function manipulatorResponses(taskPoints: number): ResponseDescriptor[] {
  return [
    { id: "jointTorques_Nm", label: "Joint torques per task point", unit: "N m", size: 2 * taskPoints },
    { id: "tipDeflections_m", label: "Tip deflection per task point", unit: "m", size: taskPoints },
  ];
}

function geometry(problem: EngineeringProblem) {
  const g = problem.geometry;
  if (g.kind !== "planar-manipulator") throw new Error("manipulator evaluator needs planar-manipulator geometry");
  return g;
}

export function armMasses(problem: EngineeringProblem, d: ArmDesign) {
  const g = geometry(problem);
  const s1 = tubeSection(d.r1_m, g.wallRatio);
  const s2 = tubeSection(d.r2_m, g.wallRatio);
  const rho = problem.material.density_kg_m3;
  return { s1, s2, m1: rho * s1.area_m2 * d.L1_m, m2: rho * s2.area_m2 * d.L2_m, payload: problem.loads[0].magnitude_N / GRAVITY_M_S2 };
}

/** Full per-pose analysis; the artifact for visualisation and the source of responses. */
export function analyzeArm(problem: EngineeringProblem, d: ArmDesign): ManipulatorArtifact {
  const g = geometry(problem);
  const { s1, s2, m1, m2, payload } = armMasses(problem, d);
  const E = problem.material.youngsModulus_Pa;
  const poses: ArmPose[] = g.taskPoints.map((point) => {
    const sols = inverseKinematics(d.L1_m, d.L2_m, point.x_m, point.y_m);
    if (sols.length === 0) return { point, reachable: false, theta1: NaN, theta2: NaN, tau1_Nm: NaN, tau2_Nm: NaN, tipDeflection_m: NaN, stress1_Pa: NaN, stress2_Pa: NaN };
    let best: ArmPose | null = null;
    for (const s of sols) {
      const t = jointTorques_Nm({ L1_m: d.L1_m, L2_m: d.L2_m, m1_kg: m1, m2_kg: m2, payload_kg: payload, theta1: s.theta1, theta2: s.theta2 });
      const c1 = Math.cos(s.theta1);
      const c2 = Math.cos(s.theta1 + s.theta2);
      // Link 2: payload point load at its tip, own weight distributed.
      const d2 = cantileverTipDeflection_m({ P_N: payload * GRAVITY_M_S2 * c2, w_N_m: (m2 * GRAVITY_M_S2 * c2) / d.L2_m, L_m: d.L2_m, EI: E * s2.secondMoment_m4 });
      // Link 1: link 2 and payload as a point load at its tip, own weight distributed; its tip slope carries into link 2.
      const load1 = { P_N: (m2 + payload) * GRAVITY_M_S2 * c1, w_N_m: (m1 * GRAVITY_M_S2 * c1) / d.L1_m, L_m: d.L1_m, EI: E * s1.secondMoment_m4 };
      const d1 = cantileverTipDeflection_m(load1);
      const slope1 = cantileverTipSlope_rad(load1);
      const tip = Math.abs(d1) + Math.abs(slope1) * d.L2_m + Math.abs(d2);
      const pose: ArmPose = { point, reachable: true, theta1: s.theta1, theta2: s.theta2, tau1_Nm: t.tau1, tau2_Nm: t.tau2, tipDeflection_m: tip, stress1_Pa: bendingStress_Pa(t.tau1, s1), stress2_Pa: bendingStress_Pa(t.tau2, s2) };
      const peak = Math.max(Math.abs(pose.tau1_Nm), Math.abs(pose.tau2_Nm));
      if (!best || peak < Math.max(Math.abs(best.tau1_Nm), Math.abs(best.tau2_Nm))) best = pose;
    }
    return best!;
  });
  let worst = -1;
  let worstPeak = -1;
  poses.forEach((p, i) => {
    if (!p.reachable) return;
    const peak = Math.max(Math.abs(p.tau1_Nm), Math.abs(p.tau2_Nm));
    if (peak > worstPeak) {
      worstPeak = peak;
      worst = i;
    }
  });
  return { design: d, sections: { link1: s1, link2: s2 }, masses: { m1_kg: m1, m2_kg: m2, payload_kg: payload }, poses, worstPoseIndex: worst };
}

/** Metrics from per-pose torques and deflections plus exact geometry (mass, reachability). */
export function metricsFromResponses(problem: EngineeringProblem, d: ArmDesign, torques: ArrayLike<number>, deflections: ArrayLike<number> | null): Record<string, number> {
  const g = geometry(problem);
  const { s1, s2, m1, m2 } = armMasses(problem, d);
  const sf = problem.safetyFactor;
  const sy = problem.material.yieldStrength_Pa;
  let peak = 0;
  let stressUtil = 0;
  let unreachable = 0;
  let maxDefl = 0;
  g.taskPoints.forEach((pt, i) => {
    if (inverseKinematics(d.L1_m, d.L2_m, pt.x_m, pt.y_m).length === 0) {
      unreachable++;
      return;
    }
    const t1 = torques[2 * i];
    const t2 = torques[2 * i + 1];
    peak = Math.max(peak, Math.abs(t1), Math.abs(t2));
    stressUtil = Math.max(stressUtil, (bendingStress_Pa(t1, s1) * sf) / sy, (bendingStress_Pa(t2, s2) * sf) / sy);
    if (deflections) maxDefl = Math.max(maxDefl, Math.abs(deflections[i]));
  });
  const out: Record<string, number> = { peakTorque_Nm: peak, mass_kg: m1 + m2, stressUtilization: stressUtil, unreachableFraction: unreachable / g.taskPoints.length };
  if (deflections) out.maxTipDeflection_m = maxDefl;
  return out;
}

export function evaluateArm(problem: EngineeringProblem, d: ArmDesign): Evaluation {
  if (![d.L1_m, d.L2_m, d.r1_m, d.r2_m].every((v) => Number.isFinite(v) && v > 0)) {
    const objectives: Record<string, number> = {};
    for (const o of problem.objectives) objectives[o.id] = o.direction === "minimize" ? Infinity : -Infinity;
    return { status: "invalid", metrics: {}, objectives, constraints: checkConstraints(problem.constraints, {}), feasible: false, totalViolation: FAILED_DESIGN_VIOLATION, diagnostics: ["non-positive dimension"], fidelity: MANIPULATOR_FIDELITY, backend: MANIPULATOR_BACKEND_ID };
  }
  const art = analyzeArm(problem, d);
  const torques = art.poses.flatMap((p) => (p.reachable ? [p.tau1_Nm, p.tau2_Nm] : [0, 0]));
  const deflections = art.poses.map((p) => (p.reachable ? p.tipDeflection_m : 0));
  const metrics = metricsFromResponses(problem, d, torques, deflections);
  const constraints = checkConstraints(problem.constraints, metrics);
  const totalViolation = constraints.reduce((s, c) => s + c.violation, 0);
  const objectives: Record<string, number> = {};
  for (const o of problem.objectives) objectives[o.id] = metrics[o.metric];
  return { status: "ok", metrics, objectives, constraints, feasible: totalViolation === 0, totalViolation, diagnostics: [], fidelity: MANIPULATOR_FIDELITY, backend: MANIPULATOR_BACKEND_ID, responses: { jointTorques_Nm: torques, tipDeflections_m: deflections } };
}

/** Tip position of a pose, for drawing. */
export function poseTip(d: ArmDesign, pose: ArmPose): { x: number; y: number } {
  return forwardKinematics(d.L1_m, d.L2_m, pose.theta1, pose.theta2);
}
