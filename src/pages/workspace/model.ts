/**
 * Workspace view-model helpers: form <-> problem mapping and defaults.
 */
import type { EngineeringProblem } from "../../engine/core/problem";
import { DEFAULT_MATERIAL_ID } from "../../engine/domains/structural/truss/materials";
import { createTrussBridgeProblem } from "../../engine/domains/structural/truss/template";
import type { ExtractedValue } from "../../engine/interpret";

export type FieldSource = "user" | "brief" | "assumed";

export interface SpecForm {
  brief: string;
  span_m: string;
  load_N: string;
  safetyFactor: string;
  materialId: string;
  panels: string;
  deflectionRatio: string;
  includeSelfWeight: boolean;
  objective: "mass_kg" | "compliance_J" | "multi";
  massBudget_kg: string;
  sources: Record<string, FieldSource>;
}

export interface RunSettings {
  optimizerId: string;
  params: Record<string, number>;
  maxEvaluations: number;
  seed: number;
  seedBaseline: boolean;
}

export const DEFAULT_BRIEF = "Design a lightweight bridge spanning 2 meters that supports 500 N.";

export function defaultForm(): SpecForm {
  return {
    brief: DEFAULT_BRIEF,
    span_m: "2",
    load_N: "500",
    safetyFactor: "2",
    materialId: DEFAULT_MATERIAL_ID,
    panels: "4",
    deflectionRatio: "250",
    includeSelfWeight: true,
    objective: "mass_kg",
    massBudget_kg: "",
    sources: { span_m: "brief", load_N: "brief", safetyFactor: "assumed", materialId: "assumed" },
  };
}

export function defaultSettings(): RunSettings {
  return {
    optimizerId: "evolutionary",
    params: { populationSize: 60 },
    maxEvaluations: 12000,
    seed: 42,
    seedBaseline: true,
  };
}

export function formFromProblem(p: EngineeringProblem, extracted: ExtractedValue[] = []): SpecForm {
  const g = p.geometry;
  const has = (f: string) => extracted.some((e) => e.field === f);
  const assumed = new Set(p.assumptions.map((a) => a.field));
  const defl = p.constraints.find((c) => c.id === "deflection");
  const budget = p.constraints.find((c) => c.id === "mass-budget");
  const src = (field: string, assumedField: string): FieldSource =>
    has(field) ? "brief" : assumed.has(assumedField) ? "assumed" : "user";
  return {
    brief: p.provenance.sourceText ?? p.brief,
    span_m: String(g.span_m),
    load_N: String(p.loads[0]?.magnitude_N ?? 0),
    safetyFactor: String(p.safetyFactor),
    materialId: p.material.id,
    panels: String(g.panels),
    deflectionRatio: defl ? String(Math.round(g.span_m / defl.limit)) : "250",
    includeSelfWeight: p.analysis.includeSelfWeight,
    objective: p.objectives.length > 1 ? "multi" : p.objectives[0]?.metric === "compliance_J" ? "compliance_J" : "mass_kg",
    massBudget_kg: budget ? String(budget.limit) : "",
    sources: {
      span_m: src("span_m", "span"),
      load_N: src("load_N", "load"),
      safetyFactor: src("safetyFactor", "safetyFactor"),
      materialId: src("material", "material"),
    },
  };
}

export function problemFromForm(form: SpecForm, base?: EngineeringProblem): EngineeringProblem {
  const num = (s: string) => Number(s);
  const sf = form.sources.safetyFactor === "assumed" ? undefined : num(form.safetyFactor);
  const mat = form.sources.materialId === "assumed" ? undefined : form.materialId;
  const extraConstraints =
    form.objective === "compliance_J" && form.massBudget_kg !== ""
      ? [
          {
            id: "mass-budget",
            metric: "mass_kg",
            op: "<=" as const,
            limit: num(form.massBudget_kg),
            label: `Mass <= ${num(form.massBudget_kg).toFixed(3)} kg`,
            source: "user" as const,
          },
        ]
      : [];
  const p = createTrussBridgeProblem({
    span_m: num(form.span_m),
    load_N: num(form.load_N),
    safetyFactor: sf,
    materialId: mat,
    panels: num(form.panels),
    deflectionRatio: num(form.deflectionRatio),
    includeSelfWeight: form.includeSelfWeight,
    objectiveMetric: form.objective,
    extraConstraints,
    brief: form.brief,
    id: base?.id,
    title: base?.title,
  });
  if (base) {
    p.version = base.version + 1;
    p.provenance = { ...base.provenance, source: "user" };
    // Keep interpreter-derived assumptions about span/load if they still apply.
    const carried = base.assumptions.filter(
      (a) => (a.field === "span" && form.sources.span_m === "assumed") || (a.field === "load" && form.sources.load_N === "assumed")
    );
    p.assumptions = [...carried, ...p.assumptions];
  }
  return p;
}

export function formatNumber(v: number | undefined | null, digits = 2): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatMetric(id: string, v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  switch (id) {
    case "mass_kg":
      return `${formatNumber(v, 3)} kg`;
    case "maxStress_Pa":
      return `${formatNumber(v / 1e6, 1)} MPa`;
    case "maxDisplacement_m":
      return `${formatNumber(v * 1000, 2)} mm`;
    case "compliance_J":
      return `${formatNumber(v * 1000, 2)} mJ`;
    case "stressUtilization":
    case "bucklingUtilization":
      return `${formatNumber(v * 100, 0)} %`;
    default:
      return formatNumber(v, 3);
  }
}
