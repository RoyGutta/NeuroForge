/**
 * Interpretation controls (in the specification panel) and the full
 * interpretation section: every extracted field with its provenance and
 * evidence, the assumptions the engine made, ambiguities, unsupported
 * elements, conflicts between interpreters, validation issues, model
 * diagnostics, and a side-by-side comparison of every available interpreter.
 */
import type { InterpretResult } from "../../engine/interpret";
import type { SpecField } from "../../engine/interpret/spec";
import { availableInterpreters, type InterpreterChoice, type Workspace } from "./useWorkspace";

const UNIT: Record<string, string> = { span_m: "m", reach_m: "m", load_N: "N", payload_kg: "kg", power_W: "W", maxTemperature_C: "C", ambient_C: "C", massBudget_kg: "kg", safetyFactor: "", deflectionRatio: "" };
const LABEL: Record<string, string> = { span_m: "Span", reach_m: "Reach", load_N: "Load", payload_kg: "Payload", power_W: "Dissipated power", maxTemperature_C: "Temperature limit", ambient_C: "Ambient", massBudget_kg: "Mass budget", safetyFactor: "Safety factor", deflectionRatio: "Deflection limit", materialId: "Material", objective: "Objective" };

function fmt(f: SpecField): string {
  if (f.id === "deflectionRatio") return `L/${f.value}`;
  if (typeof f.value === "number") return `${Number(f.value.toPrecision(6))} ${UNIT[f.id] ?? ""}`.trim();
  return String(f.value).replace(/_/g, " ");
}

export function InterpreterControls({ ws }: { ws: Workspace }) {
  const { interpreterId, setInterpreterId, remote, interpreting, interpret, interpretation, status, compareInterpreters } = ws;
  const options = availableInterpreters(remote);
  const busy = status === "running" || interpreting;
  const llmOn = remote?.configured === true;
  return (
    <>
      <div className="row">
        <select aria-label="Interpreter" value={interpreterId} onChange={(e) => setInterpreterId(e.target.value as InterpreterChoice)} disabled={busy} style={{ flex: 1 }}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.kind === "rule" ? "Rule-based (offline reference)" : o.kind === "llm" ? `LLM (${remote?.model})` : "Hybrid (LLM, normalised, rule cross-check)"}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void interpret()} disabled={busy}>
          {interpreting ? "Interpreting" : "Interpret brief"}
        </button>
      </div>
      <div className="row">
        <button type="button" className="secondary" onClick={() => void compareInterpreters()} disabled={busy || !llmOn} title={llmOn ? "Run every interpreter on this brief" : "Needs the model endpoint"}>
          Compare interpreters
        </button>
        <span className="tiny">{remote === null ? "Checking model endpoint" : llmOn ? `Model endpoint: ${remote.model} · prompt ${remote.promptVersion}` : "No model endpoint configured on this deployment; rule-based only"}</span>
      </div>
      {llmOn && interpreterId !== "rule-based-v1" && <p className="helper">The brief is sent to the NeuroForge server, which calls the model provider. It is not stored. Do not include confidential information. The model only reads the brief; every number is normalised and validated here before it reaches the solver.</p>}
      {interpretation && !interpretation.supported && (
        <p className="warn" role="status">
          {interpretation.kind === "validation-failed" ? "Rejected by validation: " : interpretation.kind === "model-error" ? "Model stage: " : interpretation.kind === "schema-error" ? "Schema stage: " : ""}
          {interpretation.reason}
        </p>
      )}
      {interpretation?.supported && interpretation.warnings.length > 0 && (
        <p className="warn" role="status">
          {interpretation.warnings.join(" ")}
        </p>
      )}
    </>
  );
}

function Provenance({ p }: { p: string | undefined }) {
  const cls = p === "explicit" ? "src-brief" : p === "assumed" ? "src-assumed" : p === "inferred" ? "src-user" : "";
  return <em className={`src ${cls}`}>{p ?? "unknown"}</em>;
}

function ResultDetail({ r }: { r: InterpretResult }) {
  const spec = r.supported ? r.spec : r.spec;
  const problem = r.supported ? r.problem : r.problem;
  const d = r.diagnostics;
  return (
    <>
      {spec && (
        <table className="table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
              <th>Provenance</th>
              <th>Confidence</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {spec.fields.map((f) => (
              <tr key={f.id}>
                <td>{LABEL[f.id] ?? f.id}</td>
                <td>
                  {fmt(f)}
                  {f.rawUnit !== undefined && f.rawUnit !== "" && f.rawUnit !== UNIT[f.id] && <span className="tiny"> from {f.rawValue} {f.rawUnit}</span>}
                </td>
                <td>
                  <Provenance p={f.provenance} />
                </td>
                <td>{f.confidence}</td>
                <td className="evidence">{f.sourceSpan ? `"${f.sourceSpan}"` : f.note ?? ""}</td>
              </tr>
            ))}
            {spec.missing.map((m) => (
              <tr key={`missing-${m}`}>
                <td>{LABEL[m] ?? m}</td>
                <td className="muted">not stated</td>
                <td>
                  <Provenance p="assumed" />
                </td>
                <td></td>
                <td className="evidence">{problem?.assumptions.find((a) => a.field === (m === "materialId" ? "material" : m === "maxTemperature_C" ? "temperatureLimit" : m.replace(/_.*$/, "")))?.value ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {spec && spec.ambiguities.length > 0 && (
        <div className="interp-block">
          <h3>Ambiguities</h3>
          <ul>
            {spec.ambiguities.map((a, i) => (
              <li key={i}>
                <b>{LABEL[a.field] ?? a.field}</b>: candidates {a.candidates.map((c) => (typeof c === "number" ? Number(c.toPrecision(6)) : c)).join(", ")} {UNIT[a.field] ?? ""}. {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}
      {spec && spec.conflicts.length > 0 && (
        <div className="interp-block conflict">
          <h3>Conflicts between interpreters</h3>
          <ul>
            {spec.conflicts.map((c, i) => (
              <li key={i}>
                <b>{LABEL[c.field] ?? c.field}</b>: {c.values.map((v) => `${v.source} read ${typeof v.value === "number" ? Number(v.value.toPrecision(6)) : v.value}${v.evidence ? ` ("${v.evidence}")` : ""}`).join("; ")}. {c.resolution}
              </li>
            ))}
          </ul>
        </div>
      )}
      {spec && spec.unsupportedElements.length > 0 && (
        <div className="interp-block">
          <h3>Not modelled</h3>
          <p>The brief mentions elements outside this problem family: {spec.unsupportedElements.join("; ")}. They are not part of the simulation.</p>
        </div>
      )}
      {!r.supported && r.validation && r.validation.length > 0 && (
        <ul className="issues">
          {r.validation.map((v, i) => (
            <li key={i}>
              <code>{v.path}</code> {v.message}
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <div className="interp-block">
          <h3>Assumptions recorded in the specification</h3>
          <ul>
            {problem.assumptions.map((a) => (
              <li key={a.id}>
                <b>{a.field}</b>: {a.value} <em className={`src src-${a.confidence === "low" ? "assumed" : "user"}`}>{a.confidence}</em> <span className="muted">{a.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="fine">
        {d.kind} interpreter {d.interpreter} · schema {d.schemaVersion}
        {d.model ? ` · model ${d.model}` : ""}
        {d.promptVersion ? ` · prompt ${d.promptVersion}` : ""}
        {d.effort ? ` · effort ${d.effort}` : ""}
        {d.latencyMs !== undefined ? ` · ${d.latencyMs >= 1000 ? `${(d.latencyMs / 1000).toFixed(1)} s` : `${d.latencyMs} ms`}` : ""}
        {d.usage ? ` · ${d.usage.inputTokens.toLocaleString()} in / ${d.usage.outputTokens.toLocaleString()} out tokens` : ""}
        {d.costUsd !== undefined && d.costUsd !== null ? ` · about $${d.costUsd.toFixed(4)}` : ""}
        {d.requestId ? ` · request ${d.requestId}` : ""} · stage {d.stage}
        {d.notes.length > 0 ? ` · ${d.notes.join("; ")}` : ""}
      </p>
    </>
  );
}

function summary(r: InterpretResult): string {
  if (!r.supported) return `${r.kind}: ${r.reason}`;
  return r.spec.fields.filter((f) => f.provenance !== "assumed").map((f) => `${LABEL[f.id] ?? f.id} ${fmt(f)}`).join(" · ");
}

export function InterpretationSection({ ws }: { ws: Workspace }) {
  const { interpretation, comparison, applyInterpretation } = ws;
  if (!interpretation && !comparison) return null;
  return (
    <section className="under interpretation" aria-label="Interpretation">
      <div>
        <h2>How the brief was read</h2>
        <p>
          The interpreter reports what the brief states, with a provenance for every value: explicit (a number in the text), inferred (from the wording), assumed (a default the engine recorded as an assumption). Units are normalised deterministically and the domain validator has the last word; a model never produces an engineering result.
        </p>
      </div>
      {interpretation && <ResultDetail r={interpretation} />}
      {comparison && (
        <div className="interp-block">
          <h3>Interpreter comparison on this brief</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Interpreter</th>
                <th>Reading</th>
                <th>Assumed</th>
                <th>Ambiguities</th>
                <th>Conflicts</th>
                <th>Validation</th>
                <th>Latency</th>
                <th>Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => {
                const r = row.result;
                const spec = r.supported ? r.spec : r.spec;
                return (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td className="evidence">{summary(r)}</td>
                    <td>{spec ? spec.missing.map((m) => LABEL[m] ?? m).join(", ") || "none" : ""}</td>
                    <td>{spec ? spec.ambiguities.length : ""}</td>
                    <td>{spec ? spec.conflicts.length : ""}</td>
                    <td>{r.supported ? "passed" : r.kind}</td>
                    <td>{r.diagnostics.latencyMs !== undefined ? `${(r.diagnostics.latencyMs / 1000).toFixed(2)} s` : ""}</td>
                    <td>{r.diagnostics.costUsd ? `$${r.diagnostics.costUsd.toFixed(4)}` : "0"}</td>
                    <td>{(r.supported || r.kind === "validation-failed") && <button type="button" className="secondary" onClick={() => applyInterpretation(r)}>Use</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
