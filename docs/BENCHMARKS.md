# Benchmarks

Measured comparisons of the registered optimisers on the canonical problem
(2 m span, 500 N, Al 6061-T6, safety factor 2, four panels, 19 variables).
Reproduce with `npm run benchmark -- <seeds> <budget>`. Results are recorded
here only when they come from that script.

## 2026-10-03 · engine 1.0.0 · robust versus nominal, 10 seeds, 1,500 design evaluations

Registered study `benchmarks/studies/robust-versus-nominal.json`, raw runs and
analysis in `benchmarks/results/robust-versus-nominal-2026-10-03.json`.
Canonical truss, baseline 1.656 kg. Robust methods evaluate 12 perturbed
copies (+/- 2 %) inside every design evaluation and require 95 % of them
feasible; with 12 copies that means all 12 (11/12 = 91.7 %). Every run's best
design was then checked independently: 300 fresh perturbations at +/- 2 %
through the nominal evaluator. The budget counts design evaluations, so the
robust methods spent 13 x more solver calls.

| Method | Median best kg | 95 % CI | Robust feasible (independent, median) | Range | A vs nominal EA |
|---|---|---|---|---|---|
| nominal-ea (reference) | 0.686 | 0.673–0.707 | 100 % | 100–100 % | – |
| nominal-member | 0.543 | 0.540–0.550 | 70.7 % | 54–89 % | 1.00 (lighter) |
| robust-ea | 0.854 | 0.765–0.912 | 100 % | 88–100 % | 0.05 (heavier) |
| robust-member | 0.774 | 0.766–0.879 | 100 % | 100–100 % | 0.00 (heavier) |

Reading. The hypothesis is rejected at this budget and formulation. Robust
mode does what it says, every robust optimum passes the independent check,
but it costs 24 % (EA) to 43 % (member method) more mass than the same
method run nominally, not a few per cent. Two effects are visible. First,
the nominal evolutionary algorithm at 1,500 evaluations has not converged
onto the constraint limits, so its 0.686 kg designs are already fully robust;
only the member method, which reaches the limits (0.543 kg), pays for it with
a 71 % independent feasible fraction, in line with the 12 % measured on the
converged 0.524 kg lab design. Second, the in-loop sample is small, so the
95 % target behaves as "all copies feasible", a stricter requirement than
the 95 % measured afterwards. The structural question (does the robust
optimum redistribute material or thicken uniformly?) was not measured here
because the committed study record strips per-run designs. Follow-ups are
listed in `docs/RESEARCH.md`.

## 2026-09-27 · engine 0.8.0 · manipulator study, 10 seeds, 1,500 evaluations

Registered study `benchmarks/studies/manipulator-optimizers.json`, raw runs
and analysis in `benchmarks/results/manipulator-optimizers-2026-09-27.json`.
Problem: two-link manipulator, 2 kg payload, 0.8 m reach, safety factor 2,
objective peak joint torque. Baseline (equal links, common radius sized by
bisection) 17.55 N m; target 0.97 x baseline = 17.02 N m. The payload moment
at the full-reach task point alone is g x 2 kg x 0.8 m = 15.69 N m, so the
whole design freedom is worth at most about 11 % of the baseline torque; the
tip-deflection limit is the binding constraint on every good design.

| Method | Median best N m | 95 % CI | IQR | Evaluations to target (runs) | A vs EA | Effect |
|---|---|---|---|---|---|---|
| evolutionary (reference) | 16.981 | 16.977–17.000 | 16.977–16.996 | 630 (10/10) | – | – |
| global-surrogate | 17.281 | 17.129–17.355 | 17.143–17.349 | 705 (2/10) | 0.00 | large (worse) |
| member-k0 | 16.970 | 16.958–16.989 | 16.959–16.985 | 1,140 (10/10) | 0.68 | medium |
| member-k2 | 16.968 | 16.961–16.978 | 16.962–16.975 | 480 (10/10) | 0.77 | large |
| cmaes | 16.950 | 16.950–16.950 | 16.950–16.950 | 304 (10/10) | 1.00 | large |
| bayesian | 17.394 | 17.227–17.518 | 17.235–17.496 | not reached | 0.00 | large (worse) |

Reading. The ranking is not the truss ranking. CMA-ES, a small effect on the
19-variable truss, converges to the same optimum (16.950 N m) on every seed of
this smooth four-variable problem and reaches the target in a fifth of the
evolutionary algorithm's budget. The member-response surrogates still beat
the plain evolutionary algorithm (medium and large effects) but by a few
hundredths of a newton-metre, because there is little torque left to
remove. The global surrogate and constrained Bayesian optimisation are worse
than the plain evolutionary algorithm here: their scalar regressors of the
torque and of the deflection constraint are less reliable than the exact
constraint derivation, and the Bayesian optimiser's expected-improvement
proposals concentrate near the deflection limit. Optimiser choice is
domain-dependent; the autonomous lab's equal-budget pilots exist for this
reason.

## 2026-09-27 · engine 0.7.0 · registered study, 10 seeds, 1,500 evaluations

Study `representation-and-screening` (`benchmarks/studies/representation-and-screening.json`,
`npm run study -- <spec>`; raw runs and analysis in
`benchmarks/results/representation-and-screening-2026-09-27.json`).
Reference method: plain evolutionary. 95 % CI: seeded percentile bootstrap of
the median across seeds (2,000 resamples). A: Vargha–Delaney, the probability
that a run of the method beats a run of the reference; effect labels use
Cliff's delta thresholds 0.147 / 0.33 / 0.474.

| Method | Median best (kg) | 95 % CI | IQR | Evaluations to 0.828 kg | A vs reference | Effect |
|---|---|---|---|---|---|---|
| evolutionary (reference) | 0.686 | 0.673–0.707 | 0.674–0.703 | 1,080 (10/10) | | |
| global surrogate (log-encoded inputs) | 0.576 | 0.564–0.588 | 0.566–0.583 | 765 (10/10) | 1.00 | large |
| member, forces + displacements, k = 0 | **0.543** | 0.540–0.550 | 0.541–0.549 | **660** (10/10) | 1.00 | large |
| member, forces + displacements, k = 2, explore 0.2 | 0.549 | 0.542–0.557 | 0.542–0.557 | 675 (10/10) | 1.00 | large |
| CMA-ES (λ = 24, σ₀ = 0.1, IPOP restarts) | 0.672 | 0.624–0.699 | 0.628–0.697 | 936 (10/10) | 0.63 | small |

The confidence intervals of the member methods and the reference do not
overlap; the hypothesis is supported for the member methods and the global
surrogate, and only weakly for CMA-ES.

### Six-optimiser benchmark rerun (5 seeds, 1,500 evaluations, engine 0.7.0)
`benchmarks/results/2026-09-27-truss-1500x5.json`.

| Optimiser | Median best (kg) | IQR | Evaluations to target |
|---|---|---|---|
| evolutionary | 0.684 | 0.671–0.689 | 1,080 |
| surrogate-evolutionary (global, log-encoded) | 0.586 | 0.577–0.599 | 750 |
| member-surrogate-evolutionary (default: both, k = 2) | 0.545 | 0.542–0.554 | 660 |
| cmaes (new defaults) | 0.656 | 0.624–0.688 | 936 |
| bayesian (300) | 1.087 | 1.002–1.095 | not reached |
| annealing | 1.125 | 0.817–1.423 | 1,440 (2/5) |
| random-search | 1.656 | | not reached |

### What changed the numbers between v0.4 and v0.7
- **Log-encoded learning features.** Areas span a 500-fold range and responses
  scale like 1/A; encoding log-scaled variables log-linearly for learning
  (optimisers still use the linear cube) improved the global surrogate from
  0.621 to 0.586 kg at 5 seeds and made the displacement field learnable
  (per-component R² from negative to 0.97 on 12,000 designs).
- **Combined representation.** Forces from the force model, deflection and
  compliance from the displacement model: 0.543 vs 0.547 kg for forces-only
  (inside the IQR), with no regressed metric left. Differencing a learned
  displacement field to obtain forces is ill-conditioned (force R² −233 at
  1,600 designs; the map multiplies field errors by stiffnesses near 10⁷ N/m),
  so displacements-only is not used for stress and buckling.
- **CMA-ES diagnosis.** Boundary handling was not the problem (1 of 19
  optimal variables sits on a bound). Population and step size were: λ = 24,
  σ₀ = 0.1 gave 0.656 kg versus 0.732 kg for λ = 12, σ₀ = 0.3, and λ = 48
  starved the run of generations. IPOP restarts (double λ on step-size
  collapse or stagnation) are enabled by default. CMA-ES is now better than
  the plain EA on this problem but remains behind every surrogate method.

## 2026-09-22 · engine 0.4.0 · 5 seeds · 1,500 solver evaluations

Adds the member-surrogate, uncertainty-aware optimiser (`member-surrogate-evolutionary`).
Raw runs and convergence curves: `benchmarks/results/2026-09-22-truss-1500x5.json`.

| Optimiser | Budget | Median best mass (kg) | IQR (kg) | Median evaluations to 0.828 kg | Screen false-feasible | Screen false-infeasible |
|---|---|---|---|---|---|---|
| evolutionary | 1,500 | 0.684 | 0.671-0.689 | 1,080 (5/5) | | |
| surrogate-evolutionary (global, v0.2) | 1,500 | 0.620 | 0.605-0.621 | 810 (5/5) | | |
| **member-surrogate-evolutionary** (k = 2, explore 0.2) | 1,500 | **0.555** | 0.544-0.555 | **660** (5/5) | 0.2 % | 1.2 % |
| bayesian | 300 | 1.087 | 1.002-1.095 | not reached | | |
| cmaes (added 2026-09-22, engine 0.5.0) | 1,500 | 0.732 | 0.640-0.804 | 1,212 (5/5) | | |
| annealing | 1,500 | 1.125 | 0.817-1.423 | 1,440 (2/5) | | |
| random-search | 1,500 | 1.656 | 1.656-1.656 | not reached | | |

Wall time per run (Node, Apple silicon): evolutionary 0.03 s, global surrogate
0.87 s, member surrogate 2.6 s, bayesian 8.5 s, CMA-ES 0.06 s.

CMA-ES is a negative result on this problem: with the default population of
12 it is worse than the plain evolutionary algorithm and highly variable
across seeds. See `docs/OPTIMIZATION.md` for the likely causes.

The interface's Benchmarks page (`/benchmarks`) renders these committed
records: summary tables, median convergence curves with interquartile bands,
and per-run inspection.

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
