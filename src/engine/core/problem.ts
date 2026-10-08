/**
 * Engineering problem specification.
 *
 * This is the platform's central data contract: what a user (or an
 * interpreter acting on their brief) asserts about the problem, what the
 * system had to assume to make it solvable, and how confident it is in
 * each assumption. It is plain JSON-serialisable data with no behaviour, so
 * it can be versioned, stored, diffed, and edited in a UI.
 *
 * Domain-specific geometry lives in a discriminated union (`ProblemGeometry`)
 * so new domains extend the schema without loosening its typing.
 */
import type { Material } from "../domains/structural/truss/model";

export type DomainId = "structural" | "robotics" | "thermal" | "structural3d";

export type Confidence = "high" | "medium" | "low";

export type ValueSource = "user" | "assumed" | "design-code";

export interface Assumption {
  id: string;
  /** Which part of the specification this assumption fills in. */
  field: string;
  /** Human-readable value that was assumed. */
  value: string;
  reason: string;
  confidence: Confidence;
}

export type ObjectiveDirection = "minimize" | "maximize";

export interface Objective {
  id: string;
  /** Metric id computed by the domain evaluator, e.g. "mass_kg". */
  metric: string;
  direction: ObjectiveDirection;
  label: string;
}

export type ConstraintOp = "<=" | ">=";

export interface ConstraintSpec {
  id: string;
  metric: string;
  op: ConstraintOp;
  limit: number;
  label: string;
  source: ValueSource;
}

export interface PointLoadSpec {
  id: string;
  kind: "point";
  magnitude_N: number;
  /** Currently only vertical downward loads are modelled. */
  direction: "down";
  location: "midspan" | "tip";
}

/** Steady heat dissipated into a heat sink base. */
export interface HeatLoadSpec {
  id: string;
  kind: "heat";
  power_W: number;
  location: "base";
}

export type LoadSpec = PointLoadSpec | HeatLoadSpec;

/** First point load's magnitude, for domains that have one. */
export function pointLoadMagnitude_N(problem: { loads: LoadSpec[] }): number | undefined {
  const l = problem.loads.find((x): x is PointLoadSpec => x.kind === "point");
  return l?.magnitude_N;
}

export interface SupportSpec {
  kind: "pin" | "roller" | "fixed";
  location: "left-end" | "right-end" | "base";
}

/** Planar truss bridge: bottom chord on the supports, top chord free. */
export interface TrussBridgeGeometry {
  kind: "truss-bridge";
  span_m: number;
  /** Number of bottom-chord panels. Must be even so a midspan node exists. */
  panels: number;
  depthMin_m: number;
  depthMax_m: number;
  areaMin_m2: number;
  areaMax_m2: number;
  sectionShape: "solid-round";
}

export interface TaskPoint {
  x_m: number;
  y_m: number;
}

/** Planar two-link manipulator in a vertical plane, base at the origin. */
export interface PlanarManipulatorGeometry {
  kind: "planar-manipulator";
  /** Farthest task point distance; sets the link-length bounds. */
  reach_m: number;
  linkMin_m: number;
  linkMax_m: number;
  radiusMin_m: number;
  radiusMax_m: number;
  /** Tube inner radius as a fraction of the outer radius. */
  wallRatio: number;
  taskPoints: TaskPoint[];
}

/** Plate-fin heat sink: fins along the base width, extruded over the base depth, vertical in natural convection. */
export interface FinArrayGeometry {
  kind: "fin-array";
  baseWidth_m: number;
  baseDepth_m: number;
  ambient_C: number;
  finHeightMin_m: number;
  finHeightMax_m: number;
  finThicknessMin_m: number;
  finThicknessMax_m: number;
  finPitchMin_m: number;
  finPitchMax_m: number;
  baseThicknessMin_m: number;
  baseThicknessMax_m: number;
  /** Minimum clear gap between fins (manufacturing and flow), metres. */
  gapMin_m: number;
}

/**
 * Spatial truss girder with a triangular cross-section: two bottom chords on
 * the supports, one top chord, braced faces. Stations are evenly spaced along
 * the span; the design varies every station's top-node height and every
 * member area.
 */
export interface SpaceTrussGeometry {
  kind: "space-truss";
  span_m: number;
  /** Number of bays along the span (even, >= 2); stations = bays + 1. */
  bays: number;
  /** Distance between the two bottom chords. */
  width_m: number;
  depthMin_m: number;
  depthMax_m: number;
  areaMin_m2: number;
  areaMax_m2: number;
}

export type ProblemGeometry = TrussBridgeGeometry | PlanarManipulatorGeometry | FinArrayGeometry | SpaceTrussGeometry;

export interface AnalysisSettings {
  includeSelfWeight: boolean;
}

export interface ProblemProvenance {
  source: "template" | "interpreter" | "user";
  /** Original natural-language brief, if any. */
  sourceText?: string;
  interpreter?: string;
}

export interface EngineeringProblem {
  id: string;
  version: number;
  title: string;
  brief: string;
  domain: DomainId;
  geometry: ProblemGeometry;
  material: Material;
  loads: LoadSpec[];
  supports: SupportSpec[];
  safetyFactor: number;
  objectives: Objective[];
  constraints: ConstraintSpec[];
  analysis: AnalysisSettings;
  assumptions: Assumption[];
  provenance: ProblemProvenance;
  createdAt: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Description of a computable metric, published by a domain. */
export interface MetricDescriptor {
  id: string;
  label: string;
  unit: string;
  description: string;
}
