/**
 * The schema the model must fill. It asks for what the brief says, with the
 * units as written and a verbatim quote per value; it never asks for a
 * derived engineering quantity. Converting units, filling defaults and
 * building the problem are deterministic steps that follow. The hand-written
 * validator below keeps the engine free of a schema library and rejects any
 * output that strays from the contract.
 */
export const LLM_SCHEMA_VERSION = "1.0.0";

export const DOMAIN_VALUES = ["structural", "structural3d", "robotics", "thermal", "unsupported"] as const;
export const FIELD_VALUES = ["span_m", "load_N", "payload_kg", "reach_m", "power_W", "maxTemperature_C", "ambient_C", "safetyFactor", "deflectionRatio", "massBudget_kg"] as const;
export const MATERIAL_VALUES = ["aluminum-6061-t6", "steel-a36", "titanium-6al-4v", "unspecified"] as const;
export const OBJECTIVE_VALUES = ["mass_kg", "compliance_J", "peakTorque_Nm", "thermalResistance_K_W", "unspecified"] as const;
const PROVENANCE_VALUES = ["explicit", "inferred"] as const;
const CONFIDENCE_VALUES = ["high", "medium", "low"] as const;

export interface LLMField {
  id: (typeof FIELD_VALUES)[number];
  value: number;
  unit: string;
  provenance: "explicit" | "inferred";
  evidence: string;
}

export interface LLMOutput {
  domain: (typeof DOMAIN_VALUES)[number];
  domain_reasoning: string;
  unsupported_domain: string;
  fields: LLMField[];
  material: { id: (typeof MATERIAL_VALUES)[number]; evidence: string };
  objective: { metric: (typeof OBJECTIVE_VALUES)[number]; provenance: "explicit" | "inferred"; evidence: string };
  missing: (typeof FIELD_VALUES)[number][];
  ambiguities: { field: string; candidates: { value: number; unit: string }[]; description: string }[];
  unsupported_elements: string[];
  confidence: "high" | "medium" | "low";
  notes: string;
}

const quantity = { type: "object", additionalProperties: false, required: ["value", "unit"], properties: { value: { type: "number" }, unit: { type: "string" } } };

export const LLM_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["domain", "domain_reasoning", "unsupported_domain", "fields", "material", "objective", "missing", "ambiguities", "unsupported_elements", "confidence", "notes"],
  properties: {
    domain: { type: "string", enum: [...DOMAIN_VALUES] },
    domain_reasoning: { type: "string" },
    unsupported_domain: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "value", "unit", "provenance", "evidence"],
        properties: { id: { type: "string", enum: [...FIELD_VALUES] }, value: { type: "number" }, unit: { type: "string" }, provenance: { type: "string", enum: [...PROVENANCE_VALUES] }, evidence: { type: "string" } },
      },
    },
    material: { type: "object", additionalProperties: false, required: ["id", "evidence"], properties: { id: { type: "string", enum: [...MATERIAL_VALUES] }, evidence: { type: "string" } } },
    objective: { type: "object", additionalProperties: false, required: ["metric", "provenance", "evidence"], properties: { metric: { type: "string", enum: [...OBJECTIVE_VALUES] }, provenance: { type: "string", enum: [...PROVENANCE_VALUES] }, evidence: { type: "string" } } },
    missing: { type: "array", items: { type: "string", enum: [...FIELD_VALUES] } },
    ambiguities: { type: "array", items: { type: "object", additionalProperties: false, required: ["field", "candidates", "description"], properties: { field: { type: "string" }, candidates: { type: "array", items: quantity }, description: { type: "string" } } } },
    unsupported_elements: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: [...CONFIDENCE_VALUES] },
    notes: { type: "string" },
  },
};

type Check = { ok: true; output: LLMOutput } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const inEnum = <T extends readonly string[]>(v: unknown, values: T): v is T[number] => typeof v === "string" && (values as readonly string[]).includes(v);

/** Validates a parsed model output against the contract; every violation is reported, none is repaired. */
export function parseLLMOutput(json: unknown): Check {
  const errors: string[] = [];
  if (!isRecord(json)) return { ok: false, errors: ["output is not an object"] };
  const str = (k: string) => {
    if (typeof json[k] !== "string") errors.push(`${k} must be a string`);
  };
  if (!inEnum(json.domain, DOMAIN_VALUES)) errors.push(`domain must be one of ${DOMAIN_VALUES.join(", ")}`);
  str("domain_reasoning");
  str("unsupported_domain");
  str("notes");
  if (!inEnum(json.confidence, CONFIDENCE_VALUES)) errors.push("confidence must be high, medium or low");
  if (!Array.isArray(json.fields)) errors.push("fields must be an array");
  else
    json.fields.forEach((f, i) => {
      if (!isRecord(f)) return errors.push(`fields[${i}] must be an object`);
      if (!inEnum(f.id, FIELD_VALUES)) errors.push(`fields[${i}].id "${String(f.id)}" is not a known field`);
      if (typeof f.value !== "number" || !Number.isFinite(f.value)) errors.push(`fields[${i}].value must be a finite number`);
      if (typeof f.unit !== "string") errors.push(`fields[${i}].unit must be a string`);
      if (!inEnum(f.provenance, PROVENANCE_VALUES)) errors.push(`fields[${i}].provenance must be explicit or inferred`);
      if (typeof f.evidence !== "string") errors.push(`fields[${i}].evidence must be a string`);
    });
  if (!isRecord(json.material) || !inEnum(json.material.id, MATERIAL_VALUES) || typeof json.material.evidence !== "string") errors.push("material must be { id: known material or unspecified, evidence }");
  if (!isRecord(json.objective) || !inEnum(json.objective.metric, OBJECTIVE_VALUES) || !inEnum(json.objective.provenance, PROVENANCE_VALUES) || typeof json.objective.evidence !== "string") errors.push("objective must be { metric, provenance, evidence }");
  if (!Array.isArray(json.missing) || !json.missing.every((m) => inEnum(m, FIELD_VALUES))) errors.push("missing must list known field ids");
  if (!Array.isArray(json.ambiguities)) errors.push("ambiguities must be an array");
  else
    json.ambiguities.forEach((a, i) => {
      if (!isRecord(a) || typeof a.field !== "string" || typeof a.description !== "string" || !Array.isArray(a.candidates)) return errors.push(`ambiguities[${i}] must be { field, candidates, description }`);
      a.candidates.forEach((c, j) => {
        if (!isRecord(c) || typeof c.value !== "number" || !Number.isFinite(c.value) || typeof c.unit !== "string") errors.push(`ambiguities[${i}].candidates[${j}] must be { value, unit }`);
      });
    });
  if (!Array.isArray(json.unsupported_elements) || !json.unsupported_elements.every((u) => typeof u === "string")) errors.push("unsupported_elements must be strings");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, output: json as unknown as LLMOutput };
}
