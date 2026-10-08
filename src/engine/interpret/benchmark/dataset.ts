/**
 * The interpreter benchmark dataset contract (`benchmarks/interpreter/briefs-<version>.json`).
 * Every entry has a public brief and a reference reading in SI units; the
 * reference is what a careful engineer reads, not what any interpreter
 * produces. Loading validates the file so a malformed entry fails loudly.
 */
import type { DomainId } from "../../core/problem";
import { DOMAIN_FIELDS, type ObjectiveMetric, type SpecFieldId } from "../spec";
import { isNumericFieldId } from "../units";

export type BenchmarkCategory = "basic" | "units" | "linguistic" | "missing" | "ambiguous" | "unsupported" | "infeasible";

export interface ExpectedReading {
  fields?: Partial<Record<string, number>>;
  material?: string;
  objective?: ObjectiveMetric;
  /** Fields the brief does not state; an interpreter must assume them, never mark them explicit. */
  missing?: string[];
  ambiguities?: { field: string; candidates: number[] }[];
  /** The engine will report the baseline and the search infeasible; the interpreter must still accept. */
  infeasible?: boolean;
  unsupportedDomain?: string;
  /** The brief contains elements outside the family that must be flagged. */
  unsupportedElements?: boolean;
}

export interface BenchmarkEntry {
  id: string;
  domain: DomainId | "unsupported";
  category: BenchmarkCategory;
  brief: string;
  expected: ExpectedReading;
}

export interface BenchmarkDataset {
  id: string;
  version: string;
  title: string;
  description: string;
  categories: Record<BenchmarkCategory, string>;
  entries: BenchmarkEntry[];
}

const CATEGORIES: BenchmarkCategory[] = ["basic", "units", "linguistic", "missing", "ambiguous", "unsupported", "infeasible"];
const DOMAINS = ["structural", "structural3d", "robotics", "thermal", "unsupported"];

/** Structural validation of a dataset file; returns every problem found. */
export function validateDataset(raw: unknown): string[] {
  const errors: string[] = [];
  const d = raw as Partial<BenchmarkDataset>;
  if (typeof d?.version !== "string" || !/^\d+\.\d+\.\d+$/.test(d.version)) errors.push("version must be semantic");
  if (!Array.isArray(d?.entries) || d.entries.length === 0) return [...errors, "entries must be a non-empty array"];
  const ids = new Set<string>();
  d.entries.forEach((e, i) => {
    const at = `entries[${i}] (${e?.id ?? "?"})`;
    if (typeof e.id !== "string") errors.push(`${at}: id missing`);
    else if (ids.has(e.id)) errors.push(`${at}: duplicate id`);
    else ids.add(e.id);
    if (!DOMAINS.includes(e.domain)) errors.push(`${at}: unknown domain ${String(e.domain)}`);
    if (!CATEGORIES.includes(e.category)) errors.push(`${at}: unknown category ${String(e.category)}`);
    if (typeof e.brief !== "string" || e.brief.length < 8) errors.push(`${at}: brief too short`);
    const x = e.expected ?? {};
    if (e.domain === "unsupported") {
      if (typeof x.unsupportedDomain !== "string") errors.push(`${at}: unsupported entries need expected.unsupportedDomain`);
      return;
    }
    const allowed = new Set<string>(DOMAIN_FIELDS[e.domain as DomainId]);
    for (const [k, v] of Object.entries(x.fields ?? {})) {
      if (!allowed.has(k) || !isNumericFieldId(k)) errors.push(`${at}: field ${k} is not a numeric ${e.domain} field`);
      if (typeof v !== "number" || !Number.isFinite(v)) errors.push(`${at}: field ${k} must be a finite number`);
    }
    for (const m of x.missing ?? []) if (!allowed.has(m)) errors.push(`${at}: missing field ${m} is not a ${e.domain} field`);
    for (const m of x.missing ?? []) if (x.fields && m in x.fields) errors.push(`${at}: ${m} is both expected and missing`);
    if (!x.objective) errors.push(`${at}: objective required`);
    for (const a of x.ambiguities ?? []) {
      if (!allowed.has(a.field)) errors.push(`${at}: ambiguous field ${a.field} unknown`);
      if (!Array.isArray(a.candidates) || a.candidates.length < 2) errors.push(`${at}: ambiguity needs at least two candidates`);
      else if (x.fields?.[a.field] !== undefined && !a.candidates.includes(x.fields[a.field] as number)) errors.push(`${at}: expected ${a.field} must be one of its candidates`);
    }
  });
  return errors;
}

export function loadDataset(raw: unknown): BenchmarkDataset {
  const errors = validateDataset(raw);
  if (errors.length > 0) throw new Error(`invalid interpreter dataset: ${errors.join("; ")}`);
  return raw as BenchmarkDataset;
}

/** Numeric field ids present in a reading, for scoring. */
export function expectedFieldIds(x: ExpectedReading): SpecFieldId[] {
  return Object.keys(x.fields ?? {}) as SpecFieldId[];
}
