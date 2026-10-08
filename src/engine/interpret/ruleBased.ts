/**
 * Deterministic, rule-based brief interpreter.
 *
 * Covers the four problem families the engine can solve (planar truss
 * bridge, spatial truss girder, planar manipulator, plate-fin heat sink).
 * It detects other domains by keyword and declines them explicitly, which
 * is preferable to producing a bridge for a heat-sink brief. It is the
 * offline fallback, the reference the model-backed interpreters are
 * benchmarked against, and the cross-check inside the hybrid interpreter.
 * Extraction produces a `CandidateSpec`; the shared `realizeSpec` turns it
 * into a validated problem.
 */
import { extractDeflectionRatio, extractLength, extractLoad, extractMassBudget, extractMaterial, extractSafetyFactor } from "./extract";
import { explicitField, realizeSpec } from "./realize";
import { extractRoboticsSpec } from "./robotics";
import { emptySpec, SPEC_SCHEMA_VERSION, type CandidateSpec, type SpecField } from "./spec";
import { extractThermalSpec } from "./thermal";
import type { InterpretResult, ProblemInterpreter } from "./types";

const DOMAIN_KEYWORDS: Array<[string, RegExp]> = [
  ["thermal", /\b(heat ?sink|heatsink|thermal|processor|cpu|temperature|cooling|°c|\bdeg)\b/i],
  ["robotics", /\b(robot|robotic|manipulator|gripper|torque|actuator|arm)\b/i],
  ["aerospace", /\b(drone|uav|quadcopter|wing|aircraft|airframe|fuselage)\b/i],
  ["fluids", /\b(duct|airflow|air flow|cfd|pressure (?:loss|drop)|pipe|nozzle)\b/i],
  ["structural", /\b(bridge|truss|beam|span|girder|footbridge|structure)\b/i],
];
const SPATIAL = /\b(3d|3-d|three[- ]dimensional|spatial|space truss|space frame)\b/i;

export const RULE_INTERPRETER_ID = "rule-based-v1";

/** Keyword-based family detection; null when no family keyword appears. */
export function detectDomain(text: string): string | null {
  for (const [domain, re] of DOMAIN_KEYWORDS) if (re.test(text)) return domain;
  return null;
}

function extractStructuralSpec(text: string, detected: string | null): CandidateSpec {
  const spec = emptySpec();
  const spatial = SPATIAL.test(text);
  spec.domain = spatial ? "structural3d" : "structural";
  spec.detectedDomain = detected ?? "structural";
  const fields: SpecField[] = [];
  const span = extractLength(text, /\b(span|spanning|spans|long|length)\b/i);
  if (span) fields.push(explicitField("span_m", span.value, span.span));
  else spec.missing.push("span_m");
  const load = extractLoad(text);
  if (load) {
    const f = explicitField("load_N", load.value, load.span, load.note);
    if (load.note) {
      f.rawUnit = "kg";
      f.rawValue = load.value / 9.80665;
    }
    fields.push(f);
  } else spec.missing.push("load_N");
  const sf = extractSafetyFactor(text);
  if (sf) fields.push(explicitField("safetyFactor", sf.value, sf.span));
  else spec.missing.push("safetyFactor");
  const material = extractMaterial(text);
  if (material) fields.push(explicitField("materialId", material.value, material.span));
  else spec.missing.push("materialId");
  const deflection = extractDeflectionRatio(text);
  if (deflection) fields.push(explicitField("deflectionRatio", deflection.value, deflection.span));
  const wantsStiffness = /\b(stiff|stiffness|deflection|displacement|rigid)\b/i.test(text) && !/\b(mass|weight|light|lightweight|material)\b/i.test(text.replace(/deflection limit/i, ""));
  fields.push({ id: "objective", value: wantsStiffness ? "compliance_J" : "mass_kg", provenance: "inferred", confidence: wantsStiffness || /\b(light|lightweight|mass|weight|minimi[sz]e)\b/i.test(text) ? "high" : "medium" });
  if (wantsStiffness && !spatial) {
    const massBudget = extractMassBudget(text);
    if (massBudget) fields.push(explicitField("massBudget_kg", massBudget.value, massBudget.span));
    else spec.missing.push("massBudget_kg");
  }
  if (!detected) spec.warnings.push("No structural keywords found; interpreted as a truss bridge because span/load were present.");
  spec.fields = fields;
  return spec;
}

/** Extraction only: the candidate specification the rules read from a brief. */
export function extractRuleSpec(brief: string): CandidateSpec {
  const text = brief.trim();
  const detected = detectDomain(text);
  if (detected === "robotics") return extractRoboticsSpec(text);
  if (detected === "thermal") return extractThermalSpec(text);
  if (detected && detected !== "structural") {
    const spec = emptySpec();
    spec.detectedDomain = detected;
    return spec;
  }
  return extractStructuralSpec(text, detected);
}

export const ruleBasedInterpreter: ProblemInterpreter = {
  id: RULE_INTERPRETER_ID,
  label: "Rule-based interpreter",
  kind: "rule",
  interpret(brief: string): InterpretResult {
    const text = brief.trim();
    const t0 = Date.now();
    const spec = extractRuleSpec(text);
    return realizeSpec(spec, text, { interpreterId: RULE_INTERPRETER_ID, diagnostics: { interpreter: RULE_INTERPRETER_ID, kind: "rule", schemaVersion: SPEC_SCHEMA_VERSION, stage: "complete", latencyMs: Date.now() - t0, costUsd: 0, notes: [] } });
  },
};
