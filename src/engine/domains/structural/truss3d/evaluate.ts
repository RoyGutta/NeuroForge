/**
 * Turns a parameter vector into an `Evaluation` for the space truss girder.
 * Metrics share their ids with the planar truss so the learning layer, the
 * lab and the interface treat both structural domains alike.
 */
import { checkConstraints, FAILED_DESIGN_VIOLATION, type Evaluation } from "../../../core/design";
import type { EngineeringProblem } from "../../../core/problem";
import type { ResponseDescriptor } from "../../domain";
import { memberUtilizationsFromForces, TRUSS_METRICS } from "../truss/evaluate";
import { solveTruss3d } from "./fea3d";
import { freeDofs3d, type Truss3dModel } from "./model";
import { spaceTrussMass_kg, type SpaceTrussSpace } from "./spaceTrussSpace";

export const TRUSS3D_BACKEND_ID = "truss-fea-3d";
export const TRUSS3D_FIDELITY = "linear-static-fea";
export const TRUSS3D_METRICS = TRUSS_METRICS;

export function truss3dResponses(memberCount: number, freeDofCount: number): ResponseDescriptor[] {
  return [
    { id: "memberForces_N", label: "Member axial force", unit: "N", size: memberCount },
    { id: "nodeDisplacements_m", label: "Free-node displacement", unit: "m", size: freeDofCount },
  ];
}

export function computeTruss3dMetrics(problem: EngineeringProblem, model: Truss3dModel, forces: ArrayLike<number>, lengths: ArrayLike<number>, maxDisplacement_m: number, compliance_J: number): Record<string, number> {
  const u = memberUtilizationsFromForces(problem, model, forces, lengths);
  return {
    mass_kg: spaceTrussMass_kg(model),
    maxStress_Pa: u.maxStress_Pa,
    stressUtilization: Math.max(0, ...u.stress),
    bucklingUtilization: Math.max(0, ...u.buckling),
    maxDisplacement_m,
    compliance_J,
  };
}

export function evaluateSpaceTruss(problem: EngineeringProblem, space: SpaceTrussSpace, params: number[]): Evaluation {
  const model = space.buildModel(params);
  const sol = solveTruss3d(model);
  if (sol.status !== "ok") {
    const objectives: Record<string, number> = {};
    for (const o of problem.objectives) objectives[o.id] = o.direction === "minimize" ? Infinity : -Infinity;
    return { status: sol.status, metrics: {}, objectives, constraints: checkConstraints(problem.constraints, {}), feasible: false, totalViolation: FAILED_DESIGN_VIOLATION, diagnostics: [sol.reason], fidelity: TRUSS3D_FIDELITY, backend: TRUSS3D_BACKEND_ID };
  }
  const metrics = computeTruss3dMetrics(problem, model, sol.memberForces_N, sol.memberLengths_m, sol.maxDisplacement_m, sol.compliance_J);
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
    fidelity: TRUSS3D_FIDELITY,
    backend: TRUSS3D_BACKEND_ID,
    responses: { memberForces_N: Array.from(sol.memberForces_N), nodeDisplacements_m: freeDofs3d(model).map((d) => sol.displacements_m[d]) },
  };
}
