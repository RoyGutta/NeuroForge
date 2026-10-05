/**
 * Design space of the plate-fin heat sink: fin height, fin thickness, fin
 * pitch (thickness and pitch log-scaled for learning) and base thickness.
 */
import type { EngineeringProblem, FinArrayGeometry } from "../../../core/problem";
import { createDesignSpace, type DesignSpace, type VariableSpec } from "../../../core/space";
import { evaluateFinArray, type FinArrayDesign } from "./evaluate";

export interface FinArraySpace extends DesignSpace {
  geometry: FinArrayGeometry;
  buildDesign(params: number[]): FinArrayDesign;
  baselineParameters(): number[];
}

export function createFinArraySpace(problem: EngineeringProblem): FinArraySpace {
  const g = problem.geometry;
  if (g.kind !== "fin-array") throw new Error("fin-array space needs fin-array geometry");
  const variables: VariableSpec[] = [
    { id: "finHeight", label: "Fin height", group: "height", lower: g.finHeightMin_m, upper: g.finHeightMax_m, unit: "m" },
    { id: "finThickness", label: "Fin thickness", group: "thickness", lower: g.finThicknessMin_m, upper: g.finThicknessMax_m, unit: "m", scale: "log" },
    { id: "finPitch", label: "Fin pitch", group: "pitch", lower: g.finPitchMin_m, upper: g.finPitchMax_m, unit: "m", scale: "log" },
    { id: "baseThickness", label: "Base thickness", group: "base", lower: g.baseThicknessMin_m, upper: g.baseThicknessMax_m, unit: "m" },
  ];
  const base = createDesignSpace(variables);
  const buildDesign = (params: number[]): FinArrayDesign => {
    if (params.length !== 4) throw new Error(`expected 4 parameters, got ${params.length}`);
    return { finHeight_m: params[0], finThickness_m: params[1], finPitch_m: params[2], baseThickness_m: params[3] };
  };
  const baselineParameters = (): number[] => {
    // Conventional extrusion: 1.5 mm fins at 8 mm pitch on a 3 mm base; fin height bisected to just meet the temperature limit.
    const t = Math.min(g.finThicknessMax_m, Math.max(g.finThicknessMin_m, 0.0015));
    const p = Math.min(g.finPitchMax_m, Math.max(g.finPitchMin_m, 0.008));
    const tb = Math.min(g.baseThicknessMax_m, Math.max(g.baseThicknessMin_m, 0.003));
    const feasible = (H: number) => {
      const ev = evaluateFinArray(problem, { finHeight_m: H, finThickness_m: t, finPitch_m: p, baseThickness_m: tb });
      return ev.feasible;
    };
    let lo = g.finHeightMin_m;
    let hi = g.finHeightMax_m;
    if (!feasible(hi)) return [hi, t, p, tb];
    if (feasible(lo)) return [lo, t, p, tb];
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      if (feasible(mid)) hi = mid;
      else lo = mid;
    }
    return [hi, t, p, tb];
  };
  return { ...base, geometry: g, buildDesign, baselineParameters };
}
