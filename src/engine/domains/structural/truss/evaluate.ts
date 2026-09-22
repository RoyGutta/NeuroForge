/**
 * Turns a parameter vector into an `Evaluation` for a truss bridge problem.
 */
import { checkConstraints, FAILED_DESIGN_VIOLATION, type Evaluation } from "../../../core/design";
import type { EngineeringProblem, MetricDescriptor } from "../../../core/problem";
import type { ResponseDescriptor, ResponseModel } from "../../domain";
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

export function trussResponses(memberCount: number): ResponseDescriptor[] {
  return [{ id: "memberForces_N", label: "Member axial force", unit: "N", size: memberCount }];
}

/**
 * Exact stress and Euler-buckling utilisations per member from a force
 * vector. Shared by the evaluator and by the response model so a predicted
 * force vector goes through precisely the same equations as a solved one.
 */
export function memberUtilizationsFromForces(
  problem: EngineeringProblem,
  model: TrussModel,
  forces: ArrayLike<number>,
  lengths: ArrayLike<number>
): { stress: number[]; buckling: number[]; maxStress_Pa: number } {
  const sf = problem.safetyFactor;
  const E = problem.material.youngsModulus_Pa;
  const sy = problem.material.yieldStrength_Pa;
  const stress: number[] = [];
  const buckling: number[] = [];
  let maxStress = 0;
  for (let m = 0; m < model.members.length; m++) {
    const A = model.members[m].area_m2;
    const N = forces[m];
    const sigma = Math.abs(N) / A;
    if (sigma > maxStress) maxStress = sigma;
    stress.push((sigma * sf) / sy);
    buckling.push(N < 0 ? (-N * sf) / eulerCriticalLoad_N(E, A, lengths[m]) : 0);
  }
  return { stress, buckling, maxStress_Pa: maxStress };
}

export function createTrussResponseModel(problem: EngineeringProblem, space: BridgeSpace): ResponseModel {
  const lengthsOf = (model: TrussModel) => model.members.map((mem) => Math.hypot(model.nodes[mem.j].x - model.nodes[mem.i].x, model.nodes[mem.j].y - model.nodes[mem.i].y));
  return {
    responseIds: ["memberForces_N"],
    derivableMetrics: ["mass_kg", "maxStress_Pa", "stressUtilization", "bucklingUtilization"],
    derive(params, responses) {
      const forces = responses.memberForces_N;
      if (!forces) throw new Error("response model needs memberForces_N");
      const model = space.buildModel(params);
      const u = memberUtilizationsFromForces(problem, model, forces, lengthsOf(model));
      return {
        mass_kg: trussMass_kg(model),
        maxStress_Pa: u.maxStress_Pa,
        stressUtilization: Math.max(0, ...u.stress),
        bucklingUtilization: Math.max(0, ...u.buckling),
      };
    },
    componentUtilizations(params, responses) {
      const forces = responses.memberForces_N;
      if (!forces) throw new Error("response model needs memberForces_N");
      const model = space.buildModel(params);
      const u = memberUtilizationsFromForces(problem, model, forces, lengthsOf(model));
      return { stressUtilization: u.stress, bucklingUtilization: u.buckling };
    },
  };
}

export function computeTrussMetrics(
  problem: EngineeringProblem,
  model: TrussModel,
  sol: TrussSolution
): Record<string, number> {
  const u = memberUtilizationsFromForces(problem, model, sol.memberForces_N, sol.memberLengths_m);
  const maxStress = u.maxStress_Pa;
  const bucklingUtil = Math.max(0, ...u.buckling);
  return {
    mass_kg: trussMass_kg(model),
    maxStress_Pa: maxStress,
    stressUtilization: Math.max(0, ...u.stress),
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
    responses: { memberForces_N: Array.from(sol.memberForces_N) },
  };
}
