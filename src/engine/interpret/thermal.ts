/**
 * Rule-based extraction for heat-sink briefs: dissipated power, temperature
 * limit, ambient temperature, material and objective. A brief the physics
 * cannot satisfy is still accepted; the engine reports the infeasibility.
 */
import type { Assumption } from "../core/problem";
import { createHeatSinkProblem } from "../domains/thermal/finArray/template";
import { extractMaterial, NUM, parseNumber } from "./extract";
import type { ExtractedValue, InterpretResult } from "./types";

const TEMP_UNIT = "(?:°\\s*C|º\\s*C|deg(?:rees)?\\s*C|\\bC\\b|celsius)";

function extractPower(text: string): { value: number; span: string } | null {
  const m = new RegExp(`${NUM}\\s*(kW|W|watts?)\\b`, "i").exec(text);
  if (!m) return null;
  const v = parseNumber(m[1]);
  return { value: /^kw$/i.test(m[2]) ? v * 1000 : v, span: m[0] };
}

function extractTemperatures(text: string): { limit?: { value: number; span: string }; ambient?: { value: number; span: string } } {
  const out: { limit?: { value: number; span: string }; ambient?: { value: number; span: string } } = {};
  const re = new RegExp(`${NUM}\\s*${TEMP_UNIT}`, "gi");
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    const before = text.slice(Math.max(0, idx - 30), idx);
    const value = parseNumber(m[1]);
    if (/\b(ambient|room|surroundings?|air at|environment)\b/i.test(before)) {
      if (!out.ambient) out.ambient = { value, span: m[0] };
    } else if (!out.limit) out.limit = { value, span: m[0] };
  }
  return out;
}

export function interpretThermalBrief(text: string, interpreterId: string): InterpretResult {
  const extracted: ExtractedValue[] = [];
  const assumptions: Assumption[] = [];
  const power = extractPower(text);
  if (power) extracted.push({ field: "power_W", value: power.value, confidence: "high", sourceSpan: power.span });
  else assumptions.push({ id: "assume-power", field: "power", value: "40 W", reason: "No dissipated power was found in the brief; 40 W is a representative natural-convection module.", confidence: "low" });
  const temps = extractTemperatures(text);
  if (temps.limit) extracted.push({ field: "maxTemperature_C", value: temps.limit.value, confidence: "high", sourceSpan: temps.limit.span });
  else assumptions.push({ id: "assume-temperature", field: "temperatureLimit", value: "80 C", reason: "No temperature limit was found in the brief; 80 C is a common component case-temperature limit.", confidence: "low" });
  if (temps.ambient) extracted.push({ field: "ambient_C", value: temps.ambient.value, confidence: "high", sourceSpan: temps.ambient.span });
  const material = extractMaterial(text);
  if (material) extracted.push({ field: "material", value: material.value, confidence: "high", sourceSpan: material.span });
  const wantsCool = /\b(coolest|lowest temperature|minimi[sz]e (?:the )?(?:temperature|resistance))\b/i.test(text) && !/\b(light|lightweight|mass|weight)\b/i.test(text);
  extracted.push({ field: "objective", value: wantsCool ? "minimize thermal resistance" : "minimize mass", confidence: wantsCool || /\b(light|lightweight|mass|weight|minimi[sz]e)\b/i.test(text) ? "high" : "medium" });
  const problem = createHeatSinkProblem({
    power_W: power?.value ?? 40,
    maxTemperature_C: temps.limit?.value ?? 80,
    ambient_C: temps.ambient?.value,
    materialId: material?.value,
    objectiveMetric: wantsCool ? "thermalResistance_K_W" : "mass_kg",
    brief: text,
    title: wantsCool ? "Coolest heat sink study" : "Heat sink study",
  });
  problem.assumptions = [...assumptions, ...problem.assumptions];
  problem.provenance = { source: "interpreter", sourceText: text, interpreter: interpreterId };
  return { supported: true, problem, extracted, warnings: [] };
}
