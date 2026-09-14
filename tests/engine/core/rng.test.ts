import { describe, expect, test } from "vitest";
import { Rng } from "../../../src/engine/core/rng";

describe("Rng (seeded PRNG)", () => {
  test("same seed produces the same sequence", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const sa = Array.from({ length: 20 }, () => a.next());
    const sb = Array.from({ length: 20 }, () => b.next());
    expect(sa).toEqual(sb);
  });

  test("different seeds produce different sequences", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  test("next() stays in [0, 1)", () => {
    const r = new Rng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("uniform(lo, hi) stays within bounds and covers the range", () => {
    const r = new Rng(3);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 10_000; i++) {
      const v = r.uniform(-2, 5);
      min = Math.min(min, v);
      max = Math.max(max, v);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
    expect(min).toBeLessThan(-1.9);
    expect(max).toBeGreaterThan(4.9);
  });

  test("gaussian() has approximately zero mean and unit variance", () => {
    const r = new Rng(11);
    const n = 50_000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const g = r.gaussian();
      sum += g;
      sumSq += g * g;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(variance - 1)).toBeLessThan(0.03);
  });

  test("int(n) returns integers in [0, n)", () => {
    const r = new Rng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = r.int(4);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });

  test("fork() derives an independent, reproducible child stream", () => {
    const a = new Rng(99).fork("child");
    const b = new Rng(99).fork("child");
    const c = new Rng(99).fork("other");
    expect(a.next()).toBe(b.next());
    expect(new Rng(99).fork("child").next()).not.toBe(c.next());
  });
});
