/**
 * Datasets of (design parameters -> simulated metrics) built from evaluated
 * designs. Because experiments are reproducible, a dataset never has to be
 * stored: `collectDesigns(config)` regenerates every evaluated design from the
 * experiment configuration and seed.
 */
import type { Design } from "../core/design";
import { Rng } from "../core/rng";
import type { DesignSpace } from "../core/space";
import type { ExperimentConfig } from "../experiments/experiment";
import { runExperiment } from "../experiments/runner";

export interface Dataset {
  /** Inputs normalised to the unit cube, one row per design. */
  inputs: number[][];
  /** Target values keyed by metric id. */
  targets: Record<string, number[]>;
  feasible: boolean[];
  designIds: string[];
  variableIds: string[];
  metricIds: string[];
  /** Vector responses included, each expanded into columns "<id>[<i>]". */
  responseIds: string[];
  responseSizes: Record<string, number>;
  size: number;
  /** Designs skipped because their analysis failed (unstable / invalid). */
  skipped: number;
  /** Rows of one response, aligned with `inputs`. */
  responseMatrix(id: string): number[][];
}

export function responseColumns(ds: { responseSizes: Record<string, number> }, id: string): string[] {
  const n = ds.responseSizes[id];
  if (n === undefined) throw new Error(`dataset has no response "${id}"`);
  return Array.from({ length: n }, (_, i) => `${id}[${i}]`);
}

/** Re-run an experiment and return every design it evaluated, in order. */
export function collectDesigns(config: ExperimentConfig): Design[] {
  const out: Design[] = [];
  const gen = runExperiment(config, { onBatch: (batch) => out.push(...batch) });
  let step = gen.next();
  while (!step.done) step = gen.next();
  return out;
}

export function buildDataset(space: DesignSpace, designs: Design[], metricIds: string[], responseIds: string[] = []): Dataset {
  const inputs: number[][] = [];
  const targets: Record<string, number[]> = {};
  for (const m of metricIds) targets[m] = [];
  const responseSizes: Record<string, number> = {};
  const feasible: boolean[] = [];
  const designIds: string[] = [];
  let skipped = 0;
  for (const d of designs) {
    const ev = d.evaluation;
    if (!ev || ev.status !== "ok") {
      skipped++;
      continue;
    }
    if (metricIds.some((m) => !Number.isFinite(ev.metrics[m]))) {
      skipped++;
      continue;
    }
    if (responseIds.some((r) => !ev.responses?.[r] || ev.responses[r].some((v) => !Number.isFinite(v)))) {
      skipped++;
      continue;
    }
    inputs.push(space.normalize(d.parameters));
    for (const m of metricIds) targets[m].push(ev.metrics[m]);
    for (const r of responseIds) {
      const vec = ev.responses![r];
      if (responseSizes[r] === undefined) {
        responseSizes[r] = vec.length;
        for (let i = 0; i < vec.length; i++) targets[`${r}[${i}]`] = [];
      }
      if (vec.length !== responseSizes[r]) throw new Error(`response "${r}" has inconsistent length`);
      for (let i = 0; i < vec.length; i++) targets[`${r}[${i}]`].push(vec[i]);
    }
    feasible.push(ev.feasible);
    designIds.push(d.id);
  }
  for (const r of responseIds) if (responseSizes[r] === undefined) responseSizes[r] = 0;
  const ds: Dataset = {
    inputs,
    targets,
    feasible,
    designIds,
    variableIds: space.variables.map((v) => v.id),
    metricIds: metricIds.slice(),
    responseIds: responseIds.slice(),
    responseSizes,
    size: inputs.length,
    skipped,
    responseMatrix(this: Dataset, id) {
      // Reads from the object it is called on, so a sliced copy stays aligned.
      const cols = responseColumns(this, id).map((c) => this.targets[c]);
      return this.inputs.map((_, row) => cols.map((c) => c[row]));
    },
  };
  return ds;
}

export interface DatasetSlice {
  indices: number[];
  inputs: number[][];
  targets: Record<string, number[]>;
  size: number;
}

export interface SplitFractions {
  train: number;
  validation: number;
  test: number;
}

export function splitDataset(
  ds: Dataset,
  seed: number,
  fractions: SplitFractions
): { train: DatasetSlice; validation: DatasetSlice; test: DatasetSlice } {
  const total = fractions.train + fractions.validation + fractions.test;
  const rng = new Rng(seed);
  const order = Array.from({ length: ds.size }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const nTrain = Math.round((fractions.train / total) * ds.size);
  const nVal = Math.round((fractions.validation / total) * ds.size);
  const slice = (idx: number[]): DatasetSlice => {
    const targets: Record<string, number[]> = {};
    for (const m of Object.keys(ds.targets)) targets[m] = idx.map((i) => ds.targets[m][i]);
    return { indices: idx, inputs: idx.map((i) => ds.inputs[i]), targets, size: idx.length };
  };
  return {
    train: slice(order.slice(0, nTrain)),
    validation: slice(order.slice(nTrain, nTrain + nVal)),
    test: slice(order.slice(nTrain + nVal)),
  };
}

export interface Standardizer {
  mean: number;
  std: number;
  apply(values: number[]): number[];
  invert(values: number[]): number[];
}

/** Zero-mean, unit-variance scaling (population std). Constant inputs map to 0. */
export function standardize(values: number[]): Standardizer {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let v = 0;
  for (const x of values) v += (x - mean) ** 2;
  const std = Math.sqrt(v / n);
  const scale = std > 0 ? std : 1;
  return {
    mean,
    std,
    apply: (xs) => xs.map((x) => (x - mean) / scale),
    invert: (zs) => zs.map((z) => z * scale + mean),
  };
}
