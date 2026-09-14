import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import {
  bindingConstraints,
  explainDifference,
  parameterSensitivity,
} from "../../../src/engine/explain/sensitivity";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);
const baseline = compiled.baseline.parameters;

describe("parameter sensitivity (finite differences on the real evaluator)", () => {
  test("ranks variables by normalised influence on the objective and sums shares to 1", () => {
    const s = parameterSensitivity(compiled, baseline, "mass_kg");
    expect(s.entries.length).toBe(compiled.space.dimension);
    const shares = s.entries.reduce((a, e) => a + e.share, 0);
    expect(shares).toBeCloseTo(1, 9);
    for (let i = 1; i < s.entries.length; i++) {
      expect(s.entries[i - 1].share).toBeGreaterThanOrEqual(s.entries[i].share);
    }
    expect(s.metric).toBe("mass_kg");
  });

  test("mass is insensitive to top-chord height at zero depth change but sensitive to area", () => {
    // Mass depends on areas linearly and on depth only through member length;
    // longer members (bottom chord) contribute more mass per unit area.
    const s = parameterSensitivity(compiled, baseline, "mass_kg");
    const areaEntries = s.entries.filter((e) => e.group === "area");
    const depthEntries = s.entries.filter((e) => e.group === "depth");
    const areaShare = areaEntries.reduce((a, e) => a + e.share, 0);
    const depthShare = depthEntries.reduce((a, e) => a + e.share, 0);
    expect(areaShare).toBeGreaterThan(depthShare);
    for (const e of areaEntries) expect(e.gradient).toBeGreaterThan(0);
  });

  test("group aggregation reports the share of each variable group", () => {
    const s = parameterSensitivity(compiled, baseline, "bucklingUtilization");
    const groups = s.groups.map((g) => g.group);
    expect(groups).toEqual(expect.arrayContaining(["depth", "area"]));
    expect(s.groups.reduce((a, g) => a + g.share, 0)).toBeCloseTo(1, 9);
  });
});

describe("binding constraints", () => {
  test("identifies the buckling constraint as binding for the baseline", () => {
    const ev = compiled.evaluate(baseline);
    const b = bindingConstraints(ev, 0.05);
    expect(b.map((c) => c.id)).toContain("buckling");
    expect(b.map((c) => c.id)).not.toContain("stress");
    expect(b[0].utilization).toBeGreaterThan(0.95);
  });
});

describe("explainDifference", () => {
  test("describes which variable groups changed most between two designs", () => {
    const other = baseline.slice();
    // Halve the bottom-chord areas: indices n..2n-1 with n = 4.
    for (let i = 4; i < 8; i++) other[i] *= 0.5;
    const d = explainDifference(compiled, baseline, other);
    expect(d.changed[0].group).toBe("area");
    expect(d.changed[0].meanRelativeChange).toBeLessThan(0);
    expect(d.objectiveDelta.mass_kg).toBeLessThan(0);
    expect(d.changedVariables.length).toBe(4);
  });
});
