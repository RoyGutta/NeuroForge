/**
 * Regression metrics for surrogate evaluation. All functions take plain
 * arrays of equal length and throw on a mismatch so a silent misalignment
 * can never produce a plausible-looking score.
 */

function check(a: number[], b: number[]): void {
  if (a.length !== b.length) throw new Error(`length mismatch: ${a.length} vs ${b.length}`);
  if (a.length === 0) throw new Error("empty input");
}

export function mae(actual: number[], predicted: number[]): number {
  check(actual, predicted);
  let s = 0;
  for (let i = 0; i < actual.length; i++) s += Math.abs(actual[i] - predicted[i]);
  return s / actual.length;
}

export function rmse(actual: number[], predicted: number[]): number {
  check(actual, predicted);
  let s = 0;
  for (let i = 0; i < actual.length; i++) s += (actual[i] - predicted[i]) ** 2;
  return Math.sqrt(s / actual.length);
}

/** Coefficient of determination. 1 for a perfect fit, 0 for predicting the mean, negative when worse. */
export function r2(actual: number[], predicted: number[]): number {
  check(actual, predicted);
  const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < actual.length; i++) {
    ssRes += (actual[i] - predicted[i]) ** 2;
    ssTot += (actual[i] - mean) ** 2;
  }
  if (ssTot === 0) return ssRes === 0 ? 1 : -Infinity;
  return 1 - ssRes / ssTot;
}

/** Fraction of actual values inside mean +/- z * std. */
export function coverage(actual: number[], mean: number[], std: number[], z = 1.96): number {
  check(actual, mean);
  check(actual, std);
  let inside = 0;
  for (let i = 0; i < actual.length; i++) if (Math.abs(actual[i] - mean[i]) <= z * std[i]) inside++;
  return inside / actual.length;
}
