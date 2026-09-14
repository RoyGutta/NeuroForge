import { MATERIALS } from "../../engine/domains/structural/truss/materials";
import type { Workspace } from "./useWorkspace";
import type { FieldSource } from "./model";

const SOURCE_LABEL: Record<FieldSource, string> = { brief: "from brief", assumed: "assumed", user: "set by you" };

export function SpecPanel({ ws }: { ws: Workspace }) {
  const { form, updateForm, applyForm, interpret, interpretation, problem, issues, status } = ws;
  const busy = status === "running";
  const src = (k: keyof typeof form.sources) => (
    <em className={`src src-${form.sources[k] ?? "user"}`}>{SOURCE_LABEL[form.sources[k] ?? "user"]}</em>
  );

  return (
    <aside className="panel left" aria-labelledby="spec-title">
      <div className="panel-head">
        <h2 id="spec-title">Engineering specification</h2>
        <span className="tiny">v{problem.version}</span>
      </div>
      <div className="panel-body">
        <div className="field">
          <label htmlFor="brief">Brief</label>
          <textarea id="brief" value={form.brief} onChange={(e) => updateForm({ brief: e.target.value })} minLength={8} />
          <div className="row">
            <button type="button" onClick={interpret} disabled={busy}>
              Interpret brief
            </button>
            <span className="tiny">Rule-based parser · no LLM</span>
          </div>
          {interpretation && !interpretation.supported && (
            <p className="warn" role="status">
              {interpretation.reason}
            </p>
          )}
          {interpretation?.supported && interpretation.warnings.length > 0 && (
            <p className="warn" role="status">
              {interpretation.warnings.join(" ")}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyForm();
          }}
        >
          <p className="section-label">Objective</p>
          <div className="field">
            <select
              id="objective"
              aria-label="Objective"
              value={form.objective}
              onChange={(e) => updateForm({ objective: e.target.value as "mass_kg" | "compliance_J" })}
            >
              <option value="mass_kg">Minimize mass</option>
              <option value="compliance_J">Minimize compliance (stiffest within a mass budget)</option>
            </select>
          </div>
          {form.objective === "compliance_J" && (
            <div className="field">
              <label htmlFor="massBudget">Mass budget</label>
              <div className="unit-field">
                <input
                  id="massBudget"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.massBudget_kg}
                  placeholder="baseline mass"
                  onChange={(e) => updateForm({ massBudget_kg: e.target.value })}
                />
                <span>kg</span>
              </div>
            </div>
          )}

          <p className="section-label">Constraints</p>
          <div className="two">
            <div className="field">
              <label htmlFor="span">Span {src("span_m")}</label>
              <div className="unit-field">
                <input id="span" type="number" min="0.2" max="50" step="0.1" required value={form.span_m} onChange={(e) => updateForm({ span_m: e.target.value }, "span_m")} />
                <span>m</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="load">Load {src("load_N")}</label>
              <div className="unit-field">
                <input id="load" type="number" min="1" max="1000000" step="1" required value={form.load_N} onChange={(e) => updateForm({ load_N: e.target.value }, "load_N")} />
                <span>N</span>
              </div>
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="sf">Safety factor {src("safetyFactor")}</label>
              <input id="sf" type="number" min="1" max="10" step="0.1" required value={form.safetyFactor} onChange={(e) => updateForm({ safetyFactor: e.target.value }, "safetyFactor")} />
            </div>
            <div className="field">
              <label htmlFor="defl">Deflection limit</label>
              <div className="unit-field">
                <input id="defl" type="number" min="50" max="2000" step="10" required value={form.deflectionRatio} onChange={(e) => updateForm({ deflectionRatio: e.target.value })} />
                <span>L / n</span>
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="material">Material {src("materialId")}</label>
            <select id="material" value={form.materialId} onChange={(e) => updateForm({ materialId: e.target.value }, "materialId")}>
              {Object.values(MATERIALS).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <p className="section-label">Design space</p>
          <div className="two">
            <div className="field">
              <label htmlFor="panels">Truss panels</label>
              <select id="panels" value={form.panels} onChange={(e) => updateForm({ panels: e.target.value })}>
                {[2, 4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} panels · {5 * n - 1} variables
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="selfweight">Self-weight</label>
              <select id="selfweight" value={form.includeSelfWeight ? "1" : "0"} onChange={(e) => updateForm({ includeSelfWeight: e.target.value === "1" })}>
                <option value="1">Included</option>
                <option value="0">Neglected</option>
              </select>
            </div>
          </div>
          <div className="boundary">
            <span>Supports</span>
            <b>Pin + roller</b>
          </div>
          <div className="boundary">
            <span>Variables</span>
            <b>Top-node heights · member areas</b>
          </div>
          <div className="boundary">
            <span>Section</span>
            <b>Solid round bar</b>
          </div>

          <button className="wide secondary" type="submit" disabled={busy} style={{ marginTop: 14 }}>
            Apply specification
          </button>
          {issues.length > 0 && (
            <ul className="issues" role="alert">
              {issues.map((i) => (
                <li key={i.path}>
                  <code>{i.path}</code> {i.message}
                </li>
              ))}
            </ul>
          )}
        </form>

        <hr className="divider" />
        <p className="section-label">Assumptions ({problem.assumptions.length})</p>
        <ul className="assumptions">
          {problem.assumptions.map((a) => (
            <li key={a.id}>
              <div className="assumption-head">
                <b>{a.field}</b>
                <span className={`conf conf-${a.confidence}`}>{a.confidence}</span>
              </div>
              <div className="assumption-value">{a.value}</div>
              <small>{a.reason}</small>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
