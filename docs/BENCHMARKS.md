# Benchmarks

Measured comparisons of the registered optimisers on the canonical problem
(2 m span, 500 N, Al 6061-T6, safety factor 2, four panels, 19 variables).
Reproduce with `npm run benchmark -- <seeds> <budget>`. Results are recorded
here only when they come from that script.

## 2026-09-22 · engine 0.4.0 · 5 seeds · 1,500 solver evaluations

Adds the member-surrogate, uncertainty-aware optimiser (`member-surrogate-evolutionary`).
Raw runs and convergence curves: `benchmarks/results/2026-09-22-truss-1500x5.json`.

| Optimiser | Budget | Median best mass (kg) | IQR (kg) | Median evaluations to 0.828 kg | Screen false-feasible | Screen false-infeasible |
|---|---|---|---|---|---|---|
| evolutionary | 1,500 | 0.684 | 0.671-0.689 | 1,080 (5/5) | | |
| surrogate-evolutionary (global, v0.2) | 1,500 | 0.620 | 0.605-0.621 | 810 (5/5) | | |
| **member-surrogate-evolutionary** (k = 2, explore 0.2) | 1,500 | **0.555** | 0.544-0.555 | **660** (5/5) | 0.2 % | 1.2 % |
| bayesian | 300 | 1.087 | 1.002-1.095 | not reached | | |
| annealing | 1,500 | 1.125 | 0.817-1.423 | 1,440 (2/5) | | |
| random-search | 1,500 | 1.656 | 1.656-1.656 | not reached | | |

Wall time per run (Node, Apple silicon): evolutionary 0.03 s, global surrogate
0.87 s, member surrogate 2.6 s, bayesian 8.5 s.

### Ablation · 8 seeds · 1,500 evaluations (`npm run ablation -- 8 1500 --out`)
Raw: `benchmarks/results/2026-09-22-ablation-1500x8.json`.

| Variant | Median best (kg) | IQR | Evaluations to target | False-feasible | False-infeasible | Force R² | 95 % coverage |
|---|---|---|---|---|---|---|---|
| global surrogate (v0.2) | 0.621 | 0.602-0.624 | 795 (8/8) | | | | |
| member representation only (k = 0, explore 0) | **0.536** | 0.531-0.542 | **630** (8/8) | 1.2 % | 0.0 % | 0.998 | 97.9 % |
| + conservative bound (k = 2, explore 0) | 0.552 | 0.547-0.562 | 645 (8/8) | 0.2 % | 0.0 % | 0.999 | 97.4 % |
| + exploration (k = 0, explore 0.2) | 0.543 | 0.541-0.544 | 645 (8/8) | 1.2 % | 0.0 % | 0.997 | 97.0 % |
| full (k = 2, explore 0.2) | 0.555 | 0.548-0.558 | 660 (8/8) | 0.2 % | 1.3 % | 0.998 | 97.1 % |
| aggressive (k = 4, explore 0.2) | 0.551 | 0.547-0.554 | 675 (8/8) | 0.1 % | 2.8 % | 0.998 | 96.5 % |

### Reading the tables
- **The representation is what matters.** Predicting member forces and applying
  the exact stress and Euler equations improves the median result by 14 % over
  the global surrogate and by 22 % over the plain evolutionary algorithm at
  equal budget, and reaches the target with 21 % fewer solver evaluations
  than the global surrogate (42 % fewer than the plain EA). Member-force R²
  on the gated designs is 0.998; the global surrogate's utilisation targets
  were unlearnable (negative R²) in v0.2.
- **The conservative bound trades mass for screen purity.** k = 2 cuts the
  false-feasible rate from 1.2 % to 0.2 % but raises the median best mass by
  about 3 %; k = 4 adds false-infeasible rejections (2.8 %) for almost no
  further purity. When the solver is this cheap and the nominal screen is
  already 98.8 % pure, conservatism costs more than it saves. It would matter
  when a wasted solver call is expensive or when the force model is worse.
- **Exploration did not help here.** Spending 20 % of each batch on the most
  uncertain candidates neither improved the model measurably (R² already
  0.998) nor the result. Uncertainty is well calibrated (coverage 97 % against
  a 95 % target, so intervals are slightly wide) and correlates with error,
  but there was little left to learn on this problem.
- The default settings (k = 2, explore 0.2) are therefore a safety-leaning
  choice, not the mass-optimal one; both are exposed in the interface.
- Eight seeds resolve these orderings; differences inside an IQR are not
  claims.

## 2026-09-14 · engine 0.2.0 · 5 seeds · 1,500 solver evaluations

| Optimiser | Budget | Median best mass (kg) | IQR (kg) | Feasible | Median evaluations to reach 0.828 kg |
|---|---|---|---|---|---|
| evolutionary | 1,500 | 0.684 | 0.671-0.689 | 5/5 | 1,080 (5/5 runs) |
| surrogate-evolutionary | 1,500 | **0.620** | 0.605-0.621 | 5/5 | **810** (5/5 runs) |
| bayesian | 300 | 1.087 | 1.002-1.095 | 5/5 | not reached |
| annealing | 1,500 | 1.125 | 0.817-1.423 | 5/5 | 1,440 (2/5 runs) |
| random-search | 1,500 | 1.656 | 1.656-1.656 | 5/5 | not reached |

Baseline (conventional uniform-section truss): 1.656 kg. Target for
time-to-target: half the baseline mass. Wall time per run (Node, Apple
silicon): evolutionary 0.07 s, surrogate-evolutionary 1.44 s, bayesian 10 s,
annealing 0.05 s, random search 0.02 s.

### Reading the table
- Surrogate pre-screening improved the median result by 9 % and reached the
  target with 25 % fewer solver evaluations than the plain evolutionary
  algorithm at the same budget. The online R² of the ridge surrogate for
  mass exceeded 0.99 in these runs (recorded in each experiment's
  diagnostics), which is expected: mass is linear in member areas.
- Bayesian optimisation was given one fifth of the budget because each of
  its evaluations costs orders of magnitude more compute; at 300 evaluations
  it beats random search decisively but does not match the evolutionary
  methods at 1,500. On this problem the solver is cheap, so evolutionary
  search wins; Bayesian optimisation is the right tool when a single
  evaluation is expensive, which the platform does not yet have.
- Random search never improves on the seeded baseline within budget, which
  quantifies how small the feasible, better-than-conventional region is.
- Five seeds is enough to see these orderings, not to make fine claims;
  rerun with more seeds before quoting differences smaller than the IQR.

## Method
Equal seeds across optimisers; every run warm-started from the baseline
(`seedBaseline: true`); metrics from the experiment records; medians and
interquartile ranges across seeds; time-to-target from the per-generation
best-so-far history.
