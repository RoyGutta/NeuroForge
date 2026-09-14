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

## Material library (`materials.ts`)
Handbook values for Al 6061-T6, ASTM A36 steel, Ti-6Al-4V. Adequate for a
preliminary study; production work must use certified properties.
