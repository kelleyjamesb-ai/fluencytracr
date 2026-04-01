import { evaluateMinimumSignalGate } from "../../src/services/minimum-signal-gate";

describe("evaluateMinimumSignalGate", () => {
  it("allows boundary + retry visibility", () => {
    const r = evaluateMinimumSignalGate({
      execution_boundary_present: true,
      retry_visibility: true,
      step_logs_present: false,
      error_visibility: false
    });
    expect(r.allowed).toBe(true);
    expect(r.failed_checks).toEqual([]);
  });

  it("allows boundary + step logs", () => {
    const r = evaluateMinimumSignalGate({
      execution_boundary_present: true,
      retry_visibility: false,
      step_logs_present: true,
      error_visibility: false
    });
    expect(r.allowed).toBe(true);
  });

  it("allows boundary + error visibility", () => {
    const r = evaluateMinimumSignalGate({
      execution_boundary_present: true,
      retry_visibility: false,
      step_logs_present: false,
      error_visibility: true
    });
    expect(r.allowed).toBe(true);
  });

  it("rejects when boundary missing", () => {
    const r = evaluateMinimumSignalGate({
      execution_boundary_present: false,
      retry_visibility: true,
      step_logs_present: false,
      error_visibility: false
    });
    expect(r.allowed).toBe(false);
    expect(r.failed_checks).toContain("execution_boundary");
  });

  it("rejects when no secondary signal", () => {
    const r = evaluateMinimumSignalGate({
      execution_boundary_present: true,
      retry_visibility: false,
      step_logs_present: false,
      error_visibility: false
    });
    expect(r.allowed).toBe(false);
    expect(r.failed_checks).toContain("minimum_signal_channel");
  });
});
