import { useEffect, useRef, useState } from "react";
import { startLab, type ExperimentHandle } from "../../app/experimentClient";
import { createLabConfig, type LabEvent, type LabRecord, type LabStage, type PilotResult } from "../../engine/autonomous/lab";
import { formatMetric } from "./model";
import type { Workspace } from "./useWorkspace";

type Live = { stage: LabStage; message: string }[];

/**
 * Autonomous search: pilots several strategies on equal budgets, runs the
 * winner until it plateaus, maps the trade-off front and reports. Every
 * figure shown comes from the stage records; the finished records can be
 * opened in the workspace like any other experiment.
 */
export function AutonomousPanel({ ws }: { ws: Workspace }) {
  const { problem, compiled, status, loadRecord } = ws;
  const [budget, setBudget] = useState(12000);
  const [seed, setSeed] = useState(7);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Live>([]);
  const [pilots, setPilots] = useState<PilotResult[]>([]);
  const [progress, setProgress] = useState<{ stage: string; evaluations: number; best: number | null; frontSize?: number }>({ stage: "", evaluations: 0, best: null });
  const [record, setRecord] = useState<LabRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const handle = useRef<ExperimentHandle | null>(null);
  const objective = problem.objectives[0];

  useEffect(() => () => handle.current?.cancel(), []);

  const start = () => {
    if (!compiled || running || problem.objectives.length !== 1) return;
    let config;
    try {
      config = createLabConfig({ problem, seed, totalBudget: budget, pilotBudget: Math.max(300, Math.round(budget * 0.075)), tradeoffBudget: Math.max(300, Math.round(budget / 6)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    setRunning(true);
    setError(null);
    setLog([]);
    setPilots([]);
    setRecord(null);
    setProgress({ stage: "analysis", evaluations: 0, best: null });
    handle.current = startLab(config, {
      onEvent: (ev: Exclude<LabEvent, { type: "started" }>) => {
        if (ev.type === "stage") setLog((l) => l.concat({ stage: ev.stage, message: ev.message }));
        else if (ev.type === "pilot") setPilots((p) => p.concat(ev.result));
        else if (ev.type === "generation") {
          const best = ev.summary.bestSoFar.evaluation?.feasible ? ev.summary.bestSoFar.evaluation.objectives[objective.id] : null;
          setProgress({ stage: ev.stage, evaluations: ev.totalEvaluations, best: ev.stage === "main" ? best : null, frontSize: ev.summary.frontSize });
        }
      },
      onFinished: (rec) => {
        setRecord(rec);
        setRunning(false);
        handle.current = null;
      },
      onError: (m) => {
        setError(m);
        setRunning(false);
        handle.current = null;
      },
    });
  };

  const r = record?.report;
  const pct = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(1)} %`);

  return (
    <section className={`autonomous${open ? " open" : ""}`} aria-label="Autonomous search">
      <div className="autonomous-head">
        <div>
          <h2>Autonomous search</h2>
          <p>Pilot every strategy on an equal budget, run the winner until it stops improving, map the mass-versus-stiffness front, and report what was found. All in the worker; all from records.</p>
        </div>
        <div className="row">
          <label className="check">
            budget
            <input type="number" min={2000} max={200000} step={1000} value={budget} disabled={running} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: 90 }} aria-label="Total solver evaluation budget" />
          </label>
          <label className="check">
            seed
            <input type="number" min={0} step={1} value={seed} disabled={running} onChange={(e) => setSeed(Number(e.target.value))} style={{ width: 70 }} aria-label="Seed" />
          </label>
          {running ? (
            <button onClick={() => handle.current?.cancel()}>Stop</button>
          ) : (
            <button className="primary" id="run-lab" onClick={start} disabled={!compiled || status === "running" || problem.objectives.length !== 1} title={problem.objectives.length !== 1 ? "Autonomous search needs a single-objective specification; it maps the trade-off itself." : undefined}>
              Run autonomous search
            </button>
          )}
          {(log.length > 0 || record) && (
            <button className="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Hide log" : "Show log"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="warn" role="alert">
          {error}
        </p>
      )}
      {(running || record) && (
        <div className="lab-live" role="status" aria-live="polite">
          <span className="status">
            <i className={`dot ${running ? "pulse" : ""}`} /> {running ? `${progress.stage.toUpperCase()} · ${progress.evaluations.toLocaleString()} evaluations${progress.best !== null ? ` · best ${formatMetric(objective.metric, progress.best)}` : ""}${progress.frontSize ? ` · front ${progress.frontSize}` : ""}` : record?.status === "completed" ? "EXPERIMENT COMPLETE" : "STOPPED"}
          </span>
        </div>
      )}
      {open && log.length > 0 && (
        <ol className="lab-log">
          {log.map((l, i) => (
            <li key={i}>
              <b>{l.stage}</b> {l.message}
              {l.stage === "pilot" && pilots.length > 0 && (
                <ul>
                  {pilots.map((p) => (
                    <li key={p.strategy}>
                      {p.label}: {p.feasible ? formatMetric(objective.metric, p.bestObjective) : "no feasible design"} in {p.evaluations.toLocaleString()} evaluations ({(p.wallTimeMs / 1000).toFixed(1)} s)
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      {r && record && (
        <div className="lab-report">
          <div className="lab-grid">
            <div>
              <span>solver evaluations</span>
              <b>{r.solverEvaluations.toLocaleString()}</b>
            </div>
            <div>
              <span>surrogate predictions</span>
              <b>{r.surrogatePredictions.toLocaleString()}</b>
            </div>
            <div>
              <span>strategies compared</span>
              <b>{r.strategiesCompared}</b>
            </div>
            <div>
              <span>chosen strategy</span>
              <b>{r.chosenStrategyLabel}</b>
            </div>
            <div>
              <span>baseline → best</span>
              <b>
                {formatMetric("mass_kg", r.baselineMass_kg)} → {formatMetric("mass_kg", r.bestMass_kg)}
              </b>
            </div>
            <div>
              <span>improvement</span>
              <b className="green">−{r.improvementPercent.toFixed(1)} %</b>
            </div>
            <div>
              <span>stopped because</span>
              <b>{r.stopReason === "converged" ? `plateau after ${r.mainGenerations} generations` : `budget spent (${r.mainGenerations} generations)`}</b>
            </div>
            <div>
              <span>binding constraints</span>
              <b>{r.bindingConstraints.length ? r.bindingConstraints.map((c) => `${c.id} ${(c.utilization * 100).toFixed(0)} %`).join(", ") : "none within 5 %"}</b>
            </div>
            <div>
              <span>Pareto front</span>
              <b>{r.paretoFrontSize ? `${r.paretoFrontSize} designs · hypervolume ${pct(r.hypervolume ?? undefined)} of baseline box` : "not mapped"}</b>
            </div>
            {r.screening && (
              <div>
                <span>screen reliability</span>
                <b>
                  precision {pct(r.screening.precision)} · false-feasible {pct(r.screening.falseFeasibleRate)}
                  {r.screening.forceR2 !== undefined ? ` · force R² ${r.screening.forceR2.toFixed(3)}` : ""}
                </b>
              </div>
            )}
            <div>
              <span>most influential</span>
              <b>{r.topVariables.slice(0, 3).map((v) => `${v.label} ${(v.share * 100).toFixed(0)} %`).join(" · ")}</b>
            </div>
            <div>
              <span>wall time</span>
              <b>{(r.wallTimeMs / 1000).toFixed(1)} s</b>
            </div>
          </div>
          <div className="row">
            <button className="primary" onClick={() => loadRecord(record.main)}>
              View discovery
            </button>
            {record.tradeoff && (
              <button className="secondary" onClick={() => loadRecord(record.tradeoff!)}>
                View trade-off front
              </button>
            )}
            <span className="tiny">Opening a stage loads its full record (every generation) into the panels below and saves it to the library.</span>
          </div>
        </div>
      )}
    </section>
  );
}
