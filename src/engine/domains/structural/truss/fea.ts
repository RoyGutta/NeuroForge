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
 */
import { choleskySolve, NotPositiveDefiniteError } from "../../../linalg/dense";
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
  const nDof = 2 * nNodes;
  const nMembers = model.members.length;
  const E = model.material.youngsModulus_Pa;

  // Geometry and validation.
  const lengths = new Float64Array(nMembers);
  const cosines = new Float64Array(nMembers);
  const sines = new Float64Array(nMembers);
  for (let m = 0; m < nMembers; m++) {
    const mem = model.members[m];
    if (
      mem.i < 0 || mem.j < 0 || mem.i >= nNodes || mem.j >= nNodes || mem.i === mem.j
    ) {
      return { status: "invalid", reason: `member ${m} references invalid nodes` };
    }
    if (!(mem.area_m2 > 0)) {
      return { status: "invalid", reason: `member ${m} has non-positive area` };
    }
    const a = model.nodes[mem.i];
    const b = model.nodes[mem.j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    if (!(L > 1e-12)) {
      return { status: "invalid", reason: `member ${m} has zero length` };
    }
    lengths[m] = L;
    cosines[m] = dx / L;
    sines[m] = dy / L;
  }

  // Assemble global stiffness.
  const K = new Float64Array(nDof * nDof);
  for (let m = 0; m < nMembers; m++) {
    const mem = model.members[m];
    const k = (E * mem.area_m2) / lengths[m];
    const c = cosines[m];
    const s = sines[m];
    const dofs = [2 * mem.i, 2 * mem.i + 1, 2 * mem.j, 2 * mem.j + 1];
    const ke = [
      [c * c, c * s, -c * c, -c * s],
      [c * s, s * s, -c * s, -s * s],
      [-c * c, -c * s, c * c, c * s],
      [-c * s, -s * s, c * s, s * s],
    ];
    for (let r = 0; r < 4; r++)
      for (let q = 0; q < 4; q++) K[dofs[r] * nDof + dofs[q]] += k * ke[r][q];
  }

  // Load vector and constraint map.
  const F = new Float64Array(nDof);
  for (const load of model.loads) {
    F[2 * load.node] += load.fx_N;
    F[2 * load.node + 1] += load.fy_N;
  }
  const fixed = new Uint8Array(nDof);
  for (const sup of model.supports) {
    if (sup.fixX) fixed[2 * sup.node] = 1;
    if (sup.fixY) fixed[2 * sup.node + 1] = 1;
  }
  const free: number[] = [];
  for (let d = 0; d < nDof; d++) if (!fixed[d]) free.push(d);
  const nFree = free.length;

  // Reduced system.
  const Kff = new Float64Array(nFree * nFree);
  const Ff = new Float64Array(nFree);
  for (let a = 0; a < nFree; a++) {
    Ff[a] = F[free[a]];
    const row = free[a] * nDof;
    for (let b = 0; b < nFree; b++) Kff[a * nFree + b] = K[row + free[b]];
  }

  let uf: Float64Array;
  try {
    uf = nFree > 0 ? choleskySolve(Kff, Ff, nFree) : new Float64Array(0);
  } catch (err) {
    if (err instanceof NotPositiveDefiniteError) {
      return {
        status: "unstable",
        reason: `structure is a mechanism (singular stiffness at free DOF ${free[err.pivotIndex]})`,
      };
    }
    throw err;
  }

  const u = new Float64Array(nDof);
  for (let a = 0; a < nFree; a++) u[free[a]] = uf[a];

  // Member forces and stresses.
  const forces = new Float64Array(nMembers);
  const stresses = new Float64Array(nMembers);
  for (let m = 0; m < nMembers; m++) {
    const mem = model.members[m];
    const c = cosines[m];
    const s = sines[m];
    const elong =
      -c * u[2 * mem.i] - s * u[2 * mem.i + 1] + c * u[2 * mem.j] + s * u[2 * mem.j + 1];
    const N = ((E * mem.area_m2) / lengths[m]) * elong;
    forces[m] = N;
    stresses[m] = N / mem.area_m2;
  }

  // Reactions R = K u - F at constrained DOFs.
  const reactions = new Float64Array(nDof);
  for (let d = 0; d < nDof; d++) {
    if (!fixed[d]) continue;
    let s = 0;
    const row = d * nDof;
    for (let q = 0; q < nDof; q++) s += K[row + q] * u[q];
    reactions[d] = s - F[d];
  }

  let maxDisp = 0;
  let compliance = 0;
  for (let n = 0; n < nNodes; n++) {
    const mag = Math.hypot(u[2 * n], u[2 * n + 1]);
    if (mag > maxDisp) maxDisp = mag;
  }
  for (let d = 0; d < nDof; d++) compliance += F[d] * u[d];
  compliance *= 0.5;

  return {
    status: "ok",
    displacements_m: u,
    memberForces_N: forces,
    memberStresses_Pa: stresses,
    memberLengths_m: lengths,
    reactions_N: reactions,
    maxDisplacement_m: maxDisp,
    compliance_J: compliance,
  };
}
