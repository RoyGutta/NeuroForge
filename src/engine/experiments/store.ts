/**
 * Experiment persistence. The interface is async so a future backend
 * (IndexedDB, HTTP API, database) drops in without touching callers.
 */
import type { ExperimentRecord, ExperimentSummary } from "./experiment";
import { summarize } from "./experiment";

export interface ExperimentStore {
  save(record: ExperimentRecord): Promise<void>;
  get(id: string): Promise<ExperimentRecord | undefined>;
  list(): Promise<ExperimentSummary[]>;
  delete(id: string): Promise<void>;
}

function newestFirst(a: ExperimentSummary, b: ExperimentSummary): number {
  return b.startedAt.localeCompare(a.startedAt);
}

export class MemoryExperimentStore implements ExperimentStore {
  private readonly records = new Map<string, ExperimentRecord>();

  async save(record: ExperimentRecord): Promise<void> {
    this.records.set(record.id, JSON.parse(JSON.stringify(record)));
  }
  async get(id: string): Promise<ExperimentRecord | undefined> {
    const r = this.records.get(id);
    return r ? JSON.parse(JSON.stringify(r)) : undefined;
  }
  async list(): Promise<ExperimentSummary[]> {
    return Array.from(this.records.values()).map(summarize).sort(newestFirst);
  }
  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

/**
 * Browser localStorage-backed store. Keeps an index of summaries under one
 * key and each record under its own key so listing does not parse every run.
 */
export class LocalStorageExperimentStore implements ExperimentStore {
  constructor(
    private readonly storage: Storage,
    private readonly prefix = "neuroforge.experiments"
  ) {}

  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }
  private get indexKey(): string {
    return `${this.prefix}:index`;
  }
  private readIndex(): ExperimentSummary[] {
    try {
      const raw = this.storage.getItem(this.indexKey);
      return raw ? (JSON.parse(raw) as ExperimentSummary[]) : [];
    } catch {
      return [];
    }
  }
  private writeIndex(index: ExperimentSummary[]): void {
    this.storage.setItem(this.indexKey, JSON.stringify(index));
  }

  async save(record: ExperimentRecord): Promise<void> {
    this.storage.setItem(this.key(record.id), JSON.stringify(record));
    const index = this.readIndex().filter((s) => s.id !== record.id);
    index.push(summarize(record));
    this.writeIndex(index.sort(newestFirst));
  }
  async get(id: string): Promise<ExperimentRecord | undefined> {
    const raw = this.storage.getItem(this.key(id));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as ExperimentRecord;
    } catch {
      return undefined;
    }
  }
  async list(): Promise<ExperimentSummary[]> {
    return this.readIndex();
  }
  async delete(id: string): Promise<void> {
    this.storage.removeItem(this.key(id));
    this.writeIndex(this.readIndex().filter((s) => s.id !== id));
  }
}
