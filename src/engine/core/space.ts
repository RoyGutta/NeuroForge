/**
 * Bounded continuous design space shared by every optimiser.
 */
import type { Rng } from "./rng";

export interface VariableSpec {
  id: string;
  label: string;
  /** Logical grouping (e.g. "depth", "area") used for display and sensitivity. */
  group: string;
  lower: number;
  upper: number;
  unit: string;
}

export interface DesignSpace {
  variables: VariableSpec[];
  dimension: number;
  clamp(params: number[]): number[];
  sample(rng: Rng): number[];
  /** Map raw parameters to [0,1]^d for scale-free optimisers and models. */
  normalize(params: number[]): number[];
  denormalize(unit: number[]): number[];
}

export function createDesignSpace(variables: VariableSpec[]): DesignSpace {
  const dimension = variables.length;
  return {
    variables,
    dimension,
    clamp(params) {
      assertLength(params, dimension);
      return params.map((v, i) =>
        Math.min(variables[i].upper, Math.max(variables[i].lower, v))
      );
    },
    sample(rng) {
      return variables.map((v) => rng.uniform(v.lower, v.upper));
    },
    normalize(params) {
      assertLength(params, dimension);
      return params.map((v, i) => {
        const { lower, upper } = variables[i];
        return (v - lower) / (upper - lower);
      });
    },
    denormalize(unit) {
      assertLength(unit, dimension);
      return unit.map((u, i) => {
        const { lower, upper } = variables[i];
        return lower + u * (upper - lower);
      });
    },
  };
}

export function assertLength(params: number[], dimension: number): void {
  if (params.length !== dimension) {
    throw new Error(
      `parameter vector has length ${params.length}, expected ${dimension}`
    );
  }
}
