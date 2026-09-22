# Roadmap

Ordered by technical depth × real functionality × research potential × demo
value. A stage ships only when it is real, tested, and honest in the UI.

## Done — v0.1.0 (2026-09-13)
- [x] Engineering problem schema with explicit assumptions and confidence
- [x] Rule-based brief interpreter behind a `ProblemInterpreter` contract
- [x] Warren ground-structure truss design space (heights + member areas)
- [x] 2D truss FEA (direct stiffness, Cholesky), yield / Euler buckling / deflection, self-weight
- [x] Deb feasibility ranking; evolutionary (μ+λ), simulated annealing, random search
- [x] Reproducible experiment runner (generator), records, localStorage store
- [x] Sensitivity, binding constraints, baseline diff from the real evaluator
- [x] Workspace: editable spec, live viewport (4 modes), history scrubbing, library, export
- [x] Home / Projects / Technology pages driven by live runs
- [x] 80 tests incl. closed-form solver checks and determinism

These are development directions, not commitments. Each stage ships only when
it is real, tested, and honest in the interface.

## Done — v0.2.0 (2026-09-14) · Learning from simulation data
- [x] Dataset builder: (parameters → metrics, feasibility) rows regenerated from experiment configs, seeded train/validation/test splits
- [x] `SurrogateModel` contract; ridge/polynomial baseline, MLP (Adam, seeded), Gaussian process
- [x] Hold-out evaluation: MAE, RMSE, R², interval coverage for the GP; workspace learning panel with predicted-vs-actual plots
- [x] Surrogate-assisted search: pre-screen k·λ proposals per generation, evaluate the top λ by FEA, online accuracy in the record
- [x] Bayesian optimisation (GP + constrained expected improvement) as an `OptimizerDescriptor`
- [x] Benchmark script and first measured comparison (`docs/BENCHMARKS.md`)
- [ ] CMA-ES

## Done — v0.4.0 (2026-09-22) · Per-member surrogates and uncertainty
- [x] Member axial forces exposed on evaluations; exact response model for stress and buckling
- [x] Multi-output Bayesian ridge and GP with predictive uncertainty
- [x] Hybrid predictor with nominal and k-sigma conservative derivations
- [x] Uncertainty-aware member-surrogate optimiser with recorded funnel, confusion, force error, calibration
- [x] Member-level study and reliability panel in the workspace
- [x] Ablation script; first measured results in `docs/BENCHMARKS.md` and `docs/RESEARCH.md`
- [ ] Per-node displacement responses so deflection is derived rather than regressed

## Done — v0.3.0 (2026-09-15) · Trade-offs
- [x] Multi-objective: mass vs compliance; NSGA-II with constrained domination; external Pareto archive with hypervolume history
- [x] Pareto-front panel with click-to-inspect in the workspace
- [ ] Tubular and I-section models; member removal with connectivity/stability check
- [ ] Symmetry option to halve the design space


## Done — v0.5.0 (2026-09-22) · CMA-ES and a benchmark view
- [x] CMA-ES as an `OptimizerDescriptor`, benchmarked at equal budget (negative result on the truss; recorded)
- [x] Benchmark view in the interface reading `benchmarks/results/*.json`: medians, IQR, evaluations-to-target, convergence curves, per-run inspection
- [ ] CMA-ES restarts and boundary handling
- [ ] Result checksums and engine-version pinning in records; experiment comparison view

## v0.6 · Autonomous engineering loop
- [ ] Staged strategy comparison → convergence detection → discovery report generated from measured data

## v0.7 · Domains and 3D
- [ ] Second domain (thermal fin array or 2D frame with bending) behind `EngineeringDomain`
- [ ] Spatial (3D) truss FEA; Three.js viewport with deformation and force fields

## Later
- [ ] LLM-backed interpreter implementing `ProblemInterpreter`, validated against the rule-based one
- [ ] Neural surrogates, graph representations of structures, sketch-to-geometry, only with a real evaluation path
- [ ] Server-side job runner and shared experiment store
