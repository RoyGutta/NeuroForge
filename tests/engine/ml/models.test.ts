import { describe, expect, test } from "vitest";
import { Rng } from "../../../src/engine/core/rng";
import { r2 } from "../../../src/engine/ml/metrics";
import { createSurrogate, listSurrogates } from "../../../src/engine/ml/models";
import { polynomialFeatures } from "../../../src/engine/ml/models/features";

function grid(n: number, d: number, rng: Rng): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: d }, () => rng.next()));
}

describe("surrogate registry", () => {
  test("lists ridge, mlp and gp with parameter schemas", () => {
    const ids = listSurrogates().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["ridge", "mlp", "gp"]));
    for (const s of listSurrogates()) for (const p of s.params) expect(p.default).toBeGreaterThanOrEqual(p.min);
  });
});

describe("polynomial features", () => {
  test("degree 2 includes bias, linear, squares and pairwise interactions", () => {
    const f = polynomialFeatures([[2, 3]], 2);
    expect(f[0]).toEqual([1, 2, 3, 4, 6, 9]);
    expect(polynomialFeatures([[1, 2, 3]], 2)[0]).toHaveLength(1 + 3 + 6);
  });
});

describe("ridge regression", () => {
  test("recovers an exact linear function (degree 1)", () => {
    const rng = new Rng(1);
    const X = grid(60, 3, rng);
    const y = X.map((x) => 2 + 3 * x[0] - 4 * x[1] + 0.5 * x[2]);
    const m = createSurrogate("ridge", { degree: 1, lambda: 1e-10 }, new Rng(0));
    m.fit(X, y);
    const p = m.predict(X).mean;
    p.forEach((v, i) => expect(v).toBeCloseTo(y[i], 6));
  });

  test("recovers a quadratic with interactions (degree 2) and generalises", () => {
    const rng = new Rng(2);
    const X = grid(120, 3, rng);
    const f = (x: number[]) => 1 + x[0] * x[1] - 2 * x[2] ** 2 + 0.3 * x[0];
    const y = X.map(f);
    const m = createSurrogate("ridge", { degree: 2, lambda: 1e-8 }, new Rng(0));
    m.fit(X, y);
    const Xt = grid(40, 3, rng);
    const yt = Xt.map(f);
    expect(r2(yt, m.predict(Xt).mean)).toBeGreaterThan(0.999);
  });
});

describe("multilayer perceptron", () => {
  test("fits a smooth nonlinear function on held-out data and is deterministic", () => {
    const rng = new Rng(5);
    const f = (x: number[]) => Math.sin(3 * x[0]) + x[1] * x[1];
    const X = grid(400, 2, rng);
    const y = X.map(f);
    const Xt = grid(100, 2, rng);
    const yt = Xt.map(f);
    const fit = () => {
      const m = createSurrogate("mlp", { hidden: 32, epochs: 300, learningRate: 0.01 }, new Rng(7));
      m.fit(X, y);
      return m.predict(Xt).mean;
    };
    const p1 = fit();
    const p2 = fit();
    expect(r2(yt, p1)).toBeGreaterThan(0.95);
    expect(p1).toEqual(p2);
  });
});

describe("gaussian process", () => {
  test("interpolates training points and reports near-zero uncertainty there", () => {
    const rng = new Rng(9);
    const X = grid(40, 2, rng);
    const y = X.map((x) => Math.cos(2 * x[0]) + x[1]);
    const m = createSurrogate("gp", { noise: 1e-6 }, new Rng(0));
    m.fit(X, y);
    const p = m.predict(X);
    p.mean.forEach((v, i) => expect(v).toBeCloseTo(y[i], 3));
    for (const s of p.std!) expect(s).toBeLessThan(0.05);
  });

  test("uncertainty grows away from the data and predictions generalise", () => {
    const rng = new Rng(10);
    const X = grid(80, 2, rng).map((x) => [x[0] * 0.5, x[1] * 0.5]); // data in [0,0.5]^2
    const f = (x: number[]) => Math.sin(4 * x[0]) + 0.5 * x[1];
    const m = createSurrogate("gp", {}, new Rng(0));
    m.fit(X, X.map(f));
    const near = m.predict([[0.25, 0.25]]);
    const far = m.predict([[0.95, 0.95]]);
    expect(far.std![0]).toBeGreaterThan(near.std![0] * 3);
    const Xt = grid(40, 2, rng).map((x) => [x[0] * 0.5, x[1] * 0.5]);
    expect(r2(Xt.map(f), m.predict(Xt).mean)).toBeGreaterThan(0.99);
    expect(m.hyperparameters.lengthscale).toBeGreaterThan(0);
  });

  test("95 % intervals are reasonably calibrated on noisy data", () => {
    const rng = new Rng(11);
    const X = grid(150, 2, rng);
    const noise = 0.1;
    const f = (x: number[]) => x[0] + x[1] ** 2;
    const y = X.map((x) => f(x) + noise * rng.gaussian());
    const m = createSurrogate("gp", {}, new Rng(0));
    m.fit(X, y);
    const Xt = grid(200, 2, rng);
    const yt = Xt.map((x) => f(x) + noise * rng.gaussian());
    const p = m.predict(Xt);
    let inside = 0;
    yt.forEach((v, i) => {
      if (Math.abs(v - p.mean[i]) <= 1.96 * p.std![i]) inside++;
    });
    const cov = inside / yt.length;
    expect(cov).toBeGreaterThan(0.85);
    expect(cov).toBeLessThanOrEqual(1);
  });
});
