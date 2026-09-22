import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Arrow } from "../components/Arrow";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";
import { usePageMeta } from "../hooks/usePageMeta";
import css from "../styles/projects.css?inline";
import { FeaturedStudy } from "./projects/FeaturedStudy";
import { stashPendingProblem } from "../app/store";
import { interpretBrief } from "../engine/interpret";

type Category = "structural" | "robotics" | "fluids" | "thermal";
type Filter = "all" | Category;

interface Project {
  id: string;
  category: Category;
  drawingLabel: string;
  drawingType: string;
  drawingAriaLabel: string;
  drawing: JSX.Element;
  title: string;
  body: string;
  constraints: string[];
  detailsText: string;
  discipline: string;
  workspaceHref: string;
  /** True when the engine can simulate this brief today. */
  runnable: boolean;
  brief: string;
}

/** The five catalog cards, content verbatim from the legacy page. */
const PROJECTS: Project[] = [
  {
    id: "bridge",
    category: "structural",
    drawingLabel: "01 / STRUCTURAL",
    drawingType: "PARAMETRIC TRUSS / FEA",
    drawingAriaLabel: "Bridge truss concept",
    drawing: (
      <path d="M100 111 160 52 228 43 294 65 354 137 100 111 160 118 228 125 294 131 354 137M100 111 228 43 160 118 160 52 228 125 294 65 294 131 228 43 354 137M100 111l38-22 254 26-38 22m-194-85 38-22 68-9 66 22 60 72m-164-72 38-22m28 44 38-22" />
    ),
    title: "Bridge optimization",
    body: "Span 2 meters and support 500 N with the least possible mass. Let the search decide where the material belongs.",
    constraints: ["2 m span", "500 N", "Minimize mass"],
    detailsText:
      "Node positions, member connectivity, and cross-sections. Review material, support conditions, and deflection limits before running structural analysis.",
    discipline: "Structural mechanics",
    workspaceHref: "/workspace?project=bridge",
    runnable: true,
    brief: "Design a lightweight bridge spanning 2 meters that supports 500 N.",
  },
  {
    id: "drone",
    category: "structural",
    drawingLabel: "02 / AEROSPACE",
    drawingType: "FRAME GEOMETRY / FEA",
    drawingAriaLabel: "Four-armed drone frame concept",
    drawing: (
      <>
        <path d="m229 69 29-8 27 18-9 24-30 8-27-19zM229 69l-57-28-16 9 63 42m39-31 66-30 18 9-57 39m-9 24 61 27 17-10-69-41m-39 32-68 25-17-12 58-32" />
        <ellipse cx="160" cy="40" rx="30" ry="13" />
        <ellipse cx="337" cy="29" rx="30" ry="13" />
        <ellipse cx="354" cy="133" rx="30" ry="13" />
        <ellipse cx="164" cy="137" rx="30" ry="13" />
        <path d="m229 69 47 34m-18-42-12 50" opacity=".5" />
      </>
    ),
    title: "A lighter drone frame",
    body: "Reduce frame mass without trading away strength. Explore arm geometry and material distribution under load.",
    constraints: ["Safety factor ≥ 2", "Minimize mass"],
    detailsText:
      "Arm cross-sections, rib placement, and central plate geometry. Define motor spacing, thrust loads, mounting points, and material in the workspace.",
    discipline: "Structural mechanics",
    workspaceHref: "/workspace?project=drone",
    runnable: false,
    brief: "Design a drone frame that minimizes mass while maintaining a safety factor of 2.",
  },
  {
    id: "robot",
    category: "robotics",
    drawingLabel: "03 / ROBOTICS",
    drawingType: "LINK GEOMETRY / KINEMATICS",
    drawingAriaLabel: "Articulated robot arm concept",
    drawing: (
      <>
        <path d="m180 139 45-12 38 12-44 15zM205 131V99l42-61 18 9-36 59v24M247 38l66 24 2 16-62-21m60 5 31-24 12 9-41 31m29-40 20-4 9 10-8 12-15-2" />
        <circle cx="254" cy="48" r="12" />
        <circle cx="219" cy="104" r="10" />
        <circle cx="313" cy="69" r="8" />
        <path
          d="M160 120a78 78 0 0 1 93-108"
          stroke="#7c8cff"
          strokeDasharray="4 5"
        />
      </>
    ),
    title: "A more efficient robot arm",
    body: "Lift a 2 kg payload with less motor torque. Find the balance between reach, link length, and moving mass.",
    constraints: ["2 kg payload", "Minimize torque"],
    detailsText:
      "Link lengths and cross-sections, evaluated across your working envelope. Set reach, joint limits, motion profile, and material before comparing candidates.",
    discipline: "Mechanical design",
    workspaceHref: "/workspace?project=robot",
    runnable: false,
    brief: "Design a robotic arm that can lift 2 kg while minimizing motor torque.",
  },
  {
    id: "airflow",
    category: "fluids",
    drawingLabel: "04 / FLUIDS",
    drawingType: "DUCT PROFILE / CFD",
    drawingAriaLabel: "Curved duct with flow streamlines",
    drawing: (
      <>
        <path
          d="M123 119h92q39 0 39-40V31h79v49q0 98-112 73h-98z"
          stroke="#5c7e70"
        />
        <path
          d="M100 127h112q55 0 55-48V20M100 136h113q67 0 67-58V20M100 145h119q74 0 74-67V20M111 155h108q89 0 89-77V20"
          stroke="#7c8cff"
        />
        <path d="m97 119 26 0v34H97zM254 31l17-11h79l-17 11M333 80l17-12V20" />
      </>
    ),
    title: "Airflow without the losses",
    body: "Move air through a bend with less pressure loss. Search for a duct profile that keeps flow attached.",
    constraints: ["Maximize airflow", "Minimize pressure loss"],
    detailsText:
      "Bend radius, cross-section transitions, and guide-vane geometry. Supply inlet conditions, outlet pressure, and the available installation envelope.",
    discipline: "Fluid dynamics",
    workspaceHref: "/workspace?project=airflow",
    runnable: false,
    brief: "Move air through a 90 degree duct bend with minimum pressure loss.",
  },
  {
    id: "thermal",
    category: "thermal",
    drawingLabel: "05 / THERMAL",
    drawingType: "FIN ARRAY / HEAT TRANSFER",
    drawingAriaLabel: "Heatsink fin geometry concept",
    drawing: (
      <>
        <path d="m158 112 115-49 90 46-115 49zM158 112v10l90 46 115-49v-10M248 158v10" />
        <path d="M170 108V65l112 56v22zm18-8V57l112 56v22zm18-8V49l112 56v22zm18-8V41l112 56v22zm18-8V33l112 56v22z" />
        <path
          d="M197 35v-17m35 6V7m36 12V3"
          stroke="#7c8cff"
          strokeDasharray="3 4"
        />
      </>
    ),
    title: "A cooler 100 W processor",
    body: "Keep a processor below 80°C. Explore how fin spacing and geometry change the path heat takes out.",
    constraints: ["100 W heat load", "Temperature < 80°C"],
    detailsText:
      "Fin height, thickness, spacing, and base dimensions. Specify ambient temperature, airflow, material, and contact resistance to make the thermal model meaningful.",
    discipline: "Thermal engineering",
    workspaceHref: "/workspace?project=thermal",
    runnable: false,
    brief: "Design a heatsink that keeps a 100 W processor below 80°C.",
  },
];

/** Mirrors the legacy `card.textContent.toLowerCase().includes(term)` — the
 *  concatenation of every piece of text rendered inside a card. */
function searchableText(p: Project): string {
  return [
    p.drawingLabel,
    p.drawingType,
    p.title,
    p.body,
    ...p.constraints,
    "What the engine explores",
    p.detailsText,
    p.discipline,
    "Use this brief →",
  ]
    .join(" ")
    .toLowerCase();
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All projects" },
  { id: "structural", label: "Structural" },
  { id: "robotics", label: "Robotics" },
  { id: "fluids", label: "Fluids" },
  { id: "thermal", label: "Thermal" },
];

export function ProjectsPage() {
  usePageMeta(
    "Explore projects — NeuroForge",
    "Explore engineering challenges in structures, robotics, airflow, and thermal design. Start with an editable brief and investigate the design space with NeuroForge."
  );

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<Filter>("all");
  const [view, setView] = useState<"baseline" | "optimized">("optimized");
  const searchRef = useRef<HTMLInputElement>(null);

  const searchable = useMemo(() => PROJECTS.map(searchableText), []);
  const needle = term.trim().toLowerCase();
  const visible = PROJECTS.map(
    (p, i) =>
      (category === "all" || category === p.category) &&
      searchable[i].includes(needle)
  );
  const visibleCount = visible.filter(Boolean).length;

  function reset() {
    setTerm("");
    setCategory("all");
    searchRef.current?.focus();
  }

  const optimized = view === "optimized";

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <NavBar current="projects" />
        <main>
          <section className="intro">
            <div>
              <h1>Problems worth exploring.</h1>
              <p>
                Start with an engineering challenge, not a blank canvas. Choose
                a brief, adjust the constraints, and search for a better design.
              </p>
            </div>
            <div className="library-note">
              <b>05 BRIEFS · 1 SIMULATED TODAY</b>Editable constraints. Open-ended
              solutions.
            </div>
          </section>
          <FeaturedStudy />
          <p className="disclaimer">
            Linear-static truss analysis with Euler buckling and serviceability checks. A preliminary study under identical
            loads, material and acceptance criteria, not a validated engineering result.
          </p>
          <section className="catalog" aria-labelledby="catalog-title">
            <div className="catalog-top">
              <h2 id="catalog-title">Choose your starting point.</h2>
              <label className="search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10" cy="10" r="6" />
                  <path d="m15 15 6 6" />
                </svg>
                <input
                  id="search"
                  ref={searchRef}
                  type="search"
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </label>
            </div>
            <div className="filter-row">
              <div className="filters" aria-label="Filter projects by discipline">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    aria-pressed={category === f.id}
                    onClick={() => setCategory(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="count" id="count" role="status">
                {visibleCount} starter project{visibleCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid">
              {PROJECTS.map((p, i) => (
                <article
                  key={p.id}
                  className="project"
                  data-category={p.category}
                  hidden={!visible[i]}
                >
                  <div className="drawing">
                    <span>{p.drawingLabel}</span>
                    <svg
                      viewBox="0 0 500 168"
                      role="img"
                      aria-label={p.drawingAriaLabel}
                    >
                      {p.drawing}
                    </svg>
                    <span className="type">{p.drawingType}</span>
                  </div>
                  <div className="project-body">
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                    <div className="constraints">
                      {p.constraints.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                    <details>
                      <summary>What the engine explores</summary>
                      <p>{p.detailsText}</p>
                    </details>
                    <div className="project-bottom">
                      <span>
                        {p.discipline}
                        <em className={`chip ${p.runnable ? "chip-live" : "chip-roadmap"}`}>{p.runnable ? "simulated" : "roadmap"}</em>
                      </span>
                      {p.runnable ? (
                        <Link
                          to="/workspace"
                          onClick={() => {
                            const r = interpretBrief(p.brief);
                            if (r.supported) stashPendingProblem({ problem: r.problem, extracted: r.extracted });
                          }}
                        >
                          Open in workspace <span aria-hidden="true">→</span>
                        </Link>
                      ) : (
                        <Link to="/technology#roadmap">Needs a {p.category} domain module <span aria-hidden="true">→</span></Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="empty" id="empty" hidden={visibleCount !== 0}>
              <h3>No matching projects.</h3>
              <p>Try “bridge”, “airflow”, or a different discipline.</p>
              <button className="reset" id="reset" onClick={reset}>
                Clear search and filters
              </button>
            </div>
          </section>
          <section className="method">
            <div>
              <h2>
                A brief is the beginning.
                <br />
                Not a finished design.
              </h2>
              <p>
                These projects define a search problem, not a library of
                answers. Every run starts with assumptions you can inspect.
              </p>
              <Link className="text-link" to="/technology">
                See how the engine works <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ol>
              <li>Review loads, materials, and boundary conditions.</li>
              <li>Generate candidates and test them against physics.</li>
              <li>Use surrogate predictions to guide the next generation.</li>
              <li>Validate finalists and compare against your baseline.</li>
            </ol>
          </section>
          <section className="cta">
            <div>
              <h2>Your problem isn't on the list?</h2>
              <p>Bring your own brief. Start by defining what success looks like.</p>
            </div>
            <Link className="button" to="/workspace">
              Start a custom project <Arrow />
            </Link>
          </section>
        </main>
        <Footer
          current="projects"
          links={[
            { label: "Technology", to: "/technology", page: "technology" },
            { label: "Projects", to: "/projects", page: "projects" },
            { label: "Benchmarks", to: "/benchmarks", page: "benchmarks" },
            { label: "Workspace", to: "/workspace", page: "workspace" },
          ]}
        />
      </div>
    </>
  );
}
