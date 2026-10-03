import type { LabRecord } from "../../engine/autonomous/lab";

/** The discovery report rendered as a lab report. Text comes from the record; nothing is added here. */
export function LabReportView({ record }: { record: LabRecord }) {
  const d = record.report.discovery;
  const u = record.report.uncertainty;
  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <>
      <h3>{title}</h3>
      <ul>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </>
  );
  return (
    <article className="lab-text" aria-label="Lab report">
      <h3>{d.title}</h3>
      <p>
        <b>Question.</b> {d.question}
      </p>
      <Section title="Method" items={d.method} />
      <Section title="Results" items={d.results} />
      <h3>Uncertainty</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Source</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {u.entries
            .filter((e) => e.kind !== "model-form" || e.source === "analysis fidelity")
            .map((e, i) => (
              <tr key={i}>
                <td>{e.kind}</td>
                <td>{e.source}</td>
                <td className={e.status === "quantified" ? "green" : e.status === "not-modelled" ? "bad" : undefined}>{e.status}</td>
                <td>{e.evidence}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="fine">
        {u.entries.filter((e) => e.kind === "model-form").length - 1} model-form assumptions are listed in the specification panel with their confidence.
      </p>
      <Section title="Limitations" items={d.limitations} />
      <Section title="Reproducibility" items={d.reproducibility} />
      <h3>Conclusion</h3>
      <p className="conclusion">{d.conclusion}</p>
    </article>
  );
}
