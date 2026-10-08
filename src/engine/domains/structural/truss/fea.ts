/**
 * Linear static analysis of a 2D truss by the direct stiffness method.
 *
 * For each member of length L, area A, modulus E and direction cosines
 * (c, s), the element stiffness in global coordinates is
 *
 *     k = (E A / L) [  c²   cs  -c²  -cs ]
 *                   [  cs   s²  -cs  -s² ]
 *                   [ -c²  -cs   c²   cs ]
 *                   [ -cs  -s²   cs   s² ]
 *
 * These are assembled into the global stiffness matrix K. Constrained
 * degrees of freedom are removed, K_ff u_f = F_f is solved by Cholesky
 * factorisation, and member forces follow from N = (E A / L) [-c -s c s] u_e.
 * A failed factorisation means K_ff is singular: the structure (or part of
 * it) is a mechanism, which is reported rather than thrown so the optimiser
 * can treat it as an infeasible design.
 *
 * Since v1.3 the assembly and solve live in the dimension-generic
 * `feaCore.ts`; this adapter maps the planar model onto it and is verified
 * to reproduce the original planar solver bit for bit.
 */
import { solveCoreTruss } from "./feaCore";
import type { TrussModel } from "./model";

export interface TrussSolution {
  status: "ok";
  /** Global displacements, 2 per node: [u0x, u0y, u1x, u1y, ...]. */
  displacements_m: Float64Array;
  /** Axial force per member. Positive = tension, negative = compression. */
  memberForces_N: Float64Array;
  /** Axial stress per member (force / area). */
  memberStresses_Pa: Float64Array;
  memberLengths_m: Float64Array;
  /** Support reactions, 2 per node; zero at free DOFs. */
  reactions_N: Float64Array;
  /** Largest nodal displacement magnitude. */
  maxDisplacement_m: number;
  /** Strain energy = 0.5 F.u; lower is stiffer for a given load. */
  compliance_J: number;
}

export interface TrussFailure {
  status: "unstable" | "invalid";
  reason: string;
}

export type TrussResult = TrussSolution | TrussFailure;

export function solveTruss(model: TrussModel): TrussResult {
  const nNodes = model.nodes.length;
  const coords = new Float64Array(2 * nNodes);
  for (let n = 0; n < nNodes; n++) {
    coords[2 * n] = model.nodes[n].x;
    coords[2 * n + 1] = model.nodes[n].y;
  }
  const loads = new Float64Array(2 * nNodes);
  for (const load of model.loads) {
    loads[2 * load.node] += load.fx_N;
    loads[2 * load.node + 1] += load.fy_N;
  }
  const fixed = new Uint8Array(2 * nNodes);
  for (const sup of model.supports) {
    if (sup.fixX) fixed[2 * sup.node] = 1;
    if (sup.fixY) fixed[2 * sup.node + 1] = 1;
  }
  return solveCoreTruss({ dim: 2, coords, members: model.members, fixed, loads, youngsModulus_Pa: model.material.youngsModulus_Pa });
}
