/**
 * Turns a parameter vector into an `Evaluation` for a truss bridge problem.
 */
import { checkConstraints, FAILED_DESIGN_VIOLATION, type Evaluation } from "../../../core/design";
import type { EngineeringProblem, MetricDescriptor } from "../../../core/problem";
import type { BridgeSpace } from "./bridgeSpace";
import type { TrussSolution } from "./fea";
import { solveTruss } from "./fea";
import { eulerCriticalLoad_N, trussMass_kg } from "./metrics";
import type { TrussModel } from "./model";

export const TRUSS_BACKEND_ID = "truss-fea-2d";
export const TRUSS_FIDELITY = "linear-static-fea";

export const TRUSS_METRICS: MetricDescriptor[] = [
  { id: "mass_kg", label: "Mass", unit: "kg", description: "Total structural mass." },
  { id: "maxStress_Pa", label: "Peak axial stress", unit: "Pa", description: "Largest |N/A| over all members." },
  {
    id: "stressUtilization",
    label: "Stress utilisation",
    unit: "-",
    description: "Peak stress x safety factor / yield strength. Must stay <= 1.",
  },
  {
    id: "bucklingUtilization",
    label: "Buckling utilisation",
    unit: "-",
    description: "Peak (compression x safety factor / Euler critical load). Must stay <= 1.",
  },
  { id: "maxDisplacement_m", label: "Max displacement", unit: "m", description: "Largest nodal displacement." },
  { id: "compliance_J", label: "Compliance", unit: "J", description: "Strain energy 0.5 F.u; lower is stiffer." },
];

export function computeTrussMetrics(
  problem: EngineeringProblem,
  model: TrussModel,
  sol: TrussSolution
): Record<string, number> {
  const sf = problem.safetyFactor;
  const E = problem.material.youngsModulus_Pa;
  let maxStress = 0;
  let bucklingUtil = 0;
  for (let m = 0; m < model.members.length; m++) {
    const stress = Math.abs(sol.memberStresses_Pa[m]);
    if (stress > maxStress) maxStress = stress;
    const N = sol.memberForces_N[m];
    if (N < 0) {
      const pcr = eulerCriticalLoad_N(E, model.members[m].area_m2, sol.memberLengths_m[m]);
      const u = (-N * sf) / pcr;
      if (u > bucklingUtil) bucklingUtil = u;
    }
  }
  return {
    mass_kg: trussMass_kg(model),
    maxStress_Pa: maxStress,
    stressUtilization: (maxStress * sf) / problem.material.yieldStrength_Pa,
    bucklingUtilization: bucklingUtil,
    maxDisplacement_m: sol.maxDisplacement_m,
    compliance_J: sol.compliance_J,
  };
}

export function evaluateTrussDesign(
  problem: EngineeringProblem,
  space: BridgeSpace,
  params: number[]
): Evaluation {
  const model = space.buildModel(params);
  const sol = solveTruss(model);
  if (sol.status !== "ok") {
    const objectives: Record<string, number> = {};
    for (const o of problem.objectives) {
      objectives[o.id] = o.direction === "minimize" ? Infinity : -Infinity;
    }
    return {
      status: sol.status,
      metrics: {},
      objectives,
      constraints: checkConstraints(problem.constraints, {}),
      feasible: false,
      totalViolation: FAILED_DESIGN_VIOLATION,
      diagnostics: [sol.reason],
      fidelity: TRUSS_FIDELITY,
      backend: TRUSS_BACKEND_ID,
    };
  }
  const metrics = computeTrussMetrics(problem, model, sol);
  const constraints = checkConstraints(problem.constraints, metrics);
  const totalViolation = constraints.reduce((s, c) => s + c.violation, 0);
  const objectives: Record<string, number> = {};
  for (const o of problem.objectives) objectives[o.id] = metrics[o.metric];
  return {
    status: "ok",
    metrics,
    objectives,
    constraints,
    feasible: totalViolation === 0,
    totalViolation,
    diagnostics: [],
    fidelity: TRUSS_FIDELITY,
    backend: TRUSS_BACKEND_ID,
  };
}
