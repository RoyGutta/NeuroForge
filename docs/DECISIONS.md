# Design decisions

Short records of choices that shape the system. Newest first.

## 2026-09-14 — Public release under the MIT license
**Decision.** Publish the repository publicly at v0.1.0 under MIT.
**Why.** The purpose of publication is inspection: the algorithms, solver,
tests and documentation are the substance, so they must be readable and
reusable without friction. All runtime dependencies are MIT or Apache-2.0;
the two typefaces are loaded at runtime under the SIL Open Font License and
are not redistributed, so nothing constrains a permissive license.
**Cost.** None technical. The release sets a public standard: every future
capability must be real and tested before it appears in the interface.

## 2026-09-13 — Truss bridge as the first vertical slice
**Decision.** Build the entire pipeline (spec → space → FEA → optimiser →
record → UI) for one problem family, the planar truss bridge, before adding
domains. **Why.** It matches the existing visual identity; it has closed-form
verification cases; it exercises geometry, forces, constraints, buckling and
mass in one model; a 4-panel truss evaluates in ~20 µs so real search runs
in the browser; and it produces a labelled dataset for the surrogate stage.
**Cost.** The other four legacy "projects" are now labelled roadmap rather than
pretending to run.

## 2026-09-13 — Rule-based interpreter before any LLM
**Decision.** Ship a deterministic regex/keyword interpreter behind the
`ProblemInterpreter` interface; no LLM in the product yet. **Why.** Offline,
testable, free, and it forces the assumption/confidence model to exist before
a model that can hallucinate is plugged in. It declines unsupported domains
explicitly. **Cost.** Limited phrasing coverage; the LLM interpreter is the
first "later" item.

## 2026-09-13 — Honest baseline sized by the same solver
**Decision.** The "human baseline" is a uniform-section Warren truss at span/8
whose area is bisected to just satisfy the same constraints. **Why.** Any
improvement claim is only meaningful against a competent conventional design
evaluated under identical assumptions; hardcoded numbers (the old 4.82 → 2.94 kg)
were removed.

## 2026-09-13 — Deb's feasibility rules instead of penalty functions
**Decision.** One comparator for all optimisers. **Why.** No penalty weights
to tune per problem; feasible designs are never traded for lighter infeasible
ones; the same ordering drives selection, acceptance and reporting.

## 2026-09-13 — Ask/tell optimisers and a generator-based runner
**Decision.** Optimisers propose, the runner evaluates and records, the worker
pumps the generator. **Why.** Evaluation can later be replaced by a surrogate,
a worker pool or a server without touching algorithms; tests drive the same
generator synchronously; cancellation is `return()`.

## 2026-09-13 — Solid round bars for buckling
**Decision.** I = A²/4π. **Why.** Simplest defensible section model; conservative.
Recorded as a medium-confidence assumption in every spec.

## 2026-09-13 — Byte-level legacy parity retired
**Decision.** The migration's parity requirement is superseded by real
functionality; the visual language is kept, the fake sequences are gone.
