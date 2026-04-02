import { evaluateFsc } from "../../src/services/fsc-evaluator";

const base = () =>
  ({
    start_event_present: true,
    terminal_or_abandonment_present: true,
    valid_timestamp_ratio: 0.96,
    ordering_reconstructable: true,
    trace_count: 1,
    retry_sequences_linkable: true,
    error_occurred: false,
    error_event_present: false
  }) as const;

describe("evaluateFsc", () => {
  it("eligible when all checks pass", () => {
    const r = evaluateFsc(base());
    expect(r.eligible).toBe(true);
    expect(r.failed_checks).toEqual([]);
    expect(r.checks.boundary_integrity).toBe(true);
    expect(r.checks.temporal_integrity).toBe(true);
    expect(r.checks.trace_integrity).toBe(true);
    expect(r.checks.error_visibility).toBe(true);
  });

  it("fails boundary integrity when start missing", () => {
    const r = evaluateFsc({ ...base(), start_event_present: false });
    expect(r.eligible).toBe(false);
    expect(r.failed_checks).toContain("boundary_integrity");
    expect(r.checks.boundary_integrity).toBe(false);
  });

  it("fails temporal integrity when timestamp ratio below 0.95", () => {
    const r = evaluateFsc({ ...base(), valid_timestamp_ratio: 0.94 });
    expect(r.eligible).toBe(false);
    expect(r.failed_checks).toContain("temporal_integrity");
  });

  it("fails trace integrity when no trace", () => {
    const r = evaluateFsc({ ...base(), trace_count: 0 });
    expect(r.eligible).toBe(false);
    expect(r.failed_checks).toContain("trace_integrity");
  });

  it("fails error visibility when error occurred without error event", () => {
    const r = evaluateFsc({
      ...base(),
      error_occurred: true,
      error_event_present: false
    });
    expect(r.eligible).toBe(false);
    expect(r.failed_checks).toContain("error_visibility");
  });

  it("fails trace integrity when retry sequences not linkable", () => {
    const r = evaluateFsc({ ...base(), retry_sequences_linkable: false });
    expect(r.eligible).toBe(false);
    expect(r.failed_checks).toContain("trace_integrity");
  });
});
