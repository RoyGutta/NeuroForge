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

## Next — v0.2 · Learning from simulation data
- [ ] Dataset builder: (parameters → metrics, feasibility) rows from experiment records, seeded train/validation/test splits
- [ ] `SurrogateModel` contract; ridge/polynomial baseline, MLP (Adam, seeded), Gaussian process
- [ ] Hold-out evaluation: MAE, RMSE, R², interval calibration for the GP; shown in the workspace with predicted-vs-actual plots
- [ ] Surrogate-assisted search: pre-screen k·λ proposals per generation, evaluate the top λ by FEA, report surrogate accuracy in the record
- [ ] Bayesian optimisation (GP + expected improvement with constraint handling) as an `OptimizerDescriptor`
- [ ] CMA-ES

## v0.3 · Trade-offs
- [ ] Multi-objective: mass vs compliance; NSGA-II; Pareto-front panel with click-to-inspect
- [ ] Tubular and I-section models; member removal with connectivity/stability check
- [ ] Symmetry option to halve the design space

## v0.4 · Benchmarks and stronger tracking
- [ ] Benchmark suite: fixed problems × optimisers × seeds at equal evaluation budget
- [ ] Objective-vs-evaluations plots with confidence bands; CSV/JSON export
- [ ] Result checksums and engine-version pinning in records; experiment comparison view

## v0.5 · Autonomous engineering loop
- [ ] Staged strategy comparison → convergence detection → discovery report generated from measured data

## v0.6 · Domains and 3D
- [ ] Second domain (thermal fin array or 2D frame with bending) behind `EngineeringDomain`
- [ ] Spatial (3D) truss FEA; Three.js viewport with deformation and force fields

## Later
- [ ] LLM-backed interpreter implementing `ProblemInterpreter`, validated against the rule-based one
- [ ] Neural surrogates, graph representations of structures, sketch-to-geometry, only with a real evaluation path
- [ ] Server-side job runner and shared experiment store
