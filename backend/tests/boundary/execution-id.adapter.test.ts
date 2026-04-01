import { resolveExecutionIdentity } from "../../src/boundary/execution-id.adapter";

describe("execution-id.adapter", () => {
  it("prefers explicit execution_id", () => {
    const r = resolveExecutionIdentity({
      execution_id: "ex-1",
      workflow_run_id: "wf-run",
      run_id: "r1"
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.execution_id).toBe("ex-1");
      expect(r.identity_basis).toBe("execution_id");
    }
  });

  it("falls back to workflow_run_id", () => {
    const r = resolveExecutionIdentity({
      workflow_run_id: "wf-run-2",
      run_id: "r2"
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.execution_id).toBe("wf-run-2");
      expect(r.identity_basis).toBe("workflow_run_id");
    }
  });

  it("falls back to run_id", () => {
    const r = resolveExecutionIdentity({ run_id: "run-only" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.execution_id).toBe("run-only");
      expect(r.identity_basis).toBe("run_id");
    }
  });

  it("uses composite when policy allows workflow_id + chat_id", () => {
    const r = resolveExecutionIdentity({
      workflow_id: "w1",
      chat_id: "c9",
      allow_composite_fallback: true
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.execution_id).toBe("w1::c9");
      expect(r.identity_basis).toBe("composite");
    }
  });

  it("uses composite when policy allows workflow_id + agent_run_id", () => {
    const r = resolveExecutionIdentity({
      workflow_id: "w1",
      agent_run_id: "a9",
      allow_composite_fallback: true
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.execution_id).toBe("w1::a9");
      expect(r.identity_basis).toBe("composite");
    }
  });

  it("prefers chat over agent in composite when both present", () => {
    const r = resolveExecutionIdentity({
      workflow_id: "w1",
      chat_id: "c1",
      agent_run_id: "a1",
      allow_composite_fallback: true
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.execution_id).toBe("w1::c1");
    }
  });

  it("is unresolved when only chat_id without composite policy", () => {
    const r = resolveExecutionIdentity({ chat_id: "orphan-chat" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.identity_basis).toBe("unresolved");
      expect(r.reason).toBe("missing_execution_identity");
    }
  });
});
