import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { NavBar } from "../components/NavBar";
import { usePageMeta } from "../hooks/usePageMeta";
import css from "../styles/workspace.css?inline";
import { EvidenceSection } from "./workspace/EvidenceSection";
import { AutonomousPanel } from "./workspace/AutonomousPanel";
import { ExperimentPanel } from "./workspace/ExperimentPanel";
import { LearningSection } from "./workspace/LearningSection";
import { MemberLearningPanel } from "./workspace/MemberLearningPanel";
import { ParetoSection } from "./workspace/ParetoSection";
import { RobustnessPanel } from "./workspace/RobustnessPanel";
import { SpecPanel } from "./workspace/SpecPanel";
import { Viewport } from "./workspace/Viewport";
import { DOMAIN_LABELS } from "./workspace/model";
import { useWorkspace } from "./workspace/useWorkspace";

export function WorkspacePage() {
  usePageMeta(
    "Engineering workspace — NeuroForge",
    "Specify a structural or robotics problem, run a real physics-based optimization in your browser, and inspect the evidence."
  );
  const ws = useWorkspace();
  const isArm = ws.problem.domain === "robotics";

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
                <span>/</span>{DOMAIN_LABELS[ws.problem.domain].split(":")[0]} engineering
              </div>
              <h1>{ws.problem.title}</h1>
              <p>Specify the problem. Run the search. Inspect the evidence.</p>
            </div>
            <div className="actions">
              <span className="pill">
                <i className="dot" /> Live solver · {isArm ? "static kinematics and beam bending" : "linear-static FEA"} · runs in a Web Worker
              </span>
            </div>
          </div>
          <div className="notice">
            <strong>Preliminary analysis</strong>
            <span>
              {isArm
                ? "Every number on this page comes from a deterministic static model of a two-link arm: closed-form inverse kinematics, gravity torques and Euler-Bernoulli bending of tubular links at each task point. It is a real computation, not a validated design: dynamics, joint limits, actuators, joint compliance and fatigue are outside the model."
                : "Every number on this page comes from a deterministic finite-element model of a pin-jointed truss with Euler buckling and serviceability checks. It is a real computation, not a validated engineering design: joints, fatigue, dynamics, fabrication tolerances and code compliance are outside the model."}
            </span>
          </div>
          <AutonomousPanel ws={ws} />
          <div className="workspace">
            <SpecPanel ws={ws} />
            <Viewport ws={ws} />
            <ExperimentPanel ws={ws} />
          </div>
          <ParetoSection ws={ws} />
          <RobustnessPanel ws={ws} />
          <EvidenceSection ws={ws} />
          <LearningSection ws={ws} />
          <MemberLearningPanel ws={ws} />
        </main>
        <Footer
          current="workspace"
          links={[
            { label: "Home", to: "/", page: "home" },
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
