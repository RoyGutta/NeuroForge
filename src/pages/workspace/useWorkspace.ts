import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExperimentStore, takePendingProblem } from "../../app/store";
import { startExperiment, type ExperimentHandle } from "../../app/experimentClient";
import type { Design } from "../../engine/core/design";
import type { EngineeringProblem, ValidationIssue } from "../../engine/core/problem";
import { compileProblem, validateProblem } from "../../engine/domains/registry";
import type { CompiledProblem } from "../../engine/domains/domain";
import type { TrussModel } from "../../engine/domains/structural/truss/model";
import type { ExperimentRecord, ExperimentSummary, GenerationSummary } from "../../engine/experiments/experiment";
import { createExperimentConfig } from "../../engine/experiments/runner";
import { interpretBrief, type InterpretResult } from "../../engine/interpret";
import { getOptimizerDescriptor } from "../../engine/optimization";
import type { ViewMode } from "./TrussSvg";
import { defaultForm, defaultSettings, formFromProblem, problemFromForm, type RunSettings, type SpecForm } from "./model";

export type RunStatus = "idle" | "running" | "completed" | "cancelled" | "error";

export interface PendingProblemPayload {
  problem: EngineeringProblem;
  extracted?: { field: string; value: number | string; confidence: "high" | "medium" | "low" }[];
  record?: ExperimentRecord;
}

export function useWorkspace() {
  const [form, setForm] = useState<SpecForm>(defaultForm);
  const [problem, setProblem] = useState<EngineeringProblem>(() => problemFromForm(defaultForm()));
  const [interpretation, setInterpretation] = useState<InterpretResult | null>(null);
  const [settings, setSettings] = useState<RunSettings>(defaultSettings);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [record, setRecord] = useState<ExperimentRecord | null>(null);
  const [generations, setGenerations] = useState<GenerationSummary[]>([]);
  const [progress, setProgress] = useState({ evaluations: 0, wallTimeMs: 0 });
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("structure");
  const [scrub, setScrub] = useState<number | null>(null);
  const [showing, setShowing] = useState<"best" | "baseline" | "selected">("best");
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [library, setLibrary] = useState<ExperimentSummary[]>([]);
  const handleRef = useRef<ExperimentHandle | null>(null);

  const issues: ValidationIssue[] = useMemo(() => validateProblem(problem), [problem]);
  const compiled: CompiledProblem<TrussModel> | null = useMemo(() => {
    if (issues.length > 0) return null;
    try {
      return compileProblem(problem) as CompiledProblem<TrussModel>;
    } catch {
      return null;
    }
  }, [problem, issues]);

  const refreshLibrary = useCallback(async () => {
    setLibrary(await getExperimentStore().list());
  }, []);

  useEffect(() => {
    void refreshLibrary();
    const pending = takePendingProblem<PendingProblemPayload>();
    if (pending?.problem) {
      setProblem(pending.problem);
      setForm(formFromProblem(pending.problem, pending.extracted as never));
      if (pending.record) {
        setRecord(pending.record);
        setGenerations(pending.record.generations);
        setProgress({ evaluations: pending.record.totalEvaluations, wallTimeMs: pending.record.wallTimeMs });
        setStatus(pending.record.status === "completed" ? "completed" : "cancelled");
      }
    }
    return () => handleRef.current?.cancel();
  }, [refreshLibrary]);

  const updateForm = useCallback((patch: Partial<SpecForm>, touched?: keyof SpecForm["sources"]) => {
    setForm((f) => ({
      ...f,
      ...patch,
      sources: touched ? { ...f.sources, [touched]: "user" } : f.sources,
    }));
  }, []);

  const applyForm = useCallback(() => {
    setProblem((prev) => problemFromForm(form, prev));
    setRecord(null);
    setGenerations([]);
    setStatus("idle");
    setScrub(null);
    setShowing("best");
  }, [form]);

  const interpret = useCallback(() => {
    const r = interpretBrief(form.brief);
    setInterpretation(r);
    if (r.supported) {
      setProblem(r.problem);
      setForm(formFromProblem(r.problem, r.extracted));
      setRecord(null);
      setGenerations([]);
      setStatus("idle");
      setScrub(null);
    }
  }, [form.brief]);

  const start = useCallback(() => {
    if (!compiled || status === "running") return;
    const config = createExperimentConfig({
      problem,
      seed: settings.seed,
      optimizer: { id: settings.optimizerId, params: settings.params },
      budget: { maxEvaluations: settings.maxEvaluations },
      seedBaseline: settings.seedBaseline,
    });
    setStatus("running");
    setError(null);
    setGenerations([]);
    setScrub(null);
    setShowing("best");
    setSelectedDesign(null);
    setProgress({ evaluations: 0, wallTimeMs: 0 });
    let buffer: GenerationSummary[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (buffer.length === 0) return;
      const chunk = buffer;
      buffer = [];
      setGenerations((g) => g.concat(chunk));
      flushTimer = null;
    };
    handleRef.current = startExperiment(config, {
      onStarted: (rec) => setRecord(rec),
      onGeneration: (summary, evaluations, wallTimeMs) => {
        buffer.push(summary);
        setProgress({ evaluations, wallTimeMs });
        if (!flushTimer) flushTimer = setTimeout(flush, 60);
      },
      onFinished: async (rec) => {
        if (flushTimer) clearTimeout(flushTimer);
        buffer = [];
        setRecord(rec);
        setGenerations(rec.generations);
        setProgress({ evaluations: rec.totalEvaluations, wallTimeMs: rec.wallTimeMs });
        setStatus(rec.status === "completed" ? "completed" : "cancelled");
        handleRef.current = null;
        await getExperimentStore().save(rec);
        void refreshLibrary();
      },
      onError: (message) => {
        setError(message);
        setStatus("error");
        handleRef.current = null;
      },
    });
  }, [compiled, status, problem, settings, refreshLibrary]);

  const cancel = useCallback(() => handleRef.current?.cancel(), []);

  const loadExperiment = useCallback(async (id: string) => {
    const rec = await getExperimentStore().get(id);
    if (!rec) return;
    setProblem(rec.config.problem);
    setForm(formFromProblem(rec.config.problem));
    setSettings({
      optimizerId: rec.config.optimizer.id,
      params: rec.config.optimizer.params,
      maxEvaluations: rec.config.budget.maxEvaluations,
      seed: rec.config.seed,
      seedBaseline: rec.config.seedBaseline,
    });
    setRecord(rec);
    setGenerations(rec.generations);
    setProgress({ evaluations: rec.totalEvaluations, wallTimeMs: rec.wallTimeMs });
    setStatus(rec.status === "completed" ? "completed" : "cancelled");
    setScrub(null);
    setShowing("best");
  }, []);

  const deleteExperiment = useCallback(
    async (id: string) => {
      await getExperimentStore().delete(id);
      void refreshLibrary();
    },
    [refreshLibrary]
  );

  // Which design is on screen.
  const baseline: Design | null = useMemo(() => {
    if (record) return record.baseline;
    if (!compiled) return null;
    const params = compiled.baseline.parameters;
    return { id: "baseline", generation: 0, parentIds: [], operator: "baseline", parameters: params, evaluation: compiled.evaluate(params) };
  }, [record, compiled]);

  const latestBest: Design | null = useMemo(() => {
    if (generations.length > 0) return generations[generations.length - 1].bestSoFar;
    return record?.best ?? null;
  }, [generations, record]);

  const displayed: Design | null = useMemo(() => {
    if (showing === "baseline") return baseline;
    if (showing === "selected" && selectedDesign) return selectedDesign;
    if (scrub !== null && generations[scrub]) return generations[scrub].bestSoFar;
    return latestBest ?? baseline;
  }, [showing, scrub, generations, latestBest, baseline, selectedDesign]);

  const selectDesign = useCallback((d: Design) => {
    setSelectedDesign(d);
    setShowing("selected");
  }, []);

  const multiObjective = problem.objectives.length > 1;
  // Keep the optimiser choice consistent with the objective structure.
  useEffect(() => {
    const desc = getOptimizerDescriptor(settings.optimizerId);
    if (multiObjective && !desc?.multiObjective) setSettings((s) => ({ ...s, optimizerId: "nsga2", params: {} }));
    if (!multiObjective && desc?.multiObjective) setSettings((s) => ({ ...s, optimizerId: "evolutionary", params: {} }));
  }, [multiObjective, settings.optimizerId]);

  return {
    form,
    updateForm,
    applyForm,
    interpret,
    interpretation,
    problem,
    issues,
    compiled,
    settings,
    setSettings,
    status,
    error,
    record,
    generations,
    progress,
    start,
    cancel,
    mode,
    setMode,
    scrub,
    setScrub,
    showing,
    setShowing,
    baseline,
    latestBest,
    displayed,
    selectedDesign,
    selectDesign,
    multiObjective,
    library,
    loadExperiment,
    deleteExperiment,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
