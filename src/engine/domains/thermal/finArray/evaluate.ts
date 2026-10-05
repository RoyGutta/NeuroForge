/**
 * Evaluation of a plate-fin heat sink: fin theory and the natural-convection
 * correlation give base temperature, thermal resistance, fin efficiency, mass.
 */
import { checkConstraints, FAILED_DESIGN_VIOLATION, type Evaluation } from "../../../core/design";
import type { EngineeringProblem, FinArrayGeometry, MetricDescriptor } from "../../../core/problem";
import type { ResponseDescriptor } from "../../domain";
import { solveFinArray, type FinArrayResult } from "./fin";

export const FIN_ARRAY_BACKEND_ID = "fin-array-natural-convection";
export const FIN_ARRAY_FIDELITY = "fin-theory-closed-form";

export const FIN_ARRAY_METRICS: MetricDescriptor[] = [
  { id: "mass_kg", label: "Mass", unit: "kg", description: "Base plate plus fins." },
  { id: "baseTemperature_C", label: "Base temperature", unit: "C", description: "Steady base-plate temperature at the stated power and ambient." },
  { id: "thermalResistance_K_W", label: "Thermal resistance", unit: "K/W", description: "Base-to-ambient resistance: base conduction plus fin-array convection." },
  { id: "finEfficiency", label: "Fin efficiency", unit: "-", description: "tanh(mL)/(mL) with the corrected length." },
  { id: "heatTransferCoefficient_W_m2K", label: "Convection coefficient", unit: "W/m2K", description: "From the Bar-Cohen and Rohsenow correlation at the solved temperature rise." },
  { id: "gap_m", label: "Fin gap", unit: "m", description: "Clear spacing between fins (pitch minus thickness)." },
  { id: "finCount", label: "Fin count", unit: "-", description: "Number of fins across the base width." },
];

/** Response: the thermal state as a fixed-size vector so surrogates can learn it. */
export const THERMAL_STATE_IDS = ["baseTemperature_C", "tipTemperature_C", "heatTransferCoefficient_W_m2K", "finEfficiency", "thermalResistance_K_W", "finHeat_W", "baseHeat_W"] as const;

export function finArrayResponses(): ResponseDescriptor[] {
  return [{ id: "thermalState", label: "Thermal state (base and tip temperature, h, efficiency, resistance, fin and base heat)", unit: "mixed", size: THERMAL_STATE_IDS.length }];
}

export interface FinArrayDesign {
  finHeight_m: number;
  finThickness_m: number;
  finPitch_m: number;
  baseThickness_m: number;
}

export interface FinArrayArtifact {
  design: FinArrayDesign;
  geometry: FinArrayGeometry;
  finCount: number;
  gap_m: number;
  ambient_C: number;
  baseTemperature_C: number;
  tipTemperature_C: number;
  heatTransferCoefficient_W_m2K: number;
  finEfficiency: number;
  /** Temperature along a fin from base to tip: theta(x)/theta_b = cosh(m(L - x)) / cosh(mL). */
  finProfile: { x_m: number; temperature_C: number }[];
  result: FinArrayResult;
}

function geometryOf(problem: EngineeringProblem): FinArrayGeometry {
  const g = problem.geometry;
  if (g.kind !== "fin-array") throw new Error("fin-array evaluator needs fin-array geometry");
  return g;
}

function heatLoad(problem: EngineeringProblem): number {
  const l = problem.loads.find((x) => x.kind === "heat");
  return l && l.kind === "heat" ? l.power_W : NaN;
}

export function solveDesign(problem: EngineeringProblem, d: FinArrayDesign): FinArrayResult {
  const g = geometryOf(problem);
  return solveFinArray({
    power_W: heatLoad(problem),
    ambient_C: g.ambient_C,
    baseWidth_m: g.baseWidth_m,
    baseDepth_m: g.baseDepth_m,
    baseThickness_m: d.baseThickness_m,
    finHeight_m: d.finHeight_m,
    finThickness_m: d.finThickness_m,
    finPitch_m: d.finPitch_m,
    k_W_mK: problem.material.thermalConductivity_W_mK,
    density_kg_m3: problem.material.density_kg_m3,
  });
}

export function metricsFromState(problem: EngineeringProblem, d: FinArrayDesign, state: ArrayLike<number>): Record<string, number> {
  const g = geometryOf(problem);
  const n = Math.floor(g.baseWidth_m / d.finPitch_m);
  const mass = problem.material.density_kg_m3 * (g.baseWidth_m * g.baseDepth_m * d.baseThickness_m + n * d.finHeight_m * d.finThickness_m * g.baseDepth_m);
  const at = (id: (typeof THERMAL_STATE_IDS)[number]) => state[THERMAL_STATE_IDS.indexOf(id)];
  return {
    mass_kg: mass,
    baseTemperature_C: at("baseTemperature_C"),
    thermalResistance_K_W: at("thermalResistance_K_W"),
    finEfficiency: at("finEfficiency"),
    heatTransferCoefficient_W_m2K: at("heatTransferCoefficient_W_m2K"),
    gap_m: d.finPitch_m - d.finThickness_m,
    finCount: n,
  };
}

export function evaluateFinArray(problem: EngineeringProblem, d: FinArrayDesign): Evaluation {
  const r = solveDesign(problem, d);
  if (r.status !== "ok" || !r.converged) {
    const objectives: Record<string, number> = {};
    for (const o of problem.objectives) objectives[o.id] = o.direction === "minimize" ? Infinity : -Infinity;
    const metrics: Record<string, number> = { gap_m: d.finPitch_m - d.finThickness_m, finCount: r.finCount };
    return { status: "invalid", metrics, objectives, constraints: checkConstraints(problem.constraints, metrics), feasible: false, totalViolation: FAILED_DESIGN_VIOLATION, diagnostics: r.diagnostics.length ? r.diagnostics : ["fixed point did not converge"], fidelity: FIN_ARRAY_FIDELITY, backend: FIN_ARRAY_BACKEND_ID };
  }
  const state = [r.baseTemperature_C, r.tipTemperature_C, r.heatTransferCoefficient_W_m2K, r.finEfficiency, r.thermalResistance_K_W, r.finHeat_W, r.baseHeat_W];
  const metrics = metricsFromState(problem, d, state);
  const constraints = checkConstraints(problem.constraints, metrics);
  const totalViolation = constraints.reduce((s, c) => s + c.violation, 0);
  const objectives: Record<string, number> = {};
  for (const o of problem.objectives) objectives[o.id] = metrics[o.metric];
  return { status: "ok", metrics, objectives, constraints, feasible: totalViolation === 0, totalViolation, diagnostics: [], fidelity: FIN_ARRAY_FIDELITY, backend: FIN_ARRAY_BACKEND_ID, responses: { thermalState: state } };
}

export function finArrayArtifact(problem: EngineeringProblem, d: FinArrayDesign): FinArrayArtifact {
  const g = geometryOf(problem);
  const r = solveDesign(problem, d);
  const ok = r.status === "ok";
  const Lc = d.finHeight_m + d.finThickness_m / 2;
  const m = ok ? r.finParameter_1_m : 0;
  const theta = ok ? r.baseTemperature_C - g.ambient_C : 0;
  const profile = Array.from({ length: 21 }, (_, i) => {
    const x = (i / 20) * d.finHeight_m;
    const ratio = ok ? Math.cosh(m * (Lc - x)) / Math.cosh(m * Lc) : 1;
    return { x_m: x, temperature_C: g.ambient_C + theta * ratio };
  });
  return {
    design: d,
    geometry: g,
    finCount: r.finCount,
    gap_m: r.gap_m,
    ambient_C: g.ambient_C,
    baseTemperature_C: ok ? r.baseTemperature_C : NaN,
    tipTemperature_C: ok ? r.tipTemperature_C : NaN,
    heatTransferCoefficient_W_m2K: ok ? r.heatTransferCoefficient_W_m2K : NaN,
    finEfficiency: ok ? r.finEfficiency : NaN,
    finProfile: profile,
    result: r,
  };
}
