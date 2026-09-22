# Known limitations

Be explicit about these when presenting results.

## Physics
- Linear-elastic, small-displacement, pin-jointed truss. No bending, no joint
  stiffness, no geometric nonlinearity, no dynamics, no fatigue.
- Buckling is member-level Euler with K = 1 and a solid round section. Global
  (system) buckling, local buckling, imperfections and residual stresses are
  not modelled.
- One static midspan point load. No load combinations, moving loads, or lateral loads.
- Deflection limit L/250 is a generic serviceability assumption, not a code value.
- Material properties are handbook values.
- Planar (2D) only.

## Optimisation
- Topology is fixed to the Warren ground structure; members can shrink but the
  connectivity does not change.
- Single objective per run today; the stiffness objective needs a mass budget.
- No guarantee of global optimality; results are the best found within the budget and seed.

## Learning and uncertainty
- Surrogate uncertainty (Bayesian ridge predictive variance, GP variance) is
  a statistical statement about the surrogate's error on data like its
  training set. It is not a structural safety margin and must not be read as one.
- Deflection is still predicted by a global surrogate; only stress and
  buckling are derived from predicted forces.
- Benchmark conclusions hold for the canonical truss family and the budgets
  tested; they are not general claims about surrogate-assisted optimisation.

## Interpretation
- The rule-based interpreter handles span/load/safety-factor/material/deflection
  phrasing in English with SI or kg units. Anything else becomes an assumption.
- Non-structural briefs are declined, not solved.

## Software
- Experiments persist in the browser's localStorage only.
- Dense O(n³) solver; fine for hundreds of DOFs, not thousands.
- No server, no authentication, no multi-user sharing.

## What a result is
A **preliminary computational study**. Not a validated engineering analysis and
not a fabrication-ready design. Safety-critical use requires qualified review
and physical testing.
