/**
 * Main-thread handle on a running experiment. Uses a module Web Worker when
 * the environment provides one and falls back to running the generator on
 * the main thread in small time slices otherwise (tests, unusual browsers).
 */
import type { ExperimentConfig, ExperimentRecord, GenerationSummary } from "../engine/experiments/experiment";
import { runExperiment } from "../engine/experiments/runner";
import type { WorkerRequest, WorkerResponse } from "../workers/protocol";

export interface ExperimentHandlers {
  onStarted?(record: ExperimentRecord): void;
  onGeneration?(summary: GenerationSummary, totalEvaluations: number, wallTimeMs: number): void;
  onFinished?(record: ExperimentRecord): void;
  onError?(message: string): void;
}

export interface ExperimentHandle {
  cancel(): void;
}

export function startExperiment(config: ExperimentConfig, handlers: ExperimentHandlers): ExperimentHandle {
  if (typeof Worker !== "undefined") {
    try {
      return startInWorker(config, handlers);
    } catch {
      // fall through to the main-thread runner
    }
  }
  return startOnMainThread(config, handlers);
}

function startInWorker(config: ExperimentConfig, handlers: ExperimentHandlers): ExperimentHandle {
  const worker = new Worker(new URL("../workers/experiment.worker.ts", import.meta.url), { type: "module" });
  const send = (msg: WorkerRequest) => worker.postMessage(msg);
  worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    switch (msg.type) {
      case "started":
        handlers.onStarted?.(msg.record);
        break;
      case "generation":
        handlers.onGeneration?.(msg.summary, msg.totalEvaluations, msg.wallTimeMs);
        break;
      case "finished":
        handlers.onFinished?.(msg.record);
        worker.terminate();
        break;
      case "error":
        handlers.onError?.(msg.message);
        worker.terminate();
        break;
    }
  };
  worker.onerror = (e) => {
    handlers.onError?.(e.message || "worker error");
    worker.terminate();
  };
  send({ type: "start", config });
  return { cancel: () => send({ type: "cancel" }) };
}

function startOnMainThread(config: ExperimentConfig, handlers: ExperimentHandlers): ExperimentHandle {
  let cancelled = false;
  const gen = runExperiment(config);
  const pump = () => {
    try {
      const slice = performance.now();
      let step = gen.next();
      while (!step.done) {
        const ev = step.value;
        if (ev.type === "started") handlers.onStarted?.(ev.record);
        else handlers.onGeneration?.(ev.summary, ev.record.totalEvaluations, ev.record.wallTimeMs);
        if (cancelled) {
          const fin = gen.return(undefined as never);
          if (fin.done && fin.value) handlers.onFinished?.(fin.value);
          return;
        }
        if (performance.now() - slice > 16) {
          setTimeout(pump, 0);
          return;
        }
        step = gen.next();
      }
      handlers.onFinished?.(step.value);
    } catch (err) {
      handlers.onError?.(err instanceof Error ? err.message : String(err));
    }
  };
  setTimeout(pump, 0);
  return { cancel: () => (cancelled = true) };
}
