/**
 * Design space of the planar manipulator: two link lengths and two tube
 * outer radii (log-scaled: stiffness goes like r^4).
 */
import type { EngineeringProblem, PlanarManipulatorGeometry } from "../../../core/problem";
import { createDesignSpace, type DesignSpace, type VariableSpec } from "../../../core/space";
import { evaluateArm, type ArmDesign } from "./evaluate";

export interface ManipulatorSpace extends DesignSpace {
  geometry: PlanarManipulatorGeometry;
  buildDesign(params: number[]): ArmDesign;
  baselineParameters(): number[];
}

export function createManipulatorSpace(problem: EngineeringProblem): ManipulatorSpace {
  const g = problem.geometry;
  if (g.kind !== "planar-manipulator") throw new Error("manipulator space needs planar-manipulator geometry");
  const variables: VariableSpec[] = [
    { id: "L1", label: "Link 1 length", group: "length", lower: g.linkMin_m, upper: g.linkMax_m, unit: "m" },
    { id: "L2", label: "Link 2 length", group: "length", lower: g.linkMin_m, upper: g.linkMax_m, unit: "m" },
    { id: "r1", label: "Link 1 tube radius", group: "radius", lower: g.radiusMin_m, upper: g.radiusMax_m, unit: "m", scale: "log" },
    { id: "r2", label: "Link 2 tube radius", group: "radius", lower: g.radiusMin_m, upper: g.radiusMax_m, unit: "m", scale: "log" },
  ];
  const base = createDesignSpace(variables);
  const buildDesign = (params: number[]): ArmDesign => {
    if (params.length !== 4) throw new Error(`expected 4 parameters, got ${params.length}`);
    return { L1_m: params[0], L2_m: params[1], r1_m: params[2], r2_m: params[3] };
  };
  const baselineParameters = (): number[] => {
    // Equal links long enough to reach the farthest point with 10 % margin.
    const farthest = Math.max(...g.taskPoints.map((p) => Math.hypot(p.x_m, p.y_m)));
    const L = Math.min(g.linkMax_m, Math.max(g.linkMin_m, 0.55 * farthest));
    const feasible = (r: number) => {
      const ev = evaluateArm(problem, { L1_m: L, L2_m: L, r1_m: r, r2_m: r });
      return problem.constraints.every((c) => (c.op === "<=" ? ev.metrics[c.metric] <= c.limit : ev.metrics[c.metric] >= c.limit));
    };
    let lo = g.radiusMin_m;
    let hi = g.radiusMax_m;
    if (!feasible(hi)) return [L, L, hi, hi];
    if (feasible(lo)) return [L, L, lo, lo];
    for (let i = 0; i < 60; i++) {
      const mid = Math.sqrt(lo * hi);
      if (feasible(mid)) hi = mid;
      else lo = mid;
    }
    return [L, L, hi, hi];
  };
  return { ...base, geometry: g, buildDesign, baselineParameters };
}
