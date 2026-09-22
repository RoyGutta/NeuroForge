import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Arrow } from "../components/Arrow";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";
import { usePageMeta } from "../hooks/usePageMeta";
import css from "../styles/home.css?inline";
import { DemoWindow } from "./home/DemoWindow";
import { useHomeDemo } from "./home/useHomeDemo";
import { formatMetric } from "./workspace/model";

/** Example briefs. Only the bridge family is simulated today; the others
 *  are handed to the interpreter, which declines them honestly. */
const BRIEFS: Record<string, string> = {
  bridge: "Design a lightweight bridge spanning 2 meters that supports 500 N.",
  steel: "A 3 m steel footbridge truss must carry 1.5 kN with a safety factor of 1.5, minimising mass.",
  stiff: "2 m aluminium bridge carrying 500 N; make it as stiff as possible.",
  drone: "Design a drone frame that minimizes mass while maintaining a safety factor of 2.",
  thermal: "Design a heatsink that keeps a 100 W processor below 80°C.",
};

const CHIPS: [string, string][] = [
  ["bridge", "Bridge · 2 m · 500 N"],
  ["steel", "Steel footbridge · 1.5 kN"],
  ["stiff", "Stiffest at fixed mass"],
  ["thermal", "Heatsink (not yet)"],
];

export function HomePage() {
  usePageMeta(
    "NeuroForge — Engineering, evolved.",
    "Describe a structural problem. NeuroForge turns it into a specification, runs a real finite-element optimization in your browser, and shows the evidence."
  );
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(BRIEFS.bridge);
  const [activeExample, setActiveExample] = useState("bridge");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const demo = useHomeDemo(BRIEFS.bridge);
  const running = demo.status === "running";

  function applyExample(example: string) {
    setPrompt(BRIEFS[example]);
    setActiveExample(example);
    promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    promptRef.current?.focus({ preventScroll: true });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    demo.run(prompt);
  }

  const objective = demo.problem.objectives[0];
  const baseObj = demo.baseline?.evaluation?.objectives[objective.id];
  const bestObj = demo.best?.evaluation?.objectives[objective.id];
  const quarter = demo.generations[Math.floor((demo.generations.length - 1) / 4)]?.bestSoFar.evaluation?.objectives[objective.id];
  const pct = (v: number | undefined) => (baseObj && v !== undefined && Number.isFinite(v) ? Math.max(4, (v / baseObj) * 100) : 0);

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <NavBar current="home" />
        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div>
              <div className="eyebrow">
                <span className="dot"></span>Physics-grounded. Search-discovered.
              </div>
              <h1 id="hero-title">
                Tell us what you
                <br />
                want to build.
                <br />
                <span>
                  Let physics
                  <br />
                  find the way.
                </span>
              </h1>
              <p className="intro">
                From an engineering brief to an optimized structure. NeuroForge extracts the specification, sizes a
                conventional baseline, then searches thousands of finite-element-analysed candidates for a lighter design
                that still satisfies every constraint. Live, in your browser.
              </p>
              <form id="design-form" className="prompt-box" onSubmit={onSubmit}>
                <label htmlFor="prompt">Your engineering problem</label>
                <textarea
                  id="prompt"
                  ref={promptRef}
                  required
                  minLength={8}
                  maxLength={1000}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="prompt-foot">
                  <span>Span, load, material, safety factor. Missing values become explicit assumptions.</span>
                  <button className="button" id="generate" type="submit" disabled={running}>
                    {running ? "Searching…" : "Discover design"} <Arrow />
                  </button>
                </div>
              </form>
              <div className="suggestions">
                <span>Try:</span>
                {CHIPS.map(([id, label]) => (
                  <button key={id} className={`chip${activeExample === id ? " active" : ""}`} onClick={() => applyExample(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <p id="feedback" role="status" aria-live="polite" className={demo.status === "unsupported" || demo.status === "error" ? "feedback-warn" : undefined}>
                {demo.message}
              </p>
            </div>
            <DemoWindow demo={demo} />
          </section>

          <div className="foundation">
            <span>
              ONE CONNECTED
              <br />
              ENGINEERING LOOP
            </span>
            <div className="foundation-list">
              <span>
                <i></i>Specification
              </span>
              <span>
                <i></i>Parametric truss
              </span>
              <span>
                <i></i>Finite-element analysis
              </span>
              <span>
                <i></i>Evolutionary search
              </span>
              <span>
                <i></i>Evidence
              </span>
            </div>
          </div>

          <section className="content" id="engine">
            <div className="section-head">
              <h2>
                Not a prompt-to-CAD tool.
                <br />
                <span>A search for what works.</span>
              </h2>
              <p>
                Language defines the problem. A deterministic solver tests every answer. The optimizer keeps only what
                survives the constraints.
              </p>
            </div>
            <div className="pipeline">
              <article className="step">
                <div className="step-no">
                  01 <span>→</span>
                </div>
                <h3>Specify</h3>
                <p>
                  The brief becomes a typed specification: span, load, material, safety factor, deflection limit. What
                  the brief did not say is recorded as an assumption with a confidence level, and you can edit any of it.
                </p>
              </article>
              <article className="step">
                <div className="step-no">
                  02 <span>→</span>
                </div>
                <h3>Parameterize</h3>
                <p>
                  A ground-structure truss: top-chord node heights and every member's cross-section become design
                  variables. Nineteen of them for a four-panel span; the search can effectively remove members.
                </p>
              </article>
              <article className="step">
                <div className="step-no">
                  03 <span>→</span>
                </div>
                <h3>Simulate</h3>
                <p>
                  Each candidate is solved by the direct stiffness method: displacements, member forces, stresses,
                  reactions. Yield, Euler buckling and serviceability deflection are checked with the stated safety
                  factor.
                </p>
              </article>
              <article className="step">
                <div className="step-no">
                  04 <span>↗</span>
                </div>
                <h3>Search</h3>
                <p>
                  An elitist evolutionary algorithm with feasibility-first ranking proposes the next generation. Every
                  run is seeded and reproducible; every generation's best design is kept for inspection.
                </p>
              </article>
            </div>
            <div className="loop">
              <Arrow d="M20 7v7a5 5 0 0 1-5 5H4m4-4-4 4 4 4M4 12V5h13" />
              Tens of thousands of finite-element solves per second in a Web Worker. Surrogate models and active learning
              are the next stage of the roadmap.
            </div>
            <div className="proof">
              <div>
                <h3>Less material. Same constraints.</h3>
                <p>
                  The baseline is a conventional uniform-section Warren truss sized to just satisfy the same checks. The
                  bars below are live values from the run above.
                </p>
                <div className="bar-row">
                  <span>Conventional baseline</span>
                  <div className="bar">
                    <i style={{ width: "100%" }}></i>
                  </div>
                  <span>{formatMetric(objective.metric, baseObj)}</span>
                </div>
                <div className="bar-row">
                  <span>Quarter of budget</span>
                  <div className="bar">
                    <i style={{ width: `${pct(quarter)}%`, background: "#7c8cff" }}></i>
                  </div>
                  <span>{formatMetric(objective.metric, quarter)}</span>
                </div>
                <div className="bar-row">
                  <span>Best found</span>
                  <div className="bar">
                    <i style={{ width: `${pct(bestObj)}%` }}></i>
                  </div>
                  <span>{formatMetric(objective.metric, bestObj)}</span>
                </div>
                <p className="fine">
                  {demo.status === "done"
                    ? `Measured on ${demo.record?.totalEvaluations.toLocaleString()} evaluations, seed ${demo.record?.config.seed}. Same solver, same material, same load case.`
                    : "Run a brief above to populate this comparison with measured values."}
                </p>
              </div>
              <div>
                <h3>An answer you can interrogate.</h3>
                <p>
                  A lighter structure means nothing without the evidence. Every result carries its assumptions, its
                  binding constraints, and the sensitivity of the objective to each design variable.
                </p>
                <ul className="checks">
                  <li>
                    Specification, assumptions &amp; confidence <span>Inspect</span>
                  </li>
                  <li>
                    Member forces, utilisation &amp; deformed shape <span>Understand</span>
                  </li>
                  <li>
                    Generation-by-generation history &amp; scrubbing <span>Compare</span>
                  </li>
                  <li>
                    Full experiment record as JSON <span>Export</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="content">
            <div className="section-head">
              <h2>Start with a real problem.</h2>
              <Link to="/projects" className="text-link">
                Explore all projects <Arrow />
              </Link>
            </div>
            <div className="projects">
              <article className="project">
                <span>STRUCTURAL · RUNNABLE NOW</span>
                <h3>A lighter truss bridge</h3>
                <p>Span 2 m, carry 500 N, minimize mass under yield, buckling and deflection limits. Fully simulated.</p>
                <button className="text-link" onClick={() => applyExample("bridge")}>
                  Try this brief <Arrow />
                </button>
              </article>
              <article className="project">
                <span>STRUCTURAL · RUNNABLE NOW</span>
                <h3>Stiffest bridge at fixed mass</h3>
                <p>Same span and load, but minimize compliance within the baseline's mass budget. A different optimum.</p>
                <button className="text-link" onClick={() => applyExample("stiff")}>
                  Try this brief <Arrow />
                </button>
              </article>
              <article className="project">
                <span>THERMAL · ROADMAP</span>
                <h3>A cooler 100 W processor</h3>
                <p>Heat-sink fin optimization needs a thermal domain module. The interpreter will tell you so rather than guess.</p>
                <button className="text-link" onClick={() => applyExample("thermal")}>
                  See how it responds <Arrow />
                </button>
              </article>
            </div>
          </section>

          <section className="cta">
            <div>
              <h2>Your constraints. A real search.</h2>
              <p>Open the workspace to edit the specification, choose the optimizer, and inspect every generation.</p>
            </div>
            <button
              className="button"
              onClick={() => {
                demo.stashForWorkspace();
                navigate("/workspace");
              }}
            >
              Open the engineering workspace <Arrow />
            </button>
          </section>
        </main>
        <Footer
          current="home"
          links={[
            { label: "Technology", to: "/technology", page: "technology" },
            { label: "Projects", to: "/projects", page: "projects" },
            { label: "Benchmarks", to: "/benchmarks", page: "benchmarks" },
          ]}
        />
      </div>
    </>
  );
}
