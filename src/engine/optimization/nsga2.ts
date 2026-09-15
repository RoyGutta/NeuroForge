/**
 * NSGA-II (Deb, Pratap, Agarwal & Meyarivan, 2002) with constrained
 * domination. Selection is a binary tournament on (front rank, crowding
 * distance); variation reuses the BLX-alpha crossover and Gaussian mutation
 * of the single-objective optimiser; survival is elitist over the pooled
 * parents and offspring, filling fronts in order and truncating the last one
 * by crowding distance.
 */
import type { Design } from "../core/design";
import { compareDesigns } from "../core/design";
import type { Objective } from "../core/problem";
import { crowdingDistance, nonDominatedSort, paretoFront } from "./pareto";
import type { Optimizer, OptimizerContext, OptimizerDescriptor } from "./types";
import { resolveParams } from "./types";
import { blxCrossover, gaussianMutate } from "./variation";

const PARAMS = [
  { id: "populationSize", label: "Population size", description: "Designs kept between generations.", default: 60, min: 4, max: 1000, step: 1 },
  { id: "crossoverRate", label: "Crossover rate", description: "Probability that an offspring blends two parents.", default: 0.9, min: 0, max: 1, step: 0.05 },
  { id: "mutationSigma", label: "Mutation sigma", description: "Gaussian mutation width as a fraction of each variable's range.", default: 0.08, min: 0.001, max: 1, step: 0.01 },
  { id: "blxAlpha", label: "BLX alpha", description: "How far a blended child may fall outside its parents' interval.", default: 0.3, min: 0, max: 1, step: 0.05 },
];

export const nsga2Descriptor: OptimizerDescriptor = {
  id: "nsga2",
  label: "NSGA-II (multi-objective)",
  description:
    "Non-dominated sorting genetic algorithm: evolves a whole Pareto front of trade-offs between objectives (e.g. mass versus compliance) using constrained domination and crowding distance.",
  multiObjective: true,
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new Nsga2(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class Nsga2 implements Optimizer {
  readonly id = "nsga2";
  private pop: Design[] = [];
  private rank = new Map<string, number>();
  private crowd = new Map<string, number>();
  private readonly mu: number;
  private readonly d: number;
  private readonly objectives: Objective[];
  private started = false;

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    private readonly seeds: Design[]
  ) {
    this.mu = Math.round(p.populationSize);
    this.d = ctx.space.dimension;
    this.objectives = ctx.objectives && ctx.objectives.length > 0 ? ctx.objectives : [ctx.objective];
  }

  ask(generation: number): Design[] {
    if (!this.started) {
      this.started = true;
      const initial: Design[] = this.seeds.slice(0, this.mu).map((s) => ({ ...s, generation: 0, parameters: this.ctx.space.clamp(s.parameters) }));
      while (initial.length < this.mu) {
        initial.push({ id: this.ctx.nextId(), generation: 0, parentIds: [], operator: "initial", parameters: this.ctx.space.sample(this.ctx.rng) });
      }
      return initial;
    }
    const children: Design[] = [];
    for (let k = 0; k < this.mu; k++) children.push(this.makeChild(generation));
    return children;
  }

  tell(evaluated: Design[]): void {
    const pool = this.pop.concat(evaluated.filter((d) => d.evaluation));
    const fronts = nonDominatedSort(pool, this.objectives);
    const next: Design[] = [];
    this.rank.clear();
    this.crowd.clear();
    for (let f = 0; f < fronts.length && next.length < this.mu; f++) {
      const front = fronts[f];
      const cd = crowdingDistance(front, this.objectives);
      for (const d of front) {
        this.rank.set(d.id, f);
        this.crowd.set(d.id, cd.get(d.id)!);
      }
      if (next.length + front.length <= this.mu) {
        next.push(...front);
      } else {
        const sorted = front.slice().sort((a, b) => cd.get(b.id)! - cd.get(a.id)! || a.id.localeCompare(b.id));
        next.push(...sorted.slice(0, this.mu - next.length));
      }
    }
    this.pop = next;
  }

  /** Feasible design with the best primary objective (for single-number reporting). */
  best(): Design | undefined {
    if (this.pop.length === 0) return undefined;
    return this.pop.slice().sort((a, b) => compareDesigns(a, b, this.ctx.objective.id, this.ctx.objective.direction))[0];
  }

  population(): Design[] {
    return this.pop.slice();
  }

  front(): Design[] {
    return paretoFront(this.pop, this.objectives);
  }

  private crowdedBetter(a: Design, b: Design): boolean {
    const ra = this.rank.get(a.id) ?? Infinity;
    const rb = this.rank.get(b.id) ?? Infinity;
    if (ra !== rb) return ra < rb;
    return (this.crowd.get(a.id) ?? 0) > (this.crowd.get(b.id) ?? 0);
  }

  private tournament(): Design {
    const a = this.pop[this.ctx.rng.int(this.pop.length)];
    const b = this.pop[this.ctx.rng.int(this.pop.length)];
    return this.crowdedBetter(b, a) ? b : a;
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
    return { id: this.ctx.nextId(), generation, parentIds: parents, operator, parameters: space.denormalize(genes) };
  }
}
