# Changelog

## 0.6.0 — 2026-09-26 · Autonomous engineering loop
- `runLab`: analysis (baseline, sensitivity, binding constraints), pilots of
  every strategy at equal solver budget on a derived seed, the winner run
  until its best-so-far plateaus (new `shouldStop` hook on the runner) or the
  budget is spent, an NSGA-II mass-versus-compliance stage, and a discovery
  report computed from the stage records (solver evaluations, surrogate
  predictions, strategies compared, improvement, stop reason, binding
  constraints, top variables, Pareto front size and hypervolume, screen
  reliability, wall time).
- Workspace: "Run autonomous search" with a live stage log, the report, and
  buttons that open the main and trade-off records in the existing panels.
- Pilot populations are sized to the pilot budget so strategies can
  differentiate within it.

## 0.5.0 — 2026-09-22 · CMA-ES and the benchmark view
- CMA-ES optimiser (rank-one and rank-mu covariance adaptation, cumulative
  step-size adaptation) with a Jacobi symmetric eigendecomposition in the
  linear-algebra module; benchmarked honestly (worse than the evolutionary
  algorithm on the canonical truss at 1,500 evaluations).
- Benchmarks page at `/benchmarks` reading committed benchmark and ablation
  records: summary tables, median convergence curves with interquartile
  bands, and per-run inspection. Linked from every footer and the Technology page.

## 0.4.0 — 2026-09-22 · Per-member surrogates and uncertainty-aware screening
- Evaluations carry member axial forces; the structural domain exposes a
  response model deriving mass, stress and buckling exactly from any force vector.
- Dataset columns for vector responses; multi-output Bayesian ridge and
  shared-kernel GP surrogates with predictive uncertainty.
- Hybrid predictor: learned forces, exact physics, nominal and k-sigma
  conservative derivations.
- `member-surrogate-evolutionary` optimiser with conservative screening,
  exploration share and recorded reliability (funnel, confusion, force error,
  calibration).
- Member-level study in the workspace: reliability table, error and
  uncertainty maps on the structure, calibration summary.
- `npm run ablation`; benchmark JSON output under `benchmarks/results/`.
- Measured: median best mass 0.536–0.555 kg vs 0.621 kg (global surrogate)
  and 0.684 kg (plain EA) at 1,500 evaluations; see `docs/BENCHMARKS.md`.

## 0.3.0 — 2026-09-15 · Multi-objective optimisation
- NSGA-II with constrained domination; external Pareto archive with monotone
  hypervolume; mass-versus-compliance problem option; Pareto panel.

## 0.2.0 — 2026-09-15 · Learning from simulation data
- Datasets regenerated from seeds; ridge, MLP, Gaussian-process surrogates with
  held-out evaluation; surrogate-assisted evolutionary search; constrained
  Bayesian optimisation; benchmark script; workspace learning panel; production
  deployment.

## 0.1.0 — 2026-09-13 · First vertical slice
- Problem schema with explicit assumptions; rule-based interpreter; Warren
  ground-structure design space; 2D truss FEA with buckling and deflection;
  evolutionary, annealing and random-search optimisers; reproducible
  experiments; sensitivity and binding constraints; workspace and live pages.
