/**
 * Material library. Values are typical handbook figures for the named
 * alloys (e.g. ASM/MatWeb) and are adequate for a preliminary study. A
 * production analysis would take properties from the actual mill certificate.
 */
import type { Material } from "./model";

export const MATERIALS: Record<string, Material> = {
  "aluminum-6061-t6": {
    id: "aluminum-6061-t6",
    name: "Aluminum 6061-T6",
    youngsModulus_Pa: 68.9e9,
    density_kg_m3: 2700,
    yieldStrength_Pa: 276e6,
  },
  "steel-a36": {
    id: "steel-a36",
    name: "Structural steel (A36)",
    youngsModulus_Pa: 200e9,
    density_kg_m3: 7850,
    yieldStrength_Pa: 250e6,
  },
  "titanium-6al-4v": {
    id: "titanium-6al-4v",
    name: "Titanium Ti-6Al-4V",
    youngsModulus_Pa: 113.8e9,
    density_kg_m3: 4430,
    yieldStrength_Pa: 880e6,
  },
};

export const DEFAULT_MATERIAL_ID = "aluminum-6061-t6";

export function getMaterial(id: string): Material {
  const m = MATERIALS[id];
  if (!m) throw new Error(`unknown material "${id}"`);
  return m;
}
