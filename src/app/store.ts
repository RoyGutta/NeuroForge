import { LocalStorageLabStore, MemoryLabStore, type LabStore } from "../engine/experiments/labStore";
import { LocalStorageExperimentStore, MemoryExperimentStore, type ExperimentStore } from "../engine/experiments/store";

let store: ExperimentStore | undefined;
let labStore: LabStore | undefined;

/** Shared store for autonomous-lab records. localStorage when available. */
export function getLabStore(): LabStore {
  if (labStore) return labStore;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem("neuroforge.probe");
      labStore = new LocalStorageLabStore(localStorage);
      return labStore;
    }
  } catch {
    // storage blocked; fall back to memory
  }
  labStore = new MemoryLabStore();
  return labStore;
}

/** Shared experiment store for the app. localStorage when available. */
export function getExperimentStore(): ExperimentStore {
  if (store) return store;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem("neuroforge.probe");
      store = new LocalStorageExperimentStore(localStorage);
      return store;
    }
  } catch {
    // storage blocked; fall back to memory
  }
  store = new MemoryExperimentStore();
  return store;
}

const PENDING_KEY = "neuroforge.pendingProblem";

/** Hand a problem from one page to the workspace across navigation. */
export function stashPendingProblem(payload: unknown): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function takePendingProblem<T>(): T | undefined {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return undefined;
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}
