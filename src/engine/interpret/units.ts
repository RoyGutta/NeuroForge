/**
 * Deterministic unit normalisation for interpreted quantities.
 *
 * Every number an interpreter extracts arrives with the unit written in the
 * brief; this module converts it to the engine's SI field unit (m, N, kg,
 * W, degrees Celsius, radians) with a stated factor so the conversion is
 * auditable. No interpreter, rule-based or model-backed, converts units
 * itself. Mass given for a force field is converted with standard gravity
 * and the conversion is recorded as a note; the reverse holds for a payload
 * given as a force.
 */

export type Dimension = "length" | "force" | "mass" | "power" | "temperature" | "angle" | "dimensionless";

export interface UnitDef {
  dimension: Dimension;
  /** Multiply by this to reach the SI field unit. */
  factor: number;
  /** Added after scaling (temperature scales). */
  offset?: number;
  canonical: string;
}

export const GRAVITY_M_S2 = 9.80665;
const LBF_N = 4.4482216152605;
const LB_KG = 0.45359237;

const UNITS: Record<string, UnitDef> = {};
function def(names: string[], dimension: Dimension, factor: number, canonical: string, offset?: number) {
  for (const n of names) UNITS[n.toLowerCase()] = { dimension, factor, canonical, ...(offset !== undefined ? { offset } : {}) };
}
def(["m", "meter", "meters", "metre", "metres"], "length", 1, "m");
def(["mm", "millimeter", "millimeters", "millimetre", "millimetres"], "length", 1e-3, "m");
def(["cm", "centimeter", "centimeters", "centimetre", "centimetres"], "length", 1e-2, "m");
def(["km", "kilometer", "kilometers", "kilometre", "kilometres"], "length", 1e3, "m");
def(["in", "inch", "inches", "\""], "length", 0.0254, "m");
def(["ft", "foot", "feet", "'"], "length", 0.3048, "m");
def(["n", "newton", "newtons"], "force", 1, "N");
def(["kn", "kilonewton", "kilonewtons"], "force", 1e3, "N");
def(["mn", "meganewton", "meganewtons"], "force", 1e6, "N");
def(["lbf", "pound-force", "pounds-force"], "force", LBF_N, "N");
def(["kgf", "kilogram-force"], "force", GRAVITY_M_S2, "N");
def(["kip", "kips"], "force", 1e3 * LBF_N, "N");
def(["kg", "kilogram", "kilograms", "kilogramme", "kilogrammes"], "mass", 1, "kg");
def(["g", "gram", "grams", "gramme", "grammes"], "mass", 1e-3, "kg");
def(["t", "tonne", "tonnes", "ton", "tons"], "mass", 1e3, "kg");
def(["lb", "lbs", "pound", "pounds"], "mass", LB_KG, "kg");
def(["oz", "ounce", "ounces"], "mass", 0.028349523125, "kg");
def(["w", "watt", "watts"], "power", 1, "W");
def(["kw", "kilowatt", "kilowatts"], "power", 1e3, "W");
def(["mw", "milliwatt", "milliwatts"], "power", 1e-3, "W");
def(["c", "°c", "degc", "deg c", "degrees c", "degrees celsius", "celsius", "ºc"], "temperature", 1, "C");
def(["k", "kelvin"], "temperature", 1, "C", -273.15);
def(["f", "°f", "degf", "deg f", "degrees f", "degrees fahrenheit", "fahrenheit", "ºf"], "temperature", 5 / 9, "C", -(32 * 5) / 9);
def(["rad", "radian", "radians"], "angle", 1, "rad");
def(["deg", "°", "degree", "degrees"], "angle", Math.PI / 180, "rad");
def(["", "-", "ratio", "x", "times", "dimensionless", "none"], "dimensionless", 1, "");

export const SI_UNIT: Record<Dimension, string> = { length: "m", force: "N", mass: "kg", power: "W", temperature: "C", angle: "rad", dimensionless: "" };

/** Looks a written unit up; case-insensitive, tolerant of spacing and the degree sign. */
export function parseUnit(raw: string): UnitDef | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ").replace(/^deg\.? ?/, "deg").replace(/^°\s*/, "°");
  return UNITS[key] ?? UNITS[key.replace(/\.$/, "")] ?? null;
}

export interface NormalizedQuantity {
  value: number;
  unit: string;
  /** Multiplicative factor applied (NaN for affine temperature conversions, which are reported as a note). */
  factor: number;
  note?: string;
}

export interface NormalizationError {
  error: string;
}

/** Converts a value in a written unit to the SI unit of `dimension`. */
export function toSI(value: number, unit: string, dimension: Dimension): NormalizedQuantity | NormalizationError {
  if (!Number.isFinite(value)) return { error: `value ${String(value)} is not a finite number` };
  const u = parseUnit(unit);
  if (!u) return { error: `unknown unit "${unit}"` };
  if (u.dimension !== dimension) return { error: `unit "${unit}" is a ${u.dimension}, not a ${dimension}` };
  if (u.offset !== undefined) {
    const out = value * u.factor + u.offset;
    return { value: out, unit: SI_UNIT[dimension], factor: NaN, note: `Converted ${value} ${unit.trim()} to ${out.toFixed(2)} ${SI_UNIT[dimension]}.` };
  }
  const out = value * u.factor;
  return u.factor === 1 ? { value: out, unit: SI_UNIT[dimension], factor: 1 } : { value: out, unit: SI_UNIT[dimension], factor: u.factor, note: `Converted ${value} ${unit.trim()} to ${SI_UNIT[dimension]} (x ${u.factor}).` };
}

/** Field ids an interpreter may extract, with the dimension each accepts. */
export const FIELD_DIMENSIONS = {
  span_m: "length",
  reach_m: "length",
  load_N: "force",
  payload_kg: "mass",
  power_W: "power",
  maxTemperature_C: "temperature",
  ambient_C: "temperature",
  safetyFactor: "dimensionless",
  deflectionRatio: "dimensionless",
  massBudget_kg: "mass",
} as const satisfies Record<string, Dimension>;

export type NumericFieldId = keyof typeof FIELD_DIMENSIONS;

export function isNumericFieldId(id: string): id is NumericFieldId {
  return Object.prototype.hasOwnProperty.call(FIELD_DIMENSIONS, id);
}

/**
 * Normalises a value for a field. A load written as a mass is converted to a
 * force with standard gravity and a payload written as a force to a mass;
 * both conversions are recorded in the note.
 */
export function normalizeField(id: NumericFieldId, value: number, unit: string): NormalizedQuantity | NormalizationError {
  const dim = FIELD_DIMENSIONS[id];
  const direct = toSI(value, unit, dim);
  if (!("error" in direct)) return direct;
  const u = parseUnit(unit);
  if (id === "load_N" && u?.dimension === "mass") {
    const kg = toSI(value, unit, "mass") as NormalizedQuantity;
    const n = kg.value * GRAVITY_M_S2;
    return { value: n, unit: "N", factor: kg.factor * GRAVITY_M_S2, note: `Converted ${value} ${unit.trim()} to ${n.toFixed(1)} N using g = ${GRAVITY_M_S2} m/s^2.` };
  }
  if (id === "payload_kg" && u?.dimension === "force") {
    const n = toSI(value, unit, "force") as NormalizedQuantity;
    const kg = n.value / GRAVITY_M_S2;
    return { value: kg, unit: "kg", factor: n.factor / GRAVITY_M_S2, note: `Given as a force; converted ${value} ${unit.trim()} to ${kg.toFixed(4)} kg with g = ${GRAVITY_M_S2} m/s^2.` };
  }
  return direct;
}
