/**
 * Shared value extractors for rule-based brief interpreters. Every function
 * returns the matched source span so the UI can show provenance.
 */
import { MATERIALS } from "../domains/structural/truss/materials";

export const NUM = "(\\d+(?:[.,]\\d+)?)";
export const GRAVITY_M_S2 = 9.80665;

export function parseNumber(s: string): number {
  return parseFloat(s.replace(",", "."));
}

export function extractLength(text: string, keyword: RegExp): { value: number; span: string } | null {
  const re = new RegExp(`${NUM}\\s*(mm|cm|m|meters?|metres?)\\b(?!\\w)`, "gi");
  const matches = Array.from(text.matchAll(re));
  if (matches.length === 0) return null;
  const scored = matches.map((m) => {
    const idx = m.index ?? 0;
    const window = text.slice(Math.max(0, idx - 25), idx + m[0].length + 25);
    return { m, score: keyword.test(window) ? 1 : 0 };
  });
  scored.sort((a, b) => b.score - a.score);
  const m = scored[0].m;
  const value = parseNumber(m[1]);
  const unit = m[2].toLowerCase();
  const factor = unit === "mm" ? 1e-3 : unit === "cm" ? 1e-2 : 1;
  return { value: value * factor, span: m[0] };
}

export function extractLoad(text: string): { value: number; span: string; note?: string } | null {
  const force = new RegExp(`${NUM}\\s*(kN|N|newtons?)\\b`, "g").exec(text);
  if (force) {
    const v = parseNumber(force[1]);
    const unit = force[2].toLowerCase();
    return { value: unit === "kn" ? v * 1000 : v, span: force[0] };
  }
  const mass = new RegExp(`${NUM}\\s*(kg|kilograms?)\\b`, "gi");
  for (const m of text.matchAll(mass)) {
    // Skip mass budgets ("under 2 kg", "less than 2 kg").
    const before = text.slice(Math.max(0, (m.index ?? 0) - 12), m.index ?? 0);
    if (/(under|below|less than|at most|max(?:imum)?|budget)\s*$/i.test(before)) continue;
    const v = parseNumber(m[1]);
    return { value: v * GRAVITY_M_S2, span: m[0], note: `Converted ${v} kg to ${(v * GRAVITY_M_S2).toFixed(1)} N using g = ${GRAVITY_M_S2} m/s^2.` };
  }
  return null;
}

export function extractMassBudget(text: string): { value: number; span: string } | null {
  const m = new RegExp(`(?:under|below|less than|at most|max(?:imum)?|budget(?: of)?)\\s*${NUM}\\s*(kg|kilograms?)\\b`, "i").exec(text);
  return m ? { value: parseNumber(m[1]), span: m[0] } : null;
}

export function extractSafetyFactor(text: string): { value: number; span: string } | null {
  const patterns = [
    new RegExp(`safety factor (?:of|=|:)?\\s*${NUM}`, "i"),
    new RegExp(`factor of safety (?:of|=|:)?\\s*${NUM}`, "i"),
    new RegExp(`\\bSF\\s*(?:=|of|:)?\\s*${NUM}`, "i"),
    new RegExp(`${NUM}\\s*(?:x|×)?\\s*safety`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return { value: parseNumber(m[1]), span: m[0] };
  }
  return null;
}

export function extractMaterial(text: string): { value: string; span: string } | null {
  const table: Array<[RegExp, string]> = [
    [/\b(steel)\b/i, "steel-a36"],
    [/\b(alumin(?:i)?um)\b/i, "aluminum-6061-t6"],
    [/\b(titanium)\b/i, "titanium-6al-4v"],
  ];
  for (const [re, id] of table) {
    const m = re.exec(text);
    if (m && MATERIALS[id]) return { value: id, span: m[0] };
  }
  return null;
}

export function extractDeflectionRatio(text: string): { value: number; span: string } | null {
  const m = /\b(?:L|span)\s*\/\s*(\d{2,4})\b/i.exec(text);
  return m ? { value: parseInt(m[1], 10), span: m[0] } : null;
}
