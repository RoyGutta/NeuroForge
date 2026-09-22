import { useMemo } from "react";
import { bindingConstraints, explainDifference, parameterSensitivity } from "../../engine/explain/sensitivity";
import { listOptimizers } from "../../engine/optimization";
import { formatMetric, formatNumber } from "./model";
import type { Workspace } from "./useWorkspace";

export function ExperimentPanel({ ws }: { ws: Workspace }) {
  const { settings, setSettings, status, start, cancel, error, record, generations, progress, compiled, baseline, latestBest, problem } = ws;
  const running = status === "running";
  const optimizers = listOptimizers().filter((o) => (ws.multiObjective ? o.multiObjective : !o.multiObjective));
  const desc = optimizers.find((o) => o.id === settings.optimizerId) ?? optimizers[0];
  const objective = problem.objectives[0];
  const last = generations[generations.length - 1];

  const sensitivity = useMemo(() => {
    if (!compiled || !latestBest || running) return null;
    try {
      return parameterSensitivity(compiled, latestBest.parameters, objective.metric);
    } catch {
      return null;
    }
  }, [compiled, latestBest, running, objective.metric]);

  const binding = useMemo(() => (latestBest?.evaluation ? bindingConstraints(latestBest.evaluation, 0.05) : []), [latestBest]);

  const diff = useMemo(() => {
    if (!compiled || !baseline || !latestBest || running || latestBest.id === baseline.id) return null;
    try {
      return explainDifference(compiled, baseline.parameters, latestBest.parameters);
    } catch {
      return null;
    }
  }, [compiled, baseline, latestBest, running]);

  const exportRecord = () => {
    if (!record) return;
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <aside className="panel right" aria-labelledby="exp-title">
      <div className="panel-head">
        <h2 id="exp-title">Experiment</h2>
        <span className="status">
          <i className={`dot ${running ? "pulse" : ""}`} />
          <span>{status === "idle" ? "READY" : status.toUpperCase()}</span>
        </span>
      </div>
      <div className="panel-body">
        <div className="field">
          <label htmlFor="optimizer">Optimizer</label>
          <select id="optimizer" value={settings.optimizerId} disabled={running} onChange={(e) => setSettings({ ...settings, optimizerId: e.target.value, params: {} })}>
            {optimizers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="helper">{desc.description}</p>
        </div>
        <div className="two">
          {desc.params.slice(0, 2).map((p) => (
            <div className="field" key={p.id}>
              <label htmlFor={`p-${p.id}`} title={p.description}>
                {p.label}
              </label>
              <input
                id={`p-${p.id}`}
                type="number"
                min={p.min}
                max={p.max}
                step={p.step ?? "any"}
                disabled={running}
                value={settings.params[p.id] ?? p.default}
                onChange={(e) => setSettings({ ...settings, params: { ...settings.params, [p.id]: Number(e.target.value) } })}
              />
            </div>
          ))}
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="budget">Evaluation budget</label>
            <input id="budget" type="number" min={100} max={500000} step={100} disabled={running} value={settings.maxEvaluations} onChange={(e) => setSettings({ ...settings, maxEvaluations: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label htmlFor="seed">Random seed</label>
            <input id="seed" type="number" min={0} step={1} disabled={running} value={settings.seed} onChange={(e) => setSettings({ ...settings, seed: Number(e.target.value) })} />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.seedBaseline} disabled={running} onChange={(e) => setSettings({ ...settings, seedBaseline: e.target.checked })} />
          Seed the search with the baseline design
        </label>

        {running ? (
          <button className="wide" onClick={cancel}>
            Stop experiment
          </button>
        ) : (
          <button className="primary wide" id="run" onClick={start} disabled={!compiled}>
            Run experiment
          </button>
        )}
        {error && (
          <p className="warn" role="alert">
            {error}
          </p>
        )}

        <div className="generation">
          {generations.length} <small>generations</small>
        </div>
        <div className="tiny">
          {progress.evaluations.toLocaleString()} FEA evaluations · {(progress.wallTimeMs / 1000).toFixed(1)} s
          {last ? ` · ${last.feasibleCount}/${last.evaluations} feasible in last generation` : ""}
        </div>
        <div className="progress">
          <i style={{ width: `${Math.min(100, (progress.evaluations / settings.maxEvaluations) * 100)}%` }} />
        </div>
        <ol className="process">
          <li>
            Specification compiled <small>{compiled ? `${compiled.space.dimension} variables · ${problem.constraints.length} constraints` : "invalid specification"}</small>
          </li>
          <li>
            Baseline sized <small>{baseline ? formatMetric(objective.metric, baseline.evaluation?.objectives[objective.id]) : "—"}</small>
          </li>
          <li>
            {desc.label} <small>seed {settings.seed} · budget {settings.maxEvaluations.toLocaleString()} evaluations</small>
          </li>
          <li>
            Linear-static FEA per candidate <small>{compiled?.backendId ?? "—"}</small>
          </li>
        </ol>

        {binding.length > 0 && (
          <div className="insight">
            <strong>Binding constraints</strong>
            {binding.map((b) => (
              <div className="kv" key={b.id}>
                <span>{b.id}</span>
                <b className={b.satisfied ? undefined : "bad"}>{(b.utilization * 100).toFixed(1)} %</b>
              </div>
            ))}
            <small>Constraints within 5 % of their limit. These are what actually shape the design.</small>
          </div>
        )}

        {sensitivity && (
          <div className="insight">
            <strong>Most influential variables · {objective.label.toLowerCase()}</strong>
            {sensitivity.entries.slice(0, 5).map((e) => (
              <div className="kv" key={e.id}>
                <span>{e.label}</span>
                <b>{(e.share * 100).toFixed(1)} %</b>
              </div>
            ))}
            <div className="kv muted">
              <span>by group</span>
              <b>{sensitivity.groups.map((g) => `${g.group} ${(g.share * 100).toFixed(0)}%`).join(" · ")}</b>
            </div>
            <small>Central finite differences of the real evaluator at the best design, normalised by variable range.</small>
          </div>
        )}

        {diff && (
          <div className="insight">
            <strong>What changed from the baseline</strong>
            {diff.changed.map((g) => (
              <div className="kv" key={g.group}>
                <span>{g.group} ({g.count})</span>
                <b>
                  {g.meanRelativeChange >= 0 ? "+" : ""}
                  {(g.meanRelativeChange * 100).toFixed(0)} % mean
                </b>
              </div>
            ))}
            <div className="kv">
              <span>{objective.label}</span>
              <b>
                {formatNumber(diff.objectiveDelta[objective.metric] * (objective.metric === "mass_kg" ? 1000 : 1e3), 0)} {objective.metric === "mass_kg" ? "g" : "mJ"}
              </b>
            </div>
          </div>
        )}

        {record?.optimizerDiagnostics && !running && <Diagnostics d={record.optimizerDiagnostics} />}

        {record && !running && (
          <button className="wide secondary" onClick={exportRecord}>
            Export experiment · JSON
          </button>
        )}
        <p className="helper">
          Linear-elastic pin-jointed truss model. Results are a preliminary study, not a validated or fabrication-ready design.
        </p>
      </div>
    </aside>
  );
}

/** Algorithm diagnostics recorded by model-based optimisers. */
function Diagnostics({ d }: { d: Record<string, unknown> }) {
  const r2 = d.onlineR2 as Record<string, number> | undefined;
  const ls = d.lengthscale as Record<string, number> | undefined;
  const funnel = d.funnel as { candidatesGenerated: number; surrogatePredictions: number; passedScreening: number; sentToSolver: number; warmupEvaluations: number; explorationPicks: number } | undefined;
  const feas = d.feasibility as { precision: number; recall: number; falseFeasibleRate: number; falseInfeasibleRate: number; count: number } | undefined;
  const forces = d.forces as { overallR2: number; coverage95: number } | undefined;
  const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)} %` : "—");
  return (
    <div className="insight">
      <strong>Model diagnostics · {String(d.surrogate ?? "")}</strong>
      {funnel && (
        <>
          <div className="kv"><span>candidates generated</span><b>{funnel.candidatesGenerated.toLocaleString()}</b></div>
          <div className="kv"><span>surrogate predictions</span><b>{funnel.surrogatePredictions.toLocaleString()}</b></div>
          <div className="kv"><span>passed conservative screen</span><b>{funnel.passedScreening.toLocaleString()}</b></div>
          <div className="kv"><span>sent to solver (after warm-up)</span><b>{funnel.sentToSolver.toLocaleString()}</b></div>
          <div className="kv"><span>exploration picks</span><b>{funnel.explorationPicks.toLocaleString()}</b></div>
        </>
      )}
      {feas && (
        <>
          <div className="kv"><span>screen precision / recall</span><b>{pct(feas.precision)} / {pct(feas.recall)}</b></div>
          <div className="kv"><span>false-feasible rate</span><b className={feas.falseFeasibleRate > 0.2 ? "bad" : undefined}>{pct(feas.falseFeasibleRate)}</b></div>
          <div className="kv"><span>false-infeasible rate</span><b>{pct(feas.falseInfeasibleRate)}</b></div>
        </>
      )}
      {forces && (
        <div className="kv"><span>member-force R² · 95 % coverage</span><b>{forces.overallR2.toFixed(3)} · {pct(forces.coverage95)}</b></div>
      )}
      {r2 &&
        Object.entries(r2).map(([k, v]) => (
          <div className="kv" key={k}>
            <span>online R² · {k}</span>
            <b className={v > 0.9 ? "green" : v < 0.5 ? "bad" : undefined}>{Number.isFinite(v) ? v.toFixed(3) : "—"}</b>
          </div>
        ))}
      {typeof d.predictedPairs === "number" && (
        <div className="kv">
          <span>predicted-then-evaluated pairs</span>
          <b>{d.predictedPairs}</b>
        </div>
      )}
      {typeof d.screenedGenerations === "number" && (
        <div className="kv">
          <span>screened generations</span>
          <b>{d.screenedGenerations}</b>
        </div>
      )}
      {typeof d.gpPoints === "number" && (
        <div className="kv">
          <span>GP training points</span>
          <b>{d.gpPoints}</b>
        </div>
      )}
      {ls &&
        Object.entries(ls).map(([k, v]) => (
          <div className="kv" key={k}>
            <span>lengthscale · {k}</span>
            <b>{Number.isFinite(v) ? v.toFixed(3) : "—"}</b>
          </div>
        ))}
      <small>Predictions were made before the solver ran; accuracy is measured on exactly those designs.</small>
    </div>
  );
}
