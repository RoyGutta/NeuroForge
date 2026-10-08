import { describe, expect, test } from "vitest";
import { interpretBrief } from "../../../src/engine/interpret";
import { interpreterReference } from "../../fixtures/interpreterReference";

/**
 * The rule-based interpreter was refactored onto the candidate-spec contract
 * in v1.4. This fixture holds its v1.3 outputs on every benchmark brief; the
 * only permitted difference is the new provenance tag on extracted values.
 */
describe("rule-based interpreter reproduces its pre-contract outputs", () => {
  for (const ref of interpreterReference) {
    test(ref.brief, () => {
      const r = interpretBrief(ref.brief);
      expect(r.supported).toBe(ref.supported);
      if (!ref.supported) {
        if (r.supported) return;
        expect(r.reason).toBe(ref.reason);
        expect(r.detectedDomain).toBe(ref.detectedDomain);
        expect(r.kind).toBe("unsupported-domain");
        return;
      }
      if (!r.supported) return;
      const { id: _id, createdAt: _c, ...problem } = r.problem;
      expect(problem).toEqual(ref.problem);
      expect(r.extracted.map(({ provenance: _p, ...e }) => e)).toEqual(ref.extracted);
      expect(r.warnings).toEqual(ref.warnings);
      for (const e of r.extracted) expect(e.provenance).toBe(e.field === "objective" || e.field === "domain" ? "inferred" : "explicit");
      expect(r.validation).toEqual([]);
      expect(r.diagnostics.kind).toBe("rule");
      expect(r.diagnostics.costUsd).toBe(0);
    });
  }
});
