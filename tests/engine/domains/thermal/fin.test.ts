import { describe, expect, test } from "vitest";
import { AIR_320K, barCohenRohsenowNusselt, elenbaasNumber, finEfficiency, finParameter, solveFinArray } from "../../../../src/engine/domains/thermal/finArray/fin";

describe("fin theory (closed forms)", () => {
  test("fin parameter m = sqrt(hP / kA) for a rectangular fin", () => {
    // h = 10 W/m2K, k = 200 W/mK, depth 0.1 m, thickness 0.002 m
    const m = finParameter({ h_W_m2K: 10, k_W_mK: 200, depth_m: 0.1, thickness_m: 0.002 });
    const P = 2 * (0.1 + 0.002);
    const A = 0.1 * 0.002;
    expect(m).toBeCloseTo(Math.sqrt((10 * P) / (200 * A)), 12);
  });

  test("fin efficiency tanh(mL)/(mL) tends to 1 for short fins and to 1/(mL) for long ones", () => {
    expect(finEfficiency(1e-6)).toBeCloseTo(1, 9);
    expect(finEfficiency(1)).toBeCloseTo(Math.tanh(1), 12);
    expect(finEfficiency(10)).toBeCloseTo(0.1, 6);
    expect(finEfficiency(3) < finEfficiency(2) && finEfficiency(2) < finEfficiency(1)).toBe(true);
  });
});

describe("natural convection between vertical parallel plates (Bar-Cohen and Rohsenow)", () => {
  test("Elenbaas number g beta dT S^4 Pr / (nu^2 L) and the composite Nusselt correlation's limits", () => {
    const El = elenbaasNumber({ gap_m: 0.01, height_m: 0.05, deltaT_K: 40, air: AIR_320K });
    const expected = (9.80665 * AIR_320K.beta_1_K * 40 * 0.01 ** 4 * AIR_320K.prandtl) / (AIR_320K.kinematicViscosity_m2_s ** 2 * 0.05);
    expect(El).toBeCloseTo(expected, 9);
    // Fully developed limit: Nu -> El / 24; isolated-plate limit: Nu -> 0.59 El^(1/4).
    expect(barCohenRohsenowNusselt(1e-3)).toBeCloseTo(1e-3 / 24, 6);
    expect(barCohenRohsenowNusselt(1e8) / (Math.pow(2.873, -0.5) * Math.pow(1e8, 0.25))).toBeCloseTo(1, 3);
    expect(barCohenRohsenowNusselt(100) < barCohenRohsenowNusselt(1000)).toBe(true);
  });

  test("the heat transfer coefficient has an interior maximum per unit base width over the gap: too narrow chokes the flow, too wide wastes fins", () => {
    const perWidth = (gap: number) => {
      const El = elenbaasNumber({ gap_m: gap, height_m: 0.05, deltaT_K: 40, air: AIR_320K });
      const h = (barCohenRohsenowNusselt(El) * AIR_320K.conductivity_W_mK) / gap;
      return h / (gap + 0.0015); // fins of 1.5 mm; heat per unit width ~ h / pitch
    };
    const gaps = [0.002, 0.004, 0.006, 0.008, 0.012, 0.02, 0.04];
    const vals = gaps.map(perWidth);
    const peak = vals.indexOf(Math.max(...vals));
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(gaps.length - 1);
  });
});

describe("fin-array energy balance", () => {
  const base = { power_W: 50, ambient_C: 25, baseWidth_m: 0.1, baseDepth_m: 0.1, baseThickness_m: 0.003, finHeight_m: 0.04, finThickness_m: 0.0015, finPitch_m: 0.008, k_W_mK: 167, density_kg_m3: 2700 };

  test("with a prescribed coefficient the base temperature follows the closed-form resistance network", () => {
    const r = solveFinArray({ ...base, prescribedH_W_m2K: 12 });
    const n = r.finCount;
    expect(n).toBe(Math.floor(base.baseWidth_m / base.finPitch_m));
    const m = finParameter({ h_W_m2K: 12, k_W_mK: base.k_W_mK, depth_m: base.baseDepth_m, thickness_m: base.finThickness_m });
    const Lc = base.finHeight_m + base.finThickness_m / 2;
    const eta = finEfficiency(m * Lc);
    const Af = 2 * base.baseDepth_m * Lc;
    const Ab = (base.baseWidth_m - n * base.finThickness_m) * base.baseDepth_m;
    const Rconv = 1 / (12 * (n * eta * Af + Ab));
    const Rbase = base.baseThickness_m / (base.k_W_mK * base.baseWidth_m * base.baseDepth_m);
    expect(r.thermalResistance_K_W).toBeCloseTo(Rconv + Rbase, 9);
    expect(r.baseTemperature_C).toBeCloseTo(25 + 50 * (Rconv + Rbase), 9);
    expect(r.finEfficiency).toBeCloseTo(eta, 12);
    expect(r.mass_kg).toBeCloseTo(2700 * (base.baseWidth_m * base.baseDepth_m * base.baseThickness_m + n * base.finHeight_m * base.finThickness_m * base.baseDepth_m), 12);
  });

  test("with natural convection the solution is a converged fixed point: h is consistent with the temperature rise it produces", () => {
    const r = solveFinArray(base);
    expect(r.converged).toBe(true);
    const dT = r.baseTemperature_C - base.ambient_C;
    const El = elenbaasNumber({ gap_m: base.finPitch_m - base.finThickness_m, height_m: base.finHeight_m, deltaT_K: dT, air: AIR_320K });
    const h = (barCohenRohsenowNusselt(El) * AIR_320K.conductivity_W_mK) / (base.finPitch_m - base.finThickness_m);
    expect(r.heatTransferCoefficient_W_m2K).toBeCloseTo(h, 6);
    expect(r.baseTemperature_C).toBeGreaterThan(base.ambient_C);
    // Energy balance closes.
    expect(r.heatRemoved_W).toBeCloseTo(base.power_W, 6);
  });

  test("more power raises the base temperature; taller fins lower it; a vanishing gap is reported, not solved", () => {
    const a = solveFinArray(base);
    const b = solveFinArray({ ...base, power_W: 100 });
    const c = solveFinArray({ ...base, finHeight_m: 0.08 });
    expect(b.baseTemperature_C).toBeGreaterThan(a.baseTemperature_C);
    expect(c.baseTemperature_C).toBeLessThan(a.baseTemperature_C);
    const d = solveFinArray({ ...base, finPitch_m: 0.0015 });
    expect(d.status).toBe("invalid");
  });
});
