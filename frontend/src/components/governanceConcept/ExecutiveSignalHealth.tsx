import {
  GOVERNANCE_EXEC_MEANING_LINES,
  GOVERNANCE_EXEC_SIGNAL_GROUPS,
  GOVERNANCE_EXEC_SIGNAL_SECTION,
  GOVERNANCE_FORBIDDEN_TERMS
} from "../../constants/governanceConcept";

export function ExecutiveSignalHealth() {
  return (
    <section className="gc-card gc-exec-section">
      <div className="gc-exec-header">
        <p className="gc-mono">Executive and CISO View</p>
        <h2>{GOVERNANCE_EXEC_SIGNAL_SECTION.title}</h2>
        <p>{GOVERNANCE_EXEC_SIGNAL_SECTION.subtitle}</p>
      </div>

      <div className="gc-exec-grid">
        {GOVERNANCE_EXEC_SIGNAL_GROUPS.map((group) => (
          <article key={group.heading} className="gc-exec-col">
            <div className="gc-exec-col-head">
              <h3>{group.heading}</h3>
              <span className={`gc-tag gc-tag-${group.tone}`}>{group.tone.toUpperCase()}</span>
            </div>
            <ul className="gc-exec-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="gc-exec-meanings">
        {GOVERNANCE_EXEC_MEANING_LINES.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <details className="gc-exec-forbidden">
        <summary className="gc-mono">Language guardrails (forbidden terms)</summary>
        <div className="gc-chip-row">
          {GOVERNANCE_FORBIDDEN_TERMS.map((term) => (
            <span key={term} className="chip">{term}</span>
          ))}
        </div>
      </details>
    </section>
  );
}
