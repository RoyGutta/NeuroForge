/**
 * Multi-objective utilities: constrained Pareto dominance (Deb et al., 2002),
 * fast non-dominated sorting, crowding distance, and 2-D hypervolume.
 */
import type { Design } from "../core/design";
import type { Objective } from "../core/problem";

function value(d: Design, o: Objective): number {
  const v = d.evaluation!.objectives[o.id];
  return o.direction === "minimize" ? v : -v;
}

/**
 * Constrained domination: a feasible design dominates any infeasible one; among
 * infeasible designs the smaller total violation dominates; among feasible
 * designs ordinary Pareto dominance applies (no worse in every objective,
 * strictly better in at least one).
 */
export function constrainedDominates(a: Design, b: Design, objectives: Objective[]): boolean {
  const ea = a.evaluation;
  const eb = b.evaluation;
  if (!ea || !eb) return !!ea && !eb;
  if (ea.feasible !== eb.feasible) return ea.feasible;
  if (!ea.feasible) return ea.totalViolation < eb.totalViolation;
  let better = false;
  for (const o of objectives) {
    const va = value(a, o);
    const vb = value(b, o);
    if (va > vb) return false;
    if (va < vb) better = true;
  }
  return better;
}

/** Fronts in order: fronts[0] is the non-dominated set. */
export function nonDominatedSort(pop: Design[], objectives: Objective[]): Design[][] {
  const n = pop.length;
  const dominated: number[][] = Array.from({ length: n }, () => []);
  const count = new Int32Array(n);
  const fronts: Design[][] = [];
  let current: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (constrainedDominates(pop[i], pop[j], objectives)) dominated[i].push(j);
      else if (constrainedDominates(pop[j], pop[i], objectives)) count[i]++;
    }
    if (count[i] === 0) current.push(i);
  }
  while (current.length > 0) {
    fronts.push(current.map((i) => pop[i]));
    const next: number[] = [];
    for (const i of current) {
      for (const j of dominated[i]) {
        count[j]--;
        if (count[j] === 0) next.push(j);
      }
    }
    current = next;
  }
  return fronts;
}

/** Crowding distance per design id within one front; extremes get Infinity. */
export function crowdingDistance(front: Design[], objectives: Objective[]): Map<string, number> {
  const dist = new Map<string, number>();
  for (const d of front) dist.set(d.id, 0);
  if (front.length <= 2) {
    for (const d of front) dist.set(d.id, Infinity);
    return dist;
  }
  for (const o of objectives) {
    const sorted = front.slice().sort((a, b) => value(a, o) - value(b, o));
    const lo = value(sorted[0], o);
    const hi = value(sorted[sorted.length - 1], o);
    dist.set(sorted[0].id, Infinity);
    dist.set(sorted[sorted.length - 1].id, Infinity);
    const range = hi - lo;
    if (range <= 0) continue;
    for (let i = 1; i < sorted.length - 1; i++) {
      const cur = dist.get(sorted[i].id)!;
      if (cur === Infinity) continue;
      dist.set(sorted[i].id, cur + (value(sorted[i + 1], o) - value(sorted[i - 1], o)) / range);
    }
  }
  return dist;
}

/** Feasible, non-dominated designs. */
export function paretoFront(pop: Design[], objectives: Objective[]): Design[] {
  const feasible = pop.filter((d) => d.evaluation?.feasible);
  if (feasible.length === 0) return [];
  return nonDominatedSort(feasible, objectives)[0] ?? [];
}

/**
 * Hypervolume dominated by a 2-objective front with respect to a reference
 * point (in minimisation orientation). Points not dominating the reference
 * contribute nothing.
 */
export function hypervolume2d(front: Design[], objectives: Objective[], reference: [number, number]): number {
  if (objectives.length !== 2) throw new Error("hypervolume2d requires exactly two objectives");
  const [o1, o2] = objectives;
  const pts = front
    .map((d) => [value(d, o1), value(d, o2)] as [number, number])
    .filter(([a, b]) => a < reference[0] && b < reference[1])
    .sort((p, q) => p[0] - q[0]);
  let hv = 0;
  let prevY = reference[1];
  for (const [x, y] of pts) {
    if (y >= prevY) continue; // dominated by an earlier point
    hv += (reference[0] - x) * (prevY - y);
    prevY = y;
  }
  return hv;
}
