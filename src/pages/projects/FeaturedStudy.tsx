import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Arrow } from "../../components/Arrow";
import { solveTruss } from "../../engine/domains/structural/truss/fea";
import { useHomeDemo } from "../home/useHomeDemo";
import { formatMetric } from "../workspace/model";
import { TrussSvg } from "../workspace/TrussSvg";

const BRIEF = "Design a lightweight bridge spanning 2 meters that supports 500 N.";

/** Featured comparison computed live on page load: baseline sizing and a
 *  short evolutionary run, both through the real solver. */
export function FeaturedStudy() {
  const demo = useHomeDemo(BRIEF);
  const [view, setView] = useState<"baseline" | "optimized">("optimized");
  const { run } = demo;
  useEffect(() => {
    run(BRIEF);
    // Run once on mount; `run` is stable for the idle state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const design = view === "baseline" ? demo.baseline : demo.best ?? demo.baseline;
  const model = useMemo(() => (demo.compiled && design ? demo.compiled.artifact(design.parameters) : null), [demo.compiled, design]);
  const result = useMemo(() => (model ? solveTruss(model) : null), [model]);
  const mass = design?.evaluation?.metrics.mass_kg;
  const base = demo.baseline?.evaluation?.metrics.mass_kg;
  const saving = base && mass !== undefined ? (1 - mass / base) * 100 : null;
  const optimized = view === "optimized";

  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="feature-copy">
        <span className="label">Featured study / Structural optimization · computed live</span>
        <h2 id="featured-title">Same load. Less bridge.</h2>
        <p>
          Where does a structure actually need material? This comparison is not an illustration: the baseline was sized
          and the optimized truss was searched by the finite-element engine when this page loaded, in your browser.
        </p>
        <div className="constraints">
          <span>2 m span</span>
          <span>500 N load</span>
          <span>Safety factor 2</span>
          <span>Yield · Euler buckling · L/250</span>
        </div>
        <Link className="button" to="/workspace" onClick={() => demo.stashForWorkspace()}>
          Open in the workspace <Arrow />
        </Link>
      </div>
      <div className="feature-view">
        <div className="view-top">
          <span>
            {demo.status === "running"
              ? `SEARCHING · ${demo.progress.evaluations.toLocaleString()} evaluations`
              : demo.status === "done"
                ? `SEED ${demo.record?.config.seed} · ${demo.record?.totalEvaluations.toLocaleString()} EVALUATIONS · ${((demo.record?.wallTimeMs ?? 0) / 1000).toFixed(1)} s`
                : "BRIDGE / DESIGN COMPARISON"}
          </span>
          <div className="segmented" aria-label="Bridge design preview">
            <button aria-pressed={!optimized} onClick={() => setView("baseline")}>
              Baseline
            </button>
            <button aria-pressed={optimized} onClick={() => setView("optimized")}>
              Optimized
            </button>
          </div>
        </div>
        <div className="bridge-wrap">
          {model && result && demo.compiled && (
            <TrussSvg
              model={model}
              result={result}
              mode="utilization"
              safetyFactor={demo.problem.safetyFactor}
              areaMax_m2={demo.problem.geometry.areaMax_m2}
              appliedLoad_N={500}
              compact
              ariaLabel={optimized ? "Optimized truss, utilisation colouring" : "Baseline truss, utilisation colouring"}
            />
          )}
        </div>
        <div className="preview-stats" aria-live="polite">
          <span>
            <strong id="mass">{formatMetric("mass_kg", mass)}</strong> design mass
          </span>
          <span id="saving">
            {optimized && saving !== null ? (
              <>
                <strong>{saving.toFixed(1)}%</strong> less material
              </>
            ) : (
              "Conventional uniform-section reference design"
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
