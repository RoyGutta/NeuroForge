# Brief interpretation

How a natural-language brief becomes a validated `EngineeringProblem`, how a
language model takes part without ever producing an engineering result, and
how the interpreters are benchmarked against each other.

## Pipeline

```
brief ─► interpreter (rule | llm | hybrid) ─► CandidateSpec
                                                  │  values with provenance, missing fields,
                                                  │  ambiguities, unsupported elements, conflicts
                                                  ▼
                                   deterministic unit normalisation (units.ts)
                                                  ▼
                                   realizeSpec: domain template ─► EngineeringProblem
                                                  ▼
                                   checkSpec + domain validator (authoritative)
                                                  ▼
                                   compile ─► solver ─► optimisers
```

The model, when one is used, is a reader. It reports numbers as written,
with their units and a verbatim quote; it converts nothing, computes nothing
and fills in nothing. Every step after it is deterministic code shared with
the rule-based interpreter, so the only thing the benchmark compares is the
reading.

## Contract (`src/engine/interpret`)

- `ProblemInterpreter { id, label, kind: rule | llm | hybrid, interpret(brief) }`,
  synchronous for rules, asynchronous for models; callers await either.
- `CandidateSpec` (`spec.ts`): `domain` (or null with `detectedDomain` and a
  reason), ordered `fields`, `missing`, `ambiguities` (field, candidates,
  description), `unsupportedElements`, `conflicts`, `warnings`, `confidence`.
  Its field ids are exactly the inputs of the four domain templates; there
  is no second engineering schema. A field carries a `provenance`:
  - `explicit`: a number in the brief;
  - `inferred`: follows from wording without a number (objectives);
  - `assumed`: a default the engine recorded as an assumption;
  - `unknown`: needed, not stated, no default applied.
- `realizeSpec` (`realize.ts`) builds the problem through
  `createTrussBridgeProblem`, `createSpaceTrussProblem`,
  `createManipulatorProblem` or `createHeatSinkProblem`, adds an assumption
  for every missing required field (span 2 m and load 500 N for the bridge,
  3 m and 2 kN for the girder, 2 kg and 0.8 m for the arm, 40 W and 80 C for
  the heat sink), derives the stiffness mass budget from the baseline when
  the brief gives none, runs `checkSpec` (finite, positive, safety factor
  >= 1, limit above ambient) and the domain validator, and returns either a
  supported result or a typed failure.
- `InterpretResult` distinguishes four failure kinds, each with the stage
  that produced it in `diagnostics.stage`:
  - `unsupported-domain` (the brief is outside the four families);
  - `model-error` (transport, rate limit, timeout, refusal, truncation);
  - `schema-error` (the model's output is off contract);
  - `validation-failed` (`checkSpec` or the domain validator rejected it;
    the built problem is kept so it can be inspected and corrected).
  Model uncertainty, missing information and deterministic rejection are
  therefore never conflated: the first is a low `confidence` or an
  ambiguity, the second is a `missing` entry that became an assumption, the
  third is a failure of kind `validation-failed`.

## Unit normalisation (`units.ts`)

Length (m, cm, mm, km, in, ft), force (N, kN, MN, lbf, kgf, kip), mass (kg,
g, t, lb, oz), power (W, kW, mW), temperature (C, K, F, with offsets),
angle (deg, rad) and dimensionless. `toSI(value, unit, dimension)` returns
the SI value and the factor applied, or an error for an unknown unit or a
wrong dimension. `normalizeField(id, value, unit)` adds the two documented
cross-dimension conversions: a load written as a mass becomes a force with
g = 9.80665 m/s², a payload written as a force becomes a mass. A value whose
unit cannot be normalised is discarded and reported; it is never guessed.
Tested independently in `tests/engine/interpret/units.test.ts`.

## Interpreters

| id | What it does | Where it runs |
|---|---|---|
| `rule-based-v1` | Regex and keyword extraction, unchanged from v1.3 (fixture-verified bit for bit on 68 briefs). The offline reference. | browser, tests, scripts |
| `llm-v1` | Versioned prompt (`PROMPT_VERSION`), JSON-schema-constrained output (`LLM_SCHEMA_VERSION`) enforced by the provider's structured-output mode, hand-written schema validator, unit normalisation, `realizeSpec`. | browser through the server endpoint; scripts directly |
| `hybrid-v1` | `llm-v1`, then the rule extractor on the same brief; agreement confirms a value, a model-only or rule-only value is used with a note, a disagreement on explicit values keeps the rule-based value at low confidence and lists both readings as a `Conflict`. Domain: the rule-based keyword fallback to a bridge (the "no structural keywords" warning) yields to the model's reading; a keyword decline by the rules overrides the model. | as `llm-v1` |

The model output schema (`llm/schema.ts`) asks for: `domain` (one of the
four or `unsupported`), `domain_reasoning`, `unsupported_domain`, `fields`
(id, value as written, unit as written, provenance explicit or inferred,
evidence quote), `material` (known id or unspecified), `objective` (metric
or unspecified), `missing`, `ambiguities` (field, candidates with units,
description), `unsupported_elements`, `confidence`, `notes`. Fields of the
wrong family and duplicates are ignored with a warning.

## Provider and server

`LLMProvider { id, model, generateStructured(request) }` in
`llm/provider.ts` is the only thing the engine knows about a model. The
Anthropic adapter (`src/server/anthropicProvider.ts`) is server-side only:
it sends the system prompt, the brief, the JSON schema as
`output_config.format`, adaptive thinking and an effort level, and records
usage, stop reason, request id and latency. Cost is estimated from a public
list-price table and labelled as an estimate.

The endpoint (`src/server/interpretHandler.ts`, served by the Vercel
function `api/interpret.ts` in production and by a Vite middleware in
development) is not a proxy: a caller sends `{ brief }` and nothing else;
the prompt, schema and model are fixed on the server. GET reports whether a
provider is configured, which model, and the prompt and schema versions.
Briefs are limited to 4,000 characters, calls to 20 per minute per address
(best effort, in memory), bodies to 16 KB; nothing is logged. Without
`ANTHROPIC_API_KEY` in the server environment the endpoint returns 503
`not-configured` and the interface offers the rule-based interpreter only.

Configuration: `ANTHROPIC_API_KEY` (never in the repository or the browser),
`NEUROFORGE_LLM_MODEL` (default `claude-opus-5`), `NEUROFORGE_LLM_EFFORT`
(`low`, `medium` default, `high`).

## Security and privacy

- The browser never holds a provider credential; the key lives in the
  server environment. `vercel.json` excludes `/api/` from the SPA rewrite.
- The interface states, next to the model selector, that the brief is sent
  to the NeuroForge server and on to the model provider, that it is not
  stored, and that confidential information should not be entered.
- The server accepts only a brief; it cannot be used to run arbitrary
  prompts against the key.
- The benchmark dataset contains only public, invented briefs.
- Model output is data: it passes the schema validator, the normaliser and
  the domain validator before anything is built from it, and it never
  reaches the solver directly.

## Benchmark

Dataset `benchmarks/interpreter/briefs-1.0.0.json` (58 briefs, versioned,
validated on load by `benchmark/dataset.ts`):

| Category | Briefs | What it tests |
|---|---|---|
| basic | 12 | plain statements of every required value |
| units | 12 | mm, cm, ft, in, kN, kilonewtons, kg, g, lb, lbf, kW, K, F |
| linguistic | 9 | numbers in words, symbols (L = 3 m, P = 1 kN, SF = 2), reordered phrasing |
| missing | 7 | required values absent; the reading must assume, not invent |
| ambiguous | 7 | two candidate values for one field (alternatives, a drawing that disagrees) |
| unsupported | 7 | aerospace, fluids, electronics, prose, and supported briefs with unsupported elements |
| infeasible | 4 | valid specifications whose baseline the engine reports infeasible |

Each entry's reference holds the fields a careful engineer reads, in SI, the
material, the objective, the fields the brief does not state, the
ambiguities with their candidates, and whether elements outside the family
must be flagged. A test realises every reference into a valid problem and
confirms with the engine that the infeasible entries' baselines violate a
constraint while the sized baselines of the others are feasible.

Metrics (`benchmark/score.ts`, `benchmark/aggregate.ts`), each over the
entries where it applies, never collapsed into one number: schema validity,
domain classification, field extraction, unit normalisation, missing
information detected (an expected-missing field marked explicit or inferred
is an invented assumption), ambiguity flagged, unsupported domain declined,
unsupported element flagged, material, objective, deterministic validation
passed, semantic equivalence (the realised problem's geometry, loads,
material, safety factor, objectives and constraints equal the reference's),
latency, cost.

Failure taxonomy: `wrong-domain`, `false-decline`, `wrong-numeric-value`,
`wrong-unit-conversion` (the ratio to the reference is a unit factor or a
temperature offset), `wrong-material`, `wrong-objective`, `missing-value`,
`missing-constraint` (safety factor, deflection ratio, mass budget,
temperature limit), `invented-assumption`, `unsupported-domain-miss`,
`unsupported-element-miss`, `ambiguity-ignored`, `schema-error`,
`model-error`, `validation-error`.

Run: `npm run interpreter:study` (rule-based, offline) or
`npm run interpreter:study -- --interpreters rule,llm,hybrid --model claude-opus-5 --effort medium`
with a provider key in the environment. Records go to
`benchmarks/interpreter/results/<date>-<interpreter>[-<model>].json` and
contain the dataset version, prompt and schema versions, settings, every raw
model output, every normalised specification, per-entry scores and the
aggregate. The Benchmarks page renders every committed record side by side
with the reference reading per brief.

## Results

See `docs/BENCHMARKS.md` (interpreter section) for the tables and
`docs/RESEARCH.md` for the question and its status.

## Reproducibility

Reproducible exactly: the rule-based interpreter (deterministic), the
dataset, the scoring of any stored record, and the deterministic half of a
model-backed run from its stored raw output (schema check, normalisation,
realisation, validation). Not reproducible exactly: the model's raw output,
which depends on the provider's model version at the time of the call; the
record pins the model id, prompt version, schema version, effort, max
tokens and the thinking mode, and keeps the raw output and request id so a
run can be audited and re-scored but not replayed bit for bit.

## Limitations

- Four families; a brief outside them is declined, not solved.
- The rule-based reference reads only English SI and kg phrasing; its known
  gaps (words for numbers, imperial units, kelvin, "kilonewtons", every
  ambiguity, briefs without a family keyword) are measured in the benchmark
  and left as they are so the reference stays frozen.
- The hybrid's conflict policy prefers the deterministic reading; it does
  not try to adjudicate.
- A model-backed reading is only as good as the prompt and schema version
  recorded with it; there is no fine-tuning and no retrieval.
- Cost figures are list-price estimates from token counts.
