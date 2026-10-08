# Architecture

## Principle

The intelligence lives in the engineering and optimisation engine, not in a
chat interface. The engine is plain TypeScript with no framework imports, so
the same code runs in vitest, in a Web Worker, and (later) in a Node service
or a GPU-backed job runner. React only renders what the engine produced.

```
brief ──► ProblemInterpreter ──► EngineeringProblem (typed, versioned, editable)
                                        │
                                        ▼
                         EngineeringDomain.compile(problem)
                                        │
                     ┌──────────────────┼─────────────────────┐
                     ▼                  ▼                     ▼
               DesignSpace        evaluate(params)       baseline design
            (bounded vars)     (FEA + constraints)     (sized by bisection)
                     │                  │
                     └────────┬─────────┘
                              ▼
                  Optimizer.ask() / tell()  ◄── seeded Rng
                              │
                              ▼
                     runExperiment(config)  — generator, one generation per step
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
          Web Worker     ExperimentRecord   ExperimentStore
        (off main thread) (every generation)  (localStorage / memory)
                              │
                              ▼
               Workspace UI · sensitivity · binding constraints · diff
```

## Layers

### `src/engine/core`
- `problem.ts` — `EngineeringProblem`: domain, geometry (discriminated union),
  material, loads, supports, safety factor, objectives, constraints (metric,
  op, limit, source), analysis settings, **assumptions** (field, value, reason,
  confidence), provenance, version. Pure data; JSON-serialisable.
- `design.ts` — `Design` (id, generation, parentIds, operator, parameters,
  evaluation) and `Evaluation` (metrics, objectives, constraint results,
  feasibility, total violation, status, backend, fidelity). `compareDesigns`
  implements Deb's feasibility rules and is the single ordering used by every
  optimiser and by the runner.
- `space.ts` — bounded continuous `DesignSpace` with clamp, sample, and
  normalise/denormalise to the unit cube so optimisers are scale-free.
- `rng.ts` — seeded mulberry32 with `fork(label)` for independent substreams.

### `src/engine/domains`
`EngineeringDomain` is the extension point: `validate(problem)`,
`compile(problem) → CompiledProblem { space, evaluate, baseline, artifact,
metrics, backendId }`. The registry maps domain id → module. Four domains are
registered: `structural` (truss bridge), `structural3d` (space truss girder),
`robotics` (planar manipulator) and `thermal` (plate-fin heat sink). Adding aerospace or fluids means
implementing this interface; nothing above it changes. Each compiled problem
may name a `tradeoffMetric` the autonomous lab uses for its NSGA-II stage.

The structural module compiles a `truss-bridge` geometry into a Warren
ground-structure space (`bridgeSpace.ts`), evaluates with the FEA solver
(`fea.ts`) and derives metrics (`evaluate.ts`, `metrics.ts`). The baseline is
a uniform-section truss at span/8 depth whose common area is found by
bisection to just satisfy the same constraints.

The spatial structural module (`structural/truss3d/`) compiles a
`space-truss` geometry into station heights plus member areas and evaluates
it with the dimension-generic direct-stiffness core (`truss/feaCore.ts`,
three DOFs per node) and the dimension-generic response model
(`truss/responseModelCore.ts`). Both cores were introduced in v1.3; the
planar adapters are verified bit for bit against the previous
implementations.

The thermal module compiles a `fin-array` geometry into a four-variable
space (fin height, thickness, pitch, base thickness) and evaluates each
design with closed-form fin theory and the Bar-Cohen and Rohsenow
natural-convection correlation solved to a fixed point (`fin.ts`,
`evaluate.ts`); its response is the thermal state vector. It was the third
domain to run on every layer above the contract unchanged.

The robotics module compiles a `planar-manipulator` geometry into a
four-variable space (two link lengths, two tube radii), evaluates each task
point with closed-form inverse kinematics, static gravity torques and
cantilever bending (`kinematics.ts`, `statics.ts`, `beam.ts`, `evaluate.ts`),
and exposes joint torques and tip deflections as responses. Optimisers,
the experiment runner, the surrogates, the study registry and the autonomous
lab run on it unchanged; only the viewport renderer and the specification
form are domain-specific in the UI.

### `src/engine/optimization`
Ask/tell `Optimizer` interface. The optimiser never evaluates anything; the
runner does. The runner passes a `ScreeningSpec` (objective metric and
constraint specs) so model-based optimisers can reason about metrics before
the solver runs. Registry with parameter schemas drives the UI. Algorithms:
evolutionary (μ+λ), surrogate-assisted evolutionary, member-surrogate
uncertainty-aware evolutionary, constrained Bayesian optimisation, NSGA-II,
simulated annealing, random search. The context also carries the compiled
problem so model-based optimisers can use its response model (never to
evaluate). Optimisers may expose `diagnostics()`, stored in the record.

### `src/engine/experiments`
`runExperiment(config)` is a synchronous generator yielding a `started` event
then one `generation` event per generation, returning the finished
`ExperimentRecord`. Cancellation is `generator.return()`. The record stores the
config (including resolved optimiser parameters and seed), the baseline design,
every generation's summary with a snapshot of the best design so far, totals,
and the engine version. Stores are async behind `ExperimentStore`.

### `src/engine/explain`
Finite-difference parameter sensitivity (normalised by variable range),
binding-constraint detection, and a structured diff between two designs. All
derived by calling the real evaluator; no text templates.

### `src/engine/ml`
`dataset.ts` (regenerate designs from a config, build and split datasets,
expand vector responses into columns), `metrics.ts` (MAE, RMSE, R²,
coverage), `reliability.ts` (feasibility confusion, calibration bins),
`models/` (`SurrogateModel` and `MultiOutputSurrogate` contracts; ridge,
Bayesian ridge, MLP, Gaussian process behind registries), `hybrid.ts` (learned
member forces + the domain's exact response model, nominal and conservative
derivations), `study.ts` (held-out evaluation of global models and of the
member-level pipeline on a real experiment). Consumed by the learning
optimisers and by the workspace's learning panels. See `docs/ML_PIPELINE.md`.

### Responses and the response model
Evaluations may carry vector `responses` (the truss attaches member axial
forces). A domain can publish a `ResponseModel` on the compiled problem:
which metrics it can derive exactly from responses (`derive`) and per-component
utilisations (`componentUtilizations`). This is the seam that lets a surrogate
learn a smooth physical quantity while feasibility is still computed by the
engineering equations, and it is domain-agnostic: a thermal domain could
expose per-fin temperatures the same way.

### `src/engine/autonomous`
`runLab` is a generator over the existing runner: analysis (baseline,
sensitivity, binding constraints), equal-budget pilots of every strategy on
one or more derived seeds ranked by median best objective, the winner run
until `detectPlateau` fires or the budget is spent, an NSGA-II trade-off
stage against a second metric the domain exposes, a robustness stage that
perturbs the discovered design through the solver, and a report whose every
number is reconciled from the stage records. `report.ts` renders that record
as a short lab report (question, method, results, uncertainty, limitations,
reproducibility, conclusion) and `experiments/labStore.ts` persists lab
records next to experiments. The lab introduces no physics and no randomness
beyond derived seeds.

### `src/engine/robustness` and `src/engine/uncertainty`
`robustnessStudy` perturbs a design's parameters within a relative tolerance
(uniform or gaussian, seeded, clamped to the design space) and re-runs the
real evaluator for every sample: feasible fraction, objective quantiles and
per-constraint violation probabilities. `toleranceSweep` and `robustMargin`
(bisection for the largest tolerance that keeps a target feasible fraction)
build on it. `robustify` wraps any compiled problem in robust mode: each evaluation also
runs `samples` perturbed copies (seeded from a hash of the parameter vector,
so neighbouring designs see different samples) and a synthetic
`robustness` constraint requires a target feasible fraction; the runner
applies it when an experiment config carries `robust`. `formulations.ts` holds the cheaper alternatives: `tightenConstraints`
(every limit scaled by a margin, per-constraint overrides, one solver call
per design) and `postHocRobustSelection` (a nominal run's best-so-far
trajectory walked back, linearly or by anchored bisection, to the lightest
design that passes an independent check). The study registry can budget
methods in solver calls rather than design evaluations, run a nominal phase
before a robust phase, and keeps every run's best design and its
per-constraint violation probabilities. `buildUncertaintyReport` classifies the sources of uncertainty
in a result (model form, parameter, numerical, manufacturing, surrogate,
statistical) and marks each quantified only when a measurement exists:
robustness for manufacturing, screening reliability for surrogates, the
seed-to-seed range of the pilots for statistical.

### `src/engine/interpret`
`ProblemInterpreter` contract. The rule-based implementation extracts span,
load (N, kN, kg→N), safety factor, material, deflection ratio and objective,
records confidence per value, declines briefs from unsupported domains by
keyword, and stamps its id into provenance.

### Execution
`src/workers/experiment.worker.ts` drives the generator and yields to the
event loop every ~30 ms so cancel messages get through.
`src/app/experimentClient.ts` wraps it and falls back to time-sliced
main-thread execution when Workers are unavailable.

### Architectural audit (v1.3)
Adding the spatial domain exposed what was and was not tied to the planar
truss. Generalised: the solver and the response model (now cores over the
spatial dimension), the utilisation helper (typed on members' areas rather
than the planar model). Unchanged and reused as is: optimisers, runner,
datasets and surrogates (the hybrid predictor keys on the response ids
`memberForces_N` / `nodeDisplacements_m`, which the spatial domain shares),
study registry, robustness, uncertainty taxonomy, autonomous lab,
Benchmarks page, lab and experiment stores. Domain-specific by nature:
template, design space, renderer (`pages/workspace/truss3d/`), specification
form branch, interpreter routing. Still accidental: the hybrid predictor's
displacement response id is a string literal rather than a response-model
field, and the learning panels keep per-domain label maps; both are listed
as follow-ups rather than refactored now.

### UI
`src/pages/workspace/` — `useWorkspace` (state), `SpecPanel`, `Viewport`
(with `TrussSvg`), `ExperimentPanel`, `EvidenceSection`. `TrussSvg` maps data
to visuals only: stroke width ∝ bar diameter, colour ∝ force or utilisation,
dashed overlay = scaled displacements. The home page and the projects page
reuse the same engine and renderer for their live demos.

## Determinism and reproducibility
- All randomness flows from `Rng(seed)`; design ids are counters.
- Timestamps are recorded but never influence the search.
- `ENGINE_VERSION` is stored in every record; bump it on any change that
  alters numerical results.
- Tests assert identical records for identical configs.

## Performance characteristics (current)
A 4-panel truss (9 nodes, 18 DOF, 15 members) evaluates in ≈20 µs, so a
12,000-evaluation run takes ≈1.3 s in a worker. The dense Cholesky solver is
O(n³) and fine up to a few hundred DOFs; a sparse or banded solver is the
first optimisation when larger domains arrive.

## Future execution model
```
React ──► API ──► job queue ──► simulation / ML workers ──► experiment store
```
The runner's generator + ask/tell design already separates proposing,
evaluating, and recording, so moving evaluation to a pool or a server is a
transport change, not an algorithm change.
