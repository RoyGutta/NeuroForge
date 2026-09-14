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
metrics, backendId }`. The registry maps domain id → module. Adding thermal or
robotics means implementing this interface; nothing above it changes.

The structural module compiles a `truss-bridge` geometry into a Warren
ground-structure space (`bridgeSpace.ts`), evaluates with the FEA solver
(`fea.ts`) and derives metrics (`evaluate.ts`, `metrics.ts`). The baseline is
a uniform-section truss at span/8 depth whose common area is found by
bisection to just satisfy the same constraints.

### `src/engine/optimization`
Ask/tell `Optimizer` interface. The optimiser never evaluates anything; the
runner does. This is what lets evaluation move to a surrogate or a remote
worker later. Registry with parameter schemas drives the UI. Algorithms:
evolutionary (μ+λ), simulated annealing, random search.

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
