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

export type DomainId = "structural";

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
  location: "midspan";
}

export type LoadSpec = PointLoadSpec;

export interface SupportSpec {
  kind: "pin" | "roller";
  location: "left-end" | "right-end";
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

export type ProblemGeometry = TrussBridgeGeometry;

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
