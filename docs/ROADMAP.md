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


## Done — v0.3.0 (2026-09-15) · Trade-offs
- [x] Multi-objective: mass vs compliance; NSGA-II with constrained domination; external Pareto archive with hypervolume history
- [x] Pareto-front panel with click-to-inspect in the workspace
- [ ] Tubular and I-section models; member removal with connectivity/stability check
- [ ] Symmetry option to halve the design space


## Done — v0.5.0 (2026-09-22) · CMA-ES and a benchmark view
- [x] CMA-ES as an `OptimizerDescriptor`, benchmarked at equal budget (negative result on the truss; recorded)
- [x] Benchmark view in the interface reading `benchmarks/results/*.json`: medians, IQR, evaluations-to-target, convergence curves, per-run inspection

- [ ] Result checksums and engine-version pinning in records; experiment comparison view

## Done — v0.7.0 (2026-09-27) · Response-aware learning and experimental rigor
- [x] Displacement responses; combined representation; log-encoded learning features
- [x] CMA-ES diagnosis, new defaults, IPOP restarts (measured: now better than the plain EA, behind surrogates)
- [x] Study registry with bootstrap intervals and effect sizes; first registered 10-seed study
- [x] Study records in the benchmark view

## Done — v0.6.0 (2026-09-26) · Autonomous engineering loop
- [x] Staged strategy comparison → convergence detection → trade-off stage → discovery report generated from measured data
- [ ] Multi-seed pilots and a stored lab record type in the library

## Done — v0.8.0 (2026-09-27) · Second engineering domain
- [x] Robotics domain: planar two-link manipulator (kinematics, static torques, tubular-link bending) behind `EngineeringDomain`
- [x] Baseline, evaluator, responses and response model; evolutionary, CMA-ES, member-surrogate and NSGA-II runs through the registry
- [x] Interpreter routes manipulator briefs (payload, reach) to the new domain
- [x] Autonomous lab chooses the trade-off metric from the domain's metrics
- [x] Domain-aware workspace: specification form, manipulator drawing (task points, torque, utilisation, deflection), metrics, learning panels; home-page demo and project card
- [x] Study registry accepts either domain; a registered manipulator study

## v0.9 · Cross-domain autonomy and robustness
- [ ] Multi-seed pilots and stored lab records; lab-report style discovery report
- [ ] Engineering uncertainty taxonomy; tolerance and robustness studies
- [ ] Cross-domain learning comparisons

## Later domains and 3D
- [ ] Thermal or aerospace domain behind `EngineeringDomain`
- [ ] Spatial (3D) truss FEA; Three.js viewport with deformation and force fields

## Later
- [ ] LLM-backed interpreter implementing `ProblemInterpreter`, validated against the rule-based one
- [ ] Neural surrogates, graph representations of structures, sketch-to-geometry, only with a real evaluation path
- [ ] Server-side job runner and shared experiment store
