/**
 * Aggregates per-entry scores into the metric set reported for an
 * interpreter: separate rates per dimension, failure counts by category,
 * cost and latency. Rates are over the entries where the dimension applies.
 */
import type { EntryScore, FailureCategory } from "./score";

export interface Rate {
  value: number | null;
  n: number;
}

export interface InterpreterMetrics {
  entries: number;
  schemaValidity: Rate;
  domainClassification: Rate;
  fieldExtraction: Rate;
  unitNormalization: Rate;
  missingInformation: Rate;
  ambiguityHandling: Rate;
  unsupportedDetection: Rate;
  unsupportedElementDetection: Rate;
  materialAccuracy: Rate;
  objectiveAccuracy: Rate;
  validationPassRate: Rate;
  semanticEquivalence: Rate;
  failures: Partial<Record<FailureCategory, number>>;
  byCategory: Record<string, { entries: number; semanticEquivalence: Rate; fieldExtraction: Rate }>;
  latencyMs: { mean: number | null; median: number | null; max: number | null };
  costUsd: { total: number | null; mean: number | null };
}

function rate(values: (number | boolean | null)[]): Rate {
  const xs = values.filter((v): v is number | boolean => v !== null).map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
  return { value: xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null, n: xs.length };
}

function stats(values: (number | null)[]) {
  const xs = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (xs.length === 0) return { mean: null, median: null, max: null };
  return { mean: xs.reduce((a, b) => a + b, 0) / xs.length, median: xs[Math.floor(xs.length / 2)], max: xs[xs.length - 1] };
}

export function aggregateScores(scores: EntryScore[]): InterpreterMetrics {
  const supportedEntries = scores.filter((s) => s.domain !== "unsupported");
  const failures: Partial<Record<FailureCategory, number>> = {};
  for (const s of scores) for (const f of s.failures) failures[f] = (failures[f] ?? 0) + 1;
  const byCategory: InterpreterMetrics["byCategory"] = {};
  for (const c of new Set(scores.map((s) => s.category))) {
    const xs = scores.filter((s) => s.category === c);
    byCategory[c] = { entries: xs.length, semanticEquivalence: rate(xs.map((s) => (s.domain === "unsupported" ? s.domainCorrect : s.semanticallyEquivalent))), fieldExtraction: rate(xs.map((s) => s.fieldAccuracy)) };
  }
  const costs = scores.map((s) => s.costUsd);
  const known = costs.filter((c): c is number => c !== null);
  return {
    entries: scores.length,
    schemaValidity: rate(scores.map((s) => s.schemaValid)),
    domainClassification: rate(scores.map((s) => s.domainCorrect)),
    fieldExtraction: rate(supportedEntries.map((s) => s.fieldAccuracy)),
    unitNormalization: rate(supportedEntries.map((s) => s.unitAccuracy)),
    missingInformation: rate(supportedEntries.map((s) => s.missingDetected)),
    ambiguityHandling: rate(supportedEntries.map((s) => s.ambiguityDetected)),
    unsupportedDetection: rate(scores.filter((s) => s.domain === "unsupported").map((s) => s.domainCorrect)),
    unsupportedElementDetection: rate(supportedEntries.map((s) => s.unsupportedElementsDetected)),
    materialAccuracy: rate(supportedEntries.map((s) => s.materialCorrect)),
    objectiveAccuracy: rate(supportedEntries.map((s) => s.objectiveCorrect)),
    validationPassRate: rate(supportedEntries.map((s) => s.validationPassed)),
    semanticEquivalence: rate(supportedEntries.map((s) => s.semanticallyEquivalent)),
    failures,
    byCategory,
    latencyMs: stats(scores.map((s) => s.latencyMs)),
    costUsd: { total: known.length > 0 ? known.reduce((a, b) => a + b, 0) : null, mean: known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : null },
  };
}
