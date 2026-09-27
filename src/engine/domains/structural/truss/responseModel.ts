/**
 * Exact physics after prediction for the truss: every scalar metric the
 * problem uses can be derived from either response the evaluator exposes.
 *
 *   memberForces_N       -> mass, peak stress, stress and buckling utilisation
 *   nodeDisplacements_m  -> all of the above (forces follow kinematically,
 *                           N = (EA/L)[-c -s c s] u) plus max deflection and
 *                           compliance 1/2 F.u
 *
 * The force map is linear in the displacement field, so a predictive
 * standard deviation per displacement component propagates to each member
 * force exactly (independent components assumed): sigma_N = sqrt(sum (B sigma_u)^2).
 */
import type { EngineeringProblem } from "../../../core/problem";
import type { ResponseModel } from "../../domain";
import type { BridgeSpace } from "./bridgeSpace";
import { freeDofsOf, memberUtilizationsFromForces } from "./evaluate";
import { trussMass_kg } from "./metrics";
import type { TrussModel } from "./model";

const FORCE_METRICS = ["mass_kg", "maxStress_Pa", "stressUtilization", "bucklingUtilization"];
const DISPLACEMENT_METRICS = [...FORCE_METRICS, "maxDisplacement_m", "compliance_J"];

function lengthsOf(model: TrussModel): number[] {
  return model.members.map((m) => Math.hypot(model.nodes[m.j].x - model.nodes[m.i].x, model.nodes[m.j].y - model.nodes[m.i].y));
}

/** Rows of the force map restricted to the free DOFs: forces = B u_free. */
function forceMatrix(model: TrussModel, E: number, lengths: number[], free: number[]): number[][] {
  const col = new Map<number, number>();
  free.forEach((d, i) => col.set(d, i));
  return model.members.map((m, k) => {
    const L = lengths[k];
    const c = (model.nodes[m.j].x - model.nodes[m.i].x) / L;
    const s = (model.nodes[m.j].y - model.nodes[m.i].y) / L;
    const kk = (E * m.area_m2) / L;
    const row = new Array<number>(free.length).fill(0);
    const put = (dof: number, v: number) => {
      const j = col.get(dof);
      if (j !== undefined) row[j] += v;
    };
    put(2 * m.i, -kk * c);
    put(2 * m.i + 1, -kk * s);
    put(2 * m.j, kk * c);
    put(2 * m.j + 1, kk * s);
    return row;
  });
}

/** Load vector on the free DOFs (applied load plus lumped self-weight). */
function loadVector(model: TrussModel, free: number[]): number[] {
  const F = new Array<number>(2 * model.nodes.length).fill(0);
  for (const l of model.loads) {
    F[2 * l.node] += l.fx_N;
    F[2 * l.node + 1] += l.fy_N;
  }
  return free.map((d) => F[d]);
}

/** Max nodal displacement magnitude from a free-DOF field (fixed DOFs are zero). */
function maxNodalDisplacement(model: TrussModel, free: number[], u: number[], shift?: number[]): number {
  const full = new Array<number>(2 * model.nodes.length).fill(0);
  free.forEach((d, i) => (full[d] = Math.abs(u[i]) + (shift ? shift[i] : 0)));
  let max = 0;
  for (let n = 0; n < model.nodes.length; n++) max = Math.max(max, Math.hypot(full[2 * n], full[2 * n + 1]));
  return max;
}

export function createTrussResponseModel(problem: EngineeringProblem, space: BridgeSpace): ResponseModel {
  const E = problem.material.youngsModulus_Pa;
  const probeModel = space.buildModel(space.baselineParameters());
  const free = freeDofsOf(probeModel);

  const forcesFromDisplacements = (params: number[], u: number[]) => {
    const model = space.buildModel(params);
    const matrix = forceMatrix(model, E, lengthsOf(model), free);
    const forces = matrix.map((row) => row.reduce((s, b, j) => s + b * u[j], 0));
    return { forces, matrix };
  };

  const metricsFromForces = (model: TrussModel, forces: ArrayLike<number>) => {
    const u = memberUtilizationsFromForces(problem, model, forces, lengthsOf(model));
    return {
      mass_kg: trussMass_kg(model),
      maxStress_Pa: u.maxStress_Pa,
      stressUtilization: Math.max(0, ...u.stress),
      bucklingUtilization: Math.max(0, ...u.buckling),
    };
  };

  return {
    responseIds: ["memberForces_N", "nodeDisplacements_m"],
    derivableMetrics: DISPLACEMENT_METRICS,
    freeDofs: free,
    derivableFrom(id) {
      if (id === "memberForces_N") return FORCE_METRICS.slice();
      if (id === "nodeDisplacements_m") return DISPLACEMENT_METRICS.slice();
      return [];
    },
    derive(params, responses) {
      const model = space.buildModel(params);
      if (responses.nodeDisplacements_m) {
        const u = responses.nodeDisplacements_m;
        const { forces } = forcesFromDisplacements(params, u);
        const F = loadVector(model, free);
        return {
          ...metricsFromForces(model, forces),
          maxDisplacement_m: maxNodalDisplacement(model, free, u),
          compliance_J: 0.5 * F.reduce((s, f, i) => s + f * u[i], 0),
        };
      }
      if (responses.memberForces_N) return metricsFromForces(model, responses.memberForces_N);
      throw new Error("response model needs memberForces_N or nodeDisplacements_m");
    },
    componentUtilizations(params, responses) {
      const model = space.buildModel(params);
      const forces = responses.memberForces_N ?? (responses.nodeDisplacements_m ? forcesFromDisplacements(params, responses.nodeDisplacements_m).forces : null);
      if (!forces) throw new Error("response model needs memberForces_N or nodeDisplacements_m");
      const u = memberUtilizationsFromForces(problem, model, forces, lengthsOf(model));
      return { stressUtilization: u.stress, bucklingUtilization: u.buckling };
    },
    forcesFromDisplacements,
    conservativeFromDisplacements(params, mean, std, k) {
      const model = space.buildModel(params);
      const { forces, matrix } = forcesFromDisplacements(params, mean);
      const sigmaN = matrix.map((row) => Math.sqrt(row.reduce((s, b, j) => s + (b * std[j]) ** 2, 0)));
      const stressForces = forces.map((f, m) => Math.sign(f || 1) * (Math.abs(f) + k * sigmaN[m]));
      const bucklingForces = forces.map((f, m) => f - k * sigmaN[m]);
      const nominal = metricsFromForces(model, forces);
      const s = metricsFromForces(model, stressForces);
      const b = metricsFromForces(model, bucklingForces);
      const F = loadVector(model, free);
      return {
        mass_kg: nominal.mass_kg,
        maxStress_Pa: Math.max(nominal.maxStress_Pa, s.maxStress_Pa),
        stressUtilization: Math.max(nominal.stressUtilization, s.stressUtilization),
        bucklingUtilization: Math.max(nominal.bucklingUtilization, b.bucklingUtilization),
        maxDisplacement_m: maxNodalDisplacement(model, free, mean, std.map((v) => k * v)),
        compliance_J: 0.5 * F.reduce((sum, f, i) => sum + f * mean[i] + k * Math.abs(f) * std[i], 0),
      };
    },
  };
}
