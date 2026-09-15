import { useEffect, useMemo, useState } from "react";
import { startSurrogateStudy } from "../../app/experimentClient";
import { TRUSS_METRICS } from "../../engine/domains/structural/truss/evaluate";
import { listSurrogates } from "../../engine/ml/models";
import type { SurrogateResult, SurrogateStudy } from "../../engine/ml/study";
import { formatNumber } from "./model";
import type { Workspace } from "./useWorkspace";

const TARGETS = ["mass_kg", "maxStress_Pa", "bucklingUtilization", "maxDisplacement_m"];

/**
 * Learning panel: trains surrogate models on the designs of the current
 * experiment (regenerated deterministically from its config) and shows
 * held-out test metrics and predicted-versus-actual plots. Nothing here is
 * shown without its measurement.
 */
export function LearningSection({ ws }: { ws: Workspace }) {
  const { record, status } = ws;
  const [models, setModels] = useState<string[]>(["ridge", "gp"]);
  const [study, setStudy] = useState<SurrogateStudy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ model: string; target: string } | null>(null);

  useEffect(() => {
    setStudy(null);
    setSelected(null);
  }, [record?.id]);

  const run = async () => {
    if (!record || busy) return;
    setBusy(true);
    setError(null);
    try {
      const s = await startSurrogateStudy(record.config, { models, targets: TARGETS, splitSeed: record.config.seed, maxTrainingPoints: 2000 });
      setStudy(s);
      setSelected({ model: s.results[0]?.modelId, target: s.results[0]?.target });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const current: SurrogateResult | undefined = useMemo(
    () => study?.results.find((r) => r.modelId === selected?.model && r.target === selected?.target),
    [study, selected]
  );
  const label = (id: string) => TRUSS_METRICS.find((m) => m.id === id)?.label ?? id;

  return (
    <section className="under learning" aria-label="Surrogate learning">
      <div>
        <h2>Learn the design space from this experiment</h2>
        <p>
          Regenerates every design the run evaluated (deterministic from its seed), splits them 70 / 15 / 15, trains each model on the
          training split and reports accuracy on the held-out test split. The solver remains the authority; these models are measured, not trusted.
        </p>
        <div className="row wrap">
          {listSurrogates().map((d) => (
            <label key={d.id} className="check" title={d.description}>
              <input
                type="checkbox"
                checked={models.includes(d.id)}
                disabled={busy}
                onChange={(e) => setModels((m) => (e.target.checked ? [...m, d.id] : m.filter((x) => x !== d.id)))}
              />
              {d.label}
            </label>
          ))}
          <button className="primary" onClick={run} disabled={!record || busy || status === "running" || models.length === 0}>
            {busy ? "Training…" : "Train and evaluate"}
          </button>
        </div>
        {!record && <p className="fine">Run an experiment first; its evaluated designs become the dataset.</p>}
        {error && (
          <p className="warn" role="alert">
            {error}
          </p>
        )}
        {study && (
          <>
            <p className="fine">
              Dataset {study.dataset.size.toLocaleString()} designs ({study.dataset.skipped} skipped) · {study.dataset.dimension} inputs · train {study.split.train} / validation{" "}
              {study.split.validation} / test {study.split.test} · split seed {study.split.seed}
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Target</th>
                  <th>R²</th>
                  <th>RMSE</th>
                  <th>MAE</th>
                  <th>95 % cov.</th>
                  <th>Fit</th>
                </tr>
              </thead>
              <tbody>
                {study.results.map((r) => (
                  <tr
                    key={`${r.modelId}-${r.target}`}
                    className={selected?.model === r.modelId && selected?.target === r.target ? "current" : undefined}
                    onClick={() => setSelected({ model: r.modelId, target: r.target })}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{r.modelId}</td>
                    <td>
                      {label(r.target)}
                      <small className="tiny"> · {r.logSpace ? "log fit" : "raw fit"} (val. R² {Number.isFinite(r.validationR2) ? r.validationR2.toFixed(2) : "—"})</small>
                    </td>
                    <td className={r.r2 > 0.9 ? "green" : r.r2 < 0.5 ? "bad" : undefined}>{formatNumber(r.r2, 3)}</td>
                    <td>{formatSci(r.rmse)}</td>
                    <td>{formatSci(r.mae)}</td>
                    <td>{r.coverage95 === undefined ? "—" : `${(r.coverage95 * 100).toFixed(0)} %`}</td>
                    <td>{r.fitMs < 1000 ? `${r.fitMs.toFixed(0)} ms` : `${(r.fitMs / 1000).toFixed(1)} s`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <div>
        <h2>Predicted versus actual</h2>
        <p>{current ? `${current.modelId} · ${label(current.target)} · ${current.testSize} held-out designs` : "Select a row to plot its test predictions."}</p>
        {current && <Scatter result={current} />}
      </div>
    </section>
  );
}

function Scatter({ result }: { result: SurrogateResult }) {
  const W = 320;
  const H = 320;
  const P = 34;
  const vals = result.sample.flatMap((s) => [s.actual, s.predicted]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const sx = (v: number) => P + ((v - lo) / span) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="scatter" role="img" aria-label="Predicted versus actual on the held-out test split">
      <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} stroke="#496052" strokeDasharray="4 4" />
      {result.sample.map((s, i) => (
        <g key={i}>
          {s.std !== undefined && <line x1={sx(s.actual)} x2={sx(s.actual)} y1={sy(s.predicted - 1.96 * s.std)} y2={sy(s.predicted + 1.96 * s.std)} stroke="#7c8cff" strokeWidth=".6" opacity=".5" />}
          <circle cx={sx(s.actual)} cy={sy(s.predicted)} r="2.2" fill="#79f2c0" opacity=".8" />
        </g>
      ))}
      <g fill="#94a29e" fontSize="9" fontFamily="IBM Plex Sans, sans-serif">
        <text x={W / 2} y={H - 8} textAnchor="middle">
          actual (solver)
        </text>
        <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>
          predicted
        </text>
        <text x={P} y={H - P + 12}>{formatSci(lo)}</text>
        <text x={W - P} y={H - P + 12} textAnchor="end">{formatSci(hi)}</text>
      </g>
    </svg>
  );
}

function formatSci(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e4 || a < 1e-3) return v.toExponential(2);
  return v.toPrecision(3);
}
