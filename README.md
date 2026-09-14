# NeuroForge

**AI-powered computational engineering and design discovery.**

NeuroForge turns a plain-language structural brief into an explicit engineering
specification, sizes a conventional baseline design, and then searches thousands
of finite-element-analysed candidates for a design that is lighter or stiffer
while satisfying every stated constraint. The engine is deterministic, runs
off the main thread in the browser, and records every experiment with the seed
and settings needed to reproduce it.

It is a real computational system with a polished interface on top, not an
interface that claims to use AI. There is no scripted animation, no hardcoded
result, and no language model in the loop today.

- **Live demo (local):** `npm install && npm run dev`
- **Reproduce the canonical experiment:** `npm run reproduce`
- **Documentation:** [Architecture](docs/ARCHITECTURE.md) · [Engineering models](docs/ENGINEERING_MODELS.md) · [Optimisation](docs/OPTIMIZATION.md) · [Experiments and reproducibility](docs/EXPERIMENTS.md) · [Roadmap](docs/ROADMAP.md) · [Decisions](docs/DECISIONS.md) · [Limitations](docs/LIMITATIONS.md)

## Contents

- [Overview](#overview)
- [Why NeuroForge exists](#why-neuroforge-exists)
- [How it works](#how-it-works)
- [Current capabilities](#current-capabilities)
- [Engineering engine](#engineering-engine)
- [Optimisation](#optimisation)
- [Machine learning roadmap](#machine-learning-roadmap)
- [Architecture](#architecture)
- [Example experiment](#example-experiment)
- [Reproducibility](#reproducibility)
- [Validation and limitations](#validation-and-limitations)
- [Development](#development)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Research direction](#research-direction)
- [License](#license)

## Overview

Most "AI for engineering" demonstrations put a language model in front of a
CAD tool. NeuroForge takes the opposite position: the intelligence belongs in
the engineering and optimisation system, and a language model, when one is
added, is one interchangeable interpreter behind an interface.

The current release (v0.1.0) implements one problem family end to end, the
planar truss bridge, deeply enough that every stage of the pipeline is real,
tested, and inspectable. The domain, optimiser, interpreter, and storage layers
are contracts, so further physics domains, search algorithms, and learning
components extend the platform without changing what already works.

## Why NeuroForge exists

Design optimisation research usually lives in scripts and papers. Engineering
software usually hides its assumptions. NeuroForge is an attempt to build a
system where:

- the specification the machine solves is the specification the user can read
  and edit, including every assumption it had to make and how confident it is;
- every result is produced by a deterministic solver whose assumptions and
  verification are documented;
- the search is a real algorithm with a seed, a budget, and a recorded history,
  so an improvement claim can be reproduced and interrogated;
- the platform is structured so that surrogate models, Bayesian search,
  multi-objective trade-offs, and additional physics can be added as
  first-class components rather than special cases.

## How it works

```
Natural-language brief
        |
        v
Engineering specification        typed problem: geometry, material, loads, supports,
(explicit assumptions)           safety factor, objectives, constraints, confidence
        |
        v
Parameterised truss design       Warren ground structure: top-chord node heights
(bounded design space)           plus every member cross-section area (5n - 1 variables)
        |
        v
Finite-element analysis          direct stiffness method, Cholesky solve,
                                 member forces, reactions, displacements, compliance
        |
        v
Constraint evaluation            yield stress, Euler buckling, deflection limit,
                                 self-weight included; normalised violations
        |
        v
Optimisation                     seeded evolutionary search under Deb's feasibility
                                 rules (also simulated annealing, random search)
        |
        v
Experiment record                config, seed, baseline, every generation's best
                                 design, totals, engine version
        |
        v
Evidence                         viewport, history scrubbing, sensitivity,
                                 binding constraints, baseline comparison
```

Why this is technically meaningful: each arrow is a real transformation with a
tested implementation. The specification is data, not prose. The design space
is a classical topology-optimisation formulation. The solver is a textbook
method with textbook verification. The optimiser is a standard constrained
evolutionary algorithm. The record is sufficient to rerun the search exactly.

## Current capabilities

### Implemented now

| Area | What exists |
|---|---|
| Problem specification | `EngineeringProblem` schema with objectives, constraints (metric, operator, limit, source), assumptions (field, value, reason, confidence), provenance, versioning; per-domain validation |
| Interpretation | Rule-based natural-language interpreter for span, load (N, kN, kg), safety factor, material, deflection ratio, and objective; declines non-structural briefs explicitly |
| Structural analysis | 2D pin-jointed truss finite-element solver: stiffness assembly, boundary conditions, Cholesky factorisation, member forces and stresses, reactions, compliance, mechanism detection |
| Design checks | Yield stress with safety factor, Euler buckling of compression members (solid round section), serviceability deflection, self-weight as lumped nodal loads |
| Baseline | Conventional uniform-section Warren truss at span/8 depth, sized by bisection to just satisfy the same constraints |
| Optimisation | Elitist (mu + lambda) evolutionary algorithm, simulated annealing, random search; Deb's feasibility rules; optional warm start from the baseline |
| Experiments | Generator-based runner, reproducible records, per-generation snapshots, browser-local experiment library, JSON export, command-line reproduction |
| Explainability | Finite-difference parameter sensitivity, binding-constraint detection, structured baseline-to-result diff, all computed from the evaluator |
| Execution | Web Worker execution with cancellation; main-thread fallback |
| Interface | Editable specification with assumption badges; viewport with structure, axial-force, utilisation, and deformed-shape modes; generation scrubber; experiment panel; evidence tables |
| Testing | 80 vitest tests including closed-form solver cases, a known-optimum constrained optimisation problem, determinism, and UI state mapping |

### Planned / research direction

Surrogate models trained from simulation data, surrogate-assisted search,
Bayesian optimisation, multi-objective optimisation with Pareto fronts, a
benchmark suite, additional engineering domains, 3D visualisation, and an
autonomous engineering loop. None of these are implemented yet; the interface
labels them as roadmap wherever they are mentioned. See [Roadmap](#roadmap).

## Engineering engine

The structural domain models a planar, pin-jointed truss with straight
prismatic members carrying axial force only, homogeneous linear-elastic
material, and small displacements.

- **Assembly.** For each member with length L, area A, modulus E, and direction
  cosines (c, s), the 4x4 element stiffness (EA/L)[c², cs, ...] is assembled into
  the global matrix with two degrees of freedom per node.
- **Boundary conditions.** Constrained degrees of freedom are removed; the
  reduced system K_ff u_f = F_f is solved by Cholesky factorisation.
- **Recovery.** Member force N = (EA/L)[-c -s c s]·u_e (tension positive),
  stress N/A, reactions K u - F at fixed degrees of freedom, compliance 1/2 Fᵀu.
- **Mechanisms.** A non-positive pivot during factorisation means the structure
  has a free mode. It is reported as `unstable` and treated as infeasible,
  never regularised away.
- **Buckling.** Euler critical load P_cr = pi² E I / L² with a pinned-pinned
  effective length and a solid round section, I = A²/(4 pi).
- **Loads.** One vertical midspan point load plus self-weight (rho A L g lumped
  half to each end node).
- **Design space.** For n panels: n+1 bottom nodes, n top nodes, 4n-1 members;
  variables are the n top-node heights and the 4n-1 member areas. Members
  driven to the minimum area are effectively removed (the ground-structure
  method, Dorn, Gomory and Greenberg, 1964).

Full equations, assumptions, and the verification cases are in
[docs/ENGINEERING_MODELS.md](docs/ENGINEERING_MODELS.md).

## Optimisation

All optimisers implement one ask/tell contract: they propose designs, the
experiment runner evaluates them, and the evaluated designs are handed back.
Evaluation is therefore replaceable by a surrogate model or a remote worker
without changing an algorithm.

Constraints are handled with Deb's feasibility rules: a feasible design beats
an infeasible one; among infeasible designs the smaller total normalised
violation wins; among feasible designs the better objective wins. The same
comparator drives selection, annealing acceptance, and reporting.

- **Evolutionary (mu + lambda), default.** Binary tournament selection, BLX-alpha
  blend crossover in normalised space, per-gene Gaussian mutation with
  reflection at bounds, strict elitism over the parent-plus-offspring pool.
- **Simulated annealing.** Several independent chains, Gaussian steps with
  geometric decay, Metropolis acceptance on relative objective change or
  violation change; feasibility is never abandoned for infeasibility.
- **Random search.** Uniform sampling; the baseline every other method is
  measured against.

Details and test criteria: [docs/OPTIMIZATION.md](docs/OPTIMIZATION.md).

## Machine learning roadmap

Every experiment already produces a labelled dataset of (design parameters,
simulated metrics). The next development stage builds on it:

1. Dataset construction from experiment records, with seeded train/validation/
   test splits.
2. A `SurrogateModel` contract with a linear/polynomial ridge baseline, a
   multilayer perceptron, and a Gaussian process.
3. Honest evaluation on held-out solver results: MAE, RMSE, R², and interval
   calibration where the model provides uncertainty.
4. Surrogate-assisted pre-screening inside the evolutionary optimiser.
5. Bayesian optimisation with a Gaussian-process surrogate and expected
   improvement, respecting constraints.

The solver remains the only authority on feasibility and recorded results.
These components are not yet implemented.

## Architecture

```
src/engine/            framework-free TypeScript; no React imports
  core/                problem schema, design and evaluation records, design space, seeded RNG
  linalg/              dense Cholesky solver
  domains/             EngineeringDomain contract and registry; structural truss module
  optimization/        Optimizer ask/tell contract and algorithms
  experiments/         experiment config, generator-based runner, records, stores
  explain/             sensitivity, binding constraints, design diff
  interpret/           ProblemInterpreter contract and rule-based implementation
src/workers/           Web Worker that drives the runner
src/app/               worker client and shared store
src/pages/             React pages; workspace/, home/, projects/, technology/
tests/                 vitest suites mirroring src/
scripts/               reproduce.ts, command-line reproduction
docs/                  technical documentation
legacy-html/           the static pages the interface was originally ported from
```

The engine is framework-independent so the same code runs in tests, in a Web
Worker, and later in a server or GPU-backed job runner. React renders records
the engine produced; it never computes physics. Interfaces and data flow are
described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Example experiment

An example computational experiment, measured with the current engine
(v0.1.0). It is one problem instance, not a general engineering claim.

Problem: 2 m span, 500 N midspan load, Aluminium 6061-T6, safety factor 2,
deflection limit span/250, 4 panels (19 design variables). Optimiser:
evolutionary (mu + lambda), population 60, seed 42, 12,000 FEA evaluations.

| Metric | Conventional baseline | Best design found |
|---|---|---|
| Mass | 1.656 kg | 0.510 kg (-69.2 %) |
| Peak axial stress | 10.5 MPa | 131.4 MPa |
| Stress utilisation | 8 % | 95 % |
| Buckling utilisation | 100 % | 100 % |
| Maximum deflection | 0.53 mm | 6.31 mm (limit 8.0 mm) |
| Wall time (Web Worker) | | 1.3 s |

The baseline is buckling-governed, as expected for slender aluminium bars under
a light load; its stress utilisation is only 8 %. The optimiser moved material
into an arched compression chord and thinned the tension diagonals, producing
a design in which both the stress and buckling constraints are active. The
sensitivity analysis attributes 98 % of the mass influence to member areas and
2 % to node heights at the optimum.

Run `npm run reproduce` to regenerate this experiment and confirm that a second
run with the same seed yields an identical best design.

## Reproducibility

- All randomness flows through a seeded generator; design ids are counters.
- An experiment record stores the full problem specification (including
  assumptions), the seed, the optimiser id and resolved parameters, the budget,
  the baseline design, every generation's best design, totals, and the engine
  version. Timestamps are recorded but never influence the search.
- `ENGINE_VERSION` is bumped on any change that alters numerical output.
- `tests/engine/experiments/runner.test.ts` asserts that identical configurations
  produce identical generation histories and best designs.
- `npm run reproduce [seed] [evaluations]` runs the canonical experiment twice
  and exits non-zero if the results differ.

Details: [docs/EXPERIMENTS.md](docs/EXPERIMENTS.md).

## Validation and limitations

NeuroForge distinguishes three things and asks users to do the same:

1. **Analytical model.** The truss idealisation and its equations, which are
   exact for their assumptions.
2. **Simplified computational model.** The current solver: linear-elastic,
   small-displacement, planar, axial-only members, member-level Euler buckling
   with a solid round section, one static load case, handbook material values.
3. **Real-world engineering validation.** Joints, fatigue, dynamics, global
   buckling, fabrication tolerances, load combinations, and code compliance,
   none of which are modelled.

Results are a preliminary computational study. They are not a validated
engineering analysis and not a fabrication-ready design; the interface states
this on every page. The full list is in [docs/LIMITATIONS.md](docs/LIMITATIONS.md).

Verification that does exist: the solver is tested against closed-form cases
(single bar extension, symmetric two-bar truss forces and deflection,
equilibrium of a statically indeterminate frame, mechanism detection), and the
optimisers are tested on a constrained problem with a known optimum.

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev          # Vite development server
npm run build        # type-check and production build
npm run typecheck    # application and test sources
npm run reproduce    # canonical experiment from the command line
```

The project has no backend. Experiments persist in the browser's local storage.

## Testing

```bash
npm test             # run all suites once
npm run test:watch   # watch mode
```

The suites cover: the seeded random generator, the Cholesky solver, the truss
solver against analytical cases, mass and buckling metrics, the problem schema
and validation, the design space and baseline sizing, the evaluator, all three
optimisers (convergence, determinism, lineage, bounds), the experiment runner
(reproducibility, cancellation, baseline improvement), the stores, the
sensitivity module, the interpreter, and the workspace form mapping.

Continuous integration runs type-checking, tests, the production build, and
the reproduction script on every push.

## Roadmap

Development directions, in approximate order. These are intentions, not
commitments.

1. **Current:** real finite-element analysis, optimisation, and reproducible
   experiments for the planar truss bridge.
2. **Next:** surrogate models trained from simulation data, with held-out
   evaluation.
3. Surrogate-assisted search.
4. Bayesian optimisation.
5. Multi-objective optimisation and Pareto-front visualisation.
6. Benchmark suite comparing optimisers at equal evaluation budget across seeds.
7. Autonomous engineering loop: staged strategy comparison, convergence
   detection, and a discovery report generated from measured data.
8. Additional engineering domains behind the `EngineeringDomain` contract
   (thermal, robotics, aerospace), tubular sections, 3D trusses.
9. Advanced learning components where they earn their place: neural
   surrogates, graph representations of structures, sketch-to-geometry.

The detailed list is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Research direction

The platform is being built so that claims can be tested rather than
demonstrated: fixed benchmark problems, multiple seeds, equal evaluation
budgets, objective-versus-evaluations curves with confidence bands, and
surrogate accuracy reported against held-out solver results. Candidate
questions include how much a surrogate reduces the solver budget needed to
reach a target mass on truss ground structures, how the optimisers compare at
equal budget, and how sensitive optimised designs are to manufacturing
tolerances. Nothing in this section has been measured yet.

## License

MIT. See [LICENSE](LICENSE).

Third-party components: React, React DOM, React Router, Vite, Vitest, and the
Vite React plugin are MIT-licensed; TypeScript is Apache-2.0. The interface
loads the IBM Plex Sans and Space Grotesk typefaces from Google Fonts at
runtime; both are published under the SIL Open Font License and are not
redistributed in this repository.
