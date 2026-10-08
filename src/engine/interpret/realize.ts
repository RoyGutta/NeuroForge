/**
 * The deterministic half of every interpreter: candidate specification ->
 * template -> `EngineeringProblem` -> domain validation. Interpreters only
 * decide what the brief says; this module decides what problem that makes,
 * records every default as an assumption, and rejects anything the domain
 * validator rejects. The model-backed interpreters share it with the
 * rule-based one, so the only difference between them is the extraction.
 */
import type { Assumption, ConstraintSpec, DomainId, EngineeringProblem, ValidationIssue } from "../core/problem";
import { compileProblem, validateProblem } from "../domains/registry";
import { createManipulatorProblem } from "../domains/robotics/manipulator/template";
import { createSpaceTrussProblem } from "../domains/structural/truss3d/template";
import { createTrussBridgeProblem } from "../domains/structural/truss/template";
import { createHeatSinkProblem } from "../domains/thermal/finArray/template";
import { OBJECTIVE_LABEL, REQUIRED_FIELDS, SPEC_SCHEMA_VERSION, specNumber, specString, type CandidateSpec, type ObjectiveMetric, type SpecField } from "./spec";
import type { ExtractedValue, InterpretDiagnostics, InterpretResult } from "./types";
import { isNumericFieldId } from "./units";

export interface RealizeOptions {
  interpreterId: string;
  diagnostics: InterpretDiagnostics;
  /** Recorded in the problem's provenance for model-backed interpreters. */
  model?: string;
  promptVersion?: string;
}

interface Default {
  value: string;
  reason: string;
}

/** Defaults for missing required fields, with the reasons shown to the user. */
const DEFAULTS: Record<DomainId, Partial<Record<string, Default>>> = {
  structural: {
    span_m: { value: "2.0 m", reason: "No span or length was found in the brief; a 2 m span is the canonical demonstration case." },
    load_N: { value: "500 N", reason: "No load was found in the brief; 500 N is the canonical demonstration case." },
  },
  structural3d: {
    span_m: { value: "3.0 m", reason: "No span was found in the brief; a 3 m span is the canonical space-truss demonstration case." },
    load_N: { value: "2000 N", reason: "No load was found in the brief; 2 kN is the canonical space-truss demonstration case." },
  },
  robotics: {
    payload_kg: { value: "2 kg", reason: "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case." },
    reach_m: { value: "0.8 m", reason: "No reach or working radius was found in the brief; 0.8 m is the canonical demonstration case." },
  },
  thermal: {
    power_W: { value: "40 W", reason: "No dissipated power was found in the brief; 40 W is a representative natural-convection module." },
    maxTemperature_C: { value: "80 C", reason: "No temperature limit was found in the brief; 80 C is a common component case-temperature limit." },
  },
};
const DEFAULT_NUMBER: Record<DomainId, Record<string, number>> = {
  structural: { span_m: 2, load_N: 500 },
  structural3d: { span_m: 3, load_N: 2000 },
  robotics: { payload_kg: 2, reach_m: 0.8 },
  thermal: { power_W: 40, maxTemperature_C: 80 },
};
const ASSUMPTION_FIELD: Record<string, string> = { span_m: "span", load_N: "load", payload_kg: "payload", reach_m: "reach", power_W: "power", maxTemperature_C: "temperature", massBudget_kg: "mass-budget" };
const ASSUMPTION_LABEL: Record<string, string> = { span_m: "span", load_N: "load", payload_kg: "payload", reach_m: "reach", power_W: "power", maxTemperature_C: "temperatureLimit", massBudget_kg: "massBudget" };

/** The user-facing extraction list, in the interpreter's order. */
export function extractedFromSpec(spec: CandidateSpec): ExtractedValue[] {
  const out: ExtractedValue[] = [];
  for (const f of spec.fields) {
    if (f.provenance === "assumed" || f.provenance === "unknown") continue;
    const e: ExtractedValue = { field: f.id === "materialId" ? "material" : f.id, value: f.id === "objective" ? OBJECTIVE_LABEL[f.value as ObjectiveMetric] ?? f.value : f.value, confidence: f.confidence, provenance: f.provenance };
    if (f.sourceSpan !== undefined) e.sourceSpan = f.sourceSpan;
    if (f.note !== undefined) e.note = f.note;
    out.push(e);
  }
  if (spec.domain === "structural3d") out.push({ field: "domain", value: "structural3d", confidence: "high", provenance: "inferred" });
  return out;
}

/** Consistency checks on the specification itself, before any template runs. */
export function checkSpec(spec: CandidateSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const f of spec.fields) {
    if (!isNumericFieldId(f.id)) continue;
    const v = f.value;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      issues.push({ path: f.id, message: "must be a finite number" });
      continue;
    }
    if (f.id === "safetyFactor" && v < 1) issues.push({ path: f.id, message: "safety factor must be >= 1" });
    else if (f.id !== "maxTemperature_C" && f.id !== "ambient_C" && f.id !== "safetyFactor" && !(v > 0)) issues.push({ path: f.id, message: "must be positive" });
  }
  const limit = specNumber(spec, "maxTemperature_C");
  const ambient = specNumber(spec, "ambient_C");
  if (limit !== undefined && ambient !== undefined && !(limit > ambient)) issues.push({ path: "maxTemperature_C", message: "temperature limit must exceed the ambient temperature" });
  return issues;
}

function missingAssumptions(spec: CandidateSpec, domain: DomainId): Assumption[] {
  const out: Assumption[] = [];
  for (const id of REQUIRED_FIELDS[domain]) {
    if (specNumber(spec, id) !== undefined) continue;
    const d = DEFAULTS[domain][id];
    if (d) out.push({ id: `assume-${ASSUMPTION_FIELD[id]}`, field: ASSUMPTION_LABEL[id], value: d.value, reason: d.reason, confidence: "low" });
  }
  return out;
}

function buildProblem(spec: CandidateSpec, domain: DomainId, brief: string): { problem: EngineeringProblem; extra: Assumption[]; title: string } {
  const num = (id: Parameters<typeof specNumber>[1]) => specNumber(spec, id) ?? DEFAULT_NUMBER[domain][id];
  const sf = specNumber(spec, "safetyFactor");
  const materialId = specString(spec, "materialId");
  const objective = (specString(spec, "objective") ?? "mass_kg") as ObjectiveMetric;
  const extra = missingAssumptions(spec, domain);
  if (domain === "robotics") {
    const wantsMass = objective === "mass_kg";
    const problem = createManipulatorProblem({ payload_kg: num("payload_kg"), reach_m: num("reach_m"), safetyFactor: sf, materialId, objectiveMetric: wantsMass ? "mass_kg" : "peakTorque_Nm", brief, title: wantsMass ? "Lightest manipulator study" : "Payload manipulator study" });
    return { problem, extra, title: problem.title };
  }
  if (domain === "thermal") {
    const wantsCool = objective === "thermalResistance_K_W";
    const problem = createHeatSinkProblem({ power_W: num("power_W"), maxTemperature_C: num("maxTemperature_C"), ambient_C: specNumber(spec, "ambient_C"), materialId, objectiveMetric: wantsCool ? "thermalResistance_K_W" : "mass_kg", massBudget_kg: wantsCool ? specNumber(spec, "massBudget_kg") : undefined, brief, title: wantsCool ? "Coolest heat sink study" : "Heat sink study" });
    return { problem, extra, title: problem.title };
  }
  const base = { span_m: num("span_m"), load_N: num("load_N"), safetyFactor: sf, materialId, deflectionRatio: specNumber(spec, "deflectionRatio"), brief };
  if (domain === "structural3d") {
    const problem = createSpaceTrussProblem(base);
    return { problem, extra, title: "Space truss girder study" };
  }
  const wantsStiffness = objective === "compliance_J";
  let problem = createTrussBridgeProblem(base);
  if (wantsStiffness) {
    // Minimising compliance alone is unbounded (heavier is always stiffer),
    // so a mass budget is required: the brief's, or the conventional baseline's mass.
    const massBudget = specNumber(spec, "massBudget_kg");
    const budget = massBudget ?? compileProblem(problem).evaluate(compileProblem(problem).baseline.parameters).metrics.mass_kg;
    const constraint: ConstraintSpec = { id: "mass-budget", metric: "mass_kg", op: "<=", limit: budget, label: `Mass <= ${budget.toFixed(3)} kg`, source: massBudget !== undefined ? "user" : "assumed" };
    problem = createTrussBridgeProblem({ ...base, extraConstraints: [constraint], objectiveMetric: "compliance_J" });
    if (massBudget === undefined) {
      extra.push({ id: "assume-mass-budget", field: "massBudget", value: `${budget.toFixed(3)} kg (mass of the conventional baseline)`, reason: "A stiffness objective needs a mass budget or the stiffest design is simply the heaviest; the brief gave none.", confidence: "medium" });
    }
  }
  return { problem, extra, title: wantsStiffness ? "Stiffest bridge within a mass budget" : "Lightweight bridge study" };
}

/** Builds, validates and packages the problem a candidate specification describes. */
export function realizeSpec(spec: CandidateSpec, brief: string, opts: RealizeOptions): InterpretResult {
  const diagnostics = { ...opts.diagnostics, schemaVersion: opts.diagnostics.schemaVersion || SPEC_SCHEMA_VERSION };
  if (spec.domain === null) {
    const detected = spec.detectedDomain;
    const reason = spec.unsupportedReason ?? (detected ? `This brief reads as a ${detected} problem. NeuroForge currently solves planar truss bridges, planar manipulators and plate-fin heat sinks; ${detected} domains are on the roadmap and are not simulated yet.` : "The brief does not describe a problem NeuroForge can simulate.");
    return { supported: false, kind: "unsupported-domain", reason, detectedDomain: detected, spec, diagnostics: { ...diagnostics, stage: "complete" } };
  }
  const specIssues = checkSpec(spec);
  if (specIssues.length > 0) {
    return { supported: false, kind: "validation-failed", reason: `The specification is inconsistent: ${specIssues.map((i) => `${i.path} ${i.message}`).join("; ")}.`, detectedDomain: spec.domain, spec, validation: specIssues, diagnostics: { ...diagnostics, stage: "validation" } };
  }
  const { problem, extra, title } = buildProblem(spec, spec.domain, brief);
  problem.assumptions = [...extra, ...problem.assumptions];
  problem.provenance = { source: "interpreter", sourceText: brief, interpreter: opts.interpreterId, ...(opts.model ? { model: opts.model } : {}), ...(opts.promptVersion ? { promptVersion: opts.promptVersion } : {}) };
  problem.title = title;
  const validation = validateProblem(problem);
  if (validation.length > 0) {
    return { supported: false, kind: "validation-failed", reason: `The domain validator rejected the specification: ${validation.map((i) => `${i.path}: ${i.message}`).join("; ")}.`, detectedDomain: spec.domain, spec, problem, validation, diagnostics: { ...diagnostics, stage: "validation" } };
  }
  return { supported: true, problem, extracted: extractedFromSpec(spec), warnings: spec.warnings.slice(), spec, ambiguities: spec.ambiguities, unsupportedElements: spec.unsupportedElements, conflicts: spec.conflicts, validation, diagnostics: { ...diagnostics, stage: "complete" } };
}

/** Convenience for rule-based interpreters: a field with explicit provenance from a regex match. */
export function explicitField(id: SpecField["id"], value: number | string, sourceSpan?: string, note?: string): SpecField {
  const f: SpecField = { id, value, provenance: "explicit", confidence: "high" };
  if (sourceSpan !== undefined) f.sourceSpan = sourceSpan;
  if (note !== undefined) f.note = note;
  return f;
}
