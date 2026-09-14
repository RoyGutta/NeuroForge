/**
 * Explainability derived from the real evaluator, never from prose.
 *
 * - `parameterSensitivity`: central finite differences of a metric with
 *   respect to every design variable, normalised by the variable's range so
 *   quantities in metres and square metres are comparable.
 * - `bindingConstraints`: constraints whose utilisation is within a tolerance
 *   of their limit; these are what actually shape the design.
 * - `explainDifference`: which variables and groups changed between two
 *   designs, and what that did to every metric.
 */
import type { Evaluation } from "../core/design";
import type { CompiledProblem } from "../domains/domain";

export interface SensitivityEntry {
  id: string;
  label: string;
  group: string;
  /** d(metric)/d(variable) in the variable's own units. */
  gradient: number;
  /** Gradient times the variable range: metric change across the full range. */
  normalizedGradient: number;
  /** |normalizedGradient| as a fraction of the sum over all variables. */
  share: number;
}

export interface GroupSensitivity {
  group: string;
  share: number;
}

export interface SensitivityReport {
  metric: string;
  entries: SensitivityEntry[];
  groups: GroupSensitivity[];
  relativeStep: number;
}

export function parameterSensitivity(
  compiled: CompiledProblem,
  params: number[],
  metric: string,
  options: { relativeStep?: number } = {}
): SensitivityReport {
  const relativeStep = options.relativeStep ?? 1e-3;
  const vars = compiled.space.variables;
  const value = (p: number[]) => {
    const v = compiled.evaluate(p).metrics[metric];
    return Number.isFinite(v) ? v : Number.NaN;
  };
  const entries: SensitivityEntry[] = vars.map((v, i) => {
    const range = v.upper - v.lower;
    const h = Math.max(range * relativeStep, 1e-12);
    const up = params.slice();
    const down = params.slice();
    up[i] = Math.min(v.upper, params[i] + h);
    down[i] = Math.max(v.lower, params[i] - h);
    const denom = up[i] - down[i];
    let gradient = 0;
    if (denom > 0) {
      const fu = value(up);
      const fd = value(down);
      gradient = Number.isFinite(fu) && Number.isFinite(fd) ? (fu - fd) / denom : 0;
    }
    return {
      id: v.id,
      label: v.label,
      group: v.group,
      gradient,
      normalizedGradient: gradient * range,
      share: 0,
    };
  });
  const total = entries.reduce((s, e) => s + Math.abs(e.normalizedGradient), 0);
  for (const e of entries) e.share = total > 0 ? Math.abs(e.normalizedGradient) / total : 1 / entries.length;
  entries.sort((a, b) => b.share - a.share);
  const groupMap = new Map<string, number>();
  for (const e of entries) groupMap.set(e.group, (groupMap.get(e.group) ?? 0) + e.share);
  const groups = Array.from(groupMap, ([group, share]) => ({ group, share })).sort(
    (a, b) => b.share - a.share
  );
  return { metric, entries, groups, relativeStep };
}

export interface BindingConstraint {
  id: string;
  metric: string;
  utilization: number;
  satisfied: boolean;
}

/** Constraints within `tolerance` of (or beyond) their limit, most critical first. */
export function bindingConstraints(evaluation: Evaluation, tolerance = 0.05): BindingConstraint[] {
  const out: BindingConstraint[] = [];
  for (const c of evaluation.constraints) {
    if (!Number.isFinite(c.value)) continue;
    const utilization =
      c.op === "<="
        ? c.limit !== 0
          ? c.value / c.limit
          : c.value
        : c.value !== 0
          ? c.limit / c.value
          : Infinity;
    if (utilization >= 1 - tolerance) {
      out.push({ id: c.id, metric: c.metric, utilization, satisfied: c.satisfied });
    }
  }
  return out.sort((a, b) => b.utilization - a.utilization);
}

export interface VariableChange {
  id: string;
  label: string;
  group: string;
  from: number;
  to: number;
  /** (to - from) / |from|, or (to - from) / range when from is ~0. */
  relativeChange: number;
}

export interface GroupChange {
  group: string;
  meanRelativeChange: number;
  meanAbsoluteRelativeChange: number;
  count: number;
}

export interface DifferenceReport {
  changedVariables: VariableChange[];
  changed: GroupChange[];
  objectiveDelta: Record<string, number>;
}

export function explainDifference(
  compiled: CompiledProblem,
  from: number[],
  to: number[]
): DifferenceReport {
  const vars = compiled.space.variables;
  const changedVariables: VariableChange[] = [];
  const groupAcc = new Map<string, { sum: number; abs: number; n: number }>();
  vars.forEach((v, i) => {
    const a = from[i];
    const b = to[i];
    const range = v.upper - v.lower;
    const rel = Math.abs(a) > 1e-12 ? (b - a) / Math.abs(a) : (b - a) / range;
    const acc = groupAcc.get(v.group) ?? { sum: 0, abs: 0, n: 0 };
    acc.sum += rel;
    acc.abs += Math.abs(rel);
    acc.n++;
    groupAcc.set(v.group, acc);
    if (Math.abs(rel) > 1e-9) {
      changedVariables.push({ id: v.id, label: v.label, group: v.group, from: a, to: b, relativeChange: rel });
    }
  });
  changedVariables.sort((x, y) => Math.abs(y.relativeChange) - Math.abs(x.relativeChange));
  const changed: GroupChange[] = Array.from(groupAcc, ([group, acc]) => ({
    group,
    meanRelativeChange: acc.sum / acc.n,
    meanAbsoluteRelativeChange: acc.abs / acc.n,
    count: acc.n,
  })).sort((x, y) => y.meanAbsoluteRelativeChange - x.meanAbsoluteRelativeChange);
  const ea = compiled.evaluate(from).metrics;
  const eb = compiled.evaluate(to).metrics;
  const objectiveDelta: Record<string, number> = {};
  for (const key of new Set([...Object.keys(ea), ...Object.keys(eb)])) {
    objectiveDelta[key] = (eb[key] ?? Number.NaN) - (ea[key] ?? Number.NaN);
  }
  return { changedVariables, changed, objectiveDelta };
}
