import { useMemo } from "react";
import type { Design } from "../../engine/core/design";
import { formatMetric } from "./model";
import type { Workspace } from "./useWorkspace";

/**
 * Pareto-front panel for multi-objective runs. Every point is a real,
 * feasible, non-dominated design from the experiment's archive; clicking one
 * shows it in the viewport. The hypervolume curve is the fraction of the
 * baseline's objective box dominated by the archive after each generation.
 */
export function ParetoSection({ ws }: { ws: Workspace }) {
  const { record, problem, baseline, selectedDesign, selectDesign, generations, status } = ws;
  if (problem.objectives.length !== 2) return null;
  const [o1, o2] = problem.objectives;
  const front: Design[] = record?.paretoFront ?? [];
  const running = status === "running";

  const pts = useMemo(() => front.map((d) => ({ d, x: d.evaluation!.objectives[o1.id], y: d.evaluation!.objectives[o2.id] })).sort((a, b) => a.x - b.x), [front, o1.id, o2.id]);
  const base = baseline?.evaluation ? { x: baseline.evaluation.objectives[o1.id], y: baseline.evaluation.objectives[o2.id] } : null;
  const hv = generations.map((g) => g.hypervolume ?? NaN).filter(Number.isFinite);

  const W = 420;
  const H = 300;
  const P = 44;
  const xs = pts.map((p) => p.x).concat(base ? [base.x] : []);
  const ys = pts.map((p) => p.y).concat(base ? [base.y] : []);
  const x0 = xs.length ? Math.min(...xs) : 0;
  const x1 = xs.length ? Math.max(...xs) : 1;
  const y0 = ys.length ? Math.min(...ys) : 0;
  const y1 = ys.length ? Math.max(...ys) : 1;
  const sx = (v: number) => P + ((v - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - y0) / (y1 - y0 || 1)) * (H - 2 * P);

  return (
    <section className="under pareto" aria-label="Pareto front">
      <div>
        <h2>Pareto front: {o1.label.toLowerCase()} against {o2.label.toLowerCase()}</h2>
        <p>
          Each point is a feasible design that no other evaluated design beats in both objectives. The front is the archive of everything
          discovered, not just the final population. Click a point to inspect it in the viewport.
        </p>
        {pts.length === 0 ? (
          <p className="fine">{running ? "Searching…" : "Run a multi-objective experiment to populate the front."}</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="scatter wide-scatter" role="img" aria-label="Pareto front scatter plot">
            <path d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ")} fill="none" stroke="#3c594a" strokeWidth="1" />
            {base && (
              <g>
                <circle cx={sx(base.x)} cy={sy(base.y)} r="5" fill="none" stroke="#7c8cff" strokeWidth="1.5" />
                <text x={sx(base.x) + 8} y={sy(base.y) - 6} fill="#7c8cff" fontSize="9" fontFamily="IBM Plex Sans, sans-serif">
                  baseline
                </text>
              </g>
            )}
            {pts.map((p) => (
              <circle
                key={p.d.id}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={selectedDesign?.id === p.d.id ? 5.5 : 3.5}
                fill={selectedDesign?.id === p.d.id ? "#f2d279" : "#79f2c0"}
                style={{ cursor: "pointer" }}
                onClick={() => selectDesign(p.d)}
              >
                <title>
                  {p.d.id}: {formatMetric(o1.metric, p.x)}, {formatMetric(o2.metric, p.y)}
                </title>
              </circle>
            ))}
            <g fill="#94a29e" fontSize="9" fontFamily="IBM Plex Sans, sans-serif">
              <text x={W / 2} y={H - 10} textAnchor="middle">
                {o1.label} ({formatMetric(o1.metric, x0)} to {formatMetric(o1.metric, x1)})
              </text>
              <text x={12} y={H / 2} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>
                {o2.label} ({formatMetric(o2.metric, y0)} to {formatMetric(o2.metric, y1)})
              </text>
            </g>
          </svg>
        )}
        {selectedDesign?.evaluation && (
          <p className="fine">
            Selected {selectedDesign.id}: {formatMetric(o1.metric, selectedDesign.evaluation.objectives[o1.id])} · {formatMetric(o2.metric, selectedDesign.evaluation.objectives[o2.id])} · {selectedDesign.operator}, generation {selectedDesign.generation}
          </p>
        )}
      </div>
      <div>
        <h2>Front growth</h2>
        <p>
          Hypervolume: the fraction of the baseline's objective box dominated by the archive. Monotone by construction; a plateau means the search has stopped
          finding new trade-offs.
        </p>
        <div className="kv">
          <span>front size</span>
          <b>{front.length}</b>
        </div>
        <div className="kv">
          <span>hypervolume</span>
          <b>{hv.length ? `${(hv[hv.length - 1] * 100).toFixed(1)} % of baseline box` : "—"}</b>
        </div>
        {hv.length > 1 && (
          <svg viewBox="0 0 300 80" className="chart" preserveAspectRatio="none" role="img" aria-label="Hypervolume against generation">
            <path
              d={hv.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (hv.length - 1)) * 296 + 2).toFixed(1)} ${(76 - (v / Math.max(...hv, 1e-9)) * 72).toFixed(1)}`).join(" ")}
              fill="none"
              stroke="#79f2c0"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
    </section>
  );
}
