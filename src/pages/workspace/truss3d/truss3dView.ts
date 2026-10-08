/**
 * Pure mapping from a solved spatial truss to what the 3D viewport draws.
 * No three.js here, so every encoding is unit-testable:
 *  - node positions: model coordinates, plus displacement x deformScale in
 *    deformed mode (the scale is stated in the interface; it exaggerates);
 *  - member radius ~ sqrt(area) relative to the design-space maximum;
 *  - member colour: plain, by axial force sign and magnitude, or by the
 *    exact stress / Euler-buckling utilisation;
 *  - inspection values are read straight from the solution arrays.
 */
import { eulerCriticalLoad_N } from "../../../engine/domains/structural/truss/metrics";
import type { CoreSolution } from "../../../engine/domains/structural/truss/feaCore";
import type { Truss3dModel } from "../../../engine/domains/structural/truss3d/model";
import { mix, utilColor } from "../TrussSvg";

export type Truss3dMode = "structure" | "force" | "utilization" | "deformed";

export interface Truss3dViewOptions {
  mode: Truss3dMode;
  safetyFactor: number;
  areaMax_m2: number;
  /** Displacement multiplier applied in deformed mode (0 = undeformed). */
  deformScale: number;
}

export interface ViewPoint {
  x: number;
  y: number;
  z: number;
}

export interface ViewMember {
  from: ViewPoint;
  to: ViewPoint;
  radius: number;
  color: string;
}

export interface Truss3dView {
  nodes: ViewPoint[];
  members: ViewMember[];
  supports: { node: number; fixX: boolean; fixY: boolean; fixZ: boolean }[];
  loads: { node: number; fx_N: number; fy_N: number; fz_N: number; magnitude_N: number }[];
  bounds: { center: ViewPoint; size: number; min: ViewPoint; max: ViewPoint };
  deformScale: number;
}

export interface MemberInfo {
  index: number;
  length_m: number;
  area_m2: number;
  force_N: number;
  stress_Pa: number;
  criticalLoad_N: number;
  stressUtilization: number;
  bucklingUtilization: number;
  utilization: number;
}

export interface NodeInfo {
  index: number;
  x: number;
  y: number;
  z: number;
  ux_m: number;
  uy_m: number;
  uz_m: number;
  resultant_m: number;
}

export function modelBounds(model: Truss3dModel): Truss3dView["bounds"] {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const n of model.nodes) {
    min.x = Math.min(min.x, n.x); min.y = Math.min(min.y, n.y); min.z = Math.min(min.z, n.z);
    max.x = Math.max(max.x, n.x); max.y = Math.max(max.y, n.y); max.z = Math.max(max.z, n.z);
  }
  const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 1e-9);
  return { center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 }, size, min, max };
}

/** Multiplier that makes the largest displacement a stated fraction of the structure's size. */
export function deformationScale(model: Truss3dModel, result: CoreSolution, fraction = 0.06): number {
  const size = modelBounds(model).size;
  return result.maxDisplacement_m > 0 ? (fraction * size) / result.maxDisplacement_m : 0;
}

export function memberInfo(model: Truss3dModel, result: CoreSolution, k: number, safetyFactor: number): MemberInfo {
  const m = model.members[k];
  const E = model.material.youngsModulus_Pa;
  const N = result.memberForces_N[k];
  const sigma = result.memberStresses_Pa[k];
  const L = result.memberLengths_m[k];
  const pcr = eulerCriticalLoad_N(E, m.area_m2, L);
  const su = (Math.abs(sigma) * safetyFactor) / model.material.yieldStrength_Pa;
  const bu = N < 0 ? (-N * safetyFactor) / pcr : 0;
  return { index: k, length_m: L, area_m2: m.area_m2, force_N: N, stress_Pa: sigma, criticalLoad_N: pcr, stressUtilization: su, bucklingUtilization: bu, utilization: Math.max(su, bu) };
}

export function nodeInfo(model: Truss3dModel, result: CoreSolution, n: number): NodeInfo {
  const ux = result.displacements_m[3 * n];
  const uy = result.displacements_m[3 * n + 1];
  const uz = result.displacements_m[3 * n + 2];
  return { index: n, x: model.nodes[n].x, y: model.nodes[n].y, z: model.nodes[n].z, ux_m: ux, uy_m: uy, uz_m: uz, resultant_m: Math.hypot(ux, uy, uz) };
}

export function buildTruss3dView(model: Truss3dModel, result: CoreSolution, opts: Truss3dViewOptions): Truss3dView {
  const bounds = modelBounds(model);
  const scale = opts.mode === "deformed" ? opts.deformScale : 0;
  const nodes: ViewPoint[] = model.nodes.map((n, i) => ({
    x: n.x + result.displacements_m[3 * i] * scale,
    y: n.y + result.displacements_m[3 * i + 1] * scale,
    z: n.z + result.displacements_m[3 * i + 2] * scale,
  }));
  const maxN = Math.max(1e-9, ...Array.from(result.memberForces_N).map((v) => Math.abs(v)));
  const members: ViewMember[] = model.members.map((m, k) => {
    const N = result.memberForces_N[k];
    let color = "#79f2c0";
    if (opts.mode === "force") {
      const t = Math.min(1, Math.abs(N) / maxN);
      color = N >= 0 ? mix("#2b5d49", "#79f2c0", t) : mix("#2e3560", "#7c8cff", t);
    } else if (opts.mode === "utilization") {
      color = utilColor(memberInfo(model, result, k, opts.safetyFactor).utilization);
    } else if (opts.mode === "deformed") {
      color = "#c4d6ca";
    }
    const radius = bounds.size * (0.003 + 0.012 * Math.sqrt(m.area_m2 / opts.areaMax_m2));
    return { from: nodes[m.i], to: nodes[m.j], radius, color };
  });
  return {
    nodes,
    members,
    supports: model.supports.map((s) => ({ ...s })),
    loads: model.loads.filter((l) => Math.hypot(l.fx_N, l.fy_N, l.fz_N) > 0).map((l) => ({ ...l, magnitude_N: Math.hypot(l.fx_N, l.fy_N, l.fz_N) })),
    bounds,
    deformScale: scale,
  };
}
