/**
 * Template for the spatial truss girder problem: a triangular-section space
 * truss spanning between two supports with a vertical load at the midspan
 * top node. Every value not given by the caller is a recorded assumption.
 */
import type { Assumption, ConstraintSpec, EngineeringProblem, Objective } from "../../../core/problem";
import { DEFAULT_MATERIAL_ID, getMaterial } from "../truss/materials";

export interface SpaceTrussOptions {
  span_m: number;
  load_N: number;
  bays?: number;
  width_m?: number;
  safetyFactor?: number;
  materialId?: string;
  deflectionRatio?: number;
  includeSelfWeight?: boolean;
  objectiveMetric?: "mass_kg" | "compliance_J" | "multi";
  extraConstraints?: ConstraintSpec[];
  id?: string;
  title?: string;
  brief?: string;
}

export function createSpaceTrussProblem(opts: SpaceTrussOptions): EngineeringProblem {
  const bays = opts.bays ?? 2;
  const width = opts.width_m ?? opts.span_m / 6;
  const safetyFactor = opts.safetyFactor ?? 2;
  const deflectionRatio = opts.deflectionRatio ?? 250;
  const materialId = opts.materialId ?? DEFAULT_MATERIAL_ID;
  const material = getMaterial(materialId);
  const includeSelfWeight = opts.includeSelfWeight ?? true;
  const assumptions: Assumption[] = [];
  const assume = (a: Omit<Assumption, "id">) => assumptions.push({ id: `assume-${assumptions.length + 1}`, ...a });
  assume({ field: "supports", value: "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)", reason: "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.", confidence: "high" });
  if (opts.width_m === undefined) assume({ field: "width", value: `${width.toFixed(3)} m (span / 6)`, reason: "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.", confidence: "low" });
  if (opts.safetyFactor === undefined) assume({ field: "safetyFactor", value: "2.0", reason: "No safety factor was given; 2.0 is a conservative preliminary-design value.", confidence: "low" });
  if (opts.materialId === undefined) assume({ field: "material", value: material.name, reason: "No material was specified; 6061-T6 aluminium is the engine's default alloy.", confidence: "low" });
  assume({ field: "load", value: `${opts.load_N} N vertical at the midspan top node`, reason: "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.", confidence: "medium" });
  assume({ field: "section", value: "Solid round bars; Euler buckling with K = 1", reason: "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.", confidence: "medium" });
  assume({ field: "deflectionLimit", value: `span / ${deflectionRatio}`, reason: "Serviceability deflection limit used as a generic preliminary-design value, not a code value.", confidence: "low" });
  assume({ field: "bracing", value: "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan", reason: "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.", confidence: "medium" });
  assume({ field: "analysisModel", value: "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes", reason: "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.", confidence: "high" });

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
    { id: "stress", metric: "stressUtilization", op: "<=", limit: 1, label: `Stress x ${safetyFactor} <= yield`, source: "design-code" },
    { id: "buckling", metric: "bucklingUtilization", op: "<=", limit: 1, label: `Compression x ${safetyFactor} <= Euler critical load`, source: "design-code" },
    { id: "deflection", metric: "maxDisplacement_m", op: "<=", limit: opts.span_m / deflectionRatio, label: `Deflection <= span / ${deflectionRatio}`, source: "assumed" },
    ...(opts.extraConstraints ?? []),
  ];
  return {
    id: opts.id ?? "space-truss-girder",
    version: 1,
    title: opts.title ?? "Space truss girder study",
    brief: opts.brief ?? `Design a lightweight triangular space truss spanning ${opts.span_m} m that carries ${opts.load_N} N at midspan.`,
    domain: "structural3d",
    geometry: {
      kind: "space-truss",
      span_m: opts.span_m,
      bays,
      width_m: width,
      depthMin_m: opts.span_m / 40,
      depthMax_m: opts.span_m / 3,
      areaMin_m2: 2e-6,
      areaMax_m2: 1e-3,
    },
    material,
    loads: [{ id: "load-1", kind: "point", magnitude_N: opts.load_N, direction: "down", location: "midspan" }],
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
