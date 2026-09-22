import { useMemo, useState } from "react";
import { startMemberStudy } from "../../app/experimentClient";
import { solveTruss } from "../../engine/domains/structural/truss/fea";
import type { MemberStudy } from "../../engine/ml/study";
import { listMultiOutputSurrogates } from "../../engine/ml/models";
import { rampColor, TrussSvg } from "./TrussSvg";
import type { Workspace } from "./useWorkspace";

/**
 * Member-level learning: forces predicted per member, exact physics after
 * prediction, and the reliability of the resulting feasibility screen on the
 * held-out split. Every number is measured against the solver.
 */
export function MemberLearningPanel({ ws }: { ws: Workspace }) {
  const { record, compiled, latestBest, problem, status } = ws;
  const [model, setModel] = useState("ridge");
  const [riskK, setRiskK] = useState(2);
  const [study, setStudy] = useState<MemberStudy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<"error" | "uncertainty">("error");

  const run = async () => {
    if (!record || busy) return;
    setBusy(true);
    setError(null);
    try {
      setStudy(await startMemberStudy(record.config, { memberModel: model, riskK, splitSeed: record.config.seed, maxTrainingPoints: 2000 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const design = latestBest;
  const trussModel = useMemo(() => (compiled && design ? compiled.artifact(design.parameters) : null), [compiled, design]);
  const result = useMemo(() => (trussModel ? solveTruss(trussModel) : null), [trussModel]);
  const colors = useMemo(() => {
    if (!study) return undefined;
    const values = map === "error" ? study.forces.perMemberMae : study.perMemberMeanStd;
    const max = Math.max(...values, 1e-9);
    return values.map((v) => rampColor((v / max) * 1.4));
  }, [study, map]);

  const pct = (v: number) => `${(v * 100).toFixed(1)} %`;
  const f = study?.feasibility;
  const fc = study?.feasibilityConservative;

  return (
    <section className="under member-learning" aria-label="Member-level surrogate">
      <div>
        <h2>Learn member forces, apply exact physics</h2>
        <p>
          Instead of regressing the worst-member utilisation directly, a multi-output surrogate predicts every member's axial force with an uncertainty; stress
          and Euler buckling are then computed exactly from those forces. The screen's reliability is measured on the held-out split against the solver.
        </p>
        <div className="row wrap">
          <label className="check">
            model
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} aria-label="Member surrogate model">
              {listMultiOutputSurrogates().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            risk k
            <input type="number" min={0} max={5} step={0.5} value={riskK} onChange={(e) => setRiskK(Number(e.target.value))} disabled={busy} style={{ width: 70 }} aria-label="Risk multiplier k" />
          </label>
          <button className="primary" onClick={run} disabled={!record || busy || status === "running"}>
            {busy ? "Training…" : "Train member surrogate"}
          </button>
        </div>
        {error && (
          <p className="warn" role="alert">
            {error}
          </p>
        )}
        {study && f && fc && (
          <>
            <p className="fine">
              {study.dataset.size.toLocaleString()} designs · {study.dataset.members} members · train {study.split.train} / test {study.split.test} · {study.memberModel} · fit {study.fitMs < 1000 ? `${study.fitMs.toFixed(0)} ms` : `${(study.fitMs / 1000).toFixed(1)} s`}
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Surrogate reliability (test split)</th>
                  <th>Nominal (mean)</th>
                  <th>Conservative (mu + {study.riskK} sigma)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Feasibility precision</td>
                  <td>{pct(f.precision)}</td>
                  <td>{pct(fc.precision)}</td>
                </tr>
                <tr>
                  <td>Feasibility recall</td>
                  <td>{pct(f.recall)}</td>
                  <td>{pct(fc.recall)}</td>
                </tr>
                <tr>
                  <td>False-feasible rate</td>
                  <td className={f.falseFeasibleRate > 0.2 ? "bad" : undefined}>{pct(f.falseFeasibleRate)}</td>
                  <td className={fc.falseFeasibleRate > 0.2 ? "bad" : undefined}>{pct(fc.falseFeasibleRate)}</td>
                </tr>
                <tr>
                  <td>False-infeasible rate</td>
                  <td>{pct(f.falseInfeasibleRate)}</td>
                  <td>{pct(fc.falseInfeasibleRate)}</td>
                </tr>
                <tr>
                  <td>Accuracy</td>
                  <td>{pct(f.accuracy)}</td>
                  <td>{pct(fc.accuracy)}</td>
                </tr>
              </tbody>
            </table>
            <table className="table">
              <tbody>
                <tr>
                  <td>Member-force R² (all members)</td>
                  <td className={study.forces.overallR2 > 0.9 ? "green" : undefined}>{study.forces.overallR2.toFixed(3)}</td>
                </tr>
                <tr>
                  <td>95 % interval coverage · mean predicted std</td>
                  <td>
                    {pct(study.forces.coverage95)} · {study.forces.meanStd.toFixed(1)} N
                  </td>
                </tr>
                <tr>
                  <td>Correlation of |error| with predicted std</td>
                  <td className={study.forces.errorStdCorrelation > 0.2 ? "green" : undefined}>{study.forces.errorStdCorrelation.toFixed(2)}</td>
                </tr>
                {study.derivedMetrics.map((d) => (
                  <tr key={d.target}>
                    <td>Derived {d.target} R²</td>
                    <td className={d.r2 > 0.9 ? "green" : d.r2 < 0.5 ? "bad" : undefined}>{d.r2.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fine">
              Calibration by predicted-std quintile (mean |error| N / coverage):{" "}
              {study.calibration.map((b) => `${b.meanAbsError.toFixed(1)} / ${(b.coverage95 * 100).toFixed(0)} %`).join(" → ")}. A calibrated model shows error rising left to right and
              coverage near 95 % in every bin.
            </p>
          </>
        )}
      </div>
      <div>
        <h2>{map === "error" ? "Error by member" : "Uncertainty by member"}</h2>
        <p>
          {study
            ? map === "error"
              ? "Mean absolute force error on held-out designs, per member (red = hardest to predict). Drawn on the best design."
              : "Mean predicted force standard deviation, per member (red = least understood). Drawn on the best design."
            : "Train the member surrogate to colour the structure by prediction error or uncertainty."}
        </p>
        {study && (
          <div className="tabs" style={{ marginBottom: 8 }}>
            <button className={map === "error" ? "active" : undefined} aria-pressed={map === "error"} onClick={() => setMap("error")}>
              Error
            </button>
            <button className={map === "uncertainty" ? "active" : undefined} aria-pressed={map === "uncertainty"} onClick={() => setMap("uncertainty")}>
              Uncertainty
            </button>
          </div>
        )}
        {trussModel && result && (
          <div className="map-viewport">
            <TrussSvg model={trussModel} result={result} mode="structure" safetyFactor={problem.safetyFactor} areaMax_m2={problem.geometry.areaMax_m2} appliedLoad_N={problem.loads[0]?.magnitude_N} memberColors={colors} compact ariaLabel="Structure coloured by member prediction error or uncertainty" />
          </div>
        )}
        {study && (
          <table className="table">
            <tbody>
              {study.forces.perMemberMae.map((v, i) => (
                <tr key={i}>
                  <td>{compiled?.space.variables.find((x) => x.id === `area_${i}`)?.label.replace(" area", "") ?? `member ${i}`}</td>
                  <td>MAE {v.toFixed(1)} N</td>
                  <td>std {study.perMemberMeanStd[i].toFixed(1)} N</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
