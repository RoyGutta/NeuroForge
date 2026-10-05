/**
 * Template for the "cool a component with the lightest heat sink" problem.
 * Every value not given by the caller is a recorded assumption.
 */
import type { Assumption, ConstraintSpec, EngineeringProblem, Objective } from "../../../core/problem";
import { DEFAULT_MATERIAL_ID, getMaterial } from "../../structural/truss/materials";

export interface HeatSinkOptions {
  power_W: number;
  maxTemperature_C: number;
  ambient_C?: number;
  baseWidth_m?: number;
  baseDepth_m?: number;
  materialId?: string;
  objectiveMetric?: "mass_kg" | "thermalResistance_K_W" | "multi";
  massBudget_kg?: number;
  id?: string;
  title?: string;
  brief?: string;
}

export function createHeatSinkProblem(opts: HeatSinkOptions): EngineeringProblem {
  const ambient = opts.ambient_C ?? 25;
  const width = opts.baseWidth_m ?? 0.1;
  const depth = opts.baseDepth_m ?? 0.1;
  const materialId = opts.materialId ?? DEFAULT_MATERIAL_ID;
  const material = getMaterial(materialId);
  const assumptions: Assumption[] = [];
  const assume = (a: Omit<Assumption, "id">) => assumptions.push({ id: `assume-${assumptions.length + 1}`, ...a });
  if (opts.ambient_C === undefined) assume({ field: "ambient", value: "25 C", reason: "No ambient temperature was given; 25 C is the usual room-temperature rating condition.", confidence: "medium" });
  if (opts.baseWidth_m === undefined || opts.baseDepth_m === undefined) assume({ field: "footprint", value: `${(width * 1000).toFixed(0)} x ${(depth * 1000).toFixed(0)} mm base`, reason: "No footprint was given; a 100 x 100 mm base is a common module size.", confidence: "low" });
  if (opts.materialId === undefined) assume({ field: "material", value: material.name, reason: "No material was specified; extruded aluminium is the standard heat-sink material.", confidence: "medium" });
  assume({ field: "convection", value: "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation", reason: "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.", confidence: "medium" });
  assume({ field: "airProperties", value: "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)", reason: "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.", confidence: "medium" });
  assume({ field: "orientation", value: "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature", reason: "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.", confidence: "medium" });
  assume({ field: "finModel", value: "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)", reason: "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.", confidence: "high" });

  const objectives: Objective[] =
    opts.objectiveMetric === "thermalResistance_K_W"
      ? [{ id: "resistance", metric: "thermalResistance_K_W", direction: "minimize", label: "Thermal resistance" }]
      : opts.objectiveMetric === "multi"
        ? [
            { id: "mass", metric: "mass_kg", direction: "minimize", label: "Mass" },
            { id: "resistance", metric: "thermalResistance_K_W", direction: "minimize", label: "Thermal resistance" },
          ]
        : [{ id: "mass", metric: "mass_kg", direction: "minimize", label: "Mass" }];
  const constraints: ConstraintSpec[] = [
    { id: "temperature", metric: "baseTemperature_C", op: "<=", limit: opts.maxTemperature_C, label: `Base temperature <= ${opts.maxTemperature_C} C`, source: "user" },
    { id: "gap", metric: "gap_m", op: ">=", limit: 0.002, label: "Clear gap between fins >= 2 mm", source: "design-code" },
    { id: "fins", metric: "finCount", op: ">=", limit: 2, label: "At least two fins", source: "design-code" },
  ];
  if (opts.massBudget_kg !== undefined) constraints.push({ id: "mass-budget", metric: "mass_kg", op: "<=", limit: opts.massBudget_kg, label: `Mass <= ${opts.massBudget_kg.toFixed(3)} kg`, source: "user" });
  return {
    id: opts.id ?? "plate-fin-heat-sink",
    version: 1,
    title: opts.title ?? "Heat sink study",
    brief: opts.brief ?? `Design the lightest plate-fin heat sink that keeps a ${opts.power_W} W component below ${opts.maxTemperature_C} C in still air.`,
    domain: "thermal",
    geometry: {
      kind: "fin-array",
      baseWidth_m: width,
      baseDepth_m: depth,
      ambient_C: ambient,
      finHeightMin_m: 0.005,
      finHeightMax_m: 0.12,
      finThicknessMin_m: 0.0005,
      finThicknessMax_m: 0.006,
      finPitchMin_m: 0.003,
      finPitchMax_m: 0.04,
      baseThicknessMin_m: 0.001,
      baseThicknessMax_m: 0.012,
      gapMin_m: 0.002,
    },
    material,
    loads: [{ id: "heat", kind: "heat", power_W: opts.power_W, location: "base" }],
    supports: [],
    safetyFactor: 1,
    objectives,
    constraints,
    analysis: { includeSelfWeight: false },
    assumptions,
    provenance: { source: "template" },
    createdAt: new Date().toISOString(),
  };
}
