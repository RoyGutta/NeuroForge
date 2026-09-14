import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import {
  LocalStorageExperimentStore,
  MemoryExperimentStore,
} from "../../../src/engine/experiments/store";

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const record = runExperimentToCompletion(
  createExperimentConfig({
    id: "exp-1",
    problem,
    seed: 1,
    optimizer: { id: "random-search", params: {} },
    budget: { maxEvaluations: 100 },
  })
);

describe("experiment stores", () => {
  test("memory store round-trips and lists summaries newest first", async () => {
    const store = new MemoryExperimentStore();
    await store.save(record);
    await store.save({ ...record, id: "exp-2", startedAt: "2030-01-01T00:00:00.000Z" });
    const loaded = await store.get("exp-1");
    expect(loaded).toEqual(record);
    const list = await store.list();
    expect(list.map((s) => s.id)).toEqual(["exp-2", "exp-1"]);
    expect(list[0].bestObjective).toBe(record.best?.evaluation?.objectives.mass);
    await store.delete("exp-1");
    expect(await store.get("exp-1")).toBeUndefined();
  });

  test("localStorage store survives a reload of the same storage", async () => {
    const storage = fakeStorage();
    const a = new LocalStorageExperimentStore(storage, "nf-test");
    await a.save(record);
    const b = new LocalStorageExperimentStore(storage, "nf-test");
    const loaded = await b.get("exp-1");
    expect(loaded?.best?.parameters).toEqual(record.best?.parameters);
    expect((await b.list()).length).toBe(1);
  });
});
