import { pointLoadMagnitude_N } from "../../engine/core/problem";
import { useMemo } from "react";
import type { ManipulatorArtifact } from "../../engine/domains/robotics/manipulator/evaluate";
import type { FinArrayArtifact } from "../../engine/domains/thermal/finArray/evaluate";
import { FinArraySvg } from "./FinArraySvg";
import { trussGeometry } from "../../engine/domains/structural/truss/bridgeSpace";
import { solveTruss } from "../../engine/domains/structural/truss/fea";
import type { TrussModel } from "../../engine/domains/structural/truss/model";
import { ManipulatorSvg } from "./ManipulatorSvg";
import { TrussSvg, type ViewMode } from "./TrussSvg";
import { formatMetric } from "./model";
import type { Workspace } from "./useWorkspace";

const TRUSS_MODES: [ViewMode, string][] = [
  ["structure", "Structure"],
  ["force", "Axial force"],
  ["utilization", "Utilisation"],
  ["deformed", "Deformed"],
];
const ARM_MODES: [ViewMode, string][] = [
  ["structure", "Arm and task points"],
  ["force", "Joint torque"],
  ["utilization", "Stress utilisation"],
  ["deformed", "Tip deflection"],
];
const TRUSS_METRICS: [string, string][] = [
  ["Peak stress", "maxStress_Pa"],
  ["Buckling util.", "bucklingUtilization"],
  ["Max deflection", "maxDisplacement_m"],
];
const HEAT_MODES: [ViewMode, string][] = [
  ["structure", "Cross-section"],
  ["utilization", "Temperature"],
];
const HEAT_METRICS: [string, string][] = [
  ["Base temperature", "baseTemperature_C"],
  ["Thermal resistance", "thermalResistance_K_W"],
  ["Fin efficiency", "finEfficiency"],
];
const ARM_METRICS: [string, string][] = [
  ["Stress util.", "stressUtilization"],
  ["Tip deflection", "maxTipDeflection_m"],
  ["Link mass", "mass_kg"],
];

export function Viewport({ ws }: { ws: Workspace }) {
  const { compiled, displayed, baseline, mode, setMode, generations, scrub, setScrub, showing, setShowing, problem, status } = ws;
  const design = displayed;
  const isArm = problem.domain === "robotics";
  const isHeat = problem.domain === "thermal";
  const MODES = isArm ? ARM_MODES : isHeat ? HEAT_MODES : TRUSS_MODES;
  const METRICS = isArm ? ARM_METRICS : isHeat ? HEAT_METRICS : TRUSS_METRICS;

  const artifact = useMemo(() => (compiled && design ? compiled.artifact(design.parameters) : null), [compiled, design]);
  const model = !isArm && !isHeat && artifact ? (artifact as TrussModel) : null;
  const arm = isArm && artifact ? (artifact as ManipulatorArtifact) : null;
  const sink = isHeat && artifact ? (artifact as FinArrayArtifact) : null;
  const heatMode: ViewMode = mode === "structure" ? "structure" : "utilization";
  const result = useMemo(() => (model ? solveTruss(model) : null), [model]);
  const ev = design?.evaluation;
  const objective = problem.objectives[0];
  const baselineObj = baseline?.evaluation?.objectives[objective.id];
  const currentObj = ev?.objectives[objective.id];
  const improvement =
    baselineObj !== undefined && currentObj !== undefined && Number.isFinite(currentObj) && baselineObj !== 0
      ? (1 - currentObj / baselineObj) * 100
      : null;

  const baselineLabel = `BASELINE · ${(compiled?.baseline.label ?? "baseline").toLowerCase()}`;
  const label =
    showing === "selected"
      ? "PARETO FRONT · selected design"
      : showing === "baseline"
      ? baselineLabel
      : scrub !== null && generations[scrub]
        ? `GENERATION ${generations[scrub].generation + 1} · best so far`
        : generations.length > 0
          ? `BEST DESIGN · generation ${generations.length}`
          : baselineLabel;

  return (
    <section className="center" aria-label="Design visualization and results">
      <div className="tools">
        <div className="tabs" aria-label="Display mode">
          {MODES.map(([m, l]) => (
            <button key={m} className={mode === m ? "active" : undefined} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {l}
            </button>
          ))}
        </div>
        <div className="tabs" aria-label="Design shown">
          <button className={showing === "best" || showing === "selected" ? "active" : undefined} aria-pressed={showing === "best" || showing === "selected"} onClick={() => setShowing("best")}>
            Search result
          </button>
          <button className={showing === "baseline" ? "active" : undefined} aria-pressed={showing === "baseline"} onClick={() => setShowing("baseline")}>
            Baseline
          </button>
        </div>
      </div>

      <div className="viewport">
        <div className="viewport-label">
          {label}
          <b>{design ? `${design.id} · ${design.operator}` : "no design"}</b>
        </div>
        {model && result && compiled && (
          <TrussSvg
            model={model}
            result={result}
            mode={mode}
            safetyFactor={problem.safetyFactor}
            areaMax_m2={trussGeometry(problem).areaMax_m2}
            appliedLoad_N={pointLoadMagnitude_N(problem)}
            ariaLabel={`Truss elevation, ${label.toLowerCase()}`}
          />
        )}
        {arm && problem.geometry.kind === "planar-manipulator" && (
          <ManipulatorSvg
            artifact={arm}
            geometry={problem.geometry}
            mode={mode}
            safetyFactor={problem.safetyFactor}
            yieldStrength_Pa={problem.material.yieldStrength_Pa}
            deflectionLimit_m={problem.constraints.find((c) => c.id === "deflection")?.limit ?? Infinity}
            ariaLabel={`Manipulator drawing, ${label.toLowerCase()}`}
          />
        )}
        {sink && (
          <FinArraySvg artifact={sink} mode={heatMode} temperatureLimit_C={problem.constraints.find((c) => c.id === "temperature")?.limit ?? Infinity} ariaLabel={`Heat sink cross-section, ${label.toLowerCase()}`} />
        )}
        <div className="legend">
          {isHeat && heatMode === "structure" && <span>{problem.material.name} · fins and base to scale · red bar = heat source</span>}
          {isHeat && heatMode === "utilization" && (
            <>
              <span>ambient</span>
              <i className="ramp" />
              <span>temperature limit · fins coloured by the solved temperature profile</span>
            </>
          )}
          {isArm && mode === "structure" && <span>{problem.material.name} · width ∝ tube radius · arm drawn at the worst-torque task point · ghosts at every other pose</span>}
          {isArm && mode === "force" && (
            <>
              <span>0</span>
              <i className="ramp" />
              <span>peak joint torque · points and links coloured by |torque|</span>
            </>
          )}
          {isArm && mode === "utilization" && (
            <>
              <span>0 %</span>
              <i className="ramp" />
              <span>100 % of allowable bending stress</span>
            </>
          )}
          {isArm && mode === "deformed" && (
            <>
              <span>0</span>
              <i className="ramp" />
              <span>tip deflection / limit · dashed tick at the worst pose</span>
            </>
          )}
          {!isArm && !isHeat && mode === "force" && (
            <>
              <i className="sw sw-comp" /> <span>compression</span>
              <i className="sw sw-tens" /> <span>tension</span>
              <span>· width ∝ bar diameter</span>
            </>
          )}
          {!isArm && !isHeat && mode === "utilization" && (
            <>
              <span>0 %</span>
              <i className="ramp" />
              <span>100 % of allowable (stress or buckling)</span>
            </>
          )}
          {!isArm && !isHeat && mode === "deformed" && <span>dashed = deformed shape, scale factor shown top-right</span>}
          {!isArm && !isHeat && mode === "structure" && <span>{problem.material.name} · width ∝ bar diameter · real FEA geometry</span>}
        </div>
        <div className="view-note">{ev ? (ev.feasible ? "feasible" : `infeasible · violation ${ev.totalViolation.toFixed(3)}`) : ""}</div>
      </div>

      <div className="metrics">
        <div className="metric">
          <span>{objective.label}</span>
          <strong>{formatMetric(objective.metric, currentObj)}</strong>
        </div>
        <div className="metric">
          <span>vs baseline</span>
          <strong className={improvement !== null && improvement > 0 ? "green" : undefined}>
            {improvement === null ? "—" : `${improvement > 0.05 ? "−" : improvement < -0.05 ? "+" : ""}${Math.abs(improvement).toFixed(1)} %`}
          </strong>
        </div>
        {METRICS.map(([l, id]) => (
          <div className="metric" key={id}>
            <span>{l}</span>
            <strong>{formatMetric(id, ev?.metrics[id])}</strong>
          </div>
        ))}
      </div>

      <HistoryChart ws={ws} />
      {generations.length > 1 && (
        <div className="scrub">
          <label htmlFor="scrub">
            Generation <b>{(scrub ?? generations.length - 1) + 1}</b> / {generations.length}
          </label>
          <input
            id="scrub"
            type="range"
            min={0}
            max={generations.length - 1}
            value={scrub ?? generations.length - 1}
            onChange={(e) => {
              setShowing("best");
              const v = Number(e.target.value);
              setScrub(v === generations.length - 1 ? null : v);
            }}
            disabled={status === "running"}
          />
        </div>
      )}
    </section>
  );
}

function HistoryChart({ ws }: { ws: Workspace }) {
  const { generations, baseline, problem, scrub } = ws;
  const objective = problem.objectives[0];
  const W = 500;
  const H = 96;
  const pts = generations.map((g) => ({ x: g.cumulativeEvaluations, y: g.bestSoFar.evaluation?.objectives[objective.id] ?? NaN, feasible: g.bestSoFar.evaluation?.feasible ?? false }));
  const base = baseline?.evaluation?.objectives[objective.id];
  const finite = pts.filter((p) => Number.isFinite(p.y));
  const ys = finite.map((p) => p.y).concat(Number.isFinite(base ?? NaN) ? [base as number] : []);
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const padY = (maxY - minY) * 0.15 || 0.1;
  const y0 = minY - padY;
  const y1 = maxY + padY;
  const maxX = pts.length ? pts[pts.length - 1].x : 1;
  const sx = (x: number) => (x / maxX) * (W - 8) + 4;
  const sy = (y: number) => H - 6 - ((y - y0) / (y1 - y0)) * (H - 12);
  const path = finite.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
  const marker = scrub !== null && pts[scrub] ? pts[scrub] : null;

  return (
    <div className="history">
      <div className="history-head">
        Optimization history
        <span>best feasible {objective.label.toLowerCase()} vs evaluations</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Best objective so far against cumulative evaluations">
        <path d={`M0 ${H * 0.25}H${W}M0 ${H * 0.5}H${W}M0 ${H * 0.75}H${W}`} stroke="#283b2f" strokeDasharray="3 5" />
        {Number.isFinite(base ?? NaN) && <line x1={0} x2={W} y1={sy(base as number)} y2={sy(base as number)} stroke="#7c8cff" strokeDasharray="4 4" />}
        {path && <path d={path} fill="none" stroke="#79f2c0" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
        {marker && Number.isFinite(marker.y) && <circle cx={sx(marker.x)} cy={sy(marker.y)} r="4" fill="#f2d279" />}
      </svg>
      <div className="chart-labels">
        <span>0 evaluations</span>
        <span>
          <i className="sw sw-base" /> baseline {formatMetric(objective.metric, base)}
        </span>
        <span>{maxX.toLocaleString()} evaluations</span>
      </div>
    </div>
  );
}
