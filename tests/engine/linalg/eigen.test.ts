import { describe, expect, test } from "vitest";
import { symmetricEigen } from "../../../src/engine/linalg/dense";

describe("symmetric eigendecomposition (Jacobi)", () => {
  test("recovers eigenvalues and orthonormal eigenvectors of a 3x3 symmetric matrix", () => {
    const A = new Float64Array([4, 1, 2, 1, 3, 0, 2, 0, 5]);
    const { values, vectors } = symmetricEigen(A, 3);
    expect(values.length).toBe(3);
    // A v = lambda v for each column; V^T V = I; reconstruct A.
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < 3; i++) {
        let av = 0;
        for (let j = 0; j < 3; j++) av += A[i * 3 + j] * vectors[j * 3 + k];
        expect(av).toBeCloseTo(values[k] * vectors[i * 3 + k], 9);
      }
    }
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        let dot = 0;
        for (let i = 0; i < 3; i++) dot += vectors[i * 3 + a] * vectors[i * 3 + b];
        expect(dot).toBeCloseTo(a === b ? 1 : 0, 9);
      }
    const trace = 4 + 3 + 5;
    expect(values.reduce((s, v) => s + v, 0)).toBeCloseTo(trace, 9);
  });

  test("returns eigenvalues in ascending order and handles a diagonal matrix", () => {
    const { values } = symmetricEigen(new Float64Array([3, 0, 0, 1]), 2);
    expect(Array.from(values)).toEqual([1, 3]);
  });
});
