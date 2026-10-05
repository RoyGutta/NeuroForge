import type { DomainId } from "../../engine/core/problem";
import { listDomains } from "../../engine/domains/registry";
import { MATERIALS } from "../../engine/domains/structural/truss/materials";
import type { Workspace } from "./useWorkspace";
import { DOMAIN_LABELS, type FieldSource, type ObjectiveChoice } from "./model";

const SOURCE_LABEL: Record<FieldSource, string> = { brief: "from brief", assumed: "assumed", user: "set by you" };

export function SpecPanel({ ws }: { ws: Workspace }) {
  const { form, updateForm, applyForm, switchDomain, interpret, interpretation, problem, issues, status } = ws;
  const busy = status === "running";
  const isArm = form.domain === "robotics";
  const isHeat = form.domain === "thermal";
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
          <label htmlFor="domain">Engineering domain</label>
          <select id="domain" value={form.domain} disabled={busy} onChange={(e) => switchDomain(e.target.value as DomainId)}>
            {listDomains().map((d) => (
              <option key={d.id} value={d.id}>
                {DOMAIN_LABELS[d.id as DomainId] ?? d.label}
              </option>
            ))}
          </select>
        </div>
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
            <select id="objective" aria-label="Objective" value={form.objective} onChange={(e) => updateForm({ objective: e.target.value as ObjectiveChoice })}>
              {isArm ? (
                <>
                  <option value="peakTorque_Nm">Minimize peak joint torque</option>
                  <option value="mass_kg">Minimize link mass</option>
                  <option value="multi">Trade off torque against mass (Pareto front)</option>
                </>
              ) : isHeat ? (
                <>
                  <option value="mass_kg">Minimize mass</option>
                  <option value="thermalResistance_K_W">Minimize thermal resistance (coolest within a mass budget)</option>
                  <option value="multi">Trade off mass against thermal resistance (Pareto front)</option>
                </>
              ) : (
                <>
                  <option value="mass_kg">Minimize mass</option>
                  <option value="compliance_J">Minimize compliance (stiffest within a mass budget)</option>
                  <option value="multi">Trade off mass against compliance (Pareto front)</option>
                </>
              )}
            </select>
          </div>
          {(form.objective === "compliance_J" || form.objective === "thermalResistance_K_W") && (
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
          {isHeat && (
            <>
              <div className="two">
                <div className="field">
                  <label htmlFor="power">Dissipated power {src("power_W")}</label>
                  <div className="unit-field">
                    <input id="power" type="number" min="0.1" max="5000" step="1" required value={form.power_W} onChange={(e) => updateForm({ power_W: e.target.value }, "power_W")} />
                    <span>W</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="tmax">Temperature limit {src("maxTemperature_C")}</label>
                  <div className="unit-field">
                    <input id="tmax" type="number" min="-20" max="300" step="1" required value={form.maxTemperature_C} onChange={(e) => updateForm({ maxTemperature_C: e.target.value }, "maxTemperature_C")} />
                    <span>C</span>
                  </div>
                </div>
              </div>
              <div className="two">
                <div className="field">
                  <label htmlFor="ambient">Ambient {src("ambient_C")}</label>
                  <div className="unit-field">
                    <input id="ambient" type="number" min="-40" max="100" step="1" required value={form.ambient_C} onChange={(e) => updateForm({ ambient_C: e.target.value }, "ambient_C")} />
                    <span>C</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="footprint">Base footprint</label>
                  <div className="unit-field">
                    <input id="footprint" type="number" min="10" max="1000" step="5" required value={form.baseWidth_mm} onChange={(e) => updateForm({ baseWidth_mm: e.target.value, baseDepth_mm: e.target.value })} aria-label="Base width and depth in millimetres" />
                    <span>mm square</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {isArm ? (
            <div className="two">
              <div className="field">
                <label htmlFor="payload">Payload {src("payload_kg")}</label>
                <div className="unit-field">
                  <input id="payload" type="number" min="0.01" max="1000" step="0.1" required value={form.payload_kg} onChange={(e) => updateForm({ payload_kg: e.target.value }, "payload_kg")} />
                  <span>kg</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="reach">Reach {src("reach_m")}</label>
                <div className="unit-field">
                  <input id="reach" type="number" min="0.05" max="10" step="0.05" required value={form.reach_m} onChange={(e) => updateForm({ reach_m: e.target.value }, "reach_m")} />
                  <span>m</span>
                </div>
              </div>
            </div>
          ) : isHeat ? null : (
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
          )}
          {!isHeat && (
          <div className="two">
            <div className="field">
              <label htmlFor="sf">Safety factor {src("safetyFactor")}</label>
              <input id="sf" type="number" min="1" max="10" step="0.1" required value={form.safetyFactor} onChange={(e) => updateForm({ safetyFactor: e.target.value }, "safetyFactor")} />
            </div>
            {isArm ? (
              <div className="field">
                <label htmlFor="tipdefl">Tip deflection limit</label>
                <div className="unit-field">
                  <input id="tipdefl" type="number" min="0.05" max="100" step="0.05" required value={form.tipDeflection_mm} onChange={(e) => updateForm({ tipDeflection_mm: e.target.value })} />
                  <span>mm</span>
                </div>
              </div>
            ) : (
            <div className="field">
              <label htmlFor="defl">Deflection limit</label>
              <div className="unit-field">
                <input id="defl" type="number" min="50" max="2000" step="10" required value={form.deflectionRatio} onChange={(e) => updateForm({ deflectionRatio: e.target.value })} />
                <span>L / n</span>
              </div>
            </div>
            )}
          </div>
          )}
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
          {isHeat && (
            <>
              <div className="boundary">
                <span>Convection</span>
                <b>Natural, vertical fins, still air</b>
              </div>
              <div className="boundary">
                <span>Variables</span>
                <b>Fin height · fin thickness · fin pitch · base thickness</b>
              </div>
              <div className="boundary">
                <span>Fins</span>
                <b>Rectangular plate fins across the base width; gap at least 2 mm</b>
              </div>
            </>
          )}
          {isArm ? (
            <>
              <div className="boundary">
                <span>Base</span>
                <b>Fixed at the origin · gravity in-plane</b>
              </div>
              <div className="boundary">
                <span>Variables</span>
                <b>Two link lengths · two tube radii</b>
              </div>
              <div className="boundary">
                <span>Section</span>
                <b>Hollow round tube, inner radius 0.8 x outer</b>
              </div>
              <div className="boundary">
                <span>Task points</span>
                <b>{problem.geometry.kind === "planar-manipulator" ? `${problem.geometry.taskPoints.length} static holds across the envelope` : "—"}</b>
              </div>
            </>
          ) : isHeat ? null : (
          <>
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
          </>
          )}

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
