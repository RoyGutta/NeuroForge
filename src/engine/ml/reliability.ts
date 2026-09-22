/**
 * Reliability statistics for a feasibility screen and calibration of its
 * uncertainty. Everything here is computed from (predicted, actual) pairs
 * where the actual value came from the solver.
 */

export interface FeasibilityConfusion {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  /** TP / (TP + FP): of the designs the screen passed as feasible, the fraction that were. */
  precision: number;
  /** TP / (TP + FN): of the truly feasible designs, the fraction the screen passed. */
  recall: number;
  accuracy: number;
  /** FP / (TP + FP): predicted feasible but actually infeasible. */
  falseFeasibleRate: number;
  /** FN / (TP + FN): predicted infeasible but actually feasible. */
  falseInfeasibleRate: number;
  predictedFeasibleRate: number;
  actualFeasibleRate: number;
  count: number;
}

export function confusionFromPairs(pairs: { predicted: boolean; actual: boolean }[]): FeasibilityConfusion {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const p of pairs) {
    if (p.predicted && p.actual) tp++;
    else if (p.predicted && !p.actual) fp++;
    else if (!p.predicted && p.actual) fn++;
    else tn++;
  }
  const n = pairs.length;
  const div = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    truePositive: tp,
    falsePositive: fp,
    trueNegative: tn,
    falseNegative: fn,
    precision: div(tp, tp + fp),
    recall: div(tp, tp + fn),
    accuracy: div(tp + tn, n),
    falseFeasibleRate: div(fp, tp + fp),
    falseInfeasibleRate: div(fn, tp + fn),
    predictedFeasibleRate: div(tp + fp, n),
    actualFeasibleRate: div(tp + fn, n),
    count: n,
  };
}

export interface CalibrationBin {
  /** Predicted-std range of the bin (quantile-based). */
  stdLo: number;
  stdHi: number;
  meanStd: number;
  meanAbsError: number;
  /** Fraction of errors inside +/- 1.96 std within the bin. */
  coverage95: number;
  count: number;
}

/** Bin (|error|, std) pairs by std quantile; a calibrated model shows error rising with std and ~95 % coverage per bin. */
export function calibrationBins(errors: number[], stds: number[], bins = 5): CalibrationBin[] {
  if (errors.length !== stds.length) throw new Error("calibration: length mismatch");
  const n = errors.length;
  if (n === 0) return [];
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => stds[a] - stds[b]);
  const k = Math.min(bins, n);
  const out: CalibrationBin[] = [];
  for (let b = 0; b < k; b++) {
    const from = Math.floor((b * n) / k);
    const to = Math.floor(((b + 1) * n) / k);
    const members = idx.slice(from, to);
    if (members.length === 0) continue;
    let sumStd = 0;
    let sumErr = 0;
    let inside = 0;
    for (const i of members) {
      sumStd += stds[i];
      sumErr += errors[i];
      if (errors[i] <= 1.96 * stds[i]) inside++;
    }
    out.push({
      stdLo: stds[members[0]],
      stdHi: stds[members[members.length - 1]],
      meanStd: sumStd / members.length,
      meanAbsError: sumErr / members.length,
      coverage95: inside / members.length,
      count: members.length,
    });
  }
  return out;
}
