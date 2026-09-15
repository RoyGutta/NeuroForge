import type { Rng } from "../../core/rng";
import { gpDescriptor } from "./gp";
import { mlpDescriptor } from "./mlp";
import { ridgeDescriptor } from "./ridge";
import type { SurrogateDescriptor, SurrogateModel } from "./types";

export type { Prediction, SurrogateDescriptor, SurrogateModel, SurrogateParamSpec } from "./types";

const REGISTRY: Record<string, SurrogateDescriptor> = {
  [ridgeDescriptor.id]: ridgeDescriptor,
  [mlpDescriptor.id]: mlpDescriptor,
  [gpDescriptor.id]: gpDescriptor,
};

export function listSurrogates(): SurrogateDescriptor[] {
  return Object.values(REGISTRY);
}

export function getSurrogateDescriptor(id: string): SurrogateDescriptor | undefined {
  return REGISTRY[id];
}

export function createSurrogate(id: string, params: Record<string, number>, rng: Rng): SurrogateModel {
  const d = REGISTRY[id];
  if (!d) throw new Error(`unknown surrogate "${id}"`);
  return d.create(params, rng);
}
