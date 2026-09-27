/**
 * Template for the "lift a payload with less torque" manipulator problem.
 * Every value not given by the caller is an explicit, reasoned assumption.
 */
import type { Assumption, ConstraintSpec, EngineeringProblem, Objective, TaskPoint } from "../../../core/problem";
import { DEFAULT_MATERIAL_ID, getMaterial } from "../../structural/truss/materials";
import { GRAVITY_M_S2 } from "./statics";

export interface ManipulatorOptions {
  payload_kg: number;
  reach_m: number;
  safetyFactor?: number;
  materialId?: string;
  /** Tip deflection limit in metres (default reach / 400). */
  deflectionLimit_m?: number;
  taskPoints?: TaskPoint[];
  objectiveMetric?: "peakTorque_Nm" | "mass_kg" | "multi";
  id?: string;
  title?: string;
  brief?: string;
}

/** Default task set: an arc of points across the workspace at 0.5 to 1.0 of the reach. */
export function defaultTaskPoints(reach_m: number): TaskPoint[] {
  const pts: TaskPoint[] = [];
  for (const f of [0.5, 0.75, 1.0]) {
    for (const angle of [-30, 0, 30, 60]) {
      const a = (angle * Math.PI) / 180;
      pts.push({ x_m: f * reach_m * Math.cos(a), y_m: f * reach_m * Math.sin(a) });
    }
  }
  return pts;
}

export function createManipulatorProblem(opts: ManipulatorOptions): EngineeringProblem {
  const safetyFactor = opts.safetyFactor ?? 2;
  const materialId = opts.materialId ?? DEFAULT_MATERIAL_ID;
  const material = getMaterial(materialId);
  const deflectionLimit = opts.deflectionLimit_m ?? opts.reach_m / 400;
  const taskPoints = opts.taskPoints ?? defaultTaskPoints(opts.reach_m);
  const assumptions: Assumption[] = [];
  const assume = (a: Omit<Assumption, "id">) => assumptions.push({ id: `assume-${assumptions.length + 1}`, ...a });
  if (!opts.taskPoints) {
    assume({ field: "taskPoints", value: `${taskPoints.length} points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees`, reason: "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.", confidence: "medium" });
  }
  if (opts.safetyFactor === undefined) assume({ field: "safetyFactor", value: "2.0", reason: "No safety factor was given; 2.0 is a conservative preliminary-design value.", confidence: "low" });
  if (opts.materialId === undefined) assume({ field: "material", value: material.name, reason: "No material was specified; 6061-T6 is a common lightweight arm alloy.", confidence: "low" });
  assume({ field: "loadCase", value: "Static hold at each task point, gravity only", reason: "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.", confidence: "medium" });
  assume({ field: "linkModel", value: "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1", reason: "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.", confidence: "medium" });
  assume({ field: "elbowChoice", value: "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point", reason: "Elbow configuration is an operational freedom, not a design variable.", confidence: "high" });
  assume({ field: "deflectionLimit", value: `${(deflectionLimit * 1000).toFixed(2)} mm (reach / 400)`, reason: "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.", confidence: "low" });
  assume({ field: "actuators", value: "Joint torque is reported; no motor or gearbox model", reason: "Actuator selection follows torque sizing and is outside this study.", confidence: "high" });

  const objectives: Objective[] =
    opts.objectiveMetric === "mass_kg"
      ? [{ id: "mass", metric: "mass_kg", direction: "minimize", label: "Mass" }]
      : opts.objectiveMetric === "multi"
        ? [
            { id: "torque", metric: "peakTorque_Nm", direction: "minimize", label: "Peak torque" },
            { id: "mass", metric: "mass_kg", direction: "minimize", label: "Mass" },
          ]
        : [{ id: "torque", metric: "peakTorque_Nm", direction: "minimize", label: "Peak torque" }];
  const constraints: ConstraintSpec[] = [
    { id: "reach", metric: "unreachableFraction", op: "<=", limit: 0, label: "Every task point reachable", source: "user" },
    { id: "stress", metric: "stressUtilization", op: "<=", limit: 1, label: `Link bending stress x ${safetyFactor} <= yield strength`, source: "design-code" },
    { id: "deflection", metric: "maxTipDeflection_m", op: "<=", limit: deflectionLimit, label: `Tip deflection <= ${(deflectionLimit * 1000).toFixed(2)} mm`, source: opts.deflectionLimit_m === undefined ? "assumed" : "user" },
  ];
  return {
    id: opts.id ?? "planar-manipulator",
    version: 1,
    title: opts.title ?? "Payload manipulator study",
    brief: opts.brief ?? `Design a two-link arm that lifts ${opts.payload_kg} kg anywhere within a ${opts.reach_m} m reach while minimizing motor torque.`,
    domain: "robotics",
    geometry: {
      kind: "planar-manipulator",
      reach_m: opts.reach_m,
      linkMin_m: 0.15 * opts.reach_m,
      linkMax_m: 1.0 * opts.reach_m,
      radiusMin_m: 0.004,
      radiusMax_m: 0.06,
      wallRatio: 0.8,
      taskPoints,
    },
    material,
    loads: [{ id: "payload", kind: "point", magnitude_N: opts.payload_kg * GRAVITY_M_S2, direction: "down", location: "tip" }],
    supports: [{ kind: "fixed", location: "base" }],
    safetyFactor,
    objectives,
    constraints,
    analysis: { includeSelfWeight: true },
    assumptions,
    provenance: { source: "template" },
    createdAt: new Date().toISOString(),
  };
}
