import { describe, expect, test } from "vitest";
import {
  eulerCriticalLoad_N,
  solidRoundSecondMoment_m4,
  trussMass_kg,
} from "../../../../src/engine/domains/structural/truss/metrics";
import type { TrussModel } from "../../../../src/engine/domains/structural/truss/model";

const al = {
  id: "al",
  name: "Aluminium",
  youngsModulus_Pa: 69e9,
  density_kg_m3: 2700,
  yieldStrength_Pa: 276e6,
};

describe("truss metrics", () => {
  test("mass is the sum of density x area x length over members", () => {
    const model: TrussModel = {
      nodes: [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ],
      members: [
        { i: 0, j: 1, area_m2: 1e-4 },
        { i: 1, j: 2, area_m2: 2e-4 },
        { i: 0, j: 2, area_m2: 0.5e-4 },
      ],
      supports: [],
      loads: [],
      material: al,
    };
    const expected = 2700 * (1e-4 * 3 + 2e-4 * 4 + 0.5e-4 * 5);
    expect(trussMass_kg(model)).toBeCloseTo(expected, 12);
  });

  test("second moment of a solid round bar follows I = A^2 / (4 pi)", () => {
    const r = 0.01;
    const A = Math.PI * r * r;
    expect(solidRoundSecondMoment_m4(A)).toBeCloseTo((Math.PI * r ** 4) / 4, 18);
  });

  test("Euler critical load is pi^2 E I / L^2 for a pinned-pinned member", () => {
    const E = 69e9;
    const A = 1e-4;
    const L = 1.5;
    const I = solidRoundSecondMoment_m4(A);
    expect(eulerCriticalLoad_N(E, A, L)).toBeCloseTo((Math.PI ** 2 * E * I) / L ** 2, 6);
  });
});
