# Experiments and reproducibility

## Record
`ExperimentRecord` (`experiments/experiment.ts`) contains:

- `config`: problem (full specification incl. assumptions), seed, optimiser id
  and **resolved** parameters, budget, `seedBaseline`, label.
- `baseline`: the domain baseline design with its evaluation.
- `generations[]`: per generation — evaluations, cumulative evaluations,
  feasible count, best objective this generation, mean feasible objective,
  **snapshot of the best design so far** (this is what powers history
  scrubbing), elapsed ms.
- `best`, `totalEvaluations`, `wallTimeMs`, `status`, `backendId`,
  `engineVersion`, timestamps.

## Reproducing a run
From the command line:

```bash
npm run reproduce              # seed 42, 12,000 evaluations
npm run reproduce -- 7 6000    # custom seed and budget
```

`scripts/reproduce.ts` builds the canonical problem, runs the evolutionary
optimiser twice with the same seed, prints baseline and best metrics, binding
constraints and sensitivity, and exits non-zero if the two runs differ.

In the interface, load a record from the experiment library (or import an
exported JSON) and run again with the same settings. `tests/engine/experiments/runner.test.ts` asserts that identical
configs produce identical generation histories and best designs. Anything that
changes numerical output must bump `ENGINE_VERSION`.

## Storage
`ExperimentStore` is async. `LocalStorageExperimentStore` keeps an index of
summaries plus one entry per record. `MemoryExperimentStore` is used in tests
and as a fallback. IndexedDB or a server store slots in behind the interface.

## Execution
`runExperiment` is a generator; the Web Worker pumps it and yields to the event
loop every ~30 ms so cancellation is responsive. The main-thread fallback
time-slices in 16 ms chunks.
