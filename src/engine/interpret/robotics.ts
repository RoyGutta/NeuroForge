/**
 * Rule-based extraction for planar manipulator briefs: payload, reach,
 * safety factor, material and the objective (torque or mass).
 */
import type { Assumption } from "../core/problem";
import { createManipulatorProblem } from "../domains/robotics/manipulator/template";
import { extractLength, extractLoad, extractMaterial, extractSafetyFactor, GRAVITY_M_S2 } from "./extract";
import type { ExtractedValue, InterpretResult } from "./types";

export function interpretRoboticsBrief(text: string, interpreterId: string): InterpretResult {
  const extracted: ExtractedValue[] = [];
  const assumptions: Assumption[] = [];

  const load = extractLoad(text);
  const payload_kg = load ? load.value / GRAVITY_M_S2 : 2;
  if (load) extracted.push({ field: "payload_kg", value: payload_kg, confidence: "high", sourceSpan: load.span, note: load.note ? "Given as a force; converted to mass with g = 9.80665 m/s^2." : undefined });
  else assumptions.push({ id: "assume-payload", field: "payload", value: "2 kg", reason: "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case.", confidence: "low" });

  const reach = extractLength(text, /\b(reach|radius|within|extend|extends|envelope|workspace|far)\b/i);
  if (reach) extracted.push({ field: "reach_m", value: reach.value, confidence: "high", sourceSpan: reach.span });
  else assumptions.push({ id: "assume-reach", field: "reach", value: "0.8 m", reason: "No reach or working radius was found in the brief; 0.8 m is the canonical demonstration case.", confidence: "low" });

  const sf = extractSafetyFactor(text);
  if (sf) extracted.push({ field: "safetyFactor", value: sf.value, confidence: "high", sourceSpan: sf.span });
  const material = extractMaterial(text);
  if (material) extracted.push({ field: "material", value: material.value, confidence: "high", sourceSpan: material.span });

  const mentionsTorque = /\b(torque|motor|actuator)\b/i.test(text);
  const wantsMass = /\b(light|lightweight|mass|weight)\b/i.test(text) && !mentionsTorque;
  extracted.push({ field: "objective", value: wantsMass ? "minimize mass" : "minimize peak torque", confidence: wantsMass || mentionsTorque ? "high" : "medium" });

  const problem = createManipulatorProblem({
    payload_kg,
    reach_m: reach?.value ?? 0.8,
    safetyFactor: sf?.value,
    materialId: material?.value,
    objectiveMetric: wantsMass ? "mass_kg" : "peakTorque_Nm",
    brief: text,
    title: wantsMass ? "Lightest manipulator study" : "Payload manipulator study",
  });
  problem.assumptions = [...assumptions, ...problem.assumptions];
  problem.provenance = { source: "interpreter", sourceText: text, interpreter: interpreterId };
  return { supported: true, problem, extracted, warnings: [] };
}
