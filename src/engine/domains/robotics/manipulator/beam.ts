/**
 * Euler–Bernoulli cantilever formulas for tubular links.
 */

export interface TubeSection {
  outerRadius_m: number;
  innerRadius_m: number;
  area_m2: number;
  secondMoment_m4: number;
}

/** Thin/thick-walled tube with inner radius = wallRatio x outer radius. */
export function tubeSection(outerRadius_m: number, innerRatio: number): TubeSection {
  const ri = outerRadius_m * innerRatio;
  return {
    outerRadius_m,
    innerRadius_m: ri,
    area_m2: Math.PI * (outerRadius_m ** 2 - ri ** 2),
    secondMoment_m4: (Math.PI / 4) * (outerRadius_m ** 4 - ri ** 4),
  };
}

export interface CantileverLoad {
  /** Transverse point load at the tip. */
  P_N: number;
  /** Uniform transverse load per unit length. */
  w_N_m: number;
  L_m: number;
  EI: number;
}

/** delta = P L^3 / (3 EI) + w L^4 / (8 EI). */
export function cantileverTipDeflection_m(c: CantileverLoad): number {
  return (c.P_N * c.L_m ** 3) / (3 * c.EI) + (c.w_N_m * c.L_m ** 4) / (8 * c.EI);
}

/** theta = P L^2 / (2 EI) + w L^3 / (6 EI). */
export function cantileverTipSlope_rad(c: CantileverLoad): number {
  return (c.P_N * c.L_m ** 2) / (2 * c.EI) + (c.w_N_m * c.L_m ** 3) / (6 * c.EI);
}

/** Bending stress at the outer fibre, sigma = M r / I. */
export function bendingStress_Pa(moment_Nm: number, section: TubeSection): number {
  return (Math.abs(moment_Nm) * section.outerRadius_m) / section.secondMoment_m4;
}
