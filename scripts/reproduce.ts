/**
 * Reproduce the canonical NeuroForge experiment from the command line.
 *
 *   npm run reproduce            # default seed 42, 12,000 evaluations
 *   npm run reproduce -- 7 6000  # custom seed and budget
 *
 * Runs the same engine the browser uses, prints a summary, and verifies that
 * a second run with the same seed produces an identical best design.
 */
import { compileProblem } from "../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../src/engine/experiments/runner";
import { bindingConstraints, parameterSensitivity } from "../src/engine/explain/sensitivity";
import { ENGINE_VERSION } from "../src/engine/version";

const seed = Number(process.argv[2] ?? 42);
const budget = Number(process.argv[3] ?? 12000);

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 2 });
const make = () =>
  createExperimentConfig({
    id: `reproduce-${seed}`,
    problem,
    seed,
    optimizer: { id: "evolutionary", params: { populationSize: 60 } },
    budget: { maxEvaluations: budget },
  });

const record = runExperimentToCompletion(make());
const again = runExperimentToCompletion(make());
const compiled = compileProblem(problem);

const b = record.baseline.evaluation!;
const o = record.best!.evaluation!;
const same = JSON.stringify(record.best!.parameters) === JSON.stringify(again.best!.parameters);

const row = (label: string, id: string, scale = 1, unit = "", digits = 3) =>
  `${label.padEnd(22)} ${(b.metrics[id] * scale).toFixed(digits).padStart(10)} ${(o.metrics[id] * scale).toFixed(digits).padStart(10)}  ${unit}`;

console.log(`NeuroForge engine ${ENGINE_VERSION} - canonical truss bridge experiment`);
console.log(`problem: ${problem.brief}`);
console.log(`optimizer: ${record.config.optimizer.id} ${JSON.stringify(record.config.optimizer.params)}`);
console.log(`seed ${seed} | ${record.totalEvaluations} FEA evaluations | ${record.generations.length} generations | ${(record.wallTimeMs / 1000).toFixed(2)} s`);
console.log("");
console.log(`${"metric".padEnd(22)} ${"baseline".padStart(10)} ${"best".padStart(10)}`);
console.log(row("mass", "mass_kg", 1, "kg"));
console.log(row("peak stress", "maxStress_Pa", 1e-6, "MPa", 1));
console.log(row("stress utilisation", "stressUtilization", 100, "%", 1));
console.log(row("buckling utilisation", "bucklingUtilization", 100, "%", 1));
console.log(row("max displacement", "maxDisplacement_m", 1000, "mm", 2));
console.log("");
console.log(`mass reduction vs baseline: ${((1 - o.metrics.mass_kg / b.metrics.mass_kg) * 100).toFixed(1)} %`);
console.log(`feasible: ${o.feasible} | binding constraints: ${bindingConstraints(o).map((c) => `${c.id} ${(c.utilization * 100).toFixed(1)}%`).join(", ") || "none"}`);
const sens = parameterSensitivity(compiled, record.best!.parameters, "mass_kg");
console.log(`sensitivity by group: ${sens.groups.map((g) => `${g.group} ${(g.share * 100).toFixed(0)}%`).join(", ")}`);
console.log(`reproducible (identical best design on re-run): ${same}`);
if (!same) process.exit(1);
