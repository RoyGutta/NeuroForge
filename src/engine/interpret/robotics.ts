/**
 * Rule-based extraction for planar manipulator briefs: payload, reach,
 * safety factor, material and the objective (torque or mass).
 */
import { extractLength, extractLoad, extractMaterial, extractSafetyFactor, GRAVITY_M_S2 } from "./extract";
import { explicitField } from "./realize";
import { emptySpec, type CandidateSpec, type SpecField } from "./spec";

export function extractRoboticsSpec(text: string): CandidateSpec {
  const spec = emptySpec();
  spec.domain = "robotics";
  spec.detectedDomain = "robotics";
  const fields: SpecField[] = [];

  const load = extractLoad(text);
  if (load) {
    const f = explicitField("payload_kg", load.value / GRAVITY_M_S2, load.span, load.note ? "Given as a force; converted to mass with g = 9.80665 m/s^2." : undefined);
    f.rawValue = load.value;
    f.rawUnit = "N";
    fields.push(f);
  } else spec.missing.push("payload_kg");

  const reach = extractLength(text, /\b(reach|radius|within|extend|extends|envelope|workspace|far)\b/i);
  if (reach) fields.push(explicitField("reach_m", reach.value, reach.span));
  else spec.missing.push("reach_m");

  const sf = extractSafetyFactor(text);
  if (sf) fields.push(explicitField("safetyFactor", sf.value, sf.span));
  else spec.missing.push("safetyFactor");
  const material = extractMaterial(text);
  if (material) fields.push(explicitField("materialId", material.value, material.span));
  else spec.missing.push("materialId");

  const mentionsTorque = /\b(torque|motor|actuator)\b/i.test(text);
  const wantsMass = /\b(light|lightweight|mass|weight)\b/i.test(text) && !mentionsTorque;
  fields.push({ id: "objective", value: wantsMass ? "mass_kg" : "peakTorque_Nm", provenance: "inferred", confidence: wantsMass || mentionsTorque ? "high" : "medium" });
  spec.fields = fields;
  return spec;
}
