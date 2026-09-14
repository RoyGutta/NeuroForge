/**
 * Simulated annealing with Deb-style acceptance for constrained problems.
 *
 * A single chain moves by Gaussian steps in normalised space. A candidate
 * that is better under Deb's rules is always accepted. A worse candidate is
 * accepted with probability exp(-delta / T), where delta is the relative
 * objective increase (both feasible) or the violation increase (both
 * infeasible); a feasible state is never abandoned for an infeasible one.
 * Temperature and step size decay geometrically each generation.
 *
 * Reference: Kirkpatrick, Gelatt & Vecchi (1983).
 */
import { compareDesigns, type Design } from "../core/design";
import type { OptimizerContext, OptimizerDescriptor, Optimizer } from "./types";
import { resolveParams } from "./types";
import { reflect } from "./evolutionary";

const PARAMS = [
  {
    id: "chains",
    label: "Parallel chains",
    description: "Independent annealing chains evaluated per generation.",
    default: 8,
    min: 1,
    max: 256,
    step: 1,
  },
  {
    id: "initialTemperature",
    label: "Initial temperature",
    description: "Relative objective worsening accepted with probability 1/e at the start.",
    default: 0.2,
    min: 1e-4,
    max: 10,
  },
  {
    id: "coolingRate",
    label: "Cooling rate",
    description: "Temperature multiplier per generation.",
    default: 0.97,
    min: 0.5,
    max: 0.9999,
  },
  {
    id: "initialStep",
    label: "Initial step",
    description: "Gaussian step width as a fraction of each variable's range.",
    default: 0.15,
    min: 0.001,
    max: 1,
  },
  {
    id: "stepDecay",
    label: "Step decay",
    description: "Step width multiplier per generation.",
    default: 0.985,
    min: 0.5,
    max: 1,
  },
];

export const annealingDescriptor: OptimizerDescriptor = {
  id: "annealing",
  label: "Simulated annealing",
  description:
    "Single-solution stochastic local search that accepts uphill moves with a decaying probability, run as several independent chains.",
  params: PARAMS,
  create(ctx, given, seeds = []) {
    return new AnnealingOptimizer(ctx, resolveParams(PARAMS, given), seeds);
  },
};

class AnnealingOptimizer implements Optimizer {
  readonly id = "annealing";
  private current: Design[] = [];
  private proposals: Design[] = [];
  private bestSoFar: Design | undefined;
  private temperature: number;
  private step: number;

  constructor(
    private readonly ctx: OptimizerContext,
    private readonly p: Record<string, number>,
    private readonly seeds: Design[]
  ) {
    this.temperature = p.initialTemperature;
    this.step = p.initialStep;
  }

  ask(generation: number): Design[] {
    if (this.current.length === 0 && this.proposals.length === 0) {
      const n = Math.round(this.p.chains);
      const init: Design[] = [];
      for (const s of this.seeds.slice(0, n)) {
        init.push({ ...s, generation: 0, parameters: this.ctx.space.clamp(s.parameters) });
      }
      while (init.length < n) {
        init.push({
          id: this.ctx.nextId(),
          generation: 0,
          parentIds: [],
          operator: "initial",
          parameters: this.ctx.space.sample(this.ctx.rng),
        });
      }
      this.proposals = init;
      return init;
    }
    this.proposals = this.current.map((c) => {
      const u = this.ctx.space.normalize(c.parameters);
      for (let i = 0; i < u.length; i++) u[i] = reflect(u[i] + this.ctx.rng.gaussian() * this.step);
      return {
        id: this.ctx.nextId(),
        generation,
        parentIds: [c.id],
        operator: "annealing-move",
        parameters: this.ctx.space.denormalize(u),
      };
    });
    return this.proposals;
  }

  tell(evaluated: Design[]): void {
    const objId = this.ctx.objective.id;
    const dir = this.ctx.objective.direction;
    if (this.current.length === 0) {
      this.current = evaluated.filter((d) => d.evaluation);
    } else {
      this.current = this.current.map((cur, k) => {
        const cand = evaluated[k];
        if (!cand?.evaluation) return cur;
        const c = compareDesigns(cand, cur, objId, dir);
        if (c <= 0) return cand;
        const ec = cand.evaluation;
        const eu = cur.evaluation!;
        let delta: number;
        if (eu.feasible && ec.feasible) {
          const fu = eu.objectives[objId];
          const fc = ec.objectives[objId];
          const rel = Math.abs(fu) > 1e-12 ? (fc - fu) / Math.abs(fu) : fc - fu;
          delta = dir === "minimize" ? rel : -rel;
        } else if (!eu.feasible && !ec.feasible) {
          delta = ec.totalViolation - eu.totalViolation;
        } else {
          return cur; // never leave feasibility for infeasibility
        }
        return this.ctx.rng.chance(Math.exp(-delta / this.temperature)) ? cand : cur;
      });
    }
    for (const d of evaluated) {
      if (!d.evaluation) continue;
      if (!this.bestSoFar || compareDesigns(d, this.bestSoFar, objId, dir) < 0) this.bestSoFar = d;
    }
    this.temperature *= this.p.coolingRate;
    this.step *= this.p.stepDecay;
    this.proposals = [];
  }

  best(): Design | undefined {
    return this.bestSoFar;
  }

  population(): Design[] {
    return this.current.slice();
  }
}
