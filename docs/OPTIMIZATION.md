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

## Surrogate-assisted evolutionary
The evolutionary algorithm above with a pre-screening step. Each generation
the inner optimiser proposes k x lambda children (k = `screeningFactor`,
default 4). Degree-2 polynomial ridge models of log(objective) and log(each
constraint metric) are refitted on the evaluated archive using incrementally
maintained normal equations (one shared Gram matrix, one right-hand side per
target, rank-1 updates as designs enter and leave the archive). Children are
ranked under Deb's rules with *predicted* metrics and only the top lambda are
evaluated by the solver. Because predictions precede evaluation, each
generation produces an honest online accuracy measurement; the record stores
the online R² per target, the number of predicted/actual pairs, and fit time.
Screening starts after `warmupEvaluations` solver calls.

## Member-surrogate evolutionary (uncertainty-aware)
The same inner (mu + lambda) algorithm, but screening uses the hybrid
predictor in `src/engine/ml/hybrid.ts`: a multi-output Bayesian ridge maps
the design vector to every member's axial force with a predictive standard
deviation; the domain's response model then applies the exact stress and
Euler equations to obtain utilisations, so only the forces are learned.
Deflection, which cannot be derived from forces, keeps a single-output
surrogate. Two derivations are made per candidate: nominal (mean forces) and
conservative (|force| + k·σ for stress, force − k·σ for buckling, deflection
× e^{kσ}). Ranking uses Deb's rules on the conservative metrics; a fraction
of each batch is instead given to the most uncertain nominally-feasible
candidates. Every gated design is solved, and its prediction is kept, so the
record contains: the screening funnel, feasibility confusion (nominal and
conservative), per-member force error, interval coverage, error–uncertainty
correlation and calibration bins. Parameters `riskK` and `exploreFraction`
control the policy; the ablation in `docs/BENCHMARKS.md` shows what each
buys on the canonical problem.

## Bayesian optimisation (constrained)
Gaussian processes (RBF kernel, marginal-likelihood hyperparameters) model
log(objective) and log(each constraint metric) in normalised design space.
Each generation a batch of q candidates maximises constrained expected
improvement, EI(x) times the product over constraints of P(g_c(x) satisfied),
over a pool of uniform samples and Gaussian perturbations of the best designs,
with a minimum-distance rule for batch diversity. The initial design is a
seeded Latin hypercube. Hyperparameters are re-selected every
`hyperparameterInterval` generations and the training set is capped at
`maxPoints` (best half plus most recent half) to bound the O(n³) cost.
Suited to small budgets (hundreds of evaluations); the evolutionary methods
are preferable when solver calls are cheap.

## Verification of the learning optimisers
Both run to completion with feasible results on the truss problem, are
deterministic per seed, and record diagnostics. Bayesian optimisation beats
random search at an equal 240-evaluation budget in the test; the surrogate
optimiser's online R² for mass exceeds 0.5 after warm-up. Whether either
beats the plain evolutionary algorithm at equal budget is a benchmark
question, answered in `docs/BENCHMARKS.md` when measured, not asserted here.

## NSGA-II (multi-objective)
Non-dominated sorting genetic algorithm II (Deb, Pratap, Agarwal & Meyarivan,
2002) with constrained domination (feasible beats infeasible, then lower
violation, then Pareto dominance). Binary tournament on (front rank, crowding
distance); the same BLX-alpha crossover and Gaussian mutation as the
single-objective optimiser; elitist survival over parents plus offspring,
filling fronts in order and truncating the last by crowding distance. Used
when a problem declares two objectives (currently mass and compliance).

The experiment runner keeps an **external archive** of every feasible
non-dominated design evaluated during the run and reports that as the Pareto
front, together with the 2-D hypervolume of the archive relative to the
baseline's objective values (normalised to the fraction of the baseline box
dominated). The archive's hypervolume is monotone by construction; the
optimiser's own population is not, because crowding truncation can discard
front points.

Verification: exact fronts and crowding values on hand-built sets; on the
ZDT1 test problem the front's mean distance to the analytical front
f2 = 1 - sqrt(f1) is below 0.05 after 9,000 evaluations with a spread above
0.6 in f1; on the truss problem the front is feasible, mutually
non-dominated, spans more than 30 % in both objectives, and the hypervolume
history never decreases.

## Planned
CMA-ES. Each will be a new `OptimizerDescriptor`
in the registry and benchmarked against random search before it is offered
in the UI.
