/**
 * Real data for the technology page: the compiled canonical problem (so the
 * code panels show actual specification, variables and evaluation records)
 * and a short seeded experiment for the search-history chart.
 */
import { useEffect, useMemo, useState } from "react";
import { startExperiment } from "../../app/experimentClient";
import { compileProblem } from "../../engine/domains/registry";
import type { CompiledProblem } from "../../engine/domains/domain";
import type { TrussModel } from "../../engine/domains/structural/truss/model";
import { createTrussBridgeProblem } from "../../engine/domains/structural/truss/template";
import type { ExperimentRecord, GenerationSummary } from "../../engine/experiments/experiment";
import { createExperimentConfig } from "../../engine/experiments/runner";
import { getOptimizerDescriptor } from "../../engine/optimization";

export const TECH_SEED = 3;
export const TECH_BUDGET = 4000;

export function useTechnologyData() {
  const problem = useMemo(() => createTrussBridgeProblem({ span_m: 2, load_N: 500 }), []);
  const compiled = useMemo(() => compileProblem(problem) as CompiledProblem<TrussModel>, [problem]);
  const baselineEval = useMemo(() => compiled.evaluate(compiled.baseline.parameters), [compiled]);
  const [generations, setGenerations] = useState<GenerationSummary[]>([]);
  const [record, setRecord] = useState<ExperimentRecord | null>(null);

  useEffect(() => {
    // React StrictMode mounts effects twice in development; the first handle is
    // cancelled and its (partial) result ignored so only the live run reports.
    let active = true;
    const config = createExperimentConfig({
      problem,
      seed: TECH_SEED,
      optimizer: { id: "evolutionary", params: { populationSize: 40 } },
      budget: { maxEvaluations: TECH_BUDGET },
      label: "Technology page trace",
    });
    const handle = startExperiment(config, {
      onFinished: (rec) => {
        if (!active || rec.status !== "completed") return;
        setRecord(rec);
        setGenerations(rec.generations);
      },
    });
    return () => {
      active = false;
      handle.cancel();
    };
  }, [problem]);

  const evolutionary = getOptimizerDescriptor("evolutionary")!;

  const codePanels = useMemo(() => {
    const g = problem.geometry;
    const spec = [
      `objective        ${problem.objectives[0].direction}(${problem.objectives[0].metric})`,
      `span             ${g.span_m} m`,
      `applied_load     ${problem.loads[0].magnitude_N} N at midspan`,
      `material         ${problem.material.name}`,
      `safety_factor    ${problem.safetyFactor}`,
      ...problem.constraints.map((c) => `constraint       ${c.metric} ${c.op} ${fmt(c.limit)}  [${c.source}]`),
      `assumptions      ${problem.assumptions.length} recorded, each with a reason and confidence`,
    ].join("\n");
    const vars = compiled.space.variables;
    const depth = vars.filter((v) => v.group === "depth");
    const area = vars.filter((v) => v.group === "area");
    const space = [
      `panels           ${g.panels}  (Warren ground structure)`,
      `nodes            ${2 * g.panels + 1}   members ${4 * g.panels - 1}`,
      `variables        ${vars.length}`,
      `  depth x${depth.length}      [${depth[0].lower.toFixed(3)}, ${depth[0].upper.toFixed(3)}] m`,
      `  area x${area.length}      [${area[0].lower.toExponential(0)}, ${area[0].upper.toExponential(0)}] m^2`,
      `section          solid round bar, I = A^2 / 4 pi`,
      `supports         pin (left), roller (right)`,
    ].join("\n");
    const m = baselineEval.metrics;
    const sim = [
      `analysis         linear static, direct stiffness method`,
      `solver           Cholesky on the reduced stiffness matrix`,
      `baseline mass    ${m.mass_kg.toFixed(3)} kg`,
      `peak stress      ${(m.maxStress_Pa / 1e6).toFixed(2)} MPa   (utilisation ${(m.stressUtilization * 100).toFixed(0)} %)`,
      `buckling util.   ${(m.bucklingUtilization * 100).toFixed(1)} %   <- governs`,
      `max displacement ${(m.maxDisplacement_m * 1000).toFixed(2)} mm   (limit ${(problem.constraints.find((c) => c.id === "deflection")!.limit * 1000).toFixed(0)} mm)`,
      `singular K       reported as "unstable", never silently patched`,
    ].join("\n");
    const learn = [
      `status           ROADMAP - not implemented yet`,
      `plan             train on (parameters -> metrics) pairs from real runs`,
      `candidates       ridge / polynomial baseline, MLP, Gaussian process`,
      `evaluation       hold-out MAE, RMSE, R^2 against the FEA solver`,
      `use              propose candidates; the solver always has the last word`,
    ].join("\n");
    const opt = [
      `algorithm        ${evolutionary.label}`,
      ...evolutionary.params.map((p) => `${p.id.padEnd(16)} ${p.default}`),
      `ranking          Deb feasibility rules: feasible > violation > objective`,
      `reproducible     seeded Rng + counter ids; record stores every generation`,
    ].join("\n");
    return [spec, space, sim, learn, opt];
  }, [problem, compiled, baselineEval, evolutionary]);

  return { problem, compiled, baselineEval, generations, record, codePanels };
}

function fmt(v: number): string {
  return Math.abs(v) < 0.01 ? v.toExponential(2) : v.toString();
}
