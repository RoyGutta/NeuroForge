/**
 * The candidate specification: what an interpreter believes a brief says,
 * before any engineering object exists. It is deliberately not a second
 * engineering schema. Its fields are exactly the inputs of the domain
 * templates (`createTrussBridgeProblem`, `createSpaceTrussProblem`,
 * `createManipulatorProblem`, `createHeatSinkProblem`); `realizeSpec` maps a
 * candidate onto `EngineeringProblem` through those templates and nothing
 * else, so every interpreter produces the same kind of problem the
 * workspace form does.
 */
import type { Confidence, DomainId } from "../core/problem";
import type { NumericFieldId } from "./units";

export const SPEC_SCHEMA_VERSION = "1.0.0";

/** Where a value came from: stated verbatim, derived from wording, filled by a default, or not known. */
export type FieldProvenance = "explicit" | "inferred" | "assumed" | "unknown";

export type ObjectiveMetric = "mass_kg" | "compliance_J" | "peakTorque_Nm" | "thermalResistance_K_W";

export type SpecFieldId = NumericFieldId | "materialId" | "objective";

export interface SpecField {
  id: SpecFieldId;
  /** SI value for numeric fields; material id or objective metric for the two string fields. */
  value: number | string;
  provenance: FieldProvenance;
  confidence: Confidence;
  /** Verbatim text the value was read from. */
  sourceSpan?: string;
  /** Value and unit as written, before normalisation. */
  rawValue?: number;
  rawUnit?: string;
  note?: string;
}

export interface Ambiguity {
  field: string;
  candidates: (number | string)[];
  description: string;
}

export interface Conflict {
  field: string;
  values: { source: string; value: number | string; evidence?: string }[];
  resolution: string;
}

export interface CandidateSpec {
  schemaVersion: string;
  /** Supported family, or null when the brief is outside the engine. */
  domain: DomainId | null;
  /** Family detected by the interpreter, including unsupported ones (aerospace, fluids, ...). */
  detectedDomain: string | null;
  /** Why the brief was declined, when `domain` is null. */
  unsupportedReason?: string;
  fields: SpecField[];
  /** Fields the brief needs but does not state. */
  missing: SpecFieldId[];
  ambiguities: Ambiguity[];
  /** Parts of the brief the family cannot model (distributed loads, fans, brackets, ...). */
  unsupportedElements: string[];
  conflicts: Conflict[];
  warnings: string[];
  confidence: Confidence;
}

export function emptySpec(): CandidateSpec {
  return { schemaVersion: SPEC_SCHEMA_VERSION, domain: null, detectedDomain: null, fields: [], missing: [], ambiguities: [], unsupportedElements: [], conflicts: [], warnings: [], confidence: "medium" };
}

export function specField(spec: CandidateSpec, id: SpecFieldId): SpecField | undefined {
  return spec.fields.find((f) => f.id === id);
}

export function specNumber(spec: CandidateSpec, id: NumericFieldId): number | undefined {
  const f = specField(spec, id);
  return typeof f?.value === "number" ? f.value : undefined;
}

export function specString(spec: CandidateSpec, id: "materialId" | "objective"): string | undefined {
  const f = specField(spec, id);
  return typeof f?.value === "string" ? f.value : undefined;
}

/** Fields each family needs; a missing one becomes a recorded assumption. */
export const REQUIRED_FIELDS: Record<DomainId, NumericFieldId[]> = {
  structural: ["span_m", "load_N"],
  structural3d: ["span_m", "load_N"],
  robotics: ["payload_kg", "reach_m"],
  thermal: ["power_W", "maxTemperature_C"],
};

/** Every field a family can use, for scoring and the interface. */
export const DOMAIN_FIELDS: Record<DomainId, SpecFieldId[]> = {
  structural: ["span_m", "load_N", "safetyFactor", "materialId", "deflectionRatio", "massBudget_kg", "objective"],
  structural3d: ["span_m", "load_N", "safetyFactor", "materialId", "deflectionRatio", "massBudget_kg", "objective"],
  robotics: ["payload_kg", "reach_m", "safetyFactor", "materialId", "objective"],
  thermal: ["power_W", "maxTemperature_C", "ambient_C", "materialId", "massBudget_kg", "objective"],
};

export const DEFAULT_OBJECTIVE: Record<DomainId, ObjectiveMetric> = { structural: "mass_kg", structural3d: "mass_kg", robotics: "peakTorque_Nm", thermal: "mass_kg" };

export const OBJECTIVE_LABEL: Record<ObjectiveMetric, string> = {
  mass_kg: "minimize mass",
  compliance_J: "minimize compliance",
  peakTorque_Nm: "minimize peak torque",
  thermalResistance_K_W: "minimize thermal resistance",
};
