/**
 * Ridge regression on polynomial features, solved in closed form:
 *   (Phi^T Phi + lambda I) w = Phi^T y
 * via Cholesky. Targets are standardised before fitting. Degree 2 with
 * interactions is a strong, fast baseline for smooth engineering responses
 * (mass is exactly linear in member areas; utilisations are smooth in them).
 */
import { choleskySolve } from "../../linalg/dense";
import { standardize, type Standardizer } from "../dataset";
import { polynomialFeatures } from "./features";
import type { SurrogateDescriptor, SurrogateModel } from "./types";
import { resolveSurrogateParams } from "./types";

const PARAMS = [
  { id: "degree", label: "Polynomial degree", description: "1 = linear, 2 = quadratic with interactions.", default: 2, min: 1, max: 2 },
  { id: "lambda", label: "Ridge penalty", description: "L2 regularisation strength on the feature weights.", default: 1e-6, min: 0, max: 10 },
];

export const ridgeDescriptor: SurrogateDescriptor = {
  id: "ridge",
  label: "Ridge (polynomial)",
  description: "Closed-form ridge regression on degree-1 or degree-2 polynomial features. Fast, deterministic baseline; no uncertainty estimate.",
  params: PARAMS,
  create(given) {
    return new RidgeSurrogate(resolveSurrogateParams(PARAMS, given));
  },
};

class RidgeSurrogate implements SurrogateModel {
  readonly id = "ridge";
  readonly hyperparameters: Record<string, number>;
  private weights: Float64Array | null = null;
  private scaler: Standardizer | null = null;
  private readonly degree: 1 | 2;

  constructor(p: Record<string, number>) {
    this.degree = p.degree >= 2 ? 2 : 1;
    this.hyperparameters = { degree: this.degree, lambda: p.lambda };
  }

  fit(X: number[][], y: number[]): void {
    if (X.length !== y.length || X.length === 0) throw new Error("ridge: inputs and targets must be non-empty and aligned");
    this.scaler = standardize(y);
    const z = this.scaler.apply(y);
    const Phi = polynomialFeatures(X, this.degree);
    const n = Phi.length;
    const k = Phi[0].length;
    const A = new Float64Array(k * k);
    const b = new Float64Array(k);
    for (let r = 0; r < n; r++) {
      const row = Phi[r];
      for (let i = 0; i < k; i++) {
        b[i] += row[i] * z[r];
        const base = i * k;
        for (let j = i; j < k; j++) A[base + j] += row[i] * row[j];
      }
    }
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) A[j * k + i] = A[i * k + j];
      A[i * k + i] += this.hyperparameters.lambda + 1e-12 * n;
    }
    this.weights = choleskySolve(A, b, k);
  }

  predict(X: number[][]) {
    if (!this.weights || !this.scaler) throw new Error("ridge: fit before predict");
    const Phi = polynomialFeatures(X, this.degree);
    const w = this.weights;
    const mean = Phi.map((row) => {
      let s = 0;
      for (let i = 0; i < row.length; i++) s += row[i] * w[i];
      return s;
    });
    return { mean: this.scaler.invert(mean) };
  }
}
