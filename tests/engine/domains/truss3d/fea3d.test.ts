import { describe, expect, test } from "vitest";
import { reference } from "../../../fixtures/truss2dReference";
import { compileProblem } from "../../../../src/engine/domains/registry";
import { solveTruss } from "../../../../src/engine/domains/structural/truss/fea";
import type { TrussModel } from "../../../../src/engine/domains/structural/truss/model";
import { MATERIALS } from "../../../../src/engine/domains/structural/truss/materials";
import { createTrussBridgeProblem } from "../../../../src/engine/domains/structural/truss/template";
import { solveTruss3d } from "../../../../src/engine/domains/structural/truss3d/fea3d";
import type { Truss3dModel } from "../../../../src/engine/domains/structural/truss3d/model";

const steel = MATERIALS["steel-a36"];
const E = steel.youngsModulus_Pa;

describe("2D solver on the dimension-generic assembler", () => {
  test("reproduces the recorded reference outputs bit for bit", () => {
    const fx = reference as { problem: { span_m: number; load_N: number; panels: number }; cases: { params: number[]; displacements: number[]; forces: number[]; reactions: number[]; compliance: number; maxDisplacement: number }[] };
    const compiled = compileProblem(createTrussBridgeProblem(fx.problem));
    for (const c of fx.cases) {
      const r = solveTruss(compiled.artifact(c.params) as TrussModel);
      expect(r.status).toBe("ok");
      if (r.status !== "ok") return;
      expect(Array.from(r.displacements_m)).toEqual(c.displacements);
      expect(Array.from(r.memberForces_N)).toEqual(c.forces);
      expect(Array.from(r.reactions_N)).toEqual(c.reactions);
      expect(r.compliance_J).toBe(c.compliance);
      expect(r.maxDisplacement_m).toBe(c.maxDisplacement);
    }
  });
});

describe("3D truss solver (direct stiffness, 3 DOFs per node)", () => {
  test("a single axial bar along x: delta = PL/EA, force P, reactions balance", () => {
    const A = 2e-4;
    const L = 1.5;
    const P = 1000;
    const model: Truss3dModel = {
      nodes: [{ x: 0, y: 0, z: 0 }, { x: L, y: 0, z: 0 }],
      members: [{ i: 0, j: 1, area_m2: A }],
      supports: [{ node: 0, fixX: true, fixY: true, fixZ: true }, { node: 1, fixX: false, fixY: true, fixZ: true }],
      loads: [{ node: 1, fx_N: P, fy_N: 0, fz_N: 0 }],
      material: steel,
    };
    const r = solveTruss3d(model);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.displacements_m[3]).toBeCloseTo((P * L) / (E * A), 15);
    expect(r.memberForces_N[0]).toBeCloseTo(P, 9);
    expect(r.memberStresses_Pa[0]).toBeCloseTo(P / A, 6);
    expect(r.reactions_N[0]).toBeCloseTo(-P, 9);
    expect(r.compliance_J).toBeCloseTo(0.5 * P * ((P * L) / (E * A)), 15);
  });

  test("a bar along an arbitrary direction stretches by PL/EA under a load along its axis when restrained axially only", () => {
    // Free node restrained by two extra stiff orthogonal bars would couple; instead test via the stiffness: a tripod of
    // identical bars loaded vertically gives apex displacement P L / (3 E A cos^2 theta) and force -P / (3 cos theta) each.
    const A = 1e-4;
    const h = 2;
    const rr = 1;
    const feet = [0, 1, 2].map((k) => ({ x: rr * Math.cos((2 * Math.PI * k) / 3), y: rr * Math.sin((2 * Math.PI * k) / 3), z: 0 }));
    const model: Truss3dModel = {
      nodes: [...feet, { x: 0, y: 0, z: h }],
      members: feet.map((_, k) => ({ i: k, j: 3, area_m2: A })),
      supports: feet.map((_, k) => ({ node: k, fixX: true, fixY: true, fixZ: true })),
      loads: [{ node: 3, fx_N: 0, fy_N: 0, fz_N: -600 }],
      material: steel,
    };
    const r = solveTruss3d(model);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const L = Math.hypot(rr, h);
    const cos = h / L;
    for (let k = 0; k < 3; k++) expect(r.memberForces_N[k]).toBeCloseTo(-600 / (3 * cos), 6);
    expect(r.displacements_m[3 * 3 + 2]).toBeCloseTo(-(600 * L) / (3 * E * A * cos * cos), 12);
    expect(Math.abs(r.displacements_m[9])).toBeLessThan(1e-15);
    expect(Math.abs(r.displacements_m[10])).toBeLessThan(1e-15);
    // Reactions balance the load in every axis.
    const sum = [0, 1, 2].map((a) => [0, 1, 2].reduce((s, k) => s + r.reactions_N[3 * k + a], 0));
    expect(sum[0]).toBeCloseTo(0, 9);
    expect(sum[1]).toBeCloseTo(0, 9);
    expect(sum[2]).toBeCloseTo(600, 9);
  });

  test("a lateral load on the tripod: force and moment equilibrium of the reactions", () => {
    const A = 1e-4;
    const feet = [0, 1, 2].map((k) => ({ x: Math.cos((2 * Math.PI * k) / 3), y: Math.sin((2 * Math.PI * k) / 3), z: 0 }));
    const apex = { x: 0, y: 0, z: 2 };
    const model: Truss3dModel = {
      nodes: [...feet, apex],
      members: feet.map((_, k) => ({ i: k, j: 3, area_m2: A })),
      supports: feet.map((_, k) => ({ node: k, fixX: true, fixY: true, fixZ: true })),
      loads: [{ node: 3, fx_N: 250, fy_N: -80, fz_N: -300 }],
      material: steel,
    };
    const r = solveTruss3d(model);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const F = [250, -80, -300];
    const sumR = [0, 1, 2].map((a) => [0, 1, 2].reduce((s, k) => s + r.reactions_N[3 * k + a], 0));
    for (let a = 0; a < 3; a++) expect(sumR[a] + F[a]).toBeCloseTo(0, 9);
    // Moments about the origin: sum r_k x R_k + r_apex x F = 0.
    const cross = (p: { x: number; y: number; z: number }, v: number[]) => [p.y * v[2] - p.z * v[1], p.z * v[0] - p.x * v[2], p.x * v[1] - p.y * v[0]];
    const M = [0, 0, 0];
    feet.forEach((p, k) => cross(p, [r.reactions_N[3 * k], r.reactions_N[3 * k + 1], r.reactions_N[3 * k + 2]]).forEach((v, a) => (M[a] += v)));
    cross(apex, F).forEach((v, a) => (M[a] += v));
    for (let a = 0; a < 3; a++) expect(M[a]).toBeCloseTo(0, 8);
    // Member forces balance the load at the apex: a tension N in member i->apex pulls the apex towards the foot, so sum(N_k d_k) = F.
    const dir = (k: number) => { const L = Math.hypot(apex.x - feet[k].x, apex.y - feet[k].y, apex.z - feet[k].z); return [(apex.x - feet[k].x) / L, (apex.y - feet[k].y) / L, (apex.z - feet[k].z) / L]; };
    const nodal = [0, 1, 2].map((a) => [0, 1, 2].reduce((s, k) => s + r.memberForces_N[k] * dir(k)[a], 0));
    for (let a = 0; a < 3; a++) expect(nodal[a]).toBeCloseTo(F[a], 8);
  });

  test("a coplanar 'tripod' loaded out of its plane is a mechanism and is reported, not solved", () => {
    const model: Truss3dModel = {
      nodes: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0.3, y: 0.3, z: 0 }],
      members: [0, 1, 2].map((k) => ({ i: k, j: 3, area_m2: 1e-4 })),
      supports: [0, 1, 2].map((k) => ({ node: k, fixX: true, fixY: true, fixZ: true })),
      loads: [{ node: 3, fx_N: 0, fy_N: 0, fz_N: -10 }],
      material: steel,
    };
    const r = solveTruss3d(model);
    expect(r.status).toBe("unstable");
  });

  test("scaling: doubling E halves displacements; doubling every area halves them; forces are unchanged", () => {
    const build = (A: number, mat = steel): Truss3dModel => ({
      nodes: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0.2, y: 0.4, z: 1.5 }],
      members: [0, 1, 2].map((k) => ({ i: k, j: 3, area_m2: A })),
      supports: [0, 1, 2].map((k) => ({ node: k, fixX: true, fixY: true, fixZ: true })),
      loads: [{ node: 3, fx_N: 100, fy_N: 50, fz_N: -400 }],
      material: mat,
    });
    const a = solveTruss3d(build(1e-4));
    const b = solveTruss3d(build(2e-4));
    const c = solveTruss3d(build(1e-4, { ...steel, youngsModulus_Pa: 2 * E }));
    expect(a.status === "ok" && b.status === "ok" && c.status === "ok").toBe(true);
    if (a.status !== "ok" || b.status !== "ok" || c.status !== "ok") return;
    for (let d = 9; d < 12; d++) {
      expect(b.displacements_m[d]).toBeCloseTo(a.displacements_m[d] / 2, 12);
      expect(c.displacements_m[d]).toBeCloseTo(a.displacements_m[d] / 2, 12);
    }
    for (let m = 0; m < 3; m++) {
      expect(b.memberForces_N[m]).toBeCloseTo(a.memberForces_N[m], 8);
      expect(c.memberForces_N[m]).toBeCloseTo(a.memberForces_N[m], 8);
    }
  });

  test("a planar truss embedded in 3D with its out-of-plane DOFs fixed matches the 2D solver exactly", () => {
    const compiled = compileProblem(createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 }));
    const m2 = compiled.artifact(compiled.baseline.parameters) as TrussModel;
    const m3: Truss3dModel = {
      nodes: m2.nodes.map((n) => ({ x: n.x, y: n.y, z: 0 })),
      members: m2.members.map((m) => ({ ...m })),
      supports: m2.nodes.map((_, n) => { const s = m2.supports.find((x) => x.node === n); return { node: n, fixX: !!s?.fixX, fixY: !!s?.fixY, fixZ: true }; }),
      loads: m2.loads.map((l) => ({ node: l.node, fx_N: l.fx_N, fy_N: l.fy_N, fz_N: 0 })),
      material: m2.material,
    };
    const r2 = solveTruss(m2);
    const r3 = solveTruss3d(m3);
    expect(r2.status === "ok" && r3.status === "ok").toBe(true);
    if (r2.status !== "ok" || r3.status !== "ok") return;
    for (let n = 0; n < m2.nodes.length; n++) {
      expect(r3.displacements_m[3 * n]).toBeCloseTo(r2.displacements_m[2 * n], 14);
      expect(r3.displacements_m[3 * n + 1]).toBeCloseTo(r2.displacements_m[2 * n + 1], 14);
      expect(r3.displacements_m[3 * n + 2]).toBe(0);
    }
    for (let m = 0; m < m2.members.length; m++) expect(r3.memberForces_N[m]).toBeCloseTo(r2.memberForces_N[m], 8);
    expect(r3.compliance_J).toBeCloseTo(r2.compliance_J, 14);
    expect(r3.maxDisplacement_m).toBeCloseTo(r2.maxDisplacement_m, 14);
  });

  test("invalid members are reported", () => {
    const base: Truss3dModel = { nodes: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }], members: [{ i: 0, j: 1, area_m2: 1e-4 }], supports: [{ node: 0, fixX: true, fixY: true, fixZ: true }, { node: 1, fixX: false, fixY: true, fixZ: true }], loads: [], material: steel };
    expect(solveTruss3d({ ...base, members: [{ i: 0, j: 1, area_m2: 0 }] }).status).toBe("invalid");
    expect(solveTruss3d({ ...base, members: [{ i: 0, j: 5, area_m2: 1e-4 }] }).status).toBe("invalid");
    expect(solveTruss3d({ ...base, nodes: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }] }).status).toBe("invalid");
  });
});
