/**
 * Data model for a planar (2D) pin-jointed truss.
 *
 * Units are SI throughout: metres, newtons, pascals, kilograms. Field names
 * carry their unit as a suffix so a value can never be silently misread.
 *
 * Assumptions baked into this model (they are exposed to users by the
 * structural domain module, not hidden here):
 *  - members are straight, prismatic, pin-jointed and carry axial force only;
 *  - material is homogeneous, isotropic and linear-elastic;
 *  - displacements are small (linear kinematics, equilibrium on the
 *    undeformed geometry).
 */

export interface TrussNode {
  x: number;
  y: number;
}

export interface TrussMember {
  /** Index of the start node. */
  i: number;
  /** Index of the end node. */
  j: number;
  /** Cross-sectional area in square metres. */
  area_m2: number;
}

export interface TrussSupport {
  node: number;
  fixX: boolean;
  fixY: boolean;
}

export interface NodalLoad {
  node: number;
  fx_N: number;
  fy_N: number;
}

export interface Material {
  id: string;
  name: string;
  youngsModulus_Pa: number;
  density_kg_m3: number;
  yieldStrength_Pa: number;
}

export interface TrussModel {
  nodes: TrussNode[];
  members: TrussMember[];
  supports: TrussSupport[];
  loads: NodalLoad[];
  material: Material;
}

/** Length of a member from node coordinates. */
export function memberLength_m(model: TrussModel, m: TrussMember): number {
  const a = model.nodes[m.i];
  const b = model.nodes[m.j];
  return Math.hypot(b.x - a.x, b.y - a.y);
}
