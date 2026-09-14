import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { solveTruss } from "../../engine/domains/structural/truss/fea";
import { formatMetric } from "../workspace/model";
import { TrussSvg, type ViewMode } from "../workspace/TrussSvg";
import { DEMO_BUDGET, type useHomeDemo } from "./useHomeDemo";

type Demo = ReturnType<typeof useHomeDemo>;

export function DemoWindow({ demo }: { demo: Demo }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>("utilization");
  const [showBaseline, setShowBaseline] = useState(false);
  const { compiled, problem, status, best, baseline, generations, progress } = demo;
  const design = showBaseline ? baseline : best ?? baseline;
  const model = useMemo(() => (compiled && design ? compiled.artifact(design.parameters) : null), [compiled, design]);
  const result = useMemo(() => (model ? solveTruss(model) : null), [model]);
  const objective = problem.objectives[0];
  const b = baseline?.evaluation?.objectives[objective.id];
  const o = design?.evaluation?.objectives[objective.id];
  const reduction = b && o !== undefined && Number.isFinite(o) ? (1 - o / b) * 100 : null;
  const ev = design?.evaluation;
  const util = ev ? Math.max(ev.metrics.stressUtilization ?? 0, ev.metrics.bucklingUtilization ?? 0) : null;

  const statusLabel =
    status === "running" ? "SEARCHING" : status === "done" ? "CONVERGED" : status === "error" ? "ERROR" : status === "unsupported" ? "UNSUPPORTED" : "BASELINE";

  const open = () => {
    demo.stashForWorkspace();
    navigate("/workspace");
  };

  return (
    <div id="demo">
      <div className="window">
        <div className="window-top">
          <span className="dot"></span>
          <span className="file">{problem.id}.nf · {compiled?.backendId}</span>
          <span className="status" id="run-status">
            {statusLabel}
          </span>
        </div>
        <div className="viewport">
          <span className="view-label">{showBaseline ? "BASELINE · CONVENTIONAL TRUSS" : generations.length ? `BEST OF GENERATION ${generations.length}` : "BASELINE · CONVENTIONAL TRUSS"}</span>
          <div className="view-tools" aria-label="Visualization mode">
            {(
              [
                ["utilization", "Utilisation"],
                ["force", "Force"],
                ["deformed", "Deformed"],
              ] as [ViewMode, string][]
            ).map(([m, l]) => (
              <button key={m} className={mode === m ? "active" : undefined} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {l}
              </button>
            ))}
            <button className={showBaseline ? "active" : undefined} aria-pressed={showBaseline} onClick={() => setShowBaseline((v) => !v)}>
              Baseline
            </button>
          </div>
          {model && result && (
            <TrussSvg
              model={model}
              result={result}
              mode={mode}
              safetyFactor={problem.safetyFactor}
              areaMax_m2={problem.geometry.areaMax_m2}
              appliedLoad_N={problem.loads[0]?.magnitude_N}
              compact
              ariaLabel="Live truss design from the finite-element optimization"
            />
          )}
          <div className="legend">
            {mode === "utilization" ? (
              <>
                <span>0 %</span>
                <span className="legend-bar"></span>
                <span>100 % of allowable</span>
              </>
            ) : mode === "force" ? (
              <span>blue compression · green tension · width ∝ diameter</span>
            ) : (
              <span>dashed = deformed shape (scaled)</span>
            )}
          </div>
          <span className="axis">{problem.material.name}</span>
        </div>
        <div className="metrics">
          <div className="metric">
            <span>{objective.label}</span>
            <strong id="mass">{formatMetric(objective.metric, o)}</strong>
          </div>
          <div className="metric">
            <span>vs conventional baseline</span>
            <strong className="green" id="reduction">
              {reduction === null ? "—" : `${reduction > 0.05 ? "−" : reduction < -0.05 ? "+" : ""}${Math.abs(reduction).toFixed(1)}`}
              <small>%</small>
            </strong>
          </div>
          <div className="metric">
            <span>Peak utilisation</span>
            <strong id="safety">
              {util === null ? "—" : (util * 100).toFixed(0)}
              <small> %</small>
            </strong>
          </div>
        </div>
        <div className="engine">
          <div className="engine-title">
            <b>Optimization history</b>
            <span id="generation">
              {generations.length ? `Generation ${generations.length}` : "No run yet"} · {progress.evaluations.toLocaleString()} / {DEMO_BUDGET.toLocaleString()} evaluations
            </span>
          </div>
          <MiniChart demo={demo} />
          <div className="engine-bottom">
            <span id="tested">{progress.wallTimeMs ? `${(progress.wallTimeMs / 1000).toFixed(1)} s of solver time` : "Evolutionary search · seeded · reproducible"}</span>
            <span>
              Objective: {objective.direction} {objective.label.toLowerCase()} ↓
            </span>
          </div>
        </div>
      </div>
      <p className="preview-note">
        <button className="text-link" onClick={open}>
          Open this study in the workspace →
        </button>
        <span> · Linear-static FEA · Euler buckling · L/250 deflection · preliminary analysis, not a validated design</span>
      </p>
    </div>
  );
}

function MiniChart({ demo }: { demo: Demo }) {
  const { generations, baseline, problem } = demo;
  const objective = problem.objectives[0];
  const W = 480;
  const H = 41;
  const base = baseline?.evaluation?.objectives[objective.id];
  const pts = generations.map((g) => ({ x: g.cumulativeEvaluations, y: g.bestSoFar.evaluation?.objectives[objective.id] ?? NaN })).filter((p) => Number.isFinite(p.y));
  const ys = pts.map((p) => p.y).concat(Number.isFinite(base ?? NaN) ? [base as number] : []);
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const pad = (maxY - minY) * 0.12 || 0.1;
  const sx = (x: number) => (x / DEMO_BUDGET) * W;
  const sy = (y: number) => H - 3 - ((y - (minY - pad)) / (maxY + pad - (minY - pad))) * (H - 6);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Best feasible objective so far against evaluations">
      <path d={`M0 ${H * 0.35}H${W}M0 ${H * 0.7}H${W}`} stroke="#28372d" strokeDasharray="3 5" />
      {Number.isFinite(base ?? NaN) && <line x1={0} x2={W} y1={sy(base as number)} y2={sy(base as number)} stroke="#7c8cff" strokeDasharray="4 4" />}
      {path && <path d={path} fill="none" stroke="#79f2c0" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
