/**
 * Design space of the triangular space truss girder.
 *
 * Stations s = 0..n at x = s * span / n. At each station: bottom-left node
 * BL (x, -w/2, 0), bottom-right BR (x, +w/2, 0), top node T (x, 0, h_s).
 * Members, in a fixed order the optimiser and the response model rely on:
 *   per station s:  BL-BR, BL-T, BR-T                      (3 (n+1))
 *   per bay b:      BL-BL', BR-BR', T-T', bottom X-bracing BL-BR' and
 *                   BR-BL' (symmetric about the girder's centre plane),
 *                   face diagonals BL-T' and BR-T' for b < n/2, mirrored
 *                   (BL'-T, BR'-T) for b >= n/2                (7 n)
 * Variables: h_0..h_n (station heights, linear), then one area per member
 * (log-scaled for learning). Supports restrain seven DOFs: vertical at all
 * four bottom corners (externally once indeterminate, like a four-legged
 * table) plus x and y at BL_0 and x at BR_0, which remove the three in-plane
 * rigid-body modes while leaving the chords free to extend:
 *   BL_0: x y z;  BR_0: x z;  BL_n: z;  BR_n: z.
 * Load: the point load at the midspan top node T_{n/2}; self-weight lumped
 * half to each end node of every member.
 */
import { pointLoadMagnitude_N, type EngineeringProblem, type SpaceTrussGeometry } from "../../../core/problem";
import { createDesignSpace, type DesignSpace, type VariableSpec } from "../../../core/space";
import { GRAVITY_M_S2 } from "../truss/bridgeSpace";
import { memberUtilizationsFromForces } from "../truss/evaluate";
import { solveTruss3d } from "./fea3d";
import { memberLength3d_m, type Truss3dModel } from "./model";

export interface SpaceTrussSpace extends DesignSpace {
  geometry: SpaceTrussGeometry;
  memberCount: number;
  stationCount: number;
  buildModel(params: number[]): Truss3dModel;
  baselineParameters(): number[];
  /** Human-readable member names in model order. */
  memberLabels: string[];
}

export function spaceTrussMass_kg(model: Truss3dModel): number {
  let m = 0;
  for (const mem of model.members) m += model.material.density_kg_m3 * mem.area_m2 * memberLength3d_m(model, mem);
  return m;
}

export function createSpaceTrussSpace(problem: EngineeringProblem): SpaceTrussSpace {
  if (problem.geometry.kind !== "space-truss") throw new Error("space-truss space needs space-truss geometry");
  const g: SpaceTrussGeometry = problem.geometry;
  const n = g.bays;
  const stations = n + 1;
  const memberCount = 10 * n + 3;
  const variables: VariableSpec[] = [];
  for (let s = 0; s < stations; s++) variables.push({ id: `height_${s}`, label: `Station ${s} height`, group: "depth", lower: g.depthMin_m, upper: g.depthMax_m, unit: "m" });
  const labels: string[] = [];
  for (let s = 0; s < stations; s++) labels.push(`Bottom tie ${s}`, `Left post ${s}`, `Right post ${s}`);
  for (let b = 0; b < n; b++) labels.push(`Bottom-left chord ${b}`, `Bottom-right chord ${b}`, `Top chord ${b}`, `Bottom brace L-R ${b}`, `Bottom brace R-L ${b}`, `Left face diagonal ${b}`, `Right face diagonal ${b}`);
  labels.forEach((label, k) => variables.push({ id: `area_${k}`, label: `${label} area`, group: "area", lower: g.areaMin_m2, upper: g.areaMax_m2, unit: "m^2", scale: "log" }));
  const base = createDesignSpace(variables);
  const load = pointLoadMagnitude_N(problem) ?? 0;
  const BL = (s: number) => 3 * s;
  const BR = (s: number) => 3 * s + 1;
  const T = (s: number) => 3 * s + 2;

  function buildModel(params: number[]): Truss3dModel {
    if (params.length !== variables.length) throw new Error(`expected ${variables.length} parameters, got ${params.length}`);
    const nodes = [];
    for (let s = 0; s < stations; s++) {
      const x = (s * g.span_m) / n;
      nodes.push({ x, y: -g.width_m / 2, z: 0 }, { x, y: g.width_m / 2, z: 0 }, { x, y: 0, z: params[s] });
    }
    const members = [];
    let a = stations;
    for (let s = 0; s < stations; s++) {
      members.push({ i: BL(s), j: BR(s), area_m2: params[a++] });
      members.push({ i: BL(s), j: T(s), area_m2: params[a++] });
      members.push({ i: BR(s), j: T(s), area_m2: params[a++] });
    }
    for (let b = 0; b < n; b++) {
      members.push({ i: BL(b), j: BL(b + 1), area_m2: params[a++] });
      members.push({ i: BR(b), j: BR(b + 1), area_m2: params[a++] });
      members.push({ i: T(b), j: T(b + 1), area_m2: params[a++] });
      members.push({ i: BL(b), j: BR(b + 1), area_m2: params[a++] });
      members.push({ i: BR(b), j: BL(b + 1), area_m2: params[a++] });
      if (b < n / 2) {
        members.push({ i: BL(b), j: T(b + 1), area_m2: params[a++] });
        members.push({ i: BR(b), j: T(b + 1), area_m2: params[a++] });
      } else {
        members.push({ i: BL(b + 1), j: T(b), area_m2: params[a++] });
        members.push({ i: BR(b + 1), j: T(b), area_m2: params[a++] });
      }
    }
    const model: Truss3dModel = {
      nodes,
      members,
      supports: [
        { node: BL(0), fixX: true, fixY: true, fixZ: true },
        { node: BR(0), fixX: true, fixY: false, fixZ: true },
        { node: BL(n), fixX: false, fixY: false, fixZ: true },
        { node: BR(n), fixX: false, fixY: false, fixZ: true },
      ],
      loads: [{ node: T(n / 2), fx_N: 0, fy_N: 0, fz_N: -load }],
      material: problem.material,
    };
    if (problem.analysis.includeSelfWeight) {
      const fz = new Float64Array(nodes.length);
      for (const m of members) {
        const w = problem.material.density_kg_m3 * m.area_m2 * memberLength3d_m(model, m) * GRAVITY_M_S2;
        fz[m.i] -= w / 2;
        fz[m.j] -= w / 2;
      }
      for (let i = 0; i < nodes.length; i++) {
        if (fz[i] === 0) continue;
        const existing = model.loads.find((l) => l.node === i);
        if (existing) existing.fz_N += fz[i];
        else model.loads.push({ node: i, fx_N: 0, fy_N: 0, fz_N: fz[i] });
      }
    }
    return model;
  }

  function baselineParameters(): number[] {
    const depth = Math.min(g.depthMax_m, Math.max(g.depthMin_m, g.span_m / 8));
    const withArea = (A: number) => [...Array(stations).fill(depth), ...Array(memberCount).fill(A)];
    const feasible = (A: number) => {
      const model = buildModel(withArea(A));
      const sol = solveTruss3d(model);
      if (sol.status !== "ok") return false;
      const u = memberUtilizationsFromForces(problem, model, sol.memberForces_N, sol.memberLengths_m);
      const metrics: Record<string, number> = { mass_kg: spaceTrussMass_kg(model), maxStress_Pa: u.maxStress_Pa, stressUtilization: Math.max(0, ...u.stress), bucklingUtilization: Math.max(0, ...u.buckling), maxDisplacement_m: sol.maxDisplacement_m, compliance_J: sol.compliance_J };
      return problem.constraints.every((c) => (c.op === "<=" ? metrics[c.metric] <= c.limit : metrics[c.metric] >= c.limit));
    };
    let lo = g.areaMin_m2;
    let hi = g.areaMax_m2;
    if (!feasible(hi)) return withArea(hi);
    if (feasible(lo)) return withArea(lo);
    for (let it = 0; it < 60; it++) {
      const mid = 0.5 * (lo + hi);
      if (feasible(mid)) hi = mid;
      else lo = mid;
    }
    return withArea(hi);
  }

  return { ...base, geometry: g, memberCount, stationCount: stations, buildModel, baselineParameters, memberLabels: labels };
}
