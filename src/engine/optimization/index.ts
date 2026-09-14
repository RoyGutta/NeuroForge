import type { Design } from "../core/design";
import { annealingDescriptor } from "./annealing";
import { evolutionaryDescriptor } from "./evolutionary";
import { randomSearchDescriptor } from "./randomSearch";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";

export type { Optimizer, OptimizerContext, OptimizerDescriptor, OptimizerParamSpec } from "./types";
export { resolveParams } from "./types";

const REGISTRY: Record<string, OptimizerDescriptor> = {
  [evolutionaryDescriptor.id]: evolutionaryDescriptor,
  [annealingDescriptor.id]: annealingDescriptor,
  [randomSearchDescriptor.id]: randomSearchDescriptor,
};

export function listOptimizers(): OptimizerDescriptor[] {
  return Object.values(REGISTRY);
}

export function getOptimizerDescriptor(id: string): OptimizerDescriptor | undefined {
  return REGISTRY[id];
}

export function createOptimizer(
  id: string,
  ctx: OptimizerContext,
  params: Record<string, number>,
  seeds?: Design[]
): Optimizer {
  const desc = REGISTRY[id];
  if (!desc) throw new Error(`unknown optimizer "${id}"`);
  return desc.create(ctx, params, seeds);
}
