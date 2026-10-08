# Engineering models

Everything the solver assumes, why, and how it is tested. Units are SI; every
field name carries its unit suffix (`span_m`, `area_m2`, `yieldStrength_Pa`).

## Planar pin-jointed truss (structural domain)

### Kinematics and material
- Members are straight, prismatic, pin-jointed, and carry axial force only.
- Material is homogeneous, isotropic and linear-elastic (E, ρ, σ_y).
- Small displacements: equilibrium is written on the undeformed geometry.

### Direct stiffness method (`fea.ts`)
For a member of length L, area A, direction cosines (c, s):

```
k_e = (E A / L) · [ c²  cs  -c² -cs ;  cs  s²  -cs -s² ;  -c² -cs  c²  cs ;  -cs -s²  cs  s² ]
```

Assembled into K (2 DOF per node). Constrained DOFs are removed; the reduced
system K_ff u_f = F_f is solved by **Cholesky factorisation** (`linalg/dense.ts`).
Member force N = (E A / L)[-c -s c s]·u_e (tension positive), stress σ = N / A,
reactions R = K u − F at fixed DOFs, compliance = ½ Fᵀu.

A failed factorisation (non-positive pivot relative to the matrix scale) means
K_ff is singular: the structure is a mechanism or has a free rigid-body mode.
This is returned as `{ status: "unstable" }` and treated as an infeasible design,
never patched with regularisation.

### Loads
One vertical point load at the midspan bottom node. Self-weight is included by
default: each member's weight ρ A L g (g = 9.80665 m/s²) is lumped half to each
end node. For the canonical 2 m / 500 N case self-weight is about 3 % of the
applied load for the baseline and matters for honest mass accounting.

### Constraints
| id | metric | check |
|---|---|---|
| `stress` | `stressUtilization` = max\|σ\|·SF / σ_y | ≤ 1 |
| `buckling` | `bucklingUtilization` = max over compression members of (\|N\|·SF / P_cr) | ≤ 1 |
| `deflection` | `maxDisplacement_m` | ≤ span / 250 (default, editable) |

Euler critical load for a pinned-pinned member: P_cr = π² E I / L².
Section is a **solid round bar**, so I = A² / (4π). This is conservative for a
given area; tubes or I-sections would raise P_cr substantially and are a
natural extension of the section model.

Violation is normalised: (value − limit) / |limit| for "≤", clipped at 0.
`totalViolation` is the sum; a design is feasible iff it is 0.

### Metrics
`mass_kg`, `maxStress_Pa`, `stressUtilization`, `bucklingUtilization`,
`maxDisplacement_m`, `compliance_J`.

### Ground-structure design space (`bridgeSpace.ts`)
For n panels (n even so a midspan node exists): n+1 bottom nodes on y = 0,
n top nodes at x = (k+½)·span/n. Members: n bottom chord, n−1 top chord, 2n
diagonals → 4n−1 members. Variables: n top-node heights ∈ [depthMin, depthMax]
and 4n−1 member areas ∈ [1e-6, 5e-4] m² → 5n−1 variables (19 for n = 4).
Members driven to the minimum area are effectively removed (Dorn, Gomory &
Greenberg, 1964).

### Baseline
A uniform-section truss at depth span/8 whose common area is the smallest that
satisfies all constraints, found by bisection (utilisations are monotone in a
uniform area). For the canonical case: A ≈ 9.7e-5 m² (r ≈ 5.6 mm), mass ≈ 1.66 kg,
buckling utilisation 1.00, stress utilisation 0.08. Buckling governs, which is
what one expects for slender aluminium bars under a light load.

### Verification (tests/engine/domains/truss)
- Single bar: u = FL/(EA), σ = F/A, reaction = −F, length.
- Symmetric two-bar truss at 45°: N = −P/(2 sin θ), δ = PL/(2EA sin²θ),
  zero horizontal apex displacement, compliance = ½Pδ.
- Statically indeterminate braced frame: reactions balance applied loads to
  1e-6 N; roller carries no horizontal reaction.
- Unbraced square: reported unstable. Zero-length member: reported invalid.
- Mass = Σ ρ A L; I = A²/4π; P_cr formula.
- Baseline feasibility and near-critical utilisation; all-minimum-area design
  infeasible; evaluation determinism.

## Planar two-link manipulator (robotics domain)

`src/engine/domains/robotics/manipulator/`. A serial RR arm in a vertical
plane, base at the origin, gravity acting in-plane. Different mathematics from
the truss behind the same `EngineeringDomain` contract: closed-form
kinematics, rigid-body statics and Euler-Bernoulli beam bending, no linear
system to solve.

### Kinematics (`kinematics.ts`)
Forward: `x = L1 cos θ1 + L2 cos(θ1 + θ2)`, `y = L1 sin θ1 + L2 sin(θ1 + θ2)`.
Inverse: a point at distance `d` is reachable when `|L1 − L2| ≤ d ≤ L1 + L2`;
`cos θ2 = (d² − L1² − L2²) / (2 L1 L2)` gives the elbow-up and elbow-down
solutions, one solution on the workspace boundary, none outside. Unreachable
task points count towards `unreachableFraction`, which must be zero.

### Static joint torques (`statics.ts`)
Gravity only, holding still. With link masses `m1`, `m2` at mid-length and the
payload `mp` at the tip (`g = 9.80665 m/s²`):
`τ2 = g (m2 L2 / 2 + mp L2) cos(θ1 + θ2)`,
`τ1 = g (m1 L1 / 2 + (m2 + mp) L1) cos θ1 + τ2`.
Of the two inverse-kinematic solutions at each task point the one with the
lower peak |τ| is used; the elbow configuration is an operational freedom, not
a design variable. `peakTorque_Nm` is the largest |τ| over both joints and all
task points.

### Links as tubular cantilevers (`beam.ts`)
Each link is a hollow circular tube with inner radius 0.8 × outer radius:
`A = π (ro² − ri²)`, `I = π (ro⁴ − ri⁴) / 4`, mass `ρ A L`. Root bending
moment is the joint torque, so the bending stress is `σ = |τ| ro / I` and
`stressUtilization = max(σ · SF / σ_y)` over links and task points.
Tip deflection at a pose superposes the gravity components normal to each
link: link 2 carries the payload as a point load and its own weight as a
uniform load (`P L³ / 3EI + w L⁴ / 8EI`); link 1 carries link 2 plus payload
as a point load and its own weight uniformly, and its tip slope
(`P L² / 2EI + w L³ / 6EI`) rotates link 2 rigidly. `maxTipDeflection_m` is
the largest over task points and is limited to reach / 400 by default.
First-order and conservative; joint compliance is not modelled.

### Design space (`space.ts`)
Four variables: `L1`, `L2` in `[0.15, 1.0] × reach` (linear) and tube radii
`r1`, `r2` in `[4, 60] mm` (log-scaled for learning, since stiffness goes like
`r⁴`). Twelve default task points lie on arcs at 50, 75 and 100 % of the reach
between −30° and +60°.

### Baseline
Two equal links of length `0.55 × farthest task point` (10 % margin over the
`L1 + L2 ≥ d` reach condition) with a common tube radius found by bisection in
log space to be the smallest that satisfies the stress and deflection
constraints. Sized by the same evaluator as every candidate.

### Responses and response model
Responses: `jointTorques_Nm` (2 per task point) and `tipDeflections_m` (one
per task point). The response model derives `peakTorque_Nm`,
`stressUtilization`, `mass_kg` and `unreachableFraction` exactly from the
torques (mass and reachability are pure geometry) and `maxTipDeflection_m`
from the deflections. There is no linear displacement-to-force map, so the
hybrid predictor uses its `forces` representation for this domain and
regresses tip deflection separately.

### Verification (tests/engine/domains/robotics)
- Forward kinematics of a straight and a folded arm; inverse kinematics returns
  two solutions inside the workspace, one on the boundary, none outside.
- Torques of a horizontal arm against the hand-derived formula; zero torque
  for a vertical arm; folded-arm sign.
- Tube section area and second moment against closed forms; cantilever tip
  deflection and slope against `P L³ / 3EI` and `P L² / 2EI`.
- Domain contract: metrics, constraints and assumptions of the template;
  baseline feasible, all points reachable, near-critical; the response model
  reproduces the evaluator's metrics; the evolutionary and member-surrogate
  optimisers improve on the baseline through the registry.

## Plate-fin heat sink in natural convection (thermal domain)

`src/engine/domains/thermal/finArray/`. A rectangular base plate with n
plate fins across its width, vertical in still air. Closed-form fin theory
coupled to a buoyant-channel correlation; no mesh, no fitted parameters.

### Fin theory (`fin.ts`)
Fin parameter `m = sqrt(h P / (k A_c))` with `P = 2 (D + t)` and `A_c = D t`;
efficiency `eta = tanh(m L_c) / (m L_c)` with the corrected length
`L_c = H + t / 2` (adiabatic tip with the tip area folded into the length).
Temperature along a fin `theta(x) / theta_b = cosh(m (L_c - x)) / cosh(m L_c)`.

### Natural convection between the fins
Elenbaas number `El = g beta dT S^4 Pr / (nu^2 L)` on the clear gap `S` and
fin height `L`; Bar-Cohen and Rohsenow composite correlation
`Nu_S = [576 / El^2 + 2.873 / sqrt(El)]^(-1/2)`, `h = Nu_S k_air / S`. Its
limits are the fully developed channel (`Nu -> El / 24`) and the isolated
plate (`Nu -> 0.59 El^(1/4)`), both tested. Air properties are held at a
320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK,
Pr 0.70), a documented assumption.

### Network and fixed point
`T_b = T_inf + Q (R_base + 1 / (h (n eta A_f + A_b)))` with `R_base =
t_b / (k W D)`, `A_f = 2 D L_c` per fin and `A_b` the exposed base. Because
`h` depends on the temperature rise it produces, the residual
`Q R(h(dT)) - dT` (strictly decreasing in `dT`) is solved by bisection.
Energy balance closes to 1e-6 (tested).

### Metrics and constraints
`mass_kg`, `baseTemperature_C`, `thermalResistance_K_W`, `finEfficiency`,
`heatTransferCoefficient_W_m2K`, `gap_m`, `finCount`. Constraints: base
temperature at or below the limit, clear gap at least 2 mm, at least two
fins. Response `thermalState` (base and tip temperature, h, efficiency,
resistance, fin and base heat) with an exact response model.

### Design space and baseline (`space.ts`)
Fin height 5 to 120 mm, fin thickness 0.5 to 6 mm (log), fin pitch 3 to
40 mm (log), base thickness 1 to 12 mm; `n = floor(W / p)`. Baseline: a
conventional extrusion (1.5 mm fins at 8 mm pitch on a 3 mm base) with fin
height bisected to just meet the temperature limit.

### Verification (tests/engine/domains/thermal)
Fin parameter and efficiency against closed forms and limits; Elenbaas
number and both correlation limits; the interior optimum of heat per unit
width over the gap; the prescribed-h network against hand algebra; the
natural-convection fixed point's consistency and energy balance;
monotonicity in power and height; invalid gaps reported; the domain
contract (template, baseline near its limit, artifact, response model,
optimiser runs, infeasible briefs reported as infeasible).

### What the physics says about the canonical briefs
A 100 x 100 mm aluminium sink in still air bottoms out near 0.67 K/W within
these bounds, so a 100 W component cannot be held below 80 C at 25 C ambient;
the interpreter accepts such a brief and the engine reports the baseline as
infeasible. The canonical case is 40 W. Mass optima push fin thickness and
base thickness to their lower bounds: the model has no fin-strength or
extrusion-manufacturing constraint beyond those bounds, which the
limitations file states.

## Spatial truss girder (structural3d domain)

`src/engine/domains/structural/truss3d/`. A triangular-section space truss:
two bottom chords on the supports, one top chord, X-braced floor, one
diagonal per inclined face per bay (mirrored about midspan), analysed by
three-dimensional linear-static FEA.

### Solver (`truss/feaCore.ts`, `truss3d/fea3d.ts`)
Three translational DOFs per node. For a member with unit direction `d`
(three direction cosines), the element stiffness in global coordinates is
`(E A / L) [ d dᵀ, -d dᵀ; -d dᵀ, d dᵀ ]`; the planar `[c², cs; cs, s²]` form
is the two-dimensional special case. Assembly, Cholesky solve of the reduced
system, member forces `N = (E A / L) dᵀ (u_j - u_i)`, reactions `K u - F` at
fixed DOFs and compliance `1/2 Fᵀu` are the same code for both dimensions;
the planar solver is an adapter over the core and reproduces the
pre-refactor solver bit for bit (fixture test). A singular factorisation is
reported as a mechanism.

### Verification (tests/engine/domains/truss3d)
Single axial bar (`delta = P L / E A`, force, stress, reactions,
compliance); symmetric tripod under vertical load (each bar
`-P / (3 cos theta)`, apex displacement `P L / (3 E A cos² theta)`, zero
lateral displacement); lateral load on the tripod (force and moment
equilibrium of reactions, nodal equilibrium of member forces); coplanar
tripod loaded out of plane reported as a mechanism; scaling with E and A;
a planar truss embedded in 3D with out-of-plane DOFs fixed matching the
2D solver to 14 digits; invalid members reported.

### Design space (`spaceTrussSpace.ts`)
Stations `s = 0..n` at `x = s span / n`; nodes BL `(x, -w/2, 0)`, BR
`(x, +w/2, 0)`, T `(x, 0, h_s)`. Members per station: BL-BR, BL-T, BR-T; per
bay: BL-BL', BR-BR', T-T', BL-BR', BR-BL' (X-bracing), BL-T' and BR-T'
(face diagonals, mirrored for bays past midspan): `10 n + 3` members.
Variables: the `n + 1` station heights (linear) and one area per member
(log-scaled for learning). Default `n = 2`: 26 variables, 9 nodes, 23
members. Supports: vertical at all four bottom corners plus x and y at one
corner and x at its neighbour (seven restraints; externally once
indeterminate in the vertical direction, like a four-legged table). Load:
the point load at the midspan top node; self-weight lumped half to each end
node of every member.

### A sanity check the viewport makes visible
With the load at the midspan top node, the face diagonals run from the
supports straight to the loaded node, so the end top-chord members (T0-T1,
T1-T2 at two bays) are in equilibrium with no axial force: their only
neighbours at the end stations are the posts, which have no x-component.
The solver reports exactly zero force there and the optimiser drives those
areas to the bound, which is the correct answer for this topology and load,
not a defect.

### Metrics, baseline and responses
The same metric ids as the planar truss (mass, peak stress, stress and
buckling utilisation with solid round bars and `K = 1`, max displacement,
compliance). Baseline: uniform section at span/8 depth with the common area
found by bisection to just satisfy the constraints. Responses
`memberForces_N` and `nodeDisplacements_m` with the dimension-generic
response model (`truss/responseModelCore.ts`), whose planar adapter is also
verified bit for bit against the previous implementation.

## Material library (`materials.ts`)
Handbook values for Al 6061-T6, ASTM A36 steel, Ti-6Al-4V. Adequate for a
preliminary study; production work must use certified properties.
