/**
 * Deterministic mapping from a validated model output to a candidate
 * specification: unit normalisation per field, provenance, material,
 * objective, missing fields, ambiguities with normalised candidates. Any
 * value whose unit cannot be normalised is dropped and reported, never
 * guessed.
 */
import type { DomainId } from "../../core/problem";
import { DEFAULT_OBJECTIVE, DOMAIN_FIELDS, emptySpec, REQUIRED_FIELDS, type CandidateSpec, type SpecField, type SpecFieldId } from "../spec";
import { normalizeField, type NumericFieldId } from "../units";
import type { LLMOutput } from "./schema";

export interface CandidateBuild {
  spec: CandidateSpec;
  /** Fields whose written unit could not be normalised; the value was discarded. */
  normalizationErrors: { field: string; error: string }[];
}

export function candidateFromLLMOutput(out: LLMOutput): CandidateBuild {
  const spec = emptySpec();
  const normalizationErrors: { field: string; error: string }[] = [];
  spec.confidence = out.confidence;
  spec.unsupportedElements = out.unsupported_elements.slice();
  if (out.domain === "unsupported") {
    spec.domain = null;
    spec.detectedDomain = out.unsupported_domain.trim() || "none";
    spec.unsupportedReason = `This brief reads as a ${spec.detectedDomain} problem. NeuroForge currently solves planar truss bridges, planar manipulators and plate-fin heat sinks; it is not one of them. ${out.domain_reasoning}`.trim();
    return { spec, normalizationErrors };
  }
  const domain: DomainId = out.domain;
  spec.domain = domain;
  spec.detectedDomain = domain;
  const allowed = new Set<SpecFieldId>(DOMAIN_FIELDS[domain]);
  const seen = new Set<string>();
  const fields: SpecField[] = [];
  for (const f of out.fields) {
    if (!allowed.has(f.id)) {
      spec.warnings.push(`Field ${f.id} does not belong to the ${domain} family and was ignored.`);
      continue;
    }
    if (seen.has(f.id)) {
      spec.warnings.push(`Field ${f.id} was reported twice; the first value is used.`);
      continue;
    }
    const n = normalizeField(f.id as NumericFieldId, f.value, f.unit);
    if ("error" in n) {
      normalizationErrors.push({ field: f.id, error: n.error });
      spec.warnings.push(`${f.id}: ${n.error}; the value ${f.value} ${f.unit} was discarded.`);
      continue;
    }
    seen.add(f.id);
    const field: SpecField = { id: f.id, value: n.value, provenance: f.provenance, confidence: f.provenance === "explicit" ? "high" : "medium", sourceSpan: f.evidence, rawValue: f.value, rawUnit: f.unit };
    if (n.note) field.note = n.note;
    fields.push(field);
  }
  if (out.material.id !== "unspecified") fields.push({ id: "materialId", value: out.material.id, provenance: "explicit", confidence: "high", sourceSpan: out.material.evidence });
  const metric = out.objective.metric === "unspecified" ? DEFAULT_OBJECTIVE[domain] : out.objective.metric;
  const objectiveAllowed: Record<DomainId, string[]> = { structural: ["mass_kg", "compliance_J"], structural3d: ["mass_kg", "compliance_J"], robotics: ["peakTorque_Nm", "mass_kg"], thermal: ["mass_kg", "thermalResistance_K_W"] };
  if (!objectiveAllowed[domain].includes(metric)) {
    spec.warnings.push(`Objective ${metric} is not available for the ${domain} family; the default ${DEFAULT_OBJECTIVE[domain]} is used.`);
    fields.push({ id: "objective", value: DEFAULT_OBJECTIVE[domain], provenance: "assumed", confidence: "low" });
  } else if (out.objective.metric === "unspecified") fields.push({ id: "objective", value: metric, provenance: "assumed", confidence: "low", note: "The brief states no objective; the family default is used." });
  else fields.push({ id: "objective", value: metric, provenance: out.objective.provenance, confidence: out.objective.provenance === "explicit" ? "high" : "medium", sourceSpan: out.objective.evidence });
  spec.fields = fields;
  const stated = new Set(fields.map((f) => f.id));
  const missing = new Set<SpecFieldId>(out.missing.filter((m) => allowed.has(m) && !stated.has(m)));
  for (const id of REQUIRED_FIELDS[domain]) if (!stated.has(id)) missing.add(id);
  if (!stated.has("materialId")) missing.add("materialId");
  spec.missing = [...missing];
  for (const a of out.ambiguities) {
    if (!allowed.has(a.field as SpecFieldId)) continue;
    const candidates: number[] = [];
    for (const c of a.candidates) {
      const n = normalizeField(a.field as NumericFieldId, c.value, c.unit);
      if ("error" in n) spec.warnings.push(`Ambiguity candidate for ${a.field}: ${n.error}.`);
      else candidates.push(n.value);
    }
    spec.ambiguities.push({ field: a.field, candidates, description: a.description });
  }
  if (out.notes.trim()) spec.warnings.push(out.notes.trim());
  return { spec, normalizationErrors };
}
