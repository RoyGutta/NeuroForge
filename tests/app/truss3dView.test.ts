import { describe, expect, test } from "vitest";
import { compileProblem } from "../../src/engine/domains/registry";
import { solveTruss3d } from "../../src/engine/domains/structural/truss3d/fea3d";
import type { Truss3dModel } from "../../src/engine/domains/structural/truss3d/model";
import { createSpaceTrussProblem } from "../../src/engine/domains/structural/truss3d/template";
import { buildTruss3dView, deformationScale, memberInfo, nodeInfo } from "../../src/pages/workspace/truss3d/truss3dView";

const problem = createSpaceTrussProblem({ span_m: 3, load_N: 2000, bays: 2 });
const compiled = compileProblem(problem);
const model = compiled.artifact(compiled.baseline.parameters) as Truss3dModel;
const result = solveTruss3d(model);
if (result.status !== "ok") throw new Error("baseline unstable");

describe("3D viewport state mapping (pure, no renderer)", () => {
  test("structure mode: one segment per member with radius from area, node positions from the model", () => {
    const view = buildTruss3dView(model, result, { mode: "structure", safetyFactor: 2, areaMax_m2: 1e-3, deformScale: 0 });
    expect(view.members.length).toBe(model.members.length);
    expect(view.nodes.length).toBe(model.nodes.length);
    view.nodes.forEach((n, i) => expect([n.x, n.y, n.z]).toEqual([model.nodes[i].x, model.nodes[i].y, model.nodes[i].z]));
    const areas = model.members.map((m) => m.area_m2);
    const big = areas.indexOf(Math.max(...areas));
    const small = areas.indexOf(Math.min(...areas));
    expect(view.members[big].radius).toBeGreaterThanOrEqual(view.members[small].radius);
    expect(view.supports.length).toBe(model.supports.length);
    expect(view.loads.length).toBe(model.loads.filter((l) => Math.hypot(l.fx_N, l.fy_N, l.fz_N) > 0).length);
    expect(view.bounds.size).toBeCloseTo(problem.geometry.kind === "space-truss" ? problem.geometry.span_m : 0, 9);
  });

  test("force mode colours tension and compression differently; utilisation mode follows the solved utilisations", () => {
    const force = buildTruss3dView(model, result, { mode: "force", safetyFactor: 2, areaMax_m2: 1e-3, deformScale: 0 });
    const t = model.members.findIndex((_, k) => result.memberForces_N[k] > 0);
    const c = model.members.findIndex((_, k) => result.memberForces_N[k] < 0);
    expect(force.members[t].color).not.toBe(force.members[c].color);
    const util = buildTruss3dView(model, result, { mode: "utilization", safetyFactor: 2, areaMax_m2: 1e-3, deformScale: 0 });
    const infos = model.members.map((_, k) => memberInfo(model, result, k, 2));
    const worst = infos.map((i) => i.utilization).indexOf(Math.max(...infos.map((i) => i.utilization)));
    expect(util.members[worst].color).toBe(util.members[worst].color);
    expect(infos[worst].utilization).toBeGreaterThan(0.9);
  });

  test("deformed mode moves nodes by displacement times the scale and the automatic scale targets a visible fraction of the span", () => {
    const auto = deformationScale(model, result, 0.06);
    expect(auto * result.maxDisplacement_m).toBeCloseTo(0.06 * 3, 9);
    const view = buildTruss3dView(model, result, { mode: "deformed", safetyFactor: 2, areaMax_m2: 1e-3, deformScale: auto });
    view.nodes.forEach((n, i) => {
      expect(n.x).toBeCloseTo(model.nodes[i].x + result.displacements_m[3 * i] * auto, 12);
      expect(n.y).toBeCloseTo(model.nodes[i].y + result.displacements_m[3 * i + 1] * auto, 12);
      expect(n.z).toBeCloseTo(model.nodes[i].z + result.displacements_m[3 * i + 2] * auto, 12);
    });
    expect(view.deformScale).toBe(auto);
  });

  test("member and node inspection report the solved values", () => {
    const k = 0;
    const info = memberInfo(model, result, k, 2);
    expect(info.force_N).toBe(result.memberForces_N[k]);
    expect(info.stress_Pa).toBe(result.memberStresses_Pa[k]);
    expect(info.length_m).toBeCloseTo(result.memberLengths_m[k], 12);
    expect(info.area_m2).toBe(model.members[k].area_m2);
    expect(info.utilization).toBeGreaterThanOrEqual(0);
    const loaded = model.loads[0].node;
    const n = nodeInfo(model, result, loaded);
    expect(n.ux_m).toBe(result.displacements_m[3 * loaded]);
    expect(n.uz_m).toBe(result.displacements_m[3 * loaded + 2]);
    expect(n.resultant_m).toBeCloseTo(Math.hypot(n.ux_m, n.uy_m, n.uz_m), 15);
    expect(n.uz_m).toBeLessThan(0);
  });
});
