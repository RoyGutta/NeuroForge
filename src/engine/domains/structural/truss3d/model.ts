/**
 * Data model for a spatial (3D) pin-jointed truss: three translational
 * degrees of freedom per node, axial-only members, linear elasticity and
 * small displacements. Units SI with unit suffixes.
 */
import type { Material } from "../truss/model";

export interface Truss3dNode {
  x: number;
  y: number;
  z: number;
}

export interface Truss3dMember {
  i: number;
  j: number;
  area_m2: number;
}

export interface Truss3dSupport {
  node: number;
  fixX: boolean;
  fixY: boolean;
  fixZ: boolean;
}

export interface NodalLoad3d {
  node: number;
  fx_N: number;
  fy_N: number;
  fz_N: number;
}

export interface Truss3dModel {
  nodes: Truss3dNode[];
  members: Truss3dMember[];
  supports: Truss3dSupport[];
  loads: NodalLoad3d[];
  material: Material;
}

export function memberLength3d_m(model: Truss3dModel, m: Truss3dMember): number {
  const a = model.nodes[m.i];
  const b = model.nodes[m.j];
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

/** Global DOF indices left free by the supports, ascending. */
export function freeDofs3d(model: Truss3dModel): number[] {
  const fixed = new Set<number>();
  for (const s of model.supports) {
    if (s.fixX) fixed.add(3 * s.node);
    if (s.fixY) fixed.add(3 * s.node + 1);
    if (s.fixZ) fixed.add(3 * s.node + 2);
  }
  const out: number[] = [];
  for (let d = 0; d < 3 * model.nodes.length; d++) if (!fixed.has(d)) out.push(d);
  return out;
}
