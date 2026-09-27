/**
 * Workspace view-model helpers: form <-> problem mapping and defaults.
 */
import type { DomainId, EngineeringProblem } from "../../engine/core/problem";
import { createManipulatorProblem } from "../../engine/domains/robotics/manipulator/template";
import { GRAVITY_M_S2 } from "../../engine/domains/robotics/manipulator/statics";
import { DEFAULT_MATERIAL_ID } from "../../engine/domains/structural/truss/materials";
import { createTrussBridgeProblem } from "../../engine/domains/structural/truss/template";
import type { ExtractedValue } from "../../engine/interpret";

export type FieldSource = "user" | "brief" | "assumed";

export type ObjectiveChoice = "mass_kg" | "compliance_J" | "multi" | "peakTorque_Nm";

export interface SpecForm {
  brief: string;
  domain: DomainId;
  /** Robotics: payload mass and reach; tip deflection limit in millimetres. */
  payload_kg: string;
  reach_m: string;
  tipDeflection_mm: string;
  span_m: string;
  load_N: string;
  safetyFactor: string;
  materialId: string;
  panels: string;
  deflectionRatio: string;
  includeSelfWeight: boolean;
  objective: ObjectiveChoice;
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
export const DEFAULT_ROBOTICS_BRIEF = "Design a two-link arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.";

export const DOMAIN_LABELS: Record<DomainId, string> = { structural: "Structural: truss bridge", robotics: "Robotics: planar manipulator" };

export function defaultForm(): SpecForm {
  return {
    brief: DEFAULT_BRIEF,
    domain: "structural",
    payload_kg: "2",
    reach_m: "0.8",
    tipDeflection_mm: "2",
    span_m: "2",
    load_N: "500",
    safetyFactor: "2",
    materialId: DEFAULT_MATERIAL_ID,
    panels: "4",
    deflectionRatio: "250",
    includeSelfWeight: true,
    objective: "mass_kg",
    massBudget_kg: "",
    sources: { span_m: "brief", load_N: "brief", payload_kg: "brief", reach_m: "brief", safetyFactor: "assumed", materialId: "assumed" },
  };
}

/** Form defaults when the user switches domain: canonical brief and objective. */
export function formForDomain(form: SpecForm, domain: DomainId): SpecForm {
  const base = defaultForm();
  return {
    ...form,
    domain,
    brief: domain === "robotics" ? DEFAULT_ROBOTICS_BRIEF : DEFAULT_BRIEF,
    objective: domain === "robotics" ? "peakTorque_Nm" : "mass_kg",
    sources: { ...base.sources, safetyFactor: form.sources.safetyFactor, materialId: form.sources.materialId },
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
  const common = {
    brief: p.provenance.sourceText ?? p.brief,
    safetyFactor: String(p.safetyFactor),
    materialId: p.material.id,
    includeSelfWeight: p.analysis.includeSelfWeight,
    massBudget_kg: budget ? String(budget.limit) : "",
  };
  if (g.kind === "planar-manipulator") {
    const d = defaultForm();
    return {
      ...d,
      ...common,
      domain: "robotics",
      payload_kg: String(Number((p.loads[0].magnitude_N / GRAVITY_M_S2).toPrecision(10))),
      reach_m: String(g.reach_m),
      tipDeflection_mm: defl ? String(Number((defl.limit * 1000).toPrecision(6))) : d.tipDeflection_mm,
      objective: p.objectives.length > 1 ? "multi" : p.objectives[0]?.metric === "mass_kg" ? "mass_kg" : "peakTorque_Nm",
      sources: {
        payload_kg: src("payload_kg", "payload"),
        reach_m: src("reach_m", "reach"),
        safetyFactor: src("safetyFactor", "safetyFactor"),
        materialId: src("material", "material"),
      },
    };
  }
  return {
    ...defaultForm(),
    ...common,
    domain: "structural",
    span_m: String(g.span_m),
    load_N: String(p.loads[0]?.magnitude_N ?? 0),
    panels: String(g.panels),
    deflectionRatio: defl ? String(Math.round(g.span_m / defl.limit)) : "250",
    objective: p.objectives.length > 1 ? "multi" : p.objectives[0]?.metric === "compliance_J" ? "compliance_J" : "mass_kg",
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
  if (form.domain === "robotics") {
    const p = createManipulatorProblem({
      payload_kg: num(form.payload_kg),
      reach_m: num(form.reach_m),
      safetyFactor: sf,
      materialId: mat,
      deflectionLimit_m: num(form.tipDeflection_mm) / 1000,
      objectiveMetric: form.objective === "multi" ? "multi" : form.objective === "mass_kg" ? "mass_kg" : "peakTorque_Nm",
      brief: form.brief,
      id: base?.id,
      title: base?.title,
    });
    if (base) {
      p.version = base.version + 1;
      p.provenance = { ...base.provenance, source: "user" };
      const carried = base.assumptions.filter(
        (a) => (a.field === "payload" && form.sources.payload_kg === "assumed") || (a.field === "reach" && form.sources.reach_m === "assumed")
      );
      p.assumptions = [...carried, ...p.assumptions];
    }
    return p;
  }
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
    objectiveMetric: form.objective === "peakTorque_Nm" ? "mass_kg" : form.objective,
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
    case "unreachableFraction":
      return `${formatNumber(v * 100, 0)} %`;
    case "peakTorque_Nm":
      return `${formatNumber(v, 2)} N m`;
    case "maxTipDeflection_m":
      return `${formatNumber(v * 1000, 2)} mm`;
    default:
      return formatNumber(v, 3);
  }
}
