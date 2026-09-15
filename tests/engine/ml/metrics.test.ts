import { describe, expect, test } from "vitest";
import { coverage, mae, r2, rmse } from "../../../src/engine/ml/metrics";

describe("regression metrics", () => {
  const y = [1, 2, 3, 4];
  const p = [1.5, 2, 2, 5];
  test("mae", () => expect(mae(y, p)).toBeCloseTo((0.5 + 0 + 1 + 1) / 4, 12));
  test("rmse", () => expect(rmse(y, p)).toBeCloseTo(Math.sqrt((0.25 + 0 + 1 + 1) / 4), 12));
  test("r2 is 1 for a perfect fit and 0 for predicting the mean", () => {
    expect(r2(y, y)).toBe(1);
    expect(r2(y, [2.5, 2.5, 2.5, 2.5])).toBeCloseTo(0, 12);
    expect(r2(y, p)).toBeCloseTo(1 - 2.25 / 5, 12);
  });
  test("coverage counts actuals inside mean +/- z*std", () => {
    const mean = [0, 0, 0, 0];
    const std = [1, 1, 1, 1];
    expect(coverage([0.5, -1.5, 3, 0], mean, std, 1.96)).toBeCloseTo(0.75, 12);
  });
  test("metrics reject mismatched lengths", () => {
    expect(() => mae([1], [1, 2])).toThrow();
  });
});
