import { describe, expect, test } from "vitest";
import {
  choleskySolve,
  NotPositiveDefiniteError,
  matVec,
} from "../../../src/engine/linalg/dense";

/** Dense matrices are row-major Float64Array with an explicit dimension. */
describe("dense linear algebra", () => {
  test("choleskySolve solves a 2x2 SPD system exactly", () => {
    // [4 1; 1 3] x = [1; 2]  ->  x = [1/11, 7/11]
    const A = new Float64Array([4, 1, 1, 3]);
    const b = new Float64Array([1, 2]);
    const x = choleskySolve(A, b, 2);
    expect(x[0]).toBeCloseTo(1 / 11, 12);
    expect(x[1]).toBeCloseTo(7 / 11, 12);
  });

  test("choleskySolve solves a 4x4 SPD system to round-off", () => {
    // Build A = L L^T from a known lower-triangular L so A is SPD by construction.
    const n = 4;
    const L = new Float64Array([
      2, 0, 0, 0,
      1, 3, 0, 0,
      0.5, -1, 4, 0,
      -1, 2, 0.5, 5,
    ]);
    const A = new Float64Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += L[i * n + k] * L[j * n + k];
        A[i * n + j] = s;
      }
    const xTrue = new Float64Array([1, -2, 3, 0.25]);
    const b = matVec(A, xTrue, n);
    const x = choleskySolve(A, b, n);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xTrue[i], 10);
  });

  test("choleskySolve rejects a singular (mechanism-like) matrix", () => {
    const A = new Float64Array([1, 1, 1, 1]);
    const b = new Float64Array([1, 1]);
    expect(() => choleskySolve(A, b, 2)).toThrow(NotPositiveDefiniteError);
  });

  test("choleskySolve rejects an indefinite matrix", () => {
    const A = new Float64Array([1, 2, 2, 1]);
    const b = new Float64Array([1, 1]);
    expect(() => choleskySolve(A, b, 2)).toThrow(NotPositiveDefiniteError);
  });

  test("matVec multiplies row-major matrix by vector", () => {
    const A = new Float64Array([1, 2, 3, 4, 5, 6]); // 2x3
    const x = new Float64Array([1, 0, -1]);
    const y = matVec(A, x, 3, 2);
    expect(Array.from(y)).toEqual([-2, -2]);
  });
});
