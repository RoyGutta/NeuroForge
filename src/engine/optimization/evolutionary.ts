/**
 * Elitist (mu + lambda) evolutionary algorithm with Deb feasibility ranking.
 *
 * - Selection: binary tournament using Deb's rules (feasible > infeasible,
 *   lower violation, better objective).
 * - Crossover: BLX-alpha blend crossover in normalised [0,1] space.
 * - Mutation: per-gene Gaussian perturbation with probability 1/d, scaled by
 *   `mutationSigma` (fraction of the variable range), reflected at bounds.
 * - Replacement: parents and offspring are pooled and the best mu survive,
 *   so the best design can never be lost (elitism).
 *
 * References: Deb (2000) "An efficient constraint handling method for
 * genetic algorithms"; Eshelman & Schaffer (1993) BLX-alpha.
 */
import { compareDesigns, type Design } from "../core/design";
import type { OptimizerContext, OptimizerDescriptor, Optimizer } from "./types";
import { resolveParams } from "./types";
import { blxCrossover, gaussianMutate, reflect } from "./variation";

export { reflect };

const PARAMS = [
  {
    id: "populationSize",
    label: "Population size",
    description: "Number of designs kept between generations (mu).",
    default: 60,
    min: 4,
    max: 1000,
    step: 1,
  },
  {
    id: "offspringSize",
    label: "Offspring per generation",
    description: "Number of new designs evaluated per generation (lambda). 0 = same as population.",
    default: 0,
    min: 0,
    max: 2000,
    step: 1,
  },
  {
    id: "crossoverRate",
    label: "Crossover rate",
    description: "Probability that an offspring is produced by blending two parents.",
    default: 0.9,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    id: "mutationSigma",
    label: "Mutation sigma",
    description: "Gaussian mutation width as a fraction of each variable's range.",
    default: 0.08,
    min: 0.001,
    max: 1,
    step: 0.01,
  },
  {
    id: "blxAlpha",
    label: "BLX alpha",
    description: "How far a blended child may fall outside its parents' interval.",
    default: 0.3,
    min: 0,
    max: 1,
    step: 0.05,
  },
];

export const evolutionaryDescriptor: OptimizerDescriptor = {
  id: "evolutionary",
  label: "Evolutionary (mu+lambda)",
  description:
    "Population-based search with tournament selection, blend crossover, Gaussian mutation and strict elitism. Robust default for constrained, non-smooth design spaces.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new EvolutionaryOptimizer(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class EvolutionaryOptimizer implements Optimizer {
  readonly id = "evolutionary";
  private pop: Design[] = [];
  private pending: Design[] = [];
  private readonly mu: number;
  private readonly lambda: number;
  private readonly d: number;

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    private readonly seeds: Design[]
  ) {
    this.mu = Math.round(p.populationSize);
    this.lambda = p.offspringSize > 0 ? Math.round(p.offspringSize) : this.mu;
    this.d = ctx.space.dimension;
  }

  ask(generation: number): Design[] {
    if (this.pop.length === 0 && this.pending.length === 0) {
      const initial: Design[] = [];
      for (const s of this.seeds.slice(0, this.mu)) {
        initial.push({ ...s, generation: 0, parameters: this.ctx.space.clamp(s.parameters) });
      }
      while (initial.length < this.mu) {
        initial.push({
          id: this.ctx.nextId(),
          generation: 0,
          parentIds: [],
          operator: "initial",
          parameters: this.ctx.space.sample(this.ctx.rng),
        });
      }
      this.pending = initial;
      return initial;
    }
    const children: Design[] = [];
    for (let k = 0; k < this.lambda; k++) children.push(this.makeChild(generation));
    this.pending = children;
    return children;
  }

  tell(evaluated: Design[]): void {
    const pool = this.pop.concat(evaluated.filter((d) => d.evaluation));
    pool.sort((a, b) => this.cmp(a, b));
    this.pop = pool.slice(0, this.mu);
    this.pending = [];
  }

  best(): Design | undefined {
    return this.pop[0];
  }

  population(): Design[] {
    return this.pop.slice();
  }

  private cmp(a: Design, b: Design): number {
    return compareDesigns(a, b, this.ctx.objective.id, this.ctx.objective.direction);
  }

  private tournament(): Design {
    const a = this.pop[this.ctx.rng.int(this.pop.length)];
    const b = this.pop[this.ctx.rng.int(this.pop.length)];
    return this.cmp(a, b) <= 0 ? a : b;
  }

  private makeChild(generation: number): Design {
    const rng = this.ctx.rng;
    const space = this.ctx.space;
    const p1 = this.tournament();
    let genes: number[];
    let parents: string[];
    let operator: string;
    if (rng.chance(this.p.crossoverRate)) {
      const p2 = this.tournament();
      genes = blxCrossover(space.normalize(p1.parameters), space.normalize(p2.parameters), this.p.blxAlpha, rng);
      parents = p1.id === p2.id ? [p1.id] : [p1.id, p2.id];
      operator = "crossover";
    } else {
      genes = space.normalize(p1.parameters);
      parents = [p1.id];
      operator = "mutation";
    }
    gaussianMutate(genes, 1 / this.d, this.p.mutationSigma, rng, operator === "mutation");
    return {
      id: this.ctx.nextId(),
      generation,
      parentIds: parents,
      operator,
      parameters: space.denormalize(genes),
    };
  }
}
