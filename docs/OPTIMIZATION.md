# Optimisation methods

All optimisers implement one ask/tell contract (`optimization/types.ts`):

```ts
ask(generation): Design[]      // propose designs; the runner evaluates them
tell(evaluated: Design[]): void
best(): Design | undefined
```

They operate in the normalised unit cube (`DesignSpace.normalize`) so
variables measured in metres and square metres are treated on equal footing.
Every optimiser draws from the experiment's seeded `Rng`; identical seeds give
identical runs.

## Constraint handling: Deb's feasibility rules
`compareDesigns(a, b)` (Deb, 2000):
1. a feasible design beats an infeasible one;
2. between infeasible designs, the smaller total normalised violation wins;
3. between feasible designs, the better objective wins.

No penalty weights to tune; the same ordering is used by tournament selection,
survivor selection, annealing acceptance and the runner's best-so-far tracking.

## Evolutionary (μ + λ) — default
- Population μ (default 60), offspring λ (default μ).
- Binary tournament selection under Deb's rules.
- BLX-α blend crossover (α = 0.3) with probability 0.9; otherwise copy a parent.
- Gaussian mutation per gene with probability 1/d, σ = 0.08 of the range;
  coordinates are reflected back into [0, 1].
- Survivor selection: parents ∪ offspring sorted, best μ kept (strict elitism).
- Optional warm start with the domain baseline (`seedBaseline`, default on),
  so a run can never end worse than the conventional design.

## Simulated annealing
Several independent chains (default 8). Gaussian step (0.15 of range, decaying
×0.985 per generation). Better under Deb's rules → accept; both feasible and
worse → accept with exp(−Δrel / T); both infeasible → exp(−Δviolation / T);
never leave feasibility for infeasibility. T₀ = 0.2, cooling ×0.97.

## Random search
Uniform sampling, keep the best. The baseline every other method must beat at
equal budget; used in tests and intended for the benchmark suite.

## Verification (tests/engine/optimization)
Synthetic problem: minimise Σ(xᵢ−0.3)² on [0,1]⁵ subject to x₀+x₁ ≥ 0.9
(optimum on the constraint boundary, f* = 0.045). The evolutionary optimiser
reaches within 15 % of f* in 6,000 evaluations and beats random search at equal
budget; annealing reaches within 50 %; all are deterministic per seed and keep
children within bounds with recorded parent ids. On the truss problem the
runner test requires ≥ 10 % mass reduction over the baseline in 4,000
evaluations (observed ≈ 60–70 %).

## Planned
CMA-ES; Bayesian optimisation with a Gaussian-process surrogate and expected
improvement; NSGA-II for Pareto fronts; surrogate-assisted pre-screening. Each
will be a new `OptimizerDescriptor` in the registry and will be benchmarked
against random search before it is offered in the UI.
