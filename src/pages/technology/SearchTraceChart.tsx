import type { GenerationSummary } from "../../engine/experiments/experiment";

/** Real optimisation trace: per-generation best (dots) and best-so-far (line). */
export function SearchTraceChart({ generations, baseline, budget }: { generations: GenerationSummary[]; baseline: number; budget: number }) {
  const W = 520;
  const H = 240;
  const L = 48;
  const R = 500;
  const T = 25;
  const B = 198;
  const pts = generations
    .map((g) => ({ x: g.cumulativeEvaluations, gen: g.bestObjective, best: g.bestSoFar.evaluation?.objectives.mass ?? NaN }))
    .filter((p) => Number.isFinite(p.best));
  const ys = pts.flatMap((p) => [p.best, p.gen ?? NaN]).filter(Number.isFinite).concat([baseline]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (x: number) => L + (x / budget) * (R - L);
  const sy = (y: number) => B - ((y - minY) / (maxY - minY || 1)) * (B - T - 10);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)} ${sy(p.best).toFixed(1)}`).join(" ");
  const ticks = [maxY, (maxY + minY) / 2, minY];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Measured search trace: best feasible mass per generation and best so far, against evaluations">
      <g stroke="#2b3c33" strokeDasharray="3 5">
        {ticks.map((t, i) => (
          <path key={i} d={`M${L} ${sy(t)}H${R}`} />
        ))}
      </g>
      <path d={`M${L} ${T}V${B}H${R}`} fill="none" stroke="#496052" />
      <g fill="#94a29e" fontFamily="IBM Plex Sans,sans-serif" fontSize="10">
        <text x={L} y="15">
          Mass / kg
        </text>
        {ticks.map((t, i) => (
          <text key={i} x={L - 6} y={sy(t) + 3} textAnchor="end">
            {t.toFixed(2)}
          </text>
        ))}
        <text x={L} y="217">
          0
        </text>
        <text x={(L + R) / 2} y="217" textAnchor="middle">
          {(budget / 2).toLocaleString()}
        </text>
        <text x={R} y="217" textAnchor="end">
          {budget.toLocaleString()}
        </text>
        <text x={R} y="236" textAnchor="end">
          FEA evaluations
        </text>
      </g>
      <line x1={L} x2={R} y1={sy(baseline)} y2={sy(baseline)} stroke="#7c8cff" strokeDasharray="4 4" />
      <g fill="#7c8cff" opacity=".65">
        {pts.map((p, i) => (p.gen !== null && Number.isFinite(p.gen) && i % 3 === 0 ? <circle key={i} cx={sx(p.x)} cy={sy(p.gen)} r="2.5" /> : null))}
      </g>
      {line && <path d={line} fill="none" stroke="#79f2c0" strokeWidth="2" />}
      {pts.length === 0 && (
        <text x={(L + R) / 2} y={(T + B) / 2} textAnchor="middle" fill="#94a29e" fontSize="11" fontFamily="IBM Plex Sans,sans-serif">
          running {budget.toLocaleString()} evaluations…
        </text>
      )}
    </svg>
  );
}
