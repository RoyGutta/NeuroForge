import { describe, expect, test } from "vitest";
import { GRAVITY_M_S2, normalizeField, parseUnit, toSI } from "../../../src/engine/interpret/units";

describe("unit normalisation", () => {
  test("length units scale to metres", () => {
    expect(toSI(1500, "mm", "length")).toMatchObject({ value: 1.5, unit: "m", factor: 1e-3 });
    expect(toSI(250, "cm", "length")).toMatchObject({ value: 2.5 });
    expect(toSI(2, "metres", "length")).toMatchObject({ value: 2, factor: 1 });
    expect(toSI(10, "ft", "length")).toMatchObject({ value: 3.048 });
    expect(toSI(24, "in", "length")).toMatchObject({ value: expect.closeTo(0.6096, 12) });
  });

  test("force and mass units", () => {
    expect(toSI(2, "kN", "force")).toMatchObject({ value: 2000 });
    expect(toSI(1.2, "kilonewtons", "force")).toMatchObject({ value: 1200 });
    expect(toSI(200, "lbf", "force")).toMatchObject({ value: expect.closeTo(889.64432305, 6) });
    expect(toSI(3000, "g", "mass")).toMatchObject({ value: 3 });
    expect(toSI(4.4, "lb", "mass")).toMatchObject({ value: expect.closeTo(1.995806428, 9) });
    expect(toSI(2, "t", "mass")).toMatchObject({ value: 2000 });
  });

  test("power, temperature and angle", () => {
    expect(toSI(0.05, "kW", "power")).toMatchObject({ value: 50 });
    expect(toSI(40, "watts", "power")).toMatchObject({ value: 40, factor: 1 });
    expect(toSI(80, "°C", "temperature")).toMatchObject({ value: 80 });
    expect(toSI(80, "C", "temperature")).toMatchObject({ value: 80 });
    expect(toSI(358, "K", "temperature")).toMatchObject({ value: expect.closeTo(84.85, 9) });
    expect(toSI(176, "°F", "temperature")).toMatchObject({ value: expect.closeTo(80, 9) });
    expect(toSI(77, "F", "temperature")).toMatchObject({ value: expect.closeTo(25, 9) });
    expect(toSI(90, "deg", "angle")).toMatchObject({ value: expect.closeTo(Math.PI / 2, 12) });
    expect(toSI(1.5, "rad", "angle")).toMatchObject({ value: 1.5, factor: 1 });
    expect(toSI(2, "", "dimensionless")).toMatchObject({ value: 2 });
  });

  test("rejects unknown units, wrong dimensions and non-finite values", () => {
    expect(toSI(1, "furlong", "length")).toEqual({ error: 'unknown unit "furlong"' });
    expect(toSI(1, "kg", "length")).toEqual({ error: 'unit "kg" is a mass, not a length' });
    expect(toSI(Number.NaN, "m", "length")).toMatchObject({ error: expect.stringContaining("finite") });
    expect(parseUnit("MM")?.factor).toBe(1e-3);
    expect(parseUnit("deg C")?.dimension).toBe("temperature");
  });

  test("a load given as a mass becomes a force with standard gravity, and a payload given as a force becomes a mass", () => {
    const load = normalizeField("load_N", 50, "kg");
    expect(load).toMatchObject({ value: 50 * GRAVITY_M_S2, unit: "N" });
    expect("note" in load && load.note).toMatch(/9.80665/);
    const payload = normalizeField("payload_kg", 20, "N");
    expect(payload).toMatchObject({ value: 20 / GRAVITY_M_S2, unit: "kg" });
    expect(normalizeField("span_m", 2, "kg")).toEqual({ error: 'unit "kg" is a mass, not a length' });
    expect(normalizeField("safetyFactor", 2, "")).toMatchObject({ value: 2 });
    expect(normalizeField("ambient_C", 298, "kelvin")).toMatchObject({ value: expect.closeTo(24.85, 9) });
  });
});
