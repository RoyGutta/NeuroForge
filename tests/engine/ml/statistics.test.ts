import { describe, expect, test } from "vitest";
import { bootstrapMedianCI, cliffsDelta, median, varghaDelaneyA } from "../../../src/engine/ml/statistics";

describe("benchmark statistics", () => {
  test("median of odd and even samples", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  test("bootstrap CI of the median is seeded, contains the median, and narrows with more data", () => {
    const small = [0.55, 0.54, 0.57, 0.53, 0.56, 0.58, 0.52, 0.55];
    const a = bootstrapMedianCI(small, { seed: 1, resamples: 2000 });
    const b = bootstrapMedianCI(small, { seed: 1, resamples: 2000 });
    expect(a).toEqual(b);
    expect(a.lower).toBeLessThanOrEqual(a.median);
    expect(a.upper).toBeGreaterThanOrEqual(a.median);
    const big = Array.from({ length: 200 }, (_, i) => 0.55 + 0.03 * Math.sin(i * 12.9898));
    const c = bootstrapMedianCI(big, { seed: 1, resamples: 2000 });
    expect(c.upper - c.lower).toBeLessThan(a.upper - a.lower);
  });

  test("Vargha-Delaney A measures the probability that a value from A is smaller than one from B", () => {
    expect(varghaDelaneyA([1, 2, 3], [4, 5, 6])).toBe(1); // A always smaller
    expect(varghaDelaneyA([4, 5, 6], [1, 2, 3])).toBe(0);
    expect(varghaDelaneyA([1, 2, 3], [1, 2, 3])).toBe(0.5);
    expect(cliffsDelta([1, 2, 3], [4, 5, 6])).toBe(1);
    expect(cliffsDelta([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});
