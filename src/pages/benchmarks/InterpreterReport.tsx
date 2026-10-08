/**
 * The interpreter benchmark on the Benchmarks page: one column per
 * committed record (rule-based, model-backed, hybrid), the metric set, the
 * failure taxonomy, per-category equivalence, and a per-brief table with the
 * reference reading beside every interpreter's reading.
 */
import { useState } from "react";
import type { EntryScore, FailureCategory, InterpreterMetrics } from "../../engine/interpret/benchmark";
import { INTERPRETER_DATASET, INTERPRETER_RECORDS, type InterpreterRecord } from "./loadReports";

const METRICS: [keyof InterpreterMetrics & string, string][] = [
  ["schemaValidity", "Schema validity"],
  ["domainClassification", "Domain classification"],
  ["fieldExtraction", "Field extraction"],
  ["unitNormalization", "Unit normalisation"],
  ["missingInformation", "Missing information detected"],
  ["ambiguityHandling", "Ambiguity flagged"],
  ["unsupportedDetection", "Unsupported domain declined"],
  ["unsupportedElementDetection", "Unsupported element flagged"],
  ["materialAccuracy", "Material"],
  ["objectiveAccuracy", "Objective"],
  ["validationPassRate", "Deterministic validation passed"],
  ["semanticEquivalence", "Semantically equivalent problem"],
];

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(0)} %`);
const rate = (m: InterpreterMetrics, k: keyof InterpreterMetrics) => {
  const r = m[k] as { value: number | null; n: number };
  return r.n === 0 ? "n/a" : `${pct(r.value)} (${r.n})`;
};

function readingOf(rec: InterpreterRecord, id: string): string {
  const e = rec.entries.find((x) => x.id === id);
  if (!e) return "";
  if (!e.supported) return `${e.kind}`;
  const spec = e.spec;
  if (!spec) return "";
  return spec.fields.filter((f) => f.provenance !== "assumed").map((f) => `${f.id.replace(/_.*$/, "")} ${typeof f.value === "number" ? Number(f.value.toPrecision(5)) : f.value}`).join(", ");
}

function failuresOf(rec: InterpreterRecord, id: string): FailureCategory[] {
  return rec.entries.find((x) => x.id === id)?.score.failures ?? [];
}

export function InterpreterReport() {
  const [showEntries, setShowEntries] = useState(false);
  const records = INTERPRETER_RECORDS;
  const ds = INTERPRETER_DATASET;
  if (records.length === 0 || !ds) return null;
  const allFailures = [...new Set(records.flatMap((r) => Object.keys(r.metrics.failures)))] as FailureCategory[];
  const categories = Object.keys(ds.categories);
  return (
    <section className="interp-bench">
      <div className="study-head">
        <h2>Brief interpretation benchmark</h2>
        <p>
          <b>Question.</b> Does a language model constrained to structured output, deterministic unit normalisation and the engine's validator read engineering briefs more faithfully than the rule-based reference, and at what cost? Dataset {ds.id} v{ds.version}: {ds.entries.length} public briefs across four families and seven categories; every number is normalised and every problem validated by the same deterministic code. No metric is a single accuracy figure.
        </p>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Metric (entries counted)</th>
              {records.map((r) => (
                <th key={r.file}>
                  {r.interpreter.label}
                  {r.settings.model ? <span className="fine"> {r.settings.model} · effort {r.settings.effort} · prompt {r.settings.promptVersion}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(([k, label]) => (
              <tr key={k}>
                <td>{label}</td>
                {records.map((r) => (
                  <td key={r.file}>{rate(r.metrics, k)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td>Mean latency</td>
              {records.map((r) => (
                <td key={r.file}>{r.metrics.latencyMs.mean === null ? "n/a" : r.metrics.latencyMs.mean < 1000 ? `${r.metrics.latencyMs.mean.toFixed(0)} ms` : `${(r.metrics.latencyMs.mean / 1000).toFixed(1)} s`}</td>
              ))}
            </tr>
            <tr>
              <td>Total cost (list price)</td>
              {records.map((r) => (
                <td key={r.file}>{r.metrics.costUsd.total === null ? "n/a" : `$${r.metrics.costUsd.total.toFixed(3)}`}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className="sub">Failures by category</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Failure</th>
              {records.map((r) => (
                <th key={r.file}>{r.interpreter.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFailures.map((f) => (
              <tr key={f}>
                <td>{f}</td>
                {records.map((r) => (
                  <td key={r.file}>{r.metrics.failures[f] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="sub">Semantic equivalence by brief category</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Briefs</th>
              {records.map((r) => (
                <th key={r.file}>{r.interpreter.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c}>
                <td title={ds.categories[c as keyof typeof ds.categories]}>{c}</td>
                <td>{records[0].metrics.byCategory[c]?.entries ?? 0}</td>
                {records.map((r) => (
                  <td key={r.file}>{pct(r.metrics.byCategory[c]?.semanticEquivalence.value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        Records: {records.map((r) => `${r.file} (${new Date(r.createdAt).toISOString().slice(0, 10)}, engine ${r.engineVersion})`).join("; ")}. Reproduce with <code>npm run interpreter:study</code>; model-backed runs need a provider key on the machine running the script and are not bit-reproducible.
      </p>
      <button className="secondary" onClick={() => setShowEntries((v) => !v)}>
        {showEntries ? "Hide" : "Show"} every brief
      </button>
      {showEntries && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Brief</th>
                <th>Reference</th>
                {records.map((r) => (
                  <th key={r.file}>{r.interpreter.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ds.entries.map((e) => (
                <tr key={e.id}>
                  <td className="brief-cell">
                    <b>{e.id}</b> <span className="fine">{e.category}</span>
                    <br />
                    {e.brief}
                  </td>
                  <td className="brief-cell">
                    {e.domain === "unsupported" ? `declined (${e.expected.unsupportedDomain})` : `${e.domain}: ${Object.entries(e.expected.fields ?? {}).map(([k, v]) => `${k.replace(/_.*$/, "")} ${v}`).join(", ")}${e.expected.material ? `, ${e.expected.material}` : ""}, ${e.expected.objective}`}
                    {e.expected.missing && e.expected.missing.length > 0 ? <span className="fine"> missing: {e.expected.missing.join(", ")}</span> : null}
                  </td>
                  {records.map((r) => {
                    const fails = failuresOf(r, e.id);
                    return (
                      <td key={r.file} className={`brief-cell ${fails.length > 0 ? "bad" : "green"}`}>
                        {readingOf(r, e.id)}
                        {fails.length > 0 && <span className="fine"> {fails.join(", ")}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export type { EntryScore };
