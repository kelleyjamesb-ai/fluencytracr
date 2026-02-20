// WhatChangedPanel — shared events timeline with client-side time-window filter.
// Governance: event data is org-level only. No individual attribution.
import { useMemo, useState } from "react";
import type { ComplianceEventsResponse } from "../../types/governance";

type TimeWindow = "7d" | "30d" | "60d" | "all";

const WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "60d", label: "60d" },
  { key: "all", label: "All" },
];

const windowMs: Record<TimeWindow, number | null> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "60d": 60 * 24 * 60 * 60 * 1000,
  all: null,
};

const formatEventType = (raw: string) =>
  raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type Props = {
  events: ComplianceEventsResponse["events"];
  isLoading?: boolean;
};

export function WhatChangedPanel({ events, isLoading }: Props) {
  const [window, setWindow] = useState<TimeWindow>("30d");

  const filtered = useMemo(() => {
    const ms = windowMs[window];
    if (ms === null) return events;
    const cutoff = Date.now() - ms;
    return events.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [events, window]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p className="gc-mono" style={{ margin: 0 }}>What Changed Since Last Review</p>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWindow(w.key)}
              className={window === w.key ? "gc-btn" : "gc-btn gc-btn-outline"}
              style={{ padding: "3px 10px", fontSize: 12 }}
              aria-pressed={window === w.key}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: "#888", fontSize: 13 }}>Loading events…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888", fontSize: 13 }}>
          No events in this window —{" "}
          <button
            type="button"
            onClick={() => setWindow("all")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#343CED", fontSize: 13, padding: 0, textDecoration: "underline" }}
          >
            expand to All
          </button>{" "}
          to see full history.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {filtered.map((ev) => (
            <li
              key={ev.event_id}
              style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#d8dbe4",
                  flexShrink: 0, marginTop: 5,
                }}
                aria-hidden="true"
              />
              <span>
                <strong>{formatEventType(ev.event_type)}</strong>
                {ev.policy_id && (
                  <span style={{ color: "#888" }}>
                    {" "}· policy {ev.policy_id.slice(0, 8)}
                  </span>
                )}
                {ev.status && (
                  <span style={{ color: "#888" }}> · {ev.status}</span>
                )}
                <br />
                <span style={{ color: "#aaa", fontSize: 11 }}>
                  {new Date(ev.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
