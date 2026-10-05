/**
 * Deterministic, rule-based brief interpreter.
 *
 * Covers the problem families the engine can solve (planar truss bridge and
 * planar manipulator). It detects other domains by keyword and declines them
 * explicitly, which is preferable to producing a bridge for a heat-sink brief. An LLM-
 * backed interpreter implementing the same `ProblemInterpreter` interface is
 * the intended next step; this one stays as the offline fallback and as the
 * reference for what a correct extraction looks like.
 */
import type { Assumption, ConstraintSpec } from "../core/problem";
import { compileProblem } from "../domains/registry";
import { createTrussBridgeProblem } from "../domains/structural/truss/template";
import { extractDeflectionRatio, extractLength, extractLoad, extractMassBudget, extractMaterial, extractSafetyFactor } from "./extract";
import { interpretRoboticsBrief } from "./robotics";
import { interpretThermalBrief } from "./thermal";
import type { ExtractedValue, InterpretResult, ProblemInterpreter } from "./types";

const DOMAIN_KEYWORDS: Array<[string, RegExp]> = [
  ["thermal", /\b(heat ?sink|heatsink|thermal|processor|cpu|temperature|cooling|°c|\bdeg)\b/i],
  ["robotics", /\b(robot|robotic|manipulator|gripper|torque|actuator|arm)\b/i],
  ["aerospace", /\b(drone|uav|quadcopter|wing|aircraft|airframe|fuselage)\b/i],
  ["fluids", /\b(duct|airflow|air flow|cfd|pressure (?:loss|drop)|pipe|nozzle)\b/i],
  ["structural", /\b(bridge|truss|beam|span|girder|footbridge|structure)\b/i],
];

export const ruleBasedInterpreter: ProblemInterpreter = {
  id: "rule-based-v1",
  label: "Rule-based interpreter",
  interpret(brief: string): InterpretResult {
    const text = brief.trim();
    const detected = detectDomain(text);
    if (detected === "robotics") return interpretRoboticsBrief(text, ruleBasedInterpreter.id);
    if (detected === "thermal") return interpretThermalBrief(text, ruleBasedInterpreter.id);
    if (detected && detected !== "structural") {
      return {
        supported: false,
        detectedDomain: detected,
        reason:
          `This brief reads as a ${detected} problem. NeuroForge currently solves planar truss bridges, planar manipulators and plate-fin heat sinks; ` +
          `${detected} domains are on the roadmap and are not simulated yet.`,
      };
    }

    const extracted: ExtractedValue[] = [];
    const warnings: string[] = [];
    const extraAssumptions: Assumption[] = [];

    const span = extractLength(text, /\b(span|spanning|spans|long|length)\b/i);
    if (span) extracted.push({ field: "span_m", value: span.value, confidence: "high", sourceSpan: span.span });
    else {
      extraAssumptions.push({
        id: "assume-span",
        field: "span",
        value: "2.0 m",
        reason: "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
        confidence: "low",
      });
    }

    const load = extractLoad(text);
    if (load) {
      extracted.push({ field: "load_N", value: load.value, confidence: "high", sourceSpan: load.span, note: load.note });
    } else {
      extraAssumptions.push({
        id: "assume-load",
        field: "load",
        value: "500 N",
        reason: "No load was found in the brief; 500 N is the canonical demonstration case.",
        confidence: "low",
      });
    }

    const sf = extractSafetyFactor(text);
    if (sf) extracted.push({ field: "safetyFactor", value: sf.value, confidence: "high", sourceSpan: sf.span });

    const material = extractMaterial(text);
    if (material) extracted.push({ field: "material", value: material.value, confidence: "high", sourceSpan: material.span });

    const deflection = extractDeflectionRatio(text);
    if (deflection) extracted.push({ field: "deflectionRatio", value: deflection.value, confidence: "high", sourceSpan: deflection.span });

    const wantsStiffness = /\b(stiff|stiffness|deflection|displacement|rigid)\b/i.test(text) &&
      !/\b(mass|weight|light|lightweight|material)\b/i.test(text.replace(/deflection limit/i, ""));
    extracted.push({
      field: "objective",
      value: wantsStiffness ? "minimize compliance" : "minimize mass",
      confidence: wantsStiffness || /\b(light|lightweight|mass|weight|minimi[sz]e)\b/i.test(text) ? "high" : "medium",
    });

    const base = {
      span_m: span?.value ?? 2,
      load_N: load?.value ?? 500,
      safetyFactor: sf?.value,
      materialId: material?.value,
      deflectionRatio: deflection?.value,
      brief: text,
    };

    let problem = createTrussBridgeProblem(base);
    if (wantsStiffness) {
      // Minimising compliance alone is unbounded (heavier is always stiffer),
      // so a mass budget is required. Use the conventional baseline's mass
      // unless the brief gives one.
      const massBudget = extractMassBudget(text);
      const budget = massBudget?.value ?? compileProblem(problem).evaluate(compileProblem(problem).baseline.parameters).metrics.mass_kg;
      const constraint: ConstraintSpec = {
        id: "mass-budget",
        metric: "mass_kg",
        op: "<=",
        limit: budget,
        label: `Mass <= ${budget.toFixed(3)} kg`,
        source: massBudget ? "user" : "assumed",
      };
      problem = createTrussBridgeProblem({ ...base, extraConstraints: [constraint], objectiveMetric: "compliance_J" });
      if (massBudget) {
        extracted.push({ field: "massBudget_kg", value: massBudget.value, confidence: "high", sourceSpan: massBudget.span });
      } else {
        extraAssumptions.push({
          id: "assume-mass-budget",
          field: "massBudget",
          value: `${budget.toFixed(3)} kg (mass of the conventional baseline)`,
          reason: "A stiffness objective needs a mass budget or the stiffest design is simply the heaviest; the brief gave none.",
          confidence: "medium",
        });
      }
    }

    problem.assumptions = [...extraAssumptions, ...problem.assumptions];
    problem.provenance = { source: "interpreter", sourceText: text, interpreter: ruleBasedInterpreter.id };
    problem.title = wantsStiffness ? "Stiffest bridge within a mass budget" : "Lightweight bridge study";
    if (!detected) warnings.push("No structural keywords found; interpreted as a truss bridge because span/load were present.");
    return { supported: true, problem, extracted, warnings };
  },
};

function detectDomain(text: string): string | null {
  for (const [domain, re] of DOMAIN_KEYWORDS) if (re.test(text)) return domain;
  return null;
}

