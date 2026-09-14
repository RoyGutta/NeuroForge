/**
 * Parameterised "ground structure" for a planar truss bridge.
 *
 * Topology is fixed (a Warren-type layout with n panels); the optimiser
 * moves the top-chord node heights and sizes every member independently.
 * Members that the search drives to the minimum area are, in effect,
 * removed, which is the classical ground-structure approach to truss
 * topology optimisation (Dorn, Gomory and Greenberg, 1964).
 *
 * Layout for n panels (bottom nodes b0..bn at y = 0, top nodes t0..t(n-1)):
 *
 *        t0 ---- t1 ---- t2 ---- t3
 *       /  \    /  \    /  \    /  \
 *     b0 --- b1 --- b2 --- b3 --- b4
 *     pin                          roller
 */
import type { EngineeringProblem, TrussBridgeGeometry } from "../../../core/problem";
import { createDesignSpace, type DesignSpace, type VariableSpec } from "../../../core/space";
import { memberLength_m, type TrussModel } from "./model";
import { solveTruss } from "./fea";
import { computeTrussMetrics } from "./evaluate";

export const GRAVITY_M_S2 = 9.80665;

export interface BridgeSpace extends DesignSpace {
  geometry: TrussBridgeGeometry;
  buildModel(params: number[]): TrussModel;
  /** Uniform-section Warren truss at span/8 depth, sized to just satisfy the constraints. */
  baselineParameters(): number[];
  memberCount: number;
  panelCount: number;
}

export function createBridgeSpace(problem: EngineeringProblem): BridgeSpace {
  const g = problem.geometry;
  if (g.kind !== "truss-bridge") throw new Error("bridge space needs truss-bridge geometry");
  const n = g.panels;
  const memberCount = 4 * n - 1;

  const variables: VariableSpec[] = [];
  for (let k = 0; k < n; k++) {
    variables.push({
      id: `depth_${k}`,
      label: `Top node ${k + 1} height`,
      group: "depth",
      lower: g.depthMin_m,
      upper: g.depthMax_m,
      unit: "m",
    });
  }
  const memberLabels = memberNames(n);
  for (let m = 0; m < memberCount; m++) {
    variables.push({
      id: `area_${m}`,
      label: `${memberLabels[m]} area`,
      group: "area",
      lower: g.areaMin_m2,
      upper: g.areaMax_m2,
      unit: "m^2",
    });
  }
  const base = createDesignSpace(variables);

  const load = problem.loads[0];
  const midNode = n / 2;

  function buildModel(params: number[]): TrussModel {
    if (params.length !== variables.length) {
      throw new Error(`expected ${variables.length} parameters, got ${params.length}`);
    }
    const nodes = [];
    for (let i = 0; i <= n; i++) nodes.push({ x: (i * g.span_m) / n, y: 0 });
    for (let k = 0; k < n; k++) nodes.push({ x: ((k + 0.5) * g.span_m) / n, y: params[k] });
    const top = (k: number) => n + 1 + k;

    const members = [];
    let a = n;
    for (let i = 0; i < n; i++) members.push({ i, j: i + 1, area_m2: params[a++] });
    for (let k = 0; k < n - 1; k++) members.push({ i: top(k), j: top(k + 1), area_m2: params[a++] });
    for (let k = 0; k < n; k++) {
      members.push({ i: k, j: top(k), area_m2: params[a++] });
      members.push({ i: top(k), j: k + 1, area_m2: params[a++] });
    }

    const model: TrussModel = {
      nodes,
      members,
      supports: [
        { node: 0, fixX: true, fixY: true },
        { node: n, fixX: false, fixY: true },
      ],
      loads: [{ node: midNode, fx_N: 0, fy_N: -load.magnitude_N }],
      material: problem.material,
    };

    if (problem.analysis.includeSelfWeight) {
      const fy = new Float64Array(nodes.length);
      for (const m of members) {
        const w = problem.material.density_kg_m3 * m.area_m2 * memberLength_m(model, m) * GRAVITY_M_S2;
        fy[m.i] -= w / 2;
        fy[m.j] -= w / 2;
      }
      for (let i = 0; i < nodes.length; i++) {
        if (fy[i] === 0) continue;
        const existing = model.loads.find((l) => l.node === i);
        if (existing) existing.fy_N += fy[i];
        else model.loads.push({ node: i, fx_N: 0, fy_N: fy[i] });
      }
    }
    return model;
  }

  function baselineParameters(): number[] {
    const depth = Math.min(g.depthMax_m, Math.max(g.depthMin_m, g.span_m / 8));
    const withArea = (A: number) => [
      ...Array(n).fill(depth),
      ...Array(memberCount).fill(A),
    ];
    const feasible = (A: number) => {
      const model = buildModel(withArea(A));
      const sol = solveTruss(model);
      if (sol.status !== "ok") return false;
      const metrics = computeTrussMetrics(problem, model, sol);
      return problem.constraints.every((c) => {
        const v = metrics[c.metric];
        return c.op === "<=" ? v <= c.limit : v >= c.limit;
      });
    };
    // Utilisations decrease monotonically with uniform area, so bisect.
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

  return {
    ...base,
    geometry: g,
    buildModel,
    baselineParameters,
    memberCount,
    panelCount: n,
  };
}

function memberNames(n: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < n; i++) names.push(`Bottom chord ${i + 1}`);
  for (let k = 0; k < n - 1; k++) names.push(`Top chord ${k + 1}`);
  for (let k = 0; k < n; k++) {
    names.push(`Diagonal ${2 * k + 1}`);
    names.push(`Diagonal ${2 * k + 2}`);
  }
  return names;
}
