/**
 * Reproduce an autonomous-lab run from the command line and verify that a
 * second run with the same configuration reaches the identical design.
 *
 *   npm run reproduce:lab                       # canonical truss, seed 7, 6,000 evaluations
 *   npm run reproduce:lab -- 11 8000            # custom seed and budget
 *   npm run reproduce:lab -- path/to/lab.json   # an exported lab record; its config is re-run
 *
 * Prints the lab report; exits non-zero when the re-run differs.
 */
import { readFileSync } from "node:fs";
import { createLabConfig, runLabToCompletion, type LabConfig, type LabRecord } from "../src/engine/autonomous/lab";
import { createTrussBridgeProblem } from "../src/engine/domains/structural/truss/template";
import { ENGINE_VERSION } from "../src/engine/version";

const arg = process.argv[2];
let config: LabConfig;
if (arg && arg.endsWith(".json")) {
  const exported = JSON.parse(readFileSync(arg, "utf8")) as LabRecord;
  config = exported.config;
  console.log(`re-running exported lab ${exported.id} (engine ${exported.engineVersion}, now ${ENGINE_VERSION})`);
} else {
  const seed = Number(arg ?? 7);
  const budget = Number(process.argv[3] ?? 6000);
  config = createLabConfig({ id: `reproduce-lab-${seed}`, problem: createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 2 }), seed, totalBudget: budget, pilotBudget: Math.max(200, Math.round(budget * 0.075)), tradeoffBudget: Math.max(300, Math.round(budget / 6)), pilotSeeds: 2 });
}

const first = runLabToCompletion(config);
const second = runLabToCompletion(config);
const d = first.report.discovery;
console.log(`\n${d.title}\n`);
console.log(`Question: ${d.question}\n`);
for (const [title, items] of [["Method", d.method], ["Results", d.results], ["Uncertainty", d.uncertainty], ["Limitations", d.limitations], ["Reproducibility", d.reproducibility]] as const) {
  console.log(title);
  for (const t of items) console.log(`  - ${t}`);
  console.log("");
}
console.log(`Conclusion: ${d.conclusion}\n`);
const same = JSON.stringify(first.main.best?.parameters) === JSON.stringify(second.main.best?.parameters) && first.chosenStrategy === second.chosenStrategy && first.report.solverEvaluations === second.report.solverEvaluations;
console.log(`reproducible (identical chosen strategy, best design and evaluation count on re-run): ${same}`);
if (!same) process.exit(1);
