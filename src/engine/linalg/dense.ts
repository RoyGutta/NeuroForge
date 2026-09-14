/**
 * Minimal dense linear algebra over row-major Float64Array.
 *
 * The truss solver produces small symmetric positive-definite (SPD) stiffness
 * systems (tens to a few hundred DOFs). Cholesky factorisation is the right
 * tool: it is the fastest stable direct solver for SPD systems, and a failed
 * factorisation is itself a physically meaningful diagnostic (the structure
 * is a mechanism or has an unconstrained rigid-body mode).
 */

export class NotPositiveDefiniteError extends Error {
  constructor(public readonly pivotIndex: number) {
    super(`Matrix is not positive definite (failed at pivot ${pivotIndex})`);
    this.name = "NotPositiveDefiniteError";
  }
}

/** y = A x for an (rows x cols) row-major matrix. `rows` defaults to `cols`. */
export function matVec(
  A: Float64Array,
  x: Float64Array,
  cols: number,
  rows: number = cols
): Float64Array {
  const y = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const off = i * cols;
    for (let j = 0; j < cols; j++) s += A[off + j] * x[j];
    y[i] = s;
  }
  return y;
}

/**
 * Solve A x = b for SPD A (n x n, row-major) by Cholesky factorisation.
 * A is not modified. Throws NotPositiveDefiniteError if a pivot is not
 * strictly positive relative to the matrix scale.
 */
export function choleskySolve(
  A: Float64Array,
  b: Float64Array,
  n: number
): Float64Array {
  const L = new Float64Array(n * n);
  // Relative tolerance: a pivot smaller than this fraction of the largest
  // diagonal entry is treated as zero (numerically singular).
  let maxDiag = 0;
  for (let i = 0; i < n; i++) maxDiag = Math.max(maxDiag, Math.abs(A[i * n + i]));
  const tol = maxDiag * 1e-12;

  for (let j = 0; j < n; j++) {
    let d = A[j * n + j];
    for (let k = 0; k < j; k++) d -= L[j * n + k] * L[j * n + k];
    if (!(d > tol)) throw new NotPositiveDefiniteError(j);
    const ljj = Math.sqrt(d);
    L[j * n + j] = ljj;
    for (let i = j + 1; i < n; i++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = s / ljj;
    }
  }

  // Forward substitution: L y = b
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k];
    y[i] = s / L[i * n + i];
  }
  // Back substitution: L^T x = y
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
    x[i] = s / L[i * n + i];
  }
  return x;
}
