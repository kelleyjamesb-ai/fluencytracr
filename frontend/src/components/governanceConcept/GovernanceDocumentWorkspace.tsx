import { useEffect, useState } from "react";

type PolicySummary = {
  policy_id: string;
  file_name: string;
  content_type: string;
  source_format: string;
  clause_count: number;
  created_at: string;
  latest_mapping: {
    mapping_id: string;
    generated_at: string;
    controls_mapped: number;
    unresolved_clauses: number;
  } | null;
};

type PoliciesResponse = {
  policies: PolicySummary[];
};

type MappingResponse = {
  policy_id: string;
  mapping_id: string;
  generated_at: string;
  controls: Array<{
    control_name: string;
    status: "enabled" | "disabled" | "partial" | "unknown";
    confidence: number;
  }>;
  unresolved_clauses: Array<{
    clause_id: string;
    reason: string;
  }>;
};

export function GovernanceDocumentWorkspace() {
  const orgId = localStorage.getItem("orgId") ?? "org-1";
  const role = localStorage.getItem("role") ?? "ADMIN";
  const isAdmin = role === "ADMIN";

  const governanceHeaders = {
    "content-type": "application/json",
    "x-role": role,
    "X-FluencyTracr-Schema-Version": "0.1"
  };

  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [mapping, setMapping] = useState<MappingResponse | null>(null);
  const [policyFileName, setPolicyFileName] = useState("governance-policy.txt");
  const [policyContent, setPolicyContent] = useState("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapping, setIsMapping] = useState(false);

  const loadPolicies = async () => {
    const response = await fetch(`/orgs/${orgId}/policies`, {
      headers: { "x-role": role }
    });
    if (!response.ok) {
      throw new Error("Unable to load policies");
    }
    const payload = (await response.json()) as PoliciesResponse;
    setPolicies(payload.policies ?? []);
    if (!selectedPolicyId && payload.policies.length > 0) {
      setSelectedPolicyId(payload.policies[0].policy_id);
    }
  };

  const loadMapping = async (policyId: string) => {
    const response = await fetch(`/orgs/${orgId}/policies/${policyId}/mapping`, {
      headers: { "x-role": role }
    });
    if (!response.ok) {
      setMapping(null);
      return;
    }
    const payload = (await response.json()) as MappingResponse;
    setMapping(payload);
  };

  useEffect(() => {
    let isCancelled = false;
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        await loadPolicies();
        if (!isCancelled) {
          setMessage("");
        }
      } catch (_error) {
        if (!isCancelled) {
          setMessage("Unable to load policy workspace. Check org access and role permissions.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    bootstrap();
    return () => {
      isCancelled = true;
    };
    // Intentionally run once for initial hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPolicyId) {
      setMapping(null);
      return;
    }
    loadMapping(selectedPolicyId).catch(() => setMapping(null));
    // Selected policy changes should refresh mapping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolicyId]);

  const uploadPolicy = async () => {
    if (!policyContent.trim()) {
      setMessage("Policy text is required before upload.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/orgs/${orgId}/policies/upload`, {
        method: "POST",
        headers: governanceHeaders,
        body: JSON.stringify({
          file_name: policyFileName,
          content_type: "text/plain",
          content: policyContent
        })
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const payload = (await response.json()) as { policy_id: string };
      await loadPolicies();
      setSelectedPolicyId(payload.policy_id);
      setMessage("Policy uploaded. You can now map controls.");
    } catch (_error) {
      setMessage("Upload failed. Verify schema headers, role, and policy content.");
    } finally {
      setIsSaving(false);
    }
  };

  const mapSelectedPolicy = async () => {
    if (!selectedPolicyId) {
      setMessage("Select a policy before mapping.");
      return;
    }
    setIsMapping(true);
    setMessage("");
    try {
      const response = await fetch(`/orgs/${orgId}/policies/${selectedPolicyId}/map`, {
        method: "POST",
        headers: governanceHeaders,
        body: JSON.stringify({})
      });
      if (!response.ok) {
        throw new Error("Mapping failed");
      }
      await Promise.all([loadPolicies(), loadMapping(selectedPolicyId)]);
      setMessage("Mapping complete. Review controls and unresolved clauses.");
    } catch (_error) {
      setMessage("Mapping failed. Check policy content and endpoint permissions.");
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <section className="gc-card gc-workspace">
      <div className="gc-exec-header">
        <p className="gc-mono">Compliance Officer and CISO Workspace</p>
        <h2>Governance Document Upload and Mapping</h2>
        <p>
          Upload governance documents here, then map them into controls used by the platform&apos;s compliance status
          and timeline flows.
        </p>
      </div>

      {!isAdmin && (
        <p className="gc-readonly-note">
          Read-only mode: only `ADMIN` can upload or run mapping. You can still review existing policy and mapping
          summaries.
        </p>
      )}

      <div className="gc-workspace-grid">
        <article className="gc-workspace-pane">
          <h3>1. Upload governance document</h3>
          <div className="gc-form-grid">
            <label>
              File name
              <input
                className="gc-input"
                type="text"
                value={policyFileName}
                onChange={(event) => setPolicyFileName(event.target.value)}
                disabled={!isAdmin || isSaving}
              />
            </label>
            <label>
              Policy content
              <textarea
                className="gc-input gc-textarea"
                value={policyContent}
                onChange={(event) => setPolicyContent(event.target.value)}
                placeholder="Paste governance policy text..."
                disabled={!isAdmin || isSaving}
              />
            </label>
          </div>
          <button type="button" className="gc-btn gc-btn-primary" onClick={uploadPolicy} disabled={!isAdmin || isSaving}>
            {isSaving ? "Uploading..." : "Upload Document"}
          </button>
        </article>

        <article className="gc-workspace-pane">
          <h3>2. Map to platform controls</h3>
          <label>
            Policy version
            <select
              className="gc-input"
              value={selectedPolicyId}
              onChange={(event) => setSelectedPolicyId(event.target.value)}
              disabled={policies.length === 0 || isMapping}
            >
              <option value="">Select policy</option>
              {policies.map((policy) => (
                <option key={policy.policy_id} value={policy.policy_id}>
                  {policy.file_name} ({new Date(policy.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="gc-btn gc-btn-secondary" onClick={mapSelectedPolicy} disabled={!isAdmin || !selectedPolicyId || isMapping}>
            {isMapping ? "Mapping..." : "Run Mapping"}
          </button>

          {mapping && (
            <div className="gc-mapping-summary">
              <p><strong>Latest mapping:</strong> {new Date(mapping.generated_at).toLocaleString()}</p>
              <p><strong>Controls mapped:</strong> {mapping.controls.length}</p>
              <p><strong>Unresolved clauses:</strong> {mapping.unresolved_clauses.length}</p>
            </div>
          )}
        </article>
      </div>

      <article className="gc-workspace-pane">
        <h3>3. Current policy inventory</h3>
        {isLoading ? (
          <p>Loading policies...</p>
        ) : policies.length === 0 ? (
          <p>No governance policies uploaded yet.</p>
        ) : (
          <ul className="gc-policy-list">
            {policies.map((policy) => (
              <li key={policy.policy_id}>
                <span>{policy.file_name}</span>
                <span className="gc-mono">{policy.latest_mapping ? "mapped" : "not mapped"}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {message && <p className="gc-workspace-message">{message}</p>}
    </section>
  );
}

