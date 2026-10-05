/**
 * Plate-fin heat sink in natural convection: classical fin theory plus the
 * Bar-Cohen and Rohsenow composite correlation for buoyancy-driven flow
 * between vertical parallel plates. Every formula is a textbook closed form
 * (Incropera and DeWitt, chapter 3 fins; chapter 9 free convection in
 * channels); nothing is fitted.
 *
 *   fin parameter   m = sqrt(h P / (k A_c)),   P = 2 (D + t),  A_c = D t
 *   fin efficiency  eta = tanh(m L_c) / (m L_c),  L_c = H + t / 2 (tip correction)
 *   Elenbaas number El = g beta dT S^4 Pr / (nu^2 L)
 *   Nusselt (plates) Nu_S = [576 / El^2 + 2.873 / sqrt(El)]^(-1/2),  h = Nu_S k_air / S
 *   network         T_b = T_inf + Q (R_base + 1 / (h (n eta A_f + A_b)))
 *
 * h depends on the temperature rise it produces, so the natural-convection
 * solution is a fixed point found by bisection on the monotone residual.
 */

export interface AirProperties {
  beta_1_K: number;
  kinematicViscosity_m2_s: number;
  conductivity_W_mK: number;
  prandtl: number;
}

/** Dry air near a 320 K film temperature; the film temperature is treated as fixed (documented assumption). */
export const AIR_320K: AirProperties = { beta_1_K: 1 / 320, kinematicViscosity_m2_s: 1.78e-5, conductivity_W_mK: 0.0278, prandtl: 0.7 };

export const GRAVITY_M_S2 = 9.80665;

export function finParameter(p: { h_W_m2K: number; k_W_mK: number; depth_m: number; thickness_m: number }): number {
  const perimeter = 2 * (p.depth_m + p.thickness_m);
  const area = p.depth_m * p.thickness_m;
  return Math.sqrt((p.h_W_m2K * perimeter) / (p.k_W_mK * area));
}

export function finEfficiency(mLc: number): number {
  return mLc < 1e-9 ? 1 : Math.tanh(mLc) / mLc;
}

export function elenbaasNumber(p: { gap_m: number; height_m: number; deltaT_K: number; air: AirProperties }): number {
  return (GRAVITY_M_S2 * p.air.beta_1_K * p.deltaT_K * p.gap_m ** 4 * p.air.prandtl) / (p.air.kinematicViscosity_m2_s ** 2 * p.height_m);
}

export function barCohenRohsenowNusselt(El: number): number {
  if (!(El > 0)) return 0;
  return Math.pow(576 / (El * El) + 2.873 / Math.sqrt(El), -0.5);
}

export interface FinArrayInput {
  power_W: number;
  ambient_C: number;
  baseWidth_m: number;
  baseDepth_m: number;
  baseThickness_m: number;
  finHeight_m: number;
  finThickness_m: number;
  finPitch_m: number;
  k_W_mK: number;
  density_kg_m3: number;
  /** Forced-convection shortcut: skip the correlation and use this coefficient. */
  prescribedH_W_m2K?: number;
  air?: AirProperties;
}

export interface FinArrayResult {
  status: "ok" | "invalid";
  finCount: number;
  gap_m: number;
  heatTransferCoefficient_W_m2K: number;
  finParameter_1_m: number;
  finEfficiency: number;
  thermalResistance_K_W: number;
  baseResistance_K_W: number;
  baseTemperature_C: number;
  tipTemperature_C: number;
  heatRemoved_W: number;
  finHeat_W: number;
  baseHeat_W: number;
  mass_kg: number;
  converged: boolean;
  diagnostics: string[];
}

export function solveFinArray(input: FinArrayInput): FinArrayResult {
  const air = input.air ?? AIR_320K;
  const n = Math.floor(input.baseWidth_m / input.finPitch_m);
  const gap = input.finPitch_m - input.finThickness_m;
  const invalid = (why: string): FinArrayResult => ({
    status: "invalid", finCount: n, gap_m: gap, heatTransferCoefficient_W_m2K: NaN, finParameter_1_m: NaN, finEfficiency: NaN, thermalResistance_K_W: NaN, baseResistance_K_W: NaN,
    baseTemperature_C: NaN, tipTemperature_C: NaN, heatRemoved_W: NaN, finHeat_W: NaN, baseHeat_W: NaN, mass_kg: NaN, converged: false, diagnostics: [why],
  });
  if (!(input.power_W > 0)) return invalid("power must be positive");
  if (!(gap > 0)) return invalid("fin pitch must exceed fin thickness");
  if (n < 1) return invalid("base too narrow for one fin at this pitch");
  if (![input.baseWidth_m, input.baseDepth_m, input.baseThickness_m, input.finHeight_m, input.finThickness_m, input.k_W_mK, input.density_kg_m3].every((v) => Number.isFinite(v) && v > 0)) return invalid("non-positive dimension or property");

  const Lc = input.finHeight_m + input.finThickness_m / 2;
  const Af = 2 * input.baseDepth_m * Lc;
  const Ab = Math.max(0, input.baseWidth_m - n * input.finThickness_m) * input.baseDepth_m;
  const Rbase = input.baseThickness_m / (input.k_W_mK * input.baseWidth_m * input.baseDepth_m);
  const mass = input.density_kg_m3 * (input.baseWidth_m * input.baseDepth_m * input.baseThickness_m + n * input.finHeight_m * input.finThickness_m * input.baseDepth_m);

  const network = (h: number) => {
    const m = finParameter({ h_W_m2K: h, k_W_mK: input.k_W_mK, depth_m: input.baseDepth_m, thickness_m: input.finThickness_m });
    const eta = finEfficiency(m * Lc);
    const Rconv = 1 / (h * (n * eta * Af + Ab));
    return { m, eta, Rconv, R: Rconv + Rbase };
  };
  const coefficient = (deltaT: number) => {
    if (input.prescribedH_W_m2K !== undefined) return input.prescribedH_W_m2K;
    const El = elenbaasNumber({ gap_m: gap, height_m: input.finHeight_m, deltaT_K: Math.max(deltaT, 1e-9), air });
    return (barCohenRohsenowNusselt(El) * air.conductivity_W_mK) / gap;
  };

  let deltaT: number;
  let converged = true;
  if (input.prescribedH_W_m2K !== undefined) {
    deltaT = input.power_W * network(input.prescribedH_W_m2K).R;
  } else {
    // Residual g(dT) = Q R(h(dT)) - dT is strictly decreasing: bisect.
    const residual = (dT: number) => input.power_W * network(coefficient(dT)).R - dT;
    let lo = 1e-6;
    let hi = 1e4;
    if (residual(hi) > 0) return invalid("no steady state below 10,000 K temperature rise");
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (residual(mid) > 0) lo = mid;
      else hi = mid;
      if (hi - lo < 1e-10 * Math.max(1, hi)) break;
    }
    deltaT = 0.5 * (lo + hi);
    converged = Math.abs(residual(deltaT)) < 1e-6 * Math.max(1, deltaT);
  }
  const h = coefficient(deltaT);
  const net = network(h);
  const Tb = input.ambient_C + deltaT;
  const thetaTip = deltaT / Math.cosh(net.m * Lc);
  const finHeat = n * net.eta * h * Af * deltaT;
  const baseHeat = h * Ab * deltaT;
  return {
    status: "ok",
    finCount: n,
    gap_m: gap,
    heatTransferCoefficient_W_m2K: h,
    finParameter_1_m: net.m,
    finEfficiency: net.eta,
    thermalResistance_K_W: net.R,
    baseResistance_K_W: Rbase,
    baseTemperature_C: Tb,
    tipTemperature_C: input.ambient_C + thetaTip,
    heatRemoved_W: deltaT / net.R,
    finHeat_W: finHeat,
    baseHeat_W: baseHeat,
    mass_kg: mass,
    converged,
    diagnostics: [],
  };
}
