/**
 * Renders a real TrussModel and its FEA solution as an engineering elevation
 * drawing. Every visual encoding maps to data:
 *  - member stroke width  ~ bar diameter (sqrt of area);
 *  - colour               ~ axial force (tension/compression), utilisation, or plain;
 *  - deformed overlay     = displacements scaled by a stated factor;
 *  - supports, load arrow and span dimension come from the model.
 */
import { useMemo } from "react";
import type { TrussResult } from "../../engine/domains/structural/truss/fea";
import { eulerCriticalLoad_N } from "../../engine/domains/structural/truss/metrics";
import type { TrussModel } from "../../engine/domains/structural/truss/model";

export type ViewMode = "structure" | "force" | "utilization" | "deformed";

export interface TrussSvgProps {
  model: TrussModel;
  result: TrussResult;
  mode: ViewMode;
  safetyFactor: number;
  areaMax_m2: number;
  /** Render a fainter, smaller version (home page preview). */
  compact?: boolean;
  /** Applied external load to label (defaults to the largest nodal load, which includes lumped self-weight). */
  appliedLoad_N?: number;
  ariaLabel?: string;
}

const W = 600;
const H = 300;
const PAD = 54;

export function TrussSvg({ model, result, mode, safetyFactor, areaMax_m2, compact, ariaLabel, appliedLoad_N }: TrussSvgProps) {
  const view = useMemo(() => layout(model), [model]);
  const ok = result.status === "ok";

  const perMember = useMemo(() => {
    return model.members.map((m, i) => {
      const width = 1.2 + 9 * Math.sqrt(m.area_m2 / areaMax_m2);
      if (!ok) return { width, color: "#7d8f86", title: "" };
      const N = result.memberForces_N[i];
      const stress = result.memberStresses_Pa[i];
      const L = result.memberLengths_m[i];
      const su = (Math.abs(stress) * safetyFactor) / model.material.yieldStrength_Pa;
      const bu = N < 0 ? (-N * safetyFactor) / eulerCriticalLoad_N(model.material.youngsModulus_Pa, m.area_m2, L) : 0;
      const util = Math.max(su, bu);
      let color = "#79f2c0";
      if (mode === "force") {
        const maxN = Math.max(1e-9, ...Array.from(result.memberForces_N).map((v) => Math.abs(v)));
        const t = Math.min(1, Math.abs(N) / maxN);
        color = N >= 0 ? mix("#2b5d49", "#79f2c0", t) : mix("#2e3560", "#7c8cff", t);
      } else if (mode === "utilization") {
        color = utilColor(util);
      }
      const title = `${N >= 0 ? "Tension" : "Compression"} ${Math.abs(N).toFixed(1)} N · stress ${(Math.abs(stress) / 1e6).toFixed(2)} MPa · utilisation ${(util * 100).toFixed(0)}%`;
      return { width, color, title };
    });
  }, [model, result, mode, safetyFactor, areaMax_m2, ok]);

  const deform = useMemo(() => {
    if (!ok || mode !== "deformed") return null;
    const maxU = result.maxDisplacement_m;
    if (!(maxU > 0)) return null;
    const target = view.spanPx * 0.06;
    const scalePx = target / (maxU * view.scale);
    const pts = model.nodes.map((n, i) => {
      const ux = result.displacements_m[2 * i] * scalePx;
      const uy = result.displacements_m[2 * i + 1] * scalePx;
      return view.toPx(n.x + ux, n.y + uy);
    });
    return { pts, factor: scalePx };
  }, [ok, mode, result, model, view]);

  const midLoad = model.loads.reduce((best, l) => (l.fy_N < best.fy_N ? l : best), model.loads[0]);
  const loadNode = midLoad ? view.toPx(model.nodes[midLoad.node].x, model.nodes[midLoad.node].y) : null;
  const font = compact ? 9 : 10;

  return (
    <svg
      className="truss"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel ?? "Truss elevation drawing"}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="nf-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#243530" strokeWidth=".6" />
        </pattern>
        <marker id="nf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0L10 5 0 10z" fill="#e6efe9" />
        </marker>
      </defs>
      <rect width={W} height={H} fill="url(#nf-grid)" opacity=".55" />
      {/* ground line */}
      <line x1={PAD - 20} x2={W - PAD + 20} y1={view.groundY + 14} y2={view.groundY + 14} stroke="#33453c" />

      {/* members */}
      <g fill="none" strokeLinecap="round">
        {model.members.map((m, i) => {
          const a = view.toPx(model.nodes[m.i].x, model.nodes[m.i].y);
          const b = view.toPx(model.nodes[m.j].x, model.nodes[m.j].y);
          const s = perMember[i];
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={s.color}
              strokeWidth={s.width}
              opacity={deform ? 0.28 : 0.95}
            >
              {s.title && <title>{s.title}</title>}
            </line>
          );
        })}
      </g>

      {/* deformed overlay */}
      {deform && (
        <g fill="none" stroke="#f2d279" strokeWidth="1.6" strokeDasharray="5 4">
          {model.members.map((m, i) => (
            <line key={i} x1={deform.pts[m.i].x} y1={deform.pts[m.i].y} x2={deform.pts[m.j].x} y2={deform.pts[m.j].y} />
          ))}
        </g>
      )}

      {/* nodes */}
      <g fill="#dff7ea">
        {model.nodes.map((n, i) => {
          const p = view.toPx(n.x, n.y);
          return <circle key={i} cx={p.x} cy={p.y} r={compact ? 2.2 : 2.8} />;
        })}
      </g>

      {/* supports */}
      {model.supports.map((s, k) => {
        const p = view.toPx(model.nodes[s.node].x, model.nodes[s.node].y);
        return (
          <g key={k} stroke="#9fb5a8" fill="#14251d" strokeWidth="1.2">
            <path d={`M${p.x} ${p.y + 3} l-9 14 h18 z`} />
            {!s.fixX && <circle cx={p.x} cy={p.y + 20} r="3" />}
          </g>
        );
      })}

      {/* load arrow */}
      {loadNode && midLoad && (
        <g>
          <line
            x1={loadNode.x}
            y1={loadNode.y - 58}
            x2={loadNode.x}
            y2={loadNode.y - 8}
            stroke="#e6efe9"
            strokeWidth="1.4"
            markerEnd="url(#nf-arrow)"
          />
          <text x={loadNode.x + 8} y={loadNode.y - 44} fill="#dfe9e3" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
            {formatForce(appliedLoad_N ?? -midLoad.fy_N)}
          </text>
        </g>
      )}

      {/* span dimension */}
      <g stroke="#6f8a7c" fill="#9fb5a8" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
        <line x1={view.x0} x2={view.x1} y1={view.groundY + 34} y2={view.groundY + 34} />
        <line x1={view.x0} x2={view.x0} y1={view.groundY + 28} y2={view.groundY + 40} />
        <line x1={view.x1} x2={view.x1} y1={view.groundY + 28} y2={view.groundY + 40} />
        <text x={(view.x0 + view.x1) / 2} y={view.groundY + 48} textAnchor="middle" stroke="none">
          {view.span.toFixed(2)} m span
        </text>
      </g>

      {deform && (
        <text x={W - PAD} y={22} textAnchor="end" fill="#f2d279" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
          deformation x{deform.factor.toFixed(0)}
        </text>
      )}
      {!ok && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#f28b79" fontSize={12} fontFamily="IBM Plex Sans, sans-serif">
          {result.status === "unstable" ? "Unstable structure (mechanism)" : "Invalid geometry"}
        </text>
      )}
    </svg>
  );
}

function layout(model: TrussModel) {
  const xs = model.nodes.map((n) => n.x);
  const ys = model.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = maxX - minX || 1;
  const height = Math.max(maxY - minY, span * 0.15);
  const scale = Math.min((W - 2 * PAD) / span, (H - 2 * PAD - 30) / height);
  const x0 = (W - span * scale) / 2;
  const groundY = H - PAD - 18;
  const toPx = (x: number, y: number) => ({ x: x0 + (x - minX) * scale, y: groundY - (y - minY) * scale });
  return { toPx, scale, span, spanPx: span * scale, x0, x1: x0 + span * scale, groundY };
}

function formatForce(N: number): string {
  return Math.abs(N) >= 1000 ? `${(N / 1000).toFixed(2)} kN` : `${N.toFixed(0)} N`;
}

function utilColor(u: number): string {
  if (u <= 0.5) return mix("#79f2c0", "#c0e584", u / 0.5);
  if (u <= 1) return mix("#c0e584", "#dfa75b", (u - 0.5) / 0.5);
  return mix("#dfa75b", "#f25f5c", Math.min(1, (u - 1) / 0.5));
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function hex(h: string): number[] {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
