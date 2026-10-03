/**
 * Persistence for autonomous-lab records, parallel to the experiment store:
 * an index of summaries plus one entry per record.
 */
import type { LabRecord } from "../autonomous/lab";

export interface LabSummary {
  id: string;
  label: string;
  problemTitle: string;
  domain: string;
  chosenStrategy: string;
  chosenStrategyLabel: string;
  status: LabRecord["status"];
  startedAt: string;
  solverEvaluations: number;
  objectiveMetric: string;
  baselineObjective: number;
  bestObjective: number;
  improvementPercent: number;
  robustFeasibleFraction: number | null;
}

export function summarizeLab(r: LabRecord): LabSummary {
  return {
    id: r.id,
    label: r.label,
    problemTitle: r.config.problem.title,
    domain: r.config.problem.domain,
    chosenStrategy: r.chosenStrategy,
    chosenStrategyLabel: r.report.chosenStrategyLabel,
    status: r.status,
    startedAt: r.startedAt,
    solverEvaluations: r.report.solverEvaluations,
    objectiveMetric: r.report.objectiveMetric,
    baselineObjective: r.report.baselineObjective,
    bestObjective: r.report.bestObjective,
    improvementPercent: r.report.improvementPercent,
    robustFeasibleFraction: r.report.robustness?.feasibleFraction ?? null,
  };
}

export interface LabStore {
  save(record: LabRecord): Promise<void>;
  get(id: string): Promise<LabRecord | undefined>;
  list(): Promise<LabSummary[]>;
  delete(id: string): Promise<void>;
}

function newestFirst(a: LabSummary, b: LabSummary): number {
  return b.startedAt.localeCompare(a.startedAt);
}

export class MemoryLabStore implements LabStore {
  private readonly records = new Map<string, LabRecord>();
  async save(record: LabRecord): Promise<void> {
    this.records.set(record.id, JSON.parse(JSON.stringify(record)));
  }
  async get(id: string): Promise<LabRecord | undefined> {
    const r = this.records.get(id);
    return r ? JSON.parse(JSON.stringify(r)) : undefined;
  }
  async list(): Promise<LabSummary[]> {
    return Array.from(this.records.values()).map(summarizeLab).sort(newestFirst);
  }
  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

export class LocalStorageLabStore implements LabStore {
  constructor(
    private readonly storage: Storage,
    private readonly prefix = "neuroforge.labs"
  ) {}
  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }
  private get indexKey(): string {
    return `${this.prefix}:index`;
  }
  private readIndex(): LabSummary[] {
    try {
      const raw = this.storage.getItem(this.indexKey);
      return raw ? (JSON.parse(raw) as LabSummary[]) : [];
    } catch {
      return [];
    }
  }
  private writeIndex(index: LabSummary[]): void {
    this.storage.setItem(this.indexKey, JSON.stringify(index));
  }
  async save(record: LabRecord): Promise<void> {
    this.storage.setItem(this.key(record.id), JSON.stringify(record));
    const index = this.readIndex().filter((s) => s.id !== record.id);
    index.push(summarizeLab(record));
    this.writeIndex(index.sort(newestFirst));
  }
  async get(id: string): Promise<LabRecord | undefined> {
    const raw = this.storage.getItem(this.key(id));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as LabRecord;
    } catch {
      return undefined;
    }
  }
  async list(): Promise<LabSummary[]> {
    return this.readIndex().sort(newestFirst);
  }
  async delete(id: string): Promise<void> {
    this.storage.removeItem(this.key(id));
    this.writeIndex(this.readIndex().filter((s) => s.id !== id));
  }
}
