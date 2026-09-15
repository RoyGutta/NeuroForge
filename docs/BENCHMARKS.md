# Benchmarks

Measured comparisons of the registered optimisers on the canonical problem
(2 m span, 500 N, Al 6061-T6, safety factor 2, four panels, 19 variables).
Reproduce with `npm run benchmark -- <seeds> <budget>`. Results are recorded
here only when they come from that script.

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
