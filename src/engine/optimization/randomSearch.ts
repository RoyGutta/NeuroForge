/**
 * Uniform random search. The honest baseline every other optimiser is
 * measured against: if an algorithm cannot beat this at equal budget, it is
 * not earning its complexity.
 */
import { compareDesigns, type Design } from "../core/design";
import type { OptimizerContext, OptimizerDescriptor, Optimizer } from "./types";
import { resolveParams } from "./types";

const PARAMS = [
  {
    id: "batchSize",
    label: "Batch size",
    description: "Designs sampled per generation.",
    default: 100,
    min: 1,
    max: 5000,
    step: 1,
  },
];

export const randomSearchDescriptor: OptimizerDescriptor = {
  id: "random-search",
  label: "Random search",
  description: "Uniform sampling of the design space. Reference baseline for benchmarking.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new RandomSearch(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class RandomSearch implements Optimizer {
  readonly id = "random-search";
  private bestSoFar: Design | undefined;
  private first = true;

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    private readonly seeds: Design[]
  ) {}

  ask(generation: number): Design[] {
    const n = Math.round(this.p.batchSize);
    const batch: Design[] = [];
    if (this.first) {
      for (const s of this.seeds) batch.push({ ...s, generation: 0 });
      this.first = false;
    }
    while (batch.length < n) {
      batch.push({
        id: this.ctx.nextId(),
        generation,
        parentIds: [],
        operator: "random",
        parameters: this.ctx.space.sample(this.ctx.rng),
      });
    }
    return batch;
  }

  tell(evaluated: Design[]): void {
    for (const d of evaluated) {
      if (!d.evaluation) continue;
      if (
        !this.bestSoFar ||
        compareDesigns(d, this.bestSoFar, this.ctx.objective.id, this.ctx.objective.direction) < 0
      ) {
        this.bestSoFar = d;
      }
    }
  }

  best(): Design | undefined {
    return this.bestSoFar;
  }

  population(): Design[] {
    return this.bestSoFar ? [this.bestSoFar] : [];
  }
}
