# Research note: per-member surrogates and uncertainty-aware screening

Status: first results recorded 2026-09-22 (engine 0.4.0). Results come only
from `npm run benchmark` and `npm run ablation`; raw runs are committed under
`benchmarks/results/`.

## Question

Can per-member surrogate modelling produce more reliable constraint
prediction than direct global regression, and can uncertainty-aware
screening reduce expensive finite-element evaluations without degrading
solution quality?

## Background (what v0.2 measured)

On the canonical 12,000-design evolutionary run, a quadratic ridge surrogate
learned mass almost perfectly (held-out R² 0.999) but failed on the
constraint metrics: peak stress, buckling utilisation and displacement had
negative R² for ridge and weak R² for the Gaussian process. Those metrics are
maxima over members of quantities like N/A and N/A², so they are
non-smooth in the design variables and span orders of magnitude across a
search archive. The surrogate-assisted optimiser still beat the plain
evolutionary algorithm (median 0.620 vs 0.684 kg at 1,500 evaluations),
apparently because mass prediction alone is enough to steer, but it screens
on predicted feasibility that it cannot predict well.

## Hypotheses

H1. Member axial forces are smoother functions of the design variables than
    aggregate utilisations, so a surrogate for the force vector will be
    substantially more accurate than a surrogate for the utilisation
    maximum, and exact stress and Euler formulas applied to predicted forces
    will yield better feasibility classification than a global regressor.

H2. A conservative screening bound built from predictive uncertainty
    (force magnitude + k·σ) will lower the false-feasible rate of screening
    at the cost of a higher false-infeasible rate, and the net effect on
    search efficiency will depend on k.

H3. Spending a fraction of each generation's solver budget on candidates the
    model is most uncertain about (active learning) will improve the
    surrogate faster than pure exploitation and, at equal solver budget,
    will not degrade the best feasible mass found.

## Method

- Problem: canonical truss bridge (2 m, 500 N, Al 6061-T6, safety factor 2,
  four panels, 19 variables).
- Representation: design parameters (unit cube) → 15 member axial forces
  (multi-output surrogate) → exact stress, Euler buckling and utilisation
  → feasibility. Deflection remains a global surrogate target. Mass is exact.
- Models: Bayesian ridge on degree-2 polynomial features (closed-form
  posterior predictive variance with noise estimated from residuals) and a
  shared-kernel Gaussian process.
- Uncertainty use: conservative utilisation from |μ| + k·σ per member;
  acquisition mixes exploitation (best conservative prediction) with
  exploration (highest predictive uncertainty among predicted-feasible).
- Comparison: FEA-only evolutionary, global-surrogate evolutionary,
  member-surrogate uncertainty-aware evolutionary; identical seeds, equal
  solver budgets, multiple seeds; the solver verifies every screened design.
- Metrics: best feasible mass (median, IQR), evaluations to reach a target
  mass, feasibility precision/recall of the screen, false-feasible and
  false-infeasible rates, per-member force MAE and RMSE, overall force R²,
  95 % interval coverage and mean width, error-versus-uncertainty
  correlation, screening funnel counts.

## Results (2026-09-22, 8 seeds, 1,500 solver evaluations, target 0.828 kg)

| Variant | Median best mass | Evaluations to target | False-feasible | False-infeasible | Force R² | Coverage |
|---|---|---|---|---|---|---|
| global surrogate (v0.2) | 0.621 kg | 795 | | | | |
| member representation only (k=0, explore 0) | 0.536 kg | 630 | 1.2 % | 0.0 % | 0.998 | 97.9 % |
| + conservative bound (k=2) | 0.552 kg | 645 | 0.2 % | 0.0 % | 0.999 | 97.4 % |
| + exploration (explore 0.2) | 0.543 kg | 645 | 1.2 % | 0.0 % | 0.997 | 97.0 % |
| full method (k=2, explore 0.2) | 0.555 kg | 660 | 0.2 % | 1.3 % | 0.998 | 97.1 % |

Against the plain evolutionary algorithm (0.684 kg, 1,080 evaluations to
target, 5 seeds) every member-surrogate variant is better on both counts.
Full tables and the six-optimiser benchmark are in `docs/BENCHMARKS.md`.

Held-out member study on the canonical 12,000-design run (workspace learning
panel, split seed 42): member-force R² above 0.99, derived buckling and
stress utilisation recover R² far above the negative values of direct
regression in v0.2, nominal feasibility accuracy above 90 %, interval
coverage 97 %, and |error| positively correlated with predicted std.

## Failures and surprises

- Conservatism cost mass. With a screen that is already 98.8 % pure at k = 0,
  shifting forces by 2σ rejected good candidates faster than it avoided
  wasted solver calls; the median best mass rose by 3 %. k = 4 mainly added
  false-infeasible rejections.
- Exploration was inert. The force model reaches R² 0.998 after warm-up on
  this problem; there was nothing left for uncertainty-driven sampling to
  learn, so it only diluted exploitation.
- Coverage is slightly above nominal (97 % vs 95 %): the Bayesian ridge's
  residual-based noise estimate is a little pessimistic on this smooth
  response. Calibration bins show error rising with predicted std, so the
  ranking of uncertainty is informative even if its scale is conservative.
- Directly regressing log-utilisation (v0.2 idea) was not merely weak, it
  could be catastrophically wrong under extrapolation; validation-based
  transform selection was needed before the comparison was even fair.

## Conclusions

H1 is supported strongly: the representation change, not model capacity,
made constraint prediction reliable. H2 is supported in its first half
(false-feasible rate 1.2 % → 0.2 %) and refuted in its second on this problem
(no efficiency gain, small quality cost). H3 is not supported at this budget
on this problem. The honest recommendation is: use the member representation
always; treat k and the exploration share as knobs for expensive solvers or
weaker force models, not as defaults that help here.

## Limitations

- One problem family; results may not transfer to other structures.
- Uncertainty is a statistical statement about the surrogate's error, not an
  engineering safety margin; the solver still decides feasibility.
- Five to ten seeds resolve orderings, not small differences.

## Next experiments

- Repeat with an artificially expensive or noisy evaluator (or a larger
  truss with more members) where the force model is less accurate, to test
  whether k and exploration earn their keep when there is something to learn.
- Gaussian-process forces versus Bayesian ridge at small archive sizes.
- Transfer: train on one span/load, screen on another.
- Active learning that targets the members with the largest error rather than
  the designs with the largest mean std.
