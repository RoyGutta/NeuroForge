import { useMemo, useState } from "react";
import { robustnessStudy, toleranceSweep, type RobustnessResult } from "../../engine/robustness/robustness";
import { formatMetric } from "./model";
import type { Workspace } from "./useWorkspace";

const SWEEP = [0.005, 0.01, 0.02, 0.05, 0.1];

/**
 * Robustness of the design on screen: its parameters are perturbed within a
 * tolerance and every perturbed design goes through the real evaluator.
 */
export function RobustnessPanel({ ws }: { ws: Workspace }) {
  const { compiled, displayed, problem, status } = ws;
  const [tolerancePct, setTolerancePct] = useState(2);
  const [samples, setSamples] = useState(200);
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<{ designId: string; study: RobustnessResult; sweep: ReturnType<typeof toleranceSweep> } | null>(null);
  const objective = problem.objectives[0];
  const design = displayed;
  const stale = result !== null && design !== null && result.designId !== design.id;

  const run = () => {
    if (!compiled || !design) return;
    const study = robustnessStudy(compiled, design.parameters, { samples, seed, tolerance: tolerancePct / 100 });
    const sweep = toleranceSweep(compiled, design.parameters, SWEEP, { samples: Math.min(samples, 120), seed });
    setResult({ designId: design.id, study, sweep });
  };

  const unitTol = useMemo(() => `+/- ${tolerancePct.toFixed(1)} %`, [tolerancePct]);
  const pct = (v: number) => `${(v * 100).toFixed(1)} %`;

  return (
    <section className="under" aria-label="Robustness study">
      <div>
        <h2>Robustness to tolerance</h2>
        <p>
          Every design variable of the design on screen is perturbed independently and uniformly within the tolerance, clamped to its bounds, and each perturbed design is re-evaluated by the solver.
          Nothing is predicted: the feasible fraction, objective spread and per-constraint violation probabilities are counted from those evaluations.
        </p>
        <div className="row wrap">
          <label className="check">
            tolerance %
            <input type="number" min={0} max={20} step={0.5} value={tolerancePct} onChange={(e) => setTolerancePct(Number(e.target.value))} style={{ width: 60 }} aria-label="Relative tolerance, percent" />
          </label>
          <label className="check">
            samples
            <input type="number" min={20} max={2000} step={20} value={samples} onChange={(e) => setSamples(Number(e.target.value))} style={{ width: 70 }} aria-label="Perturbed designs to evaluate" />
          </label>
          <label className="check">
            seed
            <input type="number" min={0} step={1} value={seed} onChange={(e) => setSeed(Number(e.target.value))} style={{ width: 60 }} aria-label="Perturbation seed" />
          </label>
          <button className="primary" onClick={run} disabled={!compiled || !design || status === "running"}>
            Run robustness study
          </button>
        </div>
        {!design && <p className="fine">No design on screen yet.</p>}
        {stale && <p className="warn">The design on screen changed since this study ran; run it again for the current design.</p>}
        {result && (
          <>
            <p className="fine">
              Design {result.designId} · {result.study.samples} perturbed designs · {result.study.perturbedVariables} variables · {unitTol} · seed {result.study.seed}
            </p>
            <div className="lab-grid">
              <div>
                <span>feasible fraction</span>
                <b className={result.study.feasibleFraction >= 0.95 ? "green" : result.study.feasibleFraction < 0.5 ? "bad" : undefined}>{pct(result.study.feasibleFraction)}</b>
              </div>
              <div>
                <span>{objective.label} · nominal</span>
                <b>{formatMetric(objective.metric, result.study.objective.nominal)}</b>
              </div>
              <div>
                <span>median · 95th percentile</span>
                <b>
                  {formatMetric(objective.metric, result.study.objective.median)} · {formatMetric(objective.metric, result.study.objective.q95)}
                </b>
              </div>
              <div>
                <span>worst sampled</span>
                <b>{formatMetric(objective.metric, result.study.objective.worst)}</b>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Constraint</th>
                  <th>Nominal utilisation</th>
                  <th>Max sampled</th>
                  <th>Violation probability</th>
                </tr>
              </thead>
              <tbody>
                {result.study.constraints.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{pct(c.nominalUtilization)}</td>
                    <td>{Number.isFinite(c.maxUtilization) ? pct(c.maxUtilization) : "failed solve"}</td>
                    <td className={c.violationProbability > 0.05 ? "bad" : undefined}>{pct(c.violationProbability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <div>
        <h2>Feasibility against tolerance</h2>
        <p>{result ? `Feasible fraction at five tolerances, ${Math.min(samples, 120)} samples each, same seed. A design sized to its limits loses feasibility quickly; slack buys tolerance.` : "Run the study to see how fast feasibility falls as the tolerance grows."}</p>
        {result && (
          <>
            <div className="robust-bars" role="img" aria-label="Feasible fraction at each tolerance">
              {result.sweep.map((p) => (
                <div key={p.tolerance} style={{ height: `${Math.max(2, p.feasibleFraction * 100)}%`, background: p.feasibleFraction >= 0.95 ? "#79f2c0" : p.feasibleFraction >= 0.5 ? "#dfa75b" : "#f25f5c" }}>
                  <span>{pct(p.feasibleFraction)}</span>
                  <small>{(p.tolerance * 100).toFixed(1)} %</small>
                </div>
              ))}
            </div>
            <table className="table" style={{ marginTop: 22 }}>
              <tbody>
                {result.sweep.map((p) => (
                  <tr key={p.tolerance}>
                    <td>+/- {(p.tolerance * 100).toFixed(1)} %</td>
                    <td>{pct(p.feasibleFraction)} feasible</td>
                    <td>
                      median {formatMetric(objective.metric, p.objectiveMedian)} · 95th {formatMetric(objective.metric, p.objectiveQ95)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
