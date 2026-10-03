import { describe, expect, test } from "vitest";
import { createLabConfig, runLabToCompletion } from "../../../src/engine/autonomous/lab";
import { createManipulatorProblem } from "../../../src/engine/domains/robotics/manipulator/template";
import { LocalStorageLabStore, MemoryLabStore, summarizeLab } from "../../../src/engine/experiments/labStore";

const record = runLabToCompletion(
  createLabConfig({ problem: createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }), seed: 2, strategies: ["evolutionary"], pilotBudget: 150, totalBudget: 1200, tradeoffBudget: 300, robustness: { tolerance: 0.02, samples: 40 }, convergence: { window: 8, minRelativeImprovement: 0.01 } })
);

class FakeStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe("lab store", () => {
  test("summarises a lab record with its objective, strategy and improvement", () => {
    const s = summarizeLab(record);
    expect(s.id).toBe(record.id);
    expect(s.domain).toBe("robotics");
    expect(s.objectiveMetric).toBe("peakTorque_Nm");
    expect(s.chosenStrategy).toBe(record.chosenStrategy);
    expect(s.improvementPercent).toBe(record.report.improvementPercent);
    expect(s.solverEvaluations).toBe(record.report.solverEvaluations);
    expect(s.status).toBe("completed");
  });

  test("memory and localStorage stores round-trip records and list newest first", async () => {
    for (const store of [new MemoryLabStore(), new LocalStorageLabStore(new FakeStorage())]) {
      await store.save(record);
      const older = { ...record, id: "older", startedAt: "2000-01-01T00:00:00.000Z" };
      await store.save(older);
      const list = await store.list();
      expect(list.map((s) => s.id)).toEqual([record.id, "older"]);
      const back = await store.get(record.id);
      expect(back).toEqual(record);
      await store.delete("older");
      expect((await store.list()).map((s) => s.id)).toEqual([record.id]);
      expect(await store.get("older")).toBeUndefined();
    }
  });
});
