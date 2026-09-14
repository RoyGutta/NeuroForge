import { TRUSS_METRICS } from "../../engine/domains/structural/truss/evaluate";
import { formatMetric } from "./model";
import type { Workspace } from "./useWorkspace";

export function EvidenceSection({ ws }: { ws: Workspace }) {
  const { baseline, latestBest, problem, library, loadExperiment, deleteExperiment, record } = ws;
  const rows = TRUSS_METRICS.filter((m) => m.id !== "compliance_J" || problem.objectives[0].metric === "compliance_J");
  const b = baseline?.evaluation?.metrics;
  const o = latestBest?.evaluation?.metrics;

  return (
    <section className="under" aria-label="Design evidence">
      <div>
        <h2>Baseline versus search result</h2>
        <p>Same span, load, material, supports and acceptance criteria. Both evaluated by the same solver.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Baseline</th>
              <th>NeuroForge</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const bv = b?.[m.id];
              const ov = o?.[m.id];
              const change = bv && ov !== undefined && Number.isFinite(ov) && bv !== 0 ? ((ov - bv) / bv) * 100 : null;
              return (
                <tr key={m.id} title={m.description}>
                  <td>{m.label}</td>
                  <td>{formatMetric(m.id, bv)}</td>
                  <td>{formatMetric(m.id, ov)}</td>
                  <td className={change !== null && change < 0 && (m.id === "mass_kg" || m.id === "compliance_J") ? "green" : undefined}>
                    {change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)} %`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="fine">
          Baseline: {record ? record.config.problem.title : problem.title} · conventional uniform-section Warren truss sized to the same constraints. Improvement is measured under identical assumptions.
        </p>
      </div>
      <div>
        <h2>Experiment library</h2>
        <p>Every run is stored in this browser with its seed, optimizer settings and full generation history, so it can be reopened and reproduced.</p>
        {library.length === 0 ? (
          <p className="fine">No experiments yet. Run one to populate the library.</p>
        ) : (
          <table className="table">
            <tbody>
              {library.slice(0, 8).map((s) => (
                <tr key={s.id} className={record?.id === s.id ? "current" : undefined}>
                  <td>
                    <button className="link" onClick={() => loadExperiment(s.id)}>
                      {s.label}
                    </button>
                    <small>
                      {new Date(s.startedAt).toLocaleString()} · {s.totalEvaluations.toLocaleString()} evals · {s.status}
                    </small>
                  </td>
                  <td>
                    {s.bestObjective !== null && s.baselineObjective ? (
                      <span className="green">−{((1 - s.bestObjective / s.baselineObjective) * 100).toFixed(1)} %</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button className="link muted" onClick={() => deleteExperiment(s.id)} aria-label={`Delete ${s.label}`}>
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
