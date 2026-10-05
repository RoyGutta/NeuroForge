/**
 * Cross-section of a plate-fin heat sink drawn from the evaluated artifact.
 * Encodings map to data: fin and base dimensions to scale; fin colour along
 * the height follows the computed temperature profile; the base colour is
 * the base temperature against its limit; labels carry the solved numbers.
 */
import type { FinArrayArtifact } from "../../engine/domains/thermal/finArray/evaluate";
import { rampColor, type ViewMode } from "./TrussSvg";

export interface FinArraySvgProps {
  artifact: FinArrayArtifact;
  mode: ViewMode;
  temperatureLimit_C: number;
  compact?: boolean;
  ariaLabel?: string;
}

const W = 600;
const H = 300;
const PAD = 44;

/** Temperature mapped to a cool-to-hot ramp between ambient and the limit (over-limit saturates red). */
function tempColor(t: number, ambient: number, limit: number): string {
  const u = (t - ambient) / Math.max(1e-9, limit - ambient);
  return rampColor(Math.max(0, u));
}

export function FinArraySvg({ artifact, mode, temperatureLimit_C, compact, ariaLabel }: FinArraySvgProps) {
  const g = artifact.geometry;
  const d = artifact.design;
  const n = artifact.finCount;
  const totalHeight = d.baseThickness_m + d.finHeight_m;
  const scale = Math.min((W - 2 * PAD) / g.baseWidth_m, (H - 2 * PAD - 20) / Math.max(totalHeight, 0.03));
  const x0 = (W - g.baseWidth_m * scale) / 2;
  const yBase = H - PAD - 10;
  const toX = (x: number) => x0 + x * scale;
  const font = compact ? 9 : 10;
  const ok = Number.isFinite(artifact.baseTemperature_C);
  const baseFill = mode === "structure" || !ok ? "#2b5d49" : tempColor(artifact.baseTemperature_C, artifact.ambient_C, temperatureLimit_C);
  const finOffset = (g.baseWidth_m - ((n - 1) * d.finPitch_m + d.finThickness_m)) / 2;
  const segments = 12;

  return (
    <svg className="truss" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel ?? "Heat sink cross-section"}>
      {/* Base plate */}
      <rect x={toX(0)} y={yBase - d.baseThickness_m * scale} width={g.baseWidth_m * scale} height={Math.max(1.5, d.baseThickness_m * scale)} fill={baseFill} stroke="#0c1613" strokeWidth="0.5">
        <title>{ok ? `Base ${(d.baseThickness_m * 1000).toFixed(1)} mm thick · ${artifact.baseTemperature_C.toFixed(1)} C (limit ${temperatureLimit_C} C)` : "Base plate"}</title>
      </rect>
      {/* Component footprint under the base */}
      <rect x={toX(g.baseWidth_m * 0.3)} y={yBase} width={g.baseWidth_m * 0.4 * scale} height={6} fill="#f25f5c" opacity=".7">
        <title>Heat source</title>
      </rect>
      {/* Fins */}
      {Array.from({ length: n }, (_, i) => {
        const xf = toX(finOffset + i * d.finPitch_m);
        const w = Math.max(1, d.finThickness_m * scale);
        if (mode === "structure" || !ok) {
          return <rect key={i} x={xf} y={yBase - totalHeight * scale} width={w} height={d.finHeight_m * scale} fill="#79f2c0" opacity=".85" />;
        }
        return (
          <g key={i}>
            {Array.from({ length: segments }, (_, s) => {
              const p0 = artifact.finProfile[Math.round((s / segments) * (artifact.finProfile.length - 1))];
              const h = (d.finHeight_m * scale) / segments;
              const y = yBase - d.baseThickness_m * scale - (s + 1) * h;
              return <rect key={s} x={xf} y={y} width={w} height={h + 0.4} fill={tempColor(p0.temperature_C, artifact.ambient_C, temperatureLimit_C)} />;
            })}
            <title>{`Fin ${i + 1} · ${(d.finHeight_m * 1000).toFixed(1)} x ${(d.finThickness_m * 1000).toFixed(2)} mm · base ${artifact.baseTemperature_C.toFixed(1)} C, tip ${artifact.tipTemperature_C.toFixed(1)} C`}</title>
          </g>
        );
      })}
      {/* Dimensions */}
      <g stroke="#94a29e" fill="#94a29e" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
        <line x1={toX(0)} x2={toX(g.baseWidth_m)} y1={yBase + 18} y2={yBase + 18} />
        <text x={(toX(0) + toX(g.baseWidth_m)) / 2} y={yBase + 30} textAnchor="middle" stroke="none">
          base {(g.baseWidth_m * 1000).toFixed(0)} mm · {n} fins · pitch {(d.finPitch_m * 1000).toFixed(1)} mm · gap {(artifact.gap_m * 1000).toFixed(1)} mm
        </text>
        <line x1={toX(g.baseWidth_m) + 14} x2={toX(g.baseWidth_m) + 14} y1={yBase - totalHeight * scale} y2={yBase} />
        <text x={toX(g.baseWidth_m) + 18} y={yBase - (totalHeight * scale) / 2} stroke="none">
          {(d.finHeight_m * 1000).toFixed(1)} mm
        </text>
      </g>
      <g fill="#94a29e" fontSize={font} fontFamily="IBM Plex Sans, sans-serif">
        <text x={12} y={16}>
          {ok ? `base ${artifact.baseTemperature_C.toFixed(1)} C · tip ${artifact.tipTemperature_C.toFixed(1)} C · ambient ${artifact.ambient_C} C` : "no steady state"}
        </text>
        <text x={12} y={30}>
          {ok ? `h ${artifact.heatTransferCoefficient_W_m2K.toFixed(2)} W/m2K · fin efficiency ${(artifact.finEfficiency * 100).toFixed(0)} % · ${artifact.result.thermalResistance_K_W.toFixed(3)} K/W` : ""}
        </text>
      </g>
    </svg>
  );
}
