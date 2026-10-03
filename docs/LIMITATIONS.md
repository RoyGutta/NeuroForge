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

## Robotics domain
- Planar two-link arm, static holding only: no dynamics, inertia, joint
  velocities or accelerations, so no motion-profile torque.
- Joints are ideal pins with no friction, backlash, compliance or limits;
  actuator, gearbox and wiring mass are not modelled.
- Links are uniform hollow tubes treated as Euler-Bernoulli cantilevers; tip
  deflection is a first-order superposition with rigid joints, and torsion,
  out-of-plane loads and link buckling are not checked.
- The task set is a fixed grid of static hold points; obstacle avoidance,
  orientation of the end effector and path continuity are outside the model.

## Robustness and uncertainty
- The robustness study perturbs design parameters only (geometry and
  sections); material scatter, load variability and model-form error are
  documented in the taxonomy but not sampled.
- Perturbations are independent per variable with a stated relative
  tolerance; correlated manufacturing errors and systematic bias are not
  modelled. Results are Monte Carlo estimates from a finite, seeded sample.
- "Quantified" in the uncertainty taxonomy means a measurement from this
  engine exists; it is not a validated uncertainty budget.
- Robust mode estimates the feasible fraction from a small in-loop sample
  (12 copies by default), so its constraint is noisy; the independent check
  with a fresh seed and a larger sample is the number to report. Robust mode
  multiplies solver cost by 1 + samples.

## Optimisation
- Topology is fixed to the Warren ground structure; members can shrink but the
  connectivity does not change.
- Single objective per run today; the stiffness objective needs a mass budget.
- No guarantee of global optimality; results are the best found within the budget and seed.

## Learning and uncertainty
- Surrogate uncertainty (Bayesian ridge predictive variance, GP variance) is
  a statistical statement about the surrogate's error on data like its
  training set. It is not a structural safety margin and must not be read as one.
- With the `forces` representation deflection is regressed; the default
  `both` representation derives it from a learned displacement field, whose
  derived-deflection accuracy (R² about 0.84 on 12,000 designs) is lower
  than the force model's.
- Statistical claims rest on 5–10 seeds per method and one problem family.
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
