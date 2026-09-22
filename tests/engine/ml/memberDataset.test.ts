import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig } from "../../../src/engine/experiments/runner";
import { buildDataset, collectDesigns, responseColumns, splitDataset } from "../../../src/engine/ml/dataset";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);
const config = createExperimentConfig({ id: "md", problem, seed: 3, optimizer: { id: "random-search", params: { batchSize: 50 } }, budget: { maxEvaluations: 200 } });

describe("member-level dataset columns", () => {
  test("responses expand into one column per component, aligned with metric columns", () => {
    const designs = collectDesigns(config);
    const ds = buildDataset(compiled.space, designs, ["mass_kg"], ["memberForces_N"]);
    const cols = responseColumns(ds, "memberForces_N");
    expect(cols).toHaveLength(15);
    expect(cols[0]).toBe("memberForces_N[0]");
    expect(ds.metricIds).toContain("mass_kg");
    expect(ds.responseIds).toEqual(["memberForces_N"]);
    expect(ds.responseSizes.memberForces_N).toBe(15);
    for (const c of cols) expect(ds.targets[c]).toHaveLength(ds.size);
    const i = 7;
    const d = designs.find((x) => x.id === ds.designIds[i])!;
    cols.forEach((c, m) => expect(ds.targets[c][i]).toBe(d.evaluation!.responses!.memberForces_N[m]));
  });

  test("is deterministic and survives a seeded split", () => {
    const a = buildDataset(compiled.space, collectDesigns(config), [], ["memberForces_N"]);
    const b = buildDataset(compiled.space, collectDesigns(config), [], ["memberForces_N"]);
    expect(a.targets["memberForces_N[3]"]).toEqual(b.targets["memberForces_N[3]"]);
    const s = splitDataset(a, 5, { train: 0.7, validation: 0.15, test: 0.15 });
    expect(Object.keys(s.train.targets)).toEqual(Object.keys(a.targets));
    expect(s.test.targets["memberForces_N[0]"]).toHaveLength(s.test.size);
  });

  test("matrix view returns rows aligned with inputs", () => {
    const ds = buildDataset(compiled.space, collectDesigns(config), [], ["memberForces_N"]);
    const Y = ds.responseMatrix("memberForces_N");
    expect(Y).toHaveLength(ds.size);
    expect(Y[0]).toHaveLength(15);
    expect(Y[4][2]).toBe(ds.targets["memberForces_N[2]"][4]);
  });
});
