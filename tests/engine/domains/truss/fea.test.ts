import { describe, expect, test } from "vitest";
import type { TrussModel } from "../../../../src/engine/domains/structural/truss/model";
import { solveTruss } from "../../../../src/engine/domains/structural/truss/fea";

const steel = {
  id: "steel-test",
  name: "Test steel",
  youngsModulus_Pa: 200e9,
  density_kg_m3: 7850,
  yieldStrength_Pa: 250e6,
};

describe("2D truss direct-stiffness solver", () => {
  test("single horizontal bar under axial load extends by FL/(EA)", () => {
    const F = 1000;
    const L = 2;
    const A = 1e-4;
    const model: TrussModel = {
      nodes: [
        { x: 0, y: 0 },
        { x: L, y: 0 },
      ],
      members: [{ i: 0, j: 1, area_m2: A }],
      supports: [
        { node: 0, fixX: true, fixY: true },
        { node: 1, fixX: false, fixY: true },
      ],
      loads: [{ node: 1, fx_N: F, fy_N: 0 }],
      material: steel,
    };
    const sol = solveTruss(model);
    expect(sol.status).toBe("ok");
    if (sol.status !== "ok") return;
    const expectedU = (F * L) / (steel.youngsModulus_Pa * A);
    expect(sol.displacements_m[2]).toBeCloseTo(expectedU, 12); // node 1, x
    expect(sol.displacements_m[3]).toBeCloseTo(0, 12); // node 1, y
    expect(sol.memberForces_N[0]).toBeCloseTo(F, 8); // tension positive
    expect(sol.memberStresses_Pa[0]).toBeCloseTo(F / A, 6);
    expect(sol.reactions_N[0]).toBeCloseTo(-F, 8); // node 0, x
    expect(sol.memberLengths_m[0]).toBeCloseTo(L, 12);
  });

  test("symmetric two-bar truss: member forces and apex deflection match theory", () => {
    // Supports at (0,0) and (2,0), apex at (1,1): both bars at 45 degrees.
    const P = 1000;
    const A = 1e-4;
    const model: TrussModel = {
      nodes: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ],
      members: [
        { i: 0, j: 2, area_m2: A },
        { i: 1, j: 2, area_m2: A },
      ],
      supports: [
        { node: 0, fixX: true, fixY: true },
        { node: 1, fixX: true, fixY: true },
      ],
      loads: [{ node: 2, fx_N: 0, fy_N: -P }],
      material: steel,
    };
    const sol = solveTruss(model);
    expect(sol.status).toBe("ok");
    if (sol.status !== "ok") return;
    const theta = Math.PI / 4;
    const N = -P / (2 * Math.sin(theta)); // compression
    expect(sol.memberForces_N[0]).toBeCloseTo(N, 6);
    expect(sol.memberForces_N[1]).toBeCloseTo(N, 6);
    const Lbar = Math.SQRT2;
    const delta = (P * Lbar) / (2 * steel.youngsModulus_Pa * A * Math.sin(theta) ** 2);
    expect(sol.displacements_m[5]).toBeCloseTo(-delta, 12); // apex y, downward
    expect(sol.displacements_m[4]).toBeCloseTo(0, 12); // apex x, symmetric
    expect(sol.maxDisplacement_m).toBeCloseTo(delta, 12);
    // Compliance = 0.5 * F . u
    expect(sol.compliance_J).toBeCloseTo(0.5 * P * delta, 12);
  });

  test("reactions balance applied loads on a statically indeterminate frame", () => {
    // Braced square with two diagonals (indeterminate), pin + roller supports.
    const A = 2e-4;
    const model: TrussModel = {
      nodes: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      members: [
        { i: 0, j: 1, area_m2: A },
        { i: 1, j: 2, area_m2: A },
        { i: 2, j: 3, area_m2: A },
        { i: 3, j: 0, area_m2: A },
        { i: 0, j: 2, area_m2: A },
        { i: 1, j: 3, area_m2: A },
      ],
      supports: [
        { node: 0, fixX: true, fixY: true },
        { node: 1, fixX: false, fixY: true },
      ],
      loads: [
        { node: 2, fx_N: 300, fy_N: -800 },
        { node: 3, fx_N: 0, fy_N: -200 },
      ],
      material: steel,
    };
    const sol = solveTruss(model);
    expect(sol.status).toBe("ok");
    if (sol.status !== "ok") return;
    let rx = 0;
    let ry = 0;
    for (let n = 0; n < 4; n++) {
      rx += sol.reactions_N[2 * n];
      ry += sol.reactions_N[2 * n + 1];
    }
    expect(rx).toBeCloseTo(-300, 6);
    expect(ry).toBeCloseTo(1000, 6);
    // Roller carries no horizontal reaction.
    expect(sol.reactions_N[2]).toBeCloseTo(0, 12);
  });

  test("an unbraced square is a mechanism and is reported as unstable", () => {
    const A = 1e-4;
    const model: TrussModel = {
      nodes: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      members: [
        { i: 0, j: 1, area_m2: A },
        { i: 1, j: 2, area_m2: A },
        { i: 2, j: 3, area_m2: A },
        { i: 3, j: 0, area_m2: A },
      ],
      supports: [
        { node: 0, fixX: true, fixY: true },
        { node: 1, fixX: false, fixY: true },
      ],
      loads: [{ node: 2, fx_N: 100, fy_N: 0 }],
      material: steel,
    };
    const sol = solveTruss(model);
    expect(sol.status).toBe("unstable");
  });

  test("a zero-length member is rejected as invalid geometry", () => {
    const model: TrussModel = {
      nodes: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      members: [{ i: 0, j: 1, area_m2: 1e-4 }],
      supports: [{ node: 0, fixX: true, fixY: true }],
      loads: [{ node: 1, fx_N: 1, fy_N: 0 }],
      material: steel,
    };
    const sol = solveTruss(model);
    expect(sol.status).toBe("invalid");
  });
});
