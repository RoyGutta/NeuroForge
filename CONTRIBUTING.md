# Contributing

NeuroForge is a computational engineering system first and a web application
second. Contributions are welcome in either area, with a few rules that keep
the project honest.

## Principles

- No fabricated results. Every number shown in the interface must come from
  the engine in `src/engine`. Features that are not implemented are labelled
  as roadmap items, never simulated.
- Test first for numerical code. Solver, optimiser, and runner changes need a
  failing test in `tests/` before the implementation. Physics changes need a
  closed-form or independently verifiable case.
- Determinism. All randomness flows through the seeded `Rng`. Bump
  `ENGINE_VERSION` in `src/engine/version.ts` whenever numerical output changes.
- Extend through the existing contracts: `EngineeringDomain`,
  `OptimizerDescriptor`, `ProblemInterpreter`, `ExperimentStore`, and (once
  landed) `SurrogateModel`. Register new implementations; do not special-case.
- SI units, with the unit in the field name (`span_m`, `area_m2`).
- Keep source files under roughly 500 lines.
- Plain technical writing. No emojis in code, documentation, or commits.

## Workflow

```bash
npm install
npm test            # vitest
npm run typecheck   # application and tests
npm run build
npm run reproduce   # canonical experiment; must print reproducible: true
```

Open a pull request with a short description of what changed, why, and how it
was verified. For engineering-model changes, cite the equations or reference
used and update `docs/ENGINEERING_MODELS.md` and `docs/LIMITATIONS.md`.

## Reporting issues

Use the issue templates for bugs, engineering-model concerns, and roadmap
proposals. For a suspected solver error, include the problem specification
(exported JSON) and the expected analytical result.
