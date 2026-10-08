import { pointLoadMagnitude_N } from "../../engine/core/problem";
import { lazy, Suspense, useMemo, useState } from "react";
import { solveTruss3d } from "../../engine/domains/structural/truss3d/fea3d";
import type { Truss3dModel } from "../../engine/domains/structural/truss3d/model";
import { deformationScale } from "../workspace/truss3d/truss3dView";
const Truss3dViewport = lazy(() => import("../workspace/truss3d/Truss3dViewport").then((m) => ({ default: m.Truss3dViewport })));
import { useNavigate } from "react-router-dom";
import type { ManipulatorArtifact } from "../../engine/domains/robotics/manipulator/evaluate";
import type { FinArrayArtifact } from "../../engine/domains/thermal/finArray/evaluate";
import { FinArraySvg } from "../workspace/FinArraySvg";
import { trussGeometry } from "../../engine/domains/structural/truss/bridgeSpace";
import { solveTruss } from "../../engine/domains/structural/truss/fea";
import type { TrussModel } from "../../engine/domains/structural/truss/model";
import { ManipulatorSvg } from "../workspace/ManipulatorSvg";
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
  const isArm = problem.domain === "robotics";
  const isHeat = problem.domain === "thermal";
  const is3d = problem.domain === "structural3d";
  const artifact = useMemo(() => (compiled && design ? compiled.artifact(design.parameters) : null), [compiled, design]);
  const model = !isArm && !isHeat && !is3d && artifact ? (artifact as TrussModel) : null;
  const model3d = is3d && artifact ? (artifact as Truss3dModel) : null;
  const result3d = useMemo(() => (model3d ? solveTruss3d(model3d) : null), [model3d]);
  const ok3d = model3d && result3d && result3d.status === "ok" ? { model: model3d, result: result3d } : null;
  const arm = isArm && artifact ? (artifact as ManipulatorArtifact) : null;
  const sink = isHeat && artifact ? (artifact as FinArrayArtifact) : null;
  const result = useMemo(() => (model ? solveTruss(model) : null), [model]);
  const objective = problem.objectives[0];
  const b = baseline?.evaluation?.objectives[objective.id];
  const o = design?.evaluation?.objectives[objective.id];
  const reduction = b && o !== undefined && Number.isFinite(o) ? (1 - o / b) * 100 : null;
  const ev = design?.evaluation;
  const deflLimit = problem.constraints.find((c) => c.id === "deflection")?.limit;
  const deflUtil = ev && deflLimit ? (ev.metrics.maxTipDeflection_m ?? ev.metrics.maxDisplacement_m ?? 0) / deflLimit : 0;
  const util = ev ? Math.max(ev.metrics.stressUtilization ?? 0, ev.metrics.bucklingUtilization ?? 0, deflUtil) : null;

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
          <span className="view-label">{showBaseline || !generations.length ? `BASELINE · ${(compiled?.baseline.label ?? "").toUpperCase()}` : `BEST OF GENERATION ${generations.length}`}</span>
          <div className="view-tools" aria-label="Visualization mode">
            {(
              [
                ["utilization", "Utilisation"],
                ["force", isArm ? "Torque" : "Force"],
                ["deformed", isArm ? "Deflection" : "Deformed"],
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
              areaMax_m2={trussGeometry(problem).areaMax_m2}
              appliedLoad_N={pointLoadMagnitude_N(problem)}
              compact
              ariaLabel="Live truss design from the finite-element optimization"
            />
          )}
          {ok3d && (
            <Suspense fallback={<span className="view-label">loading 3D viewport</span>}>
              <Truss3dViewport model={ok3d.model} result={ok3d.result} mode={mode} safetyFactor={problem.safetyFactor} areaMax_m2={problem.geometry.kind === "space-truss" ? problem.geometry.areaMax_m2 : 1e-3} deformScale={deformationScale(ok3d.model, ok3d.result, 0.06)} showAxes={false} showGrid={false} selected={null} onPick={() => undefined} fitToken={0} ariaLabel="Live space truss design from the 3D finite-element optimization" />
            </Suspense>
          )}
          {sink && <FinArraySvg artifact={sink} mode={mode === "utilization" ? "utilization" : "structure"} temperatureLimit_C={problem.constraints.find((c) => c.id === "temperature")?.limit ?? Infinity} compact ariaLabel="Live heat-sink design from the fin-theory optimization" />}
          {arm && problem.geometry.kind === "planar-manipulator" && (
            <ManipulatorSvg
              artifact={arm}
              geometry={problem.geometry}
              mode={mode}
              safetyFactor={problem.safetyFactor}
              yieldStrength_Pa={problem.material.yieldStrength_Pa}
              deflectionLimit_m={problem.constraints.find((c) => c.id === "deflection")?.limit ?? Infinity}
              compact
              ariaLabel="Live manipulator design from the static optimization"
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
              <span>{isArm ? "colour ∝ joint torque · width ∝ tube radius" : "blue compression · green tension · width ∝ diameter"}</span>
            ) : (
              <span>{isArm ? "colour = tip deflection / limit" : "dashed = deformed shape (scaled)"}</span>
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
        <span>{is3d ? " · 3D linear-static FEA · Euler buckling · L/250 deflection · deformation exaggerated in the deformed view · preliminary analysis, not a validated design" : isHeat ? " · Fin theory · natural-convection correlation · preliminary analysis, not a validated design" : isArm ? " · Static kinematics · gravity torques · tube bending · preliminary analysis, not a validated design" : " · Linear-static FEA · Euler buckling · L/250 deflection · preliminary analysis, not a validated design"}</span>
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
