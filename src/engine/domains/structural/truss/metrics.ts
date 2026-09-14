/**
 * Engineering metrics derived from a truss model and its solution.
 */
import { memberLength_m, type TrussModel } from "./model";

/** Total mass = sum over members of density x area x length. */
export function trussMass_kg(model: TrussModel): number {
  let mass = 0;
  for (const m of model.members) {
    mass += model.material.density_kg_m3 * m.area_m2 * memberLength_m(model, m);
  }
  return mass;
}

/**
 * Second moment of area of a solid circular section expressed through its
 * area: A = pi r^2, I = pi r^4 / 4 = A^2 / (4 pi).
 *
 * The engine currently assumes solid round bars for buckling checks. This is
 * a deliberate, documented simplification; tubular or I-sections have a far
 * better I/A ratio and would be a natural extension of the section model.
 */
export function solidRoundSecondMoment_m4(area_m2: number): number {
  return (area_m2 * area_m2) / (4 * Math.PI);
}

/**
 * Euler critical buckling load of a pinned-pinned column:
 * P_cr = pi^2 E I / L^2 (effective length factor K = 1).
 */
export function eulerCriticalLoad_N(
  youngsModulus_Pa: number,
  area_m2: number,
  length_m: number
): number {
  const I = solidRoundSecondMoment_m4(area_m2);
  return (Math.PI ** 2 * youngsModulus_Pa * I) / (length_m * length_m);
}
