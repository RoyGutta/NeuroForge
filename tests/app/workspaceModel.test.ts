import { describe, expect, test } from "vitest";
import { validateProblem } from "../../src/engine/domains/registry";
import { interpretBrief } from "../../src/engine/interpret";
import { defaultForm, formFromProblem, problemFromForm } from "../../src/pages/workspace/model";

describe("workspace form <-> problem mapping", () => {
  test("default form produces a valid problem with the canonical values", () => {
    const p = problemFromForm(defaultForm());
    expect(validateProblem(p)).toEqual([]);
    expect(p.geometry.span_m).toBe(2);
    expect(p.loads[0].magnitude_N).toBe(500);
    expect(p.assumptions.map((a) => a.field)).toContain("safetyFactor");
  });

  test("round-trips an interpreted problem and preserves value provenance", () => {
    const r = interpretBrief("A 3 m steel bridge carrying 1.2 kN with a safety factor of 1.8");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    const form = formFromProblem(r.problem, r.extracted);
    expect(form.span_m).toBe("3");
    expect(form.load_N).toBe("1200");
    expect(form.sources.safetyFactor).toBe("brief");
    expect(form.sources.materialId).toBe("brief");
    const p2 = problemFromForm(form, r.problem);
    expect(p2.version).toBe(r.problem.version + 1);
    expect(p2.safetyFactor).toBe(1.8);
    expect(p2.material.id).toBe("steel-a36");
    expect(p2.assumptions.map((a) => a.field)).not.toContain("safetyFactor");
  });

  test("editing an assumed field marks it as user-set and drops the assumption", () => {
    const form = defaultForm();
    form.sources.safetyFactor = "user";
    form.safetyFactor = "3";
    const p = problemFromForm(form);
    expect(p.safetyFactor).toBe(3);
    expect(p.assumptions.map((a) => a.field)).not.toContain("safetyFactor");
  });

  test("a stiffness objective with a mass budget adds the budget constraint", () => {
    const form = defaultForm();
    form.objective = "compliance_J";
    form.massBudget_kg = "1.2";
    const p = problemFromForm(form);
    expect(p.objectives[0].metric).toBe("compliance_J");
    const c = p.constraints.find((x) => x.id === "mass-budget");
    expect(c?.limit).toBe(1.2);
    expect(validateProblem(p)).toEqual([]);
  });
});
