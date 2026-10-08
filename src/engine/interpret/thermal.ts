/**
 * Rule-based extraction for heat-sink briefs: dissipated power, temperature
 * limit, ambient temperature, material and objective. A brief the physics
 * cannot satisfy is still accepted; the engine reports the infeasibility.
 */
import { extractMaterial, NUM, parseNumber } from "./extract";
import { explicitField } from "./realize";
import { emptySpec, type CandidateSpec, type SpecField } from "./spec";

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

export function extractThermalSpec(text: string): CandidateSpec {
  const spec = emptySpec();
  spec.domain = "thermal";
  spec.detectedDomain = "thermal";
  const fields: SpecField[] = [];
  const power = extractPower(text);
  if (power) fields.push(explicitField("power_W", power.value, power.span));
  else spec.missing.push("power_W");
  const temps = extractTemperatures(text);
  if (temps.limit) fields.push(explicitField("maxTemperature_C", temps.limit.value, temps.limit.span));
  else spec.missing.push("maxTemperature_C");
  if (temps.ambient) fields.push(explicitField("ambient_C", temps.ambient.value, temps.ambient.span));
  else spec.missing.push("ambient_C");
  const material = extractMaterial(text);
  if (material) fields.push(explicitField("materialId", material.value, material.span));
  else spec.missing.push("materialId");
  const wantsCool = /\b(coolest|lowest temperature|minimi[sz]e (?:the )?(?:temperature|resistance))\b/i.test(text) && !/\b(light|lightweight|mass|weight)\b/i.test(text);
  fields.push({ id: "objective", value: wantsCool ? "thermalResistance_K_W" : "mass_kg", provenance: "inferred", confidence: wantsCool || /\b(light|lightweight|mass|weight|minimi[sz]e)\b/i.test(text) ? "high" : "medium" });
  spec.fields = fields;
  return spec;
}
