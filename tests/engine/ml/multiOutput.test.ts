import { describe, expect, test } from "vitest";
import { Rng } from "../../../src/engine/core/rng";
import { coverage, r2 } from "../../../src/engine/ml/metrics";
import { createMultiOutputSurrogate, listMultiOutputSurrogates } from "../../../src/engine/ml/models";

function grid(n: number, d: number, rng: Rng): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: d }, () => rng.next()));
}

describe("multi-output surrogates", () => {
  test("registry lists bayesian ridge and gp as multi-output capable", () => {
    expect(listMultiOutputSurrogates().map((s) => s.id)).toEqual(expect.arrayContaining(["ridge", "gp"]));
  });

  test("bayesian ridge recovers a linear multi-output map and returns per-output uncertainty", () => {
    const rng = new Rng(1);
    const X = grid(80, 3, rng);
    const Y = X.map((x) => [1 + 2 * x[0] - x[1], -3 + 0.5 * x[2], 4 * x[1]]);
    const m = createMultiOutputSurrogate("ridge", { degree: 1, lambda: 1e-9 }, new Rng(0));
    m.fit(X, Y);
    const p = m.predict(X);
    expect(p.mean).toHaveLength(80);
    expect(p.mean[0]).toHaveLength(3);
    p.mean.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(Y[i][j], 6)));
    expect(p.std).toBeDefined();
    expect(p.std![0]).toHaveLength(3);
    for (const row of p.std!) for (const s of row) expect(s).toBeGreaterThanOrEqual(0);
  });

  test("bayesian ridge intervals are calibrated on noisy data and shrink with more data", () => {
    const rng = new Rng(2);
    const f = (x: number[]) => [1 + 2 * x[0] - x[1] + 0.5 * x[0] * x[1], x[2] - x[0] * x[0]];
    const noise = [0.1, 0.05];
    const make = (n: number) => {
      const X = grid(n, 3, rng);
      const Y = X.map((x) => f(x).map((v, j) => v + noise[j] * rng.gaussian()));
      return { X, Y };
    };
    const small = make(60);
    const large = make(600);
    const Xt = grid(300, 3, rng);
    const Yt = Xt.map((x) => f(x).map((v, j) => v + noise[j] * rng.gaussian()));
    const fit = (d: { X: number[][]; Y: number[][] }) => {
      const m = createMultiOutputSurrogate("ridge", { degree: 2, lambda: 1e-6 }, new Rng(0));
      m.fit(d.X, d.Y);
      return m.predict(Xt);
    };
    const ps = fit(small);
    const pl = fit(large);
    for (const j of [0, 1]) {
      const cov = coverage(Yt.map((r) => r[j]), pl.mean.map((r) => r[j]), pl.std!.map((r) => r[j]), 1.96);
      expect(cov).toBeGreaterThan(0.88);
      expect(cov).toBeLessThanOrEqual(1);
      const meanStdSmall = ps.std!.reduce((s, r) => s + r[j], 0) / ps.std!.length;
      const meanStdLarge = pl.std!.reduce((s, r) => s + r[j], 0) / pl.std!.length;
      expect(meanStdLarge).toBeLessThan(meanStdSmall);
      expect(r2(Yt.map((r) => r[j]), pl.mean.map((r) => r[j]))).toBeGreaterThan(0.95);
    }
  });

  test("gp shares hyperparameters across outputs, interpolates and reports uncertainty", () => {
    const rng = new Rng(3);
    const X = grid(50, 2, rng);
    const Y = X.map((x) => [Math.cos(2 * x[0]) + x[1], Math.sin(3 * x[1]) - x[0]]);
    const m = createMultiOutputSurrogate("gp", { noise: 1e-6 }, new Rng(0));
    m.fit(X, Y);
    const p = m.predict(X);
    p.mean.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(Y[i][j], 3)));
    for (const row of p.std!) for (const s of row) expect(s).toBeLessThan(0.05);
    expect(m.hyperparameters.lengthscale).toBeGreaterThan(0);
    const far = m.predict([[3, 3]]);
    expect(far.std![0][0]).toBeGreaterThan(p.std![0][0] * 5);
  });

  test("is deterministic", () => {
    const rng = new Rng(4);
    const X = grid(40, 2, rng);
    const Y = X.map((x) => [x[0] + x[1], x[0] * x[1]]);
    const a = createMultiOutputSurrogate("ridge", {}, new Rng(0));
    const b = createMultiOutputSurrogate("ridge", {}, new Rng(0));
    a.fit(X, Y);
    b.fit(X, Y);
    expect(a.predict([[0.3, 0.7]])).toEqual(b.predict([[0.3, 0.7]]));
  });
});
