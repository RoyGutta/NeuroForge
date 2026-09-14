/**
 * The homepage demo runs a real, short experiment (same engine, same
 * solver, same optimizer) on whatever brief the visitor types, in a Web
 * Worker. Nothing here is scripted or pre-recorded.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startExperiment, type ExperimentHandle } from "../../app/experimentClient";
import { stashPendingProblem } from "../../app/store";
import type { Design } from "../../engine/core/design";
import type { EngineeringProblem } from "../../engine/core/problem";
import { compileProblem } from "../../engine/domains/registry";
import type { CompiledProblem } from "../../engine/domains/domain";
import type { TrussModel } from "../../engine/domains/structural/truss/model";
import type { ExperimentRecord, GenerationSummary } from "../../engine/experiments/experiment";
import { createExperimentConfig } from "../../engine/experiments/runner";
import { interpretBrief, type InterpretResult } from "../../engine/interpret";

export const DEMO_BUDGET = 6000;
export const DEMO_SEED = 7;

export type DemoStatus = "idle" | "running" | "done" | "unsupported" | "error";

export function useHomeDemo(initialBrief: string) {
  const [problem, setProblem] = useState<EngineeringProblem>(() => {
    const r = interpretBrief(initialBrief);
    if (!r.supported) throw new Error("initial brief must be supported");
    return r.problem;
  });
  const [interpretation, setInterpretation] = useState<InterpretResult | null>(null);
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [record, setRecord] = useState<ExperimentRecord | null>(null);
  const [generations, setGenerations] = useState<GenerationSummary[]>([]);
  const [progress, setProgress] = useState({ evaluations: 0, wallTimeMs: 0 });
  const [message, setMessage] = useState<string>("");
  const handleRef = useRef<ExperimentHandle | null>(null);

  const compiled = useMemo(() => {
    try {
      return compileProblem(problem) as CompiledProblem<TrussModel>;
    } catch {
      return null;
    }
  }, [problem]);

  useEffect(() => () => handleRef.current?.cancel(), []);

  const baseline: Design | null = useMemo(() => {
    if (record) return record.baseline;
    if (!compiled) return null;
    const params = compiled.baseline.parameters;
    return { id: "baseline", generation: 0, parentIds: [], operator: "baseline", parameters: params, evaluation: compiled.evaluate(params) };
  }, [record, compiled]);

  const best: Design | null = useMemo(() => {
    if (generations.length > 0) return generations[generations.length - 1].bestSoFar;
    return record?.best ?? null;
  }, [generations, record]);

  const run = useCallback(
    (brief: string) => {
      if (status === "running") return;
      const r = interpretBrief(brief);
      setInterpretation(r);
      if (!r.supported) {
        setStatus("unsupported");
        setMessage(r.reason);
        return;
      }
      setProblem(r.problem);
      setRecord(null);
      setGenerations([]);
      setProgress({ evaluations: 0, wallTimeMs: 0 });
      setStatus("running");
      setMessage(
        `Interpreted: ${r.extracted
          .filter((e) => e.field !== "objective")
          .map((e) => `${e.field.replace(/_.*$/, "")} ${typeof e.value === "number" ? +e.value.toFixed(3) : e.value}`)
          .join(" · ")}. Running ${DEMO_BUDGET.toLocaleString()} finite-element evaluations in a Web Worker.`
      );
      const config = createExperimentConfig({
        problem: r.problem,
        seed: DEMO_SEED,
        optimizer: { id: "evolutionary", params: { populationSize: 40 } },
        budget: { maxEvaluations: DEMO_BUDGET },
        label: "Homepage demo",
      });
      let buffer: GenerationSummary[] = [];
      let timer: ReturnType<typeof setTimeout> | null = null;
      const flush = () => {
        if (buffer.length) {
          const chunk = buffer;
          buffer = [];
          setGenerations((g) => g.concat(chunk));
        }
        timer = null;
      };
      handleRef.current = startExperiment(config, {
        onStarted: (rec) => setRecord(rec),
        onGeneration: (s, evaluations, wallTimeMs) => {
          buffer.push(s);
          setProgress({ evaluations, wallTimeMs });
          if (!timer) timer = setTimeout(flush, 80);
        },
        onFinished: (rec) => {
          if (timer) clearTimeout(timer);
          buffer = [];
          setRecord(rec);
          setGenerations(rec.generations);
          setProgress({ evaluations: rec.totalEvaluations, wallTimeMs: rec.wallTimeMs });
          setStatus("done");
          handleRef.current = null;
          const b = rec.baseline.evaluation?.objectives[rec.config.problem.objectives[0].id];
          const o = rec.best?.evaluation?.objectives[rec.config.problem.objectives[0].id];
          if (b && o !== undefined) {
            setMessage(
              `Search complete: ${rec.totalEvaluations.toLocaleString()} FEA evaluations in ${(rec.wallTimeMs / 1000).toFixed(1)} s. ` +
                `Best feasible design is ${((1 - o / b) * 100).toFixed(1)} % lighter than the conventionally sized baseline under identical constraints.`
            );
          }
        },
        onError: (m) => {
          setStatus("error");
          setMessage(m);
          handleRef.current = null;
        },
      });
    },
    [status]
  );

  /** Hand the problem (and finished run, if any) to the workspace. */
  const stashForWorkspace = useCallback(() => {
    stashPendingProblem({
      problem,
      extracted: interpretation?.supported ? interpretation.extracted : undefined,
      record: status === "done" ? record : undefined,
    });
  }, [problem, interpretation, record, status]);

  return { problem, compiled, status, message, record, generations, progress, baseline, best, run, stashForWorkspace };
}
