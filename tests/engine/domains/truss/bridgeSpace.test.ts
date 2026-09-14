import { describe, expect, test } from "vitest";
import { Rng } from "../../../../src/engine/core/rng";
import { createBridgeSpace } from "../../../../src/engine/domains/structural/truss/bridgeSpace";
import { createTrussBridgeProblem } from "../../../../src/engine/domains/structural/truss/template";
import { trussMass_kg } from "../../../../src/engine/domains/structural/truss/metrics";

const G = 9.80665;

describe("bridge ground-structure design space", () => {
  const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
  const space = createBridgeSpace(problem);

  test("has n depth variables and 4n-1 area variables for n panels", () => {
    expect(space.dimension).toBe(5 * 4 - 1);
    expect(space.variables.filter((v) => v.group === "depth")).toHaveLength(4);
    expect(space.variables.filter((v) => v.group === "area")).toHaveLength(15);
    for (const v of space.variables) expect(v.lower).toBeLessThan(v.upper);
  });

  test("builds a model with 2n+1 nodes, 4n-1 members, pin+roller supports and a midspan load", () => {
    const params = space.baselineParameters();
    const model = space.buildModel(params);
    expect(model.nodes).toHaveLength(9);
    expect(model.members).toHaveLength(15);
    expect(model.supports).toEqual([
      { node: 0, fixX: true, fixY: true },
      { node: 4, fixX: false, fixY: true },
    ]);
    const mid = model.loads.find((l) => l.node === 2)!;
    expect(mid.fy_N).toBeLessThanOrEqual(-500);
    // Bottom chord on y = 0, span exactly 2 m.
    expect(model.nodes[0]).toEqual({ x: 0, y: 0 });
    expect(model.nodes[4]).toEqual({ x: 2, y: 0 });
  });

  test("self-weight is lumped to nodes and totals mass x g", () => {
    const params = space.baselineParameters();
    const model = space.buildModel(params);
    const total = model.loads.reduce((s, l) => s + l.fy_N, 0);
    const mass = trussMass_kg(model);
    expect(total).toBeCloseTo(-500 - mass * G, 9);
  });

  test("depth parameters set top-chord node heights", () => {
    const params = space.baselineParameters();
    const depthIdx = space.variables.findIndex((v) => v.group === "depth");
    params[depthIdx] = 0.33;
    const model = space.buildModel(params);
    expect(model.nodes[5].y).toBeCloseTo(0.33, 12);
  });

  test("sample() stays within bounds and clamp() enforces them", () => {
    const rng = new Rng(1);
    for (let k = 0; k < 50; k++) {
      const s = space.sample(rng);
      s.forEach((v, i) => {
        expect(v).toBeGreaterThanOrEqual(space.variables[i].lower);
        expect(v).toBeLessThanOrEqual(space.variables[i].upper);
      });
    }
    const wild = space.variables.map((v) => v.upper * 10);
    const c = space.clamp(wild);
    c.forEach((v, i) => expect(v).toBe(space.variables[i].upper));
  });

  test("baseline is a uniform-section truss at conventional depth", () => {
    const params = space.baselineParameters();
    const model = space.buildModel(params);
    const areas = new Set(model.members.map((m) => m.area_m2));
    expect(areas.size).toBe(1);
    for (let k = 5; k < 9; k++) expect(model.nodes[k].y).toBeCloseTo(2 / 8, 12);
  });
});
