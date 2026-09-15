/** Polynomial feature expansion: bias, linear terms, then (for degree 2)
 *  all squares and pairwise interactions in a fixed order. */
export function polynomialFeatures(X: number[][], degree: 1 | 2): number[][] {
  return X.map((x) => {
    const f: number[] = [1, ...x];
    if (degree === 2) {
      for (let i = 0; i < x.length; i++) for (let j = i; j < x.length; j++) f.push(x[i] * x[j]);
    }
    return f;
  });
}

export function featureCount(dimension: number, degree: 1 | 2): number {
  return 1 + dimension + (degree === 2 ? (dimension * (dimension + 1)) / 2 : 0);
}
