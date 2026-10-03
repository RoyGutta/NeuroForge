# Changelog

## 0.9.0 — 2026-10-03 · Autonomous Search 2.0, robustness and uncertainty
- Robustness study (`src/engine/robustness`): seeded tolerance perturbation
  of a design through the real evaluator with feasible fraction, objective
  quantiles, per-constraint violation probabilities, a tolerance sweep and a
  bisection for the largest tolerance that keeps a target feasible fraction.
- Engineering uncertainty taxonomy (`src/engine/uncertainty`): model-form,
  parameter, numerical, manufacturing, surrogate and statistical sources,
  each quantified only when a measurement exists, otherwise documented or
  marked not modelled.
- Autonomous lab: pilots on several seeds ranked by median best objective,
  a robustness stage on the discovered design, the taxonomy and a lab-report
  style discovery report (question, method, results, uncertainty,
  limitations, reproducibility, conclusion) composed only from the record.
- Lab records are stored (`labStore.ts`) and listed in the workspace library
  with their report; a robustness panel runs tolerance studies on any design.
- Research questions and their status recorded in `docs/RESEARCH.md`.

## 0.8.0 — 2026-09-27 · Second engineering domain
- Robotics domain: a planar two-link manipulator with closed-form inverse
  kinematics, static gravity torques, tubular links checked for bending stress
  and tip deflection, twelve task points across the working envelope, and a
  baseline sized by bisection. Registered as `robotics` behind the unchanged
  `EngineeringDomain` contract; the structural domain is untouched.
- Responses `jointTorques_Nm` and `tipDeflections_m` with a response model
  that derives peak torque, stress utilisation, mass and reachability exactly.
- The hybrid predictor falls back to its response representation on domains
  without a displacement-to-force map; the autonomous lab picks the trade-off
  metric (compliance when minimising mass, otherwise mass) from the domain.
- Rule-based interpreter routes manipulator briefs (payload in kg or N, reach)
  to the robotics domain with explicit assumptions when values are missing.
- Domain-aware interface: domain selector and manipulator specification form,
  a manipulator drawing with task-point, torque, utilisation and deflection
  modes, per-domain metrics and learning targets, home-page demo and project
  card. Stale roadmap wording about surrogate learning on the technology page
  corrected.
- Study registry generalised to the problem's objective (`bestObjective`,
  `baselineObjective`, `targetObjective` with the metric's label and unit;
  the benchmark view reads the older mass-named records too); a registered
  manipulator study records a domain-dependent ranking: CMA-ES first, the
  member surrogates ahead of the evolutionary algorithm by a small margin,
  the global surrogate and Bayesian optimisation behind it.

## 0.7.0 — 2026-09-27 · Response-aware learning and experimental rigor
- Free-node displacement responses on evaluations; the truss response model
  derives forces kinematically, deflection and compliance exactly, and
  propagates uncertainty through the linear force map.
- Log-scaled design variables and `DesignSpace.encode` for learning features;
  combined `both` representation (forces + displacements) as the
  member-surrogate default, with the ill-conditioning of displacement-derived
  forces recorded.
- CMA-ES diagnosed and improved: λ = 2(4 + ⌊3 ln d⌋), σ₀ = 0.1, IPOP restarts.
- Study registry: JSON specs, `npm run study`, seeded bootstrap intervals,
  Vargha–Delaney A and Cliff's delta; first registered study with 10 seeds.
- Benchmarks page renders study records with hypothesis, intervals and effects.

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
