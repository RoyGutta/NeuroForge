/**
 * Scoring one interpretation against its reference reading, and the
 * failure taxonomy. Nothing here is a single accuracy number: every
 * dimension is reported separately because they fail differently.
 */
import { realizeSpec } from "../realize";
import { emptySpec, specNumber, specString, type CandidateSpec, type SpecField } from "../spec";
import type { InterpretResult } from "../types";
import { GRAVITY_M_S2, type NumericFieldId } from "../units";
import type { BenchmarkEntry } from "./dataset";

export type FailureCategory =
  | "wrong-domain"
  | "wrong-numeric-value"
  | "wrong-unit-conversion"
  | "wrong-material"
  | "wrong-objective"
  | "missing-value"
  | "missing-constraint"
  | "invented-assumption"
  | "unsupported-domain-miss"
  | "unsupported-element-miss"
  | "ambiguity-ignored"
  | "schema-error"
  | "model-error"
  | "validation-error"
  | "false-decline";

export type FieldOutcome = "correct" | "wrong-value" | "wrong-unit" | "missing" | "invented";

export interface FieldScore {
  field: string;
  expected: number | string | null;
  actual: number | string | null;
  provenance: string | null;
  outcome: FieldOutcome;
}

export interface EntryScore {
  id: string;
  category: BenchmarkEntry["category"];
  domain: BenchmarkEntry["domain"];
  supported: boolean;
  schemaValid: boolean;
  domainCorrect: boolean;
  fields: FieldScore[];
  /** Expected-present numeric fields read correctly / expected-present fields. */
  fieldAccuracy: number | null;
  /** Fields whose brief unit differs from SI (units category): correct / counted. */
  unitAccuracy: number | null;
  missingDetected: number | null;
  ambiguityDetected: boolean | null;
  unsupportedElementsDetected: boolean | null;
  materialCorrect: boolean | null;
  objectiveCorrect: boolean | null;
  validationPassed: boolean;
  semanticallyEquivalent: boolean | null;
  failures: FailureCategory[];
  latencyMs: number | null;
  costUsd: number | null;
  stage: string;
}

const REL = 1e-4;
const close = (a: number, b: number) => Math.abs(a - b) <= REL * Math.max(1, Math.abs(a), Math.abs(b));
/** Ratios that betray a unit slip rather than a misread number. */
const UNIT_RATIOS = [1000, 100, 10, 0.3048, 0.0254, 4.4482216152605, 0.45359237, GRAVITY_M_S2, 1 / 9.80665];
function unitSlip(actual: number, expected: number): boolean {
  if (expected === 0 || actual === 0) return false;
  const r = Math.abs(actual / expected);
  if (UNIT_RATIOS.some((u) => close(r, u) || close(r, 1 / u))) return true;
  return close(Math.abs(actual - expected), 273.15) || close(Math.abs(actual - expected), 32);
}

const CONSTRAINT_FIELDS = new Set(["safetyFactor", "deflectionRatio", "massBudget_kg", "maxTemperature_C"]);

function resultSpec(r: InterpretResult): CandidateSpec | null {
  if (r.supported) return r.spec;
  return r.spec ?? null;
}

/** The problem the reference reading describes, built through the same realize step. */
export function referenceProblem(entry: BenchmarkEntry) {
  if (entry.domain === "unsupported") return null;
  const spec = emptySpec();
  spec.domain = entry.domain;
  spec.detectedDomain = entry.domain;
  const x = entry.expected;
  const fields: SpecField[] = [];
  for (const [k, v] of Object.entries(x.fields ?? {})) fields.push({ id: k as NumericFieldId, value: v as number, provenance: "explicit", confidence: "high" });
  if (x.material) fields.push({ id: "materialId", value: x.material, provenance: "explicit", confidence: "high" });
  fields.push({ id: "objective", value: x.objective ?? "mass_kg", provenance: "inferred", confidence: "high" });
  spec.fields = fields;
  const r = realizeSpec(spec, entry.brief, { interpreterId: "reference", diagnostics: { interpreter: "reference", kind: "rule", schemaVersion: "", stage: "complete", notes: [] } });
  return r.supported ? r.problem : null;
}

/** Structural equality of the engineering content of two problems (ids, dates, text and provenance ignored). */
export function problemsEquivalent(a: ReturnType<typeof referenceProblem>, b: ReturnType<typeof referenceProblem>): boolean {
  if (!a || !b) return false;
  const key = (p: NonNullable<typeof a>) => JSON.stringify({ domain: p.domain, geometry: p.geometry, material: p.material.id, loads: p.loads, supports: p.supports, safetyFactor: p.safetyFactor, objectives: p.objectives.map((o) => o.metric), constraints: p.constraints.map((c) => [c.id, c.metric, c.op, c.limit]), analysis: p.analysis });
  return key(a) === key(b);
}

export function scoreEntry(entry: BenchmarkEntry, r: InterpretResult): EntryScore {
  const x = entry.expected;
  const failures: FailureCategory[] = [];
  const spec = resultSpec(r);
  const schemaValid = !(r.supported === false && r.kind === "schema-error");
  const stage = r.diagnostics.stage;
  const base = { id: entry.id, category: entry.category, domain: entry.domain, latencyMs: r.diagnostics.latencyMs ?? null, costUsd: r.diagnostics.costUsd ?? null, stage, schemaValid };
  if (!r.supported && (r.kind === "model-error" || r.kind === "schema-error")) {
    failures.push(r.kind === "model-error" ? "model-error" : "schema-error");
    return { ...base, supported: false, domainCorrect: false, fields: [], fieldAccuracy: null, unitAccuracy: null, missingDetected: null, ambiguityDetected: null, unsupportedElementsDetected: null, materialCorrect: null, objectiveCorrect: null, validationPassed: false, semanticallyEquivalent: null, failures };
  }
  const actualDomain = r.supported ? r.problem.domain : r.kind === "validation-failed" ? r.detectedDomain : "unsupported";
  if (entry.domain === "unsupported") {
    const declined = !r.supported && r.kind === "unsupported-domain";
    if (!declined) failures.push("unsupported-domain-miss");
    return { ...base, supported: r.supported, domainCorrect: declined, fields: [], fieldAccuracy: null, unitAccuracy: null, missingDetected: null, ambiguityDetected: null, unsupportedElementsDetected: null, materialCorrect: null, objectiveCorrect: null, validationPassed: declined, semanticallyEquivalent: null, failures };
  }
  const domainCorrect = actualDomain === entry.domain;
  if (!r.supported && r.kind === "unsupported-domain") failures.push("false-decline");
  else if (!domainCorrect) failures.push("wrong-domain");
  if (!r.supported && r.kind === "validation-failed") failures.push("validation-error");

  const fields: FieldScore[] = [];
  let correct = 0;
  let unitCorrect = 0;
  let unitCounted = 0;
  for (const [k, v] of Object.entries(x.fields ?? {})) {
    const expected = v as number;
    const f = spec?.fields.find((q) => q.id === k);
    const actual = spec ? specNumber(spec, k as NumericFieldId) : undefined;
    const candidates = x.ambiguities?.find((a) => a.field === k)?.candidates;
    let outcome: FieldOutcome;
    if (actual === undefined) outcome = "missing";
    else if (close(actual, expected) || (candidates?.some((c) => close(actual, c)) ?? false)) outcome = "correct";
    else outcome = unitSlip(actual, expected) ? "wrong-unit" : "wrong-value";
    if (outcome === "correct") correct += 1;
    else if (outcome === "missing") failures.push(CONSTRAINT_FIELDS.has(k) ? "missing-constraint" : "missing-value");
    else failures.push(outcome === "wrong-unit" ? "wrong-unit-conversion" : "wrong-numeric-value");
    const nonSi = f?.rawUnit !== undefined && f.rawUnit !== "" && !["m", "N", "kg", "W", "C", "°C"].includes(f.rawUnit);
    if (entry.category === "units" || nonSi) {
      unitCounted += 1;
      if (outcome === "correct") unitCorrect += 1;
    }
    fields.push({ field: k, expected, actual: actual ?? null, provenance: f?.provenance ?? null, outcome });
  }
  let missingSeen = 0;
  const missingExpected = x.missing ?? [];
  for (const m of missingExpected) {
    const f = spec?.fields.find((q) => q.id === m);
    const invented = f !== undefined && (f.provenance === "explicit" || f.provenance === "inferred") && m !== "objective";
    if (invented) {
      failures.push("invented-assumption");
      fields.push({ field: m, expected: null, actual: f.value, provenance: f.provenance, outcome: "invented" });
    } else missingSeen += 1;
  }
  const materialActual = spec ? specString(spec, "materialId") ?? null : null;
  const materialCorrect = x.material !== undefined || materialActual !== null ? (x.material ?? null) === materialActual : null;
  if (materialCorrect === false) failures.push(x.material && !materialActual ? "missing-value" : "wrong-material");
  const objectiveActual = r.supported ? r.problem.objectives[0]?.metric ?? null : spec ? specString(spec, "objective") ?? null : null;
  const objectiveCorrect = x.objective ? objectiveActual === x.objective : null;
  if (objectiveCorrect === false) failures.push("wrong-objective");
  let ambiguityDetected: boolean | null = null;
  if (x.ambiguities && x.ambiguities.length > 0) {
    const flagged = spec?.ambiguities.map((a) => a.field) ?? [];
    const conflicted = spec?.conflicts.map((c) => c.field) ?? [];
    ambiguityDetected = x.ambiguities.every((a) => flagged.includes(a.field) || conflicted.includes(a.field));
    if (!ambiguityDetected) failures.push("ambiguity-ignored");
  }
  let unsupportedElementsDetected: boolean | null = null;
  if (x.unsupportedElements) {
    unsupportedElementsDetected = (spec?.unsupportedElements.length ?? 0) > 0;
    if (!unsupportedElementsDetected) failures.push("unsupported-element-miss");
  }
  const expectedCount = Object.keys(x.fields ?? {}).length;
  const semantic = r.supported && domainCorrect ? problemsEquivalent(referenceProblem(entry), r.problem) : r.supported ? false : null;
  return {
    ...base,
    supported: r.supported,
    domainCorrect,
    fields,
    fieldAccuracy: expectedCount > 0 ? correct / expectedCount : null,
    unitAccuracy: unitCounted > 0 ? unitCorrect / unitCounted : null,
    missingDetected: missingExpected.length > 0 ? missingSeen / missingExpected.length : null,
    ambiguityDetected,
    unsupportedElementsDetected,
    materialCorrect,
    objectiveCorrect,
    validationPassed: r.supported,
    semanticallyEquivalent: semantic,
    failures: [...new Set(failures)],
  };
}
