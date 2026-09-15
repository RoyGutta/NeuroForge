/**
 * Surrogate study: regenerate an experiment's designs, build a dataset,
 * split it, train each requested model on the training split, and report
 * held-out test metrics per target. Everything is seeded.
 */
import { Rng } from "../core/rng";
import { compileProblem } from "../domains/registry";
import type { ExperimentConfig } from "../experiments/experiment";
import { buildDataset, collectDesigns, splitDataset, type Dataset } from "./dataset";
import { coverage, mae, r2, rmse } from "./metrics";
import { createSurrogate, getSurrogateDescriptor } from "./models";

export interface SurrogateResult {
  modelId: string;
  target: string;
  trainSize: number;
  testSize: number;
  mae: number;
  rmse: number;
  r2: number;
  /** Fraction of test points inside the 95 % predictive interval, when the model provides std. */
  coverage95?: number;
  fitMs: number;
  /** True when the model was fitted to log(target) and predictions were exponentiated. Chosen on the validation split. */
  logSpace: boolean;
  /** R² on the validation split of the chosen transform (model selection score). */
  validationR2: number;
  hyperparameters: Record<string, number>;
  /** Predicted vs actual pairs on the test split (capped) for plotting. */
  sample: { actual: number; predicted: number; std?: number }[];
}

export interface SurrogateStudy {
  experimentId: string;
  dataset: { size: number; skipped: number; dimension: number };
  split: { train: number; validation: number; test: number; seed: number };
  results: SurrogateResult[];
}

export interface StudyOptions {
  models: string[];
  targets: string[];
  splitSeed?: number;
  /** Cap training size for expensive models (GP). Applies to all models for a fair comparison. */
  maxTrainingPoints?: number;
  modelParams?: Record<string, Record<string, number>>;
  sampleCap?: number;
  /** Fit strictly positive targets in log space (default true). */
  logTransform?: boolean;
}

export function runSurrogateStudy(config: ExperimentConfig, opts: StudyOptions): SurrogateStudy {
  const compiled = compileProblem(config.problem);
  const designs = collectDesigns(config);
  const dataset = buildDataset(compiled.space, designs, opts.targets);
  return studyDataset(dataset, config.id, opts);
}

export function studyDataset(dataset: Dataset, experimentId: string, opts: StudyOptions): SurrogateStudy {
  const splitSeed = opts.splitSeed ?? 1;
  const split = splitDataset(dataset, splitSeed, { train: 0.7, validation: 0.15, test: 0.15 });
  const cap = opts.maxTrainingPoints ?? Infinity;
  const trainX = split.train.inputs.slice(0, cap);
  const results: SurrogateResult[] = [];
  const sampleCap = opts.sampleCap ?? 300;
  for (const modelId of opts.models) {
    if (!getSurrogateDescriptor(modelId)) throw new Error(`unknown surrogate "${modelId}"`);
    for (const target of opts.targets) {
      const rawTrainY = split.train.targets[target].slice(0, cap);
      const seed = splitSeed * 7919 + hash(modelId + target);
      // Strictly positive responses can be fitted either directly or in log
      // space; which is better is target-dependent (mass is linear in areas,
      // utilisations vary over orders of magnitude). Choose on the validation
      // split, then evaluate once on the test split.
      const canLog = opts.logTransform !== false && rawTrainY.every((v) => v > 0);
      const transforms: Transform[] = canLog ? ["none", "log"] : ["none"];
      let chosen: { transform: Transform; model: ReturnType<typeof createSurrogate>; fitMs: number; validationR2: number } | null = null;
      for (const transform of transforms) {
        const model = createSurrogate(modelId, opts.modelParams?.[modelId] ?? {}, new Rng(seed));
        const t0 = now();
        model.fit(trainX, transform === "log" ? rawTrainY.map(Math.log) : rawTrainY);
        const fitMs = now() - t0;
        const valPred = predictWith(model, transform, split.validation.inputs, rawTrainY);
        const validationR2 = split.validation.size > 1 ? r2(split.validation.targets[target], valPred.mean) : NaN;
        if (!chosen || (Number.isFinite(validationR2) && validationR2 > chosen.validationR2)) chosen = { transform, model, fitMs, validationR2 };
      }
      const { transform, model, fitMs, validationR2 } = chosen!;
      const logSpace = transform === "log";
      const pred = predictWith(model, transform, split.test.inputs, rawTrainY);
      const actual = split.test.targets[target];
      const res: SurrogateResult = {
        modelId,
        target,
        trainSize: trainX.length,
        testSize: actual.length,
        mae: mae(actual, pred.mean),
        rmse: rmse(actual, pred.mean),
        r2: r2(actual, pred.mean),
        fitMs,
        logSpace,
        validationR2,
        hyperparameters: { ...model.hyperparameters },
        sample: actual.slice(0, sampleCap).map((a, i) => ({ actual: a, predicted: pred.mean[i], std: pred.std?.[i] })),
      };
      if (pred.std) res.coverage95 = coverage(actual, pred.mean, pred.std, 1.96);
      results.push(res);
    }
  }
  return {
    experimentId,
    dataset: { size: dataset.size, skipped: dataset.skipped, dimension: dataset.variableIds.length },
    split: { train: split.train.size, validation: split.validation.size, test: split.test.size, seed: splitSeed },
    results,
  };
}

type Transform = "none" | "log";

/**
 * Predict in original units. Log-space predictions are clamped to the
 * training range widened by a factor of e^3 (about 20x) on each side before
 * exponentiation, so a wild extrapolation reports as a large, finite error
 * instead of overflowing to Infinity.
 */
function predictWith(
  model: { predict(X: number[][]): { mean: number[]; std?: number[] } },
  transform: Transform,
  X: number[][],
  rawTrainY: number[]
): { mean: number[]; std?: number[] } {
  const raw = model.predict(X);
  if (transform === "none") return raw;
  const lo = Math.log(Math.min(...rawTrainY)) - 3;
  const hi = Math.log(Math.max(...rawTrainY)) + 3;
  const clampedMean = raw.mean.map((m) => Math.min(hi, Math.max(lo, m)));
  return {
    mean: clampedMean.map(Math.exp),
    // Delta-method spread of a log-normal: std_y ~ exp(mu) * sigma.
    std: raw.std ? raw.std.map((sd, i) => Math.exp(clampedMean[i]) * sd) : undefined,
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
