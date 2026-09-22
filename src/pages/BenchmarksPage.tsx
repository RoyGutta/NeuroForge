import { useMemo, useState } from "react";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";
import { usePageMeta } from "../hooks/usePageMeta";
import css from "../styles/benchmarks.css?inline";
import { REPORTS } from "./benchmarks/loadReports";
import { aggregateCurves, evaluationGrid, type NormalizedGroup, type NormalizedReport } from "./benchmarks/model";

const COLORS = ["#79f2c0", "#7c8cff", "#f2d279", "#f28b79", "#c0e584", "#dfa75b", "#9ab5aa", "#b48cff"];

export function BenchmarksPage() {
  usePageMeta("Benchmarks — NeuroForge", "Measured comparisons of NeuroForge's optimisers at equal solver budget across seeds, from committed benchmark records.");
  const [fileIdx, setFileIdx] = useState(0);
  const report: NormalizedReport | undefined = REPORTS[fileIdx];
  const [selected, setSelected] = useState<{ group: number; seed: number } | null>(null);

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <NavBar current="benchmarks" />
        <main>
          <section className="intro">
            <div>
              <div className="eyebrow">
                <span className="dot"></span>Research evidence
              </div>
              <h1>Benchmarks</h1>
              <p>
                Every table and curve on this page is read from a benchmark record committed to the repository and produced by
                <code> npm run benchmark</code> or <code>npm run ablation</code>: identical seeds, equal solver budgets, medians and
                interquartile ranges across seeds. Nothing is generated in the browser.
              </p>
            </div>
            {REPORTS.length > 1 && (
              <label className="picker">
                Record
                <select value={fileIdx} onChange={(e) => (setFileIdx(Number(e.target.value)), setSelected(null))}>
                  {REPORTS.map((r, i) => (
                    <option key={r.file} value={i}>
                      {r.file}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
          {!report ? (
            <p className="fine">No benchmark records are committed yet.</p>
          ) : (
            <>
              <p className="meta">
                {report.kind === "ablation" ? "Ablation" : "Optimiser comparison"} · engine {report.engineVersion} · {report.seeds} seeds · {report.budget.toLocaleString()} solver evaluations per run ·
                baseline {report.baselineMass.toFixed(3)} kg · target {report.targetMass.toFixed(3)} kg · {new Date(report.createdAt).toISOString().slice(0, 10)}
              </p>
              <SummaryTable report={report} selected={selected} onSelect={(g) => setSelected({ group: g, seed: report.groups[g].runs[0]?.seed ?? 1 })} />
              {report.groups.some((g) => g.runs.some((r) => r.curve.length > 0)) && <ConvergenceChart report={report} selected={selected} />}
              <RunInspector report={report} selected={selected} onSelect={setSelected} />
            </>
          )}
        </main>
        <Footer
          current="benchmarks"
          links={[
            { label: "Technology", to: "/technology", page: "technology" },
            { label: "Projects", to: "/projects", page: "projects" },
            { label: "Benchmarks", to: "/benchmarks", page: "benchmarks" },
            { label: "Workspace", to: "/workspace", page: "workspace" },
          ]}
        />
      </div>
    </>
  );
}

function pct(v?: number | null): string {
  return v === undefined || v === null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(1)} %`;
}

function SummaryTable({ report, selected, onSelect }: { report: NormalizedReport; selected: { group: number; seed: number } | null; onSelect: (g: number) => void }) {
  const hasRel = report.groups.some((g) => g.summary.medianFalseFeasible !== undefined);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{report.kind === "ablation" ? "Variant" : "Optimiser"}</th>
            <th>Budget</th>
            <th>Median best (kg)</th>
            <th>IQR (kg)</th>
            <th>Feasible</th>
            <th>Evaluations to target</th>
            {report.kind === "benchmark" && <th>s / run</th>}
            {hasRel && <th>False-feasible</th>}
            {hasRel && <th>False-infeasible</th>}
            {hasRel && <th>Force R²</th>}
          </tr>
        </thead>
        <tbody>
          {report.groups.map((g, i) => {
            const s = g.summary;
            const best = report.groups.reduce((b, x) => (x.summary.medianBest !== null && (b === null || x.summary.medianBest < b) ? x.summary.medianBest : b), null as number | null);
            return (
              <tr key={g.label} className={selected?.group === i ? "current" : undefined} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
                <td>
                  <i className="sw" style={{ background: COLORS[i % COLORS.length] }} /> {g.label}
                </td>
                <td>{g.budget.toLocaleString()}</td>
                <td className={s.medianBest !== null && s.medianBest === best ? "green" : undefined}>{s.medianBest?.toFixed(3) ?? "—"}</td>
                <td>{s.q1Best !== null && s.q3Best !== null ? `${s.q1Best.toFixed(3)}–${s.q3Best.toFixed(3)}` : "—"}</td>
                <td>
                  {s.feasibleRuns}/{s.runs}
                </td>
                <td>{s.medianEvaluationsToTarget !== null ? `${Math.round(s.medianEvaluationsToTarget).toLocaleString()} (${s.runsReachingTarget}/${s.runs})` : `not reached (0/${s.runs})`}</td>
                {report.kind === "benchmark" && <td>{s.meanWallTimeS?.toFixed(2) ?? "—"}</td>}
                {hasRel && <td>{pct(s.medianFalseFeasible)}</td>}
                {hasRel && <td>{pct(s.medianFalseInfeasible)}</td>}
                {hasRel && <td>{s.medianForceR2?.toFixed(3) ?? "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fine">
        Lower median mass is better. Evaluations to target: median cumulative solver evaluations at which the best feasible design first reached the target mass (runs reaching it / runs).
        False-feasible and false-infeasible: screening error rates of surrogate methods, measured on the designs each model gated.
      </p>
    </div>
  );
}

function ConvergenceChart({ report, selected }: { report: NormalizedReport; selected: { group: number; seed: number } | null }) {
  const W = 760;
  const H = 320;
  const L = 56;
  const R = 16;
  const T = 16;
  const B = 40;
  const grid = useMemo(() => evaluationGrid(report.budget, 80), [report.budget]);
  const series = useMemo(
    () => report.groups.map((g) => ({ g, agg: aggregateCurves(g.runs.map((r) => r.curve), grid).filter((p) => p.count > 0) })).filter((s) => s.agg.length > 0),
    [report, grid]
  );
  const ys = series.flatMap((s) => s.agg.flatMap((p) => [p.q1, p.q3])).concat([report.baselineMass, report.targetMass]).filter(Number.isFinite);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const sx = (x: number) => L + (x / report.budget) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const selRun = selected ? report.groups[selected.group]?.runs.find((r) => r.seed === selected.seed) : undefined;
  return (
    <section className="chart-panel">
      <div className="chart-title">
        Convergence: best feasible mass against solver evaluations <span>median line, interquartile band, per group</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Convergence curves: median best feasible mass and interquartile band against evaluations, one per optimiser">
        <g stroke="#2b3c33" strokeDasharray="3 5">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={L} x2={W - R} y1={T + f * (H - T - B)} y2={T + f * (H - T - B)} />
          ))}
        </g>
        <line x1={L} x2={W - R} y1={sy(report.baselineMass)} y2={sy(report.baselineMass)} stroke="#7c8cff" strokeDasharray="4 4" />
        <line x1={L} x2={W - R} y1={sy(report.targetMass)} y2={sy(report.targetMass)} stroke="#f2d279" strokeDasharray="2 4" />
        {series.map((s, i) => {
          const color = COLORS[report.groups.indexOf(s.g) % COLORS.length];
          const band = s.agg.map((p) => `${sx(p.evaluations).toFixed(1)},${sy(p.q3).toFixed(1)}`).concat(s.agg.slice().reverse().map((p) => `${sx(p.evaluations).toFixed(1)},${sy(p.q1).toFixed(1)}`)).join(" ");
          const line = s.agg.map((p, k) => `${k === 0 ? "M" : "L"}${sx(p.evaluations).toFixed(1)} ${sy(p.median).toFixed(1)}`).join(" ");
          return (
            <g key={i}>
              <polygon points={band} fill={color} opacity=".12" />
              <path d={line} fill="none" stroke={color} strokeWidth={selected && report.groups[selected.group] === s.g ? 2.6 : 1.6} />
            </g>
          );
        })}
        {selRun && selRun.curve.length > 0 && (
          <path d={selRun.curve.map((p, k) => `${k === 0 ? "M" : "L"}${sx(p.evaluations).toFixed(1)} ${sy(p.best).toFixed(1)}`).join(" ")} fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 3" />
        )}
        <g fill="#94a29e" fontSize="10" fontFamily="IBM Plex Sans, sans-serif">
          <text x={L - 6} y={sy(y1) + 4} textAnchor="end">
            {y1.toFixed(2)}
          </text>
          <text x={L - 6} y={sy(y0) + 4} textAnchor="end">
            {y0.toFixed(2)}
          </text>
          <text x={L - 6} y={sy(report.baselineMass) + 4} textAnchor="end" fill="#7c8cff">
            baseline
          </text>
          <text x={L - 6} y={sy(report.targetMass) + 4} textAnchor="end" fill="#f2d279">
            target
          </text>
          <text x={L} y={H - 8}>
            0
          </text>
          <text x={W - R} y={H - 8} textAnchor="end">
            {report.budget.toLocaleString()} evaluations
          </text>
          <text x={12} y={H / 2} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>
            mass / kg
          </text>
        </g>
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.g.label}>
            <i style={{ background: COLORS[report.groups.indexOf(s.g) % COLORS.length] }} />
            {s.g.label}
          </span>
        ))}
        {selRun && (
          <span>
            <i style={{ background: "#fff" }} />
            selected run (seed {selRun.seed})
          </span>
        )}
      </div>
    </section>
  );
}

function RunInspector({ report, selected, onSelect }: { report: NormalizedReport; selected: { group: number; seed: number } | null; onSelect: (s: { group: number; seed: number }) => void }) {
  const group: NormalizedGroup | undefined = selected ? report.groups[selected.group] : undefined;
  return (
    <section className="runs">
      <h2>Underlying runs</h2>
      <p>{group ? `${group.label} · parameters ${JSON.stringify(group.params)}` : "Select a row above to inspect its runs."}</p>
      {group && (
        <table className="table">
          <thead>
            <tr>
              <th>Seed</th>
              <th>Best (kg)</th>
              <th>Feasible</th>
              <th>Evaluations to target</th>
              {group.runs.some((r) => r.wallTimeMs !== undefined) && <th>Wall time</th>}
              {group.runs.some((r) => r.reliability) && <th>Precision / recall</th>}
              {group.runs.some((r) => r.reliability) && <th>False-feasible / false-infeasible</th>}
              {group.runs.some((r) => r.reliability?.forceR2 !== undefined) && <th>Force R² · coverage</th>}
            </tr>
          </thead>
          <tbody>
            {group.runs.map((r) => (
              <tr key={r.seed} className={selected?.seed === r.seed ? "current" : undefined} onClick={() => onSelect({ group: selected!.group, seed: r.seed })} style={{ cursor: "pointer" }}>
                <td>{r.seed}</td>
                <td>{r.best?.toFixed(3) ?? "—"}</td>
                <td>{r.feasible ? "yes" : "no"}</td>
                <td>{r.evaluationsToTarget !== null ? r.evaluationsToTarget.toLocaleString() : "not reached"}</td>
                {group.runs.some((x) => x.wallTimeMs !== undefined) && <td>{r.wallTimeMs !== undefined ? `${(r.wallTimeMs / 1000).toFixed(2)} s` : "—"}</td>}
                {group.runs.some((x) => x.reliability) && <td>{r.reliability ? `${pct(r.reliability.precision)} / ${pct(r.reliability.recall)}` : "—"}</td>}
                {group.runs.some((x) => x.reliability) && <td>{r.reliability ? `${pct(r.reliability.falseFeasibleRate)} / ${pct(r.reliability.falseInfeasibleRate)}` : "—"}</td>}
                {group.runs.some((x) => x.reliability?.forceR2 !== undefined) && <td>{r.reliability?.forceR2 !== undefined ? `${r.reliability.forceR2.toFixed(3)} · ${pct(r.reliability.coverage95)}` : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
