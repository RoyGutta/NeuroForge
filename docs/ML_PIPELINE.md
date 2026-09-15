# Machine-learning pipeline

Where learning enters the system, and the rules it obeys.

## Data
Every experiment evaluates hundreds to tens of thousands of designs with the
finite-element solver. `collectDesigns(config)` regenerates all of them from
the configuration and seed (runs are deterministic), and `buildDataset`
turns them into rows of normalised design parameters (unit cube) with one
column per metric plus a feasibility flag. Designs whose analysis failed
(unstable or invalid geometry) are skipped and counted. `splitDataset`
produces a seeded, disjoint train/validation/test partition.

## Models (`src/engine/ml/models`)
All implement `SurrogateModel { fit, predict -> { mean, std? }, hyperparameters }`.

| id | Method | Uncertainty | Cost |
|---|---|---|---|
| `ridge` | Closed-form ridge regression on degree-1 or degree-2 polynomial features, standardised targets, Cholesky solve | none | O(n k²), k = 1 + d + d(d+1)/2 |
| `mlp` | Two hidden tanh layers, Adam, mini-batches, early stopping on a 10 % internal validation split, seeded initialisation | none | O(epochs · n · h²) |
| `gp` | Exact Gaussian-process regression, RBF kernel, zero mean on standardised targets, lengthscale and noise by log-marginal-likelihood grid search, optional stride subsampling | predictive std | O(n³) fit, O(n²) per prediction |

## Evaluation (`src/engine/ml/study.ts`)
`runSurrogateStudy(config, { models, targets })` trains each model on the
training split and reports, on the held-out test split: MAE, RMSE, R², and
for models with uncertainty the empirical coverage of the 95 % interval. It
also returns predicted-versus-actual pairs for plotting and the fit time.
Model quality is a measurement, never a claim; the workspace shows these
numbers next to the plot.

## Target transforms and what the first study showed
Strictly positive responses may be fitted directly or in log space. Which is
better is target-dependent, so the study fits both, picks the transform with
the higher R² on the validation split, reports the choice and the selection
score, and evaluates once on the test split. Log-space predictions are clamped
to the training range widened by e³ before exponentiation so a wild
extrapolation reports as a large finite error rather than Infinity.

Measured on the canonical 12,000-design evolutionary run (engine 0.2.0, split
seed 42, 8,400 / 1,800 / 1,800):

- Mass is learned almost perfectly by quadratic ridge (R² 0.999, raw fit).
  It is linear in member areas, so this is expected and is why the
  surrogate-assisted optimiser works well with a ridge screen.
- Peak stress, buckling utilisation and displacement are far harder for a
  global regressor: they are maxima over members of quantities like N/A and
  N/A², so they are non-smooth and vary over orders of magnitude across a
  search archive. Quadratic ridge fails on them; the MLP recovers some
  structure (displacement R² about 0.9, stress about 0.4); the Gaussian
  process on a 600-point subsample is weak on utilisations but its 95 %
  intervals are well calibrated (92 to 98 % coverage).
- Implication for search: pre-screening on predicted *feasibility* is much
  less reliable than pre-screening on predicted *mass*. The recorded online
  R² per target in surrogate-assisted runs makes this visible for every
  experiment, and it motivates the next steps below.

## Use in search
- Surrogate-assisted evolutionary search: ridge models pre-screen children;
  the solver evaluates the survivors and the online prediction accuracy is
  recorded. See `docs/OPTIMIZATION.md`.
- Bayesian optimisation: GPs drive constrained expected improvement.

## Rules
1. A surrogate never produces a recorded result; only the solver does.
2. Every model reports held-out metrics before it is shown or used.
3. Targets are modelled in log space when strictly positive (mass, stresses,
   utilisations), which stabilises the fit across orders of magnitude.
4. All training is seeded and reproducible.

## Not yet
Per-member surrogates (predict each member's force, then apply the exact
constraint formulas, which removes the non-smooth max from the learning
target), active-learning acquisition inside the evolutionary loop
(uncertainty-aware screening), neural surrogates with uncertainty
(ensembles), graph representations of structures, cross-problem transfer.
