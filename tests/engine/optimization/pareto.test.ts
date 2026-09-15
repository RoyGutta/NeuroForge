import { describe, expect, test } from "vitest";
import type { Design } from "../../../src/engine/core/design";
import type { Objective } from "../../../src/engine/core/problem";
import {
  constrainedDominates,
  crowdingDistance,
  hypervolume2d,
  nonDominatedSort,
  paretoFront,
} from "../../../src/engine/optimization/pareto";

const objectives: Objective[] = [
  { id: "f1", metric: "f1", direction: "minimize", label: "f1" },
  { id: "f2", metric: "f2", direction: "minimize", label: "f2" },
];

function d(id: string, f1: number, f2: number, violation = 0): Design {
  return {
    id,
    generation: 0,
    parentIds: [],
    operator: "test",
    parameters: [],
    evaluation: {
      status: "ok",
      metrics: { f1, f2 },
      objectives: { f1, f2 },
      constraints: [],
      feasible: violation === 0,
      totalViolation: violation,
      diagnostics: [],
      fidelity: "t",
      backend: "t",
    },
  };
}

describe("constrained Pareto dominance", () => {
  test("a design dominates when no worse in all objectives and better in one", () => {
    expect(constrainedDominates(d("a", 1, 2), d("b", 2, 2), objectives)).toBe(true);
    expect(constrainedDominates(d("a", 1, 2), d("b", 1, 2), objectives)).toBe(false);
    expect(constrainedDominates(d("a", 1, 3), d("b", 2, 2), objectives)).toBe(false);
  });
  test("feasible dominates infeasible; lower violation dominates higher", () => {
    expect(constrainedDominates(d("a", 9, 9), d("b", 1, 1, 0.5), objectives)).toBe(true);
    expect(constrainedDominates(d("a", 1, 1, 0.2), d("b", 9, 9, 0.5), objectives)).toBe(true);
    expect(constrainedDominates(d("a", 1, 1, 0.5), d("b", 9, 9, 0.2), objectives)).toBe(false);
  });
  test("honours maximise direction", () => {
    const max: Objective[] = [{ ...objectives[0], direction: "maximize" }, objectives[1]];
    expect(constrainedDominates(d("a", 5, 1), d("b", 1, 1), max)).toBe(true);
  });
});

describe("non-dominated sorting and crowding", () => {
  const pop = [d("a", 1, 5), d("b", 2, 3), d("c", 3, 1), d("d", 2, 4), d("e", 4, 4), d("f", 1, 5, 1)];
  test("assigns fronts: first front is the Pareto set, infeasible last", () => {
    const fronts = nonDominatedSort(pop, objectives);
    expect(fronts[0].map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
    expect(fronts[1].map((x) => x.id).sort()).toEqual(["d"]);
    expect(fronts[2].map((x) => x.id)).toEqual(["e"]);
    expect(fronts[3].map((x) => x.id)).toEqual(["f"]);
  });
  test("crowding distance is infinite at the extremes and larger for isolated points", () => {
    // c sits next to the far extreme d (10, 0), so its neighbour gap is larger than b's.
    const front = [d("a", 0, 10), d("b", 1, 6), d("c", 2, 5), d("d", 10, 0)];
    const cd = crowdingDistance(front, objectives);
    expect(cd.get("a")).toBe(Infinity);
    expect(cd.get("d")).toBe(Infinity);
    expect(cd.get("b")!).toBeCloseTo(0.2 + 0.5, 12);
    expect(cd.get("c")!).toBeCloseTo(0.9 + 0.6, 12);
    expect(cd.get("c")!).toBeGreaterThan(cd.get("b")!);
  });
  test("paretoFront returns the feasible non-dominated designs", () => {
    expect(paretoFront(pop, objectives).map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("2-D hypervolume", () => {
  test("computes the dominated area relative to a reference point (minimisation)", () => {
    const front = [d("a", 1, 3), d("b", 2, 2), d("c", 3, 1)];
    // Reference (4, 4): area = boxes 1..: (4-1)*(4-3) + (4-2)*(3-2) + (4-3)*(2-1) = 3 + 2 + 1 = 6
    expect(hypervolume2d(front, objectives, [4, 4])).toBeCloseTo(6, 12);
  });
  test("points beyond the reference contribute nothing", () => {
    expect(hypervolume2d([d("a", 5, 5)], objectives, [4, 4])).toBe(0);
  });
});
