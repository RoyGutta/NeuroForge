/**
 * Surrogate model contract. A surrogate approximates (design parameters in
 * the unit cube) -> (one scalar metric). Models that can quantify their own
 * uncertainty return a per-point standard deviation; others leave it out.
 * The solver, never a surrogate, decides what is recorded as a result.
 */
import type { Rng } from "../../core/rng";

export interface Prediction {
  mean: number[];
  /** Predictive standard deviation, when the model provides one. */
  std?: number[];
}

export interface SurrogateModel {
  readonly id: string;
  fit(inputs: number[][], targets: number[]): void;
  predict(inputs: number[][]): Prediction;
  /** Hyperparameters actually used (after any automatic selection). */
  readonly hyperparameters: Record<string, number>;
}

export interface SurrogateParamSpec {
  id: string;
  label: string;
  description: string;
  default: number;
  min: number;
  max: number;
}

export interface SurrogateDescriptor {
  id: string;
  label: string;
  description: string;
  params: SurrogateParamSpec[];
  create(params: Record<string, number>, rng: Rng): SurrogateModel;
}

export function resolveSurrogateParams(
  spec: SurrogateParamSpec[],
  given: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of spec) {
    const v = given[p.id];
    out[p.id] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.default;
  }
  return out;
}
