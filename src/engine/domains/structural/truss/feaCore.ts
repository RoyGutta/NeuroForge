/**
 * Dimension-generic linear static analysis of a pin-jointed truss by the
 * direct stiffness method. The planar (2D) and spatial (3D) solvers are thin
 * adapters over this core.
 *
 * For a member of length L, area A, modulus E and unit direction vector d
 * (dim components), the element stiffness in global coordinates is
 *
 *     k = (E A / L) [  d dᵀ   -d dᵀ ]
 *                   [ -d dᵀ    d dᵀ ]
 *
 * which for dim = 2 is the familiar [c², cs; cs, s²] block form. Members are
 * assembled into K (dim x nodes square); constrained DOFs are removed;
 * K_ff u_f = F_f is solved by Cholesky factorisation; member forces follow
 * from N = (E A / L) dᵀ (u_j - u_i); reactions are R = K u - F at the fixed
 * DOFs; compliance is 1/2 Fᵀu. A failed factorisation means a mechanism and
 * is reported as `unstable` rather than thrown.
 *
 * The 2D adapter is verified to reproduce the pre-refactor solver bit for bit
 * (tests/engine/domains/truss3d/fea3d.test.ts), so the assembly and
 * summation order here must not be reordered casually.
 */
import { choleskySolve, NotPositiveDefiniteError } from "../../../linalg/dense";

export interface CoreMember {
  i: number;
  j: number;
  area_m2: number;
}

export interface CoreTruss {
  /** Spatial dimension: 2 or 3. */
  dim: number;
  /** Node coordinates, `dim` per node. */
  coords: ArrayLike<number>;
  members: CoreMember[];
  /** Fixed DOF flags, `dim` per node. */
  fixed: Uint8Array;
  /** Nodal load vector, `dim` per node. */
  loads: Float64Array;
  youngsModulus_Pa: number;
}

export interface CoreSolution {
  status: "ok";
  displacements_m: Float64Array;
  memberForces_N: Float64Array;
  memberStresses_Pa: Float64Array;
  memberLengths_m: Float64Array;
  reactions_N: Float64Array;
  maxDisplacement_m: number;
  compliance_J: number;
}

export interface CoreFailure {
  status: "unstable" | "invalid";
  reason: string;
}

export type CoreResult = CoreSolution | CoreFailure;

export function solveCoreTruss(t: CoreTruss): CoreResult {
  const dim = t.dim;
  const nNodes = Math.floor(t.coords.length / dim);
  const nDof = dim * nNodes;
  const nMembers = t.members.length;
  const E = t.youngsModulus_Pa;

  // Geometry and validation.
  const lengths = new Float64Array(nMembers);
  const dirs = new Float64Array(nMembers * dim);
  for (let m = 0; m < nMembers; m++) {
    const mem = t.members[m];
    if (mem.i < 0 || mem.j < 0 || mem.i >= nNodes || mem.j >= nNodes || mem.i === mem.j) {
      return { status: "invalid", reason: `member ${m} references invalid nodes` };
    }
    if (!(mem.area_m2 > 0)) return { status: "invalid", reason: `member ${m} has non-positive area` };
    const delta = new Array<number>(dim);
    for (let a = 0; a < dim; a++) {
      delta[a] = t.coords[dim * mem.j + a] - t.coords[dim * mem.i + a];
      dirs[m * dim + a] = delta[a];
    }
    // Math.hypot, not sqrt of a sum of squares: the planar solver used hypot and the two differ in the last bit.
    const L = Math.hypot(...delta);
    if (!(L > 1e-12)) return { status: "invalid", reason: `member ${m} has zero length` };
    lengths[m] = L;
    for (let a = 0; a < dim; a++) dirs[m * dim + a] /= L;
  }

  // Assemble global stiffness: ke[r][q] = k * d[r mod dim] * d[q mod dim] * (same end ? +1 : -1).
  const K = new Float64Array(nDof * nDof);
  const n2 = 2 * dim;
  const dofs = new Array<number>(n2);
  for (let m = 0; m < nMembers; m++) {
    const mem = t.members[m];
    const k = (E * mem.area_m2) / lengths[m];
    for (let a = 0; a < dim; a++) {
      dofs[a] = dim * mem.i + a;
      dofs[dim + a] = dim * mem.j + a;
    }
    for (let r = 0; r < n2; r++) {
      const dr = dirs[m * dim + (r % dim)];
      const sr = r < dim ? 1 : -1;
      for (let q = 0; q < n2; q++) {
        const dq = dirs[m * dim + (q % dim)];
        const sign = (q < dim ? 1 : -1) * sr;
        K[dofs[r] * nDof + dofs[q]] += k * (sign * dr * dq);
      }
    }
  }

  const F = t.loads;
  const fixed = t.fixed;
  const free: number[] = [];
  for (let d = 0; d < nDof; d++) if (!fixed[d]) free.push(d);
  const nFree = free.length;

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
      return { status: "unstable", reason: `structure is a mechanism (singular stiffness at free DOF ${free[err.pivotIndex]})` };
    }
    throw err;
  }

  const u = new Float64Array(nDof);
  for (let a = 0; a < nFree; a++) u[free[a]] = uf[a];

  const forces = new Float64Array(nMembers);
  const stresses = new Float64Array(nMembers);
  for (let m = 0; m < nMembers; m++) {
    const mem = t.members[m];
    let elong = 0;
    for (let a = 0; a < dim; a++) elong += -dirs[m * dim + a] * u[dim * mem.i + a];
    for (let a = 0; a < dim; a++) elong += dirs[m * dim + a] * u[dim * mem.j + a];
    const N = ((E * mem.area_m2) / lengths[m]) * elong;
    forces[m] = N;
    stresses[m] = N / mem.area_m2;
  }

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
  const comp = new Array<number>(dim);
  for (let n = 0; n < nNodes; n++) {
    for (let a = 0; a < dim; a++) comp[a] = u[dim * n + a];
    const mag = Math.hypot(...comp);
    if (mag > maxDisp) maxDisp = mag;
  }
  for (let d = 0; d < nDof; d++) compliance += F[d] * u[d];
  compliance *= 0.5;

  return { status: "ok", displacements_m: u, memberForces_N: forces, memberStresses_Pa: stresses, memberLengths_m: lengths, reactions_N: reactions, maxDisplacement_m: maxDisp, compliance_J: compliance };
}
