import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Arrow } from "../components/Arrow";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";
import { usePageMeta } from "../hooks/usePageMeta";
import css from "../styles/technology.css?inline";
import { SearchTraceChart } from "./technology/SearchTraceChart";
import { TECH_BUDGET, useTechnologyData } from "./technology/useTechnologyData";

interface Stage {
  tag: string;
  title: string;
  description: string;
  codeLabel: string;
  codeOutput: string;
}

/** The five stages, verbatim from the legacy script's `stages` array. */
const STAGES: Stage[] = [
  {
    tag: "01 / FROM BRIEF TO SPECIFICATION",
    title: "Make the problem explicit.",
    description:
      "A rule-based interpreter extracts span, load, material and safety factor into a typed EngineeringProblem. Anything it could not find becomes a recorded assumption with a reason and a confidence level, and the specification is editable and versioned. An LLM-backed interpreter is a planned drop-in behind the same interface.",
    codeLabel: "SPECIFICATION · COMPILED FROM THE CANONICAL BRIEF",
    codeOutput:
      "objective       minimize(mass)\nspan            2.0 m\napplied_load    500 N\nmaterial        awaiting selection\nsupports        awaiting definition\nstate           requires review",
  },
  {
    tag: "02 / FROM PARAMETERS TO CANDIDATES",
    title: "Generate possibilities, not templates.",
    description:
      "A Warren ground structure: top-chord node heights and every member's cross-section area are bounded continuous variables. Members driven to the minimum area are effectively removed, which is the classical route to truss topology optimisation. Invalid or zero-length geometry is rejected before analysis.",
    codeLabel: "DESIGN SPACE · REAL BOUNDS",
    codeOutput:
      "variables       node_positions, member_areas\nbounds          user-defined envelope\nsampling        diverse initial population\ngeometry_check  connected load paths\noutput          solver-ready candidates",
  },
  {
    tag: "03 / FROM GEOMETRY TO EVIDENCE",
    title: "Ask the physical model.",
    description:
      "Every candidate is solved by the direct stiffness method: displacements, member forces, stresses and reactions, with self-weight lumped to the nodes. Yield, Euler buckling and serviceability deflection are checked against the safety factor. A singular stiffness matrix is reported as a mechanism, never patched over. The solver is tested against closed-form cases.",
    codeLabel: "SIMULATION RECORD · BASELINE DESIGN",
    codeOutput:
      "analysis        static structural\ninputs          mesh + material + loads\noutputs         stress, displacement, mass\nchecks          constraint margins\nfailed_solve    reject and retain diagnostics",
  },
  {
    tag: "04 / FROM EXPERIMENTS TO PREDICTIONS",
    title: "Learn where to look next.",
    description:
      "Every experiment already produces a labelled dataset of (design parameters, simulated metrics). The next stage trains surrogate models on it and evaluates them honestly against held-out solver results before letting them propose candidates. This stage is on the roadmap and is not in the product yet; nothing on this site pretends otherwise.",
    codeLabel: "SURROGATE LEARNING · ROADMAP",
    codeOutput:
      "training_data   physics-evaluated candidates\nfeatures        geometry + material parameters\ntargets         objective + constraint response\nselection       promise + uncertainty\nverification    return to physics solver",
  },
  {
    tag: "05 / FROM RESULTS TO A NEW GENERATION",
    title: "Evolve the search, not the requirements.",
    description:
      "An elitist (mu + lambda) evolutionary algorithm ranks designs by Deb's feasibility rules, selects by tournament, recombines with blend crossover and mutates with Gaussian noise. Simulated annealing and random search are first-class alternatives for benchmarking. Every run is seeded and records every generation.",
    codeLabel: "OPTIMIZATION POLICY · DEFAULT PARAMETERS",
    codeOutput:
      "ranking         feasibility, then objective\noperators       selection, mutation, crossover\nretention       best feasible candidates\nnext_step       generate → simulate → learn\nstop            convergence or budget",
  },
];

const STAGE_META: { no: string; name: string }[] = [
  { no: "01 / INTERPRET", name: "Engineering constraints" },
  { no: "02 / GENERATE", name: "Parametric geometry" },
  { no: "03 / EVALUATE", name: "Physics simulation" },
  { no: "04 / LEARN", name: "ML surrogate model" },
  { no: "05 / EVOLVE", name: "Optimization search" },
];

export function TechnologyPage() {
  usePageMeta(
    "The engine — NeuroForge",
    "Inside NeuroForge: constraint extraction, parametric geometry, physics simulation, surrogate learning, and evolutionary optimization in one engineering loop."
  );

  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const data = useTechnologyData();

  function selectStage(index: number) {
    setSelected(index);
  }

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (index + 1) % STAGES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index + STAGES.length - 1) % STAGES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STAGES.length - 1;
    else return;
    e.preventDefault();
    selectStage(next);
    tabRefs.current[next]?.focus();
  }

  const stage = STAGES[selected];

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <NavBar current="technology" />
        <main>
          <section className="hero">
            <div>
              <div className="eyebrow">
                <span className="dot"></span>Inside NeuroForge
              </div>
              <h1>
                Language sets the goal.
                <br />
                <span>
                  Physics drives
                  <br />
                  the discovery.
                </span>
              </h1>
            </div>
            <div>
              <p>
                A design isn't an answer until it's tested. NeuroForge connects
                geometry, simulation, and machine learning in a search loop that
                learns from every candidate.
              </p>
              <a className="text-link" href="#architecture">
                Follow an engineering experiment{" "}
                <Arrow d="M12 5v14m-6-6 6 6 6-6" ariaHidden />
              </a>
            </div>
          </section>
          <section id="architecture" aria-label="Interactive engine architecture">
            <div className="architecture">
              <div className="window-head">
                <span>NEUROFORGE / ENGINE ARCHITECTURE</span>
                <span>Explore the loop · Select a stage</span>
              </div>
              <div className="flow">
                <div className="input">
                  <span className="tag">INPUT / NATURAL LANGUAGE</span>
                  <q>Minimize the mass of a 2 m bridge supporting 500 N.</q>
                </div>
                <div
                  className="stages"
                  role="tablist"
                  aria-label="Engineering stages"
                >
                  {STAGE_META.map((meta, i) => (
                    <button
                      key={meta.no}
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      className="stage"
                      role="tab"
                      id={`tab-${i}`}
                      aria-selected={selected === i}
                      aria-controls="stage-panel"
                      tabIndex={selected === i ? 0 : -1}
                      onClick={() => selectStage(i)}
                      onKeyDown={(e) => onTabKeyDown(e, i)}
                    >
                      <span>{meta.no}</span>
                      <strong>{meta.name}</strong>
                    </button>
                  ))}
                </div>
                <div className="return">
                  <span>Propose new candidates. Test again.</span>
                </div>
                <p className="flow-note">
                  Stop on convergence or experiment budget—not on a convincing
                  render.
                </p>
              </div>
              <div
                className="detail"
                id="stage-panel"
                role="tabpanel"
                aria-labelledby={`tab-${selected}`}
                tabIndex={0}
              >
                <div className="detail-copy">
                  <span className="tag" id="detail-tag">
                    {stage.tag}
                  </span>
                  <h3 id="detail-title">{stage.title}</h3>
                  <p id="detail-description">{stage.description}</p>
                </div>
                <div className="code">
                  <div className="code-head">
                    <span id="code-label">{stage.codeLabel}</span>
                    <span>{selected === 3 ? "PLANNED" : "LIVE DATA"}</span>
                  </div>
                  <pre id="code-output">{data.codePanels[selected]}</pre>
                </div>
              </div>
            </div>
            <p className="caption">
              Architecture walkthrough · Panels 01–03 and 05 are generated from the engine at page load; panel 04 describes
              planned work.
            </p>
          </section>
          <section className="section">
            <div className="section-head">
              <h2>
                Search broadly.
                <br />
                <span>Spend compute carefully.</span>
              </h2>
              <p>
                This trace is a real run performed when you opened the page. Tens of thousands of solves per second make
                brute-force search viable for a truss; surrogate models are what will make it viable for expensive physics.
              </p>
            </div>
            <div className="learning">
              <div className="chart-panel">
                <div className="chart-title">
                  A search that converges{" "}
                  <span>
                    {data.record
                      ? `MEASURED · SEED ${data.record.config.seed} · ${data.record.totalEvaluations.toLocaleString()} EVALUATIONS · ${(data.record.wallTimeMs / 1000).toFixed(1)} s`
                      : "MEASURING…"}
                  </span>
                </div>
                <SearchTraceChart generations={data.generations} baseline={data.baselineEval.metrics.mass_kg} budget={TECH_BUDGET} />
                <div className="legend">
                  <span>
                    <i></i>Best feasible design so far
                  </span>
                  <span>
                    <i></i>Best of each generation (every third) · dashed: baseline
                  </span>
                </div>
              </div>
              <div className="principles">
                <article>
                  <h3>Diversity before refinement.</h3>
                  <p>
                    Sample parameterized structures across the permitted design
                    space. Mutation and recombination explore alternatives
                    beyond a single starting geometry.
                  </p>
                </article>
                <article>
                  <h3>Predictions guide. Solvers decide.</h3>
                  <p>
                    When surrogate models arrive, they will propose candidates; the finite-element solver will still be the
                    only thing that decides feasibility and records a result.
                  </p>
                </article>
                <article>
                  <h3>Feasibility comes before fitness.</h3>
                  <p>
                    A lighter candidate that violates a stress or displacement
                    limit isn't a better design. Rank feasible solutions against
                    the objective and retain the trade-offs.
                  </p>
                </article>
              </div>
            </div>
          </section>
          <section className="section" id="roadmap">
            <div className="evidence">
              <div>
                <h2>
                  Inspect the evidence.
                  <br />
                  <span>Not just the geometry.</span>
                </h2>
                <p>
                  The output is a traceable engineering study: what was assumed,
                  what was tested, and why a candidate survived.
                </p>
                <Link className="text-link" to="/projects">
                  Explore engineering problems <Arrow ariaHidden />
                </Link>
              </div>
              <div>
                <details open>
                  <summary>What makes a result trustworthy?</summary>
                  <p>
                    Keep loads, boundary conditions, material models, mesh
                    settings, and solver status alongside each result. Finalists
                    need direct simulation and mesh-convergence checks; a
                    surrogate score alone is not validation.
                  </p>
                </details>
                <details>
                  <summary>How is the baseline comparison kept fair?</summary>
                  <p>
                    Evaluate the conventional baseline and optimized design
                    using the same material, loads, supports, and acceptance
                    criteria. Compare mass only after both satisfy the same
                    constraints. A percentage improvement without those
                    conditions is incomplete.
                  </p>
                </details>
                <details>
                  <summary>What happens when no design is feasible?</summary>
                  <p>
                    Report the violated constraints and the nearest candidates
                    rather than label a failed design a solution. Revisit
                    conflicting requirements, widen the permitted geometry, or
                    increase the search budget before trying again.
                  </p>
                </details>
                <details>
                  <summary>What is on the roadmap?</summary>
                  <p>
                    Surrogate models trained on run data with honest hold-out metrics; ML-assisted and Bayesian search;
                    multi-objective optimisation with a Pareto front; further domains (thermal, robotics, aerospace) as
                    modules behind the same domain interface; a benchmark suite comparing optimisers at equal budget;
                    3D visualisation. Each ships only when it is real and tested.
                  </p>
                </details>
                <details>
                  <summary>What should leave the workspace?</summary>
                  <p>
                    Geometry, the constraint specification, candidate history,
                    and a simulation report should travel together.
                    Manufacturing limits, tolerances, fatigue, and real-world
                    testing still require engineering review before fabrication.
                  </p>
                </details>
              </div>
            </div>
            <div className="notice">
              <strong>Simulation is evidence, not certification.</strong>{" "}
              Results depend on the physical model and its assumptions.
              Safety-critical designs require qualified engineering review and
              appropriate physical testing.
            </div>
          </section>
          <section className="cta">
            <div>
              <h2>Give the loop a real problem.</h2>
              <p>
                Define your constraints. Explore what the design space has to
                offer.
              </p>
            </div>
            <Link to="/workspace" className="button">
              Open the engineering workspace <Arrow ariaHidden />
            </Link>
          </section>
        </main>
        <Footer
          current="technology"
          links={[
            { label: "Technology", to: "/technology", page: "technology" },
            { label: "Projects", to: "/projects", page: "projects" },
            { label: "Workspace", to: "/workspace", page: "workspace" },
          ]}
        />
      </div>
    </>
  );
}
