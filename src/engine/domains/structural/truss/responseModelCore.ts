/**
 * Dimension-generic "exact physics after prediction" for pin-jointed
 * trusses. Every scalar metric derives from either response:
 *
 *   memberForces_N       -> mass, peak stress, stress and buckling utilisation
 *   nodeDisplacements_m  -> all of the above (forces follow kinematically,
 *                           N = (EA/L) dᵀ(u_j - u_i)) plus max deflection and
 *                           compliance 1/2 F.u
 *
 * The force map is linear in the displacement field, so a predictive
 * standard deviation per displacement component propagates to each member
 * force exactly: sigma_N = sqrt(sum (B sigma_u)^2). The planar adapter is
 * verified against the pre-refactor planar response model bit for bit.
 */
import type { EngineeringProblem } from "../../../core/problem";
import type { ResponseModel } from "../../domain";
import { memberUtilizationsFromForces } from "./evaluate";

/** What the core needs from a built model, in any dimension. */
export interface CoreView {
  dim: number;
  nodeCount: number;
  /** Node coordinate `a` of node `n`. */
  coord(n: number, a: number): number;
  members: { i: number; j: number; area_m2: number }[];
  /** Nodal load vector, dim per node (applied plus lumped self-weight). */
  loads: number[];
  mass_kg: number;
}

export interface CoreResponseModelOptions {
  problem: EngineeringProblem;
  dim: number;
  /** Free DOF indices, fixed for the design space (supports do not move). */
  free: number[];
  view(params: number[]): CoreView;
}

const FORCE_METRICS = ["mass_kg", "maxStress_Pa", "stressUtilization", "bucklingUtilization"];
const DISPLACEMENT_METRICS = [...FORCE_METRICS, "maxDisplacement_m", "compliance_J"];

function lengthsOf(v: CoreView): number[] {
  const comp = new Array<number>(v.dim);
  return v.members.map((m) => {
    for (let a = 0; a < v.dim; a++) comp[a] = v.coord(m.j, a) - v.coord(m.i, a);
    return Math.hypot(...comp);
  });
}

/** Rows of the force map restricted to the free DOFs: forces = B u_free. */
function forceMatrix(v: CoreView, E: number, lengths: number[], free: number[]): number[][] {
  const col = new Map<number, number>();
  free.forEach((d, i) => col.set(d, i));
  return v.members.map((m, k) => {
    const L = lengths[k];
    const kk = (E * m.area_m2) / L;
    const row = new Array<number>(free.length).fill(0);
    const put = (dof: number, val: number) => {
      const j = col.get(dof);
      if (j !== undefined) row[j] += val;
    };
    const dirs: number[] = [];
    for (let a = 0; a < v.dim; a++) dirs.push((v.coord(m.j, a) - v.coord(m.i, a)) / L);
    for (let a = 0; a < v.dim; a++) put(v.dim * m.i + a, -kk * dirs[a]);
    for (let a = 0; a < v.dim; a++) put(v.dim * m.j + a, kk * dirs[a]);
    return row;
  });
}

function maxNodalDisplacement(v: CoreView, free: number[], u: ArrayLike<number>, shift?: number[]): number {
  const full = new Array<number>(v.dim * v.nodeCount).fill(0);
  free.forEach((d, i) => (full[d] = Math.abs(u[i]) + (shift ? shift[i] : 0)));
  let max = 0;
  const comp = new Array<number>(v.dim);
  for (let n = 0; n < v.nodeCount; n++) {
    for (let a = 0; a < v.dim; a++) comp[a] = full[v.dim * n + a];
    max = Math.max(max, Math.hypot(...comp));
  }
  return max;
}

export function createCoreTrussResponseModel(opts: CoreResponseModelOptions): ResponseModel {
  const { problem, free } = opts;
  const E = problem.material.youngsModulus_Pa;

  const forcesFromDisplacements = (params: number[], u: number[]) => {
    const v = opts.view(params);
    const matrix = forceMatrix(v, E, lengthsOf(v), free);
    const forces = matrix.map((row) => row.reduce((s, b, j) => s + b * u[j], 0));
    return { forces, matrix };
  };

  const metricsFromForces = (v: CoreView, forces: ArrayLike<number>) => {
    const u = memberUtilizationsFromForces(problem, v, forces, lengthsOf(v));
    return { mass_kg: v.mass_kg, maxStress_Pa: u.maxStress_Pa, stressUtilization: Math.max(0, ...u.stress), bucklingUtilization: Math.max(0, ...u.buckling) };
  };
  const loadVector = (v: CoreView) => free.map((d) => v.loads[d]);

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
      const v = opts.view(params);
      if (responses.nodeDisplacements_m) {
        const u = responses.nodeDisplacements_m;
        const { forces } = forcesFromDisplacements(params, u);
        const F = loadVector(v);
        return { ...metricsFromForces(v, forces), maxDisplacement_m: maxNodalDisplacement(v, free, u), compliance_J: 0.5 * F.reduce((s, f, i) => s + f * u[i], 0) };
      }
      if (responses.memberForces_N) return metricsFromForces(v, responses.memberForces_N);
      throw new Error("response model needs memberForces_N or nodeDisplacements_m");
    },
    componentUtilizations(params, responses) {
      const v = opts.view(params);
      const forces = responses.memberForces_N ?? (responses.nodeDisplacements_m ? forcesFromDisplacements(params, responses.nodeDisplacements_m).forces : null);
      if (!forces) throw new Error("response model needs memberForces_N or nodeDisplacements_m");
      const u = memberUtilizationsFromForces(problem, v, forces, lengthsOf(v));
      return { stressUtilization: u.stress, bucklingUtilization: u.buckling };
    },
    forcesFromDisplacements,
    conservativeFromDisplacements(params, mean, std, k) {
      const v = opts.view(params);
      const { forces, matrix } = forcesFromDisplacements(params, mean);
      const sigmaN = matrix.map((row) => Math.sqrt(row.reduce((s, b, j) => s + (b * std[j]) ** 2, 0)));
      const stressForces = forces.map((f, m) => Math.sign(f || 1) * (Math.abs(f) + k * sigmaN[m]));
      const bucklingForces = forces.map((f, m) => f - k * sigmaN[m]);
      const nominal = metricsFromForces(v, forces);
      const s = metricsFromForces(v, stressForces);
      const b = metricsFromForces(v, bucklingForces);
      const F = loadVector(v);
      return {
        mass_kg: nominal.mass_kg,
        maxStress_Pa: Math.max(nominal.maxStress_Pa, s.maxStress_Pa),
        stressUtilization: Math.max(nominal.stressUtilization, s.stressUtilization),
        bucklingUtilization: Math.max(nominal.bucklingUtilization, b.bucklingUtilization),
        maxDisplacement_m: maxNodalDisplacement(v, free, mean, std.map((x) => k * x)),
        compliance_J: 0.5 * F.reduce((sum, f, i) => sum + f * mean[i] + k * Math.abs(f) * std[i], 0),
      };
    },
  };
}
