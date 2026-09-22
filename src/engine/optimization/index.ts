import type { Design } from "../core/design";
import { annealingDescriptor } from "./annealing";
import { bayesianDescriptor } from "./bayesian";
import { cmaesDescriptor } from "./cmaes";
import { evolutionaryDescriptor } from "./evolutionary";
import { memberSurrogateEvolutionaryDescriptor } from "./memberSurrogateEvolutionary";
import { nsga2Descriptor } from "./nsga2";
import { randomSearchDescriptor } from "./randomSearch";
import { surrogateEvolutionaryDescriptor } from "./surrogateEvolutionary";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";

export type { Optimizer, OptimizerContext, OptimizerDescriptor, OptimizerParamSpec, ScreeningSpec } from "./types";
export { resolveParams } from "./types";

const REGISTRY: Record<string, OptimizerDescriptor> = {
  [evolutionaryDescriptor.id]: evolutionaryDescriptor,
  [surrogateEvolutionaryDescriptor.id]: surrogateEvolutionaryDescriptor,
  [memberSurrogateEvolutionaryDescriptor.id]: memberSurrogateEvolutionaryDescriptor,
  [bayesianDescriptor.id]: bayesianDescriptor,
  [cmaesDescriptor.id]: cmaesDescriptor,
  [nsga2Descriptor.id]: nsga2Descriptor,
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
