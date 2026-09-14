import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";
import { usePageMeta } from "../hooks/usePageMeta";
import css from "../styles/workspace.css?inline";
import { EvidenceSection } from "./workspace/EvidenceSection";
import { ExperimentPanel } from "./workspace/ExperimentPanel";
import { SpecPanel } from "./workspace/SpecPanel";
import { Viewport } from "./workspace/Viewport";
import { useWorkspace } from "./workspace/useWorkspace";

export function WorkspacePage() {
  usePageMeta(
    "Engineering workspace — NeuroForge",
    "Specify a structural problem, run a real finite-element optimization in your browser, and inspect the evidence."
  );
  const ws = useWorkspace();

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <NavBar current="workspace" />
        <main>
          <div className="heading">
            <div>
              <div className="crumb">
                <Link to="/projects">Projects</Link>
                <span>/</span>Structural engineering
              </div>
              <h1>{ws.problem.title}</h1>
              <p>Specify the problem. Run the search. Inspect the evidence.</p>
            </div>
            <div className="actions">
              <span className="pill">
                <i className="dot" /> Live solver · linear-static FEA · runs in a Web Worker
              </span>
            </div>
          </div>
          <div className="notice">
            <strong>Preliminary analysis</strong>
            <span>
              Every number on this page comes from a deterministic finite-element model of a pin-jointed truss with Euler buckling and
              serviceability checks. It is a real computation, not a validated engineering design: joints, fatigue, dynamics,
              fabrication tolerances and code compliance are outside the model.
            </span>
          </div>
          <div className="workspace">
            <SpecPanel ws={ws} />
            <Viewport ws={ws} />
            <ExperimentPanel ws={ws} />
          </div>
          <EvidenceSection ws={ws} />
        </main>
        <Footer
          current="workspace"
          links={[
            { label: "Home", to: "/", page: "home" },
            { label: "Technology", to: "/technology", page: "technology" },
            { label: "Projects", to: "/projects", page: "projects" },
            { label: "Workspace", to: "/workspace", page: "workspace" },
          ]}
        />
      </div>
    </>
  );
}
