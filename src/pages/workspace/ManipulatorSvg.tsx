/**
 * Renders a planar two-link manipulator evaluation as an engineering drawing.
 * Every encoding maps to data from the artifact:
 *  - link stroke width   ~ tube outer radius;
 *  - arm pose            = the worst-torque task point (inverse kinematics);
 *  - ghost arms          = every other reachable pose;
 *  - task-point colour   ~ mode: reachability, peak torque, stress utilisation
 *                          or tip deflection against its limit;
 *  - reach envelope, base and dimension come from the geometry.
 */
import { useMemo } from "react";
import type { PlanarManipulatorGeometry } from "../../engine/core/problem";
import type { ManipulatorArtifact } from "../../engine/domains/robotics/manipulator/evaluate";
import { forwardKinematics } from "../../engine/domains/robotics/manipulator/kinematics";
import { rampColor, type ViewMode } from "./TrussSvg";

export interface ManipulatorSvgProps {
  artifact: ManipulatorArtifact;
  geometry: PlanarManipulatorGeometry;
  mode: ViewMode;
  safetyFactor: number;
  yieldStrength_Pa: number;
  deflectionLimit_m: number;
  compact?: boolean;
  ariaLabel?: string;
}

const W = 600;
const H = 300;
const PAD = 40;

export function ManipulatorSvg({ artifact, geometry, mode, safetyFactor, yieldStrength_Pa, deflectionLimit_m, compact, ariaLabel }: ManipulatorSvgProps) {
  const d = artifact.design;
  const view = useMemo(() => {
    const R = Math.max(geometry.reach_m, d.L1_m + d.L2_m);
    const x0 = -0.25 * R;
    const x1 = 1.08 * R;
    const y0 = -0.7 * R;
    const y1 = 1.05 * R;
    const scale = Math.min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0));
    const ox = PAD + ((W - 2 * PAD) - (x1 - x0) * scale) / 2;
    const oy = PAD + ((H - 2 * PAD) - (y1 - y0) * scale) / 2;
    const toPx = (x: number, y: number) => ({ x: ox + (x - x0) * scale, y: H - oy - (y - y0) * scale });
    return { scale, toPx, R };
  }, [geometry.reach_m, d.L1_m, d.L2_m]);

  const poses = artifact.poses;
  const peakMax = Math.max(1e-9, ...poses.filter((p) => p.reachable).map((p) => Math.max(Math.abs(p.tau1_Nm), Math.abs(p.tau2_Nm))));
  const worst = artifact.worstPoseIndex >= 0 ? poses[artifact.worstPoseIndex] : null;
  const font = compact ? 9 : 10;
  const widthOf = (r: number) => 1.5 + 12 * Math.sqrt(r / geometry.radiusMax_m);
  const base = view.toPx(0, 0);

  const pointColor = (p: (typeof poses)[number]) => {
    if (!p.reachable) return "#f25f5c";
    if (mode === "force") return rampColor((Math.max(Math.abs(p.tau1_Nm), Math.abs(p.tau2_Nm)) / peakMax) * 1.0);
    if (mode === "utilization") return rampColor((Math.max(p.stress1_Pa, p.stress2_Pa) * safetyFactor) / yieldStrength_Pa);
    if (mode === "deformed") return rampColor(p.tipDeflection_m / deflectionLimit_m);
    return "#79f2c0";
  };
  const linkColor = (tau: number, stress: number) => {
    if (mode === "force") return rampColor(Math.abs(tau) / peakMax);
    if (mode === "utilization") return rampColor((stress * safetyFactor) / yieldStrength_Pa);
    return "#79f2c0";
  };

  const armPath = (theta1: number, theta2: number) => {
    const elbow = forwardKinematics(d.L1_m, 0, theta1, 0);
    const tip = forwardKinematics(d.L1_m, d.L2_m, theta1, theta2);
    return { e: view.toPx(elbow.x, elbow.y), t: view.toPx(tip.x, tip.y) };
  };

  return (
    <svg className="truss" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel ?? "Planar manipulator drawing"}>
      {/* Reach requirement and kinematic envelope. */}
      <circle cx={base.x} cy={base.y} r={geometry.reach_m * view.scale} fill="none" stroke="#7c8cff" strokeDasharray="4 4" opacity=".7" />
      <circle cx={base.x} cy={base.y} r={(d.L1_m + d.L2_m) * view.scale} fill="none" stroke="#2b5d49" strokeDasharray="2 4" />
      {Math.abs(d.L1_m - d.L2_m) > 1e-6 && <circle cx={base.x} cy={base.y} r={Math.abs(d.L1_m - d.L2_m) * view.scale} fill="none" stroke="#2b5d49" strokeDasharray="2 4" />}
      {/* Ground and base. */}
      <line x1={base.x - 22} x2={base.x + 22} y1={base.y + 10} y2={base.y + 10} stroke="#94a29e" />
      <path d={`M${base.x - 9} ${base.y + 10} L${base.x} ${base.y} L${base.x + 9} ${base.y + 10} Z`} fill="#1a2a22" stroke="#94a29e" />
      {/* Ghost arms at every reachable pose. */}
      {poses.map((p, i) => {
        if (!p.reachable || i === artifact.worstPoseIndex) return null;
        const { e, t } = armPath(p.theta1, p.theta2);
        return <path key={`g${i}`} d={`M${base.x} ${base.y} L${e.x} ${e.y} L${t.x} ${t.y}`} fill="none" stroke="#2b5d49" strokeWidth="1" opacity=".55" />;
      })}
      {/* Arm at the worst-torque pose. */}
      {worst && (
        (() => {
          const { e, t } = armPath(worst.theta1, worst.theta2);
          return (
            <g>
              <line x1={base.x} y1={base.y} x2={e.x} y2={e.y} stroke={linkColor(worst.tau1_Nm, worst.stress1_Pa)} strokeWidth={widthOf(d.r1_m)} strokeLinecap="round">
                <title>{`Link 1 · ${(d.L1_m * 1000).toFixed(0)} mm · radius ${(d.r1_m * 1000).toFixed(1)} mm · torque ${worst.tau1_Nm.toFixed(2)} N m`}</title>
              </line>
              <line x1={e.x} y1={e.y} x2={t.x} y2={t.y} stroke={linkColor(worst.tau2_Nm, worst.stress2_Pa)} strokeWidth={widthOf(d.r2_m)} strokeLinecap="round">
                <title>{`Link 2 · ${(d.L2_m * 1000).toFixed(0)} mm · radius ${(d.r2_m * 1000).toFixed(1)} mm · torque ${worst.tau2_Nm.toFixed(2)} N m`}</title>
              </line>
              <circle cx={base.x} cy={base.y} r={4} fill="#0c1613" stroke="#c4d6ca" />
              <circle cx={e.x} cy={e.y} r={4} fill="#0c1613" stroke="#c4d6ca" />
              {mode === "deformed" && (
                <line x1={t.x} y1={t.y} x2={t.x} y2={t.y + Math.min(40, (worst.tipDeflection_m / deflectionLimit_m) * 24)} stroke="#f2d279" strokeDasharray="3 3" />
              )}
            </g>
          );
        })()
      )}
      {/* Task points. */}
      {poses.map((p, i) => {
        const q = view.toPx(p.point.x_m, p.point.y_m);
        const title = p.reachable
          ? `Task point ${i + 1} · torque ${Math.abs(p.tau1_Nm).toFixed(2)} / ${Math.abs(p.tau2_Nm).toFixed(2)} N m · tip deflection ${(p.tipDeflection_m * 1000).toFixed(2)} mm`
          : `Task point ${i + 1} · unreachable`;
        return (
          <g key={`p${i}`}>
            <circle cx={q.x} cy={q.y} r={compact ? 3 : 4} fill={pointColor(p)} stroke={i === artifact.worstPoseIndex ? "#f2d279" : "#0c1613"} strokeWidth={i === artifact.worstPoseIndex ? 2 : 1}>
              <title>{title}</title>
            </circle>
            {!p.reachable && <path d={`M${q.x - 4} ${q.y - 4} L${q.x + 4} ${q.y + 4} M${q.x + 4} ${q.y - 4} L${q.x - 4} ${q.y + 4}`} stroke="#f25f5c" />}
          </g>
        );
      })}
      {/* Reach dimension. */}
      {(() => {
        const a = view.toPx(0, -0.62 * view.R);
        const b = view.toPx(geometry.reach_m, -0.62 * view.R);
        return (
          <g stroke="#94a29e" fill="#94a29e" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line x1={a.x} y1={a.y - 4} x2={a.x} y2={a.y + 4} />
            <line x1={b.x} y1={b.y - 4} x2={b.x} y2={b.y + 4} />
            <text x={(a.x + b.x) / 2} y={a.y - 5} textAnchor="middle" stroke="none">
              reach {geometry.reach_m.toFixed(2)} m
            </text>
          </g>
        );
      })()}
      <g fill="#94a29e" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
        <text x={W - 12} y={16} textAnchor="end">
          L1 {(d.L1_m * 1000).toFixed(0)} mm · L2 {(d.L2_m * 1000).toFixed(0)} mm · r1 {(d.r1_m * 1000).toFixed(1)} mm · r2 {(d.r2_m * 1000).toFixed(1)} mm
        </text>
        {worst && (
          <text x={W - 12} y={30} textAnchor="end">
            worst pose · tau1 {Math.abs(worst.tau1_Nm).toFixed(2)} N m · tau2 {Math.abs(worst.tau2_Nm).toFixed(2)} N m · tip {(worst.tipDeflection_m * 1000).toFixed(2)} mm
          </text>
        )}
      </g>
    </svg>
  );
}
