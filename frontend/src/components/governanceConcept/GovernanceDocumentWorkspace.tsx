import { useGovernanceDocumentWorkspace } from "../../hooks/useGovernanceDocumentWorkspace";
import { WorkflowStepRail } from "./WorkflowStepRail";

export function GovernanceDocumentWorkspace() {
  const {
    isAdmin,
    policies,
    selectedPolicyId,
    selectedPolicy,
    mapping,
    policyFileName,
    setPolicyFileName,
    policyContent,
    setPolicyContent,
    policyContentType,
    parsedUploads,
    maxUploadFiles,
    maxFileSizeMb,
    isParsingFile,
    isCreatingOrg,
    orgBootstrapNeeded,
    hasPendingParsedUploads,
    hasPolicies,
    hasSelectedPolicy,
    hasMapping,
    canRunMapping,
    shouldHighlightRunMapping,
    nextStepText,
    parseSelectedFiles,
    clearParsedUploads,
    initializeOrg,
    message,
    isLoading,
    isSaving,
    isMapping,
    isUpdatingPolicy,
    isDeletingPolicyId,
    isSeedingSynthetic,
    isResettingSandbox,
    uploadPolicy,
    uploadAndMapPolicy,
    mapSelectedPolicy,
    updateSelectedPolicy,
    deletePolicy,
    selectPolicyForMapping,
    seedSyntheticData,
    resetSandbox
  } = useGovernanceDocumentWorkspace();

  return (
    <section className="gc-card gc-workspace">
      <div className="gc-exec-header">
        <p className="gc-mono">Policy &amp; Compliance Workspace</p>
        <h2>Upload Policies and Check Compliance</h2>
        <p>
          Upload your policy documents, connect them to controls, and see what's ready.
        </p>
        <div className="gc-next-step">
          <strong>Next step:</strong> {nextStepText}
        </div>
      </div>

      <WorkflowStepRail
        nextStepText={nextStepText}
        hasPendingParsedUploads={hasPendingParsedUploads}
        hasPolicies={hasPolicies}
        hasSelectedPolicy={hasSelectedPolicy}
        hasMapping={hasMapping}
      />

      {message && (
        <p className={`gc-workspace-message ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") || message.toLowerCase().includes("blocked") || message.toLowerCase().includes("unable") ? "gc-workspace-message-error" : "gc-workspace-message-ok"}`}>
          {message}
        </p>
      )}

      {orgBootstrapNeeded && (
        <div className="gc-card" style={{ borderColor: "#f7dfaf", marginBottom: 20 }}>
          <p className="gc-mono" style={{ marginBottom: 8 }}>Organization Setup Required</p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>
            No organization record was found for this session. Initialize one to enable
            policy upload and mapping.
          </p>
          <button
            type="button"
            className="gc-btn gc-btn-primary"
            onClick={initializeOrg}
            disabled={!isAdmin || isCreatingOrg}
          >
            {isCreatingOrg ? "Initializing…" : "Initialize Organization"}
          </button>
          {!isAdmin && (
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              Only an Admin can initialize the organization.
            </p>
          )}
        </div>
      )}

      {!isAdmin && !orgBootstrapNeeded && (
        <p className="gc-readonly-note">
          View only — your role can see policies and results but cannot upload or run mapping.
        </p>
      )}

      <div className="gc-workspace-grid">
        <article className="gc-workspace-pane">
          <h3>1. Add and manage your policies</h3>
          <div className="gc-form-grid">
            <label>
              Upload files (.pdf or .docx)
              <input
                className="gc-input"
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={(event) => {
                  const files = event.target.files;
                  if (files && files.length > 0) {
                    void parseSelectedFiles(files);
                  }
                  event.currentTarget.value = "";
                }}
                disabled={!isAdmin || isSaving || isParsingFile}
              />
            </label>
            <p className="gc-subtle">Limit: up to {maxUploadFiles} files, {maxFileSizeMb}MB each.</p>
            {parsedUploads.length > 0 && (
              <>
                <p className="gc-subtle">{parsedUploads.length} documents ready for upload:</p>
                <ul className="gc-policy-list">
                  {parsedUploads.map((upload) => (
                    <li key={upload.fileName}>
                      <span>{upload.fileName}</span>
                      <span className="gc-mono">{upload.contentType}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="gc-btn gc-btn-outline"
                  onClick={clearParsedUploads}
                  disabled={!isAdmin || isSaving || isParsingFile}
                >
                  Clear Selected Files
                </button>
              </>
            )}
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
            <p className="gc-subtle">Detected content type: {policyContentType}</p>
          </div>
          <button
            type="button"
            className="gc-btn gc-btn-primary"
            onClick={uploadPolicy}
            disabled={!isAdmin || isSaving || isParsingFile}
          >
            {isParsingFile
              ? "Parsing..."
              : isSaving
                ? "Uploading..."
                : parsedUploads.length > 0
                  ? "Upload Documents"
                  : "Upload Document"}
          </button>
          <button
            type="button"
            className="gc-btn gc-btn-secondary"
            onClick={uploadAndMapPolicy}
            disabled={!isAdmin || isSaving || isMapping || isParsingFile}
          >
            {isSaving || isMapping ? "Processing..." : "Upload and Run Mapping"}
          </button>
          <button
            type="button"
            className="gc-btn gc-btn-secondary"
            onClick={updateSelectedPolicy}
            disabled={!isAdmin || !selectedPolicyId || isSaving || isParsingFile || isUpdatingPolicy}
          >
            {isUpdatingPolicy ? "Updating..." : "Update Selected Policy"}
          </button>

          <div className="gc-mapping-summary">
            <h4>Your policies</h4>
            {isLoading ? (
              <p>Loading policies...</p>
            ) : policies.length === 0 ? (
              <p>No governance policies uploaded yet.</p>
            ) : (
              <ul className="gc-policy-list">
                {policies.map((policy) => {
                  const isSelected = policy.policy_id === selectedPolicyId;
                  return (
                    <li key={policy.policy_id} className={isSelected ? "gc-policy-selected" : ""}>
                      <span>{policy.file_name}</span>
                      <span className="gc-policy-row-actions">
                        <span className="gc-mono">{policy.latest_mapping ? "mapped" : "not mapped"}</span>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className={`gc-btn ${isSelected ? "gc-btn-primary" : "gc-btn-outline"}`}
                              onClick={() => selectPolicyForMapping(policy.policy_id)}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </button>
                            <button
                              type="button"
                              className="gc-btn gc-btn-outline"
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `Delete ${policy.file_name}? This removes the policy and its mappings.`
                                );
                                if (confirmed) {
                                  void deletePolicy(policy.policy_id);
                                }
                              }}
                              disabled={isDeletingPolicyId === policy.policy_id}
                            >
                              {isDeletingPolicyId === policy.policy_id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>

        <article className="gc-workspace-pane">
          <h3>2. Connect your policy to controls</h3>
          <p className="gc-subtle">
            {selectedPolicy
              ? `Selected: ${selectedPolicy.file_name}`
              : "Select a policy in Step 1, then run mapping."}
          </p>
          <button
            type="button"
            className={`gc-btn ${shouldHighlightRunMapping ? "gc-btn-primary gc-btn-next-action" : "gc-btn-secondary"}`}
            onClick={mapSelectedPolicy}
            disabled={!canRunMapping}
          >
            {isMapping ? "Mapping..." : "Run Mapping"}
          </button>
          {!isAdmin && hasSelectedPolicy && !orgBootstrapNeeded && (
            <p className="gc-subtle" style={{ color: "#8a5a07" }}>
              Mapping requires Admin role. Contact your Admin to run mapping for this policy.
            </p>
          )}
          {!selectedPolicyId && <p className="gc-subtle">No policy selected yet.</p>}

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
        <h3>Testing Tools</h3>
        <p className="gc-subtle">
          Quick testing controls. "Seed" loads sample policies that are already connected to controls.
          "Reset" clears all uploaded policies and mappings for this org — useful for starting fresh.
        </p>
        <div className="gc-workspace-actions">
          <button
            type="button"
            className="gc-btn gc-btn-secondary"
            onClick={() => void seedSyntheticData()}
            disabled={!isAdmin || isSeedingSynthetic || isResettingSandbox}
          >
            {isSeedingSynthetic ? "Seeding..." : "Seed Synthetic Test Pack"}
          </button>
          <button
            type="button"
            className="gc-btn gc-btn-outline"
            onClick={() => {
              const confirmed = window.confirm(
                "Reset sandbox for this org? This removes uploaded policies, mappings, and governance event history."
              );
              if (confirmed) {
                void resetSandbox();
              }
            }}
            disabled={!isAdmin || isResettingSandbox || isSeedingSynthetic}
          >
            {isResettingSandbox ? "Resetting..." : "Reset Sandbox"}
          </button>
        </div>
      </article>

    </section>
  );
}
