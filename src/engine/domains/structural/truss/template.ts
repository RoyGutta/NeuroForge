/**
 * Template for the canonical "lightweight bridge" problem.
 *
 * Everything not given by the caller is filled in with an explicit,
 * reasoned assumption so the resulting specification is honest about what
 * came from the user and what came from the engine.
 */
import type {
  Assumption,
  ConstraintSpec,
  EngineeringProblem,
  Objective,
} from "../../../core/problem";
import { DEFAULT_MATERIAL_ID, getMaterial } from "./materials";

export interface TrussBridgeOptions {
  span_m: number;
  load_N: number;
  safetyFactor?: number;
  materialId?: string;
  panels?: number;
  /** Serviceability deflection limit as span / ratio. */
  deflectionRatio?: number;
  includeSelfWeight?: boolean;
  id?: string;
  title?: string;
  brief?: string;
  /** Objective metric; "mass_kg" (default), "compliance_J" (stiffness), or "multi" (mass and compliance jointly). */
  objectiveMetric?: "mass_kg" | "compliance_J" | "multi";
  /** Additional constraints appended to the standard stress/buckling/deflection set. */
  extraConstraints?: ConstraintSpec[];
}

export const DEFAULT_DEFLECTION_RATIO = 250;
export const DEFAULT_PANELS = 4;

export function createTrussBridgeProblem(opts: TrussBridgeOptions): EngineeringProblem {
  const span = opts.span_m;
  const panels = opts.panels ?? DEFAULT_PANELS;
  const safetyFactor = opts.safetyFactor ?? 2;
  const materialId = opts.materialId ?? DEFAULT_MATERIAL_ID;
  const deflectionRatio = opts.deflectionRatio ?? DEFAULT_DEFLECTION_RATIO;
  const includeSelfWeight = opts.includeSelfWeight ?? true;
  const material = getMaterial(materialId);

  const assumptions: Assumption[] = [];
  const assume = (a: Omit<Assumption, "id">) =>
    assumptions.push({ id: `assume-${assumptions.length + 1}`, ...a });

  assume({
    field: "supports",
    value: "Pin at the left end, roller at the right end",
    reason:
      "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
    confidence: "medium",
  });
  assume({
    field: "loadCase",
    value: `Single static point load of ${opts.load_N} N at midspan`,
    reason:
      "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
    confidence: "medium",
  });
  if (opts.safetyFactor === undefined) {
    assume({
      field: "safetyFactor",
      value: "2.0",
      reason: "No safety factor was given; 2.0 is a conservative preliminary-design value.",
      confidence: "low",
    });
  }
  if (opts.materialId === undefined) {
    assume({
      field: "material",
      value: material.name,
      reason:
        "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
      confidence: "low",
    });
  }
  assume({
    field: "deflectionLimit",
    value: `Span / ${deflectionRatio}`,
    reason:
      "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
    confidence: "medium",
  });
  assume({
    field: "sectionShape",
    value: "Solid round bar (I = A^2 / 4 pi)",
    reason:
      "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
    confidence: "medium",
  });
  assume({
    field: "analysisModel",
    value: "Linear-elastic, small-displacement, pin-jointed truss; self-weight " +
      (includeSelfWeight ? "included as lumped nodal loads" : "neglected"),
    reason:
      "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
    confidence: "high",
  });

  const objectives: Objective[] =
    opts.objectiveMetric === "compliance_J"
      ? [{ id: "compliance", metric: "compliance_J", direction: "minimize", label: "Compliance" }]
      : opts.objectiveMetric === "multi"
        ? [
            { id: "mass", metric: "mass_kg", direction: "minimize", label: "Mass" },
            { id: "compliance", metric: "compliance_J", direction: "minimize", label: "Compliance" },
          ]
        : [{ id: "mass", metric: "mass_kg", direction: "minimize", label: "Mass" }];

  const constraints: ConstraintSpec[] = [
    {
      id: "stress",
      metric: "stressUtilization",
      op: "<=",
      limit: 1,
      label: `Axial stress x ${safetyFactor} <= yield strength`,
      source: "design-code",
    },
    {
      id: "buckling",
      metric: "bucklingUtilization",
      op: "<=",
      limit: 1,
      label: `Compression x ${safetyFactor} <= Euler critical load`,
      source: "design-code",
    },
    {
      id: "deflection",
      metric: "maxDisplacement_m",
      op: "<=",
      limit: span / deflectionRatio,
      label: `Max deflection <= span / ${deflectionRatio}`,
      source: "assumed",
    },
    ...(opts.extraConstraints ?? []),
  ];

  return {
    id: opts.id ?? "truss-bridge",
    version: 1,
    title: opts.title ?? "Lightweight bridge study",
    brief:
      opts.brief ??
      `Design a lightweight bridge spanning ${span} meters that supports ${opts.load_N} N.`,
    domain: "structural",
    geometry: {
      kind: "truss-bridge",
      span_m: span,
      panels,
      depthMin_m: Math.max(0.02, span * 0.025),
      depthMax_m: span * 0.3,
      areaMin_m2: 1e-6,
      areaMax_m2: 5e-4,
      sectionShape: "solid-round",
    },
    material,
    loads: [
      { id: "load-1", kind: "point", magnitude_N: opts.load_N, direction: "down", location: "midspan" },
    ],
    supports: [
      { kind: "pin", location: "left-end" },
      { kind: "roller", location: "right-end" },
    ],
    safetyFactor,
    objectives,
    constraints,
    analysis: { includeSelfWeight },
    assumptions,
    provenance: { source: "template" },
    createdAt: new Date().toISOString(),
  };
}
