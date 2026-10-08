/**
 * Linear static analysis of a spatial truss: an adapter over the
 * dimension-generic direct-stiffness core (`../truss/feaCore.ts`) with three
 * translational DOFs per node. Displacements are ordered [u0x, u0y, u0z,
 * u1x, ...]; reactions likewise.
 */
import { solveCoreTruss, type CoreResult } from "../truss/feaCore";
import type { Truss3dModel } from "./model";

export type Truss3dResult = CoreResult;

export function solveTruss3d(model: Truss3dModel): Truss3dResult {
  const nNodes = model.nodes.length;
  const coords = new Float64Array(3 * nNodes);
  for (let n = 0; n < nNodes; n++) {
    coords[3 * n] = model.nodes[n].x;
    coords[3 * n + 1] = model.nodes[n].y;
    coords[3 * n + 2] = model.nodes[n].z;
  }
  const loads = new Float64Array(3 * nNodes);
  for (const l of model.loads) {
    loads[3 * l.node] += l.fx_N;
    loads[3 * l.node + 1] += l.fy_N;
    loads[3 * l.node + 2] += l.fz_N;
  }
  const fixed = new Uint8Array(3 * nNodes);
  for (const s of model.supports) {
    if (s.fixX) fixed[3 * s.node] = 1;
    if (s.fixY) fixed[3 * s.node + 1] = 1;
    if (s.fixZ) fixed[3 * s.node + 2] = 1;
  }
  return solveCoreTruss({ dim: 3, coords, members: model.members, fixed, loads, youngsModulus_Pa: model.material.youngsModulus_Pa });
}
