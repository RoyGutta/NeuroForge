/// <reference lib="webworker" />
/**
 * Runs an experiment off the main thread. Between generations it yields to
 * the event loop so a cancel message can interrupt a long run.
 */
import { runExperiment } from "../engine/experiments/runner";
import { runMemberStudy, runSurrogateStudy } from "../engine/ml/study";
import { runLab } from "../engine/autonomous/lab";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import type { LabRecord as LabRecordRef } from "../engine/autonomous/lab";

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let cancelled = false;
let running = false;

const post = (msg: WorkerResponse) => ctx.postMessage(msg);

ctx.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }
  if (msg.type === "surrogateStudy") {
    try {
      post({ type: "study", study: runSurrogateStudy(msg.config, msg.options) });
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  if (msg.type === "memberStudy") {
    try {
      post({ type: "memberStudy", study: runMemberStudy(msg.config, msg.options) });
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  if (msg.type === "lab") {
    if (running) {
      post({ type: "error", message: "an experiment is already running in this worker" });
      return;
    }
    running = true;
    cancelled = false;
    try {
      const gen = runLab(msg.config);
      let step = gen.next();
      let lastYield = performance.now();
      let started: LabRecordRef | null = null;
      while (!step.done) {
        const ev = step.value;
        if (ev.type === "started") started = ev.record;
        else post({ type: "labEvent", event: ev });
        if (cancelled) {
          gen.return(undefined as never);
          if (started) post({ type: "labFinished", record: started });
          running = false;
          return;
        }
        if (performance.now() - lastYield > 30) {
          await new Promise((r) => setTimeout(r, 0));
          lastYield = performance.now();
        }
        step = gen.next();
      }
      post({ type: "labFinished", record: step.value });
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      running = false;
    }
    return;
  }
  if (msg.type === "start") {
    if (running) {
      post({ type: "error", message: "an experiment is already running in this worker" });
      return;
    }
    running = true;
    cancelled = false;
    try {
      const gen = runExperiment(msg.config);
      let step = gen.next();
      let lastYield = performance.now();
      while (!step.done) {
        const event = step.value;
        if (event.type === "started") post({ type: "started", record: event.record });
        else {
          post({
            type: "generation",
            summary: event.summary,
            totalEvaluations: event.record.totalEvaluations,
            wallTimeMs: event.record.wallTimeMs,
          });
        }
        if (cancelled) {
          const finished = gen.return(undefined as never);
          if (finished.done && finished.value) post({ type: "finished", record: finished.value });
          running = false;
          return;
        }
        // Yield roughly every 30 ms so cancel messages get through.
        if (performance.now() - lastYield > 30) {
          await new Promise((r) => setTimeout(r, 0));
          lastYield = performance.now();
        }
        step = gen.next();
      }
      post({ type: "finished", record: step.value });
    } catch (err) {
      post({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      running = false;
    }
  }
};
